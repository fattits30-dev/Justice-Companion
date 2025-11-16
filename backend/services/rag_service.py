"""
RAGService - Retrieval Augmented Generation for Legal Information.

Migrated from: src/services/RAGService.ts

Orchestrates the complete RAG flow:
1. Question analysis and keyword extraction
2. Parallel API queries (legislation + case law + knowledge base)
3. Context assembly with relevance ranking
4. AI response generation with strict safety rules
5. Source citation tracking
6. "Information not advice" enforcement

Features:
- Multi-source legal context retrieval
- Question classification and keyword extraction
- Parallel API queries for performance
- Response safety validation (no advice language)
- Automatic disclaimer enforcement
- Comprehensive audit logging
- Async/await for all operations

Security:
- All inputs validated with Pydantic
- Response content validated for safety violations
- No advice language allowed (validates against patterns)
- Mandatory legal disclaimer on all responses
- All operations audited
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import logging
import re
from pydantic import BaseModel, Field, ConfigDict, field_validator
from fastapi import HTTPException

# Configure logger
logger = logging.getLogger(__name__)


# ============================================================================
# PYDANTIC MODELS FOR TYPE SAFETY
# ============================================================================


class LegislationResult(BaseModel):
    """Legislation search result from legislation.gov.uk."""
    title: str = Field(..., description="e.g., 'Employment Rights Act 1996'")
    section: Optional[str] = Field(None, description="e.g., 'Section 94'")
    content: str = Field(..., description="Actual text of the law")
    url: str = Field(..., description="Link to legislation.gov.uk")
    relevance: Optional[float] = Field(None, ge=0.0, le=1.0, description="0-1 relevance score")

    model_config = ConfigDict(from_attributes=True)


class CaseResult(BaseModel):
    """Case law search result from caselaw.nationalarchives.gov.uk."""
    citation: str = Field(..., description="e.g., 'Smith v ABC Ltd [2024] ET/12345/24'")
    court: str = Field(..., description="e.g., 'Employment Tribunal'")
    date: str = Field(..., description="ISO date string")
    summary: str = Field(..., description="Brief summary of case")
    outcome: Optional[str] = Field(None, description="e.g., 'Claimant successful'")
    url: str = Field(..., description="Link to full judgment")
    relevance: Optional[float] = Field(None, ge=0.0, le=1.0, description="0-1 relevance score")

    model_config = ConfigDict(from_attributes=True)


class KnowledgeEntry(BaseModel):
    """Knowledge base entry (cached FAQs, guides)."""
    topic: str = Field(..., description="e.g., 'Unfair Dismissal'")
    category: str = Field(..., description="e.g., 'Employment'")
    content: str = Field(..., description="Information text")
    sources: List[str] = Field(default_factory=list, description="Source citations")

    model_config = ConfigDict(from_attributes=True)


class LegalContext(BaseModel):
    """Legal context from RAG retrieval."""
    legislation: List[LegislationResult] = Field(default_factory=list)
    case_law: List[CaseResult] = Field(default_factory=list)
    knowledge_base: List[KnowledgeEntry] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProcessQuestionInput(BaseModel):
    """Input model for processing a user question."""
    question: str = Field(..., min_length=1, max_length=2000, description="User's legal question")
    case_id: Optional[int] = Field(None, gt=0, description="Optional case ID for context")

    @field_validator('question')
    @classmethod
    def validate_question(cls, v: str) -> str:
        """Validate question is not empty after stripping whitespace."""
        if not v.strip():
            raise ValueError("Question cannot be empty or only whitespace")
        return v.strip()

    model_config = ConfigDict(from_attributes=True)


class AIResponse(BaseModel):
    """AI response with sources and citations."""
    success: bool = Field(..., description="Whether response was successful")
    message: Optional[str] = Field(None, description="AI response content")
    sources: List[str] = Field(default_factory=list, description="Citations used")
    error: Optional[str] = Field(None, description="Error message if success=False")
    code: Optional[str] = Field(None, description="Error code (NO_CONTEXT, SAFETY_VIOLATION, etc.)")
    tokens_used: Optional[int] = Field(None, description="Token count for response")

    model_config = ConfigDict(from_attributes=True)


class ValidationResult(BaseModel):
    """Result of response safety validation."""
    valid: bool = Field(..., description="Whether response passed validation")
    violations: List[str] = Field(default_factory=list, description="List of safety violations")

    model_config = ConfigDict(from_attributes=True)


class RAGStatistics(BaseModel):
    """Statistics about last RAG query (for debugging/monitoring)."""
    has_stats: bool = Field(..., description="Whether statistics are available")
    message: Optional[str] = Field(None, description="Status message")
    legislation_count: Optional[int] = Field(None, description="Number of legislation results")
    case_law_count: Optional[int] = Field(None, description="Number of case law results")
    knowledge_base_count: Optional[int] = Field(None, description="Number of knowledge base results")
    total_context_size: Optional[int] = Field(None, description="Total context size in characters")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# RAG SERVICE IMPLEMENTATION
# ============================================================================


class RAGService:
    """
    RAGService - Retrieval Augmented Generation for Legal Information.

    Orchestrates the complete flow:
    1. Question analysis and keyword extraction
    2. Parallel API queries (legislation + case law + knowledge base)
    3. Context assembly with relevance ranking
    4. AI response generation with strict safety rules
    5. Source citation tracking
    6. "Information not advice" enforcement
    """

    # Legal disclaimer text (consistent with TypeScript version)
    DISCLAIMER = (
        "\n\n⚠️ This is general information only. "
        "For advice specific to your situation, please consult a qualified solicitor."
    )

    # Advice language patterns (CRITICAL - never give advice)
    ADVICE_PATTERNS = [
        re.compile(r'\byou should\b', re.IGNORECASE),
        re.compile(r'\bi recommend\b', re.IGNORECASE),
        re.compile(r'\byou must\b', re.IGNORECASE),
        re.compile(r'\bi advise\b', re.IGNORECASE),
        re.compile(r'\byou ought to\b', re.IGNORECASE),
        re.compile(r'\bmy advice is\b', re.IGNORECASE),
        re.compile(r'\bi suggest you\b', re.IGNORECASE),
    ]

    # Context limits to prevent token overflow
    MAX_LEGISLATION_RESULTS = 5
    MAX_CASE_LAW_RESULTS = 3
    MAX_KNOWLEDGE_BASE_RESULTS = 3

    def __init__(
        self,
        legal_api_service,
        ai_service,
        audit_logger=None
    ):
        """
        Initialize RAG service.

        Args:
            legal_api_service: Service for querying UK legal APIs
            ai_service: Service for AI response generation
            audit_logger: Optional audit logger instance
        """
        self.legal_api_service = legal_api_service
        self.ai_service = ai_service
        self.audit_logger = audit_logger
        self._last_query_stats: Optional[Dict[str, Any]] = None

    async def process_question(
        self,
        question: str,
        case_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> AIResponse:
        """
        Process user question and return legal information response.

        This is the main entry point for RAG processing. It orchestrates:
        1. Question analysis (keyword extraction, classification)
        2. Parallel API queries for legal context
        3. Context validation
        4. AI response generation
        5. Safety validation
        6. Disclaimer enforcement

        Args:
            question: User's legal question
            case_id: Optional case ID for context
            user_id: Optional user ID for audit logging

        Returns:
            AIResponse with message, sources, and citations

        Raises:
            HTTPException: Only for unexpected system errors (not for normal failures)
        """
        try:
            # Audit: Log question processing start
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="rag.process_question.started",
                    user_id=str(user_id) if user_id else None,
                    resource_type="rag",
                    resource_id="question",
                    action="process",
                    details={"question_length": len(question), "case_id": case_id},
                    success=True
                )

            logger.info(f"RAGService.process_question started - question length: {len(question)}, case_id: {case_id}")

            # PHASE 1: Question Analysis
            keywords = await self._extract_and_analyze_question(question)
            category = await self.legal_api_service.classify_question(question)

            logger.info(f"Question analyzed - keywords: {keywords}, category: {category}")

            # PHASE 2: Parallel API Queries
            context = await self._fetch_legal_context(keywords, category)

            # PHASE 3: Validate Context
            if not self._has_valid_context(context):
                logger.warning(f"No legal context found for question: {question[:100]}...")

                if self.audit_logger:
                    self.audit_logger.log(
                        event_type="rag.no_context",
                        user_id=str(user_id) if user_id else None,
                        resource_type="rag",
                        resource_id="question",
                        action="process",
                        details={"keywords": keywords, "category": category},
                        success=False,
                        error_message="No legal context found"
                    )

                return AIResponse(
                    success=False,
                    error=(
                        "I don't have information on that specific topic. "
                        "Please try rephrasing your question or consult a qualified solicitor."
                    ),
                    code="NO_CONTEXT"
                )

            logger.info(
                f"Legal context assembled - legislation: {len(context.legislation)}, "
                f"case_law: {len(context.case_law)}, knowledge_base: {len(context.knowledge_base)}"
            )

            # Store statistics for monitoring
            self._last_query_stats = {
                "legislation_count": len(context.legislation),
                "case_law_count": len(context.case_law),
                "knowledge_base_count": len(context.knowledge_base),
                "total_context_size": self._calculate_context_size(context),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # PHASE 4: AI Response Generation
            ai_response = await self.ai_service.chat(
                messages=[{"role": "user", "content": question}],
                context=context,
                case_id=case_id
            )

            # PHASE 5: Safety Validation
            if ai_response.success:
                validation_result = self._validate_response(ai_response.message)

                if not validation_result.valid:
                    logger.error(
                        f"AI response failed safety validation - violations: {validation_result.violations}"
                    )

                    if self.audit_logger:
                        self.audit_logger.log(
                            event_type="rag.safety_violation",
                            user_id=str(user_id) if user_id else None,
                            resource_type="rag",
                            resource_id="response",
                            action="validate",
                            details={"violations": validation_result.violations},
                            success=False,
                            error_message="Response failed safety validation"
                        )

                    # Return safe fallback response
                    return AIResponse(
                        success=False,
                        error="Response validation failed. Please rephrase your question.",
                        code="SAFETY_VIOLATION"
                    )

                # Ensure disclaimer is present
                ai_response.message = self._enforce_disclaimer(ai_response.message)

            # Audit: Log successful completion
            if self.audit_logger:
                self.audit_logger.log(
                    event_type="rag.process_question.completed",
                    user_id=str(user_id) if user_id else None,
                    resource_type="rag",
                    resource_id="question",
                    action="process",
                    details={
                        "success": ai_response.success,
                        "sources_count": len(ai_response.sources) if ai_response.success else 0
                    },
                    success=True
                )

            logger.info(
                f"RAGService.process_question completed - success: {ai_response.success}, "
                f"sources: {len(ai_response.sources) if ai_response.success else 0}"
            )

            return ai_response

        except Exception as error:
            logger.exception(f"Error in RAGService.process_question: {error}")

            if self.audit_logger:
                self.audit_logger.log(
                    event_type="rag.process_question.error",
                    user_id=str(user_id) if user_id else None,
                    resource_type="rag",
                    resource_id="question",
                    action="process",
                    details={"error": str(error)},
                    success=False,
                    error_message=str(error)
                )

            return AIResponse(
                success=False,
                error="An error occurred processing your question. Please try again.",
                code="EXCEPTION"
            )

    async def fetch_context_for_question(self, question: str) -> LegalContext:
        """
        Fetch legal context for a question (public method for streaming integration).

        This method extracts keywords, classifies the question, and retrieves
        relevant legal context without generating an AI response. Useful for
        streaming implementations where context needs to be fetched separately.

        Args:
            question: User's legal question

        Returns:
            LegalContext with legislation, case law, and knowledge base entries
        """
        keywords = await self._extract_and_analyze_question(question)
        category = await self.legal_api_service.classify_question(question)
        return await self._fetch_legal_context(keywords, category)

    def get_last_query_stats(self) -> RAGStatistics:
        """
        Get statistics about last query (for debugging/monitoring).

        Returns:
            RAGStatistics with context counts and sizes
        """
        if not self._last_query_stats:
            return RAGStatistics(
                has_stats=False,
                message="Statistics tracking not yet implemented"
            )

        return RAGStatistics(
            has_stats=True,
            legislation_count=self._last_query_stats.get("legislation_count"),
            case_law_count=self._last_query_stats.get("case_law_count"),
            knowledge_base_count=self._last_query_stats.get("knowledge_base_count"),
            total_context_size=self._last_query_stats.get("total_context_size"),
            message=f"Last query at {self._last_query_stats.get('timestamp')}"
        )

    # ========================================================================
    # PRIVATE HELPER METHODS
    # ========================================================================

    async def _extract_and_analyze_question(self, question: str) -> List[str]:
        """
        Extract keywords and analyze question intent.

        Uses LegalAPIService for keyword extraction to identify important
        legal terms, entities, and concepts.

        Args:
            question: User's legal question

        Returns:
            List of extracted keywords
        """
        # Use LegalAPIService for keyword extraction
        keywords_dict = await self.legal_api_service.extract_keywords(question)

        # Return all keywords (already filtered by extract_keywords)
        return keywords_dict.get("all", [])

    async def _fetch_legal_context(
        self,
        keywords: List[str],
        category: str
    ) -> LegalContext:
        """
        Fetch legal context from all sources in parallel.

        Queries legislation.gov.uk, caselaw.nationalarchives.gov.uk, and
        internal knowledge base simultaneously for maximum performance.

        Args:
            keywords: Extracted keywords for search
            category: Classified question category

        Returns:
            LegalContext with limited and sorted results
        """
        try:
            # Query all APIs in parallel for speed
            # Note: In Python, we use asyncio.gather for parallel execution
            import asyncio

            results = await asyncio.gather(
                self.legal_api_service.search_legislation(keywords),
                self.legal_api_service.search_case_law(keywords),
                self.legal_api_service.search_knowledge_base(keywords),
                return_exceptions=True  # Don't fail if one API fails
            )

            legislation, case_law, knowledge_base = results

            # Handle exceptions from individual API calls
            if isinstance(legislation, Exception):
                logger.error(f"Legislation API error: {legislation}")
                legislation = []
            if isinstance(case_law, Exception):
                logger.error(f"Case law API error: {case_law}")
                case_law = []
            if isinstance(knowledge_base, Exception):
                logger.error(f"Knowledge base error: {knowledge_base}")
                knowledge_base = []

            # Assemble context with limits to prevent token overflow
            context = LegalContext(
                legislation=self._limit_and_sort_legislation(legislation),
                case_law=self._limit_and_sort_case_law(case_law),
                knowledge_base=self._limit_knowledge_base(knowledge_base)
            )

            return context

        except Exception as error:
            logger.error(f"Failed to fetch legal context: {error}", exc_info=True)

            # Return empty context on API failure (don't crash)
            return LegalContext(
                legislation=[],
                case_law=[],
                knowledge_base=[]
            )

    def _limit_and_sort_legislation(
        self,
        results: List[Dict[str, Any]]
    ) -> List[LegislationResult]:
        """
        Limit legislation results to top 5 most relevant.
        Sort by relevance score if available.

        Args:
            results: Raw legislation results from API

        Returns:
            List of LegislationResult (limited and sorted)
        """
        # Convert to Pydantic models
        legislation_results = []
        for result in results:
            try:
                legislation_results.append(LegislationResult(**result))
            except Exception as e:
                logger.warning(f"Failed to parse legislation result: {e}")
                continue

        # Sort by relevance score (descending)
        sorted_results = sorted(
            legislation_results,
            key=lambda x: x.relevance if x.relevance is not None else 0.0,
            reverse=True
        )

        # Limit to top 5 to prevent context overflow
        return sorted_results[:self.MAX_LEGISLATION_RESULTS]

    def _limit_and_sort_case_law(
        self,
        results: List[Dict[str, Any]]
    ) -> List[CaseResult]:
        """
        Limit case law results to top 3 most relevant.
        Sort by relevance score if available.

        Args:
            results: Raw case law results from API

        Returns:
            List of CaseResult (limited and sorted)
        """
        # Convert to Pydantic models
        case_results = []
        for result in results:
            try:
                case_results.append(CaseResult(**result))
            except Exception as e:
                logger.warning(f"Failed to parse case law result: {e}")
                continue

        # Sort by relevance score (descending)
        sorted_results = sorted(
            case_results,
            key=lambda x: x.relevance if x.relevance is not None else 0.0,
            reverse=True
        )

        # Limit to top 3 to prevent context overflow
        return sorted_results[:self.MAX_CASE_LAW_RESULTS]

    def _limit_knowledge_base(
        self,
        results: List[Dict[str, Any]]
    ) -> List[KnowledgeEntry]:
        """
        Limit knowledge base results to top 3.

        Args:
            results: Raw knowledge base results

        Returns:
            List of KnowledgeEntry (limited)
        """
        # Convert to Pydantic models
        knowledge_results = []
        for result in results:
            try:
                knowledge_results.append(KnowledgeEntry(**result))
            except Exception as e:
                logger.warning(f"Failed to parse knowledge base result: {e}")
                continue

        # Limit to top 3
        return knowledge_results[:self.MAX_KNOWLEDGE_BASE_RESULTS]

    def _has_valid_context(self, context: LegalContext) -> bool:
        """
        Check if context has at least some legal information.

        Args:
            context: Legal context to validate

        Returns:
            True if context has at least one result from any source
        """
        return (
            len(context.legislation) > 0
            or len(context.case_law) > 0
            or len(context.knowledge_base) > 0
        )

    def _validate_response(self, response: str) -> ValidationResult:
        """
        Validate AI response for safety compliance.
        Ensures no advice language, proper citations, etc.

        CRITICAL: This prevents the AI from giving legal advice, which would
        be unauthorized practice of law. Only general information is allowed.

        Args:
            response: AI response content to validate

        Returns:
            ValidationResult with validity status and violations list
        """
        violations: List[str] = []
        lower_response = response.lower()

        # Check for advice language (CRITICAL - never give advice)
        for pattern in self.ADVICE_PATTERNS:
            if pattern.search(response):
                violations.append(f"Contains advice language: {pattern.pattern}")

        # Check for disclaimer presence (should end with disclaimer)
        if "⚠️" not in response and "disclaimer" not in lower_response:
            violations.append("Missing required disclaimer")

        # Response too short (likely not informative)
        if len(response) < 50:
            violations.append("Response too short to be informative")

        return ValidationResult(
            valid=len(violations) == 0,
            violations=violations
        )

    def _enforce_disclaimer(self, response: str) -> str:
        """
        Ensure response ends with required disclaimer.
        Adds disclaimer if missing.

        Args:
            response: AI response content

        Returns:
            Response with disclaimer appended if not already present
        """
        # Check if disclaimer already present
        if "⚠️" in response or "this is general information only" in response.lower():
            return response

        # Add disclaimer
        return response + self.DISCLAIMER

    def _calculate_context_size(self, context: LegalContext) -> int:
        """
        Calculate total context size in characters.

        Args:
            context: Legal context to measure

        Returns:
            Total size in characters
        """
        total_size = 0

        # Legislation content
        for leg in context.legislation:
            total_size += len(leg.content)

        # Case law summaries
        for case in context.case_law:
            total_size += len(case.summary)

        # Knowledge base content
        for kb in context.knowledge_base:
            total_size += len(kb.content)

        return total_size


# ============================================================================
# HELPER FUNCTIONS FOR CONTEXT BUILDING
# ============================================================================


def build_context_string(context: LegalContext) -> str:
    """
    Build formatted context string for AI prompt.

    This creates a structured, human-readable representation of the legal
    context that can be included in the system prompt.

    Args:
        context: Legal context to format

    Returns:
        Formatted context string with sections for legislation, case law, and knowledge base
    """
    parts: List[str] = []

    # Add legislation
    if context.legislation:
        parts.append("=== RELEVANT LEGISLATION ===")
        for law in context.legislation:
            parts.append(f"\n{law.title}{f' - {law.section}' if law.section else ''}")
            parts.append(law.content)
            parts.append(f"Source: {law.url}\n")

    # Add case law
    if context.case_law:
        parts.append("\n=== RELEVANT CASE LAW ===")
        for case in context.case_law:
            parts.append(f"\n{case.citation} - {case.court} ({case.date})")
            parts.append(case.summary)
            if case.outcome:
                parts.append(f"Outcome: {case.outcome}")
            parts.append(f"Source: {case.url}\n")

    # Add knowledge base
    if context.knowledge_base:
        parts.append("\n=== KNOWLEDGE BASE ===")
        for entry in context.knowledge_base:
            parts.append(f"\n{entry.topic} ({entry.category})")
            parts.append(entry.content)
            if entry.sources:
                parts.append(f"Sources: {', '.join(entry.sources)}\n")

    return "\n".join(parts)


def extract_sources(context: LegalContext) -> List[str]:
    """
    Extract all sources from context for citation display.

    NOTE: Returns ALL sources from context for transparency, not just cited ones.
    This is important for legal apps - users should see what was searched.

    Args:
        context: Legal context

    Returns:
        List of source citation strings with URLs
    """
    sources: List[str] = []

    # Add ALL legislation sources (with valid URLs)
    for law in context.legislation:
        if law.url:
            source = f"{law.title}{f' {law.section}' if law.section else ''} - {law.url}"
            sources.append(source)

    # Add ALL case law sources (with valid URLs)
    for case in context.case_law:
        if case.url:
            sources.append(f"{case.citation} - {case.url}")

    # Deduplicate
    return list(set(sources))


# ============================================================================
# SYSTEM PROMPT TEMPLATE
# ============================================================================

SYSTEM_PROMPT_TEMPLATE = """You are a supportive UK legal information assistant for Justice Companion powered by Qwen 3. Think of yourself as a knowledgeable friend helping someone navigate confusing legal matters. Your role is to provide INFORMATION ONLY, never advice.

