"""
Unit tests for LegalAPIService.

Tests:
- Keyword extraction from natural language questions
- Legal category classification
- Legislation API integration (mocked)
- Case law API integration (mocked)
- Caching behavior
- Retry logic for network failures
- XML parsing for Atom feeds
"""

import pytest
import time
from unittest.mock import Mock, patch

from backend.services.legal_api_service import (
    LegalAPIService,
    LegislationResult,
    CaseResult,
    ExtractedKeywords,
    APIConfig,
    is_network_error,
    should_retry,
    get_retry_delay
)

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_audit_logger():
    """Mock AuditLogger for testing."""
    logger = Mock()
    logger.log = Mock()
    return logger

@pytest.fixture
def legal_api_service(mock_audit_logger):
    """Create LegalAPIService instance with mocked audit logger."""
    service = LegalAPIService(audit_logger=mock_audit_logger)
    return service

@pytest.fixture
def sample_legislation_xml():
    """Sample Atom XML response from legislation.gov.uk."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
    <title>UK Legislation Search Results</title>
    <entry>
        <title>Employment Rights Act 1996</title>
        <summary>An Act to consolidate enactments relating to employment rights.</summary>
        <link rel="alternate" href="https://www.legislation.gov.uk/ukpga/1996/18"/>
        <updated>2024-01-15T00:00:00Z</updated>
    </entry>
    <entry>
        <title>Employment Rights Act 1996 Section 94</title>
        <summary>The right not to be unfairly dismissed.</summary>
        <link rel="alternate" href="https://www.legislation.gov.uk/ukpga/1996/18/section/94"/>
        <updated>2024-01-15T00:00:00Z</updated>
    </entry>
</feed>"""

@pytest.fixture
def sample_caselaw_xml():
    """Sample Atom XML response from caselaw.nationalarchives.gov.uk."""
    return """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
    <title>Case Law Search Results</title>
    <entry>
        <title>Smith v ABC Ltd [2024] ET/12345/24</title>
        <summary>Employment Tribunal decision on unfair dismissal.</summary>
        <link rel="alternate" href="https://caselaw.nationalarchives.gov.uk/id/eat/2024/1"/>
        <updated>2024-03-15T00:00:00Z</updated>
        <published>2024-03-01T00:00:00Z</published>
    </entry>
    <entry>
        <title>Jones v XYZ Corp [UKEAT]</title>
        <summary>Appeal regarding constructive dismissal.</summary>
        <link rel="alternate" href="https://caselaw.nationalarchives.gov.uk/id/eat/2024/2"/>
        <updated>2024-02-10T00:00:00Z</updated>
    </entry>
</feed>"""

# ============================================================================
# HELPER FUNCTION TESTS
# ============================================================================

def test_is_network_error_with_httpx_timeout():
    """Test network error detection with httpx timeout exception."""
    import httpx
    error = httpx.TimeoutException("Request timed out")
    assert is_network_error(error) is True

def test_is_network_error_with_connection_refused():
    """Test network error detection with connection refused message."""
    error = Exception("Connection refused")
    assert is_network_error(error) is True

def test_is_network_error_with_non_network_error():
    """Test network error detection with non-network error."""
    error = ValueError("Invalid value")
    assert is_network_error(error) is False

def test_should_retry_with_network_error():
    """Test retry logic with network error."""
    import httpx
    error = httpx.TimeoutException("Timeout")
    assert should_retry(error, 0) is True
    assert should_retry(error, 1) is True
    assert should_retry(error, 2) is True
    assert should_retry(error, 3) is False  # Max retries reached

def test_should_retry_with_non_network_error():
    """Test retry logic with non-network error."""
    error = ValueError("Invalid")
    assert should_retry(error, 0) is False

def test_get_retry_delay():
    """Test exponential backoff calculation."""
    assert get_retry_delay(0) == 1.0
    assert get_retry_delay(1) == 2.0
    assert get_retry_delay(2) == 4.0
    assert get_retry_delay(3) == 8.0

# ============================================================================
# KEYWORD EXTRACTION TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_extract_keywords_employment_question(legal_api_service):
    """Test keyword extraction from employment law question."""
    question = "Can I be dismissed for being pregnant?"

    keywords = await legal_api_service.extract_keywords(question)

    assert isinstance(keywords, ExtractedKeywords)
    assert "pregnant" in keywords.legal or "pregnancy" in keywords.legal
    assert "dismissed" in keywords.legal
    assert len(keywords.all) > 0

