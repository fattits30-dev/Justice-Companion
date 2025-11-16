"""
Example usage of RAGService for legal question processing.

This demonstrates:
1. Basic question processing
2. Context fetching for streaming
3. Query statistics monitoring
4. Error handling
5. Integration with audit logging
"""

import asyncio
from typing import Optional

# Mock services for demonstration (replace with real implementations)
class MockLegalAPIService:
    """Mock LegalAPIService for demonstration."""

    async def extract_keywords(self, question: str) -> dict:
        """Extract keywords from question."""
        # Simple keyword extraction (real implementation would be more sophisticated)
        keywords = [word.lower() for word in question.split() if len(word) > 4]
        return {"all": keywords, "legal": [], "general": keywords}

    async def classify_question(self, question: str) -> str:
        """Classify question by legal category."""
        question_lower = question.lower()
        if "dismiss" in question_lower or "employment" in question_lower:
            return "employment"
        elif "housing" in question_lower or "tenant" in question_lower:
            return "housing"
        else:
            return "general"

    async def search_legislation(self, keywords: list) -> list:
        """Search legislation.gov.uk (mock)."""
        if not keywords:
            return []
        return [
            {
                "title": "Employment Rights Act 1996",
                "section": "Section 94",
                "content": "An employee has the right not to be unfairly dismissed by his employer.",
                "url": "https://www.legislation.gov.uk/ukpga/1996/18/section/94",
                "relevance": 0.95
            }
        ]

    async def search_case_law(self, keywords: list) -> list:
        """Search caselaw.nationalarchives.gov.uk (mock)."""
        if not keywords:
            return []
        return [
            {
                "citation": "Smith v ABC Ltd [2024] ET/12345/24",
                "court": "Employment Tribunal",
                "date": "2024-03-15",
                "summary": "Claimant successfully proved unfair dismissal due to lack of fair procedure.",
                "outcome": "Claimant successful",
                "url": "https://caselaw.nationalarchives.gov.uk/eat/2024/123",
                "relevance": 0.90
            }
        ]

    async def search_knowledge_base(self, keywords: list) -> list:
        """Search internal knowledge base (mock)."""
        if not keywords:
            return []
        return [
            {
                "topic": "Unfair Dismissal",
                "category": "Employment",
                "content": (
                    "Unfair dismissal occurs when an employer terminates employment without "
                    "valid reason or fair procedure. The law requires employers to have one of "
                    "five potentially fair reasons and to follow a fair process."
                ),
                "sources": ["ACAS Code of Practice 2024", "Citizens Advice Guide"]
            }
        ]


class MockAIService:
    """Mock AIService for demonstration."""

    async def chat(self, messages: list, context, case_id: Optional[int] = None):
        """Generate AI response (mock)."""
        from backend.services.rag_service import AIResponse

        # Simulate AI processing delay
        await asyncio.sleep(0.1)

        response_text = (
            "I understand this situation must be stressful. Let me explain what the law says about unfair dismissal.\n\n"
            "The Employment Rights Act 1996 Section 94 states that an employee has the right not to be unfairly dismissed. "
            "This means your employer must have a valid reason (such as conduct, capability, or redundancy) and must follow "
            "a fair procedure.\n\n"
            "In the case of Smith v ABC Ltd [2024] ET/12345/24, the Employment Tribunal found that the claimant was unfairly "
            "dismissed because the employer failed to follow a fair procedure. This demonstrates the importance of proper process.\n\n"
            "Many people in this situation choose to:\n"
            "- Raise a formal grievance with their employer\n"
            "- Contact ACAS for free early conciliation\n"
            "- Consider filing an employment tribunal claim (within 3 months less one day)\n\n"
            "⚠️ This is general information only. For advice specific to your situation, please consult a qualified solicitor."
        )

        return AIResponse(
            success=True,
            message=response_text,
            sources=[
                "Employment Rights Act 1996 Section 94 - https://www.legislation.gov.uk/ukpga/1996/18/section/94",
                "Smith v ABC Ltd [2024] ET/12345/24 - https://caselaw.nationalarchives.gov.uk/eat/2024/123"
            ],
            tokens_used=250
        )


class MockAuditLogger:
    """Mock AuditLogger for demonstration."""

    def log(self, event_type: str, user_id: Optional[str], resource_type: str,
            resource_id: str, action: str, details: Optional[dict] = None,
            success: bool = True, error_message: Optional[str] = None):
        """Log audit event (mock)."""
        print(f"[AUDIT] {event_type}: {action} on {resource_type}/{resource_id} by user {user_id} - {'✓' if success else '✗'}")
        if details:
            print(f"        Details: {details}")
        if error_message:
            print(f"        Error: {error_message}")


# ============================================================================
# EXAMPLE 1: BASIC QUESTION PROCESSING
# ============================================================================