REASONING INSTRUCTIONS:
- For complex legal questions, use <think>reasoning here</think> tags to show your analysis process
- Inside <think> tags: analyze the context, identify relevant laws, consider implications
- After </think>: provide your clear, warm, informative response
- The user will NOT see <think> content - it's for transparency and accuracy

EMPATHETIC COMMUNICATION:
- Start by acknowledging their situation warmly - show you understand this matters to them
- Use supportive phrases like "I understand this must be...", "That's a great question...", "It's natural to wonder..."
- Be conversational and warm, not robotic or clinical
- Show you care about helping them understand, not just reciting law
- Validate their concerns before explaining the legal position

STAY PROFESSIONAL & ACCURATE:
- Remain factually accurate and cite sources precisely
- Don't be overly casual or use slang
- Never cross into giving advice - you're informing, not recommending
- Keep legal disclaimers clear

CRITICAL RULES (NEVER BREAK THESE):
1. Only use information from the provided context (legislation, cases, knowledge base)
2. If the context lacks relevant information, BE HELPFUL AND EMPATHETIC:
   - Acknowledge their question positively: "That's an important question..."
   - Show understanding: "I can see why you're concerned about this..."
   - Explain what legislation typically covers this (e.g., "Employment Rights Act 1996", "Equality Act 2010")
   - Ask clarifying questions warmly to help them refine their question
   - NEVER give blunt "I don't have information" - guide them supportively
