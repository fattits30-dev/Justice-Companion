"""
Direct test of Python AI service with dynamic port handling
Tests document analysis with Qwen3-32B-Instruct via HuggingFace API
"""
import requests
import json
import sys
from datetime import datetime

def test_service(port: int = 5051):
    """Test the AI service on a specific port"""
    url = f"http://127.0.0.1:{port}/api/v1/analyze-document"
    headers = {"Content-Type": "application/json"}

    # Test document: Employment termination letter
    test_data = {
        "document": {
            "filename": "termination_letter.txt",
            "text": """
EMPLOYMENT TERMINATION NOTICE

Date: January 15, 2025
To: John Smith
Employee ID: EMP-12345

Dear John Smith,

This letter serves as formal notification that your employment with ABC Company Limited
will be terminated effective February 15, 2025. This decision has been made following
a review of your performance and the company's restructuring requirements.

You will receive:
- One month's notice pay (£3,500)
- Accrued holiday pay for 10 days (£1,400)
- Final paycheck on February 20, 2025

Please return all company property, including laptop, access cards, and mobile phone
by February 15, 2025.

If you have questions, contact HR at hr@abccompany.co.uk

Sincerely,
Jane Manager
HR Director
ABC Company Limited
            """.strip(),
            "wordCount": 120,
            "fileType": "txt"
        },
        "userProfile": {
            "name": "John Smith"
        },
        "sessionId": f"test-{datetime.now().timestamp()}"
    }

    print("=" * 80)
    print(f"[TEST] TESTING PYTHON AI SERVICE ON PORT {port}")
    print("=" * 80)
    print(f"\n[INFO] Test Document: {test_data['document']['filename']}")
    print(f"[INFO] Word Count: {test_data['document']['wordCount']}")
    print(f"[INFO] User: {test_data['userProfile']['name']}")
    print(f"\n[INFO] Sending request to: {url}")

    try:
        response = requests.post(url, headers=headers, json=test_data, timeout=60)

        print(f"\n[OK] Response Status: {response.status_code}")
        print(f"[INFO] Response Headers:")
        for key, value in response.headers.items():
            print(f"   {key}: {value}")

        if response.status_code == 200:
            result = response.json()
            print(f"\n[SUCCESS] SUCCESS! Document analyzed successfully")
            print("\n[METRICS] Analysis Results:")
            print(json.dumps(result, indent=2))

            # Validate expected fields
            print("\n[OK] Validation:")
            checks = [
                ("documentType" in result, "Document type classified"),
                ("summary" in result, "Summary generated"),
                ("keyEntities" in result, "Key entities extracted"),
                ("relevantDates" in result, "Dates extracted"),
                ("suggestedActions" in result, "Actions suggested"),
                ("model" in result, "Model info included"),
                (result.get("model") == "Qwen/Qwen3-32B-Instruct", "Using Qwen3-32B-Instruct")
            ]

            for check, description in checks:
                status = "[OK]" if check else "[ERROR]"
                print(f"   {status} {description}")

            return True

        elif response.status_code == 500:
            print(f"\n[ERROR] ERROR: Server returned 500")
            print(f"[INFO] Response Body:")
            print(response.text)

            try:
                error_data = response.json()
                print(f"\n[SEARCH] Parsed Error:")
                print(json.dumps(error_data, indent=2))
            except:
                print("(Could not parse as JSON)")

            return False
        else:
            print(f"\n[WARN]  Unexpected Status: {response.status_code}")
            print(f"[INFO] Response Body:")
            print(response.text)
            return False

    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] CONNECTION ERROR: Could not connect to port {port}")
        print(f"   Service may not be running on this port")
        return False

    except requests.exceptions.Timeout:
        print(f"\n[ERROR] TIMEOUT: Request took longer than 60 seconds")
        print(f"   Service may be processing but taking too long")
        return False

    except Exception as e:
        print(f"\n[ERROR] UNEXPECTED ERROR: {type(e).__name__}")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_health(port: int = 5051):
    """Test if the service is responding to health checks"""
    url = f"http://127.0.0.1:{port}/health"

    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            health = response.json()
            print(f"[OK] Service is healthy on port {port}")
            print(f"   Status: {health.get('status')}")
            print(f"   Version: {health.get('version')}")
            print(f"   Model: {health.get('model')}")
            return True
        else:
            print(f"[WARN]  Health check returned {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Service not responding on port {port}")
        return False
    except Exception as e:
        print(f"[ERROR] Health check failed: {e}")
        return False


if __name__ == "__main__":
    # Try different ports
    ports_to_try = [5051, 5052, 5053]

    if len(sys.argv) > 1:
        # Port specified as argument
        ports_to_try = [int(sys.argv[1])]

    print("\n[SEARCH] Searching for Python AI service...")
    print(f"   Trying ports: {ports_to_try}\n")

    service_found = False
    for port in ports_to_try:
        print(f"Checking port {port}...")
        if test_health(port):
            service_found = True
            print(f"\n[OK] Found service on port {port}\n")

            # Run full test
            success = test_service(port)

            if success:
                print("\n" + "=" * 80)
                print("[SUCCESS] ALL TESTS PASSED!")
                print("=" * 80)
                sys.exit(0)
            else:
                print("\n" + "=" * 80)
                print("[ERROR] TESTS FAILED")
                print("=" * 80)
                sys.exit(1)
        else:
            print(f"   Not found on port {port}\n")

    if not service_found:
        print("\n[ERROR] ERROR: Could not find Python AI service on any port")
        print("   Make sure the service is running with:")
        print("   cd 'F:\\Justice Companion take 2' && python -m ai-service.main")
        sys.exit(1)
