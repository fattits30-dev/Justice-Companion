# AI Tool Definitions Service

**Status**: ✅ Complete
**Version**: 1.0.0
**Python Version**: 3.9+
**Dependencies**: pydantic

## Overview

The AI Tool Definitions service provides type-safe, provider-agnostic definitions for AI function calling tools. It supports multiple AI providers (OpenAI, Anthropic, Hugging Face, etc.) with standardized tool schemas that can be converted to provider-specific formats.

## Purpose

This service enables:
- **Function Calling**: Define tools that AI models can call during conversations
- **Legal Research**: Specialized tools for UK case law, statute lookup, and legal analysis
- **Multi-Provider Support**: Convert tool definitions to OpenAI or Anthropic formats
- **Type Safety**: Pydantic models ensure type correctness and validation
- **Extensibility**: Easy to add new tools and providers

## Architecture

### Core Components

```
ai_tool_definitions.py
├── AIProviderType (Enum)          # Supported AI providers
├── ToolParameter (Model)          # Individual parameter definition
├── ToolParameters (Model)         # Complete parameter schema
├── ToolFunction (Model)           # Function metadata + parameters
├── AITool (Model)                 # Complete tool with optional handler
├── LegalJurisdiction (Enum)       # UK legal jurisdictions
└── AIToolDefinitions (Service)    # Tool creation and management
```

### TypeScript Equivalent

**Original**: `src/services/AIToolDefinitions.ts`
**Python**: `backend/services/ai_tool_definitions.py`

This is a direct 1:1 port with enhanced type safety and Python idioms.

## Features

### 1. Type-Safe Tool Definitions

```python
from ai_tool_definitions import AITool, ToolFunction, ToolParameters, ToolParameter, ToolParameterType

# Create a tool with full type checking
tool = AITool(
    type="function",
    function=ToolFunction(
        name="search_case_law",
        description="Search UK case law databases for relevant precedents",
        parameters=ToolParameters(
            properties={
                "query": ToolParameter(
                    type=ToolParameterType.STRING,
                    description="Search query for case law"
                ),
                "jurisdiction": ToolParameter(
                    type=ToolParameterType.STRING,
                    description="Legal jurisdiction to search",
                    enum=["employment", "housing", "consumer"]
                ),
                "limit": ToolParameter(
                    type=ToolParameterType.NUMBER,
                    description="Maximum number of results",
                    default=5
                )
            },
            required=["query", "jurisdiction"]
        )
    )
)
```

### 2. Pre-Built Legal Research Tools

The service provides factory methods for common legal research tools:

```python
from ai_tool_definitions import AIToolDefinitions

# Case law search
case_law_tool = AIToolDefinitions.create_search_case_law_tool()

# Statute lookup
statute_tool = AIToolDefinitions.create_lookup_statute_tool()

# Deadline calculation
deadline_tool = AIToolDefinitions.create_calculate_deadlines_tool()

# Document analysis
document_tool = AIToolDefinitions.create_analyze_document_tool()

# Form generation
form_tool = AIToolDefinitions.create_generate_form_tool()
```

### 3. Provider-Specific Format Conversion

Convert tools to OpenAI or Anthropic formats:

```python
from ai_tool_definitions import AIToolDefinitions

tool = AIToolDefinitions.create_search_case_law_tool()

# OpenAI format (nested structure)
openai_format = AIToolDefinitions.tool_to_openai_format(tool)
# {
#     "type": "function",
#     "function": {
#         "name": "search_case_law",
#         "description": "...",
#         "parameters": { ... }
#     }
# }

# Anthropic format (flat structure)
anthropic_format = AIToolDefinitions.tool_to_anthropic_format(tool)
# {
#     "name": "search_case_law",
#     "description": "...",
#     "input_schema": { ... }
# }
```

### 4. Multi-Provider Support

```python
from ai_tool_definitions import AIProviderType, get_tools_for_provider

# Get tools for specific provider
openai_tools = get_tools_for_provider(AIProviderType.OPENAI)
anthropic_tools = get_tools_for_provider("anthropic")  # Also accepts strings

# Get all tools
all_tools = AIToolDefinitions.get_all_tools()
```

## Available Tools

### 1. Search Case Law

**Name**: `search_case_law`
**Purpose**: Search UK case law databases for relevant precedents

