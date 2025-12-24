"""
Legal Research Tools

Custom MCP tools for UK civil law research and procedural guidance.
These tools provide legal information without constituting legal advice.
"""

from datetime import datetime, timedelta
from typing import Any

from claude_agent_sdk import tool, create_sdk_mcp_server

# UK Civil Law Knowledge Base (simplified for demonstration)
UK_LEGISLATION = {
    "civil_procedure_rules": {
        "title": "Civil Procedure Rules 1998",
        "description": "The procedural code for civil courts in England and Wales",
        "key_parts": [
            "Part 1 - Overriding Objective",
            "Part 7 - How to Start Proceedings",
            "Part 14 - Admissions",
            "Part 26 - Case Management",
            "Part 36 - Offers to Settle",
        ]
    },
    "limitation_act": {
        "title": "Limitation Act 1980",
        "description": "Sets time limits for bringing legal claims",
        "key_periods": {
            "contract": "6 years from breach",
            "tort": "6 years from damage",
            "personal_injury": "3 years from injury or knowledge",
            "defamation": "1 year from publication",
            "land": "12 years"
        }
    },
    "consumer_rights": {
        "title": "Consumer Rights Act 2015",
        "description": "Consolidated consumer protection legislation",
        "key_areas": ["goods", "services", "digital_content", "unfair_terms"]
    }
}

COURT_TRACKS = {
    "small_claims": {
        "limit": 10000,
        "description": "For claims up to £10,000 (or £1,000 for personal injury)",
        "features": ["informal", "no_costs_recovery", "limited_disclosure"]
    },
    "fast_track": {
        "limit": 25000,
        "description": "For claims between £10,000 and £25,000",
        "trial_length": "1 day maximum",
        "features": ["standard_directions", "fixed_costs"]
    },
    "multi_track": {
        "limit": None,
        "description": "For claims over £25,000 or complex cases",
        "features": ["case_management_conference", "flexible_directions"]
    }
}


@tool(
    "search_uk_legislation",
    "Search UK civil law legislation and regulations. Returns relevant statutes and key provisions.",
    {"query": str, "category": str}
)
async def search_uk_legislation(args: dict[str, Any]) -> dict[str, Any]:
    """Search UK legislation knowledge base."""
    query = args.get("query", "").lower()
    category = args.get("category", "all")

    results = []

    for key, law in UK_LEGISLATION.items():
        if category != "all" and category.lower() not in key:
            continue

        if query in law["title"].lower() or query in law["description"].lower():
            result_text = f"**{law['title']}**\n{law['description']}"

            if "key_parts" in law:
                result_text += "\n\nKey Parts:\n" + "\n".join(f"  - {p}" for p in law["key_parts"])
            if "key_periods" in law:
                result_text += "\n\nLimitation Periods:\n"
                for claim_type, period in law["key_periods"].items():
                    result_text += f"  - {claim_type.replace('_', ' ').title()}: {period}\n"
            if "key_areas" in law:
                result_text += "\n\nKey Areas: " + ", ".join(law["key_areas"])

            results.append(result_text)

    if results:
        return {
            "content": [{
                "type": "text",
                "text": "\n\n---\n\n".join(results)
            }]
        }
    else:
        return {
            "content": [{
                "type": "text",
                "text": f"No legislation found matching '{query}'. "
                       "Try broader terms like 'procedure', 'limitation', or 'consumer'."
            }]
        }


