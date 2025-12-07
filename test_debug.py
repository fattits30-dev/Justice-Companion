"""Quick debug script to check auth registration error."""
from starlette.testclient import TestClient
from backend.main import app
from unittest.mock import patch, Mock

client = TestClient(app)
mock_rate_limiter = Mock()
mock_rate_limiter.check_rate_limit.return_value = None

with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
    response = client.post('/auth/register', json={
        'username': 'test_user',
        'password': 'SecurePass123!',
        'email': 'test@example.com'
    })
    print('Status:', response.status_code)
    print('Response:', response.json())
