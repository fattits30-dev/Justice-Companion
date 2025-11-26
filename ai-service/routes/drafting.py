"""
Drafting Routes
===============
Legal document drafting assistance.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


router = APIRouter()


class LetterType(str, Enum):
    GRIEVANCE = "grievance"
    APPEAL = "appeal"
    COMPLAINT = "complaint"
    SUBJECT_ACCESS = "subject_access_request"
    RESPONSE = "response"
    WITNESS_STATEMENT = "witness_statement"
    TIMELINE = "timeline"


class DraftRequest(BaseModel):
    """Letter drafting request"""
    letter_type: LetterType
    recipient: str
    subject: str
    key_points: List[str]
    tone: str = Field(default="formal", description="formal|firm|conciliatory")
    case_context: Optional[str] = None
    include_legal_refs: bool = True


class DraftResponse(BaseModel):
    """Generated draft"""
    content: str
    word_count: int
    letter_type: LetterType
    suggestions: List[str]
    disclaimer: str


@router.post("/letter", response_model=DraftResponse)
async def draft_letter(request: DraftRequest, req: Request):
    """
    Generate a draft legal letter.
    
    Types supported:
    - Grievance letters (employment)
    - Appeal letters (benefits, decisions)
    - Complaint letters (services, consumer)
    - Subject Access Requests (GDPR)
    - Response letters
    """
    hf_client = req.app.state.hf_client
    
    points_text = "\n".join([f"- {p}" for p in request.key_points])
    
    template = get_letter_template(request.letter_type)
    
    prompt = f"""Draft a {request.letter_type.value} letter for a UK legal matter.

RECIPIENT: {request.recipient}
SUBJECT: {request.subject}
TONE: {request.tone}

KEY POINTS TO INCLUDE:
{points_text}

{f"CASE CONTEXT: {request.case_context}" if request.case_context else ""}

REQUIREMENTS:
1. Use appropriate formal letter structure
2. Be clear and factual
3. {f"Reference relevant UK law where appropriate" if request.include_legal_refs else "Keep legal jargon minimal"}
4. Include appropriate dates and reference numbers placeholders [DATE], [REF]
5. End with clear next steps or requests

{template}

Generate a professional letter draft:"""

    try:
        response = await hf_client.chat(
            messages=[{"role": "user", "content": prompt}],
            model_key="chat_primary",
            max_tokens=2000,
        )
        
        content = response["content"]
        
        return DraftResponse(
            content=content,
            word_count=len(content.split()),
            letter_type=request.letter_type,
            suggestions=generate_suggestions(request.letter_type),
            disclaimer="This is a draft for your review. Modify as needed and consider seeking legal advice before sending."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {str(e)}")


@router.post("/witness-statement")
async def draft_witness_statement(
    witness_name: str,
    relationship_to_case: str,
    events_witnessed: List[str],
    case_context: Optional[str] = None,
    req: Request = None
):
    """
    Generate a witness statement template.
    
    Follows UK court format requirements.
    """
    hf_client = req.app.state.hf_client
    
    events_text = "\n".join([f"- {e}" for e in events_witnessed])
    
    prompt = f"""Create a UK-format witness statement:

WITNESS: {witness_name}
RELATIONSHIP TO CASE: {relationship_to_case}

EVENTS WITNESSED:
{events_text}

{f"CASE CONTEXT: {case_context}" if case_context else ""}

Create a witness statement that:
1. Follows UK court format
2. Uses numbered paragraphs
3. States facts clearly and chronologically
4. Avoids opinion unless clearly labeled
5. Includes statement of truth at the end

