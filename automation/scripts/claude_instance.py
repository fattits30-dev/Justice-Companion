#!/usr/bin/env python3
"""
Claude Instance - API Wrapper for Dual Instance Architecture
Justice Companion Automation Framework
"""

import os
from typing import List, Dict, Optional
from anthropic import Anthropic


class ClaudeInstance:
    """
    Wrapper for Claude API interactions with conversation history management.
    
    Supports two instance types:
    - interactive: High-level planning, code review, strategic decisions
    - headless: Automated code generation, testing, execution
    """
    
    def __init__(self, instance_type: str, api_key: str):
        """
        Initialize Claude instance.
        
        Args:
            instance_type: Either 'interactive' or 'headless'
            api_key: Anthropic API key
        """
        if instance_type not in ['interactive', 'headless']:
            raise ValueError(f"Invalid instance_type: {instance_type}")
        
        self.instance_type = instance_type
        self.client = Anthropic(api_key=api_key)
        self.conversation_history: List[Dict] = []
        self.model = os.getenv('CLAUDE_MODEL', 'claude-sonnet-4-5-20250929')
    
    def send_message(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 4096
    ) -> str:
        """
        Send message to Claude and get response.
        
        Args:
            prompt: User message to send
            system: Optional system prompt override
            max_tokens: Maximum tokens in response
            
        Returns:
            Assistant's response text
        """
        # Build messages array from history
        messages = self.conversation_history + [
            {"role": "user", "content": prompt}
        ]
        
        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system or self._get_system_prompt(),
            messages=messages
        )
        
        # Extract response text
        assistant_message = response.content[0].text
        
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
    
    def clear_history(self):
        """Clear conversation history."""
        self.conversation_history = []
    
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
    
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set")
        exit(1)
    
    # Test interactive instance
    print("Testing Interactive Claude instance...")
    interactive = ClaudeInstance('interactive', api_key)
    
    response = interactive.send_message(
        "Plan the implementation of a new feature: add export functionality to the Justice Companion app. Provide a high-level plan."
    )
    
    print(f"Response: {response[:200]}...")
    print(f"History length: {interactive.get_history_length()} messages")
    
    # Test headless instance
    print("\nTesting Headless Claude instance...")
    headless = ClaudeInstance('headless', api_key)
    
    response = headless.send_message(
        "Generate a TypeScript function to export case data to JSON format."
    )
    
    print(f"Response: {response[:200]}...")
    print(f"History length: {headless.get_history_length()} messages")
    
    print("\n[OK] Claude instance tests complete")
