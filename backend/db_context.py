"""
Database context managers for proper resource management.

This module provides context managers for database sessions to ensure
proper cleanup and transaction management.
"""

from contextlib import contextmanager, asynccontextmanager
from typing import Generator, AsyncGenerator
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.base import SessionLocal


@contextmanager
def db_session() -> Generator[Session, None, None]:
    """
    Context manager for database session.

    Ensures proper cleanup even if exceptions occur.
    Commits on success, rolls back on error.

    Usage:
        with db_session() as db:
            user = User(username="test")
            db.add(user)
            # Automatically commits on exit
            # Automatically rolls back on exception

    Yields:
        Database session
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def db_session_read_only() -> Generator[Session, None, None]:
    """
    Context manager for read-only database operations.

    Does not commit changes - useful for queries that should not modify database.

    Usage:
        with db_session_read_only() as db:
            users = db.query(User).all()
            # No commit - read only

    Yields:
        Database session (read-only)
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def db_transaction() -> Generator[Session, None, None]:
    """
    Context manager for explicit transaction control.

    Provides fine-grained control over transactions.
    Commits only when explicitly called, rolls back on exception.

    Usage:
        with db_transaction() as db:
            user = User(username="test")
            db.add(user)
            db.flush()  # Flush to get ID

            case = Case(user_id=user.id, title="Test")
            db.add(case)
            # Auto commits at end of context

    Yields:
        Database session with transaction control
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


class DatabaseManager:
    """
    Database session manager with context manager support.

    Provides a high-level interface for database operations
    with automatic resource cleanup.
    """

    def __init__(self, session: Session):
        """
        Initialize database manager.

        Args:
            session: SQLAlchemy session
        """
        self.session = session
        self._closed = False

    def __enter__(self) -> 'DatabaseManager':
        """Enter context."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context with cleanup."""
        if not self._closed:
            if exc_type is not None:
                self.session.rollback()
            else:
                self.session.commit()
            self.session.close()
            self._closed = True
        return False

    def commit(self):
        """Commit current transaction."""
        if not self._closed:
            self.session.commit()

    def rollback(self):
        """Rollback current transaction."""
        if not self._closed:
            self.session.rollback()

    def flush(self):
        """Flush pending changes without committing."""
        if not self._closed:
            self.session.flush()

    def close(self):
        """Close the session."""
        if not self._closed:
            self.session.close()
            self._closed = True

    @classmethod
    @contextmanager
    def create(cls) -> Generator['DatabaseManager', None, None]:
        """
        Create a new database manager with context manager support.

        Usage:
            with DatabaseManager.create() as db_mgr:
                user = User(username="test")
                db_mgr.session.add(user)
                # Auto commits on exit

        Yields:
            DatabaseManager instance
        """
        session = SessionLocal()
        manager = cls(session)
        try:
            yield manager
        except Exception:
            manager.rollback()
            raise
        else:
            if not manager._closed:
                manager.commit()
        finally:
            manager.close()


# Async context managers for future async support
@asynccontextmanager
async def async_db_session() -> AsyncGenerator[Session, None]:
    """
    Async context manager for database session.

    Note: Currently uses sync session. Update when async engine is added.

    Usage:
        async with async_db_session() as db:
            user = User(username="test")
            db.add(user)

    Yields:
        Database session
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


__all__ = [
    'db_session',
    'db_session_read_only',
    'db_transaction',
    'DatabaseManager',
    'async_db_session',
]
