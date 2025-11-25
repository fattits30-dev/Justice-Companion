"""
Unit tests for AI Tool Definitions service.

Tests cover:
- Tool creation and validation
- Parameter schema generation
- Provider-specific tool retrieval
- Format conversion (OpenAI/Anthropic)
- Type safety and Pydantic validation

Run with: pytest test_ai_tool_definitions.py -v
"""

import pytest
from typing import Dict, Any
from pydantic import ValidationError

from backend.services.ai.tools import (
    AITool,
    AIToolDefinitions,
    AIProviderType,
    ToolParameter,
    ToolParameters,
    ToolFunction,
    ToolParameterType,
    LegalJurisdiction,
    get_tools_for_provider,
)

class TestAIProviderType:
    """Test AI provider type enumeration."""

    def test_all_provider_types_exist(self):
        """Test that all expected provider types are defined."""
        expected_providers = [
            "openai",
            "anthropic",
            "huggingface",
            "qwen",
            "google",
            "cohere",
            "together",
            "anyscale",
            "mistral",
            "perplexity",
        ]

        for provider in expected_providers:
            assert AIProviderType(provider) is not None

    def test_provider_type_values(self):
        """Test that provider enum values match expected strings."""
        assert AIProviderType.OPENAI.value == "openai"
        assert AIProviderType.ANTHROPIC.value == "anthropic"
        assert AIProviderType.HUGGINGFACE.value == "huggingface"

class TestToolParameter:
    """Test tool parameter definitions."""

    def test_create_string_parameter(self):
        """Test creating a string parameter."""
        param = ToolParameter(
            type=ToolParameterType.STRING,
            description="A test string parameter"
        )

        assert param.type == ToolParameterType.STRING
        assert param.description == "A test string parameter"
        assert param.enum is None
        assert param.default is None

    def test_create_parameter_with_enum(self):
        """Test creating a parameter with enum values."""
        param = ToolParameter(
            type=ToolParameterType.STRING,
            description="Jurisdiction type",
            enum=["employment", "housing", "consumer"]
        )

        assert len(param.enum) == 3
        assert "employment" in param.enum

    def test_create_parameter_with_default(self):
        """Test creating a parameter with default value."""
        param = ToolParameter(
            type=ToolParameterType.NUMBER,
            description="Maximum results",
            default=5
        )

        assert param.default == 5

    def test_create_array_parameter(self):
        """Test creating an array parameter with item schema."""
        param = ToolParameter(
            type=ToolParameterType.ARRAY,
            description="List of focus areas",
            items={
                "type": "string",
                "enum": ["obligations", "deadlines", "penalties"]
            }
        )

        assert param.type == ToolParameterType.ARRAY
        assert param.items is not None
        assert param.items["type"] == "string"

class TestToolParameters:
    """Test tool parameters schema."""

    def test_create_empty_parameters(self):
        """Test creating empty parameters object."""
        params = ToolParameters()

        assert params.type == "object"
        assert len(params.properties) == 0
        assert len(params.required) == 0

    def test_create_parameters_with_properties(self):
        """Test creating parameters with properties."""
        params = ToolParameters(
            properties={
                "query": ToolParameter(
                    type=ToolParameterType.STRING,
                    description="Search query"
                ),
                "limit": ToolParameter(
                    type=ToolParameterType.NUMBER,
                    description="Max results",
                    default=5
                )
            },
            required=["query"]
        )

        assert len(params.properties) == 2
        assert "query" in params.properties
        assert "limit" in params.properties
        assert params.required == ["query"]

class TestToolFunction:
    """Test tool function definitions."""

    def test_create_valid_function(self):
        """Test creating a valid function definition."""
        func = ToolFunction(
            name="search_case_law",
            description="Search UK case law databases for relevant precedents",
            parameters=ToolParameters(
                properties={
                    "query": ToolParameter(
                        type=ToolParameterType.STRING,
                        description="Search query"
                    )
                },
                required=["query"]
            )
        )

        assert func.name == "search_case_law"
        assert len(func.description) >= 10
        assert "query" in func.parameters.properties

    def test_function_name_validation(self):
        """Test that function names must be snake_case."""
        # Valid snake_case names should work
        func = ToolFunction(
            name="valid_snake_case",
            description="A valid function with snake_case name",
            parameters=ToolParameters()
        )
        assert func.name == "valid_snake_case"

        # Invalid names should raise validation error
        with pytest.raises(ValidationError):
            ToolFunction(
                name="InvalidCamelCase",
                description="Invalid function name",
                parameters=ToolParameters()
            )

    def test_description_minimum_length(self):
        """Test that description must be at least 10 characters."""
        with pytest.raises(ValidationError):
            ToolFunction(
                name="test_func",
                description="Short",  # Too short
                parameters=ToolParameters()
            )

