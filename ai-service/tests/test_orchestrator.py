"""
Test Orchestrator Agent
========================
Basic tests for multi-agent system.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from agents.orchestrator import OrchestratorAgent
from agents.tools import get_agent_tools


class MockClient:
    """Mock HF client for testing"""

    async def chat(
        self, messages, model_key="chat_primary", max_tokens=2048, temperature=0.7
    ):
        """Mock chat response"""
        content = messages[-1]["content"]

        # Return mock JSON plan if it's a planning request
        if "AVAILABLE TOOLS" in content:
            return {
                "content": '{"thought": "Test thought", "steps": []}',
                "model": "test-model",
                "tokens": 100,
            }

        # Otherwise return simple response
        return {
            "content": "This is a test response from the orchestrator.",
            "model": "test-model",
            "tokens": 50,
        }


@pytest.mark.asyncio
async def test_orchestrator_basic():
    """Test that orchestrator can process a simple request"""
    client = MockClient()
    tools = {}  # No tools for this basic test

    orchestrator = OrchestratorAgent(client, tools)

    response = await orchestrator.process("What are my rights as a tenant?")

    assert response.agent_name == "Orchestrator"
    assert response.content is not None
    assert len(response.content) > 0


@pytest.mark.asyncio
async def test_orchestrator_with_tools():
    """Test orchestrator with actual tools"""
    client = MockClient()

    # Create a simple mock tool
    async def mock_research(**kwargs):
        return "Mock research results about employment law"

    tools = {"research_legislation": mock_research}

    orchestrator = OrchestratorAgent(client, tools)

    response = await orchestrator.process("Tell me about employment law")

    assert response.agent_name == "Orchestrator"
    assert response.content is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
