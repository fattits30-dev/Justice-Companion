"""Stub AI service for deterministic testing.

This module provides a lightweight, fully in-process replacement for
`UnifiedAIService` that does **not** talk to real AI providers. It is
designed for use in automated tests (e.g. Playwright E2E) where we need
stable, repeatable outputs and must avoid any external dependencies.

Behavioural goals:
- Produce deterministic legal-style responses for chat endpoints.
- Include specific key phrases that existing E2E tests assert on.
- Provide document analysis responses that match the
  `DocumentExtractionResponse` schema and surface `suggested_case_data`
  so the PWA can offer "Create Case from Analysis" actions.

The implementation is intentionally simple and avoids any network calls.
"""

from __future__ import annotations

import os
from typing import AsyncIterator, List, Optional

from backend.services.ai.models import (
    AIProviderConfig,
    ChatMessage,
    DocumentExtractionResponse,
    FieldConfidence,
    ParsedDocument,
    SuggestedCaseData,
    UserProfile,
)

class StubAIService:
    """Deterministic, in-memory AI stub.

    This class mimics the small subset of the `UnifiedAIService` interface
    that the chat routes and document analysis flow rely on:

    - `config` attribute with `provider`/`model` for logging.
    - `stream_chat(messages)` for SSE streaming.
    - `chat(messages, **_)` for non-streaming responses.
    - `extract_case_data_from_document(parsed_doc, user_profile, user_question)`
      for document analysis.

    It is intentionally conservative: responses are short but contain the
    legal terminology and phrases that existing Playwright tests expect.
    """

    def __init__(self, audit_logger=None) -> None:
        # Minimal config object so existing logging continues to work.
        self.config = AIProviderConfig(
            provider="openai",  # treated as generic provider in logs
            api_key=os.getenv("STUB_AI_API_KEY", "NOT_USED"),
            model="stub-model",
            endpoint=None,
            temperature=0.0,
            max_tokens=512,
            top_p=1.0,
        )
        self.audit_logger = audit_logger

    # ------------------------------------------------------------------
    # Core Chat API
    # ------------------------------------------------------------------

    async def chat(self, messages: List[ChatMessage], **_: object) -> str:
        """Return a deterministic response based on the last user message.

        The concrete strings here are chosen to satisfy the assertions in
        the existing Playwright tests (e.g. references to UK employment
        law, ACAS, ET1 forms, and grievance procedures).
        """

        last_user = ""
        for msg in reversed(messages):
            if msg.role == "user":
                last_user = msg.content.lower()
                break

        # Basic routing based on keywords used in the E2E specs.
        if "unfair dismissal" in last_user:
            return (
                "This looks like an unfair dismissal issue under UK employment law. "
                "Relevant sources include Employment Rights Act 1996, ACAS guidance, "
                "and unfair dismissal case law on gross misconduct. "
                "Keywords: Employment Rights Act 1996,ACAS,unfair dismissal,gross misconduct."
            )

        if "employment tribunal" in last_user:
            return (
                "An employment tribunal is an independent body that decides employment "
                "disputes in the UK. You normally start a claim after contacting ACAS. "
                "This explanation is about the employment tribunal process."
            )

        if "et1" in last_user or "et1 form" in last_user:
            return (
                "The ET1 form is the claim form used to start an employment tribunal "
                "claim in the UK. It records your details, your employer, the type of "
                "claim (for example unfair dismissal) and the facts."
            )

        if "grievance" in last_user or "long" in last_user:
            return (
                "This appears to be a workplace grievance related to dismissal. "
                "You should follow your employer's grievance procedure and consider "
                "ACAS guidance. For appeals you may go to the Employment Appeal Tribunal "
                "(EAT) after an Employment Tribunal decision. "
                "Summary: grievance procedure,ACAS,EAT,Employment Tribunal."
            )

        if "wrongful dismissal" in last_user:
            return (
                "A wrongful dismissal claim focuses on breach of contract, such as not "
                "giving proper notice. Key sources often include the Employment Rights Act 1996, "
                "ACAS codes of practice and GOV.UK / Citizens Advice guidance on dismissal."
            )

        if "document upload" in last_user or "analyzing" in last_user:
            return "document,uploaded,file,analyzing - the system is reviewing the content."

        # Default response used for generic employment questions.
        return (
            "This looks like an employment law issue under UK law. "
            "Typical references include the Employment Rights Act 1996 and ACAS guidance. "
            "For more detailed analysis you may need formal legal advice."
        )

    async def stream_chat(self, messages: List[ChatMessage], **_: object) -> AsyncIterator[str]:
        """Stream the same deterministic response token-by-token.

        The streaming implementation is intentionally simple: it reuses the
        non-streaming `chat` method and yields short chunks. This is enough
        for the frontend to exercise its streaming UI and for E2E tests to
        observe incremental output.
        """

        full = await self.chat(messages)
        # Yield in small whitespace-delimited chunks.
        for part in full.split(" "):
            yield part + " "

    # ------------------------------------------------------------------
    # Document Analysis API
    # ------------------------------------------------------------------

    async def extract_case_data_from_document(
        self,
        parsed_doc: ParsedDocument,
        user_profile: UserProfile,
        user_question: Optional[str] = None,
    ) -> DocumentExtractionResponse:
        """Return a deterministic document analysis and suggested case data.

        The analysis text is written to satisfy the expectations of the
        document-upload E2E tests (e.g. containing words like "Analysis",
        "employment", "dismissal", "case type", and "claimant").
        """

        claimant_name = user_profile.name or "User"

        analysis_lines = [
            "document,uploaded,file,analyzing - starting Analysis of the uploaded document.",
            f"This is a brief Analysis of the uploaded document '{parsed_doc.filename}'.",
            "It appears to relate to an employment dismissal problem.",
            "The case type is likely an employment dispute about dismissal and procedure.",
            f"The claimant is {claimant_name}, and the document will help explain their situation.",
        ]

        if user_question:
            analysis_lines.append(f"User question: {user_question}.")

        analysis_text = " " .join(analysis_lines)

        suggested = SuggestedCaseData(
            document_ownership_mismatch=False,
            document_claimant_name=claimant_name,
            title=f"Case regarding {parsed_doc.filename}",
            case_type="employment",
            description="Employment dismissal case based on the uploaded document.",
            claimant_name=claimant_name,
            opposing_party="Employer",
            case_number=None,
            court_name="Employment Tribunal",
            filing_deadline=None,
            next_hearing_date=None,
            confidence=FieldConfidence(
                title=0.9,
                case_type=0.9,
                description=0.9,
                opposing_party=0.7,
                case_number=0.0,
                court_name=0.6,
                filing_deadline=0.0,
                next_hearing_date=0.0,
            ),
            extracted_from={},
        )

        return DocumentExtractionResponse(analysis=analysis_text, suggested_case_data=suggested)

__all__ = ["StubAIService"]
