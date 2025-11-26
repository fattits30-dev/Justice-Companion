"""
Analysis Routes
===============
Case and evidence analysis endpoints.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


router = APIRouter()


class CaseType(str, Enum):
    EMPLOYMENT = "employment"
    HOUSING = "housing"
    BENEFITS = "benefits"
    DISCRIMINATION = "discrimination"
    CONSUMER = "consumer"
    OTHER = "other"


class CaseStrength(str, Enum):
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"
    UNCLEAR = "unclear"


class LegalIssue(BaseModel):
    """Identified legal issue"""
    issue: str
    description: str
    relevant_law: Optional[str] = None
    urgency: str = "normal"


class CaseAnalysisRequest(BaseModel):
    """Request for case analysis"""
    description: str = Field(..., min_length=50)
    case_type: Optional[CaseType] = None
    documents_summary: Optional[str] = None
    timeline_summary: Optional[str] = None


class CaseAnalysisResponse(BaseModel):
    """Comprehensive case analysis"""
    case_type: CaseType
    strength_assessment: CaseStrength
    legal_issues: List[LegalIssue]
    applicable_laws: List[str]
    recommended_actions: List[str]
    critical_deadlines: List[str]
    evidence_gaps: List[str]
    disclaimer: str


class EvidenceStrengthRequest(BaseModel):
    """Request to assess evidence strength"""
    case_id: int
    evidence_descriptions: List[str]
    case_type: CaseType


class EvidenceStrengthResponse(BaseModel):
    """Evidence strength assessment"""
    overall_strength: CaseStrength
    individual_assessments: List[dict]
    gaps_identified: List[str]
    recommendations: List[str]


@router.post("/case", response_model=CaseAnalysisResponse)
async def analyze_case(request: CaseAnalysisRequest, req: Request):
    """
    Comprehensive case analysis.
    
    Analyzes case facts and provides:
    - Legal issue identification
    - Strength assessment
    - Applicable UK legislation
    - Recommended next steps
    - Critical deadlines
    """
    hf_client = req.app.state.hf_client
    
    prompt = f"""You are a legal information assistant helping analyze a UK legal case.

CASE DESCRIPTION:
{request.description}

{f"CASE TYPE: {request.case_type.value}" if request.case_type else ""}
{f"DOCUMENTS: {request.documents_summary}" if request.documents_summary else ""}
{f"TIMELINE: {request.timeline_summary}" if request.timeline_summary else ""}

Analyze this case and provide a structured assessment:

1. CASE CLASSIFICATION
What type of legal case is this? (employment/housing/benefits/discrimination/consumer/other)

2. STRENGTH ASSESSMENT  
How strong is this case? (weak/moderate/strong/unclear)
Explain your reasoning.

3. LEGAL ISSUES (list each)
- Issue name
- Brief description
- Relevant UK law/regulation
- Urgency level

4. APPLICABLE LAWS
List specific UK legislation that applies:
- Act name and relevant sections
- How it applies to this case

5. RECOMMENDED ACTIONS (prioritized list)
What should this person do next?

6. CRITICAL DEADLINES
What time limits apply? Be specific about UK limitation periods:
- Employment Tribunal: 3 months less 1 day from incident
- Small Claims: 6 years for contracts
- Housing disrepair: Reasonable notice periods

7. EVIDENCE GAPS
What evidence would strengthen this case?

IMPORTANT: This is legal INFORMATION, not legal ADVICE. Always recommend consulting a solicitor."""

    try:
        response = await hf_client.chat(
            messages=[{"role": "user", "content": prompt}],
            model_key="chat_complex",
            max_tokens=3000,
        )
        
        # Parse response (simplified - would use structured output)
        content = response["content"]
        
        return CaseAnalysisResponse(
            case_type=request.case_type or detect_case_type(content),
            strength_assessment=detect_strength(content),
            legal_issues=extract_legal_issues(content),
            applicable_laws=extract_laws(content),
            recommended_actions=extract_recommendations(content),
            critical_deadlines=extract_deadlines(content),
            evidence_gaps=extract_evidence_gaps(content),
            disclaimer="This analysis is for informational purposes only. It does not constitute legal advice. Please consult a qualified solicitor."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/evidence-strength", response_model=EvidenceStrengthResponse)
async def assess_evidence_strength(request: EvidenceStrengthRequest, req: Request):
    """
    Assess the strength of collected evidence.
    """
    hf_client = req.app.state.hf_client
    
    evidence_list = "\n".join([f"- {e}" for e in request.evidence_descriptions])
    
    prompt = f"""Assess the evidence strength for a UK {request.case_type.value} case.

EVIDENCE COLLECTED:
{evidence_list}

For each piece of evidence, assess:
1. Relevance (how relevant to the case)
2. Weight (how persuasive)
3. Admissibility concerns

