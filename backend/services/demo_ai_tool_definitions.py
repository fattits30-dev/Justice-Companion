#!/usr/bin/env python3
"""
Demonstration script for AI Tool Definitions service.

Shows all features and capabilities of the AI tool definitions system.

Usage: python demo_ai_tool_definitions.py
"""

import json
from typing import Dict, Any

from ai_tool_definitions import (
    AITool,
    AIToolDefinitions,
    AIProviderType,
    LegalJurisdiction,
    ToolParameter,
    ToolParameters,
    ToolFunction,
    ToolParameterType,
    get_tools_for_provider,
)


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'=' * 80}")
    print(f"  {title}")
    print(f"{'=' * 80}\n")


def print_json(data: Dict[str, Any], indent: int = 2):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=indent, default=str))


def demo_provider_types():
    """Demonstrate AI provider types."""
    print_section("1. Supported AI Providers")

    print("Available providers:")
    for provider in AIProviderType:
        print(f"  - {provider.value:15} ({provider.name})")

    print(f"\nTotal providers: {len(AIProviderType)}")


def demo_legal_jurisdictions():
    """Demonstrate legal jurisdictions."""
    print_section("2. Legal Jurisdictions")

    print("Supported UK jurisdictions:")
    for jurisdiction in LegalJurisdiction:
        print(f"  - {jurisdiction.value:15} ({jurisdiction.name})")

    print(f"\nTotal jurisdictions: {len(LegalJurisdiction)}")


def demo_search_case_law_tool():
    """Demonstrate search case law tool."""
    print_section("3. Search Case Law Tool")

    tool = AIToolDefinitions.create_search_case_law_tool()

    print(f"Name: {tool.function.name}")
    print(f"Description: {tool.function.description}")
    print(f"\nParameters:")
    for param_name, param in tool.function.parameters.properties.items():
        if isinstance(param, ToolParameter):
            required = "(required)" if param_name in tool.function.parameters.required else "(optional)"
            param_type = param.type.value if hasattr(param.type, 'value') else param.type
            print(f"  - {param_name:15} {param_type:10} {required}")
            print(f"    Description: {param.description}")
            if param.enum:
                print(f"    Allowed values: {', '.join(param.enum[:3])}...")
            if param.default is not None:
                print(f"    Default: {param.default}")
            print()


def demo_lookup_statute_tool():
    """Demonstrate lookup statute tool."""
    print_section("4. Lookup Statute Tool")

    tool = AIToolDefinitions.create_lookup_statute_tool()

    print(f"Name: {tool.function.name}")
    print(f"Description: {tool.function.description}")
    print(f"\nParameters: {list(tool.function.parameters.properties.keys())}")
    print(f"Required: {tool.function.parameters.required}")


def demo_calculate_deadlines_tool():
    """Demonstrate calculate deadlines tool."""
    print_section("5. Calculate Deadlines Tool")

    tool = AIToolDefinitions.create_calculate_deadlines_tool()

    print(f"Name: {tool.function.name}")
    print(f"Description: {tool.function.description}")

    event_type_param = tool.function.parameters.properties.get("event_type")
    if isinstance(event_type_param, ToolParameter) and event_type_param.enum:
        print(f"\nSupported event types:")
        for event_type in event_type_param.enum:
            print(f"  - {event_type}")


def demo_analyze_document_tool():
    """Demonstrate analyze document tool."""
    print_section("6. Analyze Document Tool")

    tool = AIToolDefinitions.create_analyze_document_tool()

    print(f"Name: {tool.function.name}")
    print(f"Description: {tool.function.description}")

    doc_type_param = tool.function.parameters.properties.get("document_type")
    if isinstance(doc_type_param, ToolParameter) and doc_type_param.enum:
        print(f"\nSupported document types:")
        for doc_type in doc_type_param.enum:
            print(f"  - {doc_type}")

    focus_areas_param = tool.function.parameters.properties.get("focus_areas")
    if isinstance(focus_areas_param, ToolParameter) and focus_areas_param.items:
        if "enum" in focus_areas_param.items:
            print(f"\nSupported focus areas:")
            for focus_area in focus_areas_param.items["enum"]:
                print(f"  - {focus_area}")


def demo_generate_form_tool():
    """Demonstrate generate form tool."""
    print_section("7. Generate Form Tool")

    tool = AIToolDefinitions.create_generate_form_tool()

    print(f"Name: {tool.function.name}")
    print(f"Description: {tool.function.description}")

    form_type_param = tool.function.parameters.properties.get("form_type")
    if isinstance(form_type_param, ToolParameter) and form_type_param.enum:
        print(f"\nSupported form types:")
        for form_type in form_type_param.enum:
            print(f"  - {form_type}")


def demo_openai_format():
    """Demonstrate OpenAI format conversion."""
    print_section("8. OpenAI Format Conversion")

    tool = AIToolDefinitions.create_search_case_law_tool()
    openai_format = AIToolDefinitions.tool_to_openai_format(tool)

    print("OpenAI-compatible format:")
    print_json(openai_format)


def demo_anthropic_format():
    """Demonstrate Anthropic format conversion."""
    print_section("9. Anthropic Format Conversion")

    tool = AIToolDefinitions.create_search_case_law_tool()
    anthropic_format = AIToolDefinitions.tool_to_anthropic_format(tool)

    print("Anthropic-compatible format:")
    print_json(anthropic_format)


