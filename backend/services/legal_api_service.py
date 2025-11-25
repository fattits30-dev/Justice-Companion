"""
LegalAPIService - UK Legal API integration for legislation and case law searches.

Migrated from: src/services/LegalAPIService.ts

Features:
- Integration with legislation.gov.uk API
- Integration with caselaw.nationalarchives.gov.uk API
- Keyword extraction from natural language questions
- Legal category classification
- Intelligent caching with TTL
- Retry logic for network failures
- Graceful offline handling
- Court filtering based on legal categories

Usage:
    from backend.services.legal_api_service import LegalAPIService

    service = LegalAPIService(audit_logger=audit_logger)
    results = await service.search_legal_info("Can I be dismissed for being pregnant?")

    # Access results
    print(f"Found {len(results['legislation'])} legislation results")
    print(f"Found {len(results['cases'])} case law results")
"""

import asyncio
import logging
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set

import httpx
from defusedxml import ElementTree as ET
from fastapi import HTTPException

# Configure logger
logger = logging.getLogger(__name__)

# ============================================================================
# TYPE DEFINITIONS & DATA CLASSES
# ============================================================================

@dataclass
class LegislationResult:
    """Legislation search result from legislation.gov.uk"""

    title: str
    content: str
    url: str
    section: Optional[str] = None
    relevance: float = 1.0

@dataclass
class CaseResult:
    """Case law search result from Find Case Law API"""

    citation: str
    court: str
    date: str
    summary: str
    url: str
    outcome: Optional[str] = None
    relevance: float = 1.0

@dataclass
class KnowledgeEntry:
    """Knowledge base entry (cached FAQs, guides)"""

    topic: str
    category: str
    content: str
    sources: List[str] = field(default_factory=list)

@dataclass
class LegalSearchResults:
    """Combined search results from all APIs"""

    legislation: List[LegislationResult]
    cases: List[CaseResult]
    knowledge_base: List[KnowledgeEntry]
    cached: bool
    timestamp: int

@dataclass
class ExtractedKeywords:
    """Extracted keywords from natural language question"""

    all: List[str]
    legal: List[str]
    general: List[str]

@dataclass
class CacheEntry:
    """Cache entry with expiration"""

    data: Any
    timestamp: int
    expires_at: int

class LegalCategory(str, Enum):
    """Legal category classifications"""

    EMPLOYMENT = "employment"
    DISCRIMINATION = "discrimination"
    HOUSING = "housing"
    FAMILY = "family"
    CONSUMER = "consumer"
    CRIMINAL = "criminal"
    CIVIL = "civil"
    GENERAL = "general"

# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================

class APIConfig:
    """API configuration constants"""

    LEGISLATION_BASE_URL = "https://www.legislation.gov.uk"
    CASELAW_BASE_URL = "https://caselaw.nationalarchives.gov.uk"
    TIMEOUT_SECONDS = 10.0
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 1.0
    CACHE_TTL_HOURS = 24
    EMPTY_CACHE_TTL_HOURS = 1
    MAX_CACHE_SIZE = 100

# Legal terms dictionary for keyword extraction
LEGAL_TERMS_DICTIONARY: Dict[str, List[str]] = {
    "employment": [
        "fired",
        "dismissed",
        "redundancy",
        "employment",
        "unfair dismissal",
        "constructive dismissal",
        "contract",
        "wages",
        "salary",
        "notice period",
        "disciplinary",
        "grievance",
        "maternity",
        "paternity",
        "pregnant",
        "pregnancy",
    ],
    "discrimination": [
        "discrimination",
        "protected characteristic",
        "harassment",
        "victimisation",
        "equality",
        "race",
        "gender",
        "disability",
        "age",
        "religion",
        "sexual orientation",
    ],
    "housing": [
        "eviction",
        "tenant",
        "landlord",
        "rent",
        "housing",
        "tenancy",
        "deposit",
        "repairs",
        "notice",
        "possession",
        "section 21",
        "section 8",
    ],
    "family": [
        "custody",
        "divorce",
        "child",
        "maintenance",
        "contact",
        "residence",
        "separation",
        "matrimonial",
        "parental responsibility",
    ],
    "consumer": [
        "refund",
        "warranty",
        "guarantee",
        "faulty",
        "consumer rights",
        "sale of goods",
        "services",
        "complaint",
        "product",
    ],
    "criminal": [
        "arrest",
        "charge",
        "bail",
        "police",
        "prosecution",
        "defence",
        "sentence",
        "conviction",
        "caution",
    ],
}