@pytest.mark.asyncio
async def test_extract_keywords_removes_stop_words(legal_api_service):
    """Test that stop words are removed from keywords."""
    question = "What are the rights of a tenant?"

    keywords = await legal_api_service.extract_keywords(question)

    # Stop words should be filtered out
    assert "the" not in keywords.all
    assert "are" not in keywords.all
    assert "of" not in keywords.all

    # Content words should remain
    assert "tenant" in keywords.legal or "tenant" in keywords.general

@pytest.mark.asyncio
async def test_extract_keywords_filters_short_words(legal_api_service):
    """Test that words shorter than 3 characters are filtered."""
    question = "Can I be fired?"

    keywords = await legal_api_service.extract_keywords(question)

    # Single/double letter words should be removed
    assert "i" not in keywords.all
    assert "be" not in keywords.all

# ============================================================================
# CLASSIFICATION TESTS
# ============================================================================

def test_classify_question_employment(legal_api_service):
    """Test classification of employment law question."""
    question = "Can I be dismissed for being pregnant?"
    category = legal_api_service.classify_question(question)
    assert category == "employment"

def test_classify_question_housing(legal_api_service):
    """Test classification of housing law question."""
    question = "My landlord wants to evict me, what are my rights?"
    category = legal_api_service.classify_question(question)
    assert category == "housing"

def test_classify_question_discrimination(legal_api_service):
    """Test classification of discrimination law question."""
    question = "I'm being harassed at work because of my race"
    category = legal_api_service.classify_question(question)
    assert category == "discrimination"

def test_classify_question_general(legal_api_service):
    """Test classification of non-legal question."""
    question = "What's the weather like today?"
    category = legal_api_service.classify_question(question)
    assert category == "general"

# ============================================================================
# LEGISLATION API TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_search_legislation_success(legal_api_service, sample_legislation_xml):
    """Test successful legislation search."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = sample_legislation_xml
        mock_fetch.return_value = mock_response

        results = await legal_api_service.search_legislation("employment rights")

        assert len(results) == 2
        assert results[0]['title'] == "Employment Rights Act 1996"
        assert results[1]['section'] == "Section 94"
        assert "legislation.gov.uk" in results[0]['url']

@pytest.mark.asyncio
async def test_search_legislation_with_list_query(legal_api_service, sample_legislation_xml):
    """Test legislation search with list of keywords."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = sample_legislation_xml
        mock_fetch.return_value = mock_response

        results = await legal_api_service.search_legislation(["employment", "rights"])

        assert len(results) == 2

@pytest.mark.asyncio
async def test_search_legislation_handles_error_gracefully(legal_api_service):
    """Test that legislation search handles errors gracefully."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        mock_fetch.side_effect = Exception("Network error")

        results = await legal_api_service.search_legislation("test query")

        assert results == []  # Should return empty list on error

# ============================================================================
# CASE LAW API TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_search_case_law_success(legal_api_service, sample_caselaw_xml):
    """Test successful case law search."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = sample_caselaw_xml
        mock_fetch.return_value = mock_response

        results = await legal_api_service.search_case_law("unfair dismissal", "employment")

        assert len(results) == 2
        assert "Smith v ABC Ltd" in results[0]['citation']
        # Court is extracted from bracketed content in title, e.g., [2024] or [UKEAT]
        assert results[0]['court'] in ["2024", "ET/12345/24"]
        assert "caselaw.nationalarchives.gov.uk" in results[0]['url']

@pytest.mark.asyncio
async def test_search_case_law_with_court_filtering(legal_api_service, sample_caselaw_xml):
    """Test case law search applies court filtering based on category."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = sample_caselaw_xml
        mock_fetch.return_value = mock_response

        await legal_api_service.search_case_law("discrimination", "discrimination")

        # Verify URL contains court filters
        call_args = mock_fetch.call_args[0][0]
        assert "court=eat" in call_args or "court=uksc" in call_args or "court=ewca" in call_args

@pytest.mark.asyncio
async def test_search_case_law_handles_error_gracefully(legal_api_service):
    """Test that case law search handles errors gracefully."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        mock_fetch.side_effect = Exception("Network error")

        results = await legal_api_service.search_case_law("test query")

        assert results == []

