"""
Citation Service for extracting and formatting legal citations.

Migrated from: src/services/CitationService.ts

Features:
- Extract legal citations from text using eyecite library
- Parse case law citations (volume, reporter, page, year, court)
- Parse statute citations (section, chapter)
- Format citations for display
- Highlight citations in text with HTML markup
- Generate CourtListener links for case citations

Citation Types Supported:
- FullCaseCitation: e.g., "410 U.S. 113 (1973)"
- ShortCaseCitation: e.g., "410 U.S., at 113"
- IdCitation: e.g., "Id. at 115"
- SupraCitation: e.g., "Smith, supra, at 120"
- FullLawCitation: e.g., "42 U.S.C. § 1983"

Dependencies:
- eyecite: Python legal citation extraction library
  Install: pip install eyecite

Security:
- Pure utility service (no database operations)
- No user authentication required
- Safe HTML output with escaped attributes
- No external API calls (except optional CourtListener link generation)

Usage:
    from backend.services.citation_service import CitationService

    service = CitationService()
    citations = service.extract_citations("See Roe v. Wade, 410 U.S. 113 (1973)")
    for citation in citations:
        print(f"Found: {citation.text} - {citation.type}")
        print(f"Link: {service.get_court_listener_link(citation)}")
"""

import logging
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import quote

# Eyecite is the standard Python library for legal citation extraction
# Originally developed by Free Law Project
try:
    from eyecite import get_citations, clean_text, annotate_citations
    from eyecite.models import (
        CitationBase,
        FullCaseCitation,
        ShortCaseCitation,
        IdCitation,
        SupraCitation,
        FullLawCitation,
    )
    EYECITE_AVAILABLE = True
except ImportError as e:
    EYECITE_AVAILABLE = False
    IMPORT_ERROR = str(e)
    # Fallback types for when eyecite is not installed
    CitationBase = None
    FullCaseCitation = None
    ShortCaseCitation = None
    IdCitation = None
    SupraCitation = None
    FullLawCitation = None


# Configure logger
logger = logging.getLogger(__name__)