# Map legal categories to relevant court/tribunal codes
CATEGORY_TO_COURT_MAP: Dict[str, List[str]] = {
    "employment": ["eat", "ukeat"],  # Employment Appeal Tribunal
    "discrimination": ["eat", "uksc", "ewca"],  # Supreme Court, Court of Appeal
    "housing": ["ukut", "ewca"],  # Upper Tribunal, Court of Appeal
    "family": ["ewfc", "ewca", "uksc"],  # Family Court, Court of Appeal, Supreme Court
    "consumer": ["ewca", "ewhc"],  # Court of Appeal, High Court
    "criminal": ["uksc", "ewca", "ewhc"],  # Supreme Court, Court of Appeal, High Court
    "civil": ["ewca", "ewhc", "uksc"],  # Court of Appeal, High Court, Supreme Court
}

# Common English stop words to filter out
STOP_WORDS: Set[str] = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "for",
    "from",
    "has",
    "he",
    "she",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "that",
    "the",
    "to",
    "was",
    "will",
    "with",
    "i",
    "my",
    "me",
    "am",
    "being",
    "been",
    "do",
    "does",
    "did",
    "would",
    "could",
    "should",
    "may",
    "might",
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def is_network_error(error: Exception) -> bool:
    """
    Check if error is network-related.

    Args:
        error: Exception to check

    Returns:
        True if network error, False otherwise
    """
    error_msg = str(error).lower()
    return any(
        keyword in error_msg
        for keyword in ["timeout", "network", "connection", "refused", "not found"]
    ) or isinstance(error, (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError))

def should_retry(error: Exception, attempt: int) -> bool:
    """
    Determine if request should be retried.

    Args:
        error: Exception that occurred
        attempt: Current attempt number

    Returns:
        True if should retry, False otherwise
    """
    if attempt >= APIConfig.MAX_RETRIES:
        return False
    return is_network_error(error)

def get_retry_delay(attempt: int) -> float:
    """
    Calculate exponential backoff delay.

    Args:
        attempt: Current attempt number

    Returns:
        Delay in seconds
    """
    return APIConfig.RETRY_DELAY_SECONDS * (2**attempt)

# ============================================================================
# LEGAL API SERVICE CLASS
# ============================================================================

