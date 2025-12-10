import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text

from backend.models.ai_provider_config import AIProviderConfig
from backend.models.base import Base, engine


def fix_constraint():
    print("Starting database constraint fix...")

    with engine.connect() as conn:
        # Check if old table exists (interrupted migration)
        old_table_exists = conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='ai_provider_configs_old'"
            )
        ).fetchone()

        # Check if table exists
        table_exists = conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='ai_provider_configs'"
            )
        ).fetchone()

        if not table_exists and not old_table_exists:
            print("Table ai_provider_configs does not exist. Nothing to fix.")
            return

        if table_exists and not old_table_exists:
            print("Renaming existing table...")
            try:
                conn.execute(
                    text(
                        "ALTER TABLE ai_provider_configs RENAME TO ai_provider_configs_old"
                    )
                )
                conn.commit()
                old_table_exists = True
            except Exception as e:
                print(f"Error renaming table: {e}")
                return

        if old_table_exists:
            # Drop indexes on the old table to avoid conflicts
            print("Dropping indexes on old table...")
            indexes = conn.execute(
                text(
                    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ai_provider_configs_old'"
                )
            ).fetchall()
            for idx in indexes:
                idx_name = idx[0]
                if idx_name and not idx_name.startswith("sqlite_"):
                    print(f"Dropping index {idx_name}...")
                    conn.execute(text(f"DROP INDEX IF EXISTS {idx_name}"))
            conn.commit()

    print("Creating new table with updated constraints...")
    # Create the new table using SQLAlchemy models
    Base.metadata.create_all(engine)

    with engine.connect() as conn:
        print("Copying data...")
        try:
            # Copy data from old table to new table
            # We list columns explicitly to be safe, or just * if schema matches
            # Since we only changed constraint, columns should match.
            conn.execute(
                text(
                    "INSERT INTO ai_provider_configs SELECT * FROM ai_provider_configs_old"
                )
            )
            conn.commit()
            print("Data copied successfully.")

            print("Dropping old table...")
            conn.execute(text("DROP TABLE ai_provider_configs_old"))
            conn.commit()
            print("Old table dropped.")

        except Exception as e:
            print(f"Error copying data: {e}")
            print("Restoring old table...")
            try:
                conn.execute(text("DROP TABLE IF EXISTS ai_provider_configs"))
                conn.execute(
                    text(
                        "ALTER TABLE ai_provider_configs_old RENAME TO ai_provider_configs"
                    )
                )
                conn.commit()
                print("Restored successfully.")
            except Exception as e2:
                print(f"CRITICAL: Failed to restore table: {e2}")

    print("Database constraint fix completed.")


if __name__ == "__main__":
    fix_constraint()
