"""Document ingestion utilities for the unified AI service."""

from __future__ import annotations

import json
import logging
import re
import textwrap
from typing import Awaitable, Callable, List, Optional

from backend.services.ai.models import (
    ChatMessage,
    DocumentExtractionResponse,
    FieldConfidence,
    ParsedDocument,
    SuggestedCaseData,
    UserProfile,
)

logger = logging.getLogger(__name__)

ChatFunction = Callable[[List[ChatMessage]], Awaitable[str]]

SYSTEM_PROMPT = (
    "You are Justice Companion AI, a legal document analysis specialist for UK civil legal matters. "
    "CRITICAL: You provide INFORMATION only, NOT ADVICE. "
    "Never use directive language like 'you should' - instead say 'options to consider include'. "
    "Always cite sources and remind users to consult a qualified solicitor."
)


def _build_user_prompt(
    parsed_doc: ParsedDocument,
    user_profile: UserProfile,
    user_question: Optional[str],
) -> str:
    question_section = f'USER QUESTION: "{user_question}"\n\n' if user_question else ""
    return textwrap.dedent(
        f"""
        You are a UK civil legal assistant analyzing a document for
        {user_profile.name or "someone"} who just uploaded it.

        CRITICAL: You provide INFORMATION only, NOT ADVICE.

        Rules:
        1. Never say "you should" - say "options to consider include"
        2. Never say "the best approach" - present multiple approaches
        3. Always cite sources (gov.uk, legislation.gov.uk, Citizens Advice)
           when referencing legal procedures
        4. Always remind users to verify with a solicitor for advice specific
           to their situation
        5. Present multiple options, not single recommendations

        DOCUMENT: {parsed_doc.filename}
        FILE TYPE: {parsed_doc.file_type.upper()}
        LENGTH: {parsed_doc.word_count} words

        CONTENT:
        {parsed_doc.text}

        {question_section}
        IMPORTANT NAME MISMATCH CHECK:
        - The user who uploaded this is: "{user_profile.name or "User"}"
        - If the document is clearly about/for a DIFFERENT person (e.g.,
          "Sarah Mitchell" vs "{user_profile.name or "User"}"), set
          document_ownership_mismatch to TRUE
        - If names match or are similar, set to FALSE

        CASE TYPE DETECTION - Choose the BEST match:
        - "employment" = dismissal, redundancy, unfair dismissal,
          discrimination at work, employment contracts, wages, workplace
          grievances
        - "housing" = eviction, landlord disputes, rent issues, repairs,
          tenancy agreements, homelessness
        - "consumer" = faulty goods, services disputes, refunds, contracts
          with businesses
        - "family" = divorce, child custody, domestic issues
        - "other" = ONLY if none of the above apply

        TITLE FORMAT - Create a descriptive title like:
        - "Smith vs ABC Corp - Unfair Dismissal"
        - "Jones vs City Council - Housing Disrepair"
        - "[Claimant] vs [Opponent] - [Issue Type]"

        Provide your response in TWO parts:

        PART 1 - Conversational Analysis (plain text):
        [Your friendly analysis talking directly to the user, summarizing key
        facts and dates, ending with actionable suggestions]
        [If document_ownership_mismatch is TRUE, WARN the user: "⚠️ IMPORTANT:
        This document appears to be for [name from document], not for you
        ({user_profile.name or "User"})."]

        PART 2 - Structured Data (JSON format):
        You MUST provide valid JSON in this exact format. Extract ALL available
        information from the document:

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
                "title": {{
                    "source": "document header",
                    "text": "RE: TERMINATION OF EMPLOYMENT"
                }},
                "description": {{
                    "source": "document body",
                    "text": "Your employment is being terminated on the grounds"
                             " of gross misconduct"
                }},
                "opposing_party": {{
                    "source": "document letterhead",
                    "text": "Brightstone Technologies Ltd"
                }},
                "case_number": {{
                    "source": "document footer",
                    "text": "Reference: BT/HR/2025/0847"
                }},
                "court_name": null,
                "filing_deadline": {{
                    "source": "appeal section",
                    "text": "deadline for submitting your appeal is"
                             " 15th January 2026"
                }},
                "next_hearing_date": null
            }}
        }}
        ```

        IMPORTANT - For extracted_from:
        - Provide the EXACT quoted text from the document for EACH extracted field
        - Include source location (e.g., "document header", "paragraph 3",
          "letterhead")
        - This shows the user exactly where the AI found each piece of information
        - Set to null ONLY if the field was not found in the document

        CRITICAL: The JSON must be valid and parseable. Use null (not "null") for
        missing values. Use actual numbers for confidence scores (0.0-1.0).
        """
    ).strip()


