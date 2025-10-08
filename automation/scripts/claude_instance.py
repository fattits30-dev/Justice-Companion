#!/usr/bin/env python3
"""
Claude Instance - CLI Wrapper for Dual Instance Architecture
Justice Companion Automation Framework

Uses Claude Code headless CLI instead of Anthropic API.
"""

import os
import json
import subprocess
import shutil
from typing import List, Dict, Optional
from pathlib import Path


class ClaudeInstance:
    """
    Wrapper for Claude Code CLI interactions with conversation history management.

    Uses Claude Code headless mode (claude -p) instead of Anthropic API.
    This avoids needing separate API credits.

    Supports two instance types:
    - interactive: High-level planning, code review, strategic decisions
    - headless: Automated code generation, testing, execution
    """

    def __init__(self, instance_type: str, api_key: str = None):
        """
        Initialize Claude instance.

        Args:
            instance_type: Either 'interactive' or 'headless'
            api_key: Not used (kept for compatibility)
        """
        if instance_type not in ['interactive', 'headless']:
            raise ValueError(f"Invalid instance_type: {instance_type}")

        self.instance_type = instance_type
        self.conversation_history: List[Dict] = []
        self.session_id: Optional[str] = None

        # Find claude executable
        self.claude_exe = self._find_claude_executable()
        if not self.claude_exe:
            raise RuntimeError("Claude Code CLI not found. Please install Claude Code.")

    def _find_claude_executable(self) -> Optional[str]:
        """Find the claude executable."""
        # First, try using shutil.which() to find 'claude' in PATH
        # This handles .cmd, .bat, .exe extensions automatically on Windows
        claude_in_path = shutil.which('claude')
        if claude_in_path:
            try:
                result = subprocess.run(
                    [claude_in_path, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    shell=False
                )
                if result.returncode == 0:
                    print(f"[ClaudeInstance] Found Claude CLI in PATH: {claude_in_path}")
                    return claude_in_path
            except Exception as e:
                print(f"[ClaudeInstance] PATH claude failed: {type(e).__name__}")

        # Fallback: Try specific installation paths
        fallback_locations = [
            r"C:\Users\sava6\AppData\Local\AnthropicClaude\claude.exe",
            r"C:\Users\sava6\AppData\Roaming\npm\claude.cmd",
        ]

        for location in fallback_locations:
            if not os.path.exists(location):
                continue

            try:
                result = subprocess.run(
                    [location, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    shell=False
                )
                if result.returncode == 0:
                    print(f"[ClaudeInstance] Found Claude CLI: {location}")
                    return location
            except Exception as e:
                print(f"[ClaudeInstance] Tried {location}: {type(e).__name__}")
                continue

        return None

    def send_message(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 4096
    ) -> str:
        """
        Send message to Claude Code CLI and get response.

        Args:
            prompt: User message to send
            system: Optional system prompt override
            max_tokens: Not used (kept for compatibility)

        Returns:
            Assistant's response text
        """
        # Build command
        cmd = [
            self.claude_exe,
            "-p", prompt,
            "--output-format", "json",
            "--dangerously-skip-permissions"  # Bypass all permission prompts for headless automation
        ]

        # Add system prompt if provided
        if system or self.instance_type:
            system_prompt = system or self._get_system_prompt()
            cmd.extend(["--append-system-prompt", system_prompt])

        # Resume session if we have one
        if self.session_id:
            cmd.extend(["--resume", self.session_id])

        # Allow specific tools based on instance type
        # Main tools: GitHub MCP and Context7 for research + core file operations
        if self.instance_type == 'interactive':
            cmd.extend(["--allowedTools", "Read", "Grep", "Bash", "mcp__github__*", "mcp__context7__*"])
        else:
            cmd.extend(["--allowedTools", "Read", "Write", "Edit", "Bash", "Grep", "mcp__github__*", "mcp__context7__*"])

        try:
            # Run claude CLI
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,  # 2 minutes
                shell=False,  # Explicitly avoid shell for security
                cwd=str(Path.cwd())
            )

            if result.returncode != 0:
                # Try to parse JSON error response
                try:
                    error_data = json.loads(result.stdout)
                    if error_data.get('is_error'):
                        error_msg = error_data.get('result', 'Unknown error')
                        raise RuntimeError(f"Claude CLI error: {error_msg}")
                except json.JSONDecodeError:
                    pass

                # Fallback to raw error message
                error_msg = result.stderr or result.stdout or "Unknown error"
                raise RuntimeError(f"Claude CLI failed: {error_msg}")

            # Parse JSON response
            try:
                # Filter out log lines from Claude CLI output
                # Claude CLI sometimes outputs initialization logs mixed with JSON
                # Example: "2025-10-05 20:50:12 [info] Starting app {...}"
                lines = result.stdout.strip().split('\n')

                # Find lines that look like JSON (start with '{' or '[')
                json_lines = []
                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith('{') or stripped.startswith('['):
                        json_lines.append(line)

                # Parse the last JSON object (most recent response)
                if json_lines:
                    # Try to parse the last complete JSON object
                    json_text = '\n'.join(json_lines)
                    response_data = json.loads(json_text)
                else:
                    # No JSON found, try parsing entire output
                    response_data = json.loads(result.stdout)

                # Check if Claude CLI returned an error
                if response_data.get('is_error', False):
                    error_message = response_data.get('result', 'Unknown error from Claude CLI')
                    raise RuntimeError(f"Claude CLI error: {error_message}")

                # Extract response text
                assistant_message = response_data.get('result', '')

                # Store session ID for multi-turn conversations
                if 'session_id' in response_data:
                    self.session_id = response_data['session_id']

                # Update conversation history
                self.conversation_history.append({
                    "role": "user",
                    "content": prompt
                })
                self.conversation_history.append({
                    "role": "assistant",
                    "content": assistant_message
                })

                # Prune history if too long (keep last 20 messages)
                if len(self.conversation_history) > 20:
                    self.conversation_history = self.conversation_history[-20:]

                return assistant_message

            except json.JSONDecodeError as e:
                # If JSON parsing fails, try to extract text response
                print(f"[WARNING] Failed to parse JSON response: {e}")
                print(f"[WARNING] Raw output (first 500 chars):")
                print(f"{result.stdout[:500]}")

                # Try to extract text content between quotes if present
                # Look for common patterns like "result": "text content"
                import re
                result_match = re.search(r'"result"\s*:\s*"([^"]*)"', result.stdout)
                if result_match:
                    extracted_text = result_match.group(1)
                    print(f"[WARNING] Extracted text from result field: {extracted_text[:100]}")
                    return extracted_text

                # Return raw output as last resort
                return result.stdout or "No response"

        except subprocess.TimeoutExpired:
            raise RuntimeError("Claude CLI timed out after 2 minutes")
        except Exception as e:
            raise RuntimeError(f"Error calling Claude CLI: {e}")

    def clear_history(self):
        """Clear conversation history and session."""
        self.conversation_history = []
        self.session_id = None

    def get_history_length(self) -> int:
        """Get number of messages in history."""
        return len(self.conversation_history)

    def _get_system_prompt(self) -> str:
        """Get system prompt based on instance type."""
        if self.instance_type == 'interactive':
            return """You are the Interactive Claude instance for Justice Companion development.

Your role:
- High-level planning and architectural decisions
- Code review and quality assurance
- Strategic planning for feature implementation
- User oversight and final decision-making
- Coordinating with the Headless instance

You make the final decisions on architecture and implementation strategy.
You provide guidance to the Headless instance but allow it to handle
automated tasks like code generation, testing, and file edits.

Focus on: planning, review, strategy, quality, coordination."""

        else:  # headless
            return """You are the Headless Claude instance for Justice Companion development.

Your role:
- Automated code generation and file modifications
- Running tests and analyzing failures
- Implementing fixes based on test results
- Executing specific implementation tasks
- Reporting results back to Interactive instance

You follow instructions from the Interactive instance and handle
the detailed implementation work. You report results, errors, and
completion status for all tasks.

Focus on: implementation, testing, automation, execution, reporting."""


# Example usage
if __name__ == '__main__':
    import os
    from dotenv import load_dotenv

    load_dotenv('automation/.env')

    # Test interactive instance
    print("Testing Interactive Claude instance (Claude Code CLI)...")
    interactive = ClaudeInstance('interactive')

    try:
        response = interactive.send_message(
            "List the TypeScript files in the src/services directory"
        )

        print(f"Response: {response[:300]}...")
        print(f"History length: {interactive.get_history_length()} messages")
        print(f"Session ID: {interactive.session_id}")
    except Exception as e:
        print(f"[ERROR] {e}")

    # Test headless instance
    print("\nTesting Headless Claude instance (Claude Code CLI)...")
    headless = ClaudeInstance('headless')

    try:
        response = headless.send_message(
            "What is the current working directory?"
        )

        print(f"Response: {response[:300]}...")
        print(f"History length: {headless.get_history_length()} messages")
        print(f"Session ID: {headless.session_id}")
    except Exception as e:
        print(f"[ERROR] {e}")

    print("\n[OK] Claude instance tests complete")
