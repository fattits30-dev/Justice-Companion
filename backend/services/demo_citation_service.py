#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Standalone demo of CitationService.
Run this file directly to test citation extraction functionality.
"""

import sys
import io

# Fix Windows console encoding for Unicode characters
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from citation_service import CitationService


def main():
    print("=" * 70)
    print(" CitationService Demo - Legal Citation Extraction")
    print("=" * 70)

    service = CitationService()
    print("[OK] Service initialized successfully\n")

    tests = [
        {"name": "U.S. Supreme Court citation", "text": "See 410 U.S. 113", "show_details": True},
        {
            "name": "Full case name with year",
            "text": "Roe v. Wade, 410 U.S. 113 (1973)",
            "show_details": True,
        },
        {
            "name": "Federal statute (U.S. Code)",
            "text": "Under 42 U.S.C. § 1983, plaintiffs may sue state officials",
            "show_details": True,
        },
        {
            "name": "Multiple citations",
            "text": "Compare 410 U.S. 113 with 505 U.S. 833 and see 42 U.S.C. § 1983",
            "show_details": False,
        },
        {
            "name": "Federal Circuit Court",
            "text": "In Smith v. Jones, 123 F.3d 456 (9th Cir. 2000)",
            "show_details": True,
        },
    ]

    for i, test in enumerate(tests, 1):
        print(f"\n{'─'*70}")
        print(f"Test {i}: {test['name']}")
        print(f"{'─'*70}")
        print(f"Input: {test['text']}")
        print()

        citations = service.extract_citations(test["text"])
        print(f"Found: {len(citations)} citation(s)")

        if citations and test["show_details"]:
            for j, c in enumerate(citations, 1):
                print(f"\n  Citation {j}:")
                print(f"    Text: {c.text}")
                print(f"    Type: {c.type}")
                print(f"    Span: {c.span}")

                metadata = c.metadata.to_dict()
                if metadata:
                    print(f"    Metadata:")
                    for key, value in metadata.items():
                        print(f"      {key}: {value}")

                formatted = service.format_citation(c)
                print(f"    Formatted: {formatted}")

                link = service.get_court_listener_link(c)
                if link:
                    print(f"    CourtListener: {link}")

    # Test highlighting
    print(f"\n{'─'*70}")
    print("HTML Highlighting Demo")
    print(f"{'─'*70}")
    text = "See 410 U.S. 113 and 505 U.S. 833"
    highlighted = service.highlight_citations(text)
    print(f"Input: {text}")
    print(f"Output:\n{highlighted}")

    # Test citation summary
    print(f"\n{'─'*70}")
    print("Citation Summary Demo")
    print(f"{'─'*70}")
    complex_text = """
    In Roe v. Wade, 410 U.S. 113 (1973), the Court held that 42 U.S.C. § 1983
    applies to state actors. See also Brown v. Board of Education, 347 U.S. 483 (1954).
    Id. at 495. Compare Smith, supra, at 100 with Jones v. Smith, 123 F.3d 456 (9th Cir. 2000).
    """
    citations = service.extract_citations(complex_text)
    summary = service.get_citation_summary(citations)

    print(f"Total citations found: {summary['total_count']}")
    print(f"\nBreakdown by type:")
    for cite_type, count in summary["by_type"].items():
        print(f"  {cite_type}: {count}")

    print(f"\nCategories:")
    print(f"  Has case citations: {summary['has_case_citations']}")
    print(f"  Has statute citations: {summary['has_statute_citations']}")
    print(f"  Has reference citations: {summary['has_reference_citations']}")

    # Edge cases
    print(f"\n{'─'*70}")
    print("Edge Cases")
    print(f"{'─'*70}")
    edge_cases = [
        ("Empty string", ""),
        ("Whitespace only", "   "),
        ("No citations", "This text has no legal citations in it."),
        ("HTML input", "<p>See <strong>410 U.S. 113</strong></p>"),
    ]

    for name, text in edge_cases:
        citations = service.extract_citations(text)
        print(f"{name}: {len(citations)} citation(s)")

    print(f"\n{'='*70}")
    print("[OK] All tests completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except ImportError as e:
        print(f"Error: {e}")
        print("\nPlease install eyecite:")
        print("  pip install eyecite")
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback

        traceback.print_exc()
