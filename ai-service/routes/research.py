"""
Research Routes
===============
Legal research endpoints - UK legislation and case law.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
import httpx


router = APIRouter()


class ResearchArea(str, Enum):
    EMPLOYMENT = "employment"
    HOUSING = "housing"
    BENEFITS = "benefits"
    DISCRIMINATION = "discrimination"
    CONSUMER = "consumer"
    GENERAL = "general"


class LegislationResult(BaseModel):
    """UK legislation search result"""
    title: str
    year: int
    section: Optional[str] = None
    url: str
    summary: str
    relevance_score: float


class CaseLawResult(BaseModel):
    """Case law search result"""
    case_name: str
    citation: str
    court: str
    date: str
    summary: str
    url: Optional[str] = None
    relevance_score: float


class ResearchRequest(BaseModel):
    """Legal research request"""
    query: str = Field(..., min_length=3)
    area: Optional[ResearchArea] = None
    include_legislation: bool = True
    include_case_law: bool = True
    max_results: int = Field(default=10, le=20)


class ResearchResponse(BaseModel):
    """Combined research results"""
    query: str
    legislation: List[LegislationResult]
    case_law: List[CaseLawResult]
    ai_summary: str
    search_tips: List[str]


@router.post("/search", response_model=ResearchResponse)
async def search_legal_resources(request: ResearchRequest, req: Request):
    """
    Search UK legal resources.
    
    Searches:
    - legislation.gov.uk for Acts and Regulations
    - National Archives for case law
    - Provides AI-generated summary of findings
    """
    hf_client = req.app.state.hf_client
    
    legislation_results = []
    case_law_results = []
    
    # Search legislation
    if request.include_legislation:
        legislation_results = await search_legislation(
            request.query, 
            request.area,
            request.max_results
        )
    
    # Search case law
    if request.include_case_law:
        case_law_results = await search_case_law(
            request.query,
            request.area,
            request.max_results
        )
    
    # Generate AI summary of findings
    summary_prompt = f"""Summarize these UK legal research findings for: "{request.query}"

LEGISLATION FOUND:
{format_legislation_for_summary(legislation_results)}

CASE LAW FOUND:
{format_case_law_for_summary(case_law_results)}

Provide:
1. Brief overview of relevant law
2. Key points to understand
3. How these might apply to the query

