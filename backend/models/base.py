"""
SQLAlchemy base model and database configuration.

IMPROVED: Supports SQLCipher encryption for SQLite databases (GDPR compliance).

Supports both SQLite (local development) and PostgreSQL (cloud production).
Database URL is determined by environment variable DATABASE_URL.

Security improvements:
- SQLCipher encryption for SQLite (AES-256 encryption at rest)
- Secure key management via environment variables
- GDPR-compliant data protection for legal PII
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from typing import Generator
import os
import secrets

# Database configuration
# Cloud-ready: Use DATABASE_URL env var if available (Railway, Heroku, etc.)
# Otherwise default to SQLite for local development

def get_encryption_key() -> str:
    """
    Get or generate database encryption key for SQLCipher.

    Priority:
    1. JUSTICE_DB_ENCRYPTION_KEY environment variable (production)
    2. .dbkey file in project root (persistent development)
    3. Generate and save new key (first-time setup)

    Returns:
        64-character hex string (32 bytes = 256-bit key)
    """
    # Priority 1: Environment variable
    if env_key := os.getenv("JUSTICE_DB_ENCRYPTION_KEY"):
        return env_key

    # Priority 2: Keyfile
    keyfile_path = os.getenv("JUSTICE_DB_KEYFILE_PATH", ".dbkey")
    if os.path.exists(keyfile_path):
        try:
            with open(keyfile_path, "r", encoding="utf-8") as f:
                key = f.read().strip()
                if len(key) >= 32:
                    return key
                print(f"WARNING: Encryption key in {keyfile_path} too short (< 32 chars)")
        except Exception as e:
            print(f"WARNING: Failed to read encryption key from {keyfile_path}: {e}")

    # Priority 3: Generate and save new key
    new_key = secrets.token_hex(32)  # 64 hex chars = 32 bytes = 256 bits

    try:
        with open(keyfile_path, "w", encoding="utf-8") as f:
            f.write(new_key)
        # Set restrictive permissions (owner read/write only)
        os.chmod(keyfile_path, 0o600)
        print(f"Generated new database encryption key: {keyfile_path}")
        return new_key
    except Exception as e:
        print(f"WARNING: Failed to save encryption key to {keyfile_path}: {e}")
        print("WARNING: Using ephemeral encryption key - data will be lost on restart!")
        return new_key

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
    # SQLite configuration with SQLCipher encryption
    encryption_key = get_encryption_key()

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},  # Required for SQLite
        echo=False,  # Set to True for SQL query logging
    )

    # Enable SQLCipher encryption on every connection
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        """
        Set SQLCipher encryption key and security settings on each connection.

        CRITICAL: This MUST be the first pragma executed on the connection.
        SQLCipher encryption is transparent once enabled - all data is
        automatically encrypted/decrypted with AES-256.
        """
        cursor = dbapi_conn.cursor()
        try:
            # CRITICAL: Set encryption key FIRST (before any other operation)
            cursor.execute(f"PRAGMA key = '{encryption_key}'")

            # Verify SQLCipher is enabled
            cursor.execute("PRAGMA cipher_version")
            version = cursor.fetchone()

            if not version or not version[0]:
                # SQLCipher is NOT available
                if os.getenv("ENVIRONMENT") == "production":
                    raise RuntimeError(
                        "SQLCipher is REQUIRED in production but not available! "
                        "Install SQLCipher and rebuild SQLite with encryption support."
                    )
                else:
                    # Development mode - warn and continue unencrypted
                    print("=" * 70)
                    print("WARNING: SQLCipher is NOT available!")
                    print("Database will be UNENCRYPTED (acceptable for development only)")
                    print("To enable encryption:")
                    print("  1. Install SQLCipher: pkg install sqlcipher (Termux)")
                    print("  2. Or use pysqlcipher3: pip install pysqlcipher3")
                    print("  3. For production: rebuild Python with SQLCipher support")
                    print("=" * 70)

                    # Set basic SQLite pragmas only (skip encryption settings)
                    cursor.execute("PRAGMA foreign_keys = ON")
                    cursor.execute("PRAGMA journal_mode = WAL")
                    cursor.execute("PRAGMA busy_timeout = 5000")
                    cursor.execute("PRAGMA synchronous = NORMAL")
                    cursor.execute("PRAGMA cache_size = -40000")
                    cursor.execute("PRAGMA temp_store = MEMORY")
                    return

            # SQLCipher IS available - configure security settings
            print(f"✅ SQLCipher enabled (version: {version[0]})")

            # SQLCipher security settings
            cursor.execute("PRAGMA cipher_memory_security = ON")  # Secure memory handling
            cursor.execute("PRAGMA cipher_page_size = 4096")     # Match system page size

            # Standard SQLite optimizations
            cursor.execute("PRAGMA foreign_keys = ON")           # Enable foreign keys
            cursor.execute("PRAGMA journal_mode = WAL")          # Write-ahead logging
            cursor.execute("PRAGMA busy_timeout = 5000")         # Wait 5s for locks
            cursor.execute("PRAGMA synchronous = NORMAL")        # Safe with WAL
            cursor.execute("PRAGMA cache_size = -40000")         # 40MB cache
            cursor.execute("PRAGMA temp_store = MEMORY")         # Temp tables in RAM

        except Exception as e:
            # Unexpected error during database configuration
            print(f"ERROR: Failed to configure database: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            cursor.close()
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

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

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
    # pylint: disable=import-outside-toplevel,unused-import
    from backend.models import (
        user,  # noqa: F401
        session,  # noqa: F401
        case,  # noqa: F401
        evidence,  # noqa: F401
        deadline,  # noqa: F401
        tag,  # noqa: F401
        template,  # noqa: F401
        chat,  # noqa: F401
        profile,  # noqa: F401
        consent,  # noqa: F401
        notification,  # noqa: F401
        backup,  # noqa: F401
        ai_provider_config,  # noqa: F401
    )
    # pylint: enable=import-outside-toplevel,unused-import

    # Now create all tables
    Base.metadata.create_all(bind=engine)
    print(
        f"Created {len(Base.metadata.tables)} tables: {list(Base.metadata.tables.keys())}"
    )
