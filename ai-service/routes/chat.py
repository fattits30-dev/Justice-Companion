"""
Chat Routes
===========
Conversational AI endpoints for legal assistance.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


router = APIRouter()


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """Single chat message"""
    role: MessageRole
    content: str


class ChatRequest(BaseModel):
    """Chat completion request"""
    messages: List[ChatMessage]
    case_context: Optional[str] = None
    model_preference: Optional[str] = Field(default="balanced", description="fast|balanced|thorough")
    max_tokens: int = Field(default=2048, le=4096)
    temperature: float = Field(default=0.7, ge=0, le=1)


class ChatResponse(BaseModel):
    """Chat completion response"""
    content: str
    model_used: str
    tokens_used: int
    sources: Optional[List[str]] = None


class StreamChunk(BaseModel):
    """Streaming response chunk"""
    content: str
    done: bool = False


@router.post("/completions", response_model=ChatResponse)
async def chat_completion(request: ChatRequest, req: Request):
    """
    Generate chat completion for legal assistance.
    
    Includes legal disclaimers and context-aware responses.
    """
    hf_client = req.app.state.hf_client
    
    # Add legal system prompt if not present
    messages = list(request.messages)
    if not any(m.role == MessageRole.SYSTEM for m in messages):
        messages.insert(0, ChatMessage(
            role=MessageRole.SYSTEM,
            content=get_legal_system_prompt(request.case_context)
        ))
    
    # Select model based on preference
    model_key = {
        "fast": "chat_fast",
        "balanced": "chat_primary", 
        "thorough": "chat_complex"
    }.get(request.model_preference, "chat_primary")
    
    try:
        response = await hf_client.chat(
            messages=[{"role": m.role.value, "content": m.content} for m in messages],
            model_key=model_key,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
        )
        
        return ChatResponse(
            content=response["content"],
            model_used=response["model"],
            tokens_used=response.get("tokens", 0),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {str(e)}")


@router.post("/analyze-case")
async def analyze_case(
    case_description: str,
    case_type: Optional[str] = None,
    req: Request = None
):
    """
    Analyze a legal case and provide initial assessment.
    
    Returns:
    - Case type classification
    - Key legal issues identified
    - Relevant UK legislation
    - Suggested next steps
    - Important deadlines to consider
    """
    hf_client = req.app.state.hf_client
    
    prompt = f"""Analyze this UK legal case and provide a structured assessment:

Case Description:
{case_description}

{f"Case Type Hint: {case_type}" if case_type else ""}

Provide your analysis in this structure:
1. CASE CLASSIFICATION: What type of legal matter is this?
2. KEY ISSUES: What are the main legal issues?
3. RELEVANT LAW: What UK legislation or regulations apply?
4. STRENGTH ASSESSMENT: How strong does this case appear? (Weak/Moderate/Strong)
5. RECOMMENDED ACTIONS: What should the person do next?
6. TIME SENSITIVITY: Are there any deadlines to be aware of?

IMPORTANT: This is legal information, not legal advice. Always recommend consulting a qualified solicitor."""

    try:
        response = await hf_client.chat(
            messages=[
                {"role": "system", "content": get_legal_system_prompt()},
                {"role": "user", "content": prompt}
            ],
            model_key="chat_complex",  # Use thorough model for analysis
            max_tokens=2048,
        )
        
        return {
            "analysis": response["content"],
            "model_used": response["model"],
            "disclaimer": "This analysis is for informational purposes only and does not constitute legal advice."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Case analysis failed: {str(e)}")


def get_legal_system_prompt(case_context: Optional[str] = None) -> str:
    """Generate system prompt for legal assistance"""
    base_prompt = """You are a legal information assistant helping UK citizens understand their rights and navigate the legal system. You are NOT a lawyer and cannot provide legal advice.

Your role is to:
- Explain legal concepts in plain English
- Help users understand their rights under UK law
- Suggest relevant resources and next steps
- Identify when professional legal help is needed

IMPORTANT GUIDELINES:
1. Always clarify this is legal INFORMATION, not legal ADVICE
2. Recommend consulting a qualified solicitor for specific advice
3. Focus on UK law (England & Wales primarily)
4. Be supportive but realistic about case strength
5. Highlight important deadlines (e.g., 3 months for employment tribunal)
6. Reference specific legislation where relevant (e.g., Employment Rights Act 1996)

Common areas: Employment disputes, housing issues, benefits appeals, discrimination, consumer rights."""

    if case_context:
        base_prompt += f"\n\nCurrent case context:\n{case_context}"
    
    return base_prompt