async def example_basic_processing():
    """Demonstrate basic question processing."""
    print("\n" + "="*80)
    print("EXAMPLE 1: Basic Question Processing")
    print("="*80 + "\n")

    from backend.services.rag_service import RAGService

    # Initialize services
    legal_api = MockLegalAPIService()
    ai_service = MockAIService()
    audit_logger = MockAuditLogger()

    # Create RAG service
    rag_service = RAGService(
        legal_api_service=legal_api,
        ai_service=ai_service,
        audit_logger=audit_logger
    )

    # Process question
    question = "What are my rights if I was unfairly dismissed from my job?"
    print(f"Question: {question}\n")

    response = await rag_service.process_question(
        question=question,
        case_id=123,
        user_id=456
    )

    # Display response
    if response.success:
        print("✓ Response generated successfully!\n")
        print("Response:")
        print("-" * 80)
        print(response.message)
        print("-" * 80)
        print(f"\nSources ({len(response.sources)}):")
        for i, source in enumerate(response.sources, 1):
            print(f"  {i}. {source}")
        print(f"\nTokens used: {response.tokens_used}")
    else:
        print(f"✗ Error: {response.error}")
        print(f"   Code: {response.code}")


# ============================================================================
# EXAMPLE 2: CONTEXT FETCHING FOR STREAMING
# ============================================================================


async def example_context_fetching():
    """Demonstrate context fetching for streaming integration."""
    print("\n" + "="*80)
    print("EXAMPLE 2: Context Fetching for Streaming")
    print("="*80 + "\n")

    from backend.services.rag_service import RAGService, build_context_string

    # Initialize services
    legal_api = MockLegalAPIService()
    ai_service = MockAIService()

    # Create RAG service
    rag_service = RAGService(
        legal_api_service=legal_api,
        ai_service=ai_service
    )

    # Fetch context
    question = "What is unfair dismissal?"
    print(f"Question: {question}\n")

    context = await rag_service.fetch_context_for_question(question)

    # Display context
    print(f"✓ Context fetched successfully!\n")
    print(f"Legislation results: {len(context.legislation)}")
    print(f"Case law results: {len(context.case_law)}")
    print(f"Knowledge base results: {len(context.knowledge_base)}\n")

    print("Context preview:")
    print("-" * 80)
    context_str = build_context_string(context)
    print(context_str[:500] + "..." if len(context_str) > 500 else context_str)
    print("-" * 80)


# ============================================================================
# EXAMPLE 3: QUERY STATISTICS MONITORING
# ============================================================================


async def example_statistics():
    """Demonstrate query statistics monitoring."""
    print("\n" + "="*80)
    print("EXAMPLE 3: Query Statistics Monitoring")
    print("="*80 + "\n")

    from backend.services.rag_service import RAGService

    # Initialize services
    legal_api = MockLegalAPIService()
    ai_service = MockAIService()

    # Create RAG service
    rag_service = RAGService(
        legal_api_service=legal_api,
        ai_service=ai_service
    )

    # Process multiple questions
    questions = [
        "What is unfair dismissal?",
        "Can I be fired while pregnant?",
        "What is the notice period for redundancy?"
    ]

    for i, question in enumerate(questions, 1):
        print(f"\nProcessing question {i}/{len(questions)}: {question}")

        response = await rag_service.process_question(
            question=question,
            user_id=789
        )

        if response.success:
            print(f"  ✓ Success")

            # Get statistics for this query
            stats = rag_service.get_last_query_stats()
            if stats.has_stats:
                print(f"  📊 Stats: {stats.legislation_count} legislation, "
                      f"{stats.case_law_count} cases, {stats.knowledge_base_count} KB entries")
                print(f"     Context size: {stats.total_context_size} characters")
        else:
            print(f"  ✗ Failed: {response.code}")


# ============================================================================
# EXAMPLE 4: ERROR HANDLING
# ============================================================================


async def example_error_handling():
    """Demonstrate error handling scenarios."""
    print("\n" + "="*80)
    print("EXAMPLE 4: Error Handling")
    print("="*80 + "\n")

    from backend.services.rag_service import RAGService

    # Create service with empty results
    class EmptyLegalAPIService(MockLegalAPIService):
        async def search_legislation(self, keywords):
            return []
        async def search_case_law(self, keywords):
            return []
        async def search_knowledge_base(self, keywords):
            return []

    legal_api = EmptyLegalAPIService()
    ai_service = MockAIService()
    audit_logger = MockAuditLogger()

    rag_service = RAGService(
        legal_api_service=legal_api,
        ai_service=ai_service,
        audit_logger=audit_logger
    )

    # Test 1: Question with no context
    print("Test 1: Question with no legal context")
    response = await rag_service.process_question(
        question="What is the meaning of life?",
        user_id=999
    )

    if not response.success:
        print(f"  ✓ Correctly returned error")
        print(f"    Code: {response.code}")
        print(f"    Message: {response.error}\n")

    # Test 2: Invalid input
    print("Test 2: Invalid question input")
    from backend.services.rag_service import ProcessQuestionInput
    from pydantic import ValidationError

    try:
        invalid_input = ProcessQuestionInput(question="", case_id=123)
        print("  ✗ Should have raised ValidationError")
    except ValidationError as e:
        print(f"  ✓ Correctly raised ValidationError")
        print(f"    {e.errors()[0]['msg']}")


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================


async def main():
    """Run all examples."""
    print("\n" + "="*80)
    print("RAG SERVICE USAGE EXAMPLES")
    print("="*80)

    try:
        await example_basic_processing()
        await example_context_fetching()
        await example_statistics()
        await example_error_handling()

        print("\n" + "="*80)
        print("ALL EXAMPLES COMPLETED SUCCESSFULLY")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n✗ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run examples
    asyncio.run(main())
