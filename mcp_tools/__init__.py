"""
Justice Companion MCP Tools

A Model Context Protocol server that provides codebase analysis tools,
reducing Claude's context window usage by doing heavy lifting in Python
and returning summaries.

Tools available:
- analyze_codebase: Full codebase structure and stats
- find_large_files: Find files over a line threshold
- analyze_file: Deep analysis of a single file
- find_symbol: Find definition and usages of a symbol
- smart_search: Search with context and summarization
"""

__version__ = "1.0.0"