@dataclass
class CitationMetadata:
    """
    Metadata extracted from a legal citation.

    Attributes:
        volume: Reporter volume number
        reporter: Reporter abbreviation (e.g., "U.S.", "F.2d")
        page: Starting page number
        year: Year of decision
        court: Court abbreviation (e.g., "scotus", "9th-cir")
        plaintiff: Plaintiff name in case citation
        defendant: Defendant name in case citation
        section: Statute section number
        chapter: Statute chapter number
        pin_cite: Pinpoint citation (specific page reference)
    """
    volume: Optional[str] = None
    reporter: Optional[str] = None
    page: Optional[str] = None
    year: Optional[str] = None
    court: Optional[str] = None
    plaintiff: Optional[str] = None
    defendant: Optional[str] = None
    section: Optional[str] = None
    chapter: Optional[str] = None
    pin_cite: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values."""
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class ExtractedCitation:
    """
    Represents a legal citation extracted from text.

    Attributes:
        text: The matched citation text
        type: Citation type name (e.g., "FullCaseCitation", "FullLawCitation")
        span: Tuple of (start_index, end_index) in original text
        metadata: Structured metadata extracted from citation
    """
    text: str
    type: str
    span: Tuple[int, int]
    metadata: CitationMetadata

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "text": self.text,
            "type": self.type,
            "span": list(self.span),
            "metadata": self.metadata.to_dict()
        }


class CitationService:
    """
    Service for extracting and processing legal citations.

    This is a stateless utility service that uses the eyecite library
    to parse legal citations from text. No database operations are performed.

    Examples:
        >>> service = CitationService()
        >>> citations = service.extract_citations("See 410 U.S. 113")
        >>> len(citations)
        1
        >>> citations[0].type
        'FullCaseCitation'
        >>> citations[0].metadata.volume
        '410'
    """

    def __init__(self):
        """
        Initialize the citation service.

        Raises:
            ImportError: If eyecite library is not installed
        """
        if not EYECITE_AVAILABLE:
            logger.error(
                "CitationService requires eyecite library. "
                "Install with: pip install eyecite"
            )
            raise ImportError(
                "eyecite library is required for CitationService. "
                "Install with: pip install eyecite"
            )

    def extract_citations(
        self,
        text: str,
        remove_ambiguous: bool = False
    ) -> List[ExtractedCitation]:
        """
        Extract all legal citations from text.

        Uses eyecite library to parse citations with high accuracy.
        Supports case citations, statute citations, and reference citations.

        Args:
            text: The text to parse for citations
            remove_ambiguous: If True, remove citations with ambiguous reporter matches

        Returns:
            List of ExtractedCitation objects with metadata

        Examples:
            >>> service = CitationService()
            >>> citations = service.extract_citations("See Roe v. Wade, 410 U.S. 113 (1973)")
            >>> citations[0].text
            '410 U.S. 113'
            >>> citations[0].metadata.year
            '1973'
        """
        try:
            if not text or not text.strip():
                return []

            # Clean text (remove HTML, normalize whitespace)
            cleaned = clean_text(text, ['html', 'inline_whitespace'])

            # Extract citations
            # Note: Python eyecite doesn't have overlapHandling parameter
            # It automatically handles overlaps by default
            citations = get_citations(
                cleaned,
                remove_ambiguous=remove_ambiguous
            )

            logger.info(
                f"Extracted {len(citations)} citations from text "
                f"(length: {len(text)} chars)"
            )

            # Convert to our format
            return [self._convert_citation(citation) for citation in citations]

        except Exception as error:
            logger.error(f"Failed to extract citations: {error}", exc_info=True)
            return []

    def _convert_citation(self, citation: Any) -> ExtractedCitation:
        """
        Convert eyecite Citation object to ExtractedCitation format.

        Args:
            citation: Eyecite citation object

        Returns:
            ExtractedCitation with structured metadata
        """
        # Get citation type name
        citation_type = citation.__class__.__name__

        # Get span (start, end) positions
        span = citation.span()

        # Extract metadata based on citation type
        metadata = CitationMetadata()

        # Extract from groups dict (volume, reporter, page, section, chapter)
        if hasattr(citation, 'groups') and citation.groups:
            groups = citation.groups
            # groups is a dict, not an object
            if isinstance(groups, dict):
                metadata.volume = str(groups['volume']) if 'volume' in groups and groups['volume'] else None
                metadata.reporter = str(groups['reporter']) if 'reporter' in groups and groups['reporter'] else None
                metadata.page = str(groups['page']) if 'page' in groups and groups['page'] else None
                metadata.section = str(groups['section']) if 'section' in groups and groups['section'] else None
                metadata.chapter = str(groups['chapter']) if 'chapter' in groups and groups['chapter'] else None

        # Extract year and court from metadata object
        if hasattr(citation, 'metadata') and citation.metadata:
            cite_meta = citation.metadata
            # Can be dict or object with attributes
            if isinstance(cite_meta, dict):
                metadata.year = str(cite_meta['year']) if 'year' in cite_meta and cite_meta['year'] else None
                metadata.court = str(cite_meta['court']) if 'court' in cite_meta and cite_meta['court'] else None
                metadata.plaintiff = str(cite_meta['plaintiff']) if 'plaintiff' in cite_meta and cite_meta['plaintiff'] else None
                metadata.defendant = str(cite_meta['defendant']) if 'defendant' in cite_meta and cite_meta['defendant'] else None
                metadata.pin_cite = str(cite_meta['pin_cite']) if 'pin_cite' in cite_meta and cite_meta['pin_cite'] else None
            else:
                # Object with attributes
                metadata.year = str(cite_meta.year) if hasattr(cite_meta, 'year') and cite_meta.year else None
                metadata.court = str(cite_meta.court) if hasattr(cite_meta, 'court') and cite_meta.court else None
                metadata.plaintiff = str(cite_meta.plaintiff) if hasattr(cite_meta, 'plaintiff') and cite_meta.plaintiff else None
                metadata.defendant = str(cite_meta.defendant) if hasattr(cite_meta, 'defendant') and cite_meta.defendant else None
                metadata.pin_cite = str(cite_meta.pin_cite) if hasattr(cite_meta, 'pin_cite') and cite_meta.pin_cite else None

        # Get matched text
        matched_text = citation.matched_text()

        return ExtractedCitation(
            text=matched_text,
            type=citation_type,
            span=span,
            metadata=metadata
        )

    def highlight_citations(self, text: str) -> str:
        """
        Highlight citations in text with HTML markup.

        Wraps each citation in <mark> tags with citation type as data attribute.
        Safe for HTML rendering with escaped attributes.

        Args:
            text: The text containing citations

        Returns:
            HTML string with citations wrapped in <mark> tags

        Examples:
            >>> service = CitationService()
            >>> result = service.highlight_citations("See 410 U.S. 113")
            >>> '<mark class="legal-citation"' in result
            True
        """
        try:
            if not text or not text.strip():
                return text

            # Clean text
            cleaned = clean_text(text, ['html', 'inline_whitespace'])

            # Get citations
            citations = get_citations(cleaned)

            if not citations:
                return text

            # Build annotation list: [(span, before_tag, after_tag), ...]
            annotations = []
            for citation in citations:
                span = citation.span()
                citation_type = citation.__class__.__name__
                # Escape citation type for safe HTML attribute
                safe_type = citation_type.replace('"', '&quot;')
                before_tag = f'<mark class="legal-citation" data-citation-type="{safe_type}">'
                after_tag = '</mark>'
                annotations.append((span, before_tag, after_tag))

            # Apply annotations
            return annotate_citations(cleaned, annotations)

        except Exception as error:
            logger.error(f"Failed to highlight citations: {error}", exc_info=True)
            return text

    def format_citation(self, citation: ExtractedCitation) -> str:
        """
        Format citation for human-readable display.

        Produces standard legal citation format based on type.

        Args:
            citation: The citation to format

        Returns:
            Formatted citation string

        Examples:
            >>> # FullCaseCitation
            >>> citation = ExtractedCitation(
            ...     text="410 U.S. 113",
            ...     type="FullCaseCitation",
            ...     span=(0, 12),
            ...     metadata=CitationMetadata(volume="410", reporter="U.S.", page="113", year="1973")
            ... )
            >>> service = CitationService()
            >>> service.format_citation(citation)
            '410 U.S. 113 (1973)'
        """
        meta = citation.metadata

        if citation.type == "FullCaseCitation":
            # Format: {volume} {reporter} {page} ({year}) ({court})
            formatted = f"{meta.volume} {meta.reporter} {meta.page}"
            if meta.year:
                formatted += f" ({meta.year})"
            if meta.court and meta.court.lower() != "scotus":
                formatted += f" ({meta.court.upper()})"
            return formatted

        elif citation.type == "FullLawCitation":
            # Format: {reporter} ch. {chapter} § {section}
            formatted = meta.reporter or ""
            if meta.chapter:
                formatted += f" ch. {meta.chapter}"
            if meta.section:
                formatted += f" § {meta.section}"
            return formatted.strip()

        elif citation.type == "ShortCaseCitation":
            # Format: {volume} {reporter}, at {page}
            return f"{meta.volume} {meta.reporter}, at {meta.page}"

        elif citation.type == "IdCitation":
            # Format: Id. {pin_cite}
            return f"Id. {meta.pin_cite}" if meta.pin_cite else "Id."

        elif citation.type == "SupraCitation":
            # Use original text
            return citation.text

        # Default: return original text
        return citation.text

    def get_court_listener_link(self, citation: ExtractedCitation) -> Optional[str]:
        """
        Generate a CourtListener search link for a case citation.

        CourtListener is a free legal research database maintained by Free Law Project.
        Only applicable to FullCaseCitation types.

        Args:
            citation: The citation to link to

        Returns:
            CourtListener URL or None if not a case citation

        Examples:
            >>> citation = ExtractedCitation(
            ...     text="410 U.S. 113",
            ...     type="FullCaseCitation",
            ...     span=(0, 12),
            ...     metadata=CitationMetadata(volume="410", reporter="U.S.", page="113")
            ... )
            >>> service = CitationService()
            >>> link = service.get_court_listener_link(citation)
            >>> "courtlistener.com" in link
            True
        """
        if citation.type != "FullCaseCitation":
            return None

        meta = citation.metadata
        if not (meta.volume and meta.reporter and meta.page):
            return None

        # Build search query: "{volume} {reporter} {page}"
        query = f"{meta.volume} {meta.reporter} {meta.page}"
        encoded_query = quote(query)

        return f"https://www.courtlistener.com/?q={encoded_query}"

    def get_citation_summary(self, citations: List[ExtractedCitation]) -> Dict[str, Any]:
        """
        Generate summary statistics for a list of citations.

        Useful for analysis and reporting.

        Args:
            citations: List of extracted citations

        Returns:
            Dictionary with summary statistics

        Examples:
            >>> citations = service.extract_citations("See 410 U.S. 113 and 42 U.S.C. § 1983")
            >>> summary = service.get_citation_summary(citations)
            >>> summary['total_count']
            2
            >>> 'FullCaseCitation' in summary['by_type']
            True
        """
        summary = {
            "total_count": len(citations),
            "by_type": {},
            "has_case_citations": False,
            "has_statute_citations": False,
            "has_reference_citations": False,
        }

        # Count by type
        for citation in citations:
            citation_type = citation.type
            if citation_type not in summary["by_type"]:
                summary["by_type"][citation_type] = 0
            summary["by_type"][citation_type] += 1

            # Set category flags
            if citation_type in ["FullCaseCitation", "ShortCaseCitation"]:
                summary["has_case_citations"] = True
            elif citation_type == "FullLawCitation":
                summary["has_statute_citations"] = True
            elif citation_type in ["IdCitation", "SupraCitation"]:
                summary["has_reference_citations"] = True

        return summary


# Module-level utility functions for convenience

def extract_citations_from_text(text: str) -> List[ExtractedCitation]:
    """
    Convenience function to extract citations without instantiating service.

    Args:
        text: Text to parse

    Returns:
        List of ExtractedCitation objects
    """
    service = CitationService()
    return service.extract_citations(text)


def highlight_citations_in_text(text: str) -> str:
    """
    Convenience function to highlight citations without instantiating service.

    Args:
        text: Text to highlight

    Returns:
        HTML string with highlighted citations
    """
    service = CitationService()
    return service.highlight_citations(text)
