"""
Justice Agent Custom Tools

MCP tools for integrating with Justice Companion backend
and providing UK civil law assistance.
"""

from .case_tools import (
    get_case_details,
    search_cases,
    get_case_deadlines,
    get_case_evidence,
    add_case_note,
    case_management_server,
)
from .legal_tools import (
    search_uk_legislation,
    get_court_procedures,
    calculate_deadline,
    legal_research_server,
)

__all__ = [
    # Case management tools
    "get_case_details",
    "search_cases",
    "get_case_deadlines",
    "get_case_evidence",
    "add_case_note",
    "case_management_server",
    # Legal research tools
    "search_uk_legislation",
    "get_court_procedures",
    "calculate_deadline",
    "legal_research_server",
]