class TestAITool:
    """Test complete AI tool definitions."""

    def test_create_basic_tool(self):
        """Test creating a basic AI tool."""
        tool = AITool(
            type="function",
            function=ToolFunction(
                name="test_function",
                description="A test function for unit testing",
                parameters=ToolParameters()
            )
        )

        assert tool.type == "function"
        assert tool.function.name == "test_function"
        assert tool.handler is None

    def test_tool_with_handler(self):
        """Test creating a tool with async handler."""
        async def test_handler(args: Dict[str, Any]) -> Dict[str, Any]:
            return {"result": "success"}

        tool = AITool(
            type="function",
            function=ToolFunction(
                name="test_function",
                description="A test function with handler",
                parameters=ToolParameters()
            ),
            handler=test_handler
        )

        assert tool.handler is not None

    def test_tool_dict_excludes_handler(self):
        """Test that handler is excluded when converting to dict."""
        async def test_handler(args: Dict[str, Any]) -> Dict[str, Any]:
            return {"result": "success"}

        tool = AITool(
            type="function",
            function=ToolFunction(
                name="test_function",
                description="A test function with handler",
                parameters=ToolParameters()
            ),
            handler=test_handler
        )

        tool_dict = tool.model_dump(exclude={"handler"})
        assert "handler" not in tool_dict

class TestAIToolDefinitions:
    """Test AI tool definitions service."""

    def test_get_tools_for_provider_returns_empty(self):
        """Test that get_tools_for_provider currently returns empty list."""
        for provider in AIProviderType:
            tools = AIToolDefinitions.get_tools_for_provider(provider)
            assert isinstance(tools, list)
            assert len(tools) == 0

    def test_get_all_tools_returns_empty(self):
        """Test that get_all_tools currently returns empty list."""
        tools = AIToolDefinitions.get_all_tools()
        assert isinstance(tools, list)
        assert len(tools) == 0

    def test_create_search_case_law_tool(self):
        """Test creating search_case_law tool definition."""
        tool = AIToolDefinitions.create_search_case_law_tool()

        assert tool.type == "function"
        assert tool.function.name == "search_case_law"
        assert "UK case law" in tool.function.description

        # Check parameters
        params = tool.function.parameters
        assert "query" in params.properties
        assert "jurisdiction" in params.properties
        assert "limit" in params.properties
        assert params.required == ["query", "jurisdiction"]

        # Check jurisdiction enum
        jurisdiction_param = params.properties["jurisdiction"]
        assert isinstance(jurisdiction_param, ToolParameter)
        assert jurisdiction_param.enum is not None
        assert "employment" in jurisdiction_param.enum

    def test_create_lookup_statute_tool(self):
        """Test creating lookup_statute tool definition."""
        tool = AIToolDefinitions.create_lookup_statute_tool()

        assert tool.function.name == "lookup_statute"
        assert "legislation" in tool.function.description

        params = tool.function.parameters
        assert "statute" in params.properties
        assert "section" in params.properties
        assert params.required == ["statute"]

    def test_create_calculate_deadlines_tool(self):
        """Test creating calculate_deadlines tool definition."""
        tool = AIToolDefinitions.create_calculate_deadlines_tool()

        assert tool.function.name == "calculate_deadlines"
        assert "deadlines" in tool.function.description

        params = tool.function.parameters
        assert "case_type" in params.properties
        assert "start_date" in params.properties
        assert "event_type" in params.properties
        assert params.required == ["case_type", "start_date", "event_type"]

    def test_create_analyze_document_tool(self):
        """Test creating analyze_document tool definition."""
        tool = AIToolDefinitions.create_analyze_document_tool()

        assert tool.function.name == "analyze_document"
        assert "document" in tool.function.description

        params = tool.function.parameters
        assert "document_text" in params.properties
        assert "document_type" in params.properties
        assert "focus_areas" in params.properties

    def test_create_generate_form_tool(self):
        """Test creating generate_form tool definition."""
        tool = AIToolDefinitions.create_generate_form_tool()

        assert tool.function.name == "generate_form"
        assert "form" in tool.function.description

        params = tool.function.parameters
        assert "form_type" in params.properties
        assert "jurisdiction" in params.properties
        assert "case_details" in params.properties

