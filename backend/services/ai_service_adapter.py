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
        # Provide a config for compatibility with existing code
        # Note: api_key is a placeholder - actual key is in ai-service's .env
        self.config = AIProviderConfig(
            provider="huggingface",
            model="mistralai/Mistral-7B-Instruct-v0.2",
            api_key="handled-by-ai-service",  # Placeholder - ai-service has the real key
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
                disclaimer=response.get("disclaimer", "This is legal information, not advice."),
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
    
    async def analyze_evidence(self, request: EvidenceAnalysisRequest) -> EvidenceAnalysisResponse:
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
    
    async def draft_document(self, request: DocumentDraftRequest) -> DocumentDraftResponse:
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
        Extract case data from a document.
        """
        try:
            # Use the vision/analyze endpoint
            response = await self.client.analyze_document(
                file_bytes=document.text.encode(),  # Text content
                filename=document.filename,
                case_context=user_question,
                username=user_profile.name,  # Pass username for name detection
            )
            
            # Extract data from AI service response
            document_type = response.get("document_type", "other")
            key_facts = response.get("key_facts", [])
            parties = response.get("parties_identified", [])
            relevance_notes = response.get("relevance_notes", "")
            extracted_text = response.get("extracted_text", "")
            confidence_score = response.get("confidence", 0.5)
            
            # Map document_type to case_type
            type_mapping = {
                "contract": "employment",
                "termination": "employment", 
                "dismissal": "employment",
                "eviction": "housing",
                "tenancy": "housing",
                "lease": "housing",
                "court_order": "civil",
                "claim": "civil",
                "invoice": "consumer",
                "complaint": "consumer",
            }
            case_type = type_mapping.get(document_type.lower(), "other")
            
            # Extract opposing party (usually the company/organization)
            opposing_party = None
            for party in parties:
                # Look for company indicators
                if any(ind in party.lower() for ind in ["ltd", "limited", "plc", "inc", "corp", "company", "employer"]):
                    opposing_party = party.split(" (")[0]  # Remove role suffix like "(employer)"
                    break
            
            # Build title from document type and context
            if "termination" in document_type.lower() or "dismissal" in extracted_text.lower()[:500]:
                title = f"Employment Termination - {opposing_party or 'Unknown Employer'}"
            elif opposing_party:
                title = f"Case against {opposing_party}"
            else:
                title = f"{document_type.replace('_', ' ').title()} Case"
            
            # Build description from key facts
            description = ""
            if key_facts:
                # Take first 3 key facts
                facts_summary = key_facts[:3] if isinstance(key_facts, list) else []
                description = "; ".join(str(f) for f in facts_summary)
                if len(description) > 500:
                    description = description[:497] + "..."
            
            # Build confidence scores based on AI confidence
            field_confidence = FieldConfidence(
                title=confidence_score * 0.8,
                case_type=confidence_score * 0.7,
                description=confidence_score * 0.6 if description else 0.0,
                opposing_party=confidence_score * 0.7 if opposing_party else 0.0,
                case_number=0.0,
                court_name=0.0,
                filing_deadline=0.0,
                next_hearing_date=0.0,
            )
            
            # Extract name detection info from AI service response
            name_detection = response.get("name_detection", {}) or {}
            ownership_mismatch = not name_detection.get("user_name_found", True)
            suggested_owner = name_detection.get("suggested_owner")
            
            # Build analysis text
            analysis_text = extracted_text[:500] if extracted_text else ""
            if relevance_notes:
                analysis_text += "\n\n" + relevance_notes
            
            return DocumentExtractionResponse(
                analysis=analysis_text,
                suggested_case_data=SuggestedCaseData(
                    document_ownership_mismatch=ownership_mismatch,
                    document_claimant_name=suggested_owner,
                    title=title,
                    case_type=case_type,
                    description=description,
                    opposing_party=opposing_party,
                    confidence=field_confidence,
                    extracted_from={
                        "title": "AI extraction from document header",
                        "description": "AI extraction from key facts",
                        "opposing_party": "AI extraction from parties identified",
                    },
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


def get_ai_service_adapter(audit_logger: Optional[AuditLogger] = None) -> AIServiceAdapter:
    """
    Factory function for creating AIServiceAdapter.
    
    Usage in dependency injection:
        ai_service = Depends(get_ai_service_adapter)
    """
    return AIServiceAdapter(audit_logger)
