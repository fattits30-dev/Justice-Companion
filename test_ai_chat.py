"""
Test AI Chat Endpoint
Tests if AI chat is working with HuggingFace provider
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_ai_chat():
    print("=== Testing AI Chat ===\n")

    # Step 1: Register or login
    print("1. Registering/Logging in...")

    # Try to register first (will fail if user exists)
    register_response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123"
        }
    )

    # Then login
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"identifier": "testuser", "password": "password123"}
    )

    if login_response.status_code != 200:
        print(f"[FAIL] Login failed: {login_response.status_code}")
        print(login_response.text)
        return

    login_data = login_response.json()
    if not login_data.get("success"):
        print(f"[FAIL] Login failed: {login_data.get('error')}")
        return

    session_id = login_data["data"]["session"]["id"]
    print(f"[OK] Logged in. Session ID: {session_id[:20]}...")

    # Step 2: Check AI health
    print("\n2. Checking AI health...")
    health_response = requests.get(f"{BASE_URL}/health")
    health_data = health_response.json()
    print(f"   Status: {health_data.get('status')}")
    print(f"   HF Connected: {health_data.get('hf_connected')}")

    # Step 3: Send chat message
    print("\n3. Sending test message to AI chat...")
    chat_response = requests.post(
        f"{BASE_URL}/chat/message",
        headers={"Authorization": f"Bearer {session_id}"},
        json={
            "message": "What is a small claims court?",
            "case_id": None
        }
    )

    if chat_response.status_code != 200:
        print(f"[FAIL] Chat request failed: {chat_response.status_code}")
        print(chat_response.text)
        return

    chat_data = chat_response.json()
    if not chat_data.get("success"):
        print(f"[FAIL] Chat failed: {chat_data.get('error')}")
        print(f"Full response: {json.dumps(chat_data, indent=2)}")
        return

    # Step 4: Check response
    response_text = chat_data.get("data", {}).get("response", "")

    print(f"\n[OK] AI Response received!")
    print(f"Response length: {len(response_text)} characters")
    print(f"\nFirst 200 characters:")
    print(f"{response_text[:200]}...")

    # Check if it's a stub response
    if "This is a mock AI response" in response_text or "stub" in response_text.lower():
        print("\n[WARN] WARNING: This looks like a STUB response!")
        print("   AI_MODE may still be set to 'stub' instead of 'sdk'")
    else:
        print("\n[SUCCESS] Real AI response from HuggingFace!")

if __name__ == "__main__":
    test_ai_chat()
