"""
AI Tool Definitions - Function Calling Support

Defines tools/functions that AI models can call during conversations.
Supports multiple AI providers with standardized tool definitions.

This module provides:
- Tool definition structures compatible with OpenAI and Anthropic
- Legal research tool definitions (future implementation)
- Provider-specific tool retrieval
- Type-safe tool definitions using Pydantic

Author: Justice Companion Development Team
Version: 1.0.0
"""

from typing import Any, Callable, Coroutine, Dict, List, Literal, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class AIProviderType(str, Enum):
    """
    Supported AI provider types.

    Attributes:
        OPENAI: OpenAI GPT models
        ANTHROPIC: Anthropic Claude models
        HUGGINGFACE: Hugging Face Inference API
        QWEN: Qwen models via Hugging Face
        GOOGLE: Google Gemini/PaLM models
        COHERE: Cohere Command models
        TOGETHER: Together AI models
        ANYSCALE: Anyscale Endpoints
        MISTRAL: Mistral AI models
        PERPLEXITY: Perplexity AI models
    """
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    HUGGINGFACE = "huggingface"
    QWEN = "qwen"
    GOOGLE = "google"
    COHERE = "cohere"
    TOGETHER = "together"
    ANYSCALE = "anyscale"
    MISTRAL = "mistral"
    PERPLEXITY = "perplexity"


class ToolParameterType(str, Enum):
    """JSON Schema parameter types."""
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


class ToolParameter(BaseModel):
    """
    Individual tool parameter definition.

    Attributes:
        type: Parameter data type (string, number, etc.)
        description: Human-readable parameter description
        enum: Optional list of allowed values
        default: Optional default value
        items: Optional array item schema (for array types)
        properties: Optional nested properties (for object types)
    """
    model_config = ConfigDict(use_enum_values=True)

    type: ToolParameterType
    description: str
    enum: Optional[List[str]] = None
    default: Optional[Any] = None
    items: Optional[Dict[str, Any]] = None
    properties: Optional[Dict[str, Any]] = None


class ToolParameters(BaseModel):
    """
    Tool parameters schema compatible with OpenAI/Anthropic function calling.

    Attributes:
        type: Always "object" for top-level parameters
        properties: Dictionary of parameter names to parameter definitions
        required: List of required parameter names
    """
    type: Literal["object"] = "object"
    properties: Dict[str, Union[ToolParameter, Dict[str, Any]]] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)


class ToolFunction(BaseModel):
    """
    Function definition for AI tool calling.

    Attributes:
        name: Unique function name (snake_case recommended)
        description: Clear description of what the function does
        parameters: JSON Schema defining function parameters
    """
    name: str = Field(..., pattern="^[a-z_][a-z0-9_]*$")
    description: str = Field(..., min_length=10)
    parameters: ToolParameters


class AITool(BaseModel):
    """
    Complete AI tool definition compatible with OpenAI and Anthropic.

    This structure can be directly serialized and sent to AI APIs
    that support function calling.

    Attributes:
        type: Always "function" for function tools
        function: The function definition
        handler: Optional Python async function to execute the tool

    Example:
        >>> tool = AITool(
        ...     type="function",
        ...     function=ToolFunction(
        ...         name="search_case_law",
        ...         description="Search UK case law databases",
        ...         parameters=ToolParameters(
        ...             properties={
        ...                 "query": ToolParameter(
        ...                     type=ToolParameterType.STRING,
        ...                     description="Search query"
        ...                 )
        ...             },
        ...             required=["query"]
        ...         )
        ...     )
        ... )
    """
    model_config = ConfigDict(arbitrary_types_allowed=True)

    type: Literal["function"] = "function"
    function: ToolFunction
    handler: Optional[Callable[[Dict[str, Any]], Coroutine[Any, Any, Any]]] = Field(
        default=None,
        exclude=True  # Don't serialize handler when converting to dict
    )


