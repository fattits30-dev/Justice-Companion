#!/usr/bin/env python3
"""Quick test script to debug login API"""
import requests
import json

# Test the login endpoint
url = "http://127.0.0.1:8000/auth/login"
payload = {
    "identifier": "testuser",  # Change this to your username
    "password": "YourPassword123!",  # Change this to your password
    "remember_me": False
}

print(f"Sending POST to {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")
print("-" * 50)

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