class LegalAPIService:
    """
    Service for interacting with UK Legal APIs.

    Handles legislation.gov.uk and Find Case Law API with caching,
    keyword extraction, and intelligent error handling.
    """

    def __init__(self, audit_logger=None):
        """
        Initialize LegalAPIService.

        Args:
            audit_logger: Optional AuditLogger instance for logging API calls
        """
        self.audit_logger = audit_logger
        self.cache: Dict[str, CacheEntry] = {}
        self.client = httpx.AsyncClient(
            timeout=APIConfig.TIMEOUT_SECONDS, headers={"User-Agent": "Justice Companion/1.0"}
        )

        logger.info("LegalAPIService initialized")

    async def close(self):
        """Close the HTTP client. Call this when done with the service."""
        await self.client.aclose()

    # ==========================================================================
    # PUBLIC API
    # ==========================================================================

    async def search_legal_info(self, question: str) -> Dict[str, Any]:
        """
        Search for legal information based on natural language question.

        Handles offline gracefully and uses aggressive caching.

        Args:
            question: Natural language legal question

        Returns:
            Dictionary with legislation, cases, knowledge_base, cached, and timestamp

        Example:
            results = await service.search_legal_info("Can I be dismissed for being pregnant?")
            print(f"Found {len(results['legislation'])} laws")
        """
        try:
            # Extract keywords from question
            keywords = await self.extract_keywords(question)

            # Classify question to determine relevant courts
            category = self.classify_question(question)

            logger.info(
                f"Legal API search initiated - question: {question[:50]}..., "
                f"keywords: {keywords.all[:5]}, category: {category}"
            )

            # Check cache first
            cache_key = self._generate_cache_key("search", keywords.all + [category])
            cached = self._get_cached(cache_key)

            if cached:
                logger.info(f"Returning cached results for key: {cache_key}")
                cached["cached"] = True
                return cached

            # Fetch from APIs in parallel
            legislation, cases, knowledge_base = await asyncio.gather(
                self._search_legislation_internal(keywords.all),
                self._search_case_law_internal(keywords.all, category),
                self.search_knowledge_base(keywords.all),
            )

            results = {
                "legislation": [asdict(item) for item in legislation],
                "cases": [asdict(item) for item in cases],
                "knowledge_base": [asdict(item) for item in knowledge_base],
                "cached": False,
                "timestamp": int(time.time() * 1000),  # Milliseconds
            }

            # Cache results
            ttl = (
                APIConfig.CACHE_TTL_HOURS
                if len(legislation) > 0 or len(cases) > 0
                else APIConfig.EMPTY_CACHE_TTL_HOURS
            )
            self._set_cache(cache_key, results, ttl)

            logger.info(
                f"Legal API search completed - legislation: {len(legislation)}, "
                f"cases: {len(cases)}, knowledge_base: {len(knowledge_base)}, "
                f"category: {category}"
            )

            # Log audit event if available
            if self.audit_logger:
                try:
                    self.audit_logger.log(
                        event_type="legal_api.search",
                        user_id=None,
                        resource_type="legal_api",
                        resource_id="search",
                        action="search",
                        details={
                            "question": question[:100],
                            "category": category,
                            "results_count": len(legislation) + len(cases),
                        },
                        success=True,
                    )
                except Exception as audit_error:
                    logger.warning(f"Audit logging failed: {audit_error}")

            return results

        except Exception as error:
            logger.error(
                f"searchLegalInfo error: {error}",
                extra={"question": question, "is_offline": is_network_error(error)},
            )

            # Return empty results on error (graceful degradation)
            return {
                "legislation": [],
                "cases": [],
                "knowledge_base": [],
                "cached": False,
                "timestamp": int(time.time() * 1000),
            }

    def clear_cache(self) -> None:
        """Clear all cached data."""
        self.cache.clear()
        logger.info("Legal API cache cleared")

    def classify_question(self, question: str) -> str:
        """
        Classify question type for targeted API queries.

        Returns category: employment, housing, consumer, civil, etc.

        Args:
            question: Natural language question

        Returns:
            Category string (e.g., "employment", "housing", "general")
        """
        lower_question = question.lower()

        # Check each category
        for category, terms in LEGAL_TERMS_DICTIONARY.items():
            for term in terms:
                if term in lower_question:
                    return category

        # No legal terms found - this is a general conversation
        return "general"

    # ==========================================================================
    # KEYWORD EXTRACTION
    # ==========================================================================

    async def extract_keywords(self, question: str) -> ExtractedKeywords:
        """
        Extract keywords from natural language question.

        Uses simple NLP to identify legal terms, acts, and key concepts.

        Args:
            question: Natural language question

        Returns:
            ExtractedKeywords with all, legal, and general keyword lists
        """
        # Remove punctuation and split into words
        words = []
        for word in question.lower().replace(",", "").replace(".", "").replace("?", "").split():
            cleaned = "".join(c for c in word if c.isalnum() or c.isspace())
            if len(cleaned) > 2 and cleaned not in STOP_WORDS:
                words.append(cleaned)

        legal_terms: List[str] = []
        all_terms = [term for terms_list in LEGAL_TERMS_DICTIONARY.values() for term in terms_list]

        # Match against legal dictionary
        for word in words:
            for term in all_terms:
                if (
                    term in word or word in term or term in question.lower()
                ) and term not in legal_terms:
                    legal_terms.append(term)

        # Keep original meaningful words as general keywords
        general_keywords = [word for word in words if word not in legal_terms]

        # Combine for search (deduplicated)
        all_keywords = list(dict.fromkeys(legal_terms + general_keywords))

        logger.debug(
            f"Keywords extracted - all: {all_keywords[:10]}, "
            f"legal: {legal_terms[:5]}, general: {general_keywords[:5]}"
        )

        return ExtractedKeywords(all=all_keywords, legal=legal_terms, general=general_keywords)

    # ==========================================================================
    # API CLIENTS
    # ==========================================================================

    async def search_legislation(self, query: str | List[str]) -> List[Dict[str, Any]]:
        """
        Search legislation by query (interface compliance).

        Args:
            query: Search query string or list of keywords

        Returns:
            List of legislation results as dictionaries
        """
        try:
            keywords = query if isinstance(query, list) else [query]
            results = await self._search_legislation_internal(keywords)
            return [asdict(item) for item in results]
        except Exception as error:
            logger.error(f"searchLegislation error: {error}", extra={"query": query})
            return []

    async def _search_legislation_internal(self, keywords: List[str]) -> List[LegislationResult]:
        """
        Search legislation.gov.uk API (internal implementation).

        Queries UK statutes, regulations, and statutory instruments.

        Args:
            keywords: List of search keywords

        Returns:
            List of LegislationResult objects
        """
        try:
            query = " ".join(keywords)
            # Use Atom feed endpoint for UK Public General Acts
            from urllib.parse import quote

            url = f"{APIConfig.LEGISLATION_BASE_URL}/ukpga/data.feed?title={quote(query)}"

            logger.info(f"Searching legislation.gov.uk - url: {url}, keywords: {keywords[:5]}")

            response = await self._fetch_with_retry(url)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Legislation API returned {response.status_code}",
                )

            xml_text = response.text

            # Parse Atom XML response
            return self._parse_atom_feed_to_legislation(xml_text, query)

        except Exception as error:
            logger.error(
                f"searchLegislationInternal error: {error}",
                extra={"keywords": keywords, "is_offline": is_network_error(error)},
            )
            return []

    async def search_case_law(
        self, query: str | List[str], category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search case law by query (interface compliance).

        Args:
            query: Search query string or list of keywords
            category: Optional legal category for court filtering

        Returns:
            List of case law results as dictionaries
        """
        try:
            keywords = query if isinstance(query, list) else [query]
            results = await self._search_case_law_internal(keywords, category or "general")
            return [asdict(item) for item in results]
        except Exception as error:
            logger.error(
                f"searchCaseLaw error: {error}", extra={"query": query, "category": category}
            )
            return []

    async def _search_case_law_internal(
        self, keywords: List[str], category: str = "general"
    ) -> List[CaseResult]:
        """
        Search Find Case Law API (internal implementation).

        Queries tribunal decisions, court judgments, and precedents with
        intelligent court filtering.

        Args:
            keywords: List of search keywords
            category: Legal category for court filtering

        Returns:
            List of CaseResult objects
        """
        try:
            # Build improved query with quoted phrases for multi-word terms
            query_terms = [f'"{term}"' if " " in term else term for term in keywords]
            query = " ".join(query_terms)

            # Build URL with court filtering if category matches
            from urllib.parse import quote

            url = f"{APIConfig.CASELAW_BASE_URL}/atom.xml?query={quote(query)}"

            # Add court filtering based on question category
            relevant_courts = CATEGORY_TO_COURT_MAP.get(category, [])
            if relevant_courts:
                court_params = "&".join(f"court={court}" for court in relevant_courts)
                url += f"&{court_params}"

            logger.info(
                f"Searching Find Case Law - url: {url}, keywords: {keywords[:5]}, "
                f"category: {category}, courts: {relevant_courts}"
            )

            response = await self._fetch_with_retry(url)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Case Law API returned {response.status_code}",
                )

            xml_text = response.text

            # Parse Atom XML response
            return self._parse_atom_feed_to_case_law(xml_text, query)

        except Exception as error:
            logger.error(
                f"searchCaseLawInternal error: {error}",
                extra={
                    "keywords": keywords,
                    "category": category,
                    "is_offline": is_network_error(error),
                },
            )
            return []

    async def get_legislation(self, legislation_id: str) -> Optional[str]:
        """
        Get legislation by ID.

        Args:
            legislation_id: Legislation identifier (e.g., "ukpga/1996/18")

        Returns:
            XML text of legislation or None if not found
        """
        try:
            url = f"{APIConfig.LEGISLATION_BASE_URL}/{legislation_id}/data.xml"

            logger.info(f"Fetching legislation by ID - id: {legislation_id}, url: {url}")

            response = await self._fetch_with_retry(url)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Legislation API returned {response.status_code}",
                )

            return response.text

        except Exception as error:
            logger.error(
                f"getLegislation error: {error}",
                extra={"id": legislation_id, "is_offline": is_network_error(error)},
            )
            return None

    async def get_case_law(self, case_id: str) -> Optional[Dict[str, Any]]:
        """
        Get case law by ID.

        Args:
            case_id: Case identifier

        Returns:
            JSON data of case or None if not found
        """
        try:
            url = f"{APIConfig.CASELAW_BASE_URL}/{case_id}"

            logger.info(f"Fetching case law by ID - id: {case_id}, url: {url}")

            response = await self._fetch_with_retry(url)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Case Law API returned {response.status_code}",
                )

            return response.json()

        except Exception as error:
            logger.error(
                f"getCaseLaw error: {error}",
                extra={"id": case_id, "is_offline": is_network_error(error)},
            )
            return None

    async def search_knowledge_base(self, keywords: List[str]) -> List[KnowledgeEntry]:
        """
        Search internal knowledge base.

        Queries cached FAQs, guides, and common scenarios.

        Args:
            keywords: List of search keywords

        Returns:
            List of KnowledgeEntry objects
        """
        try:
            logger.debug(f"Searching knowledge base - keywords: {keywords[:5]}")

            # FUTURE ENHANCEMENT: Implement knowledge base integration
            # For now, return empty list
            return []

        except Exception as error:
            logger.error(f"searchKnowledgeBase error: {error}", extra={"keywords": keywords})
            return []

    # ==========================================================================
    # HTTP CLIENT WITH RETRY LOGIC
    # ==========================================================================

    async def _fetch_with_retry(self, url: str, attempt: int = 0) -> httpx.Response:
        """
        Fetch with automatic retry and timeout handling.

        Args:
            url: URL to fetch
            attempt: Current attempt number

        Returns:
            HTTP response

        Raises:
            Exception: If all retries fail
        """
        try:
            response = await self.client.get(url)
            return response

        except Exception as error:
            if should_retry(error, attempt):
                delay = get_retry_delay(attempt)
                logger.warning(
                    f"Retrying request (attempt {attempt + 1}) - url: {url}, delay: {delay}s"
                )
                await asyncio.sleep(delay)
                return await self._fetch_with_retry(url, attempt + 1)

            raise

    # ==========================================================================
    # RESPONSE PARSERS
    # ==========================================================================

    def _parse_atom_feed_to_legislation(self, xml_text: str, query: str) -> List[LegislationResult]:
        """
        Parse Atom XML feed to legislation results.

        Atom format: <feed><entry><title>, <link>, <summary>, etc.

        Args:
            xml_text: Raw XML response text
            query: Original search query

        Returns:
            List of LegislationResult objects
        """
        try:
            # Parse XML
            root = ET.fromstring(xml_text)

            # Handle Atom namespace
            ns = {"atom": "http://www.w3.org/2005/Atom"}

            entries = root.findall(".//atom:entry", ns)
            results: List[LegislationResult] = []

            for index, entry in enumerate(entries[:5]):  # Limit to 5 results
                # Extract title
                title_elem = entry.find("atom:title", ns)
                title = title_elem.text if title_elem is not None else "Unknown"

                # Extract summary or content
                summary_elem = entry.find("atom:summary", ns)
                content_elem = entry.find("atom:content", ns)
                summary = (
                    summary_elem.text
                    if summary_elem is not None
                    else content_elem.text if content_elem is not None else "No summary available"
                )

                # Extract link (prefer 'alternate' rel)
                links = entry.findall("atom:link", ns)
                link = ""
                for link_elem in links:
                    href = link_elem.get("href", "")
                    rel = link_elem.get("rel", "")
                    if rel == "alternate":
                        link = href
                        break
                if not link and links:
                    link = links[0].get("href", "")

                # Extract section from title if present
                section = None
                if "Section" in title:
                    import re

                    match = re.search(r"Section (\d+[A-Z]?)", title, re.IGNORECASE)
                    if match:
                        section = match.group(0)

                results.append(
                    LegislationResult(
                        title=title.strip(),
                        section=section,
                        content=summary.strip()[:500],  # Limit content length
                        url=link,
                        relevance=1.0 - index * 0.1,  # Simple relevance scoring
                    )
                )

            return results

        except Exception as error:
            logger.error(f"parseAtomFeedToLegislation error: {error}")
            return []

    def _parse_atom_feed_to_case_law(self, xml_text: str, query: str) -> List[CaseResult]:
        """
        Parse Atom XML feed to case law results.

        Atom format: <feed><entry><title>, <link>, <summary>, etc.

        Args:
            xml_text: Raw XML response text
            query: Original search query

        Returns:
            List of CaseResult objects
        """
        try:
            # Parse XML
            root = ET.fromstring(xml_text)

            # Handle Atom namespace
            ns = {"atom": "http://www.w3.org/2005/Atom"}

            entries = root.findall(".//atom:entry", ns)
            results: List[CaseResult] = []

            for index, entry in enumerate(entries[:5]):  # Limit to 5 results
                # Extract title (case citation)
                title_elem = entry.find("atom:title", ns)
                title = title_elem.text if title_elem is not None else "Unknown Case"

                # Extract summary or content
                summary_elem = entry.find("atom:summary", ns)
                content_elem = entry.find("atom:content", ns)
                summary = (
                    summary_elem.text
                    if summary_elem is not None
                    else content_elem.text if content_elem is not None else "No summary available"
                )

                # Extract date (updated or published)
                updated_elem = entry.find("atom:updated", ns)
                published_elem = entry.find("atom:published", ns)
                date_str = (
                    updated_elem.text
                    if updated_elem is not None
                    else (
                        published_elem.text
                        if published_elem is not None
                        else datetime.now(timezone.utc).isoformat()
                    )
                )
                date = date_str.split("T")[0]  # Extract date part only

                # Extract link (prefer 'alternate' rel)
                links = entry.findall("atom:link", ns)
                link = ""
                for link_elem in links:
                    href = link_elem.get("href", "")
                    rel = link_elem.get("rel", "")
                    if rel == "alternate":
                        link = href
                        break
                if not link and links:
                    link = links[0].get("href", "")

                # Extract court from title (typically in brackets)
                court = "UK Court"
                import re

                court_match = re.search(r"\[(.*?)\]", title)
                if court_match:
                    court = court_match.group(1)

                results.append(
                    CaseResult(
                        citation=title.strip(),
                        court=court,
                        date=date,
                        summary=summary.strip()[:500],  # Limit summary length
                        url=link,
                        outcome=None,  # Not typically in atom feed
                        relevance=1.0 - index * 0.1,  # Simple relevance scoring
                    )
                )

            return results

        except Exception as error:
            logger.error(f"parseAtomFeedToCaseLaw error: {error}")
            return []

    # ==========================================================================
    # CACHE LAYER
    # ==========================================================================

    def _generate_cache_key(self, prefix: str, params: List[str]) -> str:
        """
        Generate cache key from prefix and parameters.

        Args:
            prefix: Key prefix (e.g., "search")
            params: List of parameters

        Returns:
            Cache key string
        """
        sorted_params = sorted(params)
        return f"{prefix}:{','.join(sorted_params)}"

    def _get_cached(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached data if valid.

        Args:
            key: Cache key

        Returns:
            Cached data or None if expired/not found
        """
        entry = self.cache.get(key)

        if not entry:
            return None

        # Check if expired
        current_time_ms = int(time.time() * 1000)
        if current_time_ms > entry.expires_at:
            del self.cache[key]
            return None

        return entry.data

    def _set_cache(self, key: str, data: Any, ttl_hours: int) -> None:
        """
        Set cache with TTL.

        Args:
            key: Cache key
            data: Data to cache
            ttl_hours: Time to live in hours
        """
        current_time_ms = int(time.time() * 1000)

        entry = CacheEntry(
            data=data,
            timestamp=current_time_ms,
            expires_at=current_time_ms + ttl_hours * 60 * 60 * 1000,
        )

        self.cache[key] = entry

        # Enforce cache size limit
        if len(self.cache) > APIConfig.MAX_CACHE_SIZE:
            self._evict_oldest_cache()

    def _evict_oldest_cache(self) -> None:
        """Evict oldest cache entries when limit exceeded."""
        if not self.cache:
            return

        oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k].timestamp)
        del self.cache[oldest_key]

# ============================================================================
# SINGLETON EXPORT
# ============================================================================

# Module-level singleton instance for convenience
_legal_api_service_instance: Optional[LegalAPIService] = None

def get_legal_api_service(audit_logger=None) -> LegalAPIService:
    """
    Get singleton instance of LegalAPIService.

    Args:
        audit_logger: Optional AuditLogger instance

    Returns:
        LegalAPIService instance
    """
    global _legal_api_service_instance

    if _legal_api_service_instance is None:
        _legal_api_service_instance = LegalAPIService(audit_logger=audit_logger)

    return _legal_api_service_instance
