"""
Test script for Database Management API endpoints.

Tests all database management operations:
- GET /database/stats - Database statistics
- POST /database/backup - Create backup
- GET /database/backups - List backups
- POST /database/restore - Restore backup (admin only)
- POST /database/vacuum - VACUUM database (admin only)
- DELETE /database/backups/{filename} - Delete backup (admin only)

Usage:
    python backend/test_database_api.py
"""

import requests
import json
from typing import Optional

# Base URL for the API
BASE_URL = "http://127.0.0.1:8000"

# Test credentials (you'll need a valid user in the database)
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "Admin123!"

def login(email: str, password: str) -> Optional[str]:
    """
    Login and get session ID.

    Returns:
        Session ID if login successful, None otherwise
    """
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )

    if response.status_code == 200:
        data = response.json()
        return data.get("session_id")
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def test_get_stats(session_id: str):
    """Test GET /database/stats"""
    print("\n=== Testing GET /database/stats ===")

    response = requests.get(
        f"{BASE_URL}/database/stats",
        headers={"Authorization": session_id}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("Response:")
        print(json.dumps(data, indent=2))
        print(f"✓ Database connected: {data['connected']}")
        print(f"✓ Database size: {data['database_size_mb']} MB")
        print(f"✓ Tables: {data['table_count']}")
        print(f"✓ Total records: {data['total_records']}")
    else:
        print(f"✗ Failed: {response.text}")

def test_create_backup(session_id: str) -> Optional[str]:
    """
    Test POST /database/backup

    Returns:
        Backup filename if successful, None otherwise
    """
    print("\n=== Testing POST /database/backup ===")

    response = requests.post(
        f"{BASE_URL}/database/backup",
        headers={"Authorization": session_id}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 201:
        data = response.json()
        print("Response:")
        print(json.dumps(data, indent=2))
        print(f"✓ Backup created: {data['filename']}")
        print(f"✓ Size: {data['size_mb']} MB")
        print(f"✓ Valid: {data['is_valid']}")
        return data['filename']
    else:
        print(f"✗ Failed: {response.text}")
        return None

def test_list_backups(session_id: str):
    """Test GET /database/backups"""
    print("\n=== Testing GET /database/backups ===")

    response = requests.get(
        f"{BASE_URL}/database/backups",
        headers={"Authorization": session_id}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Found {data['count']} backups")
        for backup in data['backups']:
            print(f"  - {backup['filename']}: {backup['size_mb']} MB (valid: {backup['is_valid']})")
    else:
        print(f"✗ Failed: {response.text}")

def test_vacuum(session_id: str):
    """Test POST /database/vacuum (admin only)"""
    print("\n=== Testing POST /database/vacuum (ADMIN ONLY) ===")

    response = requests.post(
        f"{BASE_URL}/database/vacuum",
        headers={"Authorization": session_id}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("Response:")
        print(json.dumps(data, indent=2))
        print(f"✓ Database vacuumed successfully")
        print(f"✓ Space reclaimed: {data['space_reclaimed_mb']} MB")
    elif response.status_code == 403:
        print("✗ Forbidden: Admin privileges required")
    else:
        print(f"✗ Failed: {response.text}")

def test_restore_backup(session_id: str, backup_filename: str):
    """Test POST /database/restore (admin only)"""
    print(f"\n=== Testing POST /database/restore (ADMIN ONLY) ===")
    print(f"Restoring backup: {backup_filename}")
    print("⚠ WARNING: This is a destructive operation (creates pre-restore backup)")

    # Ask for confirmation
    confirm = input("Continue? (yes/no): ")
    if confirm.lower() != "yes":
        print("Skipped restore test")
        return

    response = requests.post(
        f"{BASE_URL}/database/restore",
        headers={"Authorization": session_id},
        json={"backup_filename": backup_filename}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("Response:")
        print(json.dumps(data, indent=2))
        print(f"✓ Database restored successfully")
        print(f"✓ Pre-restore backup: {data['pre_restore_backup']}")
    elif response.status_code == 403:
        print("✗ Forbidden: Admin privileges required")
    else:
        print(f"✗ Failed: {response.text}")

def test_delete_backup(session_id: str, backup_filename: str):
    """Test DELETE /database/backups/{filename} (admin only)"""
    print(f"\n=== Testing DELETE /database/backups/{backup_filename} (ADMIN ONLY) ===")
    print(f"Deleting backup: {backup_filename}")

    # Ask for confirmation
    confirm = input("Continue? (yes/no): ")
    if confirm.lower() != "yes":
        print("Skipped delete test")
        return

    response = requests.delete(
        f"{BASE_URL}/database/backups/{backup_filename}",
        headers={"Authorization": session_id}
    )

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("Response:")
        print(json.dumps(data, indent=2))
        print(f"✓ Backup deleted successfully")
    elif response.status_code == 403:
        print("✗ Forbidden: Admin privileges required")
    else:
        print(f"✗ Failed: {response.text}")

def main():
    """Main test runner"""
    print("=== Database Management API Test ===")
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")

    # Login
    print("\n=== Logging in ===")
    session_id = login(TEST_EMAIL, TEST_PASSWORD)

    if not session_id:
        print("✗ Login failed. Cannot proceed with tests.")
        print("Make sure:")
        print("  1. Backend is running (python -m backend.main)")
        print("  2. Test user exists with correct credentials")
        return

    print(f"✓ Login successful. Session ID: {session_id[:20]}...")

    # Run tests
    test_get_stats(session_id)

    backup_filename = test_create_backup(session_id)

    test_list_backups(session_id)

    test_vacuum(session_id)

    # Destructive tests (require confirmation)
    if backup_filename:
        print("\n=== DESTRUCTIVE TESTS (require confirmation) ===")
        test_restore_backup(session_id, backup_filename)
        test_delete_backup(session_id, backup_filename)

    print("\n=== All tests completed ===")

if __name__ == "__main__":
    main()
