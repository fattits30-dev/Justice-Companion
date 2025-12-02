"""
Agents Package
==============
Multi-agent system for Justice Companion.
"""

from agents.base import BaseAgent, AgentResponse
from agents.orchestrator import OrchestratorAgent

__all__ = ["BaseAgent", "AgentResponse", "OrchestratorAgent"]
