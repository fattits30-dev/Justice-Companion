"""
Base Agent Definition
=====================
Abstract base class for all agents in the multi-agent system.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel


class AgentResponse(BaseModel):
    """Standard response format for all agents"""

    content: str
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    agent_name: str


class BaseAgent(ABC):
    """Abstract base agent"""

    def __init__(self, name: str, client: Any):
        self.name = name
        self.client = client  # HF Client or similar

    @abstractmethod
    async def process(
        self, request: str, context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Process a user request"""
        ...