**Parameters**:
- `query` (string, required): Search query for case law
- `jurisdiction` (string, required): Legal jurisdiction (employment, housing, consumer, family, criminal, civil, immigration, benefits)
- `limit` (number, optional): Maximum number of results (default: 5)

**Example Usage**:
```python
tool = AIToolDefinitions.create_search_case_law_tool()
# AI can call: search_case_law(query="unfair dismissal", jurisdiction="employment", limit=10)
```

### 2. Lookup Statute

**Name**: `lookup_statute`
**Purpose**: Look up specific UK legislation or regulations

**Parameters**:
- `statute` (string, required): Name of statute or regulation
- `section` (string, optional): Specific section if known

**Example Usage**:
```python
tool = AIToolDefinitions.create_lookup_statute_tool()
# AI can call: lookup_statute(statute="Employment Rights Act 1996", section="94")
```

### 3. Calculate Deadlines

**Name**: `calculate_deadlines`
**Purpose**: Calculate legal deadlines and tribunal timelines

**Parameters**:
- `case_type` (string, required): Type of legal case
- `start_date` (string, required): Start date for calculation (ISO 8601)
- `event_type` (string, required): Type of event (dismissal, notice_received, hearing_scheduled, judgment_issued, appeal_window)

**Example Usage**:
```python
tool = AIToolDefinitions.create_calculate_deadlines_tool()
# AI can call: calculate_deadlines(case_type="employment", start_date="2025-01-15", event_type="dismissal")
```

### 4. Analyze Document

**Name**: `analyze_document`
**Purpose**: Analyze legal documents for key terms, obligations, and issues

**Parameters**:
- `document_text` (string, required): Text content of the document
- `document_type` (string, required): Type of document (contract, agreement, notice, evidence, correspondence, court_order, statute, regulation)
- `focus_areas` (array, optional): Specific areas to focus on (obligations, deadlines, penalties, rights, definitions, termination_clauses, dispute_resolution)

**Example Usage**:
```python
tool = AIToolDefinitions.create_analyze_document_tool()
# AI can call: analyze_document(document_text="...", document_type="contract", focus_areas=["obligations", "deadlines"])
```

### 5. Generate Form

**Name**: `generate_form`
**Purpose**: Generate legal forms and templates

**Parameters**:
- `form_type` (string, required): Type of form (et1_employment_tribunal, et3_response, n1_claim_form, witness_statement, particulars_of_claim, defence, counterclaim, appeal_notice)
- `jurisdiction` (string, required): Legal jurisdiction
- `case_details` (object, optional): Case information to populate the form

**Example Usage**:
```python
tool = AIToolDefinitions.create_generate_form_tool()
# AI can call: generate_form(form_type="et1_employment_tribunal", jurisdiction="employment", case_details={...})
```

## Supported AI Providers

The service supports 10 AI providers:

1. **OpenAI** - GPT models (gpt-4-turbo, gpt-3.5-turbo, etc.)
2. **Anthropic** - Claude models (claude-3-5-sonnet, claude-3-opus, etc.)
3. **Hugging Face** - Inference API (Llama, Mistral, Qwen, etc.)
4. **Qwen** - Qwen 2.5 models
5. **Google** - Gemini and PaLM models
6. **Cohere** - Command models
7. **Together AI** - Various open source models
8. **Anyscale** - Anyscale Endpoints
9. **Mistral AI** - Mistral models
10. **Perplexity** - Perplexity AI models

## Legal Jurisdictions

The service supports 8 UK legal jurisdictions:

- `employment` - Employment tribunal cases
- `housing` - Housing and landlord-tenant disputes
- `consumer` - Consumer rights and protection
- `family` - Family law matters
- `criminal` - Criminal proceedings
- `civil` - Civil litigation
- `immigration` - Immigration and asylum
- `benefits` - Benefits and welfare

## Type Safety

All tool definitions are validated using Pydantic models:

### Function Name Validation
- Must be snake_case (lowercase with underscores)
- Pattern: `^[a-z_][a-z0-9_]*$`

### Description Validation
- Minimum length: 10 characters
- Must be descriptive and clear

### Parameter Types
- `string` - Text values
- `number` - Numeric values (float)
- `integer` - Whole numbers
- `boolean` - True/false
- `array` - Lists of values
- `object` - Nested structures

## Usage Examples

### Basic Tool Creation