def demo_custom_tool():
    """Demonstrate creating a custom tool."""
    print_section("10. Creating a Custom Tool")

    # Create a custom tool for extracting legal entities
    custom_tool = AITool(
        type="function",
        function=ToolFunction(
            name="extract_legal_entities",
            description="Extract legal entities (parties, courts, dates) from text",
            parameters=ToolParameters(
                properties={
                    "text": ToolParameter(
                        type=ToolParameterType.STRING,
                        description="Legal text to analyze"
                    ),
                    "entity_types": ToolParameter(
                        type=ToolParameterType.ARRAY,
                        description="Types of entities to extract",
                        items={
                            "type": "string",
                            "enum": ["party", "court", "date", "statute", "case"]
                        }
                    ),
                    "confidence_threshold": ToolParameter(
                        type=ToolParameterType.NUMBER,
                        description="Minimum confidence score (0-1)",
                        default=0.8
                    )
                },
                required=["text"]
            )
        )
    )

    print("Custom tool created:")
    print(f"Name: {custom_tool.function.name}")
    print(f"Description: {custom_tool.function.description}")
    print(f"Parameters: {list(custom_tool.function.parameters.properties.keys())}")


def demo_get_tools_for_provider():
    """Demonstrate getting tools for specific provider."""
    print_section("11. Getting Tools for Provider")

    for provider in [AIProviderType.OPENAI, AIProviderType.ANTHROPIC]:
        tools = get_tools_for_provider(provider)
        print(f"{provider.value}: {len(tools)} tools available")
        if tools:
            print(f"  Tools: {[tool.function.name for tool in tools]}")

    print("\nNote: Currently returns empty list. Will be populated when tools are ready.")


def demo_all_tools():
    """Demonstrate getting all tools."""
    print_section("12. All Available Tools")

    all_tools = AIToolDefinitions.get_all_tools()
    print(f"Total tools: {len(all_tools)}")

    if all_tools:
        print("\nAvailable tools:")
        for tool in all_tools:
            print(f"  - {tool.function.name}: {tool.function.description}")
    else:
        print("\nNote: Tool list is currently empty. Will be populated when tools are ready.")


def demo_tool_comparison():
    """Demonstrate comparing OpenAI and Anthropic formats."""
    print_section("13. Format Comparison: OpenAI vs Anthropic")

    tool = AIToolDefinitions.create_lookup_statute_tool()

    print("Same tool, different formats:\n")

    print("OpenAI Structure:")
    openai_format = AIToolDefinitions.tool_to_openai_format(tool)
    print(f"  - Nested structure: {{'type': 'function', 'function': {{'name': '...', ...}}}}")
    print(f"  - Keys: {list(openai_format.keys())}")
    print(f"  - Function keys: {list(openai_format['function'].keys())}")

    print("\nAnthropic Structure:")
    anthropic_format = AIToolDefinitions.tool_to_anthropic_format(tool)
    print(f"  - Flat structure: {{'name': '...', 'description': '...', 'input_schema': {{}}}}")
    print(f"  - Keys: {list(anthropic_format.keys())}")


def demo_type_safety():
    """Demonstrate type safety with Pydantic validation."""
    print_section("14. Type Safety and Validation")

    print("Example 1: Valid tool name (snake_case)")
    try:
        tool = ToolFunction(
            name="valid_snake_case",
            description="A valid function name",
            parameters=ToolParameters()
        )
        print(f"  [OK] Success: {tool.name}")
    except Exception as e:
        print(f"  [ERROR] Error: {e}")

    print("\nExample 2: Invalid tool name (CamelCase)")
    try:
        tool = ToolFunction(
            name="InvalidCamelCase",
            description="An invalid function name",
            parameters=ToolParameters()
        )
        print(f"  [OK] Success: {tool.name}")
    except Exception as e:
        print(f"  [ERROR] Error: Validation failed (expected)")

    print("\nExample 3: Description too short")
    try:
        tool = ToolFunction(
            name="test_func",
            description="Short",  # Too short (min 10 chars)
            parameters=ToolParameters()
        )
        print(f"  [OK] Success: {tool.name}")
    except Exception as e:
        print(f"  [ERROR] Error: Validation failed (expected)")


def main():
    """Run all demonstrations."""
    print("\n" + "=" * 80)
    print("  AI TOOL DEFINITIONS - COMPREHENSIVE DEMONSTRATION")
    print("=" * 80)

    # Run all demos
    demo_provider_types()
    demo_legal_jurisdictions()
    demo_search_case_law_tool()
    demo_lookup_statute_tool()
    demo_calculate_deadlines_tool()
    demo_analyze_document_tool()
    demo_generate_form_tool()
    demo_openai_format()
    demo_anthropic_format()
    demo_custom_tool()
    demo_get_tools_for_provider()
    demo_all_tools()
    demo_tool_comparison()
    demo_type_safety()

    print_section("Demonstration Complete")
    print("[SUCCESS] All features demonstrated successfully!")
    print("\nNext steps:")
    print("  1. Implement tool handlers for each function")
    print("  2. Integrate with UK legal APIs (legislation.gov.uk, caselaw.nationalarchives.gov.uk)")
    print("  3. Enable tools in get_all_tools() by uncommenting the tool list")
    print("  4. Add tool usage analytics and caching")
    print("\nFor more information, see AI_TOOL_DEFINITIONS_README.md")
    print()


if __name__ == "__main__":
    main()
