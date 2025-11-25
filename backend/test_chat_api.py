"""
Quick test script for chat API endpoints.
Run with: python -m backend.test_chat_api

Prerequisites:
1. Backend server running (uvicorn backend.main:app)
2. Valid session_id from authentication
"""

import httpx
import asyncio
import json

async def test_stream_chat(session_id: str):
    """Test streaming chat endpoint with SSE."""
    url = "http://localhost:8000/chat/stream"
    headers = {
        "Authorization": f"Bearer {session_id}",
        "Content-Type": "application/json"
    }
    data = {
        "message": "Hello, I need help with a housing dispute. My landlord is refusing to return my deposit.",
        "conversationId": None,
        "caseId": None
    }

    print("\n=== Testing POST /chat/stream ===")
    print(f"Request: {json.dumps(data, indent=2)}")
    print("\nStreaming response:")

    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, headers=headers, json=data, timeout=30.0) as response:
            if response.status_code != 200:
                print(f"Error: {response.status_code}")
                print(await response.aread())
                return

            full_response = ""
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    json_str = line[6:]
                    if json_str:
                        try:
                            event_data = json.loads(json_str)
                            if event_data.get("done"):
                                if "conversationId" in event_data:
                                    print(f"\n\nConversation ID: {event_data['conversationId']}")
                                break
                            else:
                                token = event_data.get("data", "")
                                print(token, end="", flush=True)
                                full_response += token
                        except json.JSONDecodeError:
                            pass

    print(f"\n\nFull response: {full_response.strip()}")

async def test_get_conversations(session_id: str):
    """Test get conversations endpoint."""
    url = "http://localhost:8000/chat/conversations"
    headers = {
        "Authorization": f"Bearer {session_id}"
    }
    params = {
        "limit": 5
    }

    print("\n\n=== Testing GET /chat/conversations ===")

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params, timeout=10.0)

        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            conversations = response.json()
            print(f"Found {len(conversations)} conversations:")
            for conv in conversations:
                print(f"  - ID {conv['id']}: {conv['title'][:50]}... ({conv['messageCount']} messages)")
        else:
            print(f"Error: {response.text}")

async def test_analyze_case(session_id: str, case_id: int):
    """Test case analysis endpoint."""
    url = "http://localhost:8000/chat/analyze-case"
    headers = {
        "Authorization": f"Bearer {session_id}",
        "Content-Type": "application/json"
    }
    data = {
        "caseId": case_id,
        "description": "Housing dispute with landlord over deposit return. Landlord claims damage but I have photographic evidence of apartment condition."
    }

    print("\n\n=== Testing POST /chat/analyze-case ===")
    print(f"Request: {json.dumps(data, indent=2)}")

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data, timeout=10.0)

        print(f"\nStatus: {response.status_code}")
        if response.status_code == 200:
            analysis = response.json()
            print(f"\nAnalysis: {analysis['analysis']}")
            print("\nSuggested Actions:")
            for action in analysis['suggestedActions']:
                print(f"  - {action}")
            if analysis.get('relevantLaw'):
                print(f"\nRelevant Law: {analysis['relevantLaw']}")
        else:
            print(f"Error: {response.text}")

async def test_analyze_evidence(session_id: str, case_id: int):
    """Test evidence analysis endpoint."""
    url = "http://localhost:8000/chat/analyze-evidence"
    headers = {
        "Authorization": f"Bearer {session_id}",
        "Content-Type": "application/json"
    }
    data = {
        "caseId": case_id,
        "existingEvidence": [
            "Photos of apartment condition at move-in",
            "Photos of apartment condition at move-out",
            "Email correspondence with landlord",
            "Deposit receipt"
        ]
    }

    print("\n\n=== Testing POST /chat/analyze-evidence ===")
    print(f"Request: {json.dumps(data, indent=2)}")

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data, timeout=10.0)

        print(f"\nStatus: {response.status_code}")
        if response.status_code == 200:
            analysis = response.json()
            print(f"\nAnalysis: {analysis['analysis']}")
            print("\nEvidence Gaps:")
            for gap in analysis['gaps']:
                print(f"  - {gap}")
            print("\nRecommendations:")
            for rec in analysis['recommendations']:
                print(f"  - {rec}")
        else:
            print(f"Error: {response.text}")

async def main():
    """Run all tests."""
    print("=" * 70)
    print("Chat API Test Suite")
    print("=" * 70)

    # Get session_id from user
    session_id = input("\nEnter your session_id (from /auth/login): ").strip()
    if not session_id:
        print("Error: session_id is required")
        return

    # Optional: Get case_id for case-related tests
    case_id_input = input("Enter a case_id for testing (or press Enter to skip case tests): ").strip()
    case_id = int(case_id_input) if case_id_input else None

    try:
        # Test streaming chat
        await test_stream_chat(session_id)

        # Test get conversations
        await test_get_conversations(session_id)

        # Test case-related endpoints if case_id provided
        if case_id:
            await test_analyze_case(session_id, case_id)
            await test_analyze_evidence(session_id, case_id)
        else:
            print("\n\nSkipping case-related tests (no case_id provided)")

        print("\n\n" + "=" * 70)
        print("All tests completed!")
        print("=" * 70)

    except Exception as exc:
        print(f"\n\nTest failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