# ============================================================================
# INTEGRATED SEARCH TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_search_legal_info_success(
    legal_api_service,
    sample_legislation_xml,
    sample_caselaw_xml
):
    """Test integrated legal information search."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        # Mock responses for both APIs
        def mock_response_side_effect(url):
            mock_resp = Mock()
            mock_resp.status_code = 200
            if "legislation.gov.uk" in url:
                mock_resp.text = sample_legislation_xml
            elif "caselaw.nationalarchives.gov.uk" in url:
                mock_resp.text = sample_caselaw_xml
            return mock_resp

        mock_fetch.side_effect = mock_response_side_effect

        results = await legal_api_service.search_legal_info(
            "Can I be dismissed for being pregnant?"
        )

        assert results['cached'] is False
        assert len(results['legislation']) >= 1
        assert len(results['cases']) >= 1
        assert isinstance(results['timestamp'], int)

@pytest.mark.asyncio
async def test_search_legal_info_uses_cache(
    legal_api_service,
    sample_legislation_xml,
    sample_caselaw_xml
):
    """Test that search results are cached."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        def mock_response_side_effect(url):
            mock_resp = Mock()
            mock_resp.status_code = 200
            if "legislation.gov.uk" in url:
                mock_resp.text = sample_legislation_xml
            elif "caselaw.nationalarchives.gov.uk" in url:
                mock_resp.text = sample_caselaw_xml
            return mock_resp

        mock_fetch.side_effect = mock_response_side_effect

        question = "Can I be dismissed for being pregnant?"

        # First call - should fetch from API
        results1 = await legal_api_service.search_legal_info(question)
        assert results1['cached'] is False
        first_call_count = mock_fetch.call_count

        # Second call - should use cache
        results2 = await legal_api_service.search_legal_info(question)
        assert results2['cached'] is True
        assert mock_fetch.call_count == first_call_count  # No additional API calls