Format:
- Header with case details [TO BE COMPLETED]
- Witness details paragraph
- Numbered paragraphs for each event
- Statement of truth"""

    try:
        response = await hf_client.chat(
            messages=[{"role": "user", "content": prompt}],
            model_key="chat_primary",
            max_tokens=2000,
        )
        
        return {
            "statement": response["content"],
            "format": "UK Court Format",
            "note": "Review carefully and ensure all facts are accurate before signing."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statement generation failed: {str(e)}")


@router.post("/timeline-document")
async def generate_timeline_document(
    events: List[dict],
    case_title: str,
    include_evidence_refs: bool = True,
    req: Request = None
):
    """
    Generate a formatted chronology document.
    
    Useful for court bundles and case summaries.
    """
    hf_client = req.app.state.hf_client
    
    events_text = "\n".join([
        f"- {e.get('date', 'Date unknown')}: {e.get('description', '')}"
        + (f" [Evidence: {e.get('evidence_ref', '')}]" if include_evidence_refs and e.get('evidence_ref') else "")
        for e in events
    ])
    
    prompt = f"""Create a formal chronology document for: {case_title}

EVENTS:
{events_text}

Format as a professional legal chronology:
1. Clear date column
2. Event description column
3. {"Evidence reference column" if include_evidence_refs else ""}
4. Professional formatting
5. Suitable for court bundle"""

    try:
        response = await hf_client.chat(
            messages=[{"role": "user", "content": prompt}],
            model_key="chat_fast",  # Faster model for formatting task
        )
        
        return {
            "chronology": response["content"],
            "event_count": len(events),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chronology generation failed: {str(e)}")


def get_letter_template(letter_type: LetterType) -> str:
    """Get template guidance for letter type"""
    templates = {
        LetterType.GRIEVANCE: """
GRIEVANCE LETTER TEMPLATE:
- State this is a formal grievance
- Describe the issue factually
- Reference any relevant policies violated
- State what outcome you seek
- Request a meeting to discuss
- Set reasonable timeframe for response (usually 5 working days)""",
        
        LetterType.APPEAL: """
APPEAL LETTER TEMPLATE:
- Reference the decision being appealed
- State grounds for appeal
- Provide supporting evidence references
- Request reconsideration
- Cite relevant law or policy""",
        
        LetterType.COMPLAINT: """
COMPLAINT LETTER TEMPLATE:
- State what happened and when
- Explain impact on you
- State what resolution you seek
- Set deadline for response
- Mention escalation path if unresolved""",
        
        LetterType.SUBJECT_ACCESS: """
SUBJECT ACCESS REQUEST (GDPR Article 15):
- State this is a Subject Access Request under GDPR
- Specify what personal data you're requesting
- Include proof of identity requirements
- Note 30-day response deadline
- Request data in portable format""",
        
        LetterType.RESPONSE: """
RESPONSE LETTER TEMPLATE:
- Acknowledge letter/communication received
- Address each point raised
- State your position clearly
- Provide evidence references
- Propose next steps""",
        
        LetterType.WITNESS_STATEMENT: """
WITNESS STATEMENT TEMPLATE:
- Standard court format
- Numbered paragraphs
- First person, past tense
- Statement of truth""",
        
        LetterType.TIMELINE: """
TIMELINE DOCUMENT:
- Chronological order
- Date | Event | Evidence Reference
- Clear, factual descriptions""",
    }
    return templates.get(letter_type, "")


def generate_suggestions(letter_type: LetterType) -> List[str]:
    """Generate review suggestions for letter type"""
    common = [
        "Review all dates and names for accuracy",
        "Keep a copy of everything you send",
        "Consider sending by recorded delivery",
    ]
    
    type_specific = {
        LetterType.GRIEVANCE: [
            "Check your employer's grievance policy for specific requirements",
            "Keep the tone professional even if upset",
            "Note the date you submit the grievance",
        ],
        LetterType.APPEAL: [
            "Ensure you're within the appeal deadline",
            "Include all evidence references",
            "Request acknowledgment of receipt",
        ],
        LetterType.SUBJECT_ACCESS: [
            "Include two forms of ID as required",
            "Note the date - they have 30 days to respond",
            "Keep proof of sending",
        ],
    }
    
    return common + type_specific.get(letter_type, [])