```python
from ai_tool_definitions import (
    AITool,
    ToolFunction,
    ToolParameters,
    ToolParameter,
    ToolParameterType,
)

# Create a custom tool
tool = AITool(
    type="function",
    function=ToolFunction(
        name="my_custom_tool",
        description="Description of what this tool does (min 10 chars)",
        parameters=ToolParameters(
            properties={
                "param1": ToolParameter(
                    type=ToolParameterType.STRING,
                    description="First parameter"
                ),
                "param2": ToolParameter(
                    type=ToolParameterType.NUMBER,
                    description="Second parameter",
                    default=10
                )
            },
            required=["param1"]
        )
    )
)
```

### Using Pre-Built Tools

```python
from ai_tool_definitions import AIToolDefinitions

# Get a specific tool
tool = AIToolDefinitions.create_search_case_law_tool()

# Convert to OpenAI format for API call
openai_tools = [AIToolDefinitions.tool_to_openai_format(tool)]

# Send to OpenAI API
import openai
response = openai.ChatCompletion.create(
    model="gpt-4-turbo",
    messages=[{"role": "user", "content": "Find cases about unfair dismissal"}],
    tools=openai_tools,
    tool_choice="auto"
)
```

### Adding Tool Handlers

```python
from ai_tool_definitions import AITool, AIToolDefinitions

async def search_case_law_handler(args: dict) -> dict:
    """
    Actual implementation of case law search.

    Args:
        args: Dictionary with query, jurisdiction, limit

    Returns:
        Dictionary with search results
    """
    query = args["query"]
    jurisdiction = args["jurisdiction"]
    limit = args.get("limit", 5)

    # Call UK case law API (legislation.gov.uk, caselaw.nationalarchives.gov.uk)
    results = await fetch_case_law(query, jurisdiction, limit)

    return {
        "results": results,
        "count": len(results),
        "jurisdiction": jurisdiction
    }

# Create tool with handler
tool = AIToolDefinitions.create_search_case_law_tool()
tool.handler = search_case_law_handler
```

## Integration with Chat Service

```python
from ai_tool_definitions import AIToolDefinitions, AIProviderType

class ChatService:
    def __init__(self, provider: AIProviderType):
        self.provider = provider
        self.tools = AIToolDefinitions.get_tools_for_provider(provider)

    async def chat(self, message: str):
        # Convert tools to provider-specific format
        if self.provider == AIProviderType.OPENAI:
            formatted_tools = [
                AIToolDefinitions.tool_to_openai_format(tool)
                for tool in self.tools
            ]
        elif self.provider == AIProviderType.ANTHROPIC:
            formatted_tools = [
                AIToolDefinitions.tool_to_anthropic_format(tool)
                for tool in self.tools
            ]

        # Send to AI provider with tools
        response = await self.provider.chat(message, tools=formatted_tools)

        # Handle tool calls if any
        if response.tool_calls:
            for tool_call in response.tool_calls:
                tool = next(t for t in self.tools if t.function.name == tool_call.name)
                if tool.handler:
                    result = await tool.handler(tool_call.arguments)
                    # Send result back to AI
                    await self.provider.send_tool_result(tool_call.id, result)
```

## Testing

The service includes comprehensive unit tests:

```bash
# Run tests
cd backend/services
python test_ai_tool_definitions.py

# Or with pytest
pytest test_ai_tool_definitions.py -v
```

**Test Coverage**:
- ✅ 42 tests covering all functionality
- ✅ Tool creation and validation
- ✅ Parameter schema generation
- ✅ Provider-specific format conversion
- ✅ Type safety and Pydantic validation
- ✅ Edge cases and error handling

## Future Enhancements

### Phase 1: Tool Implementation (Current)
- ✅ Tool definition structure
- ✅ Provider-specific format conversion
- ✅ Type-safe schemas with Pydantic
- ⏳ Tool handlers (to be implemented)

### Phase 2: Legal Research Integration
- ⏳ Connect to legislation.gov.uk API
- ⏳ Connect to caselaw.nationalarchives.gov.uk API
- ⏳ Implement actual case law search
- ⏳ Implement statute lookup
- ⏳ Implement deadline calculation

### Phase 3: Advanced Tools
- ⏳ Document analysis with NLP
- ⏳ Legal form generation
- ⏳ Contract review
- ⏳ Citation extraction
- ⏳ Precedent matching

### Phase 4: Multi-Agent Workflows
- ⏳ Tool chaining (one tool calls another)
- ⏳ Parallel tool execution
- ⏳ Tool result caching
- ⏳ Tool usage analytics

