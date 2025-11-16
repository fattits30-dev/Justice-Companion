"""
Document Analyzer Agent

Analyzes legal documents and extracts structured case data.
Works with any model client (Hugging Face, OpenAI, etc.) to provide
conversational analysis and structured extraction.

Author: Justice Companion Team
License: MIT
"""

import json
import time
import re
from pathlib import Path
from typing import Dict, Any

from agents.base_agent import BaseAgent
from models.requests import DocumentAnalysisRequest
from models.responses import (
    DocumentAnalysisResponse,
    SuggestedCaseData,
    ConfidenceScores,
    ExtractedFields,
    CaseType,
)


class DocumentAnalyzerAgent(BaseAgent):
    """
    Agent for analyzing legal documents.

    Provides:
    - Conversational analysis explaining the document
    - Structured case data extraction with confidence scores
    - Name-matching verification (warns if document is for someone else)
    """

    def load_prompt(self) -> str:
        """
        Load the document analysis prompt from disk.

        Returns:
            Prompt template string with placeholders
        """
        import os
        prompt_path = Path(__file__).parent.parent / 'prompts' / 'current' / 'document_analysis.txt'

        # Debug logging
        print(f"[DocumentAnalyzer] Loading prompt from: {prompt_path}")
        print(f"[DocumentAnalyzer] File exists: {prompt_path.exists()}")
        print(f"[DocumentAnalyzer] Absolute path: {prompt_path.absolute()}")
        print(f"[DocumentAnalyzer] Current working directory: {os.getcwd()}")
        print(f"[DocumentAnalyzer] __file__ location: {Path(__file__).absolute()}")

        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()

    async def execute(self, request: DocumentAnalysisRequest) -> DocumentAnalysisResponse:
        """
        Execute document analysis.

        Args:
            request: DocumentAnalysisRequest with document and user profile

        Returns:
            DocumentAnalysisResponse with analysis and suggested case data

        Raises:
            ValueError: If request is invalid
            Exception: If OpenAI API call fails
        """
        # Validate request
        if not self._validate_request(request):
            raise ValueError("Invalid document analysis request")

        start_time = time.time()

        # Load and format prompt
        prompt_template = self.get_cached_prompt()

        # Build user question section
        user_question_section = ""
        if request.userQuestion:
            user_question_section = f'\nUSER QUESTION: "{request.userQuestion}"'

        # Replace placeholders
        formatted_prompt = prompt_template.format(
            user_name=request.userProfile.name or "the user",
            filename=request.document.filename,
            file_type=request.document.fileType.upper(),
            word_count=request.document.wordCount,
            document_text=request.document.text,
            user_question_section=user_question_section
        )

        # Prepare system prompt
        system_prompt = "You are Justice Companion AI, a legal document analysis specialist for UK civil legal matters. Provide both conversational analysis and structured data extraction."

        # Call model client (HuggingFace, OpenAI, etc.)
        provider = self.get_model_metadata().get('provider', 'Unknown')
        print(f"[DocumentAnalyzer] Calling {provider} for document: {request.document.filename}")
        response_text = await self.generate(formatted_prompt, system_prompt)
        print(f"[DocumentAnalyzer] Received response ({len(response_text)} chars)")

        # Parse response into analysis and JSON
        analysis_text, suggested_case_data = self._parse_response(
            response_text,
            request.userProfile.name,
            request.document.filename
        )

        # Calculate elapsed time
        elapsed_ms = int((time.time() - start_time) * 1000)

        # Get model metadata
        metadata = self.get_model_metadata()
        metadata['latencyMs'] = elapsed_ms
        metadata['promptVersion'] = 'v1'
        metadata['responseLength'] = len(response_text)

        # Build response
        return DocumentAnalysisResponse(
            analysis=analysis_text,
            suggestedCaseData=suggested_case_data,
            metadata=metadata
        )

    def _parse_response(
        self,
        response_text: str,
        user_name: str,
        filename: str
    ) -> tuple[str, SuggestedCaseData]:
        """
        Parse AI response into analysis text and structured case data.

        Args:
            response_text: Full AI response
            user_name: User's name (to inject as claimantName)
            filename: Document filename (for fallback)

        Returns:
            Tuple of (analysis_text, suggested_case_data)
        """
        # Try to find JSON block
        json_match = re.search(r'```json\s*\n([\s\S]*?)\n```', response_text)

        if not json_match:
            print("[DocumentAnalyzer] WARNING: No JSON block found in response")
            # Fallback: return full text as analysis with low-confidence defaults
            return (
                response_text,
                self._create_fallback_case_data(user_name, filename)
            )

        # Split analysis and JSON
        json_start = json_match.start()
        analysis_text = response_text[:json_start].strip()
        json_str = json_match.group(1)

        print(f"[DocumentAnalyzer] Extracted JSON block ({len(json_str)} chars)")

        # Parse JSON
        try:
            case_data_dict = json.loads(json_str)
            print("[DocumentAnalyzer] Successfully parsed JSON")
        except json.JSONDecodeError as e:
            print(f"[DocumentAnalyzer] ERROR: JSON parse failed: {e}")
            print(f"[DocumentAnalyzer] Failed JSON: {json_str[:200]}...")
            return (
                analysis_text or response_text,
                self._create_fallback_case_data(user_name, filename)
            )

        # POST-PROCESSING: Fix illogical name mismatch warnings
        # If AI claims mismatch but names actually match (case-insensitive), remove warning
        if case_data_dict.get('documentOwnershipMismatch') and case_data_dict.get('documentClaimantName'):
            doc_name = case_data_dict['documentClaimantName'].strip().lower()
            user_name_lower = (user_name or "").strip().lower()

            if doc_name == user_name_lower:
                print(f"[DocumentAnalyzer] FIXING illogical warning: '{case_data_dict['documentClaimantName']}' == '{user_name}' (case-insensitive)")
                # Names match - remove the warning
                case_data_dict['documentOwnershipMismatch'] = False
                case_data_dict['documentClaimantName'] = None

                # Remove warning text from analysis (pattern: starts with ⚠️ IMPORTANT:, ends before "This is a...")
                analysis_text = self._remove_warning_text(analysis_text)

        # Inject user's name as claimant (do not extract from document)
        case_data_dict['claimantName'] = user_name or "User"

        # Validate and create SuggestedCaseData
        try:
            suggested_case_data = SuggestedCaseData(**case_data_dict)
            print("[DocumentAnalyzer] Successfully validated case data")
            return (analysis_text or response_text, suggested_case_data)
        except Exception as e:
            print(f"[DocumentAnalyzer] ERROR: Pydantic validation failed: {e}")
            return (
                analysis_text or response_text,
                self._create_fallback_case_data(user_name, filename)
            )

    def _remove_warning_text(self, analysis_text: str) -> str:
        """
        Remove illogical name mismatch warning from analysis text.

        Pattern: Removes text starting with "⚠️ IMPORTANT:" up to (but not including)
        the next paragraph starting with "This is a" or similar document type identification.

        Args:
            analysis_text: Analysis text that may contain warning

        Returns:
            Analysis text with warning removed and cleaned up
        """
        # Pattern 1: Remove warning paragraph (⚠️ IMPORTANT: ... multiple paragraphs ... before actual analysis)
        # This removes everything from "⚠️ IMPORTANT:" until we hit "This is a" or similar
        warning_pattern = r'⚠️\s*IMPORTANT:.*?(?=This is a|This document is|The document is|\n\n[A-Z]|\Z)'
        cleaned = re.sub(warning_pattern, '', analysis_text, flags=re.DOTALL | re.IGNORECASE)

        # Pattern 2: Clean up any remaining isolated warning emoji or fragments
        cleaned = re.sub(r'⚠️\s*', '', cleaned)

        # Pattern 3: Remove any standalone "IMPORTANT:" text
        cleaned = re.sub(r'^\s*IMPORTANT:\s*', '', cleaned, flags=re.MULTILINE)

        # Clean up excessive whitespace
        cleaned = re.sub(r'\n\n\n+', '\n\n', cleaned)  # Max 2 newlines
        cleaned = cleaned.strip()

        print(f"[DocumentAnalyzer] Removed warning text. Before: {len(analysis_text)} chars, After: {len(cleaned)} chars")
        return cleaned

    def _create_fallback_case_data(self, user_name: str, filename: str) -> SuggestedCaseData:
        """
        Create fallback case data with low confidence scores.

        Args:
            user_name: User's name
            filename: Document filename

        Returns:
            SuggestedCaseData with default values
        """
        print("[DocumentAnalyzer] Using fallback case data")
        return SuggestedCaseData(
            documentOwnershipMismatch=False,
            documentClaimantName=None,
            title=f"Case regarding {filename}",
            caseType=CaseType.OTHER,
            description=f"Document uploaded: {filename}",
            claimantName=user_name or "User",
            opposingParty=None,
            caseNumber=None,
            courtName=None,
            filingDeadline=None,
            nextHearingDate=None,
            confidence=ConfidenceScores(
                title=0.3,
                caseType=0.3,
                description=0.3,
                opposingParty=0.0,
                caseNumber=0.0,
                courtName=0.0,
                filingDeadline=0.0,
                nextHearingDate=0.0
            ),
            extractedFrom=ExtractedFields()
        )

    def _validate_request(self, request: Any) -> bool:
        """
        Validate document analysis request.

        Args:
            request: Request object to validate

        Returns:
            True if valid, False otherwise
        """
        if request is None:
            return False

        # Check required fields
        if not hasattr(request, 'document') or not hasattr(request, 'userProfile'):
            return False

        # Check document has text
        if not request.document.text or not request.document.text.strip():
            print("[DocumentAnalyzer] ERROR: Document text is empty")
            return False

        # Check user profile has name
        if not request.userProfile.name or not request.userProfile.name.strip():
            print("[DocumentAnalyzer] ERROR: User profile name is empty")
            return False

        return True
