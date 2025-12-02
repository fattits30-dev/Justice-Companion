"""
Legal API Routes - UK Legal Information Search

Exposes LegalAPIService for searching:
- legislation.gov.uk (UK statutes, regulations)
- Find Case Law API (tribunal decisions, court judgments)

Endpoints:
- GET /legal/search?query=... - Search all legal sources
- GET /legal/legislation?query=... - Search legislation only
- GET /legal/cases?query=...&category=... - Search case law only
- GET /legal/suggest?caseType=... - Get suggested legislation for case type
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.dependencies import get_current_user_id
from backend.services.legal_api_service import LegalAPIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/legal", tags=["legal"])

# Singleton service instance
_legal_service: Optional[LegalAPIService] = None


def get_legal_service() -> LegalAPIService:
    """Get or create LegalAPIService singleton."""
    global _legal_service
    if _legal_service is None:
        _legal_service = LegalAPIService()
    return _legal_service


# Mapping of case types to relevant legislation search terms
CASE_TYPE_LEGISLATION_MAP = {
    "employment": [
        "Employment Rights Act 1996",
        "Equality Act 2010",
        "Employment Tribunals Act 1996",
        "Trade Union and Labour Relations",
        "Working Time Regulations",
        "National Minimum Wage Act",
    ],
    "housing": [
        "Housing Act 1988",
        "Housing Act 2004",
        "Landlord and Tenant Act",
        "Protection from Eviction Act",
        "Rent Act 1977",
        "Deregulation Act 2015",
    ],
    "consumer": [
        "Consumer Rights Act 2015",
        "Consumer Protection Act",
        "Sale of Goods Act",
        "Supply of Goods and Services Act",
        "Consumer Credit Act",
    ],
    "family": [
        "Children Act 1989",
        "Family Law Act 1996",
        "Matrimonial Causes Act 1973",
        "Child Support Act 1991",
        "Adoption and Children Act",
    ],
    "discrimination": [
        "Equality Act 2010",
        "Human Rights Act 1998",
        "Race Relations Act",
        "Sex Discrimination Act",
        "Disability Discrimination Act",
    ],
    "debt": [
        "Consumer Credit Act 1974",
        "Limitation Act 1980",
        "Insolvency Act 1986",
        "Tribunals Courts and Enforcement Act",
    ],
}


@router.get("/search")
async def search_legal_info(
    query: str = Query(..., min_length=3, description="Search query"),
    user_id: int = Depends(get_current_user_id),
):
    """
    Search all legal sources (legislation + case law).
    
    Returns combined results from legislation.gov.uk and Find Case Law API.
    Results are cached for 24 hours.
    """
    try:
        service = get_legal_service()
        results = await service.search_legal_info(query)
        
        return {
            "success": True,
            "data": results,
        }
    except Exception as e:
        logger.error(f"Legal search error: {e}", extra={"query": query, "user_id": user_id})
        raise HTTPException(status_code=500, detail=f"Legal search failed: {str(e)}")


@router.get("/legislation")
async def search_legislation(
    query: str = Query(..., min_length=3, description="Search query"),
    user_id: int = Depends(get_current_user_id),
):
    """
    Search UK legislation only.
    
    Queries legislation.gov.uk for statutes, regulations, and statutory instruments.
    """
    try:
        service = get_legal_service()
        results = await service.search_legislation(query)
        
        return {
            "success": True,
            "data": {
                "legislation": results,
                "query": query,
            },
        }
    except Exception as e:
        logger.error(f"Legislation search error: {e}", extra={"query": query})
        raise HTTPException(status_code=500, detail=f"Legislation search failed: {str(e)}")


@router.get("/cases")
async def search_case_law(
    query: str = Query(..., min_length=3, description="Search query"),
    category: Optional[str] = Query(None, description="Legal category for court filtering"),
    user_id: int = Depends(get_current_user_id),
):
    """
    Search UK case law only.
    
    Queries Find Case Law API for tribunal decisions and court judgments.
    Category can be: employment, housing, consumer, family, discrimination, debt
    """
    try:
        service = get_legal_service()
        results = await service.search_case_law(query, category)
        
        return {
            "success": True,
            "data": {
                "cases": results,
                "query": query,
                "category": category,
            },
        }
    except Exception as e:
        logger.error(f"Case law search error: {e}", extra={"query": query, "category": category})
        raise HTTPException(status_code=500, detail=f"Case law search failed: {str(e)}")


@router.get("/suggest")
async def suggest_for_case_type(
    case_type: str = Query(..., description="Case type (employment, housing, consumer, family, debt)"),
    user_id: int = Depends(get_current_user_id),
):
    """
    Get suggested legislation and case law for a case type.
    
    Returns relevant statutes and recent tribunal decisions based on case type.
    """
    try:
        service = get_legal_service()
        
        # Get suggested search terms for this case type
        search_terms = CASE_TYPE_LEGISLATION_MAP.get(case_type.lower(), [])
        
        if not search_terms:
            return {
                "success": True,
                "data": {
                    "legislation": [],
                    "cases": [],
                    "caseType": case_type,
                    "message": f"No specific suggestions for case type: {case_type}",
                },
            }
        
        # Search for each relevant piece of legislation
        all_legislation = []
        all_cases = []
        
        for term in search_terms[:3]:  # Limit to top 3 to avoid rate limiting
            try:
                results = await service.search_legal_info(term)
                all_legislation.extend(results.get("legislation", []))
                all_cases.extend(results.get("cases", []))
            except Exception as term_error:
                logger.warning(f"Failed to search for term '{term}': {term_error}")
                continue
        
        # Deduplicate by URL
        seen_urls = set()
        unique_legislation = []
        for item in all_legislation:
            url = item.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_legislation.append(item)
        
        seen_case_urls = set()
        unique_cases = []
        for item in all_cases:
            url = item.get("url", "")
            if url and url not in seen_case_urls:
                seen_case_urls.add(url)
                unique_cases.append(item)
        
        return {
            "success": True,
            "data": {
                "legislation": unique_legislation[:10],  # Top 10
                "cases": unique_cases[:10],  # Top 10
                "caseType": case_type,
                "searchTerms": search_terms,
            },
        }
    except Exception as e:
        logger.error(f"Legal suggestion error: {e}", extra={"case_type": case_type})
        raise HTTPException(status_code=500, detail=f"Legal suggestion failed: {str(e)}")


@router.get("/classify")
async def classify_question(
    question: str = Query(..., min_length=10, description="Legal question to classify"),
    user_id: int = Depends(get_current_user_id),
):
    """
    Classify a legal question into a category.
    
    Returns the detected legal category (employment, housing, etc.)
    and extracted keywords.
    """
    try:
        service = get_legal_service()
        
        category = service.classify_question(question)
        keywords = await service.extract_keywords(question)
        
        return {
            "success": True,
            "data": {
                "category": category,
                "keywords": {
                    "all": keywords.all,
                    "legal": keywords.legal,
                    "general": keywords.general,
                },
                "question": question,
            },
        }
    except Exception as e:
        logger.error(f"Classification error: {e}", extra={"question": question[:100]})
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
