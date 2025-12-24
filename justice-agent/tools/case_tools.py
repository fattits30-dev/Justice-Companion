"""
Case Management Tools

Custom MCP tools for interacting with Justice Companion cases.
These tools allow the agent to query, search, and update case information.
"""

import logging
import os
from typing import Any

import httpx
from claude_agent_sdk import tool, create_sdk_mcp_server

# Configure logging
logger = logging.getLogger("justice-agent.tools.case")

# Backend API configuration
API_BASE_URL = os.getenv("JUSTICE_COMPANION_API_URL", "http://localhost:8000")
API_TOKEN = os.getenv("JUSTICE_COMPANION_TOKEN", "")


def get_headers() -> dict[str, str]:
    """Get HTTP headers for API requests."""
    headers = {"Content-Type": "application/json"}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"
    return headers


def validate_case_id(case_id: Any) -> tuple[bool, str | None]:
    """Validate case ID input.

    Returns:
        Tuple of (is_valid, error_message)
    """
    if case_id is None:
        return False, "Case ID is required"
    if not isinstance(case_id, (int, float)):
        return False, f"Case ID must be a number, got {type(case_id).__name__}"
    if case_id <= 0:
        return False, "Case ID must be a positive number"
    return True, None


@tool(
    "get_case_details",
    "Retrieve detailed information about a specific case by ID. Returns case title, status, parties, dates, and summary.",
    {"case_id": int}
)
async def get_case_details(args: dict[str, Any]) -> dict[str, Any]:
    """Fetch case details from Justice Companion API."""
    case_id = args.get("case_id")

    # Validate input
    is_valid, error_msg = validate_case_id(case_id)
    if not is_valid:
        logger.warning(f"Invalid case_id: {case_id} - {error_msg}")
        return {
            "content": [{"type": "text", "text": error_msg}],
            "is_error": True
        }

    case_id = int(case_id)  # Ensure integer
    logger.debug(f"Fetching case details for case_id={case_id}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_BASE_URL}/api/cases/{case_id}",
                headers=get_headers(),
                timeout=30.0
            )

            if response.status_code == 200:
                case_data = response.json()
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Case #{case_id}: {case_data.get('title', 'Untitled')}\n"
                               f"Status: {case_data.get('status', 'Unknown')}\n"
                               f"Type: {case_data.get('case_type', 'Not specified')}\n"
                               f"Created: {case_data.get('created_at', 'Unknown')}\n"
                               f"Description: {case_data.get('description', 'No description')}"
                    }]
                }
            elif response.status_code == 404:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Case #{case_id} not found."
                    }],
                    "is_error": True
                }
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Failed to fetch case: HTTP {response.status_code}"
                    }],
                    "is_error": True
                }
    except httpx.TimeoutException:
        return {
            "content": [{
                "type": "text",
                "text": "Request timed out. Please check if the Justice Companion backend is running."
            }],
            "is_error": True
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error fetching case: {str(e)}"
            }],
            "is_error": True
        }


@tool(
    "search_cases",
    "Search for cases matching a query. Searches case titles, descriptions, and notes.",
    {"query": str, "status": str, "limit": int}
)
async def search_cases(args: dict[str, Any]) -> dict[str, Any]:
    """Search cases in Justice Companion."""
    query = args.get("query", "")
    status = args.get("status", "")
    limit = args.get("limit", 10)

    try:
        async with httpx.AsyncClient() as client:
            params = {"q": query, "limit": limit}
            if status:
                params["status"] = status

            response = await client.get(
                f"{API_BASE_URL}/api/cases",
                params=params,
                headers=get_headers(),
                timeout=30.0
            )

            if response.status_code == 200:
                cases = response.json()
                if not cases:
                    return {
                        "content": [{
                            "type": "text",
                            "text": f"No cases found matching '{query}'"
                        }]
                    }

                result_lines = [f"Found {len(cases)} case(s):"]
                for case in cases[:limit]:
                    result_lines.append(
                        f"  - #{case.get('id')}: {case.get('title')} ({case.get('status', 'unknown')})"
                    )

                return {
                    "content": [{
                        "type": "text",
                        "text": "\n".join(result_lines)
                    }]
                }
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Search failed: HTTP {response.status_code}"
                    }],
                    "is_error": True
                }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error searching cases: {str(e)}"
            }],
            "is_error": True
        }


