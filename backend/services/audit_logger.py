"""
AuditLogger - Blockchain-style immutable audit trail for Justice Companion.

Migrated from: src/services/AuditLogger.ts

Features:
- Cryptographic hash chaining (blockchain-style)
- Tamper-evident logging
- INSERT-ONLY (no updates/deletes)
- Never throws exceptions (audit failures shouldn't break app)
- SHA-256 integrity hashing
- Async-compatible with SQLAlchemy

Usage:
    from backend.services.audit_logger import log_audit_event

    log_audit_event(
        db=db,
        event_type="case.created",
        user_id=str(user_id),
        resource_type="case",
        resource_id=str(case_id),
        action="create",
        details={"title": "Smith v. Jones"},
        success=True
    )
"""

import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

# Configure logger
logger = logging.getLogger(__name__)


class AuditLogger:
    """
    AuditLogger - Blockchain-style immutable audit trail.

    Provides cryptographic hash chaining to ensure audit logs cannot be
    tampered with after creation. Each log entry contains a hash of its
    contents plus the hash of the previous log entry.
    """

    def __init__(self, db: Session):
        """
        Initialize AuditLogger.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def log(
        self,
        event_type: str,
        user_id: Optional[str],
        resource_type: str,
        resource_id: str,
        action: str,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Log an audit event (immutable, blockchain-style).

        NOTE: This method NEVER throws. Audit logging failures are logged
        to console but don't break application flow.

        Args:
            event_type: Type of event (e.g., "case.created", "user.login")
            user_id: User who performed the action (optional)
            resource_type: Type of resource (e.g., "case", "user")
            resource_id: ID of the resource affected
            action: Action performed (create, read, update, delete, export, decrypt)
            details: Additional context as dictionary (optional)
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)
            success: Whether the operation succeeded (default: True)
            error_message: Error message if operation failed (optional)
        """
        try:
            # Get previous hash for chaining
            previous_hash = self._get_last_log_hash()

            # Generate unique ID and timestamp
            log_id = str(uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()
            created_at = timestamp

            # Create entry dictionary
            entry = {
                "id": log_id,
                "timestamp": timestamp,
                "event_type": event_type,
                "user_id": user_id,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "action": action,
                "details": details,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "success": success,
                "error_message": error_message,
                "previous_log_hash": previous_hash,
                "integrity_hash": "",  # Calculate next
                "created_at": created_at,
            }

            # Calculate integrity hash
            entry["integrity_hash"] = self._calculate_integrity_hash(entry)

            # INSERT (atomic)
            self._insert_audit_log(entry)

        except Exception as e:
            # CRITICAL: Audit failures should NOT break app
            logger.error(f"❌ Audit logging failed: {e}", exc_info=True)

    def query(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        event_type: Optional[str] = None,
        user_id: Optional[str] = None,
        success: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query audit logs with optional filters.

        Args:
            start_date: Filter logs after this date (ISO format)
            end_date: Filter logs before this date (ISO format)
            resource_type: Filter by resource type
            resource_id: Filter by resource ID
            event_type: Filter by event type
            user_id: Filter by user ID
            success: Filter by success status
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of audit log entries as dictionaries
        """
        conditions = []
        params = {}

        # Build WHERE clauses
        if start_date:
            conditions.append("timestamp >= :start_date")
            params["start_date"] = start_date

        if end_date:
            conditions.append("timestamp <= :end_date")
            params["end_date"] = end_date

        if resource_type:
            conditions.append("resource_type = :resource_type")
            params["resource_type"] = resource_type

        if resource_id:
            conditions.append("resource_id = :resource_id")
            params["resource_id"] = resource_id

        if event_type:
            conditions.append("event_type = :event_type")
            params["event_type"] = event_type

        if user_id:
            conditions.append("user_id = :user_id")
            params["user_id"] = user_id

        if success is not None:
            conditions.append("success = :success")
            params["success"] = 1 if success else 0

        # Build SQL query
        sql = "SELECT * FROM audit_logs"
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)

        # Use ROWID for deterministic ordering (most recent first)
        sql += " ORDER BY ROWID DESC"

        if limit:
            sql += " LIMIT :limit"
            params["limit"] = limit

        if offset:
            sql += " OFFSET :offset"
            params["offset"] = offset

        # Execute query
        result = self.db.execute(text(sql), params)
        rows = result.fetchall()

        # Convert to list of dictionaries
        return [self._map_row_to_entry(dict(row._mapping)) for row in rows]

    def verify_integrity(self) -> Dict[str, Any]:
        """
        Verify integrity of entire audit log chain.

        Returns:
            Dictionary with validation status:
            {
                "valid": bool,
                "totalLogs": int,
                "brokenAt": int (optional),
                "brokenLog": dict (optional),
                "error": str (optional)
            }
        """
        try:
            # Fetch all logs in chain order (insertion order via ROWID)
            sql = "SELECT * FROM audit_logs ORDER BY ROWID ASC"
            result = self.db.execute(text(sql))
            rows = result.fetchall()

            if not rows:
                return {"valid": True, "totalLogs": 0}

            entries = [self._map_row_to_entry(dict(row._mapping)) for row in rows]
            previous_hash = None

            # Verify each log entry
            for i, entry in enumerate(entries):
                # Verify integrity hash matches calculated hash
                calculated_hash = self._calculate_integrity_hash(entry)
                if entry["integrity_hash"] != calculated_hash:
                    return {
                        "valid": False,
                        "totalLogs": len(entries),
                        "brokenAt": i,
                        "brokenLog": entry,
                        "error": "Integrity hash mismatch - log entry may have been tampered with",
                    }

                # Verify chain linking
                if entry["previous_log_hash"] != previous_hash:
                    return {
                        "valid": False,
                        "totalLogs": len(entries),
                        "brokenAt": i,
                        "brokenLog": entry,
                        "error": "Chain broken - previousLogHash does not match previous entry",
                    }

                previous_hash = entry["integrity_hash"]

            return {"valid": True, "totalLogs": len(entries)}

        except Exception as e:
            return {"valid": False, "totalLogs": 0, "error": str(e)}

    def export_logs(
        self,
        format: str = "json",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> str:
        """
        Export audit logs in JSON or CSV format.

        Args:
            format: Export format ("json" or "csv")
            start_date: Filter logs after this date (optional)
            end_date: Filter logs before this date (optional)
            resource_type: Filter by resource type (optional)
            resource_id: Filter by resource ID (optional)

        Returns:
            Formatted string (JSON or CSV)
        """
        logs = self.query(
            start_date=start_date,
            end_date=end_date,
            resource_type=resource_type,
            resource_id=resource_id,
        )

        if format == "json":
            return json.dumps(logs, indent=2)

        # CSV format
        if not logs:
            return ""

        # CSV headers
        headers = [
            "id",
            "timestamp",
            "event_type",
            "user_id",
            "resource_type",
            "resource_id",
            "action",
            "details",
            "ip_address",
            "user_agent",
            "success",
            "error_message",
            "integrity_hash",
            "previous_log_hash",
            "created_at",
        ]

        # Build CSV rows
        rows = []
        for log in logs:
            row = [
                log.get("id", ""),
                log.get("timestamp", ""),
                log.get("event_type", ""),
                log.get("user_id", ""),
                log.get("resource_type", ""),
                log.get("resource_id", ""),
                log.get("action", ""),
                json.dumps(log.get("details")) if log.get("details") else "",
                log.get("ip_address", ""),
                log.get("user_agent", ""),
                str(log.get("success", "")),
                log.get("error_message", ""),
                log.get("integrity_hash", ""),
                log.get("previous_log_hash", ""),
                log.get("created_at", ""),
            ]
            rows.append(",".join([self._escape_csv_field(str(field)) for field in row]))

        # Combine headers and rows
        csv_lines = [",".join(headers)] + rows
        return "\n".join(csv_lines)

    def _calculate_integrity_hash(self, entry: Dict[str, Any]) -> str:
        """
        Calculate cryptographic integrity hash for an audit log entry.

        Hash includes: id, timestamp, event_type, user_id, resource_type,
        resource_id, action, details, success, previous_log_hash

        Args:
            entry: Audit log entry dictionary

        Returns:
            SHA-256 hash (hex string)
        """
        data = {
            "id": entry["id"],
            "timestamp": entry["timestamp"],
            "event_type": entry["event_type"],
            "user_id": entry.get("user_id"),
            "resource_type": entry["resource_type"],
            "resource_id": entry["resource_id"],
            "action": entry["action"],
            "details": entry.get("details"),
            "success": entry["success"],
            "previous_log_hash": entry.get("previous_log_hash"),
        }

        # Deterministic JSON string (same input = same hash)
        json_string = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_string.encode()).hexdigest()

    def _get_last_log_hash(self) -> Optional[str]:
        """
        Get the integrity hash of the most recent audit log entry.

        Returns:
            Hash of last log, or None if no logs exist
        """
        sql = """
            SELECT integrity_hash
            FROM audit_logs
            ORDER BY ROWID DESC
            LIMIT 1
        """
        result = self.db.execute(text(sql))
        row = result.fetchone()
        return row[0] if row else None

    def _insert_audit_log(self, entry: Dict[str, Any]) -> None:
        """
        Insert audit log entry into database.

        Args:
            entry: Audit log entry dictionary
        """
        sql = """
            INSERT INTO audit_logs (
                id, timestamp, event_type, user_id, resource_type, resource_id,
                action, details, ip_address, user_agent, success, error_message,
                integrity_hash, previous_log_hash, created_at
            ) VALUES (
                :id, :timestamp, :event_type, :user_id, :resource_type, :resource_id,
                :action, :details, :ip_address, :user_agent, :success, :error_message,
                :integrity_hash, :previous_log_hash, :created_at
            )
        """

        self.db.execute(
            text(sql),
            {
                "id": entry["id"],
                "timestamp": entry["timestamp"],
                "event_type": entry["event_type"],
                "user_id": entry.get("user_id"),
                "resource_type": entry["resource_type"],
                "resource_id": entry["resource_id"],
                "action": entry["action"],
                "details": json.dumps(entry["details"]) if entry.get("details") else None,
                "ip_address": entry.get("ip_address"),
                "user_agent": entry.get("user_agent"),
                "success": 1 if entry["success"] else 0,
                "error_message": entry.get("error_message"),
                "integrity_hash": entry["integrity_hash"],
                "previous_log_hash": entry.get("previous_log_hash"),
                "created_at": entry["created_at"],
            },
        )
        self.db.commit()

    def _map_row_to_entry(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map database row to audit log entry dictionary.

        Args:
            row: Database row as dictionary

        Returns:
            Typed audit log entry dictionary
        """
        # Parse details if it's a JSON string
        details = None
        if row.get("details"):
            try:
                details = json.loads(row["details"])
            except json.JSONDecodeError:
                details = {"value": row["details"]}

        return {
            "id": row["id"],
            "timestamp": row["timestamp"],
            "event_type": row["event_type"],
            "user_id": row.get("user_id"),
            "resource_type": row["resource_type"],
            "resource_id": row["resource_id"],
            "action": row["action"],
            "details": details,
            "ip_address": row.get("ip_address"),
            "user_agent": row.get("user_agent"),
            "success": row["success"] == 1,
            "error_message": row.get("error_message"),
            "integrity_hash": row["integrity_hash"],
            "previous_log_hash": row.get("previous_log_hash"),
            "created_at": row["created_at"],
        }

    def _escape_csv_field(self, field: str) -> str:
        """
        Escape CSV field (handle quotes and commas).

        Args:
            field: Field value

        Returns:
            Escaped field value
        """
        if "," in field or '"' in field or "\n" in field:
            return f'"{field.replace(chr(34), chr(34) + chr(34))}"'
        return field


# ===== HELPER FUNCTION FOR EASY USAGE =====


def log_audit_event(
    db: Session,
    event_type: str,
    user_id: str,
    resource_type: str,
    resource_id: str,
    action: str,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None,
) -> None:
    """
    Helper function to log an audit event.

    This is a convenience function that creates an AuditLogger instance
    and logs the event in a single call.

    Usage:
        from backend.services.audit_logger import log_audit_event

        log_audit_event(
            db=db,
            event_type="case.created",
            user_id=str(user_id),
            resource_type="case",
            resource_id=str(case_id),
            action="create",
            details={"title": "Smith v. Jones"},
            success=True
        )

    Args:
        db: SQLAlchemy database session
        event_type: Type of event (e.g., "case.created", "user.login")
        user_id: User who performed the action
        resource_type: Type of resource (e.g., "case", "user")
        resource_id: ID of the resource affected
        action: Action performed (create, read, update, delete, export, decrypt)
        details: Additional context as dictionary (optional)
        ip_address: Client IP address (optional)
        user_agent: Client user agent (optional)
        success: Whether the operation succeeded (default: True)
        error_message: Error message if operation failed (optional)
    """
    audit_logger = AuditLogger(db)
    audit_logger.log(
        event_type=event_type,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        error_message=error_message,
    )