class LegalJurisdiction(str, Enum):
    """UK legal jurisdictions supported by Justice Companion."""
    EMPLOYMENT = "employment"
    HOUSING = "housing"
    CONSUMER = "consumer"
    FAMILY = "family"
    CRIMINAL = "criminal"
    CIVIL = "civil"
    IMMIGRATION = "immigration"
    BENEFITS = "benefits"


class AIToolDefinitions:
    """
    Central repository for AI tool definitions.

    This class provides methods to retrieve tool definitions for different
    AI providers and purposes. Currently returns empty lists as tools are
    not yet implemented, but provides the structure for future legal research
    tools.

    Future tools will include:
    - Case law research
    - Statute lookup
    - Document analysis
    - Court deadline calculation
    - Legal form generation
    """

    @staticmethod
    def get_tools_for_provider(provider: AIProviderType) -> List[AITool]:
        """
        Get AI tools available for a specific provider.

        Currently returns empty array for all providers since no tools are
        defined yet. This can be extended to include legal research tools,
        case analysis tools, etc.

        Args:
            provider: The AI provider type

        Returns:
            List of AITool definitions compatible with the provider

        Example:
            >>> tools = AIToolDefinitions.get_tools_for_provider(
            ...     AIProviderType.OPENAI
            ... )
            >>> print(len(tools))  # Currently 0
            0
        """
        # For now, return empty array for all providers
        # This can be extended with actual legal tools like:
        # - Case law research
        # - Statute lookup
        # - Document analysis
        # - Court deadline calculation
        # - Legal form generation

        return []

    @staticmethod
    def get_legal_research_tools() -> List[AITool]:
        """
        Get legal research tools (future implementation).

        These would be actual tools that AI can call during conversations:
        - search_case_law: Search UK case law databases
        - lookup_statute: Look up specific legislation
        - calculate_deadlines: Calculate tribunal deadlines
        - generate_form: Generate legal forms
        - analyze_contract: Analyze contract terms

        Returns:
            List of legal research tool definitions (currently empty)
        """
        # Future implementation will return legal research tools
        return []

    @staticmethod
    def create_search_case_law_tool() -> AITool:
        """
        Create the search_case_law tool definition.

        This tool allows AI to search UK case law databases for relevant
        precedents across different legal jurisdictions.

        Returns:
            AITool definition for case law search

        Example:
            >>> tool = AIToolDefinitions.create_search_case_law_tool()
            >>> print(tool.function.name)
            search_case_law
        """
        return AITool(
            type="function",
            function=ToolFunction(
                name="search_case_law",
                description="Search UK case law databases for relevant precedents",
                parameters=ToolParameters(
                    type="object",
                    properties={
                        "query": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Search query for case law"
                        ),
                        "jurisdiction": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Legal jurisdiction to search",
                            enum=[j.value for j in LegalJurisdiction]
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

    @staticmethod
    def create_lookup_statute_tool() -> AITool:
        """
        Create the lookup_statute tool definition.

        This tool allows AI to look up specific UK legislation or regulations
        by name and optionally by section.

        Returns:
            AITool definition for statute lookup

        Example:
            >>> tool = AIToolDefinitions.create_lookup_statute_tool()
            >>> print(tool.function.name)
            lookup_statute
        """
        return AITool(
            type="function",
            function=ToolFunction(
                name="lookup_statute",
                description="Look up specific UK legislation or regulations",
                parameters=ToolParameters(
                    type="object",
                    properties={
                        "statute": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Name of statute or regulation"
                        ),
                        "section": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Specific section if known"
                        )
                    },
                    required=["statute"]
                )
            )
        )

    @staticmethod
    def create_calculate_deadlines_tool() -> AITool:
        """
        Create the calculate_deadlines tool definition.

        This tool allows AI to calculate legal deadlines and tribunal timelines
        based on case type and relevant dates.

        Returns:
            AITool definition for deadline calculation
        """
        return AITool(
            type="function",
            function=ToolFunction(
                name="calculate_deadlines",
                description="Calculate legal deadlines and tribunal timelines",
                parameters=ToolParameters(
                    type="object",
                    properties={
                        "case_type": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Type of legal case",
                            enum=[j.value for j in LegalJurisdiction]
                        ),
                        "start_date": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Start date for calculation (ISO 8601 format)"
                        ),
                        "event_type": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Type of event triggering deadline",
                            enum=[
                                "dismissal",
                                "notice_received",
                                "hearing_scheduled",
                                "judgment_issued",
                                "appeal_window"
                            ]
                        )
                    },
                    required=["case_type", "start_date", "event_type"]
                )
            )
        )

    @staticmethod
    def create_analyze_document_tool() -> AITool:
        """
        Create the analyze_document tool definition.

        This tool allows AI to analyze legal documents, contracts, and
        evidence for key terms, obligations, and potential issues.

        Returns:
            AITool definition for document analysis
        """
        return AITool(
            type="function",
            function=ToolFunction(
                name="analyze_document",
                description="Analyze legal documents for key terms, obligations, and issues",
                parameters=ToolParameters(
                    type="object",
                    properties={
                        "document_text": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Text content of the document to analyze"
                        ),
                        "document_type": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Type of document",
                            enum=[
                                "contract",
                                "agreement",
                                "notice",
                                "evidence",
                                "correspondence",
                                "court_order",
                                "statute",
                                "regulation"
                            ]
                        ),
                        "focus_areas": ToolParameter(
                            type=ToolParameterType.ARRAY,
                            description="Specific areas to focus analysis on",
                            items={
                                "type": "string",
                                "enum": [
                                    "obligations",
                                    "deadlines",
                                    "penalties",
                                    "rights",
                                    "definitions",
                                    "termination_clauses",
                                    "dispute_resolution"
                                ]
                            }
                        )
                    },
                    required=["document_text", "document_type"]
                )
            )
        )

    @staticmethod
    def create_generate_form_tool() -> AITool:
        """
        Create the generate_form tool definition.

        This tool allows AI to generate legal forms and templates based on
        case information and jurisdiction.

        Returns:
            AITool definition for form generation
        """
        return AITool(
            type="function",
            function=ToolFunction(
                name="generate_form",
                description="Generate legal forms and templates",
                parameters=ToolParameters(
                    type="object",
                    properties={
                        "form_type": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Type of form to generate",
                            enum=[
                                "et1_employment_tribunal",
                                "et3_response",
                                "n1_claim_form",
                                "witness_statement",
                                "particulars_of_claim",
                                "defence",
                                "counterclaim",
                                "appeal_notice"
                            ]
                        ),
                        "jurisdiction": ToolParameter(
                            type=ToolParameterType.STRING,
                            description="Legal jurisdiction",
                            enum=[j.value for j in LegalJurisdiction]
                        ),
                        "case_details": ToolParameter(
                            type=ToolParameterType.OBJECT,
                            description="Case information to populate the form",
                            properties={}  # Would be defined based on form type
                        )
                    },
                    required=["form_type", "jurisdiction"]
                )
            )
        )

    @staticmethod
    def get_all_tools() -> List[AITool]:
        """
        Get all available AI tools.

        Returns a comprehensive list of all tool definitions that can be
        used with AI models. This is useful for providers that accept
        multiple tools in a single request.

        Returns:
            List of all AITool definitions

        Example:
            >>> tools = AIToolDefinitions.get_all_tools()
            >>> tool_names = [tool.function.name for tool in tools]
            >>> print(tool_names)
            []  # Currently empty, will include tools in future
        """
        # Future implementation will return all available tools
        # Currently returns empty list
        tools: List[AITool] = []

        # Uncomment when ready to enable tools:
        # tools.extend([
        #     AIToolDefinitions.create_search_case_law_tool(),
        #     AIToolDefinitions.create_lookup_statute_tool(),
        #     AIToolDefinitions.create_calculate_deadlines_tool(),
        #     AIToolDefinitions.create_analyze_document_tool(),
        #     AIToolDefinitions.create_generate_form_tool(),
        # ])

        return tools

    @staticmethod
    def tool_to_openai_format(tool: AITool) -> Dict[str, Any]:
        """
        Convert AITool to OpenAI function calling format.

        Args:
            tool: AITool instance to convert

        Returns:
            Dictionary formatted for OpenAI API

        Example:
            >>> tool = AIToolDefinitions.create_search_case_law_tool()
            >>> openai_format = AIToolDefinitions.tool_to_openai_format(tool)
            >>> print(openai_format['type'])
            function
        """
        return tool.model_dump(exclude={"handler"}, exclude_none=True)

    @staticmethod
    def tool_to_anthropic_format(tool: AITool) -> Dict[str, Any]:
        """
        Convert AITool to Anthropic tool calling format.

        Anthropic's format is similar to OpenAI but with slight differences
        in structure and naming conventions.

        Args:
            tool: AITool instance to convert

        Returns:
            Dictionary formatted for Anthropic API

        Example:
            >>> tool = AIToolDefinitions.create_search_case_law_tool()
            >>> anthropic_format = AIToolDefinitions.tool_to_anthropic_format(tool)
            >>> print(anthropic_format['name'])
            search_case_law
        """
        # Anthropic uses a flatter structure
        return {
            "name": tool.function.name,
            "description": tool.function.description,
            "input_schema": tool.function.parameters.model_dump(exclude_none=True)
        }