Then provide:
- Overall evidence strength (weak/moderate/strong)
- Gaps in evidence
- Recommendations for strengthening the case"""

    try:
        response = await hf_client.chat(
            messages=[{"role": "user", "content": prompt}],
            model_key="chat_primary",
        )
        
        return EvidenceStrengthResponse(
            overall_strength=detect_strength(response["content"]),
            individual_assessments=[],  # Would parse from response
            gaps_identified=extract_evidence_gaps(response["content"]),
            recommendations=extract_recommendations(response["content"]),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evidence assessment failed: {str(e)}")


@router.post("/timeline-analysis")
async def analyze_timeline(
    events: List[dict],
    case_type: CaseType,
    req: Request
):
    """
    Analyze case timeline for legal implications.
    
    Identifies:
    - Limitation period concerns
    - Cause and effect relationships
    - Missing events
    """
    hf_client = req.app.state.hf_client
    
    events_text = "\n".join([
        f"- {e.get('date', 'Unknown date')}: {e.get('description', '')}"
        for e in events
    ])
    
    prompt = f"""Analyze this timeline for a UK {case_type.value} case:

EVENTS:
{events_text}

Assess:
1. Are there any limitation period concerns?
2. What is the cause-and-effect chain?
3. Are there gaps in the timeline?
4. What events might be missing?
5. Which events are most legally significant?"""

    try:
        response = await hf_client.chat(
            messages=[{"role": "user", "content": prompt}],
            model_key="chat_primary",
        )
        
        return {
            "analysis": response["content"],
            "events_analyzed": len(events),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timeline analysis failed: {str(e)}")


# Helper functions

def detect_case_type(text: str) -> CaseType:
    """Detect case type from analysis text"""
    text_lower = text.lower()
    if "employment" in text_lower or "workplace" in text_lower:
        return CaseType.EMPLOYMENT
    elif "housing" in text_lower or "tenant" in text_lower or "landlord" in text_lower:
        return CaseType.HOUSING
    elif "benefit" in text_lower or "universal credit" in text_lower or "dwp" in text_lower:
        return CaseType.BENEFITS
    elif "discrimination" in text_lower or "equality act" in text_lower:
        return CaseType.DISCRIMINATION
    elif "consumer" in text_lower or "refund" in text_lower or "product" in text_lower:
        return CaseType.CONSUMER
    return CaseType.OTHER


def detect_strength(text: str) -> CaseStrength:
    """Detect case strength from text"""
    text_lower = text.lower()
    if "strong case" in text_lower or "strength: strong" in text_lower:
        return CaseStrength.STRONG
    elif "weak case" in text_lower or "strength: weak" in text_lower:
        return CaseStrength.WEAK
    elif "moderate" in text_lower:
        return CaseStrength.MODERATE
    return CaseStrength.UNCLEAR


def extract_legal_issues(text: str) -> List[LegalIssue]:
    """Extract legal issues from analysis"""
    # Simplified - would use structured output
    return [LegalIssue(
        issue="See full analysis",
        description="Detailed issues identified in the analysis above",
    )]


def extract_laws(text: str) -> List[str]:
    """Extract mentioned laws"""
    import re
    laws = []
    patterns = [
        r'(?:Employment Rights Act \d{4})',
        r'(?:Equality Act \d{4})',
        r'(?:Housing Act \d{4})',
        r'(?:Consumer Rights Act \d{4})',
        r'(?:ACAS [A-Za-z ]+)',
    ]
    for pattern in patterns:
        matches = re.findall(pattern, text)
        laws.extend(matches)
    return list(set(laws))


def extract_recommendations(text: str) -> List[str]:
    """Extract recommendations from text"""
    recs = []
    lines = text.split('\n')
    in_rec_section = False
    for line in lines:
        if "RECOMMEND" in line.upper() or "ACTION" in line.upper():
            in_rec_section = True
            continue
        if in_rec_section and line.strip().startswith(('-', '•', '*', '1', '2', '3')):
            recs.append(line.strip().lstrip('-•*0123456789. '))
        if len(recs) >= 10:
            break
    return recs


def extract_deadlines(text: str) -> List[str]:
    """Extract deadline information"""
    deadlines = []
    lines = text.split('\n')
    for line in lines:
        if any(kw in line.lower() for kw in ['deadline', 'time limit', 'limitation', 'within', 'days', 'months']):
            if line.strip():
                deadlines.append(line.strip().lstrip('-•*0123456789. '))
    return deadlines[:5]


def extract_evidence_gaps(text: str) -> List[str]:
    """Extract evidence gap information"""
    gaps = []
    lines = text.split('\n')
    in_gaps_section = False
    for line in lines:
        if "GAP" in line.upper() or "MISSING" in line.upper():
            in_gaps_section = True
            continue
        if in_gaps_section and line.strip().startswith(('-', '•', '*')):
            gaps.append(line.strip().lstrip('-•* '))
        if len(gaps) >= 5:
            break
    return gaps