class TestFormatConversion:
    """Test conversion to provider-specific formats."""

    def test_tool_to_openai_format(self):
        """Test converting tool to OpenAI format."""
        tool = AIToolDefinitions.create_search_case_law_tool()
        openai_format = AIToolDefinitions.tool_to_openai_format(tool)

        assert openai_format["type"] == "function"
        assert "function" in openai_format
        assert openai_format["function"]["name"] == "search_case_law"
        assert "parameters" in openai_format["function"]

        # Handler should be excluded
        assert "handler" not in openai_format

    def test_tool_to_anthropic_format(self):
        """Test converting tool to Anthropic format."""
        tool = AIToolDefinitions.create_search_case_law_tool()
        anthropic_format = AIToolDefinitions.tool_to_anthropic_format(tool)

        assert anthropic_format["name"] == "search_case_law"
        assert "description" in anthropic_format
        assert "input_schema" in anthropic_format
        assert anthropic_format["input_schema"]["type"] == "object"

        # Should have flatter structure than OpenAI
        assert "function" not in anthropic_format

    def test_openai_format_has_correct_structure(self):
        """Test OpenAI format matches expected structure."""
        tool = AIToolDefinitions.create_lookup_statute_tool()
        openai_format = AIToolDefinitions.tool_to_openai_format(tool)

        # Check nested structure
        assert "function" in openai_format
        assert "parameters" in openai_format["function"]
        assert "properties" in openai_format["function"]["parameters"]
        assert "required" in openai_format["function"]["parameters"]

    def test_anthropic_format_has_correct_structure(self):
        """Test Anthropic format matches expected structure."""
        tool = AIToolDefinitions.create_lookup_statute_tool()
        anthropic_format = AIToolDefinitions.tool_to_anthropic_format(tool)

        # Check flat structure
        assert "name" in anthropic_format
        assert "description" in anthropic_format
        assert "input_schema" in anthropic_format
        assert "properties" in anthropic_format["input_schema"]

class TestConvenienceFunctions:
    """Test convenience functions."""

    def test_get_tools_for_provider_with_enum(self):
        """Test convenience function with enum."""
        tools = get_tools_for_provider(AIProviderType.OPENAI)
        assert isinstance(tools, list)

    def test_get_tools_for_provider_with_string(self):
        """Test convenience function with string."""
        tools = get_tools_for_provider("anthropic")
        assert isinstance(tools, list)

    def test_get_tools_for_provider_invalid_string(self):
        """Test convenience function with invalid provider string."""
        with pytest.raises(ValueError):
            get_tools_for_provider("invalid_provider")

class TestLegalJurisdiction:
    """Test legal jurisdiction enumeration."""

    def test_all_jurisdictions_exist(self):
        """Test that all expected jurisdictions are defined."""
        expected_jurisdictions = [
            "employment",
            "housing",
            "consumer",
            "family",
            "criminal",
            "civil",
            "immigration",
            "benefits",
        ]

        for jurisdiction in expected_jurisdictions:
            assert LegalJurisdiction(jurisdiction) is not None

    def test_jurisdiction_in_tool_parameters(self):
        """Test that jurisdictions are correctly used in tool parameters."""
        tool = AIToolDefinitions.create_search_case_law_tool()
        jurisdiction_param = tool.function.parameters.properties["jurisdiction"]

        assert isinstance(jurisdiction_param, ToolParameter)
        assert jurisdiction_param.enum is not None
        assert len(jurisdiction_param.enum) == len(LegalJurisdiction)

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_tool_with_empty_description(self):
        """Test that empty description raises validation error."""
        with pytest.raises(ValidationError):
            ToolFunction(
                name="test_func",
                description="",  # Empty
                parameters=ToolParameters()
            )

    def test_tool_with_invalid_type(self):
        """Test that invalid tool type raises validation error."""
        with pytest.raises(ValidationError):
            AITool(
                type="invalid_type",  # Should be "function"
                function=ToolFunction(
                    name="test_func",
                    description="A test function",
                    parameters=ToolParameters()
                )
            )

    def test_parameter_type_validation(self):
        """Test that parameter types are validated."""
        # Valid types should work
        for param_type in ToolParameterType:
            param = ToolParameter(
                type=param_type,
                description="Test parameter"
            )
            assert param.type == param_type

class TestIntegration:
    """Integration tests for complete workflows."""

    def test_complete_tool_creation_workflow(self):
        """Test creating a complete tool from scratch."""
        # Create parameters
        params = ToolParameters(
            properties={
                "query": ToolParameter(
                    type=ToolParameterType.STRING,
                    description="Search query for legal documents"
                ),
                "jurisdiction": ToolParameter(
                    type=ToolParameterType.STRING,
                    description="Legal jurisdiction",
                    enum=[j.value for j in LegalJurisdiction]
                ),
                "max_results": ToolParameter(
                    type=ToolParameterType.INTEGER,
                    description="Maximum number of results to return",
                    default=10
                )
            },
            required=["query", "jurisdiction"]
        )

        # Create function
        func = ToolFunction(
            name="search_legal_documents",
            description="Search legal documents across jurisdictions",
            parameters=params
        )

        # Create tool
        tool = AITool(
            type="function",
            function=func
        )

        # Verify structure
        assert tool.function.name == "search_legal_documents"
        assert len(tool.function.parameters.properties) == 3
        assert len(tool.function.parameters.required) == 2

    def test_convert_tool_to_multiple_formats(self):
        """Test converting same tool to multiple provider formats."""
        tool = AIToolDefinitions.create_search_case_law_tool()

        # Convert to both formats
        openai_format = AIToolDefinitions.tool_to_openai_format(tool)
        anthropic_format = AIToolDefinitions.tool_to_anthropic_format(tool)

        # Both should have same function name
        assert openai_format["function"]["name"] == anthropic_format["name"]

        # Both should have same description
        assert openai_format["function"]["description"] == anthropic_format["description"]

# Run tests with pytest
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
