"""Debug script to check auth registration with new conftest.py"""
import sys
sys.path.insert(0, r'c:\Users\sava6\ClaudeHome\projects\Justice Companion')

import os
import base64

# Set encryption key
os.environ["ENCRYPTION_KEY_BASE64"] = base64.b64encode(os.urandom(32)).decode()

from backend.tests.conftest import client
from unittest.mock import patch, Mock

# Get test client
test_client = client.__wrapped__  # Get the fixture function

# Create mock rate limiter
mock_rate_limiter = Mock()
mock_rate_limiter.check_rate_limit.return_value = Mock(
    allowed=True,
    attempts_remaining=5,
    message="Operation allowed"
)

with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
    # Try to import TestClient properly
    from starlette.testclient import TestClient
    from backend.main import app

    test_client_instance = TestClient(app)

    response = test_client_instance.post('/auth/register', json={
        'username': 'test_user2',
        'email': 'test2@example.com',
        'password': 'SecurePass123!'
    })

    print('Status:', response.status_code)
    print('Response:', response.json())
