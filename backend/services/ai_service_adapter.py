"""
AI Service Adapter
==================
Adapts the AIServiceClient to the UnifiedAIService interface.
Allows backend routes to use the separate ai-service microservice.
"""

import os
from typing import List, Dict, Any, Optional, AsyncIterator

from backend.services.ai_service_client import AIServiceClient
from backend.services.ai.service import (
    ChatMessage,
    CaseAnalysisRequest,
    CaseAnalysisResponse,
    EvidenceAnalysisRequest,
    EvidenceAnalysisResponse,
    DocumentDraftRequest,
    DocumentDraftResponse,
    DocumentExtractionResponse,
    ParsedDocument,
    UserProfile,
    AIProviderConfig,
    SuggestedCaseData,
    FieldConfidence,
    ExtractionSource,
)
from backend.services.audit_logger import AuditLogger


class AIServiceAdapter:
    """
    Adapter that wraps AIServiceClient to provide UnifiedAIService interface.

    This allows the backend routes to call the separate ai-service
    microservice while maintaining the same interface as the old
    local AI implementation.
    """

    def __init__(self, audit_logger: Optional[AuditLogger] = None):
        self.client = AIServiceClient()
        self.audit_logger = audit_logger

        provider = os.environ.get("AI_SERVICE_PROVIDER", "huggingface")
        model = os.environ.get("AI_SERVICE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
        api_key = (
            os.environ.get("AI_SERVICE_API_KEY")
            or os.environ.get("HF_TOKEN")
            or os.environ.get("OPENAI_API_KEY")
            or os.environ.get("ANTHROPIC_API_KEY")
        )

        if not api_key:
            raise RuntimeError(
                "AI_MODE=service requires AI_SERVICE_API_KEY (or provider-specific token) to be set"
            )

        # Provide a config for compatibility with existing code paths that expect UnifiedAIService
        self.config = AIProviderConfig(
            provider=provider,
            model=model,
            api_key=api_key,
        )

    async def chat(self, messages: List[ChatMessage]) -> str:
        """
        Generate chat completion.

        Args:
            messages: List of ChatMessage objects

        Returns:
            AI response text
        """
        # Convert ChatMessage to dict format
        msg_list = [{"role": m.role, "content": m.content} for m in messages]

        try:
            response = await self.client.chat(msg_list)
            return response.get("content", "")
        except Exception as e:
            # Log error and return fallback
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="ai_chat_failed",
                    user_id=None,
                    resource_type="chat",
                    resource_id="",
                    action="chat",
                    details={"error": str(e)},
                    success=False,
                    error_message=str(e),
                )
            return f"I apologize, but I'm having trouble connecting to the AI service. Please try again. Error: {str(e)}"

    async def stream_chat(self, messages: List[ChatMessage]) -> AsyncIterator[str]:
        """
        Stream chat completion token by token.

        Note: The ai-service may not support streaming directly through HTTP,
        so we fall back to non-streaming and yield the full response.
        Future: Implement WebSocket or SSE support in ai-service.
        """
        # For now, get full response and yield it
        # TODO: Implement true streaming via ai-service
        response = await self.chat(messages)

        # Simulate streaming by yielding words
        words = response.split()
        for i, word in enumerate(words):
            if i > 0:
                yield " "
            yield word

    async def analyze_case(self, request: CaseAnalysisRequest) -> CaseAnalysisResponse:
        """
        Analyze a legal case.

        Args:
            request: CaseAnalysisRequest with case details

        Returns:
            CaseAnalysisResponse with analysis results
        """
        try:
            response = await self.client.full_case_analysis(
                description=request.description,
                case_type=request.case_type,
                documents_summary=request.documents_summary,
                timeline_summary=request.timeline_summary,
            )

            # Map response to CaseAnalysisResponse
            return CaseAnalysisResponse(
                case_type=response.get("case_type", request.case_type or "general"),
                strength_assessment=response.get("strength_assessment", "unclear"),
                legal_issues=response.get("legal_issues", []),
                applicable_laws=response.get("applicable_laws", []),
                recommended_actions=response.get("recommended_actions", []),
                critical_deadlines=response.get("critical_deadlines", []),
                evidence_gaps=response.get("evidence_gaps", []),
                disclaimer=response.get(
                    "disclaimer", "This is legal information, not advice."
                ),
            )
        except Exception as e:
            # Return minimal response on error
            return CaseAnalysisResponse(
                case_type=request.case_type or "general",
                strength_assessment="unclear",
                legal_issues=[],
                applicable_laws=[],
                recommended_actions=["Unable to complete analysis. Please try again."],
                critical_deadlines=[],
                evidence_gaps=[],
                disclaimer=f"Analysis failed: {str(e)}",
            )

    async def analyze_evidence(
        self, request: EvidenceAnalysisRequest
    ) -> EvidenceAnalysisResponse:
        """
        Analyze evidence for a case.
        """
        try:
            response = await self.client.assess_evidence_strength(
                case_id=request.case_id,
                evidence_descriptions=request.evidence_descriptions,
                case_type=request.case_type,
            )

            return EvidenceAnalysisResponse(
                overall_strength=response.get("overall_strength", "unclear"),
                individual_assessments=response.get("individual_assessments", []),
                gaps_identified=response.get("gaps_identified", []),
                recommendations=response.get("recommendations", []),
            )
        except Exception as e:
            return EvidenceAnalysisResponse(
                overall_strength="unclear",
                individual_assessments=[],
                gaps_identified=[],
                recommendations=[f"Evidence analysis failed: {str(e)}"],
            )

    async def draft_document(
        self, request: DocumentDraftRequest
    ) -> DocumentDraftResponse:
        """
        Draft a legal document.
        """
        try:
            response = await self.client.draft_letter(
                letter_type=request.document_type,
                recipient=request.context.recipient or "To Whom It May Concern",
                subject=request.context.subject or "Legal Matter",
                key_points=request.key_points,
                tone=request.tone or "formal",
                case_context=request.context.case_summary,
            )

            return DocumentDraftResponse(
                content=response.get("content", ""),
                word_count=response.get("word_count", 0),
                document_type=request.document_type,
                suggestions=response.get("suggestions", []),
                disclaimer=response.get("disclaimer", "Review before sending."),
            )
        except Exception as e:
            return DocumentDraftResponse(
                content="",
                word_count=0,
                document_type=request.document_type,
                suggestions=[],
                disclaimer=f"Draft generation failed: {str(e)}",
            )

    async def extract_case_data_from_document(
        self,
        document: ParsedDocument,
        user_profile: UserProfile,
        user_question: Optional[str] = None,
    ) -> DocumentExtractionResponse:
        """
        Extract case data from a document using comprehensive AI analysis.
        Uses the same prompt as UnifiedAIService for proper confidence and source data.
        """
        import json
        import re

        try:
            # Build comprehensive extraction prompt (same as service.py)
            extraction_prompt = f"""You are a UK civil legal assistant analyzing a document for {user_profile.name or "someone"} who just uploaded it.

CRITICAL: You provide INFORMATION only, NOT ADVICE.

Rules:
1. Never say "you should" - say "options to consider include"
2. Never say "the best approach" - present multiple approaches
3. Always cite sources (gov.uk, legislation.gov.uk, Citizens Advice) when referencing legal procedures
4. Always remind users to verify with a solicitor for advice specific to their situation
5. Present multiple options, not single recommendations

DOCUMENT: {document.filename}
FILE TYPE: {document.file_type.upper()}
LENGTH: {document.word_count} words

CONTENT:
{document.text}

{f'USER QUESTION: "{user_question}"' if user_question else ''}

IMPORTANT NAME MISMATCH CHECK:
- The user who uploaded this is: "{user_profile.name or "User"}"
- If the document is clearly about/for a DIFFERENT person (e.g., "Sarah Mitchell" vs "{user_profile.name or "User"}"), set document_ownership_mismatch to TRUE
- If names match or are similar, set to FALSE

CASE TYPE DETECTION - Choose the BEST match:
- "employment" = dismissal, redundancy, unfair dismissal, discrimination at work, employment contracts, wages, workplace grievances
- "housing" = eviction, landlord disputes, rent issues, repairs, tenancy agreements, homelessness
- "consumer" = faulty goods, services disputes, refunds, contracts with businesses
- "family" = divorce, child custody, domestic issues
- "other" = ONLY if none of the above apply

TITLE FORMAT - Create a descriptive title like:
- "Smith vs ABC Corp - Unfair Dismissal"
- "Jones vs City Council - Housing Disrepair"
- "[Claimant] vs [Opponent] - [Issue Type]"

CONFIDENCE SCORING - Use these guidelines:
- 0.9-1.0: Exact match found in document (e.g., company name in letterhead)
- 0.7-0.89: Strong inference from document context
- 0.5-0.69: Moderate confidence, some ambiguity
- 0.3-0.49: Low confidence, significant uncertainty
- 0.0-0.29: Not found or guessed

Provide your response in TWO parts:

PART 1 - Conversational Analysis (plain text):
[Your friendly analysis talking directly to the user, summarizing key facts and dates, ending with actionable suggestions]
[If document_ownership_mismatch is TRUE, WARN the user: "⚠️ IMPORTANT: This document appears to be for [name from document], not for you ({user_profile.name or "User"})."]

PART 2 - Structured Data (JSON format):
You MUST provide valid JSON in this exact format. Extract ALL available information from the document:

```json
{{
  "document_ownership_mismatch": false,
  "document_claimant_name": null,
  "title": "Claimant vs Opposing Party - Issue Type",
  "case_type": "employment",
  "description": "2-3 sentence summary of the case facts and key issues",
  "claimant_name": "{user_profile.name or "User"}",
  "opposing_party": "Full company/person name from document",
  "case_number": "Reference number like BT/HR/2025/0847 if found",
  "court_name": "Employment Tribunal or court name if mentioned",
  "filing_deadline": "2026-01-15",
  "next_hearing_date": null,
  "confidence": {{
    "title": 0.85,
    "case_type": 0.95,
    "description": 0.9,
    "opposing_party": 0.95,
    "case_number": 0.8,
    "court_name": 0.0,
    "filing_deadline": 0.7,
    "next_hearing_date": 0.0
  }},
  "extracted_from": {{
    "title": {{"source": "document header", "text": "RE: TERMINATION OF EMPLOYMENT"}},
    "description": {{"source": "document body", "text": "Your employment is being terminated on the grounds of gross misconduct"}},
    "opposing_party": {{"source": "document letterhead", "text": "Brightstone Technologies Ltd"}},
    "case_number": {{"source": "document footer", "text": "Reference: BT/HR/2025/0847"}},
    "court_name": null,
    "filing_deadline": {{"source": "appeal section", "text": "deadline for submitting your appeal is 26th November 2025"}},
    "next_hearing_date": null
  }}
}}
```

IMPORTANT - For extracted_from:
- Provide the EXACT quoted text from the document for EACH extracted field
- Include source location (e.g., "document header", "paragraph 3", "letterhead")
- This shows the user exactly where the AI found each piece of information
- Set to null ONLY if the field was not found in the document

CRITICAL: The JSON must be valid and parseable. Use null (not "null") for missing values. Use actual numbers for confidence scores (0.0-1.0).
"""

            # Call AI service chat endpoint with this comprehensive prompt
            messages = [{"role": "user", "content": extraction_prompt}]
            response = await self.client.chat(messages)
            ai_response = response.get("content", "")

            # Parse response - extract JSON
            json_match = re.search(r"```json\n?(.*?)\n?```", ai_response, re.DOTALL)

            if not json_match:
                # Try to find raw JSON object
                json_match = re.search(
                    r'\{[\s\S]*"title"[\s\S]*"case_type"[\s\S]*"confidence"[\s\S]*\}',
                    ai_response,
                )

            if not json_match:
                # Fallback - detect case type from keywords
                response_lower = ai_response.lower()
                detected_case_type = "other"
                if any(
                    word in response_lower
                    for word in [
                        "dismissal",
                        "employment",
                        "redundancy",
                        "unfair",
                        "workplace",
                        "employer",
                    ]
                ):
                    detected_case_type = "employment"
                elif any(
                    word in response_lower
                    for word in ["eviction", "landlord", "tenant", "rent", "housing"]
                ):
                    detected_case_type = "housing"
                elif any(
                    word in response_lower
                    for word in ["refund", "consumer", "goods", "service"]
                ):
                    detected_case_type = "consumer"

                return DocumentExtractionResponse(
                    analysis=ai_response,
                    suggested_case_data=SuggestedCaseData(
                        title=f"Case regarding {document.filename}",
                        case_type=detected_case_type,
                        description=f"Document uploaded for analysis: {document.filename}",
                        claimant_name=user_profile.name or "User",
                        confidence=FieldConfidence(
                            title=0.3,
                            case_type=0.5 if detected_case_type != "other" else 0.3,
                            description=0.3,
                            opposing_party=0.0,
                            case_number=0.0,
                            court_name=0.0,
                            filing_deadline=0.0,
                            next_hearing_date=0.0,
                        ),
                        extracted_from={},
                    ),
                )

            # Extract parts
            analysis_text = ai_response[: json_match.start()].strip()
            json_str = (
                json_match.group(1) if json_match.lastindex else json_match.group(0)
            )

            try:
                parsed_json = json.loads(json_str)

                # Build confidence from parsed data
                conf = parsed_json.get("confidence", {})
                field_confidence = FieldConfidence(
                    title=float(conf.get("title", 0.5)),
                    case_type=float(conf.get("case_type", 0.5)),
                    description=float(conf.get("description", 0.5)),
                    opposing_party=float(conf.get("opposing_party", 0.0)),
                    case_number=float(conf.get("case_number", 0.0)),
                    court_name=float(conf.get("court_name", 0.0)),
                    filing_deadline=float(conf.get("filing_deadline", 0.0)),
                    next_hearing_date=float(conf.get("next_hearing_date", 0.0)),
                )

                # Build extracted_from from parsed data with camelCase keys
                ext = parsed_json.get("extracted_from", {})
                extracted_from = {}
                # Map snake_case keys to camelCase for frontend
                key_mapping = {
                    "title": "title",
                    "description": "description",
                    "opposing_party": "opposingParty",
                    "case_number": "caseNumber",
                    "court_name": "courtName",
                    "filing_deadline": "filingDeadline",
                    "next_hearing_date": "nextHearingDate",
                }
                for field_name, field_data in ext.items():
                    if field_data and isinstance(field_data, dict):
                        # Convert key to camelCase
                        camel_key = key_mapping.get(field_name, field_name)
                        extracted_from[camel_key] = ExtractionSource(
                            source=field_data.get("source", "document"),
                            text=field_data.get("text", ""),
                        )

                return DocumentExtractionResponse(
                    analysis=analysis_text or ai_response,
                    suggested_case_data=SuggestedCaseData(
                        document_ownership_mismatch=parsed_json.get(
                            "document_ownership_mismatch", False
                        ),
                        document_claimant_name=parsed_json.get(
                            "document_claimant_name"
                        ),
                        title=parsed_json.get("title", f"Case - {document.filename}"),
                        case_type=parsed_json.get("case_type", "other"),
                        description=parsed_json.get("description", ""),
                        claimant_name=user_profile.name or "User",
                        opposing_party=parsed_json.get("opposing_party"),
                        case_number=parsed_json.get("case_number"),
                        court_name=parsed_json.get("court_name"),
                        filing_deadline=parsed_json.get("filing_deadline"),
                        next_hearing_date=parsed_json.get("next_hearing_date"),
                        confidence=field_confidence,
                        extracted_from=extracted_from,
                    ),
                )
            except json.JSONDecodeError:
                # Return with the analysis we have
                return DocumentExtractionResponse(
                    analysis=analysis_text or ai_response,
                    suggested_case_data=SuggestedCaseData(
                        title=f"Case regarding {document.filename}",
                        case_type="other",
                        description=f"Document uploaded for analysis: {document.filename}",
                        claimant_name=user_profile.name or "User",
                        confidence=FieldConfidence(
                            title=0.3,
                            case_type=0.3,
                            description=0.3,
                            opposing_party=0.0,
                            case_number=0.0,
                            court_name=0.0,
                            filing_deadline=0.0,
                            next_hearing_date=0.0,
                        ),
                        extracted_from={},
                    ),
                )

        except Exception as e:
            default_confidence = FieldConfidence(
                title=0.0,
                case_type=0.0,
                description=0.0,
                opposing_party=0.0,
                case_number=0.0,
                court_name=0.0,
                filing_deadline=0.0,
                next_hearing_date=0.0,
            )
            return DocumentExtractionResponse(
                analysis=f"Document analysis failed: {str(e)}",
                suggested_case_data=SuggestedCaseData(
                    title="Analysis Failed",
                    case_type="other",
                    description="Unable to analyze document",
                    confidence=default_confidence,
                    extracted_from={},
                ),
            )


def get_ai_service_adapter(
    audit_logger: Optional[AuditLogger] = None,
) -> AIServiceAdapter:
    """
    Factory function for creating AIServiceAdapter.

    Usage in dependency injection:
        ai_service = Depends(get_ai_service_adapter)
    """
    return AIServiceAdapter(audit_logger)