Keep it concise and practical."""

    try:
        ai_response = await hf_client.chat(
            messages=[{"role": "user", "content": summary_prompt}],
            model_key="chat_fast",
        )
        ai_summary = ai_response["content"]
    except Exception as e:
        ai_summary = f"Summary generation failed: {str(e)}"
    
    return ResearchResponse(
        query=request.query,
        legislation=legislation_results,
        case_law=case_law_results,
        ai_summary=ai_summary,
        search_tips=get_search_tips(request.area),
    )


@router.get("/legislation/{act_id}")
async def get_legislation_detail(act_id: str):
    """
    Get detailed information about specific legislation.
    
    Returns full text and structure from legislation.gov.uk
    """
    url = f"https://www.legislation.gov.uk/id/{act_id}/data.json"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Legislation not found: {act_id}"
                )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Legislation API timeout")


@router.get("/deadline-calculator")
async def calculate_deadline(
    incident_date: str,
    case_type: ResearchArea,
    req: Request = None
):
    """
    Calculate relevant limitation periods.
    
    UK-specific deadlines:
    - Employment Tribunal: 3 months less 1 day
    - Small Claims: 6 years
    - Housing disrepair: varies
    """
    from datetime import datetime, timedelta
    
    try:
        date = datetime.fromisoformat(incident_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    deadlines = {}
    
    if case_type == ResearchArea.EMPLOYMENT:
        # ACAS Early Conciliation + Tribunal
        acas_deadline = date + timedelta(days=90) - timedelta(days=1)
        deadlines["acas_notification"] = acas_deadline.isoformat()
        deadlines["tribunal_claim"] = (acas_deadline + timedelta(days=42)).isoformat()
        deadlines["note"] = "Contact ACAS first for Early Conciliation"
        
    elif case_type == ResearchArea.HOUSING:
        deadlines["disrepair_notice"] = (date + timedelta(days=28)).isoformat()
        deadlines["note"] = "Give landlord reasonable notice first"
        
    elif case_type == ResearchArea.BENEFITS:
        # Mandatory reconsideration
        deadlines["mandatory_recon"] = (date + timedelta(days=30)).isoformat()
        deadlines["appeal"] = (date + timedelta(days=30) + timedelta(days=30)).isoformat()
        deadlines["note"] = "Request mandatory reconsideration before appealing"
        
    elif case_type == ResearchArea.CONSUMER:
        deadlines["initial_complaint"] = (date + timedelta(days=30)).isoformat()
        deadlines["small_claims"] = (date + timedelta(days=365*6)).isoformat()
        deadlines["note"] = "Try to resolve directly first"
    
    return {
        "incident_date": incident_date,
        "case_type": case_type.value,
        "deadlines": deadlines,
        "disclaimer": "These are general guidelines. Consult a solicitor for specific advice."
    }


# ==========================================
# HELPER FUNCTIONS - API INTEGRATIONS
# ==========================================

async def search_legislation(
    query: str,
    area: Optional[ResearchArea],
    max_results: int
) -> List[LegislationResult]:
    """Search legislation.gov.uk API"""
    
    # Build search URL
    base_url = "https://www.legislation.gov.uk/search"
    params = {
        "text": query,
        "results-count": min(max_results, 20),
    }
    
    # Add area-specific filters
    if area:
        area_keywords = {
            ResearchArea.EMPLOYMENT: ["employment", "work", "redundancy"],
            ResearchArea.HOUSING: ["housing", "landlord", "tenant", "rent"],
            ResearchArea.BENEFITS: ["welfare", "social security", "universal credit"],
            ResearchArea.DISCRIMINATION: ["equality", "discrimination"],
            ResearchArea.CONSUMER: ["consumer", "sale of goods", "services"],
        }
        if area in area_keywords:
            params["text"] = f"{query} {' '.join(area_keywords[area][:2])}"
    
    results = []
    
    async with httpx.AsyncClient() as client:
        try:
            # Use JSON feed
            response = await client.get(
                f"{base_url}.json",
                params=params,
                timeout=15.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                items = data.get("results", [])[:max_results]
                
                for item in items:
                    results.append(LegislationResult(
                        title=item.get("title", "Unknown"),
                        year=item.get("year", 0),
                        section=item.get("section"),
                        url=item.get("url", ""),
                        summary=item.get("excerpt", "No summary available"),
                        relevance_score=0.8,
                    ))
        except Exception as e:
            print(f"Legislation search error: {e}")
    
    # Return mock results if API fails (for development)
    if not results:
        results = get_mock_legislation(query, area)
    
    return results


async def search_case_law(
    query: str,
    area: Optional[ResearchArea],
    max_results: int
) -> List[CaseLawResult]:
    """Search Find Case Law (National Archives)"""
    
    # Find Case Law API
    base_url = "https://caselaw.nationalarchives.gov.uk/api/search"
    
    results = []
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                base_url,
                params={
                    "query": query,
                    "per_page": max_results,
                },
                timeout=15.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                items = data.get("results", [])[:max_results]
                
                for item in items:
                    results.append(CaseLawResult(
                        case_name=item.get("name", "Unknown"),
                        citation=item.get("citation", ""),
                        court=item.get("court", ""),
                        date=item.get("date", ""),
                        summary=item.get("summary", "No summary available"),
                        url=item.get("url"),
                        relevance_score=0.75,
                    ))
        except Exception as e:
            print(f"Case law search error: {e}")
    
    # Return mock results if API fails
    if not results:
        results = get_mock_case_law(query, area)
    
    return results


def get_mock_legislation(query: str, area: Optional[ResearchArea]) -> List[LegislationResult]:
    """Mock legislation results for development/offline"""
    
    mock_data = {
        ResearchArea.EMPLOYMENT: [
            LegislationResult(
                title="Employment Rights Act 1996",
                year=1996,
                section="Part X - Unfair Dismissal",
                url="https://www.legislation.gov.uk/ukpga/1996/18",
                summary="Primary legislation covering unfair dismissal, redundancy, and employment rights.",
                relevance_score=0.95,
            ),
            LegislationResult(
                title="Equality Act 2010",
                year=2010,
                url="https://www.legislation.gov.uk/ukpga/2010/15",
                summary="Covers discrimination in employment on protected characteristics.",
                relevance_score=0.85,
            ),
        ],
        ResearchArea.HOUSING: [
            LegislationResult(
                title="Housing Act 1988",
                year=1988,
                url="https://www.legislation.gov.uk/ukpga/1988/50",
                summary="Governs assured shorthold tenancies and landlord rights.",
                relevance_score=0.9,
            ),
            LegislationResult(
                title="Landlord and Tenant Act 1985",
                year=1985,
                url="https://www.legislation.gov.uk/ukpga/1985/70",
                summary="Covers landlord repair obligations and tenant rights.",
                relevance_score=0.85,
            ),
        ],
        ResearchArea.BENEFITS: [
            LegislationResult(
                title="Welfare Reform Act 2012",
                year=2012,
                url="https://www.legislation.gov.uk/ukpga/2012/5",
                summary="Introduced Universal Credit and reformed benefits system.",
                relevance_score=0.9,
            ),
        ],
    }
    
    return mock_data.get(area, mock_data[ResearchArea.EMPLOYMENT])[:3]


def get_mock_case_law(query: str, area: Optional[ResearchArea]) -> List[CaseLawResult]:
    """Mock case law results for development/offline"""
    
    mock_data = {
        ResearchArea.EMPLOYMENT: [
            CaseLawResult(
                case_name="British Home Stores v Burchell",
                citation="[1978] IRLR 379",
                court="Employment Appeal Tribunal",
                date="1978",
                summary="Established the test for fair dismissal in misconduct cases.",
                relevance_score=0.9,
            ),
            CaseLawResult(
                case_name="Polkey v AE Dayton Services Ltd",
                citation="[1987] UKHL 8",
                court="House of Lords",
                date="1987",
                summary="Procedural fairness required even if dismissal would have occurred anyway.",
                relevance_score=0.85,
            ),
        ],
    }
    
    return mock_data.get(area, mock_data[ResearchArea.EMPLOYMENT])[:3]


def format_legislation_for_summary(results: List[LegislationResult]) -> str:
    """Format legislation results for AI summary"""
    if not results:
        return "No legislation found."
    
    lines = []
    for r in results[:5]:
        lines.append(f"- {r.title} ({r.year}): {r.summary}")
    return "\n".join(lines)


def format_case_law_for_summary(results: List[CaseLawResult]) -> str:
    """Format case law results for AI summary"""
    if not results:
        return "No case law found."
    
    lines = []
    for r in results[:5]:
        lines.append(f"- {r.case_name} {r.citation}: {r.summary}")
    return "\n".join(lines)


def get_search_tips(area: Optional[ResearchArea]) -> List[str]:
    """Get search tips for area"""
    common = [
        "Use specific legal terms for better results",
        "Include relevant dates or time periods",
        "Try searching for the specific Act or regulation name",
    ]
    
    area_tips = {
        ResearchArea.EMPLOYMENT: [
            "Search for 'unfair dismissal' or 'constructive dismissal'",
            "Include 'ACAS' for workplace dispute guidance",
            "Try 'Employment Tribunal' for procedural information",
        ],
        ResearchArea.HOUSING: [
            "Search for 'Section 21' or 'Section 8' for eviction rules",
            "Include 'disrepair' for landlord obligation cases",
            "Try 'assured shorthold tenancy' for tenancy rights",
        ],
        ResearchArea.BENEFITS: [
            "Search for 'mandatory reconsideration' for appeal process",
            "Include 'DWP' for Department for Work and Pensions guidance",
            "Try 'PIP' or 'Universal Credit' for specific benefit types",
        ],
    }
    
    return common + area_tips.get(area, [])
