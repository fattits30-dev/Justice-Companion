"""
Evidence repository for data access operations.

Extracts all database queries from routes/evidence.py into a clean repository layer.

Features:
- CRUD operations for evidence records
- Case ownership verification
- Evidence ownership verification (via case)
- File path management
- Bulk operations support
"""

from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.models.evidence import Evidence
from backend.repositories.base import BaseRepository
from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger


class EvidenceRepository(BaseRepository[Evidence]):
    """
    Repository for Evidence entity data access.
    
    Handles all database operations for evidence records,
    including ownership verification through case relationships.
    """
    
    model = Evidence
    
    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None,
        audit_logger: Optional[AuditLogger] = None,
    ):
        """
        Initialize evidence repository.
        
        Args:
            db: SQLAlchemy session
            encryption_service: Optional encryption for sensitive fields
            audit_logger: Optional audit logger for tracking operations
        """
        super().__init__(db, encryption_service, audit_logger)
    
    # ===== OWNERSHIP VERIFICATION =====
    
    def verify_case_ownership(self, case_id: int, user_id: int) -> bool:
        """
        Verify that a case belongs to the specified user.
        
        Args:
            case_id: Case ID to verify
            user_id: User ID to check ownership
            
        Returns:
            True if user owns the case, False otherwise
        """
        query = text("SELECT id FROM cases WHERE id = :case_id AND user_id = :user_id")
        result = self.db.execute(query, {"case_id": case_id, "user_id": user_id}).fetchone()
        return result is not None
    
    def verify_evidence_ownership(self, evidence_id: int, user_id: int) -> bool:
        """
        Verify that evidence belongs to a case owned by the specified user.
        
        Args:
            evidence_id: Evidence ID to verify
            user_id: User ID to check ownership
            
        Returns:
            True if user owns the evidence (via case), False otherwise
        """
        query = text("""
            SELECT e.id
            FROM evidence e
            INNER JOIN cases c ON e.case_id = c.id
            WHERE e.id = :evidence_id AND c.user_id = :user_id
        """)
        result = self.db.execute(
            query, {"evidence_id": evidence_id, "user_id": user_id}
        ).fetchone()
        return result is not None
    
    # ===== CREATE OPERATIONS =====
    
    def create(
        self,
        case_id: int,
        title: str,
        evidence_type: str,
        user_id: int,
        file_path: Optional[str] = None,
        content: Optional[str] = None,
        obtained_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new evidence record.
        
        Args:
            case_id: Case ID to attach evidence to
            title: Evidence title
            evidence_type: Type of evidence
            user_id: User ID (for audit logging)
            file_path: Optional file path
            content: Optional text content
            obtained_date: Optional date obtained (YYYY-MM-DD)
            
        Returns:
            Created evidence as dictionary with camelCase keys
            
        Raises:
            RuntimeError: If database operation fails
        """
        try:
            insert_query = text("""
                INSERT INTO evidence (
                    case_id, title, file_path, content, evidence_type,
                    obtained_date, created_at, updated_at
                )
                VALUES (
                    :case_id, :title, :file_path, :content, :evidence_type,
                    :obtained_date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """)
            
            result = self.db.execute(
                insert_query,
                {
                    "case_id": case_id,
                    "title": title,
                    "file_path": file_path,
                    "content": content,
                    "evidence_type": evidence_type,
                    "obtained_date": obtained_date,
                },
            )
            self.db.commit()
            
            evidence_id = result.lastrowid
            
            # Fetch and return created evidence
            evidence = self.get_by_id_raw(evidence_id)
            
            # Log audit event
            self._log_audit(
                event_type="evidence.create",
                user_id=user_id,
                resource_id=str(evidence_id),
                action="create",
                details={
                    "case_id": case_id,
                    "evidence_type": evidence_type,
                    "title": title,
                },
                success=True,
            )
            
            return evidence
            
        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="evidence.create",
                user_id=user_id,
                resource_id="unknown",
                action="create",
                success=False,
                error_message=str(e),
            )
            raise RuntimeError(f"Failed to create evidence: {str(e)}")
    
    # ===== READ OPERATIONS =====
    
    def get_by_id_raw(self, evidence_id: int) -> Optional[Dict[str, Any]]:
        """
        Get evidence by ID as raw dictionary.
        
        Args:
            evidence_id: Evidence ID
            
        Returns:
            Evidence as dictionary with camelCase keys, or None if not found
        """
        query = text("""
            SELECT
                id,
                case_id as caseId,
                title,
                file_path as filePath,
                content,
                evidence_type as evidenceType,
                obtained_date as obtainedDate,
                created_at as createdAt,
                updated_at as updatedAt
            FROM evidence
            WHERE id = :evidence_id
        """)
        
        result = self.db.execute(query, {"evidence_id": evidence_id}).fetchone()
        
        if not result:
            return None
        
        return self._row_to_dict(result)
    
    def get_all_for_user(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get all evidence for user's cases.
        
        Args:
            user_id: User ID
            
        Returns:
            List of evidence dictionaries
        """
        query = text("""
            SELECT
                e.id,
                e.case_id as caseId,
                e.title,
                e.file_path as filePath,
                e.content,
                e.evidence_type as evidenceType,
                e.obtained_date as obtainedDate,
                e.created_at as createdAt,
                e.updated_at as updatedAt
            FROM evidence e
            INNER JOIN cases c ON e.case_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY e.created_at DESC
        """)
        
        results = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [self._row_to_dict(row) for row in results]
    
    def get_all_for_case(self, case_id: int) -> List[Dict[str, Any]]:
        """
        Get all evidence for a specific case.
        
        Args:
            case_id: Case ID
            
        Returns:
            List of evidence dictionaries
        """
        query = text("""
            SELECT
                id,
                case_id as caseId,
                title,
                file_path as filePath,
                content,
                evidence_type as evidenceType,
                obtained_date as obtainedDate,
                created_at as createdAt,
                updated_at as updatedAt
            FROM evidence
            WHERE case_id = :case_id
            ORDER BY created_at DESC
        """)
        
        results = self.db.execute(query, {"case_id": case_id}).fetchall()
        return [self._row_to_dict(row) for row in results]
    
    def get_file_path(self, evidence_id: int) -> Optional[str]:
        """
        Get the file path for evidence.
        
        Args:
            evidence_id: Evidence ID
            
        Returns:
            File path string or None
        """
        query = text("SELECT file_path FROM evidence WHERE id = :evidence_id")
        result = self.db.execute(query, {"evidence_id": evidence_id}).fetchone()
        return result[0] if result else None
    
    def get_file_path_and_content(
        self, evidence_id: int
    ) -> Optional[tuple[Optional[str], Optional[str]]]:
        """
        Get file path and content for evidence.
        
        Args:
            evidence_id: Evidence ID
            
        Returns:
            Tuple of (file_path, content) or None if not found
        """
        query = text(
            "SELECT file_path, content FROM evidence WHERE id = :evidence_id"
        )
        result = self.db.execute(query, {"evidence_id": evidence_id}).fetchone()
        return (result[0], result[1]) if result else None
    
    # ===== UPDATE OPERATIONS =====
    
    def update_evidence(
        self,
        evidence_id: int,
        user_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        evidence_type: Optional[str] = None,
        obtained_date: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update evidence metadata.
        
        Args:
            evidence_id: Evidence ID
            user_id: User ID (for audit logging)
            title: Optional new title
            description: Optional new description (stored as content)
            evidence_type: Optional new evidence type
            obtained_date: Optional new obtained date
            
        Returns:
            Updated evidence dictionary or None if no fields provided
            
        Raises:
            RuntimeError: If database operation fails
        """
        try:
            # Build dynamic update query
            update_fields = []
            params: Dict[str, Any] = {"evidence_id": evidence_id}
            
            if title is not None:
                update_fields.append("title = :title")
                params["title"] = title
            
            if description is not None:
                update_fields.append("content = :content")
                params["content"] = description
            
            if evidence_type is not None:
                update_fields.append("evidence_type = :evidence_type")
                params["evidence_type"] = evidence_type
            
            if obtained_date is not None:
                update_fields.append("obtained_date = :obtained_date")
                params["obtained_date"] = obtained_date
            
            if not update_fields:
                return None
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            
            update_query = text(f"""
                UPDATE evidence
                SET {', '.join(update_fields)}
                WHERE id = :evidence_id
            """)
            
            self.db.execute(update_query, params)
            self.db.commit()
            
            # Fetch updated evidence
            evidence = self.get_by_id_raw(evidence_id)
            
            # Log audit event
            self._log_audit(
                event_type="evidence.update",
                user_id=user_id,
                resource_id=str(evidence_id),
                action="update",
                details={"fields_updated": list(params.keys())},
                success=True,
            )
            
            return evidence
            
        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="evidence.update",
                user_id=user_id,
                resource_id=str(evidence_id),
                action="update",
                success=False,
                error_message=str(e),
            )
            raise RuntimeError(f"Failed to update evidence: {str(e)}")
    
    # ===== DELETE OPERATIONS =====
    
    def delete_evidence(self, evidence_id: int, user_id: int) -> bool:
        """
        Delete evidence by ID.
        
        Args:
            evidence_id: Evidence ID
            user_id: User ID (for audit logging)
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            RuntimeError: If database operation fails
        """
        try:
            delete_query = text("DELETE FROM evidence WHERE id = :evidence_id")
            result = self.db.execute(delete_query, {"evidence_id": evidence_id})
            self.db.commit()
            
            deleted = result.rowcount > 0
            
            # Log audit event
            self._log_audit(
                event_type="evidence.delete",
                user_id=user_id,
                resource_id=str(evidence_id),
                action="delete",
                success=deleted,
            )
            
            return deleted
            
        except Exception as e:
            self.db.rollback()
            self._log_audit(
                event_type="evidence.delete",
                user_id=user_id,
                resource_id=str(evidence_id),
                action="delete",
                success=False,
                error_message=str(e),
            )
            raise RuntimeError(f"Failed to delete evidence: {str(e)}")
    
    # ===== HELPER METHODS =====
    
    def _row_to_dict(self, row: Any) -> Dict[str, Any]:
        """
        Convert database row to dictionary with proper datetime formatting.
        
        Args:
            row: SQLAlchemy row result
            
        Returns:
            Dictionary with camelCase keys and formatted dates
        """
        evidence_dict = dict(row._mapping)
        
        # Format datetime fields
        evidence_dict["uploadedAt"] = (
            evidence_dict["createdAt"].isoformat()
            if evidence_dict.get("createdAt")
            else None
        )
        evidence_dict["createdAt"] = (
            evidence_dict["createdAt"].isoformat()
            if evidence_dict.get("createdAt")
            else None
        )
        evidence_dict["updatedAt"] = (
            evidence_dict["updatedAt"].isoformat()
            if evidence_dict.get("updatedAt")
            else None
        )
        
        return evidence_dict
    
    def count_for_case(self, case_id: int) -> int:
        """
        Count evidence items for a specific case.
        
        Args:
            case_id: Case ID
            
        Returns:
            Number of evidence items
        """
        query = text("SELECT COUNT(*) FROM evidence WHERE case_id = :case_id")
        result = self.db.execute(query, {"case_id": case_id}).scalar()
        return result or 0
    
    def count_for_user(self, user_id: int) -> int:
        """
        Count all evidence items for a user's cases.
        
        Args:
            user_id: User ID
            
        Returns:
            Total number of evidence items
        """
        query = text("""
            SELECT COUNT(*)
            FROM evidence e
            INNER JOIN cases c ON e.case_id = c.id
            WHERE c.user_id = :user_id
        """)
        result = self.db.execute(query, {"user_id": user_id}).scalar()
        return result or 0
