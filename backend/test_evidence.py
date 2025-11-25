"""
Quick test script for evidence routes.
Run with: python -m backend.test_evidence
"""

import requests

BASE_URL = "http://127.0.0.1:8000"

def test_evidence_flow():
    """Test the complete evidence workflow."""

    print("Testing Evidence Routes...")
    print("-" * 60)

    # Step 1: Register/Login to get session
    print("\n1. Registering user...")
    register_data = {
        "username": "testuser_evidence",
        "password": "TestPassword123!",
        "email": "testevidence@example.com"
    }

    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    if response.status_code == 201 or response.status_code == 200:
        auth_data = response.json()
        session_id = auth_data["session"]["id"]
        user_id = auth_data["user"]["id"]
        print(f"   User registered: {user_id}")
        print(f"   Session ID: {session_id}")
    else:
        # Try login if registration fails
        print("   Registration failed, trying login...")
        login_data = {
            "username": "testuser_evidence",
            "password": "TestPassword123!",
            "remember_me": False
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"   Login failed: {response.text}")
            return

        auth_data = response.json()
        session_id = auth_data["session"]["id"]
        user_id = auth_data["user"]["id"]
        print(f"   User logged in: {user_id}")
        print(f"   Session ID: {session_id}")

    # Step 2: Create a test case
    print("\n2. Creating test case...")
    case_data = {
        "title": "Evidence Test Case",
        "description": "Case for testing evidence upload",
        "caseType": "employment",
        "status": "active"
    }

    headers = {"Authorization": session_id}
    response = requests.post(f"{BASE_URL}/cases", json=case_data, headers=headers)

    if response.status_code != 201:
        print(f"   Failed to create case: {response.text}")
        return

    case = response.json()
    case_id = case["id"]
    print(f"   Case created: {case_id}")

    # Step 3: Upload evidence (document with file path)
    print("\n3. Uploading document evidence...")
    evidence_data = {
        "caseId": case_id,
        "evidenceType": "document",
        "title": "Employment Contract",
        "filePath": "/documents/contract.pdf",
        "obtainedDate": "2025-11-01"
    }

    response = requests.post(f"{BASE_URL}/evidence", json=evidence_data, headers=headers)

    if response.status_code != 201:
        print(f"   Failed to upload evidence: {response.text}")
        return

    evidence1 = response.json()
    evidence1_id = evidence1["id"]
    print(f"   Evidence uploaded: {evidence1_id}")
    print(f"   Title: {evidence1['title']}")
    print(f"   Type: {evidence1['evidenceType']}")
    print(f"   File Path: {evidence1['filePath']}")

    # Step 4: Upload evidence (note with content)
    print("\n4. Uploading note evidence...")
    evidence_data2 = {
        "caseId": case_id,
        "evidenceType": "note",
        "title": "Meeting Notes",
        "content": "Discussion with HR manager on 2025-11-05. Key points: wrongful termination, no written warning, breach of contract.",
        "obtainedDate": "2025-11-05"
    }

    response = requests.post(f"{BASE_URL}/evidence", json=evidence_data2, headers=headers)

    if response.status_code != 201:
        print(f"   Failed to upload evidence: {response.text}")
        return

    evidence2 = response.json()
    evidence2_id = evidence2["id"]
    print(f"   Evidence uploaded: {evidence2_id}")
    print(f"   Title: {evidence2['title']}")
    print(f"   Type: {evidence2['evidenceType']}")
    print(f"   Content: {evidence2['content'][:50]}...")

    # Step 5: List evidence for case
    print("\n5. Listing all evidence for case...")
    response = requests.get(f"{BASE_URL}/evidence/case/{case_id}", headers=headers)

    if response.status_code != 200:
        print(f"   Failed to list evidence: {response.text}")
        return

    evidence_list = response.json()
    print(f"   Found {len(evidence_list)} evidence items:")
    for item in evidence_list:
        print(f"   - {item['id']}: {item['title']} ({item['evidenceType']})")

    # Step 6: Delete evidence
    print("\n6. Deleting first evidence...")
    response = requests.delete(f"{BASE_URL}/evidence/{evidence1_id}", headers=headers)

    if response.status_code != 200:
        print(f"   Failed to delete evidence: {response.text}")
        return

    result = response.json()
    print(f"   Evidence deleted: {result['success']}")

    # Step 7: Verify deletion
    print("\n7. Verifying deletion...")
    response = requests.get(f"{BASE_URL}/evidence/case/{case_id}", headers=headers)

    if response.status_code != 200:
        print(f"   Failed to list evidence: {response.text}")
        return

    evidence_list = response.json()
    print(f"   Remaining evidence: {len(evidence_list)} items")
    for item in evidence_list:
        print(f"   - {item['id']}: {item['title']} ({item['evidenceType']})")

    # Step 8: Test validation (should fail)
    print("\n8. Testing validation (should fail)...")

    # Test 1: Both filePath and content (should fail)
    print("   Test: Providing both filePath and content...")
    bad_data = {
        "caseId": case_id,
        "evidenceType": "document",
        "title": "Bad Evidence",
        "filePath": "/path/to/file.pdf",
        "content": "This should fail"
    }
    response = requests.post(f"{BASE_URL}/evidence", json=bad_data, headers=headers)
    print(f"   Expected failure: {response.status_code == 400}")

    # Test 2: Neither filePath nor content (should fail)
    print("   Test: Providing neither filePath nor content...")
    bad_data2 = {
        "caseId": case_id,
        "evidenceType": "document",
        "title": "Bad Evidence 2"
    }
    response = requests.post(f"{BASE_URL}/evidence", json=bad_data2, headers=headers)
    print(f"   Expected failure: {response.status_code == 400}")

    # Test 3: Invalid evidence type (should fail)
    print("   Test: Invalid evidence type...")
    bad_data3 = {
        "caseId": case_id,
        "evidenceType": "invalid_type",
        "title": "Bad Evidence 3",
        "filePath": "/path/to/file.pdf"
    }
    response = requests.post(f"{BASE_URL}/evidence", json=bad_data3, headers=headers)
    print(f"   Expected failure: {response.status_code == 422 or response.status_code == 400}")

    # Test 4: Unauthorized access to another user's case (should fail)
    print("   Test: Accessing evidence from non-owned case...")
    fake_case_id = 99999
    response = requests.get(f"{BASE_URL}/evidence/case/{fake_case_id}", headers=headers)
    print(f"   Expected failure (404): {response.status_code == 404}")

    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_evidence_flow()
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to backend.")
        print("Make sure the backend is running:")
        print("  python -m backend.main")
    except Exception as exc:
        print(f"\nError during testing: {e}")
        import traceback
        traceback.print_exc()