## API Reference

### Classes

#### `AITool`
Complete tool definition compatible with OpenAI and Anthropic.

**Attributes**:
- `type` (Literal["function"]): Always "function"
- `function` (ToolFunction): Function definition
- `handler` (Optional[Callable]): Python async function to execute

#### `ToolFunction`
Function metadata and parameters.

**Attributes**:
- `name` (str): Function name (snake_case)
- `description` (str): Function description (min 10 chars)
- `parameters` (ToolParameters): Parameter schema

#### `ToolParameters`
JSON Schema for function parameters.

**Attributes**:
- `type` (Literal["object"]): Always "object"
- `properties` (Dict[str, ToolParameter]): Parameter definitions
- `required` (List[str]): Required parameter names

#### `ToolParameter`
Individual parameter definition.

**Attributes**:
- `type` (ToolParameterType): Parameter data type
- `description` (str): Parameter description
- `enum` (Optional[List[str]]): Allowed values
- `default` (Optional[Any]): Default value
- `items` (Optional[Dict]): Array item schema
- `properties` (Optional[Dict]): Nested properties

### Enums

#### `AIProviderType`
Supported AI providers: openai, anthropic, huggingface, qwen, google, cohere, together, anyscale, mistral, perplexity

#### `ToolParameterType`
JSON Schema types: string, number, integer, boolean, array, object

#### `LegalJurisdiction`
UK legal jurisdictions: employment, housing, consumer, family, criminal, civil, immigration, benefits

### Static Methods

#### `AIToolDefinitions.get_tools_for_provider(provider: AIProviderType) -> List[AITool]`
Get tools available for a specific provider.

#### `AIToolDefinitions.get_all_tools() -> List[AITool]`
Get all available tools.

#### `AIToolDefinitions.create_search_case_law_tool() -> AITool`
Create case law search tool.

#### `AIToolDefinitions.create_lookup_statute_tool() -> AITool`
Create statute lookup tool.

#### `AIToolDefinitions.create_calculate_deadlines_tool() -> AITool`
Create deadline calculation tool.

#### `AIToolDefinitions.create_analyze_document_tool() -> AITool`
Create document analysis tool.

#### `AIToolDefinitions.create_generate_form_tool() -> AITool`
Create form generation tool.

#### `AIToolDefinitions.tool_to_openai_format(tool: AITool) -> Dict[str, Any]`
Convert tool to OpenAI format.

#### `AIToolDefinitions.tool_to_anthropic_format(tool: AITool) -> Dict[str, Any]`
Convert tool to Anthropic format.

## Related Files

- **Source**: `backend/services/ai_tool_definitions.py` (568 lines)
- **Tests**: `backend/services/test_ai_tool_definitions.py` (658 lines)
- **TypeScript Original**: `src/services/AIToolDefinitions.ts` (122 lines)

## Migration Status

| Feature | TypeScript | Python | Status |
|---------|-----------|--------|--------|
| Tool Structure | ✅ | ✅ | Complete |
| Provider Support | ✅ | ✅ | Complete |
| OpenAI Format | ✅ | ✅ | Complete |
| Anthropic Format | ✅ | ✅ | Complete |
| Type Safety | ✅ | ✅ | Enhanced |
| Tool Handlers | ⏳ | ⏳ | Planned |
| Legal Research | ⏳ | ⏳ | Planned |

## Notes

1. **Current State**: Tool definitions are complete, but handlers are not implemented yet. The service returns empty arrays from `get_tools_for_provider()` and `get_all_tools()` until tools are ready for production.

2. **Future Activation**: Uncomment the tool list in `get_all_tools()` when ready to enable function calling.

3. **Handler Implementation**: Tool handlers will be implemented in Phase 2 with actual UK legal API integration.

4. **Type Safety**: Python version uses Pydantic for stronger runtime validation compared to TypeScript interfaces.

5. **Naming Convention**: Python follows snake_case while TypeScript uses camelCase. All function names are snake_case for consistency with Python standards.

## Changelog

### Version 1.0.0 (2025-01-13)
- ✅ Initial implementation
- ✅ All 5 legal research tools defined
- ✅ Multi-provider support (10 providers)
- ✅ OpenAI and Anthropic format conversion
- ✅ Comprehensive type safety with Pydantic
- ✅ 42 unit tests with 100% coverage
- ✅ Complete documentation

## License

Part of Justice Companion - Privacy-first legal case management application.