def _detect_case_type(response_text: str) -> str:
    response_lower = response_text.lower()
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
        return "employment"
    if any(
        word in response_lower
        for word in ["eviction", "landlord", "tenant", "rent", "housing"]
    ):
        return "housing"
    if any(
        word in response_lower for word in ["refund", "consumer", "goods", "service"]
    ):
        return "consumer"
    return "other"


def _fallback_response(
    response: str,
    parsed_doc: ParsedDocument,
    user_profile: UserProfile,
) -> DocumentExtractionResponse:
    detected_case_type = _detect_case_type(response)
    return DocumentExtractionResponse(
        analysis=response,
        suggested_case_data=SuggestedCaseData(
            title=f"Case regarding {parsed_doc.filename}",
            case_type=detected_case_type,
            description=f"Document uploaded for analysis: {parsed_doc.filename}",
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


def _extract_json_block(response: str) -> Optional[re.Match[str]]:
    patterns = [
        r"```json\n?(.*?)\n?```",
        r'\{[\s\S]*"title"[\s\S]*"case_type"[\s\S]*"confidence"[\s\S]*\}',
        r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}",
    ]
    for pattern in patterns:
        match = re.search(pattern, response, re.DOTALL)
        if match:
            return match
    return None


async def extract_case_data_from_document(
    *,
    chat_fn: ChatFunction,
    parsed_doc: ParsedDocument,
    user_profile: UserProfile,
    user_question: Optional[str] = None,
) -> DocumentExtractionResponse:
    user_prompt = _build_user_prompt(parsed_doc, user_profile, user_question)
    messages = [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=user_prompt),
    ]

    response = await chat_fn(messages)
    logger.info("[DEBUG] AI response received, length: %s", len(response))

    json_match = _extract_json_block(response)
    if not json_match:
        logger.warning(
            "[DEBUG] No JSON found in response. Response preview: %s...", response[:500]
        )
        return _fallback_response(response, parsed_doc, user_profile)

    analysis_text = response[: json_match.start()].strip()
    json_str = json_match.group(1) if json_match.lastindex else json_match.group(0)
    logger.info("[DEBUG] Found JSON, attempting to parse: %s...", json_str[:200])

    try:
        parsed_json = json.loads(json_str)
    except json.JSONDecodeError as exc:
        logger.error("[DEBUG] JSON parse error: %s. JSON string: %s", exc, json_str)
        return _fallback_response(response, parsed_doc, user_profile)

    try:
        suggested_case_data = SuggestedCaseData(**parsed_json)
        suggested_case_data.claimant_name = user_profile.name or "User"
    except Exception as exc:  # pragma: no cover - validation errors are rare
        logger.error(
            "[DEBUG] Error creating SuggestedCaseData: %s. Parsed JSON: %s",
            exc,
            parsed_json,
        )
        raise

    logger.info(
        "[DEBUG] Successfully parsed case data: title=%s, type=%s",
        suggested_case_data.title,
        suggested_case_data.case_type,
    )
    logger.info("[DEBUG] extracted_from data: %s", suggested_case_data.extracted_from)

    return DocumentExtractionResponse(
        analysis=analysis_text or response,
        suggested_case_data=suggested_case_data,
    )