@tool(
    "get_court_procedures",
    "Get information about UK civil court procedures, including track allocation and timelines.",
    {"claim_value": int, "claim_type": str}
)
async def get_court_procedures(args: dict[str, Any]) -> dict[str, Any]:
    """Get court procedure information based on claim value."""
    claim_value = args.get("claim_value", 0)
    claim_type = args.get("claim_type", "general")

    # Determine appropriate track
    if claim_value <= 10000:
        track = COURT_TRACKS["small_claims"]
        track_name = "Small Claims Track"
    elif claim_value <= 25000:
        track = COURT_TRACKS["fast_track"]
        track_name = "Fast Track"
    else:
        track = COURT_TRACKS["multi_track"]
        track_name = "Multi-Track"

    result = f"""**Recommended Track: {track_name}**

Claim Value: £{claim_value:,}
Description: {track['description']}

**Key Features:**
"""
    for feature in track["features"]:
        result += f"  - {feature.replace('_', ' ').title()}\n"

    if "trial_length" in track:
        result += f"\nTypical Trial Length: {track['trial_length']}"

    # Add general procedure steps
    result += """

**General Procedure Steps:**
1. Pre-action Protocol compliance (exchange of information)
2. Issue Claim Form (N1) at court
3. Serve claim on defendant (within 4 months of issue)
4. Defendant files acknowledgment/defence (14-28 days)
5. Track allocation by court
6. Case management directions
7. Exchange of evidence/disclosure
8. Trial preparation
9. Trial and judgment

**Important:** This is general guidance only. Court procedures may vary
based on specific circumstances. Consider seeking professional legal advice.
"""

    return {
        "content": [{
            "type": "text",
            "text": result
        }]
    }


@tool(
    "calculate_deadline",
    "Calculate legal deadlines based on UK civil procedure rules. Returns key dates and reminders.",
    {"start_date": str, "deadline_type": str, "court_track": str}
)
async def calculate_deadline(args: dict[str, Any]) -> dict[str, Any]:
    """Calculate legal deadlines based on CPR rules."""
    start_date_str = args.get("start_date", datetime.now().strftime("%Y-%m-%d"))
    deadline_type = args.get("deadline_type", "defence")
    court_track = args.get("court_track", "fast_track")

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    except ValueError:
        return {
            "content": [{
                "type": "text",
                "text": f"Invalid date format: {start_date_str}. Use YYYY-MM-DD format."
            }],
            "is_error": True
        }

    # Define deadline periods (in days)
    deadlines = {
        "acknowledgment": 14,  # CPR Part 10
        "defence": 28,  # CPR Part 15 (14 days after acknowledgment deadline)
        "claim_service": 122,  # 4 months from issue
        "particulars": 14,  # After service of claim form
        "reply": 14,  # After service of defence
        "disclosure": 28,  # Standard disclosure period
        "witness_statements": 42,  # 6 weeks typical
        "expert_reports": 56,  # 8 weeks typical
    }

    if deadline_type not in deadlines:
        return {
            "content": [{
                "type": "text",
                "text": f"Unknown deadline type: {deadline_type}. "
                       f"Available types: {', '.join(deadlines.keys())}"
            }],
            "is_error": True
        }

    days = deadlines[deadline_type]
    deadline_date = start_date + timedelta(days=days)

    # Calculate reminder dates
    reminder_7_days = deadline_date - timedelta(days=7)
    reminder_3_days = deadline_date - timedelta(days=3)

    result = f"""**Deadline Calculation**

Deadline Type: {deadline_type.replace('_', ' ').title()}
Start Date: {start_date.strftime('%d %B %Y')}
Period: {days} days

**Key Dates:**
- Deadline: {deadline_date.strftime('%d %B %Y')} ({deadline_date.strftime('%A')})
- 7-day reminder: {reminder_7_days.strftime('%d %B %Y')}
- 3-day reminder: {reminder_3_days.strftime('%d %B %Y')}

**Note:**
- Court days exclude weekends and bank holidays for some calculations
- If the deadline falls on a weekend/holiday, it may extend to the next working day
- Always verify with current CPR and court guidance
"""

    return {
        "content": [{
            "type": "text",
            "text": result
        }]
    }


# Create the MCP server with all legal research tools
legal_research_server = create_sdk_mcp_server(
    name="legal_research",
    version="1.0.0",
    tools=[
        search_uk_legislation,
        get_court_procedures,
        calculate_deadline,
    ]
)
