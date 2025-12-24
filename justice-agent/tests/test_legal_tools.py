"""
Tests for Legal Research Tools

Unit tests for the legal research MCP tools.
"""

import pytest
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.legal_tools import (
    search_uk_legislation,
    get_court_procedures,
    calculate_deadline,
)

# Get the actual handler functions from the SdkMcpTool objects
search_uk_legislation_handler = search_uk_legislation.handler
get_court_procedures_handler = get_court_procedures.handler
calculate_deadline_handler = calculate_deadline.handler


class TestSearchUKLegislation:
    """Tests for search_uk_legislation tool."""

    @pytest.mark.asyncio
    async def test_search_limitation_act(self):
        """Should find Limitation Act when searching for 'limitation'."""
        result = await search_uk_legislation_handler({
            "query": "limitation",
            "category": "all"
        })

        assert "content" in result
        assert len(result["content"]) > 0
        assert "Limitation Act 1980" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_search_civil_procedure(self):
        """Should find CPR when searching for 'procedure'."""
        result = await search_uk_legislation_handler({
            "query": "procedure",
            "category": "all"
        })

        assert "content" in result
        assert "Civil Procedure Rules" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_search_consumer_rights(self):
        """Should find Consumer Rights Act when searching for 'consumer'."""
        result = await search_uk_legislation_handler({
            "query": "consumer",
            "category": "all"
        })

        assert "content" in result
        assert "Consumer Rights Act 2015" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_search_no_results(self):
        """Should return helpful message when no results found."""
        result = await search_uk_legislation_handler({
            "query": "xyznonexistent",
            "category": "all"
        })

        assert "content" in result
        assert "No legislation found" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_search_empty_query(self):
        """Should handle empty query gracefully."""
        result = await search_uk_legislation_handler({
            "query": "",
            "category": "all"
        })

        assert "content" in result
        # Empty query should return something or a helpful message


class TestGetCourtProcedures:
    """Tests for get_court_procedures tool."""

    @pytest.mark.asyncio
    async def test_small_claims_track(self):
        """Should recommend Small Claims Track for claims under £10,000."""
        result = await get_court_procedures_handler({
            "claim_value": 5000,
            "claim_type": "general"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "Small Claims Track" in text

    @pytest.mark.asyncio
    async def test_fast_track(self):
        """Should recommend Fast Track for claims between £10,000 and £25,000."""
        result = await get_court_procedures_handler({
            "claim_value": 15000,
            "claim_type": "general"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "Fast Track" in text

    @pytest.mark.asyncio
    async def test_multi_track(self):
        """Should recommend Multi-Track for claims over £25,000."""
        result = await get_court_procedures_handler({
            "claim_value": 50000,
            "claim_type": "general"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "Multi-Track" in text

    @pytest.mark.asyncio
    async def test_includes_procedure_steps(self):
        """Should include general procedure steps."""
        result = await get_court_procedures_handler({
            "claim_value": 10000,
            "claim_type": "general"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "General Procedure Steps" in text
        assert "Claim Form" in text


class TestCalculateDeadline:
    """Tests for calculate_deadline tool."""

    @pytest.mark.asyncio
    async def test_defence_deadline(self):
        """Should calculate 28-day defence deadline."""
        result = await calculate_deadline_handler({
            "start_date": "2024-01-15",
            "deadline_type": "defence",
            "court_track": "fast_track"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "28 days" in text
        assert "12 February 2024" in text  # 15 Jan + 28 days

    @pytest.mark.asyncio
    async def test_acknowledgment_deadline(self):
        """Should calculate 14-day acknowledgment deadline."""
        result = await calculate_deadline_handler({
            "start_date": "2024-01-15",
            "deadline_type": "acknowledgment",
            "court_track": "fast_track"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "14 days" in text
        assert "29 January 2024" in text  # 15 Jan + 14 days

    @pytest.mark.asyncio
    async def test_claim_service_deadline(self):
        """Should calculate 4-month claim service deadline."""
        result = await calculate_deadline_handler({
            "start_date": "2024-01-15",
            "deadline_type": "claim_service",
            "court_track": "fast_track"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "122 days" in text  # 4 months approximation

    @pytest.mark.asyncio
    async def test_invalid_date_format(self):
        """Should return error for invalid date format."""
        result = await calculate_deadline_handler({
            "start_date": "15-01-2024",  # Wrong format
            "deadline_type": "defence",
            "court_track": "fast_track"
        })

        assert "content" in result
        assert result.get("is_error", False) is True
        assert "Invalid date format" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_unknown_deadline_type(self):
        """Should return error for unknown deadline type."""
        result = await calculate_deadline_handler({
            "start_date": "2024-01-15",
            "deadline_type": "unknown_type",
            "court_track": "fast_track"
        })

        assert "content" in result
        assert result.get("is_error", False) is True
        assert "Unknown deadline type" in result["content"][0]["text"]

    @pytest.mark.asyncio
    async def test_includes_reminders(self):
        """Should include 7-day and 3-day reminders."""
        result = await calculate_deadline_handler({
            "start_date": "2024-01-15",
            "deadline_type": "defence",
            "court_track": "fast_track"
        })

        assert "content" in result
        text = result["content"][0]["text"]
        assert "7-day reminder" in text
        assert "3-day reminder" in text
