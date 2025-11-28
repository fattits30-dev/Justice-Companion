# Multi-Agent System - Justice Companion

## Overview

The AI service now includes a multi-agent orchestration system that can intelligently delegate tasks to specialized agents.

## Architecture

```
User Request → Chat API → Orchestrator Agent → Tools/Sub-Agents → Response
```

### Components

1. **BaseAgent** (`agents/base.py`)
   - Abstract base class for all agents
   - Defines standard `AgentResponse` format

2. **OrchestratorAgent** (`agents/orchestrator.py`)
   - Main supervisor agent
   - Analyzes user requests and creates execution plans
   - Delegates to specialized tools
   - Synthesizes final responses

3. **Tools** (`agents/tools.py`)
   - `research_legislation` - Search UK legislation
   - `research_case_law` - Search case law
   - `draft_letter` - Generate legal letters

## Usage

### Automatic Orchestration

The orchestrator is automatically used when:
- User selects "thorough" mode
- Request contains keywords like "draft" or "research"

Example request:
```
"Research employment law and draft a grievance letter about unfair dismissal"
```

The orchestrator will:
1. Call `research_legislation` for employment law
2. Call `draft_letter` to generate the grievance letter
3. Synthesize results into a coherent response

### Manual Chat Endpoint

Standard requests go directly to the LLM:
```python
POST /chat/completions
{
  "messages": [...],
  "model_preference": "balanced"  // Uses standard chat
}
```

### Orchestrated Request

```python
POST /chat/completions
{
  "messages": [{
    "role": "user",
    "content": "Research housing law and draft a complaint letter"
  }],
  "model_preference": "thorough"  // Uses orchestrator
}
```

## Adding New Tools

To add a new agent capability:

1. Create the core function in the appropriate route file
2. Add a wrapper in `agents/tools.py`
3. Register in `get_agent_tools()`

Example:
```python
async def analyze_contract_tool(contract_text: str) -> str:
    """Analyze a legal contract"""
    # Implementation here
    pass

# In get_agent_tools():
return {
    # ... existing tools ...
    "analyze_contract": analyze_contract_tool
}
```

## Testing

Run the test suite:
```bash
cd ai-service
python -m pytest tests/test_orchestrator.py -v
```

## Current Limitations

- Orchestrator uses JSON output from LLM (depends on model capability)
- Tools don't support streaming responses yet
- No persistent conversation context across tool calls
- Error handling could be more robust

## Future Enhancements

- [ ] Add more specialized agents (Evidence Agent, Timeline Agent, etc.)
- [ ] Implement tool chaining and loops
- [ ] Add memory/context storage
- [ ] Stream orchestrator responses
- [ ] Better error recovery and fallbacks
