"""
Base Agent Module

Abstract base class for all AI agents in the Justice Companion system.
Provides common functionality for prompt loading, validation, and execution.

All agents MUST inherit from BaseAgent and implement:
- execute(): Main agent logic
- load_prompt(): Prompt template loading

Author: Justice Companion Team
License: MIT
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, TYPE_CHECKING
from pathlib import Path
import json

if TYPE_CHECKING:
    from services.model_client import ModelClient


class BaseAgent(ABC):
    """
    Abstract base class for all AI agents.

    Enforces consistent interface and provides shared utilities.
    Works with any ModelClient implementation (HuggingFace, OpenAI, etc.)
    """

    def __init__(self, model_client: 'ModelClient', config: Dict[str, Any]):
        """
        Initialize the agent with model client and configuration.

        Args:
            model_client: ModelClient instance (HuggingFace, OpenAI, etc.)
            config: Agent configuration dictionary
                - model: str (model name/path)
                - temperature: float (0.0-2.0)
                - max_tokens: int
                - timeout: int (seconds)
        """
        self.model_client = model_client
        self.config = config
        self._prompt_cache: Optional[str] = None

    @abstractmethod
    async def execute(self, request: Any) -> Any:
        """
        Execute the agent's main logic.

        This method MUST be implemented by all agents.
        It should:
        1. Validate the request
        2. Load the prompt template
        3. Call model client (HuggingFace, OpenAI, etc.)
        4. Parse and return the response

        Args:
            request: Pydantic model with request data

        Returns:
            Pydantic model with response data

        Raises:
            ValueError: If request is invalid
            RuntimeError: If model generation fails
        """
        pass

    @abstractmethod
    def load_prompt(self) -> str:
        """
        Load the prompt template from disk.

        This method MUST be implemented by all agents.
        It should return the prompt template as a string.

        Prompts are stored in:
        - prompts/current/{agent_name}.txt (active version)
        - prompts/v1/{agent_name}.txt (version 1)

        Returns:
            str: Prompt template with {placeholder} syntax

        Example:
            ```python
            def load_prompt(self) -> str:
                prompt_path = Path(__file__).parent.parent / 'prompts' / 'current' / 'document_analysis.txt'
                with open(prompt_path, 'r', encoding='utf-8') as f:
                    return f.read()
            ```
        """
        pass

    def _validate_request(self, request: Any) -> bool:
        """
        Validate the request before processing.

        Override this method to add custom validation logic.

        Args:
            request: Request object to validate

        Returns:
            bool: True if valid, False otherwise
        """
        return request is not None

    def get_cached_prompt(self) -> str:
        """
        Get cached prompt or load if not cached.

        Returns:
            str: Prompt template
        """
        if self._prompt_cache is None:
            self._prompt_cache = self.load_prompt()
        return self._prompt_cache

    def clear_prompt_cache(self) -> None:
        """
        Clear the prompt cache.

        Call this if the prompt file changes at runtime
        (e.g., during A/B testing or hot-reload).
        """
        self._prompt_cache = None

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text using the configured model client.

        This is a convenience wrapper around model_client.generate()
        that agents can use directly.

        Args:
            prompt: User prompt
            system_prompt: Optional system instructions

        Returns:
            Generated text response

        Raises:
            RuntimeError: If generation fails
        """
        return await self.model_client.generate(prompt, system_prompt)

    def get_model_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the configured model client.

        Returns:
            Dict with provider, model name, etc.
        """
        return self.model_client.get_metadata()

    def __repr__(self) -> str:
        """String representation of agent."""
        metadata = self.get_model_metadata()
        return f"<{self.__class__.__name__} provider={metadata.get('provider')} model={metadata.get('model')}>"
