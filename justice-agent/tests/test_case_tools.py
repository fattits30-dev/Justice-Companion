"""
Tests for Case Management Tools

Unit tests for the case management MCP tools.
These tests mock the HTTP client to avoid requiring a running backend.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.case_tools import (
    get_case_details,
    search_cases,
    get_case_deadlines,
    get_case_evidence,
    add_case_note,
)

# Get the actual handler functions from the SdkMcpTool objects
get_case_details_handler = get_case_details.handler
search_cases_handler = search_cases.handler
get_case_deadlines_handler = get_case_deadlines.handler
get_case_evidence_handler = get_case_evidence.handler
add_case_note_handler = add_case_note.handler


class TestGetCaseDetails:
    """Tests for get_case_details tool."""

    @pytest.mark.asyncio
    async def test_successful_fetch(self):
        """Should return case details on successful API call."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": 1,
            "title": "Test Case",
            "status": "active",
            "case_type": "contract",
            "created_at": "2024-01-15",
            "description": "A test case"
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await get_case_details_handler({"case_id": 1})

            assert "content" in result
            text = result["content"][0]["text"]
            assert "Case #1" in text
            assert "Test Case" in text
            assert "active" in text

    @pytest.mark.asyncio
    async def test_case_not_found(self):
        """Should return error when case not found."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await get_case_details_handler({"case_id": 999})

            assert "content" in result
            assert result.get("is_error", False) is True
            assert "not found" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Should handle timeout gracefully."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.TimeoutException("Connection timed out")
            )

            result = await get_case_details_handler({"case_id": 1})

            assert "content" in result
            assert result.get("is_error", False) is True
            assert "timed out" in result["content"][0]["text"].lower()

    @pytest.mark.asyncio
    async def test_generic_error_handling(self):
        """Should handle generic errors gracefully."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=Exception("Network error")
            )

            result = await get_case_details_handler({"case_id": 1})

            assert "content" in result
            assert result.get("is_error", False) is True
            assert "Error" in result["content"][0]["text"]


class TestSearchCases:
    """Tests for search_cases tool."""

    @pytest.mark.asyncio
    async def test_successful_search(self):
        """Should return search results."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": 1, "title": "Case One", "status": "active"},
            {"id": 2, "title": "Case Two", "status": "pending"},
        ]

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await search_cases_handler({
                "query": "test",
                "status": "",
                "limit": 10
            })

            assert "content" in result
            text = result["content"][0]["text"]
            assert "Found 2 case(s)" in text
            assert "Case One" in text
            assert "Case Two" in text

    @pytest.mark.asyncio
    async def test_no_results(self):
        """Should handle no results gracefully."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await search_cases_handler({
                "query": "nonexistent",
                "status": "",
                "limit": 10
            })

            assert "content" in result
            assert "No cases found" in result["content"][0]["text"]


class TestGetCaseDeadlines:
    """Tests for get_case_deadlines tool."""

    @pytest.mark.asyncio
    async def test_returns_deadlines(self):
        """Should return deadlines for a case."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "due_date": "2024-02-15",
                "title": "File Defence",
                "priority": "high",
                "is_overdue": False
            },
            {
                "due_date": "2024-01-10",
                "title": "Submit Documents",
                "priority": "normal",
                "is_overdue": True
            }
        ]

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await get_case_deadlines_handler({"case_id": 1})

            assert "content" in result
            text = result["content"][0]["text"]
            assert "File Defence" in text
            assert "Submit Documents" in text

    @pytest.mark.asyncio
    async def test_no_deadlines(self):
        """Should handle no deadlines gracefully."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await get_case_deadlines_handler({"case_id": 1})

            assert "content" in result
            assert "No deadlines found" in result["content"][0]["text"]


class TestGetCaseEvidence:
    """Tests for get_case_evidence tool."""

    @pytest.mark.asyncio
    async def test_returns_evidence(self):
        """Should return evidence items for a case."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "id": 1,
                "type": "document",
                "title": "Contract",
                "description": "Original signed contract"
            },
            {
                "id": 2,
                "type": "email",
                "title": "Correspondence",
                "description": "Email exchange with defendant"
            }
        ]

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await get_case_evidence_handler({"case_id": 1})

            assert "content" in result
            text = result["content"][0]["text"]
            assert "Contract" in text
            assert "Correspondence" in text


class TestAddCaseNote:
    """Tests for add_case_note tool."""

    @pytest.mark.asyncio
    async def test_successful_note_addition(self):
        """Should add note successfully."""
        mock_response = MagicMock()
        mock_response.status_code = 201

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            result = await add_case_note_handler({
                "case_id": 1,
                "note": "Test note content",
                "note_type": "general"
            })

            assert "content" in result
            assert "successfully" in result["content"][0]["text"].lower()

    @pytest.mark.asyncio
    async def test_failed_note_addition(self):
        """Should handle failed note addition."""
        mock_response = MagicMock()
        mock_response.status_code = 400

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            result = await add_case_note_handler({
                "case_id": 1,
                "note": "Test note",
                "note_type": "general"
            })

            assert "content" in result
            assert result.get("is_error", False) is True


class TestInputValidation:
    """Tests for input validation across tools."""

    @pytest.mark.asyncio
    async def test_negative_case_id(self):
        """Should handle negative case IDs gracefully."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await get_case_details_handler({"case_id": -1})

            # Should return error or handle gracefully
            assert "content" in result

    @pytest.mark.asyncio
    async def test_zero_case_id(self):
        """Should handle zero case ID gracefully."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await get_case_details_handler({"case_id": 0})

            assert "content" in result
