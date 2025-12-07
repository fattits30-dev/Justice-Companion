"""Debug test to check registration error."""
import pytest
from unittest.mock import patch, Mock

def test_register_debug(client, mock_rate_limiter):
    """Debug registration test."""
    with patch('backend.routes.auth.get_rate_limiter', return_value=mock_rate_limiter):
        response = client.post(
            "/auth/register",
            json={
                "username": "test_user",
                "password": "SecurePass123!",
                "email": "test@example.com"
            }
        )

    print(f"\n=== DEBUG INFO ===")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print(f"==================\n")

    assert True  # Always pass to see the output
