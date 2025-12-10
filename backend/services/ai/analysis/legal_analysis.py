"""Legal analysis helpers for the Unified AI service."""

from __future__ import annotations

import json
import re
import textwrap
from datetime import datetime
from typing import Awaitable, Callable, List

from backend.services.ai.models import (
    CaseAnalysisRequest,
    CaseAnalysisResponse,
    ChatMessage,
    DocumentDraftRequest,
    DocumentDraftResponse,
    EvidenceAnalysisRequest,
    EvidenceAnalysisResponse,
)

ChatFunction = Callable[[List[ChatMessage]], Awaitable[str]]
_JSON_BLOCK_PATTERN = re.compile(r"```json\n?(.*?)\n?```", re.DOTALL)


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def _extract_json_payload(response: str) -> str:
    match = _JSON_BLOCK_PATTERN.search(response)
    if match:
        return match.group(1)
    fallback = re.search(r"\{.*\}", response, re.DOTALL)
    return fallback.group(0) if fallback else response


def _build_case_analysis_prompt(request: CaseAnalysisRequest) -> str:
    evidence_json = json.dumps([item.dict() for item in request.evidence], indent=2)
    timeline_json = json.dumps([event.dict() for event in request.timeline], indent=2)
    return textwrap.dedent(
        f"""
        Analyze this legal case and provide structured analysis in JSON format.

        CRITICAL: You provide INFORMATION only, NOT ADVICE.

        Rules:
        1. Never say "you should" - say "options to consider include"
        2. Never say "the best approach" - present multiple approaches
        3. Always cite sources (gov.uk, legislation.gov.uk, Citizens Advice)
        4. Always remind users to verify with a solicitor
        5. Present multiple options, not single recommendations

        Case Type: {_enum_value(request.case_type)}
        Jurisdiction: {_enum_value(request.jurisdiction)}
        Description: {request.description}

        Evidence: {evidence_json}
        Timeline: {timeline_json}

        Provide analysis in this JSON structure:
        {{
          "legal_issues": [...],
          "applicable_law": [...],
          "recommended_actions": [...],
          "evidence_gaps": [...],
          "estimated_complexity": {{"score": 1-10, "factors": [...], "explanation": "..."}},
          "reasoning": "...",
          "disclaimer": "This is information, not legal advice.",
          "sources": [...]
        }}
        """
    ).strip()


def _build_evidence_prompt(request: EvidenceAnalysisRequest) -> str:
    existing_evidence = json.dumps(request.existing_evidence)
    claims_json = json.dumps(request.claims)
    return textwrap.dedent(
        f"""
        Analyze evidence for this legal case and identify gaps.

        CRITICAL: You provide INFORMATION only, NOT ADVICE.

        Rules:
        1. Never say "you should" - say "options to consider include"
        2. Never say "the best approach" - present multiple approaches
        3. Always cite sources (gov.uk, legislation.gov.uk, Citizens Advice)
        4. Always remind users to verify with a solicitor
        5. Present multiple options, not single recommendations

        Case Type: {_enum_value(request.case_type)}
        Existing Evidence: {existing_evidence}
        Claims: {claims_json}

        Provide analysis in JSON format with:
        - gaps: list of objects with keys: description, importance, suggested_sources
        - suggestions: additional documentation needed
        - strength: overall evidence strength (strong/moderate/weak)
        - explanation: detailed reasoning
        - disclaimer: legal disclaimer
        """
    ).strip()


def _build_document_prompt(
    request: DocumentDraftRequest,
    model_name: str,
) -> str:
    doc_type = _enum_value(request.document_type)
    case_type = _enum_value(request.context.case_type)
    created_at = datetime.utcnow().isoformat()
    return textwrap.dedent(
        f"""
        Draft a {doc_type} for this legal case.

        CRITICAL: You provide INFORMATION only, NOT ADVICE.

        Rules:
        1. Never say "you should" - say "options to consider include"
        2. Never say "the best approach" - present multiple approaches
        3. Always cite sources (gov.uk, legislation.gov.uk, Citizens Advice)
        4. Always remind users to verify with a solicitor
        5. Present multiple options, not single recommendations

        Case Type: {case_type}
        Facts: {request.context.facts}
        Objectives: {request.context.objectives}

        Provide response in JSON format:
        {{
          "content": "Full document text",
          "metadata": {{
            "type": "{doc_type}",
            "created_at": "{created_at}",
            "word_count": 0,
            "model_used": "{model_name}",
            "case_id": "{request.context.case_id}"
          }},
          "disclaimer": "This is a draft template, not legal advice."
        }}
        """
    ).strip()


async def run_case_analysis(
    *, chat_fn: ChatFunction, request: CaseAnalysisRequest
) -> CaseAnalysisResponse:
    prompt = _build_case_analysis_prompt(request)
    response = await chat_fn([ChatMessage(role="user", content=prompt)])
    payload = _extract_json_payload(response)
    return CaseAnalysisResponse(**json.loads(payload))


async def run_evidence_analysis(
    *, chat_fn: ChatFunction, request: EvidenceAnalysisRequest
) -> EvidenceAnalysisResponse:
    prompt = _build_evidence_prompt(request)
    response = await chat_fn([ChatMessage(role="user", content=prompt)])
    payload = _extract_json_payload(response)
    return EvidenceAnalysisResponse(**json.loads(payload))


async def run_document_draft(
    *,
    chat_fn: ChatFunction,
    request: DocumentDraftRequest,
    model_name: str,
) -> DocumentDraftResponse:
    prompt = _build_document_prompt(request, model_name)
    response = await chat_fn([ChatMessage(role="user", content=prompt)])
    payload = _extract_json_payload(response)
    return DocumentDraftResponse(**json.loads(payload))
