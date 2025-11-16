"""
GDPR Compliance Routes for Justice Companion.
Migrated from: electron/ipc-handlers/gdpr.ts

Implements GDPR Articles 17 & 20:
- Article 20: Data Portability (Right to Export)
- Article 17: Right to Erasure (Right to Delete)

Routes:
- POST /gdpr/export - Export all user data in machine-readable format
- POST /gdpr/delete - Request account deletion (requires explicit confirmation)
- GET /gdpr/consents - Get user's consent records
- POST /gdpr/consents - Update user consents

Security:
- Session-based authorization
- Rate limiting (5 exports per 24h, 1 deletion per 30 days)
- Consent verification required
- Audit logging for all GDPR operations
- Encrypted fields are decrypted before export
- Transaction safety for deletions (all-or-nothing)
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, status
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
import json
import logging
import os
from pathlib import Path

from backend.models.base import get_db
from backend.services.auth_service import AuthenticationService
from backend.routes.auth import get_current_user
from backend.services.encryption_service import EncryptionService, EncryptedData
from backend.services.audit_logger import log_audit_event

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gdpr", tags=["gdpr"])


# ===== RATE LIMITING =====

# In-memory rate limit tracker (userId:operation -> {count, resetAt})
# TODO: Move to Redis for production multi-instance deployments
_rate_limits: Dict[str, Dict[str, Any]] = {}


def check_rate_limit(user_id: int, operation: str, max_requests: int, window_hours: int) -> None:
    """
    Check rate limit for GDPR operations to prevent abuse.

    Args:
        user_id: User ID
        operation: Operation name (export, delete)
        max_requests: Maximum requests allowed
        window_hours: Time window in hours

    Raises:
        HTTPException: If rate limit exceeded
    """
    key = f"{user_id}:{operation}"
    now = datetime.now(timezone.utc)
    window_ms = window_hours * 60 * 60 * 1000

    limit_info = _rate_limits.get(key)

    if limit_info and now.timestamp() * 1000 < limit_info["resetAt"]:
        if limit_info["count"] >= max_requests:
            reset_date = datetime.fromtimestamp(limit_info["resetAt"] / 1000, tz=timezone.utc)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {operation}. Try again after {reset_date.isoformat()}"
            )
        limit_info["count"] += 1
    else:
        _rate_limits[key] = {
            "count": 1,
            "resetAt": now.timestamp() * 1000 + window_ms
        }


# ===== PYDANTIC REQUEST/RESPONSE MODELS =====

class GdprExportRequest(BaseModel):
    """Request model for GDPR data export (Article 20)."""
    format: str = Field(default="json", description="Export format (json or csv)")

    @validator('format')
    def validate_format(cls, v):
        if v not in ["json", "csv"]:
            raise ValueError("Format must be 'json' or 'csv'")
        return v


class GdprExportResponse(BaseModel):
    """Response model for GDPR data export."""
    success: bool
    filePath: str
    totalRecords: int
    exportDate: str
    format: str
    auditLogId: Optional[str] = None


class GdprDeleteRequest(BaseModel):
    """Request model for GDPR account deletion (Article 17)."""
    confirmed: bool = Field(..., description="User must explicitly confirm deletion")
    exportBeforeDelete: bool = Field(default=False, description="Export data before deletion")
    reason: Optional[str] = Field(None, max_length=500, description="Optional reason for deletion")

    @validator('confirmed')
    def validate_confirmed(cls, v):
        if not v:
            raise ValueError("Deletion requires explicit confirmation (confirmed: true)")
        return v


class GdprDeleteResponse(BaseModel):
    """Response model for GDPR account deletion."""
    success: bool
    deletionDate: str
    deletedCounts: Dict[str, int]
    preservedAuditLogs: int
    preservedConsents: int
    exportPath: Optional[str] = None
    auditLogId: Optional[str] = None


class ConsentRecord(BaseModel):
    """Consent record model."""
    id: int
    consentType: str
    granted: bool
    grantedAt: Optional[str] = None
    revokedAt: Optional[str] = None
    createdAt: str


class ConsentsResponse(BaseModel):
    """Response model for user consents."""
    consents: List[ConsentRecord]


class UpdateConsentRequest(BaseModel):
    """Request model for updating consent."""
    consentType: str = Field(..., description="Type of consent (e.g., data_processing, marketing)")
    granted: bool = Field(..., description="Whether consent is granted")


# ===== DEPENDENCIES =====

def get_auth_service(db: Session = Depends(get_db)) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(db=db)


def get_encryption_service() -> EncryptionService:
    """Get encryption service instance."""
    key = os.environ.get("ENCRYPTION_KEY_BASE64")
    if not key:
        raise ValueError("ENCRYPTION_KEY_BASE64 environment variable not set")

    return EncryptionService(key)


# ===== HELPER FUNCTIONS =====

def decrypt_field(stored_value: Optional[str], encryption_service: EncryptionService) -> Optional[str]:
    """
    Decrypt field with backward compatibility.

    Args:
        stored_value: Encrypted JSON string or legacy plaintext
        encryption_service: EncryptionService instance

    Returns:
        Decrypted plaintext or None
    """
    if not stored_value:
        return None

    try:
        encrypted_data_dict = json.loads(stored_value)

        if all(key in encrypted_data_dict for key in ["algorithm", "ciphertext", "iv", "authTag", "version"]):
            encrypted_data = EncryptedData.from_dict(encrypted_data_dict)
            return encryption_service.decrypt(encrypted_data)

        return stored_value
    except (json.JSONDecodeError, Exception):
        return stored_value


def check_consent(db: Session, user_id: int, consent_type: str) -> None:
    """
    Check if user has active consent for operation.

    Args:
        db: Database session
        user_id: User ID
        consent_type: Consent type to check

    Raises:
        HTTPException: If consent not found or not granted
    """
    sql = text("""
        SELECT id, granted
        FROM consents
        WHERE user_id = :user_id
          AND consent_type = :consent_type
          AND revoked_at IS NULL
    """)

    result = db.execute(sql, {"user_id": user_id, "consent_type": consent_type})
    consent = result.fetchone()

    if not consent or consent[1] != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Active consent required for {consent_type}"
        )


def export_user_data(
    db: Session,
    user_id: int,
    encryption_service: EncryptionService,
    export_format: str = "json"
) -> Dict[str, Any]:
    """
    Export all user data across all tables with decryption.

    Implements GDPR Article 20 - Data Portability.

    Args:
        db: Database session
        user_id: User ID
        encryption_service: EncryptionService instance
        export_format: Export format (json or csv)

    Returns:
        Dictionary with metadata and userData
    """
    export_date = datetime.now(timezone.utc).isoformat()

    # Helper to decrypt table records
    def decrypt_records(records: List[Dict], encrypted_fields: List[str]) -> List[Dict]:
        decrypted = []
        for record in records:
            for field in encrypted_fields:
                if field in record and record[field]:
                    record[field] = decrypt_field(record[field], encryption_service)
            decrypted.append(record)
        return decrypted

    # Export user profile
    sql = text("SELECT id, username, email, created_at, updated_at, last_login_at FROM users WHERE id = :user_id")
    result = db.execute(sql, {"user_id": user_id})
    user_row = result.fetchone()
    user_profile = [dict(zip(result.keys(), user_row))] if user_row else []

    # Export cases
    sql = text("SELECT * FROM cases WHERE user_id = :user_id ORDER BY created_at DESC")
    result = db.execute(sql, {"user_id": user_id})
    cases = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    cases = decrypt_records(cases, ["description"])

    # Export evidence
    sql = text("""
        SELECT e.* FROM evidence e
        JOIN cases c ON e.case_id = c.id
        WHERE c.user_id = :user_id
        ORDER BY e.created_at DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    evidence = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    evidence = decrypt_records(evidence, ["content"])

    # Export legal issues
    sql = text("""
        SELECT li.* FROM legal_issues li
        JOIN cases c ON li.case_id = c.id
        WHERE c.user_id = :user_id
        ORDER BY li.created_at DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    legal_issues = [dict(zip(result.keys(), row)) for row in result.fetchall()]

    # Export timeline events
    sql = text("""
        SELECT te.* FROM timeline_events te
        JOIN cases c ON te.case_id = c.id
        WHERE c.user_id = :user_id
        ORDER BY te.event_date DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    timeline_events = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    timeline_events = decrypt_records(timeline_events, ["description"])

    # Export actions
    sql = text("""
        SELECT a.* FROM actions a
        JOIN cases c ON a.case_id = c.id
        WHERE c.user_id = :user_id
        ORDER BY a.due_date DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    actions = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    actions = decrypt_records(actions, ["description"])

    # Export notes
    sql = text("""
        SELECT n.* FROM notes n
        JOIN cases c ON n.case_id = c.id
        WHERE c.user_id = :user_id
        ORDER BY n.created_at DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    notes = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    notes = decrypt_records(notes, ["content"])

    # Export chat conversations
    sql = text("SELECT * FROM chat_conversations WHERE user_id = :user_id ORDER BY created_at DESC")
    result = db.execute(sql, {"user_id": user_id})
    chat_conversations = [dict(zip(result.keys(), row)) for row in result.fetchall()]

    # Export chat messages
    sql = text("""
        SELECT m.* FROM chat_messages m
        JOIN chat_conversations c ON m.conversation_id = c.id
        WHERE c.user_id = :user_id
        ORDER BY m.timestamp DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    chat_messages = [dict(zip(result.keys(), row)) for row in result.fetchall()]
    chat_messages = decrypt_records(chat_messages, ["message", "response"])

    # Export user facts
    sql = text("SELECT * FROM user_facts WHERE user_id = :user_id ORDER BY created_at DESC")
    result = db.execute(sql, {"user_id": user_id})
    user_facts = [dict(zip(result.keys(), row)) for row in result.fetchall()]

    # Export case facts
    sql = text("""
        SELECT cf.* FROM case_facts cf
        JOIN cases c ON cf.case_id = c.id
        WHERE c.user_id = :user_id
        ORDER BY cf.created_at DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    case_facts = [dict(zip(result.keys(), row)) for row in result.fetchall()]

    # Export sessions
    sql = text("""
        SELECT id, user_id, created_at, expires_at, ip_address, user_agent
        FROM sessions
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    """)
    result = db.execute(sql, {"user_id": user_id})
    sessions = [dict(zip(result.keys(), row)) for row in result.fetchall()]

    # Export consents
    sql = text("SELECT * FROM consents WHERE user_id = :user_id ORDER BY created_at DESC")
    result = db.execute(sql, {"user_id": user_id})
    consents = [dict(zip(result.keys(), row)) for row in result.fetchall()]

    # Calculate total records
    total_records = sum([
        len(user_profile), len(cases), len(evidence), len(legal_issues),
        len(timeline_events), len(actions), len(notes), len(chat_conversations),
        len(chat_messages), len(user_facts), len(case_facts), len(sessions),
        len(consents)
    ])

    return {
        "metadata": {
            "exportDate": export_date,
            "userId": user_id,
            "format": export_format,
            "totalRecords": total_records,
            "schemaVersion": "1.0"
        },
        "userData": {
            "profile": {"tableName": "users", "records": user_profile, "count": len(user_profile)},
            "cases": {"tableName": "cases", "records": cases, "count": len(cases)},
            "evidence": {"tableName": "evidence", "records": evidence, "count": len(evidence)},
            "legalIssues": {"tableName": "legal_issues", "records": legal_issues, "count": len(legal_issues)},
            "timelineEvents": {"tableName": "timeline_events", "records": timeline_events, "count": len(timeline_events)},
            "actions": {"tableName": "actions", "records": actions, "count": len(actions)},
            "notes": {"tableName": "notes", "records": notes, "count": len(notes)},
            "chatConversations": {"tableName": "chat_conversations", "records": chat_conversations, "count": len(chat_conversations)},
            "chatMessages": {"tableName": "chat_messages", "records": chat_messages, "count": len(chat_messages)},
            "userFacts": {"tableName": "user_facts", "records": user_facts, "count": len(user_facts)},
            "caseFacts": {"tableName": "case_facts", "records": case_facts, "count": len(case_facts)},
            "sessions": {"tableName": "sessions", "records": sessions, "count": len(sessions)},
            "consents": {"tableName": "consents", "records": consents, "count": len(consents)}
        }
    }


def delete_user_data(
    db: Session,
    user_id: int,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete all user data (cascading deletion).

    Implements GDPR Article 17 - Right to Erasure.

    IMPORTANT: Preserves audit logs and consent records (legal requirement).

    Args:
        db: Database session
        user_id: User ID
        reason: Optional reason for deletion

    Returns:
        Dictionary with deletion counts and preserved records
    """
    deletion_date = datetime.now(timezone.utc).isoformat()
    deleted_counts = {}

    try:
        # Delete in correct order (respecting foreign key constraints)

        # 1. Chat messages
        result = db.execute(text("""
            DELETE FROM chat_messages
            WHERE conversation_id IN (
                SELECT id FROM chat_conversations WHERE user_id = :user_id
            )
        """), {"user_id": user_id})
        deleted_counts["chat_messages"] = result.rowcount

        # 2. Chat conversations
        result = db.execute(text("DELETE FROM chat_conversations WHERE user_id = :user_id"), {"user_id": user_id})
        deleted_counts["chat_conversations"] = result.rowcount

        # 3. Case-related data
        result = db.execute(text("""
            DELETE FROM case_facts
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """), {"user_id": user_id})
        deleted_counts["case_facts"] = result.rowcount

        result = db.execute(text("""
            DELETE FROM notes
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """), {"user_id": user_id})
        deleted_counts["notes"] = result.rowcount

        result = db.execute(text("""
            DELETE FROM actions
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """), {"user_id": user_id})
        deleted_counts["actions"] = result.rowcount

        result = db.execute(text("""
            DELETE FROM timeline_events
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """), {"user_id": user_id})
        deleted_counts["timeline_events"] = result.rowcount

        result = db.execute(text("""
            DELETE FROM legal_issues
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """), {"user_id": user_id})
        deleted_counts["legal_issues"] = result.rowcount

        result = db.execute(text("""
            DELETE FROM evidence
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """), {"user_id": user_id})
        deleted_counts["evidence"] = result.rowcount

        # 4. Cases
        result = db.execute(text("DELETE FROM cases WHERE user_id = :user_id"), {"user_id": user_id})
        deleted_counts["cases"] = result.rowcount

        # 5. User facts
        result = db.execute(text("DELETE FROM user_facts WHERE user_id = :user_id"), {"user_id": user_id})
        deleted_counts["user_facts"] = result.rowcount

        # 6. Sessions
        result = db.execute(text("DELETE FROM sessions WHERE user_id = :user_id"), {"user_id": user_id})
        deleted_counts["sessions"] = result.rowcount

        # 7. User profile (but keep audit logs and consents)
        result = db.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
        deleted_counts["users"] = result.rowcount

        # Count preserved records (GDPR requires keeping audit trail and consent records)
        result = db.execute(text("SELECT COUNT(*) FROM audit_logs WHERE user_id = :user_id"), {"user_id": str(user_id)})
        preserved_audit_logs = result.scalar()

        result = db.execute(text("SELECT COUNT(*) FROM consents WHERE user_id = :user_id"), {"user_id": user_id})
        preserved_consents = result.scalar()

        # Commit transaction
        db.commit()

        return {
            "success": True,
            "deletionDate": deletion_date,
            "deletedCounts": deleted_counts,
            "preservedAuditLogs": preserved_audit_logs,
            "preservedConsents": preserved_consents
        }

    except Exception as e:
        db.rollback()
        logger.error(f"GDPR deletion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deletion failed: {str(e)}"
        )


# ===== ROUTES =====

@router.post("/export", response_model=GdprExportResponse)
async def gdpr_export(
    request: GdprExportRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service)
):
    """
    Export all user data (GDPR Article 20 - Data Portability).

    Returns machine-readable JSON with all user data across 13 tables.
    Encrypted fields are automatically decrypted before export.

    Security:
    - Rate limited: 5 exports per 24 hours per user
    - Requires active 'data_processing' consent
    - All exports are audit logged

    Returns:
        JSON file path and export metadata
    """
    try:
        # Rate limiting: 5 exports per 24 hours
        check_rate_limit(user_id, "export", max_requests=5, window_hours=24)

        # Consent check
        check_consent(db, user_id, "data_processing")

        # Export data
        logger.info(f"GDPR export requested by user {user_id}")
        export_data = export_user_data(db, user_id, encryption_service, request.format)

        # Save to disk
        exports_dir = Path("exports")
        exports_dir.mkdir(exist_ok=True)

        file_name = f"user_{user_id}_export_{int(datetime.now().timestamp())}.json"
        file_path = exports_dir / file_name

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

        # Audit log
        log_audit_event(
            db=db,
            event_type="gdpr.export",
            user_id=str(user_id),
            resource_type="user_data",
            resource_id=str(user_id),
            action="export",
            details={
                "format": request.format,
                "filePath": str(file_path),
                "totalRecords": export_data["metadata"]["totalRecords"]
            },
            success=True
        )

        logger.info(f"GDPR export complete: {export_data['metadata']['totalRecords']} records exported")

        return GdprExportResponse(
            success=True,
            filePath=str(file_path),
            totalRecords=export_data["metadata"]["totalRecords"],
            exportDate=export_data["metadata"]["exportDate"],
            format=export_data["metadata"]["format"]
        )

    except HTTPException:
        raise
    except Exception as e:
        # Audit log failure
        log_audit_event(
            db=db,
            event_type="gdpr.export",
            user_id=str(user_id),
            resource_type="user_data",
            resource_id=str(user_id),
            action="export",
            success=False,
            error_message=str(e)
        )

        logger.error(f"GDPR export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.post("/delete", response_model=GdprDeleteResponse)
async def gdpr_delete(
    request: GdprDeleteRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
    encryption_service: EncryptionService = Depends(get_encryption_service)
):
    """
    Delete all user data (GDPR Article 17 - Right to Erasure).

    Permanently deletes all user data in cascading order.
    IMPORTANT: Preserves audit logs and consent records (legal requirement).

    Security:
    - Requires explicit confirmation flag
    - Rate limited: 1 deletion per 30 days per user
    - Requires active 'data_erasure_request' consent
    - Transaction safety: all-or-nothing deletion
    - Optional: Export data before deletion

    Returns:
        Deletion confirmation with counts of deleted records
    """
    try:
        # Explicit confirmation required
        if not request.confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deletion requires explicit confirmation (confirmed: true)"
            )

        # Rate limiting: 1 deletion per 30 days (720 hours)
        check_rate_limit(user_id, "delete", max_requests=1, window_hours=720)

        # Consent check
        check_consent(db, user_id, "data_erasure_request")

        logger.warning(f"GDPR deletion requested by user {user_id}")

        # Optional: Export before delete
        export_path = None
        if request.exportBeforeDelete:
            logger.info(f"Exporting data before deletion for user {user_id}")
            export_data = export_user_data(db, user_id, encryption_service, "json")

            exports_dir = Path("exports")
            exports_dir.mkdir(exist_ok=True)

            file_name = f"user_{user_id}_pre_deletion_export_{int(datetime.now().timestamp())}.json"
            file_path = exports_dir / file_name

            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)

            export_path = str(file_path)
            logger.info(f"Pre-deletion export saved: {export_path}")

        # Delete user data
        deletion_result = delete_user_data(db, user_id, request.reason)

        # Audit log (created AFTER deletion so it's preserved)
        log_audit_event(
            db=db,
            event_type="gdpr.erasure",
            user_id=str(user_id),
            resource_type="user_data",
            resource_id=str(user_id),
            action="delete",
            details={
                "reason": request.reason,
                "exportPath": export_path,
                "deletedTables": list(deletion_result["deletedCounts"].keys())
            },
            success=True
        )

        logger.warning(f"GDPR deletion complete: {sum(deletion_result['deletedCounts'].values())} records deleted")

        return GdprDeleteResponse(
            success=deletion_result["success"],
            deletionDate=deletion_result["deletionDate"],
            deletedCounts=deletion_result["deletedCounts"],
            preservedAuditLogs=deletion_result["preservedAuditLogs"] + 1,  # +1 for deletion log
            preservedConsents=deletion_result["preservedConsents"],
            exportPath=export_path
        )

    except HTTPException:
        raise
    except Exception as e:
        # Audit log failure
        log_audit_event(
            db=db,
            event_type="gdpr.deletion_request",
            user_id=str(user_id),
            resource_type="user_data",
            resource_id=str(user_id),
            action="delete",
            success=False,
            error_message=str(e)
        )

        logger.error(f"GDPR deletion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deletion failed: {str(e)}"
        )


@router.get("/consents", response_model=ConsentsResponse)
async def get_consents(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's consent records.

    Returns all consent records (active and revoked) for the current user.

    Returns:
        List of consent records with timestamps
    """
    try:
        sql = text("""
            SELECT
                id,
                consent_type as consentType,
                granted,
                granted_at as grantedAt,
                revoked_at as revokedAt,
                created_at as createdAt
            FROM consents
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """)

        result = db.execute(sql, {"user_id": user_id})
        rows = result.fetchall()

        consents = []
        for row in rows:
            consent = ConsentRecord(
                id=row[0],
                consentType=row[1],
                granted=row[2] == 1,
                grantedAt=row[3],
                revokedAt=row[4],
                createdAt=row[5]
            )
            consents.append(consent)

        return ConsentsResponse(consents=consents)

    except Exception as e:
        logger.error(f"Failed to get consents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get consents: {str(e)}"
        )


@router.post("/consents")
async def update_consent(
    request: UpdateConsentRequest,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user consent.

    Creates a new consent record or revokes existing consent.

    Request:
        consentType: Type of consent (e.g., data_processing, marketing)
        granted: Whether consent is granted

    Returns:
        Updated consent record
    """
    try:
        now = datetime.now(timezone.utc).isoformat()

        if request.granted:
            # Grant new consent
            sql = text("""
                INSERT INTO consents (user_id, consent_type, granted, granted_at, created_at)
                VALUES (:user_id, :consent_type, 1, :granted_at, :created_at)
            """)
            db.execute(sql, {
                "user_id": user_id,
                "consent_type": request.consentType,
                "granted_at": now,
                "created_at": now
            })
        else:
            # Revoke existing consent
            sql = text("""
                UPDATE consents
                SET revoked_at = :revoked_at
                WHERE user_id = :user_id
                  AND consent_type = :consent_type
                  AND revoked_at IS NULL
            """)
            db.execute(sql, {
                "user_id": user_id,
                "consent_type": request.consentType,
                "revoked_at": now
            })

        db.commit()

        # Audit log
        log_audit_event(
            db=db,
            event_type="consent.updated",
            user_id=str(user_id),
            resource_type="consent",
            resource_id=request.consentType,
            action="update",
            details={
                "consentType": request.consentType,
                "granted": request.granted
            },
            success=True
        )

        return {"success": True, "consentType": request.consentType, "granted": request.granted}

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update consent: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update consent: {str(e)}"
        )