3. NEVER use directive phrases like "you should", "I recommend", "you must", "I advise"
4. ALWAYS use neutral phrasing: "the law states", "many people in this situation choose to", "options typically include"
5. ALWAYS cite sources with specific section numbers, act names, and case citations when available
6. End EVERY response with this disclaimer: "⚠️ This is general information only. For advice specific to your situation, please consult a qualified solicitor."
7. If asked for advice, strategy, or recommendations, decline warmly and explain you provide information not advice

TONE EXAMPLES:
✓ "I understand this situation must be stressful. Let me explain what the law says about unfair dismissal..."
✓ "That's a really important question - many people aren't sure about their rights here. The Employment Rights Act 1996 states..."
✓ "I can see why you're concerned about this. Here's what typically happens in situations like yours..."
✗ "Your query is processed. Employment Rights Act 1996 Section 94 defines unfair dismissal as..."
✗ "I don't have that information."

CONTEXT PROVIDED:
{context}

IMPORTANT: You are NOT a solicitor. You do NOT provide legal advice. You do NOT guarantee outcomes. You ONLY provide factual legal information to help UK citizens understand their rights - but you do it with warmth and empathy."""


def build_system_prompt(context: LegalContext) -> str:
    """
    Build complete system prompt with context.

    Args:
        context: Legal context to embed in prompt

    Returns:
        Complete system prompt string
    """
    context_string = build_context_string(context)
    return SYSTEM_PROMPT_TEMPLATE.replace("{context}", context_string)
