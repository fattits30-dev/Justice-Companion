import requests
import json

url = "http://127.0.0.1:5051/api/v1/analyze-document"
headers = {"Content-Type": "application/json"}
data = {
    "document": {
        "filename": "test.txt",
        "text": "Employment termination letter from ABC Company.",
        "wordCount": 7,
        "fileType": "txt"
    },
    "userProfile": {
        "name": "John Doe"
    },
    "sessionId": "test-xyz"
}

print("[Test] Sending request to Python AI service...")
print(f"[Test] URL: {url}")
print(f"[Test] Data: {json.dumps(data, indent=2)}")

try:
    response = requests.post(url, headers=headers, json=data, timeout=30)
    print(f"[Test] Response status: {response.status_code}")
    print(f"[Test] Response headers: {dict(response.headers)}")
    print(f"[Test] Response body: {response.text}")
except Exception as e:
    print(f"[Test] Error: {e}")
    import traceback
    traceback.print_exc()
