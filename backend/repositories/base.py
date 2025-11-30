"""
Base repository class providing common CRUD operations.

Generic repository pattern for data access layer with:
- Type-safe operations via generics
- Optional encryption service support
- Optional audit logging
- Common pagination and filtering
"""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List, Dict, Any, Type

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.services.security.encryption import EncryptionService
from backend.services.audit_logger import AuditLogger

# Type variable for SQLAlchemy model
T = TypeVar("T")

# Type variable for Pydantic create schema
CreateSchema = TypeVar("CreateSchema")

# Type variable for Pydantic update schema
UpdateSchema = TypeVar("UpdateSchema")


class BaseRepository(ABC, Generic[T]):
    """
    Abstract base repository providing common data access patterns.
    
    Subclasses should implement entity-specific logic while inheriting
    common CRUD operations and infrastructure.
    
    Type Parameters:
        T: SQLAlchemy model type
    
    Example:
        class TagRepository(BaseRepository[Tag]):
            model = Tag
            
            def create(self, data: TagCreate, user_id: int) -> Tag:
                tag = Tag(name=data.name, color=data.color, user_id=user_id)
                return self._save(tag)
    """
    
    # Subclasses must set this to their model class
    model: Type[T]
    
    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None,
        audit_logger: Optional[AuditLogger] = None,
    ):
        """
        Initialize repository with database session and optional services.
        
        Args:
            db: SQLAlchemy session
            encryption_service: Optional encryption service for sensitive fields
            audit_logger: Optional audit logger for tracking operations
        """
        self.db = db
        self.encryption_service = encryption_service
        self.audit_logger = audit_logger
    
    # ===== ABSTRACT METHODS (must be implemented by subclasses) =====
    
    @abstractmethod
    def create(self, data: Any, user_id: int) -> T:
        """
        Create a new entity.
        
        Args:
            data: Pydantic schema with entity data
            user_id: ID of the user creating the entity
            
        Returns:
            Created entity
        """
        pass
    
    # ===== COMMON CRUD OPERATIONS =====
    
    def get_by_id(self, entity_id: int, user_id: Optional[int] = None) -> Optional[T]:
        """
        Get entity by ID with optional user filtering.
        
        Args:
            entity_id: Primary key ID
            user_id: Optional user ID to filter by ownership
            
        Returns:
            Entity if found, None otherwise
        """
        query = self.db.query(self.model).filter(self.model.id == entity_id)
        
        # Filter by user_id if model has this field and user_id is provided
        if user_id is not None and hasattr(self.model, "user_id"):
            query = query.filter(self.model.user_id == user_id)
        
        return query.first()
    
    def get_all(
        self,
        user_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        descending: bool = False,
    ) -> List[T]:
        """
        Get all entities with optional pagination and ordering.
        
        Args:
            user_id: Optional user ID to filter by ownership
            skip: Number of records to skip (pagination offset)
            limit: Maximum number of records to return
            order_by: Field name to order by
            descending: If True, order descending
            
        Returns:
            List of entities
        """
        query = self.db.query(self.model)
        
        # Filter by user_id if model has this field and user_id is provided
        if user_id is not None and hasattr(self.model, "user_id"):
            query = query.filter(self.model.user_id == user_id)
        
        # Apply ordering
        if order_by and hasattr(self.model, order_by):
            order_field = getattr(self.model, order_by)
            query = query.order_by(order_field.desc() if descending else order_field)
        
        return query.offset(skip).limit(limit).all()
    
    def update(
        self, 
        entity_id: int, 
        data: Any, 
        user_id: Optional[int] = None
    ) -> Optional[T]:
        """
        Update an entity by ID.
        
        Args:
            entity_id: Primary key ID
            data: Pydantic schema with update data (only set fields will be updated)
            user_id: Optional user ID to verify ownership
            
        Returns:
            Updated entity if found and updated, None if not found
        """
        entity = self.get_by_id(entity_id, user_id)
        
        if not entity:
            return None
        
        # Get update data, excluding unset fields
        update_data = data.model_dump(exclude_unset=True)
        
        # Apply updates
        for field, value in update_data.items():
            if hasattr(entity, field):
                setattr(entity, field, value)
        
        self.db.commit()
        self.db.refresh(entity)
        
        return entity
    
    def delete(self, entity_id: int, user_id: Optional[int] = None) -> bool:
        """
        Delete an entity by ID.
        
        Args:
            entity_id: Primary key ID
            user_id: Optional user ID to verify ownership
            
        Returns:
            True if entity was deleted, False if not found
        """
        entity = self.get_by_id(entity_id, user_id)
        
        if not entity:
            return False
        
        self.db.delete(entity)
        self.db.commit()
        
        return True
    
    def count(self, user_id: Optional[int] = None, **filters: Any) -> int:
        """
        Count entities matching criteria.
        
        Args:
            user_id: Optional user ID to filter by ownership
            **filters: Additional field=value filters
            
        Returns:
            Count of matching entities
        """
        query = self.db.query(func.count(self.model.id))
        
        # Filter by user_id if model has this field and user_id is provided
        if user_id is not None and hasattr(self.model, "user_id"):
            query = query.filter(self.model.user_id == user_id)
        
        # Apply additional filters
        for field, value in filters.items():
            if hasattr(self.model, field):
                query = query.filter(getattr(self.model, field) == value)
        
        return query.scalar() or 0
    
    def exists(self, entity_id: int, user_id: Optional[int] = None) -> bool:
        """
        Check if an entity exists.
        
        Args:
            entity_id: Primary key ID
            user_id: Optional user ID to filter by ownership
            
        Returns:
            True if entity exists, False otherwise
        """
        query = self.db.query(self.model.id).filter(self.model.id == entity_id)
        
        if user_id is not None and hasattr(self.model, "user_id"):
            query = query.filter(self.model.user_id == user_id)
        
        return query.first() is not None
    
    # ===== PROTECTED HELPER METHODS =====
    
    def _save(self, entity: T) -> T:
        """
        Save entity to database (add and commit).
        
        Args:
            entity: Entity to save
            
        Returns:
            Saved entity with refreshed state
        """
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity
    
    def _log_audit(
        self,
        event_type: str,
        user_id: int,
        resource_id: str,
        action: str,
        details: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Log an audit event if audit logger is configured.
        
        Args:
            event_type: Type of event (e.g., "tag.create")
            user_id: ID of user performing action
            resource_id: ID of resource being acted upon
            action: Action being performed (create, read, update, delete)
            details: Optional additional details
            success: Whether the action succeeded
            error_message: Optional error message if action failed
        """
        if self.audit_logger:
            # Extract resource type from event_type (e.g., "tag.create" -> "tag")
            resource_type = event_type.split(".")[0] if "." in event_type else "unknown"
            
            self.audit_logger.log(
                event_type=event_type,
                user_id=str(user_id),
                resource_type=resource_type,
                resource_id=str(resource_id),
                action=action,
                details=details or {},
                success=success,
                error_message=error_message,
            )
    
    def _bulk_save(self, entities: List[T]) -> List[T]:
        """
        Save multiple entities in a single transaction.
        
        Args:
            entities: List of entities to save
            
        Returns:
            List of saved entities
        """
        self.db.add_all(entities)
        self.db.commit()
        
        # Refresh all entities
        for entity in entities:
            self.db.refresh(entity)
        
        return entities