@tool(
    "get_case_deadlines",
    "Get all deadlines for a specific case, including court dates and filing deadlines.",
    {"case_id": int}
)
async def get_case_deadlines(args: dict[str, Any]) -> dict[str, Any]:
    """Fetch deadlines for a case."""
    case_id = args["case_id"]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_BASE_URL}/api/deadlines",
                params={"case_id": case_id},
                headers=get_headers(),
                timeout=30.0
            )

            if response.status_code == 200:
                deadlines = response.json()
                if not deadlines:
                    return {
                        "content": [{
                            "type": "text",
                            "text": f"No deadlines found for case #{case_id}"
                        }]
                    }

                result_lines = [f"Deadlines for case #{case_id}:"]
                for dl in deadlines:
                    status_emoji = "⚠️" if dl.get("is_overdue") else "📅"
                    result_lines.append(
                        f"  {status_emoji} {dl.get('due_date')}: {dl.get('title')} "
                        f"({dl.get('priority', 'normal')} priority)"
                    )

                return {
                    "content": [{
                        "type": "text",
                        "text": "\n".join(result_lines)
                    }]
                }
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Failed to fetch deadlines: HTTP {response.status_code}"
                    }],
                    "is_error": True
                }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error fetching deadlines: {str(e)}"
            }],
            "is_error": True
        }


@tool(
    "get_case_evidence",
    "List all evidence items attached to a case.",
    {"case_id": int}
)
async def get_case_evidence(args: dict[str, Any]) -> dict[str, Any]:
    """Fetch evidence for a case."""
    case_id = args["case_id"]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{API_BASE_URL}/api/evidence",
                params={"case_id": case_id},
                headers=get_headers(),
                timeout=30.0
            )

            if response.status_code == 200:
                evidence_items = response.json()
                if not evidence_items:
                    return {
                        "content": [{
                            "type": "text",
                            "text": f"No evidence found for case #{case_id}"
                        }]
                    }

                result_lines = [f"Evidence for case #{case_id}:"]
                for item in evidence_items:
                    result_lines.append(
                        f"  - [{item.get('type', 'document')}] {item.get('title')}: "
                        f"{item.get('description', 'No description')[:100]}"
                    )

                return {
                    "content": [{
                        "type": "text",
                        "text": "\n".join(result_lines)
                    }]
                }
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Failed to fetch evidence: HTTP {response.status_code}"
                    }],
                    "is_error": True
                }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error fetching evidence: {str(e)}"
            }],
            "is_error": True
        }


@tool(
    "add_case_note",
    "Add a note to a case. Notes can be used for research findings, reminders, or observations.",
    {"case_id": int, "note": str, "note_type": str}
)
async def add_case_note(args: dict[str, Any]) -> dict[str, Any]:
    """Add a note to a case."""
    case_id = args["case_id"]
    note = args["note"]
    note_type = args.get("note_type", "general")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE_URL}/api/cases/{case_id}/notes",
                json={"content": note, "type": note_type},
                headers=get_headers(),
                timeout=30.0
            )

            if response.status_code in (200, 201):
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Note added to case #{case_id} successfully."
                    }]
                }
            else:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Failed to add note: HTTP {response.status_code}"
                    }],
                    "is_error": True
                }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error adding note: {str(e)}"
            }],
            "is_error": True
        }


# Create the MCP server with all case management tools
case_management_server = create_sdk_mcp_server(
    name="case_management",
    version="1.0.0",
    tools=[
        get_case_details,
        search_cases,
        get_case_deadlines,
        get_case_evidence,
        add_case_note,
    ]
)
