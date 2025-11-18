"""
Quick script to create the audit_logs table in the database.
This is needed for the AuditLogger blockchain-style audit trail.
"""

import sqlite3
import os

# Database path
db_path = os.getenv("DATABASE_PATH", "justice.db")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create audit_logs table with full blockchain-style schema
create_table_sql = """
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id TEXT,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    integrity_hash TEXT NOT NULL,
    previous_log_hash TEXT,
    created_at TEXT NOT NULL
)
"""

try:
    cursor.execute(create_table_sql)
    conn.commit()
    print("[OK] Successfully created audit_logs table")

    # Verify table was created
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'")
    result = cursor.fetchone()

    if result:
        print(f"[OK] Table 'audit_logs' confirmed in database: {db_path}")
    else:
        print(f"[ERROR] Table 'audit_logs' not found after creation")

except Exception as e:
    print(f"[ERROR] Error creating table: {e}")
finally:
    conn.close()
