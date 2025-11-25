"""
Tag service for organizing cases with user-defined labels.
Migrated from src/services/TagService.ts

Features:
- Tag CRUD operations with user ownership verification
- Many-to-many case-tag relationships via CaseTag junction table
- Tag usage statistics and analytics
- Hex color validation (#RRGGBB format)
- Comprehensive audit logging for all operations
- User isolation (users can only access their own tags)

Security:
- All operations verify user_id ownership
- HTTPException 403 for unauthorized access
- HTTPException 404 for non-existent tags
- All security events audited
"""

import re
from typing import Optional, List, Dict, Any, Tuple, cast
from datetime import datetime

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from sqlalchemy.exc import IntegrityError

from backend.models.tag import Tag, CaseTag
from backend.services.audit_logger import AuditLogger

# Custom exceptions
class TagNotFoundError(Exception):
    """Exception raised when tag is not found."""

class UnauthorizedError(Exception):
    """Exception raised when user doesn't own the tag."""

class ValidationError(Exception):
    """Exception raised for invalid input data."""

class DatabaseError(Exception):
    """Exception raised for database operation failures."""

class CreateTagInput(BaseModel):
    """Input model for creating a new tag."""

    name: str = Field(..., min_length=1, max_length=255, description="Tag name")
    color: str = Field(..., description="Hex color code (e.g., #3B82F6)")
    description: Optional[str] = Field(
        None, max_length=500, description="Tag description (optional)"
    )

    @field_validator("color")
    @classmethod
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Validate hex color format (#RRGGBB)."""
        if not re.match(r"^#[0-9A-Fa-f]{6}$", v):
            raise ValueError("Color must be a valid hex color code (e.g., #3B82F6)")
        return v.upper()

    model_config = ConfigDict(str_strip_whitespace=True)

class UpdateTagInput(BaseModel):
    """Input model for updating an existing tag."""

    name: Optional[str] = Field(
        None, min_length=1, max_length=255, description="Tag name"
    )
    color: Optional[str] = Field(None, description="Hex color code (e.g., #3B82F6)")
    description: Optional[str] = Field(
        None, max_length=500, description="Tag description"
    )

    @field_validator("color")
    @classmethod
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        """Validate hex color format (#RRGGBB)."""
        if v is None:
            return None
        if not re.match(r"^#[0-9A-Fa-f]{6}$", v):
            raise ValueError("Color must be a valid hex color code (e.g., #3B82F6)")
        return v.upper()

    model_config = ConfigDict(str_strip_whitespace=True)

class TagResponse(BaseModel):
    """Response model for tag data."""

    id: int
    user_id: int
    name: str
    color: str
    description: Optional[str]
    usage_count: int = Field(default=0, description="Number of cases using this tag")
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

class TagStatistics(BaseModel):
    """Statistics about user's tags."""

    total_tags: int = Field(description="Total number of tags")
    total_tagged_cases: int = Field(
        description="Total number of cases with at least one tag"
    )
    most_used_tag: Optional[TagResponse] = Field(
        None, description="Tag with highest usage count"
    )
    unused_tags: int = Field(description="Number of tags with zero usage")

class TagService:
    """
    Business logic layer for tag management.
    Handles CRUD operations, case-tag relationships, and statistics.

    All operations verify user ownership to prevent unauthorized access.
    """

    def __init__(self, db: Session, audit_logger: Optional[AuditLogger] = None):
        """
        Initialize tag service.

        Args:
            db: SQLAlchemy database session
            audit_logger: Optional audit logger instance
        """
        self.db = db
        self.audit_logger = audit_logger

    def create_tag(
        self,
        user_id: int,
        input_data: CreateTagInput,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tag:
        """
        Create a new tag.

        Args:
            user_id: User ID creating the tag
            input_data: Tag creation data (name, color, description)
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            Created Tag instance

        Raises:
            HTTPException: 400 if tag name already exists for user
            DatabaseError: If database operation fails
        """
        try:
            tag = Tag(
                user_id=user_id,
                name=input_data.name,
                color=input_data.color,
                description=input_data.description,
            )

            self.db.add(tag)
            self.db.commit()
            self.db.refresh(tag)

            self._log_audit(
                event_type="tag.create",
                user_id=user_id,
                resource_id=str(tag.id),
                action="create",
                success=True,
                details={"name": tag.name, "color": tag.color},
                ip_address=ip_address,
                user_agent=user_agent,
            )

            return tag

        except IntegrityError as e:
            self.db.rollback()
            if "UNIQUE constraint failed" in str(e) or "idx_tags_user_name" in str(e):
                raise HTTPException(
                    status_code=400, detail="A tag with this name already exists"
                )
            raise DatabaseError(f"Failed to create tag: {str(e)}")
        except Exception as exc:
            self.db.rollback()
            raise DatabaseError(f"Failed to create tag: {str(exc)}")

    def get_tags(self, user_id: int, include_usage_count: bool = True) -> List[Tag]:
        """
        Get all tags for a user with optional usage counts.

        Args:
            user_id: User ID to get tags for
            include_usage_count: Whether to calculate usage count (default: True)

        Returns:
            List of Tag instances with usage_count attribute
        """
        query = self.db.query(Tag).filter(Tag.user_id == user_id)

        if include_usage_count:
            # Join with CaseTag to get usage counts
            query = query.outerjoin(CaseTag, Tag.id == CaseTag.tag_id)
            query = query.group_by(Tag.id)
            query = query.add_columns(func.count(CaseTag.case_id).label("usage_count"))

            raw_results = query.order_by(Tag.name.asc()).all()
            results = cast(List[Tuple[Tag, Optional[int]]], raw_results)

            # Attach usage_count to each tag
            tags: List[Tag] = []
            for tag, usage_count in results:
                setattr(tag, "usage_count", usage_count or 0)
                tags.append(tag)

            return tags

        return query.order_by(Tag.name.asc()).all()

    def get_tag_by_id(
        self,
        tag_id: int,
        user_id: Optional[int] = None,
        include_usage_count: bool = True,
    ) -> Optional[Tag]:
        """
        Get tag by ID with optional user verification.

        Args:
            tag_id: Tag ID to retrieve
            user_id: Optional user ID for ownership verification
            include_usage_count: Whether to calculate usage count (default: True)

        Returns:
            Tag instance or None if not found

        Raises:
            HTTPException: 403 if user_id provided and doesn't match tag owner
        """
        query = self.db.query(Tag).filter(Tag.id == tag_id)

        tag: Tag
        if include_usage_count:
            # Join with CaseTag to get usage count
            query = query.outerjoin(CaseTag, Tag.id == CaseTag.tag_id)
            query = query.group_by(Tag.id)
            query = query.add_columns(func.count(CaseTag.case_id).label("usage_count"))

            raw_result = query.first()
            if not raw_result:
                return None

            tag_tuple = cast(Tuple[Tag, Optional[int]], raw_result)
            tag, usage_count = tag_tuple
            setattr(tag, "usage_count", usage_count or 0)
        else:
            tag_record = query.first()
            if not tag_record:
                return None
            tag = tag_record

        # Verify ownership if user_id provided
        if user_id is not None:
            self._verify_ownership(tag, user_id)

        return tag

    def update_tag(
        self,
        tag_id: int,
        user_id: int,
        input_data: UpdateTagInput,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tag:
        """
        Update tag attributes.

        Args:
            tag_id: Tag ID to update
            user_id: User ID making the update
            input_data: Fields to update (name, color, description)
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            Updated Tag instance

        Raises:
            HTTPException: 404 if tag not found, 403 if unauthorized, 400 if duplicate name
        """
        tag = self.get_tag_by_id(tag_id, user_id=user_id, include_usage_count=False)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        try:
            # Track changes for audit log
            changes: Dict[str, Dict[str, Optional[str]]] = {}

            # Apply updates
            if input_data.name is not None:
                changes["name"] = {"from": tag.name, "to": input_data.name}
                tag.name = input_data.name

            if input_data.color is not None:
                changes["color"] = {"from": tag.color, "to": input_data.color}
                tag.color = input_data.color

            if input_data.description is not None:
                changes["description"] = {
                    "from": tag.description,
                    "to": input_data.description,
                }
                tag.description = input_data.description

            # If no changes, return tag as-is
            if not changes:
                return tag

            # Update timestamp
            tag.updated_at = datetime.now()

            self.db.commit()
            self.db.refresh(tag)

            self._log_audit(
                event_type="tag.update",
                user_id=user_id,
                resource_id=str(tag_id),
                action="update",
                success=True,
                details=changes,
                ip_address=ip_address,
                user_agent=user_agent,
            )

            return tag

        except IntegrityError as e:
            self.db.rollback()
            if "UNIQUE constraint failed" in str(e) or "idx_tags_user_name" in str(e):
                raise HTTPException(
                    status_code=400, detail="A tag with this name already exists"
                )
            raise DatabaseError(f"Failed to update tag: {str(e)}")
        except Exception as exc:
            self.db.rollback()
            raise DatabaseError(f"Failed to update tag: {str(exc)}")

    def delete_tag(
        self,
        tag_id: int,
        user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Delete tag and remove from all cases.

        Args:
            tag_id: Tag ID to delete
            user_id: User ID making the deletion
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Raises:
            HTTPException: 404 if tag not found, 403 if unauthorized
        """
        tag = self.get_tag_by_id(tag_id, user_id=user_id, include_usage_count=True)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        try:
            # Store for audit log before deletion
            tag_info = {
                "name": tag.name,
                "color": tag.color,
                "usage_count": getattr(tag, "usage_count", 0),
            }

            # Delete tag (cascade will remove CaseTag entries automatically)
            self.db.delete(tag)
            self.db.commit()

            self._log_audit(
                event_type="tag.delete",
                user_id=user_id,
                resource_id=str(tag_id),
                action="delete",
                success=True,
                details=tag_info,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        except Exception as exc:
            self.db.rollback()
            raise DatabaseError(f"Failed to delete tag: {str(exc)}")

    def attach_tag_to_case(
        self,
        tag_id: int,
        case_id: int,
        user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """
        Attach tag to a case.

        Args:
            tag_id: Tag ID to attach
            case_id: Case ID to attach to
            user_id: User ID making the attachment
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            True if tag was attached, False if already attached

        Raises:
            HTTPException: 404 if tag not found, 403 if unauthorized
        """
        # Verify tag ownership
        tag = self.get_tag_by_id(tag_id, user_id=user_id, include_usage_count=False)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        # Check if already attached
        existing = (
            self.db.query(CaseTag)
            .filter(and_(CaseTag.tag_id == tag_id, CaseTag.case_id == case_id))
            .first()
        )

        if existing:
            return False  # Already attached

        try:
            case_tag = CaseTag(tag_id=tag_id, case_id=case_id)
            self.db.add(case_tag)
            self.db.commit()

            self._log_audit(
                event_type="tag.attach",
                user_id=user_id,
                resource_id=str(case_id),
                action="create",
                success=True,
                details={"tag_id": tag_id, "case_id": case_id},
                ip_address=ip_address,
                user_agent=user_agent,
            )

            return True

        except Exception as exc:
            self.db.rollback()
            raise DatabaseError(f"Failed to attach tag to case: {str(exc)}")

    def remove_tag_from_case(
        self,
        tag_id: int,
        case_id: int,
        user_id: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """
        Remove tag from a case.

        Args:
            tag_id: Tag ID to remove
            case_id: Case ID to remove from
            user_id: User ID making the removal
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            True if tag was removed, False if wasn't attached

        Raises:
            HTTPException: 404 if tag not found, 403 if unauthorized
        """
        # Verify tag ownership
        tag = self.get_tag_by_id(tag_id, user_id=user_id, include_usage_count=False)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        try:
            result = (
                self.db.query(CaseTag)
                .filter(and_(CaseTag.tag_id == tag_id, CaseTag.case_id == case_id))
                .delete(synchronize_session=False)
            )

            self.db.commit()

            if result > 0:
                self._log_audit(
                    event_type="tag.detach",
                    user_id=user_id,
                    resource_id=str(case_id),
                    action="delete",
                    success=True,
                    details={"tag_id": tag_id, "case_id": case_id},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                return True

            return False  # Wasn't attached

        except Exception as exc:
            self.db.rollback()
            raise DatabaseError(f"Failed to remove tag from case: {str(exc)}")

    def get_case_tags(self, case_id: int, user_id: Optional[int] = None) -> List[Tag]:
        """
        Get all tags for a specific case.

        Args:
            case_id: Case ID to get tags for
            user_id: Optional user ID for ownership verification

        Returns:
            List of Tag instances
        """
        query = (
            self.db.query(Tag)
            .join(CaseTag, Tag.id == CaseTag.tag_id)
            .filter(CaseTag.case_id == case_id)
        )

        if user_id is not None:
            query = query.filter(Tag.user_id == user_id)

        return query.order_by(Tag.name.asc()).all()

    def get_cases_by_tag(self, tag_id: int, user_id: int) -> List[int]:
        """
        Get all case IDs that have a specific tag.

        Args:
            tag_id: Tag ID to search for
            user_id: User ID for ownership verification

        Returns:
            List of case IDs

        Raises:
            HTTPException: 404 if tag not found, 403 if unauthorized
        """
        # Verify tag ownership
        tag = self.get_tag_by_id(tag_id, user_id=user_id, include_usage_count=False)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        results = self.db.query(CaseTag.case_id).filter(CaseTag.tag_id == tag_id).all()

        return [case_id for (case_id,) in results]

    def search_cases_by_tags(
        self, user_id: int, tag_ids: List[int], match_all: bool = True
    ) -> List[int]:
        """
        Search cases by tags with AND or OR logic.

        Args:
            user_id: User ID for ownership verification
            tag_ids: List of tag IDs to search for
            match_all: If True, cases must have ALL tags (AND logic).
                      If False, cases must have ANY tag (OR logic).

        Returns:
            List of case IDs matching the criteria
        """
        if not tag_ids:
            return []

        # Verify all tags belong to user
        tags = (
            self.db.query(Tag)
            .filter(and_(Tag.id.in_(tag_ids), Tag.user_id == user_id))
            .all()
        )

        if len(tags) != len(tag_ids):
            raise HTTPException(status_code=404, detail="One or more tags not found")

        if match_all:
            # AND logic: must have ALL specified tags
            query = (
                self.db.query(CaseTag.case_id)
                .filter(CaseTag.tag_id.in_(tag_ids))
                .group_by(CaseTag.case_id)
                .having(func.count(func.distinct(CaseTag.tag_id)) == len(tag_ids))
            )
        else:
            # OR logic: must have ANY specified tag
            query = self.db.query(func.distinct(CaseTag.case_id)).filter(
                CaseTag.tag_id.in_(tag_ids)
            )

        results = query.all()
        return [case_id for (case_id,) in results]

    def get_tag_statistics(self, user_id: int) -> TagStatistics:
        """
        Get tag usage statistics for a user.

        Args:
            user_id: User ID to get statistics for

        Returns:
            TagStatistics with total tags, tagged cases, most used tag, and unused tags
        """
        # Get all tags with usage counts
        tags = self.get_tags(user_id, include_usage_count=True)

        total_tags = len(tags)
        unused_tags = sum(1 for tag in tags if getattr(tag, "usage_count", 0) == 0)

        # Get total number of unique cases with at least one tag
        total_tagged_cases = (
            self.db.query(func.count(func.distinct(CaseTag.case_id)))
            .join(Tag, CaseTag.tag_id == Tag.id)
            .filter(Tag.user_id == user_id)
            .scalar()
            or 0
        )

        # Find most used tag
        most_used_tag = None
        if tags:
            most_used_tag = max(tags, key=lambda t: getattr(t, "usage_count", 0))
            # Only include if it has actual usage
            if getattr(most_used_tag, "usage_count", 0) == 0:
                most_used_tag = None

        return TagStatistics(
            total_tags=total_tags,
            total_tagged_cases=total_tagged_cases,
            most_used_tag=(
                TagResponse(
                    id=most_used_tag.id,
                    user_id=most_used_tag.user_id,
                    name=most_used_tag.name,
                    color=most_used_tag.color,
                    description=most_used_tag.description,
                    usage_count=getattr(most_used_tag, "usage_count", 0),
                    created_at=most_used_tag.created_at.isoformat(),
                    updated_at=most_used_tag.updated_at.isoformat(),
                )
                if most_used_tag
                else None
            ),
            unused_tags=unused_tags,
        )

    def _verify_ownership(self, tag: Tag, user_id: int) -> None:
        """
        Verify that user owns the tag.

        Args:
            tag: Tag instance to verify
            user_id: User ID making the request

        Raises:
            HTTPException: 403 if user doesn't own the tag
        """
        if tag.user_id != user_id:
            self._log_audit(
                event_type="tag.unauthorized_access",
                user_id=user_id,
                resource_id=str(tag.id),
                action="access_denied",
                success=False,
                details={
                    "reason": "User does not own this tag",
                    "tag_owner": tag.user_id,
                    "requesting_user": user_id,
                },
            )
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You do not have permission to access this tag",
            )

    def _log_audit(
        self,
        event_type: str,
        user_id: int,
        resource_id: str,
        action: str,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """
        Log audit event if audit logger is available.

        Args:
            event_type: Type of event (e.g., "tag.create")
            user_id: User ID performing the action
            resource_id: Resource ID affected
            action: Action performed (create, update, delete, etc.)
            success: Whether operation succeeded
            details: Additional context
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)
        """
        if self.audit_logger:
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id),
                resource_type="tag",
                resource_id=resource_id,
                action=action,
                success=success,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
            )
