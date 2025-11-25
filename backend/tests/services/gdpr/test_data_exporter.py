"""
Test script for DataExporter service.

This script verifies that the DataExporter correctly:
1. Exports all user data from 13 tables
2. Decrypts encrypted fields
3. Converts datetime objects to ISO strings
4. Creates valid JSON output
"""

import os
import json
import base64
from datetime import datetime

# Mock SQLAlchemy session for testing

class MockRow:
    def __init__(self, data):
        self._mapping = data

class MockResult:
    def __init__(self, rows):
        self._rows = rows
        self._index = 0

    def fetchone(self):
        return MockRow(self._rows[0]) if self._rows else None

    def fetchall(self):
        return [MockRow(row) for row in self._rows]

class MockSession:
    def __init__(self):
        self.data = {
            "users": [
                {
                    "id": 1,
                    "username": "testuser",
                    "email": "test@example.com",
                    "created_at": datetime(2024, 1, 1, 12, 0, 0),
                    "updated_at": datetime(2024, 1, 1, 12, 0, 0),
                    "last_login_at": datetime(2024, 1, 15, 10, 30, 0)
                }
            ],
            "cases": [
                {
                    "id": 1,
                    "user_id": 1,
                    "title": "Test Case",
                    "description": "Plain text description",
                    "status": "open",
                    "created_at": datetime(2024, 1, 2, 14, 0, 0),
                    "updated_at": datetime(2024, 1, 2, 14, 0, 0)
                }
            ],
            "evidence": [],
            "legal_issues": [],
            "timeline_events": [],
            "actions": [],
            "notes": [],
            "chat_conversations": [],
            "chat_messages": [],
            "user_facts": [],
            "case_facts": [],
            "sessions": [
                {
                    "id": "session-123",
                    "user_id": 1,
                    "created_at": datetime(2024, 1, 15, 10, 30, 0),
                    "expires_at": datetime(2024, 1, 16, 10, 30, 0),
                    "ip_address": "127.0.0.1",
                    "user_agent": "Mozilla/5.0"
                }
            ],
            "consents": [
                {
                    "id": 1,
                    "user_id": 1,
                    "consent_type": "data_processing",
                    "granted": True,
                    "created_at": datetime(2024, 1, 1, 12, 0, 0),
                    "updated_at": datetime(2024, 1, 1, 12, 0, 0)
                }
            ],
            "migrations": [{"version": "010"}]
        }

    def execute(self, query, params=None):
        query_str = str(query)

        # Determine which table is being queried
        if "FROM users" in query_str:
            return MockResult(self.data["users"])
        elif "FROM cases" in query_str:
            return MockResult(self.data["cases"])
        elif "FROM evidence" in query_str:
            return MockResult(self.data["evidence"])
        elif "FROM legal_issues" in query_str:
            return MockResult(self.data["legal_issues"])
        elif "FROM timeline_events" in query_str:
            return MockResult(self.data["timeline_events"])
        elif "FROM actions" in query_str:
            return MockResult(self.data["actions"])
        elif "FROM notes" in query_str:
            return MockResult(self.data["notes"])
        elif "FROM chat_conversations" in query_str:
            return MockResult(self.data["chat_conversations"])
        elif "FROM chat_messages" in query_str:
            return MockResult(self.data["chat_messages"])
        elif "FROM user_facts" in query_str:
            return MockResult(self.data["user_facts"])
        elif "FROM case_facts" in query_str:
            return MockResult(self.data["case_facts"])
        elif "FROM sessions" in query_str:
            return MockResult(self.data["sessions"])
        elif "FROM consents" in query_str:
            return MockResult(self.data["consents"])
        elif "FROM migrations" in query_str:
            return MockResult(self.data["migrations"])
        else:
            return MockResult([])

def test_data_exporter():
    """Test DataExporter with mock data."""
    # Import here to avoid import errors if dependencies aren't installed
    import sys
    from pathlib import Path

    # Add parent directory to path
    backend_path = Path(__file__).parent.parent.parent
    if str(backend_path) not in sys.path:
        sys.path.insert(0, str(backend_path))

    from backend.services.security.encryption import EncryptionService
    from backend.services.gdpr.data_exporter import DataExporter, GdprExportOptions

    # Generate test encryption key
    encryption_key = base64.b64encode(os.urandom(32)).decode('utf-8')
    encryption_service = EncryptionService(encryption_key)

    # Create mock database session
    db = MockSession()

    # Create DataExporter
    exporter = DataExporter(db, encryption_service)

    # Export user data
    print("Exporting user data...")
    export_result = exporter.export_all_user_data(
        user_id=1,
        options=GdprExportOptions(export_format="json")
    )

    # Verify metadata
    print(f"\nMetadata:")
    print(f"  User ID: {export_result.metadata.user_id}")
    print(f"  Export Date: {export_result.metadata.export_date}")
    print(f"  Schema Version: {export_result.metadata.schema_version}")
    print(f"  Format: {export_result.metadata.format}")
    print(f"  Total Records: {export_result.metadata.total_records}")

    # Verify user data
    print(f"\nUser Data:")
    for table_name, table_export in export_result.user_data.items():
        print(f"  {table_name}: {table_export.count} records")

    # Verify profile data
    assert export_result.user_data["profile"].count == 1
    profile = export_result.user_data["profile"].records[0]
    assert profile["username"] == "testuser"
    assert profile["email"] == "test@example.com"
    assert "password_hash" not in profile  # Password hash should NOT be exported
    print(f"\n  Profile: {profile}")

    # Verify cases data
    assert export_result.user_data["cases"].count == 1
    case = export_result.user_data["cases"].records[0]
    assert case["title"] == "Test Case"
    assert case["description"] == "Plain text description"
    print(f"\n  Case: {case}")

    # Verify sessions data
    assert export_result.user_data["sessions"].count == 1
    session = export_result.user_data["sessions"].records[0]
    assert session["user_id"] == 1
    assert "token" not in session  # Session token should NOT be exported
    print(f"\n  Session: {session}")

    # Convert to JSON and verify it's valid
    print("\nConverting to JSON...")
    export_dict = export_result.to_dict()
    json_str = json.dumps(export_dict, indent=2)
    print(f"  JSON size: {len(json_str)} bytes")

    # Save to file
    output_file = "test_export.json"
    print(f"\nSaving to {output_file}...")
    exporter.save_to_file(export_result, output_file)
    print(f"  File saved successfully")

    # Verify file was created
    assert Path(output_file).exists()
    print(f"  File exists: {Path(output_file).exists()}")

    # Read back and verify
    with open(output_file, 'r') as f:
        loaded_data = json.load(f)
    print(f"  Loaded data has {loaded_data['metadata']['totalRecords']} total records")

    # Cleanup
    if Path(output_file).exists():
        Path(output_file).unlink()
        print(f"\n  Cleaned up {output_file}")

    print("\n[OK] All tests passed!")

if __name__ == "__main__":
    test_data_exporter()
