"""
SQLAlchemy base model and database configuration.

Supports both SQLite (local development) and PostgreSQL (cloud production).
Database URL is determined by environment variable DATABASE_URL.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Generator
import os

# Database configuration
# Cloud-ready: Use DATABASE_URL env var if available (Railway, Heroku, etc.)
# Otherwise default to SQLite for local development
def get_database_url() -> str:
    """
    Get database URL from environment or default to SQLite.

    Cloud platforms (Railway, Heroku) automatically provide DATABASE_URL.
    Local development uses SQLite file.
    """
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        # Cloud database (PostgreSQL)
        # Some platforms provide postgres:// which needs to be postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url
    else:
        # Local development (SQLite)
        # IMPORTANT: Use same database as Electron app (justice.db in project root)
        database_path = os.getenv("DATABASE_PATH", "justice.db")
        return f"sqlite:///{database_path}"


# Get database URL
SQLALCHEMY_DATABASE_URL = get_database_url()

# Determine database type
is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
is_postgresql = SQLALCHEMY_DATABASE_URL.startswith("postgresql")

# Create engine with database-specific options
if is_sqlite:
    # SQLite configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},  # Required for SQLite
        echo=False,  # Set to True for SQL query logging
    )
elif is_postgresql:
    # PostgreSQL configuration with connection pooling
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,  # Max 10 connections in pool
        max_overflow=20,  # Allow 20 additional connections if pool full
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,  # Recycle connections after 1 hour
        echo=False,  # Set to True for SQL query logging
    )
else:
    # Fallback to basic configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        echo=False,
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()


def get_db() -> Generator:
    """
    Database session dependency for FastAPI.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database: create all tables defined in models.
    Call this once at application startup.
    """
    # Import all models so they're registered with Base.metadata
    # This must happen before create_all() is called
    from backend.models import (
        user,
        session,
        case,
        evidence,
        deadline,
        tag,
        template,
        chat,
        profile,
        consent,
        notification,
        backup,
        ai_provider_config,
    )

    # Now create all tables
    Base.metadata.create_all(bind=engine)
    print(f"Created {len(Base.metadata.tables)} tables: {list(Base.metadata.tables.keys())}")
