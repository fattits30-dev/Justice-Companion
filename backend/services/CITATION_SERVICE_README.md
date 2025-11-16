# CitationService - Legal Citation Extraction for Python

## Overview

`CitationService` is a Python service for extracting, parsing, and formatting legal citations from text. It has been migrated from the TypeScript `CitationService.ts` and uses the [eyecite](https://github.com/freelawproject/eyecite) library developed by Free Law Project.

## Features

- **Extract legal citations** from any text with high accuracy
- **Parse case law citations**: volume, reporter, page, year, court
- **Parse statute citations**: title, section, chapter
- **Format citations** for human-readable display
- **Highlight citations** in HTML with markup
- **Generate CourtListener links** for case citations
- **Citation summaries** with type breakdown and statistics

## Citation Types Supported

| Type | Example | Description |
|------|---------|-------------|
| `FullCaseCitation` | `410 U.S. 113 (1973)` | Full case citation with volume, reporter, page |
| `ShortCaseCitation` | `410 U.S., at 113` | Abbreviated case reference |
| `IdCitation` | `Id. at 115` | Reference to immediately preceding citation |
| `SupraCitation` | `Smith, supra, at 50` | Reference to earlier citation |
| `FullLawCitation` | `42 U.S.C. § 1983` | Statute citation with section number |

## Installation

### Requirements

- Python 3.9+
- eyecite library

```bash
pip install eyecite
```

The eyecite library will install these dependencies:
- `courts-db` - Court metadata database
- `reporters-db` - Reporter abbreviation database
- `pyahocorasick` - Fast string matching
- `lxml` - HTML/XML parsing
- `regex` - Advanced regular expressions

## Usage

### Basic Citation Extraction

```python
from backend.services.citation_service import CitationService

service = CitationService()

# Extract citations from text
text = "See Roe v. Wade, 410 U.S. 113 (1973)"
citations = service.extract_citations(text)

for citation in citations:
    print(f"Found: {citation.text}")
    print(f"Type: {citation.type}")
    print(f"Metadata: {citation.metadata.to_dict()}")
```

**Output:**
```
Found: 410 U.S. 113
Type: FullCaseCitation
Metadata: {'volume': '410', 'reporter': 'U.S.', 'page': '113', 'year': '1973', ...}
```

### Formatting Citations

```python
# Format citation for display
formatted = service.format_citation(citations[0])
print(formatted)  # "410 U.S. 113 (1973)"
```

### Highlighting Citations in HTML

```python
text = "See 410 U.S. 113 and 42 U.S.C. § 1983"
highlighted = service.highlight_citations(text)
print(highlighted)
# Output: See <mark class="legal-citation" data-citation-type="FullCaseCitation">410 U.S. 113</mark> and <mark ...>42 U.S.C. § 1983</mark>
```

### Generating CourtListener Links

```python
link = service.get_court_listener_link(citations[0])
if link:
    print(f"Search on CourtListener: {link}")
    # https://www.courtlistener.com/?q=410%20U.S.%20113
```

### Citation Summary Statistics

```python
text = """
In Roe v. Wade, 410 U.S. 113 (1973), the Court held that 42 U.S.C. § 1983
applies. See also Brown, 347 U.S. 483 (1954). Id. at 495.
"""
citations = service.extract_citations(text)
summary = service.get_citation_summary(citations)

print(f"Total: {summary['total_count']}")
print(f"By type: {summary['by_type']}")
print(f"Has case citations: {summary['has_case_citations']}")
print(f"Has statute citations: {summary['has_statute_citations']}")
```

**Output:**
```
Total: 4
By type: {'FullCaseCitation': 2, 'FullLawCitation': 1, 'IdCitation': 1}
Has case citations: True
Has statute citations: True
```

## API Reference

### Class: `CitationService`

#### `__init__()`
Initialize the citation service. Raises `ImportError` if eyecite is not installed.

#### `extract_citations(text: str, remove_ambiguous: bool = False) -> List[ExtractedCitation]`
Extract all legal citations from text.

**Parameters:**
- `text` (str): The text to parse for citations
- `remove_ambiguous` (bool): If True, remove citations with ambiguous reporter matches (default: False)

**Returns:** List of `ExtractedCitation` objects

**Example:**
```python
citations = service.extract_citations("See 410 U.S. 113")
```

#### `format_citation(citation: ExtractedCitation) -> str`
Format citation for human-readable display.

**Parameters:**
- `citation` (ExtractedCitation): The citation to format

**Returns:** Formatted citation string

**Example:**
```python
formatted = service.format_citation(citation)
# "410 U.S. 113 (1973)"
```

#### `highlight_citations(text: str) -> str`
Highlight citations in text with HTML markup.

**Parameters:**
- `text` (str): The text containing citations

**Returns:** HTML string with citations wrapped in `<mark>` tags

**Example:**
```python
highlighted = service.highlight_citations("See 410 U.S. 113")
# 'See <mark class="legal-citation" data-citation-type="FullCaseCitation">410 U.S. 113</mark>'
```

#### `get_court_listener_link(citation: ExtractedCitation) -> Optional[str]`
Generate a CourtListener search link for a case citation.

**Parameters:**
- `citation` (ExtractedCitation): The citation to link to

**Returns:** CourtListener URL or None if not a case citation

**Example:**
```python
link = service.get_court_listener_link(citation)
# "https://www.courtlistener.com/?q=410%20U.S.%20113"
```

#### `get_citation_summary(citations: List[ExtractedCitation]) -> Dict[str, Any]`
Generate summary statistics for a list of citations.

**Parameters:**
- `citations` (List[ExtractedCitation]): List of extracted citations

**Returns:** Dictionary with summary statistics

**Example:**
```python
summary = service.get_citation_summary(citations)
# {
#   'total_count': 3,
#   'by_type': {'FullCaseCitation': 2, 'FullLawCitation': 1},
#   'has_case_citations': True,
#   'has_statute_citations': True,
#   'has_reference_citations': False
# }
```

### Data Classes

#### `CitationMetadata`
Structured metadata extracted from a citation.

**Attributes:**
- `volume` (str | None): Reporter volume number
- `reporter` (str | None): Reporter abbreviation (e.g., "U.S.", "F.2d")
- `page` (str | None): Starting page number
- `year` (str | None): Year of decision
- `court` (str | None): Court abbreviation (e.g., "scotus", "ca9")
- `plaintiff` (str | None): Plaintiff name in case citation
- `defendant` (str | None): Defendant name in case citation
- `section` (str | None): Statute section number
- `chapter` (str | None): Statute chapter number
- `pin_cite` (str | None): Pinpoint citation (specific page reference)

**Methods:**
- `to_dict() -> Dict[str, Any]`: Convert to dictionary, excluding None values

#### `ExtractedCitation`
Represents a legal citation extracted from text.

**Attributes:**
- `text` (str): The matched citation text
- `type` (str): Citation type name (e.g., "FullCaseCitation")
- `span` (Tuple[int, int]): (start_index, end_index) in original text
- `metadata` (CitationMetadata): Structured metadata

**Methods:**
- `to_dict() -> Dict[str, Any]`: Convert to dictionary for JSON serialization

## Convenience Functions

### `extract_citations_from_text(text: str) -> List[ExtractedCitation]`
Extract citations without instantiating service.

```python
from backend.services.citation_service import extract_citations_from_text

citations = extract_citations_from_text("See 410 U.S. 113")
```

### `highlight_citations_in_text(text: str) -> str`
Highlight citations without instantiating service.

```python
from backend.services.citation_service import highlight_citations_in_text

html = highlight_citations_in_text("See 410 U.S. 113")
```

## Testing

### Run the Demo Script

```bash
cd backend/services
python demo_citation_service.py
```

This will run comprehensive tests demonstrating all features.

### Run Unit Tests

```bash
# Install pytest if not already installed
pip install pytest pytest-cov

# Run tests
pytest backend/services/test_citation_service.py -v

# Run with coverage
pytest backend/services/test_citation_service.py --cov=backend.services.citation_service --cov-report=term-missing
```

## Migration from TypeScript

This service has been migrated from `src/services/CitationService.ts`. Key differences:

| TypeScript | Python | Notes |
|------------|--------|-------|
| `@beshkenadze/eyecite` | `eyecite` | Original Python library (not JS port) |
| `getCitations()` | `get_citations()` | Snake case naming |
| `citation.span()` | `citation.span()` | Same API |
| `citation.groups.volume` | `citation.groups['volume']` | Dict access, not object attributes |
| Static class methods | Instance methods | Python convention |

## Performance

The eyecite library is highly optimized:
- Uses Aho-Corasick algorithm for fast pattern matching
- Can process millions of citations per hour
- Minimal memory footprint
- No external API calls required

## Integration with Justice Companion

This service is a **stateless utility** - no database operations or user authentication required. It can be used:

1. **In chat service**: Extract citations from AI-generated legal analysis
2. **In document processing**: Parse uploaded legal documents
3. **In case notes**: Highlight citations in user notes
4. **In search**: Find documents containing specific citations

## Troubleshooting

### ImportError: No module named 'eyecite'

**Solution:** Install eyecite
```bash
pip install eyecite
```

### Citations not being extracted

**Possible causes:**
1. Text has no valid citations
2. Citations are in non-standard format
3. eyecite's regex patterns don't match the format

**Debug:**
```python
from eyecite import get_citations
citations = get_citations("your text here")
print(f"Found {len(citations)} raw citations")
```

### Metadata extraction returns None values

**Cause:** eyecite may not extract all metadata for all citation types.

**Solution:** Check `citation.groups` and `citation.metadata` directly:
```python
citation = citations[0]
print("Groups:", citation.groups)
print("Metadata:", citation.metadata)
```

## Resources

- **eyecite Documentation**: https://github.com/freelawproject/eyecite
- **Free Law Project**: https://free.law/
- **CourtListener**: https://www.courtlistener.com/
- **Reporters Database**: https://github.com/freelawproject/reporters-db
- **Courts Database**: https://github.com/freelawproject/courts-db

## License

This service is part of Justice Companion. The eyecite library is licensed under BSD-2-Clause by Free Law Project.

## Author

Migrated from TypeScript to Python for Justice Companion backend integration.

## Version

Current version: 1.0.0 (2024)

Last updated: 2025-01-13
