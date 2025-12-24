#!/usr/bin/env python3
"""
Justice Agent - UK Civil Law Legal Assistant

A Claude Agent SDK application for legal case assistance, integrated
with the Justice Companion case management system.

DISCLAIMER: This agent provides general legal information only.
It does not constitute legal advice. Always consult a qualified
legal professional for specific legal matters.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Configure logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("justice-agent")

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
    HookMatcher,
    HookContext,
)

from tools.case_tools import case_management_server
from tools.legal_tools import legal_research_server

# System prompt for the legal assistant
LEGAL_ASSISTANT_SYSTEM_PROMPT = """You are Justice Agent, an AI legal assistant specializing in UK civil law. You help users understand and manage their legal cases through the Justice Companion case management system.

## Your Expertise
- UK Civil Procedure Rules (CPR)
- County Court and High Court procedures
- Limitation periods and deadlines
- Pre-action protocols
- Small claims, fast track, and multi-track procedures
- Consumer rights and contract law basics
- Evidence management and disclosure

## Your Capabilities
1. **Case Management**: Search, view, and update cases in Justice Companion
2. **Deadline Tracking**: Calculate and explain legal deadlines
3. **Legal Research**: Search UK legislation and explain procedures
4. **Document Guidance**: Advise on required court forms and documents

## Important Guidelines
- ALWAYS include the disclaimer that you provide information, not legal advice
- Be precise about limitation periods and deadlines - they are critical
- When uncertain, recommend consulting a qualified solicitor
- Explain legal terminology in plain English
- Be empathetic - users may be stressed about their legal matters
- For complex matters, suggest seeking professional legal help

## Response Format
- Start with a brief acknowledgment of the user's question
- Provide clear, structured information
- Use bullet points for procedural steps
- Highlight important deadlines or time limits
- End with next steps or recommendations

