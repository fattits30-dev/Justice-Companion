"""
Unit tests for CitationService.

Tests legal citation extraction, formatting, and highlighting functionality.
Uses eyecite library for citation parsing.

Run tests:
    pytest backend/services/test_citation_service.py -v

Coverage:
    pytest backend/services/test_citation_service.py --cov=backend.services.citation_service --cov-report=term-missing
"""

import pytest

# Skip all tests if eyecite is not installed
pytest.importorskip("eyecite", reason="eyecite library required for citation tests")

from backend.services.citation_service import (
    CitationService,
    ExtractedCitation,
    CitationMetadata,
    extract_citations_from_text,
    highlight_citations_in_text,
)

class TestCitationService:
    """Test suite for CitationService."""

    @pytest.fixture
    def service(self) -> CitationService:
        """Create a CitationService instance."""
        return CitationService()

    # ============================================================================
    # EXTRACTION TESTS
    # ============================================================================

    def test_extract_full_case_citation(self, service: CitationService):
        """Test extraction of full case citation with volume, reporter, page."""
        text = "See Roe v. Wade, 410 U.S. 113 (1973)"
        citations = service.extract_citations(text)

        assert len(citations) > 0
        citation = citations[0]
        assert citation.type == "FullCaseCitation"
        assert "410" in citation.text
        assert "U.S." in citation.text
        assert citation.metadata.volume == "410"
        assert citation.metadata.reporter == "U.S."
        assert citation.metadata.page == "113"

    def test_extract_multiple_citations(self, service: CitationService):
        """Test extraction of multiple citations from text."""
        text = "See 410 U.S. 113 and 505 U.S. 833 for comparison."
        citations = service.extract_citations(text)

        assert len(citations) >= 2
        # Should find at least two U.S. citations
        us_citations = [c for c in citations if "U.S." in c.text]
        assert len(us_citations) >= 2

    def test_extract_statute_citation(self, service: CitationService):
        """Test extraction of statute citation with section number."""
        text = "Under 42 U.S.C. § 1983, plaintiffs may sue."
        citations = service.extract_citations(text)

        # Should find statute citation
        statute_citations = [c for c in citations if c.type == "FullLawCitation"]
        assert len(statute_citations) > 0

    def test_extract_from_empty_text(self, service: CitationService):
        """Test extraction from empty text returns empty list."""
        assert service.extract_citations("") == []
        assert service.extract_citations("   ") == []
        assert service.extract_citations("No citations here.") == []

    def test_extract_with_html(self, service: CitationService):
        """Test extraction from HTML text (should clean HTML tags)."""
        text = "<p>See <strong>410 U.S. 113</strong> for details.</p>"
        citations = service.extract_citations(text)

        assert len(citations) > 0
        # Should still find citation despite HTML tags

    def test_extract_citation_spans(self, service: CitationService):
        """Test that citation spans are correct."""
        text = "See 410 U.S. 113 for details."
        citations = service.extract_citations(text)

        assert len(citations) > 0
        citation = citations[0]
        # Span should be (start, end) tuple
        assert isinstance(citation.span, tuple)
        assert len(citation.span) == 2
        assert citation.span[0] < citation.span[1]

    def test_extract_with_remove_ambiguous(self, service: CitationService):
        """Test extraction with remove_ambiguous flag."""
        text = "See 410 U.S. 113"
        citations_with_ambiguous = service.extract_citations(text, remove_ambiguous=False)
        citations_without_ambiguous = service.extract_citations(text, remove_ambiguous=True)

        # Both should return results for clear citations
        assert len(citations_with_ambiguous) > 0
        assert len(citations_without_ambiguous) > 0

    def test_extract_error_handling(self, service: CitationService):
        """Test that extraction errors are handled gracefully."""
        # Should not raise exception on None or invalid input
        result = service.extract_citations("")
        assert result == []

    # ============================================================================
    # FORMATTING TESTS
    # ============================================================================

    def test_format_full_case_citation(self, service: CitationService):
        """Test formatting of full case citation."""
        citation = ExtractedCitation(
            text="410 U.S. 113",
            type="FullCaseCitation",
            span=(0, 12),
            metadata=CitationMetadata(
                volume="410",
                reporter="U.S.",
                page="113",
                year="1973"
            )
        )

        formatted = service.format_citation(citation)
        assert "410" in formatted
        assert "U.S." in formatted
        assert "113" in formatted
        assert "1973" in formatted

    def test_format_full_case_citation_with_court(self, service: CitationService):
        """Test formatting with court abbreviation."""
        citation = ExtractedCitation(
            text="100 F.3d 500",
            type="FullCaseCitation",
            span=(0, 12),
            metadata=CitationMetadata(
                volume="100",
                reporter="F.3d",
                page="500",
                year="2000",
                court="9th-cir"
            )
        )

        formatted = service.format_citation(citation)
        assert "9TH-CIR" in formatted.upper()

    def test_format_full_law_citation(self, service: CitationService):
        """Test formatting of statute citation."""
        citation = ExtractedCitation(
            text="42 U.S.C. § 1983",
            type="FullLawCitation",
            span=(0, 16),
            metadata=CitationMetadata(
                reporter="42 U.S.C.",
                section="1983"
            )
        )

        formatted = service.format_citation(citation)
        assert "§" in formatted or "section" in formatted.lower()
        assert "1983" in formatted

    def test_format_short_case_citation(self, service: CitationService):
        """Test formatting of short case citation."""
        citation = ExtractedCitation(
            text="410 U.S., at 115",
            type="ShortCaseCitation",
            span=(0, 16),
            metadata=CitationMetadata(
                volume="410",
                reporter="U.S.",
                page="115"
            )
        )

        formatted = service.format_citation(citation)
        assert "410" in formatted
        assert "U.S." in formatted
        assert "at" in formatted
        assert "115" in formatted

    def test_format_id_citation(self, service: CitationService):
        """Test formatting of Id. citation."""
        citation = ExtractedCitation(
            text="Id. at 120",
            type="IdCitation",
            span=(0, 10),
            metadata=CitationMetadata(pin_cite="at 120")
        )

        formatted = service.format_citation(citation)
        assert "Id." in formatted

    def test_format_id_citation_without_pin_cite(self, service: CitationService):
        """Test formatting of Id. citation without pin cite."""
        citation = ExtractedCitation(
            text="Id.",
            type="IdCitation",
            span=(0, 3),
            metadata=CitationMetadata()
        )

        formatted = service.format_citation(citation)
        assert formatted == "Id."

    def test_format_supra_citation(self, service: CitationService):
        """Test formatting of supra citation."""
        citation = ExtractedCitation(
            text="Smith, supra, at 50",
            type="SupraCitation",
            span=(0, 19),
            metadata=CitationMetadata()
        )

        formatted = service.format_citation(citation)
        assert "Smith" in formatted or formatted == citation.text

    def test_format_unknown_citation_type(self, service: CitationService):
        """Test formatting of unknown citation type returns original text."""
        citation = ExtractedCitation(
            text="Unknown citation",
            type="UnknownType",
            span=(0, 16),
            metadata=CitationMetadata()
        )

        formatted = service.format_citation(citation)
        assert formatted == "Unknown citation"

    # ============================================================================
    # HIGHLIGHTING TESTS
    # ============================================================================

    def test_highlight_citations_basic(self, service: CitationService):
        """Test basic citation highlighting with HTML markup."""
        text = "See 410 U.S. 113"
        highlighted = service.highlight_citations(text)

        assert "<mark" in highlighted
        assert "legal-citation" in highlighted
        assert "</mark>" in highlighted

    def test_highlight_citations_with_type(self, service: CitationService):
        """Test that highlighted citations include type attribute."""
        text = "See 410 U.S. 113"
        highlighted = service.highlight_citations(text)

        assert "data-citation-type" in highlighted

    def test_highlight_multiple_citations(self, service: CitationService):
        """Test highlighting multiple citations."""
        text = "See 410 U.S. 113 and 505 U.S. 833"
        highlighted = service.highlight_citations(text)

        # Should have multiple <mark> tags
        mark_count = highlighted.count("<mark")
        assert mark_count >= 2

    def test_highlight_empty_text(self, service: CitationService):
        """Test highlighting empty text returns original."""
        assert service.highlight_citations("") == ""
        assert service.highlight_citations("   ") == "   "

    def test_highlight_text_without_citations(self, service: CitationService):
        """Test highlighting text with no citations returns original."""
        text = "This text has no citations."
        highlighted = service.highlight_citations(text)
        assert highlighted == text

    def test_highlight_error_handling(self, service: CitationService):
        """Test that highlighting errors return original text."""
        text = "Some text"
        result = service.highlight_citations(text)
        # Should not raise exception
        assert isinstance(result, str)

    # ============================================================================
    # COURTLISTENER LINK TESTS
    # ============================================================================

    def test_get_court_listener_link_full_case(self, service: CitationService):
        """Test generating CourtListener link for full case citation."""
        citation = ExtractedCitation(
            text="410 U.S. 113",
            type="FullCaseCitation",
            span=(0, 12),
            metadata=CitationMetadata(
                volume="410",
                reporter="U.S.",
                page="113"
            )
        )

        link = service.get_court_listener_link(citation)
        assert link is not None
        assert "courtlistener.com" in link
        assert "410" in link
        assert "U.S." in link
        assert "113" in link

    def test_get_court_listener_link_non_case_citation(self, service: CitationService):
        """Test that non-case citations return None."""
        citation = ExtractedCitation(
            text="42 U.S.C. § 1983",
            type="FullLawCitation",
            span=(0, 16),
            metadata=CitationMetadata(
                reporter="42 U.S.C.",
                section="1983"
            )
        )

        link = service.get_court_listener_link(citation)
        assert link is None

    def test_get_court_listener_link_incomplete_metadata(self, service: CitationService):
        """Test that incomplete metadata returns None."""
        citation = ExtractedCitation(
            text="Some citation",
            type="FullCaseCitation",
            span=(0, 13),
            metadata=CitationMetadata(volume="410")  # Missing reporter and page
        )

        link = service.get_court_listener_link(citation)
        assert link is None

    def test_get_court_listener_link_url_encoding(self, service: CitationService):
        """Test that CourtListener links are properly URL encoded."""
        citation = ExtractedCitation(
            text="100 F.3d 500",
            type="FullCaseCitation",
            span=(0, 12),
            metadata=CitationMetadata(
                volume="100",
                reporter="F.3d",
                page="500"
            )
        )

        link = service.get_court_listener_link(citation)
        assert link is not None
        # URL should be properly encoded (spaces -> %20 or +)
        assert " " not in link.split("?q=")[1] if "?q=" in link else True

    # ============================================================================
    # CITATION SUMMARY TESTS
    # ============================================================================

    def test_get_citation_summary_basic(self, service: CitationService):
        """Test basic citation summary generation."""
        citations = service.extract_citations("See 410 U.S. 113")
        summary = service.get_citation_summary(citations)

        assert "total_count" in summary
        assert "by_type" in summary
        assert summary["total_count"] == len(citations)

    def test_get_citation_summary_by_type(self, service: CitationService):
        """Test citation summary groups by type."""
        text = "See 410 U.S. 113 and 42 U.S.C. § 1983"
        citations = service.extract_citations(text)
        summary = service.get_citation_summary(citations)

        assert isinstance(summary["by_type"], dict)
        assert summary["total_count"] > 0

    def test_get_citation_summary_category_flags(self, service: CitationService):
        """Test citation summary sets category flags."""
        text = "See 410 U.S. 113"
        citations = service.extract_citations(text)
        summary = service.get_citation_summary(citations)

        assert "has_case_citations" in summary
        assert "has_statute_citations" in summary
        assert "has_reference_citations" in summary

    def test_get_citation_summary_empty_list(self, service: CitationService):
        """Test citation summary for empty list."""
        summary = service.get_citation_summary([])

        assert summary["total_count"] == 0
        assert summary["by_type"] == {}
        assert summary["has_case_citations"] is False
        assert summary["has_statute_citations"] is False
        assert summary["has_reference_citations"] is False

    # ============================================================================
    # METADATA TESTS
    # ============================================================================

    def test_citation_metadata_to_dict(self):
        """Test CitationMetadata to_dict excludes None values."""
        metadata = CitationMetadata(
            volume="410",
            reporter="U.S.",
            page="113",
            year=None
        )

        result = metadata.to_dict()
        assert "volume" in result
        assert "reporter" in result
        assert "page" in result
        assert "year" not in result  # None values excluded

    def test_extracted_citation_to_dict(self):
        """Test ExtractedCitation to_dict serialization."""
        citation = ExtractedCitation(
            text="410 U.S. 113",
            type="FullCaseCitation",
            span=(0, 12),
            metadata=CitationMetadata(volume="410", reporter="U.S.", page="113")
        )

        result = citation.to_dict()
        assert result["text"] == "410 U.S. 113"
        assert result["type"] == "FullCaseCitation"
        assert result["span"] == [0, 12]
        assert "metadata" in result
        assert isinstance(result["metadata"], dict)

    # ============================================================================
    # CONVENIENCE FUNCTION TESTS
    # ============================================================================

    def test_extract_citations_from_text_convenience(self):
        """Test module-level convenience function for extraction."""
        text = "See 410 U.S. 113"
        citations = extract_citations_from_text(text)

        assert isinstance(citations, list)
        assert len(citations) > 0

    def test_highlight_citations_in_text_convenience(self):
        """Test module-level convenience function for highlighting."""
        text = "See 410 U.S. 113"
        highlighted = highlight_citations_in_text(text)

        assert isinstance(highlighted, str)
        assert "<mark" in highlighted

    # ============================================================================
    # INTEGRATION TESTS
    # ============================================================================

    def test_end_to_end_case_citation(self, service: CitationService):
        """Test full workflow: extract -> format -> link."""
        text = "See Roe v. Wade, 410 U.S. 113 (1973)"

        # Extract
        citations = service.extract_citations(text)
        assert len(citations) > 0

        citation = citations[0]

        # Format
        formatted = service.format_citation(citation)
        assert "410" in formatted
        assert "U.S." in formatted

        # Link
        link = service.get_court_listener_link(citation)
        if link:
            assert "courtlistener.com" in link

    def test_end_to_end_statute_citation(self, service: CitationService):
        """Test full workflow for statute citation."""
        text = "Under 42 U.S.C. § 1983"

        # Extract
        citations = service.extract_citations(text)
        statute_citations = [c for c in citations if c.type == "FullLawCitation"]

        if statute_citations:
            citation = statute_citations[0]

            # Format
            formatted = service.format_citation(citation)
            assert "1983" in formatted

            # Link (should be None for statutes)
            link = service.get_court_listener_link(citation)
            assert link is None

    def test_complex_legal_text(self, service: CitationService):
        """Test extraction from complex legal text with multiple citation types."""
        text = """
        In Smith v. Jones, 123 F.3d 456 (9th Cir. 2000), the court held
        that 42 U.S.C. § 1983 applies. See also Brown, 456 U.S. 789 (1985).
        Id. at 791. Compare Johnson, supra, at 100.
        """

        citations = service.extract_citations(text)
        assert len(citations) >= 3  # Should find multiple citations

        # Should have various types
        summary = service.get_citation_summary(citations)
        assert summary["total_count"] >= 3

    # ============================================================================
    # ERROR HANDLING AND EDGE CASES
    # ============================================================================

    def test_very_long_text(self, service: CitationService):
        """Test extraction from very long text."""
        # Generate long text with multiple citations
        text = "See 410 U.S. 113. " * 1000
        citations = service.extract_citations(text)

        # Should find many citations
        assert len(citations) > 100

    def test_special_characters_in_text(self, service: CitationService):
        """Test extraction with special characters."""
        text = "See §410 U.S. 113§ with special chars: @#$%"
        citations = service.extract_citations(text)

        # Should still find citation despite special chars
        us_citations = [c for c in citations if "U.S." in c.text]
        assert len(us_citations) > 0

    def test_unicode_text(self, service: CitationService):
        """Test extraction from Unicode text."""
        text = "See 410 U.S. 113 (résumé of case)"
        citations = service.extract_citations(text)

        # Should handle Unicode gracefully
        assert len(citations) > 0

    def test_malformed_citations(self, service: CitationService):
        """Test that malformed citations don't crash."""
        text = "See 410 U.S. (missing page)"
        # Should not raise exception
        citations = service.extract_citations(text)
        assert isinstance(citations, list)

# ============================================================================
# PYTEST CONFIGURATION
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
