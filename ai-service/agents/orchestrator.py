"""
Orchestrator Agent
==================
The central supervisor that analyzes user requests and delegates to specialized agents.
"""

import json
from typing import Dict, Any, Optional, List
from agents.base import BaseAgent, AgentResponse


class OrchestratorAgent(BaseAgent):
    """
    Supervisor agent that routes requests to sub-agents.
    """

    def __init__(self, client: Any, tools: Dict[str, Any]):
        super().__init__("Orchestrator", client)
        self.tools = tools

    async def process(
        self, request: str, _context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Analyze request and determine next steps.
        """
        # 1. Analyze intent
        plan = await self._analyze_intent(request)

        # 2. Execute plan
        results = []
        final_response = ""

        for step in plan.get("steps", []):
            tool_name = step.get("tool")
            tool_input = step.get("input")

            if tool_name in self.tools:
                # Execute tool
                tool_result = await self.tools[tool_name](**tool_input)
                results.append(
                    f"Step: {step.get('description')}\nResult: {tool_result}"
                )
            else:
                results.append(f"Error: Tool {tool_name} not found.")

        # 3. Synthesize final response
        if results:
            final_response = await self._synthesize_response(request, results)
        else:
            # If no tools needed, just chat
            chat_response = await self.client.chat(
                messages=[{"role": "user", "content": request}],
                model_key="chat_primary",
            )
            final_response = chat_response["content"]

        return AgentResponse(
            content=final_response,
            data={"plan": plan, "execution_results": results},
            agent_name=self.name,
        )

    async def _analyze_intent(self, request: str) -> Dict[str, Any]:
        """Determine which tools to use"""

        tools_desc = "\n".join(
            [f"- {name}: {func.__doc__}" for name, func in self.tools.items()]
        )

        prompt = f"""You are the Orchestrator for a legal AI assistant.
Your goal is to help the user by using the available tools.

AVAILABLE TOOLS:
{tools_desc}

USER REQUEST: "{request}"

Analyze the request and create a plan.
Return a JSON object with this structure:
{{
    "thought": "Reasoning about what to do",
    "steps": [
        {{
            "tool": "tool_name",
            "input": {{ "arg_name": "value" }},
            "description": "What this step achieves"
        }}
    ]
}}

If no tools are needed (just general conversation), return "steps": [].
JSON Response:"""

        try:
            response = await self.client.chat(
                messages=[{"role": "user", "content": prompt}],
                model_key="chat_fast",
                temperature=0.1,  # Low temp for structured output
            )

            content = response["content"]
            # Strip markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            return json.loads(content)
        except Exception as e:
            print(f"Orchestrator planning failed: {e}")
            return {"steps": []}

    async def _synthesize_response(self, request: str, results: List[str]) -> str:
        """Create final natural language response based on tool outputs"""

        context = "\n\n".join(results)

        prompt = f"""User Request: "{request}"

Execution Results:
{context}

Based on the above results, provide a helpful, natural language response to the user.
Summarize the findings or confirm the actions taken.
"""

        response = await self.client.chat(
            messages=[{"role": "user", "content": prompt}], model_key="chat_primary"
        )
        return response["content"]