## Ethical Boundaries
- Do not predict case outcomes
- Do not recommend specific law firms
- Do not provide advice on criminal matters
- Do not encourage litigation where alternatives exist
- Always respect confidentiality of case information
"""


async def audit_tool_usage(
    input_data: dict[str, Any],
    tool_use_id: str | None,
    context: HookContext
) -> dict[str, Any]:
    """Log all tool usage for audit purposes."""
    tool_name = input_data.get("tool_name", "unknown")
    tool_input = input_data.get("tool_input", {})
    logger.info(f"Tool invoked: {tool_name}", extra={
        "tool_name": tool_name,
        "tool_use_id": tool_use_id,
        "input_keys": list(tool_input.keys()) if isinstance(tool_input, dict) else []
    })
    return {}


async def validate_case_access(
    input_data: dict[str, Any],
    tool_use_id: str | None,
    context: HookContext
) -> dict[str, Any]:
    """Validate access to case-related tools."""
    tool_name = input_data.get("tool_name", "")

    # For case modification tools, ensure we have proper authorization
    if tool_name in ["mcp__cases__add_case_note"]:
        tool_input = input_data.get("tool_input", {})
        note_content = tool_input.get("note", "")

        # Block potentially harmful content
        blocked_terms = ["delete all", "remove permanently"]
        for term in blocked_terms:
            if term.lower() in note_content.lower():
                logger.warning(f"Blocked potentially harmful operation in {tool_name}: {term}")
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": "Potentially harmful operation blocked"
                    }
                }

    return {}


def create_agent_options() -> ClaudeAgentOptions:
    """Create and configure the agent options."""

    # Get model from environment or use default
    # Uses claude-sonnet-4-5-20250514 (Sonnet 4.5) as default
    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250514")

    options = ClaudeAgentOptions(
        system_prompt=LEGAL_ASSISTANT_SYSTEM_PROMPT,
        model=model,

        # MCP servers for custom tools
        mcp_servers={
            "cases": case_management_server,
            "legal": legal_research_server,
        },

        # Allowed tools - custom tools + basic file reading
        allowed_tools=[
            # Case management tools
            "mcp__cases__get_case_details",
            "mcp__cases__search_cases",
            "mcp__cases__get_case_deadlines",
            "mcp__cases__get_case_evidence",
            "mcp__cases__add_case_note",
            # Legal research tools
            "mcp__legal__search_uk_legislation",
            "mcp__legal__get_court_procedures",
            "mcp__legal__calculate_deadline",
            # Web search for current legal information
            "WebSearch",
        ],

        # Hooks for auditing and validation
        hooks={
            "PreToolUse": [
                HookMatcher(hooks=[audit_tool_usage]),
                HookMatcher(
                    matcher="mcp__cases__*",
                    hooks=[validate_case_access]
                ),
            ],
            "PostToolUse": [
                HookMatcher(hooks=[audit_tool_usage]),
            ],
        },

        # Permission mode - require approval for potentially risky operations
        permission_mode="default",
    )

    return options


async def run_single_query(prompt: str) -> None:
    """Run a single query against the agent."""
    from claude_agent_sdk import query

    options = create_agent_options()

    print("\n" + "=" * 60)
    print("Justice Agent - UK Civil Law Assistant")
    print("=" * 60)
    print(f"\nYour query: {prompt}\n")
    print("-" * 60)

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text, end="", flush=True)
                elif isinstance(block, ToolUseBlock):
                    print(f"\n[Using tool: {block.name}]")
                elif isinstance(block, ToolResultBlock):
                    if block.is_error:
                        print(f"\n[Tool error: {block.content}]")
        elif isinstance(message, ResultMessage):
            print("\n" + "-" * 60)
            if message.total_cost_usd:
                print(f"Cost: ${message.total_cost_usd:.4f}")
            print(f"Duration: {message.duration_ms}ms")

    print("\n")


async def run_interactive_session() -> None:
    """Run an interactive conversation session."""
    options = create_agent_options()

    print("\n" + "=" * 60)
    print("Justice Agent - Interactive Session")
    print("=" * 60)
    print("\nType your questions about UK civil law cases.")
    print("Commands: 'exit' to quit, 'new' for new session\n")
    print("DISCLAIMER: This is general legal information, not legal advice.")
    print("-" * 60 + "\n")

    async with ClaudeSDKClient(options=options) as client:
        while True:
            try:
                user_input = input("\nYou: ").strip()

                if not user_input:
                    continue

                if user_input.lower() == "exit":
                    print("\nGoodbye! Remember to consult a solicitor for specific legal advice.")
                    break

                if user_input.lower() == "new":
                    await client.disconnect()
                    await client.connect()
                    print("\nStarted new session (previous context cleared)")
                    continue

                # Send query to agent
                await client.query(user_input)

                # Process response
                print("\nJustice Agent: ", end="", flush=True)
                async for message in client.receive_response():
                    if isinstance(message, AssistantMessage):
                        for block in message.content:
                            if isinstance(block, TextBlock):
                                print(block.text, end="", flush=True)
                            elif isinstance(block, ToolUseBlock):
                                print(f"\n  [Checking: {block.name}]", end="")
                    elif isinstance(message, ResultMessage):
                        if message.is_error:
                            print(f"\n  [Error occurred]")

                print()  # New line after response

            except KeyboardInterrupt:
                print("\n\nSession interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\nError: {e}")
                if os.getenv("DEBUG"):
                    import traceback
                    traceback.print_exc()


async def main() -> None:
    """Main entry point."""

    # Check for API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY environment variable is required.")
        print("Get your API key from: https://console.anthropic.com/")
        print("\nCreate a .env file with:")
        print("  ANTHROPIC_API_KEY=your_key_here")
        sys.exit(1)

    # Parse command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--interactive" or sys.argv[1] == "-i":
            await run_interactive_session()
        elif sys.argv[1] == "--help" or sys.argv[1] == "-h":
            print("""
Justice Agent - UK Civil Law Legal Assistant

Usage:
  python main.py                     Run interactive session
  python main.py -i, --interactive   Run interactive session
  python main.py "your question"     Run single query
  python main.py -h, --help          Show this help

Environment Variables:
  ANTHROPIC_API_KEY          Required: Your Anthropic API key
  JUSTICE_COMPANION_API_URL  Backend API URL (default: http://localhost:8000)
  JUSTICE_COMPANION_TOKEN    JWT token for authenticated requests
  CLAUDE_MODEL               Model to use (default: claude-sonnet-4-5-20250514)
  LOG_LEVEL                  Logging level (DEBUG, INFO, WARNING, ERROR)
  DEBUG                      Enable debug logging

Examples:
  python main.py "What is the limitation period for contract claims?"
  python main.py "How do I start a small claims court case?"
  python main.py -i
""")
        else:
            # Treat argument as a query
            query_text = " ".join(sys.argv[1:])
            await run_single_query(query_text)
    else:
        # Default to interactive session
        await run_interactive_session()


if __name__ == "__main__":
    asyncio.run(main())