def get_tools_for_provider(provider: Union[AIProviderType, str]) -> List[AITool]:
    """
    Convenience function to get tools for a provider.

    Args:
        provider: AI provider type (enum or string)

    Returns:
        List of AITool definitions

    Example:
        >>> tools = get_tools_for_provider("openai")
        >>> print(len(tools))
        0
    """
    if isinstance(provider, str):
        provider = AIProviderType(provider)
    return AIToolDefinitions.get_tools_for_provider(provider)


# Example usage and demonstration
if __name__ == "__main__":
    # Demonstrate tool definitions
    print("=== AI Tool Definitions Demo ===\n")

    # Get tools for OpenAI
    tools = get_tools_for_provider(AIProviderType.OPENAI)
    print(f"Tools for OpenAI: {len(tools)}")

    # Create example tools
    print("\n=== Example Tool: Search Case Law ===")
    case_law_tool = AIToolDefinitions.create_search_case_law_tool()
    print(f"Name: {case_law_tool.function.name}")
    print(f"Description: {case_law_tool.function.description}")
    print(f"Required params: {case_law_tool.function.parameters.required}")

    # Convert to OpenAI format
    print("\n=== OpenAI Format ===")
    openai_format = AIToolDefinitions.tool_to_openai_format(case_law_tool)
    print(f"Type: {openai_format['type']}")
    print(f"Function name: {openai_format['function']['name']}")

    # Convert to Anthropic format
    print("\n=== Anthropic Format ===")
    anthropic_format = AIToolDefinitions.tool_to_anthropic_format(case_law_tool)
    print(f"Name: {anthropic_format['name']}")
    print(f"Input schema type: {anthropic_format['input_schema']['type']}")

    # Show all available tools
    print("\n=== All Available Tools ===")
    all_tools = AIToolDefinitions.get_all_tools()
    print(f"Total tools: {len(all_tools)}")

    # Demonstrate statute lookup tool
    print("\n=== Example Tool: Lookup Statute ===")
    statute_tool = AIToolDefinitions.create_lookup_statute_tool()
    print(f"Name: {statute_tool.function.name}")
    print(f"Description: {statute_tool.function.description}")

    print("\n=== Demo complete ===")
