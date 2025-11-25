"""
Type stubs for eyecite library.

This stub provides minimal type information for eyecite citation extraction
to avoid mypy errors when the library is not installed.

Citation parsing requires the eyecite library:
    pip install eyecite
"""

# Minimal stub definitions for common eyecite usage
class CitationBase:
    def __init__(self, *args, **kwargs):
        ...

    text: str
    type: str
    span: tuple[int, int]
    metadata: dict

class FullCaseCitation(CitationBase):
    pass

class FullLawCitation(CitationBase):
    pass

def extract_citations(text: str) -> list[CitationBase]:
    """Extract legal citations from text."""
    return []

class CitationExtractor:
    def extract_citations(self, text: str) -> list[CitationBase]:
        return []

    def get_citation_summary(self, citations: list[CitationBase]) -> dict:
        return {}

__all__ = ['CitationBase', 'FullCaseCitation', 'FullLawCitation', 'extract_citations', 'CitationExtractor']
