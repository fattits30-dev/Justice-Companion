"""
Agent Tools
===========
Wrappers for service functions to be used by agents.
"""

from typing import Dict, Any, List, Optional
from routes.research import search_legislation, search_case_law, ResearchArea
from routes.drafting import generate_draft, LetterType


async def research_legislation_tool(
    query: str, area: str = "general", max_results: int = 5
) -> str:
    """
    Search for UK legislation.
    Args:
        query: Search terms
        area: Legal area (employment, housing, etc.)
        max_results: Number of results
    """
    try:
        area_enum = ResearchArea(area.lower())
    except ValueError:
        area_enum = ResearchArea.GENERAL

    results = await search_legislation(query, area_enum, max_results)

    if not results:
        return "No legislation found."

    return "\n".join(
        [f"- {r.title} ({r.year}): {r.summary}\n  URL: {r.url}" for r in results]
    )


async def research_case_law_tool(
    query: str, area: str = "general", max_results: int = 5
) -> str:
    """
    Search for UK case law.
    Args:
        query: Search terms
        area: Legal area
        max_results: Number of results
    """
    try:
        area_enum = ResearchArea(area.lower())
    except ValueError:
        area_enum = ResearchArea.GENERAL

    results = await search_case_law(query, area_enum, max_results)

    if not results:
        return "No case law found."

    return "\n".join([f"- {r.case_name} ({r.citation}): {r.summary}" for r in results])


def create_drafting_tool(client: Any):
    """Factory to create drafting tool with bound client"""

    async def draft_letter_tool(
        letter_type: str,
        recipient: str,
        subject: str,
        key_points: List[str],
        tone: str = "formal",
        case_context: Optional[str] = None,
    ) -> str:
        """
        Draft a legal letter.
        Args:
            letter_type: grievance, appeal, complaint, etc.
            recipient: Who the letter is for
            subject: Letter subject
            key_points: List of points to include
            tone: formal, firm, etc.
            case_context: Background info
        """
        try:
            type_enum = LetterType(letter_type.lower())
        except ValueError:
            # Default to response if unknown
            type_enum = LetterType.RESPONSE

        return await generate_draft(
            client=client,
            letter_type=type_enum,
            recipient=recipient,
            subject=subject,
            key_points=key_points,
            tone=tone,
            case_context=case_context,
        )

    return draft_letter_tool


def get_agent_tools(client: Any) -> Dict[str, Any]:
    """Get all available tools"""
    return {
        "research_legislation": research_legislation_tool,
        "research_case_law": research_case_law_tool,
        "draft_letter": create_drafting_tool(client),
    }
