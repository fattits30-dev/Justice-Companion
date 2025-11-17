"""
Example usage of LegalAPIService for UK legal research.

This script demonstrates:
1. Natural language legal searches
2. Keyword extraction
3. Legal category classification
4. Direct API access
5. Caching behavior

Run:
    python backend/services/example_legal_api_usage.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.legal_api_service import LegalAPIService


async def main():
    """Demonstrate LegalAPIService features."""

    print("=" * 80)
    print("LegalAPIService Example Usage")
    print("=" * 80)
    print()

    # Initialize service
    service = LegalAPIService(audit_logger=None)

    # =========================================================================
    # Example 1: Natural Language Search
    # =========================================================================
    print("Example 1: Natural Language Search")
    print("-" * 80)

    question = "Can I be dismissed for being pregnant?"
    print(f"Question: {question}")
    print()

    results = await service.search_legal_info(question)

    print(f"Cached: {results['cached']}")
    print(f"Found {len(results['legislation'])} legislation results")
    print(f"Found {len(results['cases'])} case law results")
    print()

    # Display legislation results
    if results["legislation"]:
        print("Legislation:")
        for i, law in enumerate(results["legislation"][:3], 1):
            print(f"  {i}. {law['title']}")
            if law.get("section"):
                print(f"     Section: {law['section']}")
            print(f"     URL: {law['url']}")
            print(f"     Relevance: {law['relevance']:.2f}")
            print()

    # Display case law results
    if results["cases"]:
        print("Case Law:")
        for i, case in enumerate(results["cases"][:3], 1):
            print(f"  {i}. {case['citation']}")
            print(f"     Court: {case['court']}")
            print(f"     Date: {case['date']}")
            print(f"     URL: {case['url']}")
            print(f"     Relevance: {case['relevance']:.2f}")
            print()

    # =========================================================================
    # Example 2: Keyword Extraction
    # =========================================================================
    print("=" * 80)
    print("Example 2: Keyword Extraction")
    print("-" * 80)

    question2 = "My landlord wants to evict me without proper notice"
    print(f"Question: {question2}")
    print()

    keywords = await service.extract_keywords(question2)

    print(f"All keywords: {keywords.all[:10]}")
    print(f"Legal terms: {keywords.legal}")
    print(f"General terms: {keywords.general}")
    print()

    # =========================================================================
    # Example 3: Category Classification
    # =========================================================================
    print("=" * 80)
    print("Example 3: Category Classification")
    print("-" * 80)

    test_questions = [
        "Can I be dismissed for being pregnant?",
        "My landlord wants to evict me",
        "I was discriminated against at work",
        "What are my consumer rights for a faulty product?",
        "I need help with child custody arrangements",
    ]

    for q in test_questions:
        category = service.classify_question(q)
        print(f"  '{q[:50]}...'")
        print(f"  → Category: {category}")
        print()

    # =========================================================================
    # Example 4: Direct API Access
    # =========================================================================
    print("=" * 80)
    print("Example 4: Direct API Access")
    print("-" * 80)

    # Search legislation only
    print("Searching legislation for 'employment rights'...")
    legislation = await service.search_legislation("employment rights")
    print(f"Found {len(legislation)} legislation results")

    if legislation:
        print(f"First result: {legislation[0]['title']}")
    print()

    # Search case law with category filtering
    print("Searching case law for 'unfair dismissal' (employment category)...")
    cases = await service.search_case_law("unfair dismissal", category="employment")
    print(f"Found {len(cases)} case law results")

    if cases:
        print(f"First result: {cases[0]['citation']}")
    print()

    # =========================================================================
    # Example 5: Caching Behavior
    # =========================================================================
    print("=" * 80)
    print("Example 5: Caching Behavior")
    print("-" * 80)

    import time

    # First search (cold)
    start = time.time()
    results1 = await service.search_legal_info("employment rights")
    duration1 = (time.time() - start) * 1000

    print(f"First search (cold): {duration1:.0f}ms")
    print(f"Cached: {results1['cached']}")
    print()

    # Second search (warm)
    start = time.time()
    results2 = await service.search_legal_info("employment rights")
    duration2 = (time.time() - start) * 1000

    print(f"Second search (warm): {duration2:.0f}ms")
    print(f"Cached: {results2['cached']}")
    print(f"Speedup: {duration1/duration2:.0f}x faster")
    print()

    # Cache info
    print(f"Cache size: {len(service.cache)} entries")
    print()

    # =========================================================================
    # Example 6: Get Specific Resources
    # =========================================================================
    print("=" * 80)
    print("Example 6: Get Specific Resources by ID")
    print("-" * 80)

    # Get specific legislation
    print("Fetching Employment Rights Act 1996...")
    legislation_xml = await service.get_legislation("ukpga/1996/18")

    if legislation_xml:
        print(f"Received XML document ({len(legislation_xml)} bytes)")
        print(f"First 100 chars: {legislation_xml[:100]}...")
    else:
        print("Not found or API unavailable")
    print()

    # =========================================================================
    # Cleanup
    # =========================================================================
    print("=" * 80)
    print("Cleanup")
    print("-" * 80)

    # Clear cache
    service.clear_cache()
    print("Cache cleared")
    print(f"Cache size: {len(service.cache)} entries")
    print()

    # Close HTTP client
    await service.close()
    print("HTTP client closed")
    print()

    print("=" * 80)
    print("Examples complete!")
    print("=" * 80)


if __name__ == "__main__":
    # Run examples
    asyncio.run(main())
