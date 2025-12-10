"""
Test script for export API endpoints.
Run this script to verify export functionality.

Usage:
    python backend/test_export.py
"""

from typing import Dict, Optional

import requests

BASE_URL = "http://127.0.0.1:8000"
REQUEST_TIMEOUT = 10

def _session_headers(session_token: Optional[str]) -> Optional[Dict[str, str]]:
    """Build Authorization headers when a session token exists."""
    if not session_token:
        print("✗ No session token. Login first.")
        return None
    return {"Authorization": f"Bearer {session_token}"}

def login(username: str, password: str) -> Optional[str]:
    """Login and get session token."""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": username, "password": password},
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Login successful: {data['username']}")
        return data['sessionId']
    else:
        print(f"✗ Login failed: {response.status_code} - {response.text}")
        return None

def test_get_templates():
    """Test GET /export/templates"""
    print("\n=== Testing GET /export/templates ===")

    response = requests.get(f"{BASE_URL}/export/templates", timeout=REQUEST_TIMEOUT)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Templates retrieved: {len(data['templates'])} templates")
        for template in data['templates']:
            print(f"  - {template['id']}: {template['name']} ({', '.join(template['formats'])})")
        return True
    else:
        print(f"✗ Failed: {response.status_code} - {response.text}")
        return False

def test_export_case_to_pdf(case_id: int, session_token: Optional[str]):
    """Test POST /export/case/{case_id}/pdf"""
    print(f"\n=== Testing POST /export/case/{case_id}/pdf ===")

    headers = _session_headers(session_token)
    if not headers:
        return False
    payload = {
        "includeEvidence": True,
        "includeTimeline": True,
        "includeNotes": True,
        "includeFacts": True,
        "includeDocuments": True,
        "template": "case-summary"
    }

    response = requests.post(
        f"{BASE_URL}/export/case/{case_id}/pdf",
        headers=headers,
        json=payload,
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        print("✓ Export successful:")
        print(f"  - File: {data['fileName']}")
        print(f"  - Path: {data['filePath']}")
        print(f"  - Format: {data['format']}")
        print(f"  - Template: {data['template']}")
        print(f"  - Size: {data['size']} bytes")
        print(f"  - Download: {data['downloadUrl']}")
        return True
    else:
        print(f"✗ Failed: {response.status_code} - {response.text}")
        return False

def test_export_case_to_docx(case_id: int, session_token: Optional[str]):
    """Test POST /export/case/{case_id}/docx"""
    print(f"\n=== Testing POST /export/case/{case_id}/docx ===")

    headers = _session_headers(session_token)
    if not headers:
        return False
    payload = {
        "includeEvidence": True,
        "includeNotes": True,
        "fileName": "my-custom-case-export"
    }

    response = requests.post(
        f"{BASE_URL}/export/case/{case_id}/docx",
        headers=headers,
        json=payload,
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        print("✓ Export successful:")
        print(f"  - File: {data['fileName']}")
        print(f"  - Format: {data['format']}")
        print(f"  - Template: {data['template']}")
        return True
    else:
        print(f"✗ Failed: {response.status_code} - {response.text}")
        return False

def test_export_evidence_to_pdf(case_id: int, session_token: Optional[str]):
    """Test POST /export/evidence/{case_id}/pdf"""
    print(f"\n=== Testing POST /export/evidence/{case_id}/pdf ===")

    headers = _session_headers(session_token)
    if not headers:
        return False

    response = requests.post(
        f"{BASE_URL}/export/evidence/{case_id}/pdf",
        headers=headers,
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        print("✓ Export successful:")
        print(f"  - File: {data['fileName']}")
        print(f"  - Template: {data['template']}")
        return True
    else:
        print(f"✗ Failed: {response.status_code} - {response.text}")
        return False

def test_export_timeline_to_pdf(case_id: int, session_token: Optional[str]):
    """Test POST /export/timeline/{case_id}/pdf"""
    print(f"\n=== Testing POST /export/timeline/{case_id}/pdf ===")

    headers = _session_headers(session_token)
    if not headers:
        return False

    response = requests.post(
        f"{BASE_URL}/export/timeline/{case_id}/pdf",
        headers=headers,
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        print("✓ Export successful:")
        print(f"  - File: {data['fileName']}")
        print(f"  - Template: {data['template']}")
        return True
    else:
        print(f"✗ Failed: {response.status_code} - {response.text}")
        return False

def test_export_notes_to_pdf(case_id: int, session_token: Optional[str]):
    """Test POST /export/notes/{case_id}/pdf"""
    print(f"\n=== Testing POST /export/notes/{case_id}/pdf ===")

    headers = _session_headers(session_token)
    if not headers:
        return False

    response = requests.post(
        f"{BASE_URL}/export/notes/{case_id}/pdf",
        headers=headers,
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        print("✓ Export successful:")
        print(f"  - File: {data['fileName']}")
        print(f"  - Template: {data['template']}")
        return True
    else:
        print(f"✗ Failed: {response.status_code} - {response.text}")
        return False

def test_export_notes_to_docx(case_id: int, session_token: Optional[str]):
    """Test POST /export/notes/{case_id}/docx"""
    print(f"\n=== Testing POST /export/notes/{case_id}/docx ===")

    headers = _session_headers(session_token)
    if not headers:
        return False

    response = requests.post(
        f"{BASE_URL}/export/notes/{case_id}/docx",
        headers=headers,
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        print("✓ Export successful:")
        print(f"  - File: {data['fileName']}")
        print(f"  - Template: {data['template']}")
        return True
    else:
        print(f"✗ Failed: {response.status_code} - {response.text}")
        return False

def test_unauthorized_access(case_id: int):
    """Test that unauthenticated requests are rejected."""
    print("\n=== Testing Unauthorized Access ===")

    response = requests.post(
        f"{BASE_URL}/export/case/{case_id}/pdf",
        timeout=REQUEST_TIMEOUT
    )

    if response.status_code == 401:
        print("✓ Correctly rejected unauthorized request")
        return True
    else:
        print(f"✗ Expected 401, got {response.status_code}")
        return False

def main():
    """Run all export API tests."""
    print("=" * 60)
    print("Justice Companion Export API Test Suite")
    print("=" * 60)

    # Check server health
    print("\n=== Checking Server Health ===")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            print(f"✓ Server is healthy: {response.json()}")
        else:
            print(f"✗ Server unhealthy: {response.status_code}")
            return
    except requests.exceptions.RequestException as e:
        print(f"✗ Cannot connect to server: {e}")
        print("\nMake sure the backend is running:")
        print("  python backend/main.py")
        return

    # Test templates endpoint (no auth required)
    test_get_templates()

    # Test unauthorized access
    test_unauthorized_access(1)

    # Login (replace with actual credentials)
    print("\n=== Login ===")
    print("Note: Using default test credentials (testuser/Test1234!)")
    session_token = login("testuser", "Test1234!")

    if not session_token:
        print("\n✗ Login failed. Cannot proceed with authenticated tests.")
        print("Create a test user first or update credentials in this script.")
        return

    # Test all export endpoints
    case_id = 1  # Replace with actual case ID from your database

    test_export_case_to_pdf(case_id, session_token)
    test_export_case_to_docx(case_id, session_token)
    test_export_evidence_to_pdf(case_id, session_token)
    test_export_timeline_to_pdf(case_id, session_token)
    test_export_notes_to_pdf(case_id, session_token)
    test_export_notes_to_docx(case_id, session_token)

    print("\n" + "=" * 60)
    print("Test suite completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