@pytest.mark.asyncio
async def test_search_legal_info_handles_offline_gracefully(legal_api_service):
    """Test graceful handling when offline."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        import httpx
        mock_fetch.side_effect = httpx.NetworkError("No internet connection")

        results = await legal_api_service.search_legal_info("test query")

        # Should return empty results, not crash
        assert results['legislation'] == []
        assert results['cases'] == []
        assert results['knowledge_base'] == []
        assert results['cached'] is False

@pytest.mark.asyncio
async def test_clear_cache(legal_api_service):
    """Test cache clearing."""
    # Add some data to cache
    legal_api_service._set_cache("test_key", {"data": "test"}, 1)
    assert len(legal_api_service.cache) > 0

    # Clear cache
    legal_api_service.clear_cache()
    assert len(legal_api_service.cache) == 0

# ============================================================================
# RETRY LOGIC TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_fetch_with_retry_succeeds_on_first_attempt(legal_api_service):
    """Test successful fetch on first attempt."""
    with patch.object(legal_api_service.client, 'get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "success"
        mock_get.return_value = mock_response

        response = await legal_api_service._fetch_with_retry("http://test.com")

        assert response.status_code == 200
        assert mock_get.call_count == 1

@pytest.mark.asyncio
async def test_fetch_with_retry_retries_on_network_error(legal_api_service):
    """Test that fetch retries on network errors."""
    import httpx

    with patch.object(legal_api_service.client, 'get') as mock_get:
        # First two calls fail, third succeeds
        mock_get.side_effect = [
            httpx.TimeoutException("Timeout"),
            httpx.TimeoutException("Timeout"),
            Mock(status_code=200, text="success")
        ]

        response = await legal_api_service._fetch_with_retry("http://test.com")

        assert response.status_code == 200
        assert mock_get.call_count == 3

@pytest.mark.asyncio
async def test_fetch_with_retry_gives_up_after_max_retries(legal_api_service):
    """Test that fetch gives up after max retries."""
    import httpx

    with patch.object(legal_api_service.client, 'get') as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Timeout")

        with pytest.raises(httpx.TimeoutException):
            await legal_api_service._fetch_with_retry("http://test.com")

        # Should attempt initial + 3 retries = 4 total
        assert mock_get.call_count == 4

# ============================================================================
# XML PARSING TESTS
# ============================================================================

def test_parse_atom_feed_to_legislation(legal_api_service, sample_legislation_xml):
    """Test parsing Atom XML to legislation results."""
    results = legal_api_service._parse_atom_feed_to_legislation(
        sample_legislation_xml,
        "employment"
    )

    assert len(results) == 2
    assert isinstance(results[0], LegislationResult)
    assert results[0].title == "Employment Rights Act 1996"
    assert results[0].url == "https://www.legislation.gov.uk/ukpga/1996/18"
    assert results[1].section == "Section 94"

def test_parse_atom_feed_to_case_law(legal_api_service, sample_caselaw_xml):
    """Test parsing Atom XML to case law results."""
    results = legal_api_service._parse_atom_feed_to_case_law(
        sample_caselaw_xml,
        "unfair dismissal"
    )

    assert len(results) == 2
    assert isinstance(results[0], CaseResult)
    assert "Smith v ABC Ltd" in results[0].citation
    assert results[0].date == "2024-03-15"
    assert "caselaw.nationalarchives.gov.uk" in results[0].url

def test_parse_invalid_xml_returns_empty_list(legal_api_service):
    """Test that invalid XML returns empty list instead of crashing."""
    invalid_xml = "<invalid>xml without closing tag"

    legislation_results = legal_api_service._parse_atom_feed_to_legislation(
        invalid_xml,
        "test"
    )
    assert legislation_results == []

    caselaw_results = legal_api_service._parse_atom_feed_to_case_law(
        invalid_xml,
        "test"
    )
    assert caselaw_results == []

# ============================================================================
# CACHE TESTS
# ============================================================================

def test_cache_set_and_get(legal_api_service):
    """Test setting and getting cache entries."""
    test_data = {"result": "test data"}
    legal_api_service._set_cache("test_key", test_data, 1)

    retrieved = legal_api_service._get_cached("test_key")
    assert retrieved == test_data

def test_cache_expiration(legal_api_service):
    """Test that cache entries expire after TTL."""
    test_data = {"result": "test data"}

    # Set cache with 0 hour TTL (should expire immediately)
    legal_api_service._set_cache("test_key", test_data, 0)

    # Sleep briefly to ensure expiration
    time.sleep(0.1)

    retrieved = legal_api_service._get_cached("test_key")
    assert retrieved is None

def test_cache_eviction_when_full(legal_api_service):
    """Test that oldest cache entries are evicted when cache is full."""
    # Fill cache beyond limit
    for i in range(APIConfig.MAX_CACHE_SIZE + 10):
        legal_api_service._set_cache(f"key_{i}", {"data": i}, 1)

    # Cache should be at max size
    assert len(legal_api_service.cache) == APIConfig.MAX_CACHE_SIZE

def test_generate_cache_key(legal_api_service):
    """Test cache key generation."""
    key1 = legal_api_service._generate_cache_key("search", ["employment", "rights"])
    key2 = legal_api_service._generate_cache_key("search", ["rights", "employment"])

    # Keys should be the same regardless of parameter order (sorted)
    assert key1 == key2
    assert "search:" in key1

# ============================================================================
# AUDIT LOGGING TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_search_logs_audit_event(
    legal_api_service,
    mock_audit_logger,
    sample_legislation_xml,
    sample_caselaw_xml
):
    """Test that search operations log audit events."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        def mock_response_side_effect(url):
            mock_resp = Mock()
            mock_resp.status_code = 200
            if "legislation.gov.uk" in url:
                mock_resp.text = sample_legislation_xml
            elif "caselaw.nationalarchives.gov.uk" in url:
                mock_resp.text = sample_caselaw_xml
            return mock_resp

        mock_fetch.side_effect = mock_response_side_effect

        await legal_api_service.search_legal_info("test question")

        # Verify audit log was called
        mock_audit_logger.log.assert_called_once()
        call_args = mock_audit_logger.log.call_args[1]

        assert call_args['event_type'] == "legal_api.search"
        assert call_args['action'] == "search"
        assert call_args['success'] is True

# ============================================================================
# INTEGRATION TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_get_legislation_by_id(legal_api_service):
    """Test fetching specific legislation by ID."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<legislation>XML content</legislation>"
        mock_fetch.return_value = mock_response

        result = await legal_api_service.get_legislation("ukpga/1996/18")

        assert result is not None
        assert "<legislation>" in result

@pytest.mark.asyncio
async def test_get_case_law_by_id(legal_api_service):
    """Test fetching specific case law by ID."""
    with patch.object(legal_api_service, '_fetch_with_retry') as mock_fetch:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"case": "data"}
        mock_fetch.return_value = mock_response

        result = await legal_api_service.get_case_law("eat/2024/1")

        assert result is not None
        assert result == {"case": "data"}

@pytest.mark.asyncio
async def test_search_knowledge_base(legal_api_service):
    """Test knowledge base search (currently returns empty)."""
    results = await legal_api_service.search_knowledge_base(["employment", "rights"])

    # Currently not implemented, should return empty list
    assert results == []

# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
