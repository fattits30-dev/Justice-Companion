#!/usr/bin/env python3
"""
Justice Companion MCP Server

Provides tools for codebase analysis, reducing Claude's context usage.
Claude calls these tools and receives summaries instead of raw file contents.

Usage:
    python -m mcp_tools.server

Configuration (in .claude/settings.json):
    {
      "mcpServers": {
        "justice-tools": {
          "command": "python",
          "args": ["-m", "mcp_tools.server"],
          "cwd": "${workspaceFolder}"
        }
      }
    }
"""

import logging
import os
import sys

# Configure logging to stderr (stdout is for JSON-RPC)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger("justice-tools")

# Import FastMCP
try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    logger.error("MCP SDK not installed. Run: pip install 'mcp[cli]'")
    sys.exit(1)

# Import our tools
from .tools import codebase

# Initialize the MCP server
mcp = FastMCP("JusticeTools", json_response=True)


# =============================================================================
# CODEBASE ANALYSIS TOOLS
# =============================================================================

@mcp.tool()
def analyze_codebase(path: str = ".") -> dict:
    """
    Analyze entire codebase and return comprehensive summary.

    USE THIS FIRST when starting work on a project to understand:
    - Overall structure and file organization
    - Large files that may need refactoring
    - Potential issues and code smells

    Args:
        path: Root path to analyze (default: current directory)

    Returns:
        Dictionary containing:
        - stats: File counts by type, total lines
        - large_files: Files over 300 lines with suggestions
        - folder_structure: Project organization
        - issues: Potential problems identified
        - summary: Human-readable overview
    """
    logger.info(f"Analyzing codebase at: {path}")
    result = codebase.analyze(path)
    logger.info(f"Analysis complete: {result['summary']}")
    return result


@mcp.tool()
def find_large_files(path: str = ".", min_lines: int = 300) -> dict:
    """
    Find files exceeding a line count threshold.

    USE THIS when looking for refactoring candidates or
    understanding which files need to be split.

    Args:
        path: Directory to search (default: current directory)
        min_lines: Minimum line count to flag (default: 300)

    Returns:
        Dictionary containing:
        - count: Number of large files found
        - files: List with path, lines, functions, classes, priority
        - by_priority: Count of HIGH vs MEDIUM priority files
        - total_excess_lines: Sum of lines over threshold
    """
    logger.info(f"Finding files over {min_lines} lines in: {path}")
    result = codebase.find_large(path, min_lines)
    logger.info(f"Found {result['count']} large files")
    return result


@mcp.tool()
def analyze_file(file_path: str) -> dict:
    """
    Deep analysis of a single file.

    USE THIS before modifying a file to understand:
    - What functions/classes it contains
    - Dependencies and imports
    - Complexity and potential issues

    Args:
        file_path: Path to the file to analyze

    Returns:
        Dictionary containing:
        - lines: Total line count
        - functions: List of function names and line numbers
        - classes: List of class names and methods
        - imports: External dependencies
        - issues: Code smells or problems
        - suggested_splits: How to break up the file
    """
    import ast
    import re
    from pathlib import Path

    logger.info(f"Analyzing file: {file_path}")

    path = Path(file_path)
    if not path.exists():
        return {"error": f"File not found: {file_path}"}

    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        return {"error": str(e)}

    result = {
        'path': str(path),
        'lines': len(lines),
        'functions': [],
        'classes': [],
        'imports': [],
        'issues': [],
        'suggested_splits': []
    }

    ext = path.suffix.lower()

    if ext == '.py':
        try:
            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    end_line = getattr(node, 'end_lineno', node.lineno + 10)
                    func_lines = end_line - node.lineno
                    result['functions'].append({
                        'name': node.name,
                        'line': node.lineno,
                        'size': func_lines,
                        'is_large': func_lines > 50
                    })
                elif isinstance(node, ast.ClassDef):
                    methods = [n.name for n in node.body
                              if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                    result['classes'].append({
                        'name': node.name,
                        'line': node.lineno,
                        'methods': methods,
                        'method_count': len(methods)
                    })
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            result['imports'].append(alias.name)
                    else:
                        if node.module:
                            result['imports'].append(node.module)
        except SyntaxError as e:
            result['issues'].append(f"Syntax error: {e}")

    elif ext in ('.ts', '.tsx', '.js', '.jsx'):
        # Simple regex-based analysis for TypeScript/JavaScript
        import_matches = re.findall(r"import\s+.*?from\s+['\"](.+?)['\"]", content)
        result['imports'] = list(set(import_matches))

        func_matches = re.finditer(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', content)
        for match in func_matches:
            result['functions'].append({
                'name': match.group(1),
                'line': content[:match.start()].count('\n') + 1
            })

        class_matches = re.finditer(r'(?:export\s+)?class\s+(\w+)', content)
        for match in class_matches:
            result['classes'].append({
                'name': match.group(1),
                'line': content[:match.start()].count('\n') + 1
            })

    # Identify issues
    if result['lines'] > 500:
        result['issues'].append(f"File is large ({result['lines']} lines) - consider splitting")

    large_funcs = [f for f in result['functions'] if f.get('is_large')]
    if large_funcs:
        result['issues'].append(f"{len(large_funcs)} functions over 50 lines")

    # Suggest splits based on classes
    if len(result['classes']) > 1:
        for cls in result['classes']:
            result['suggested_splits'].append({
                'type': 'class',
                'name': cls['name'],
                'suggestion': f"Extract {cls['name']} to {cls['name'].lower()}.py"
            })

    result['summary'] = (
        f"{result['lines']} lines, "
        f"{len(result['functions'])} functions, "
        f"{len(result['classes'])} classes, "
        f"{len(result['issues'])} issues"
    )

    logger.info(f"File analysis complete: {result['summary']}")
    return result


@mcp.tool()
def find_symbol(name: str, path: str = ".", file_type: str = "all") -> dict:
    """
    Find all definitions and usages of a symbol (function, class, variable).

    USE THIS when you need to:
    - Understand where something is defined
    - Find all usages before renaming
    - Check if something is used at all (dead code)

    Args:
        name: Symbol name to search for
        path: Directory to search (default: current directory)
        file_type: "py", "ts", or "all" (default: all)

    Returns:
        Dictionary containing:
        - definition: Where the symbol is defined
        - usages: List of files and line numbers where used
        - usage_count: Total number of usages
        - is_exported: Whether it's exported/public
    """
    import re
    from pathlib import Path

    logger.info(f"Finding symbol '{name}' in {path}")

    root = Path(path).resolve()
    skip_dirs = {'node_modules', '.git', '__pycache__', 'venv', 'dist', 'build', 'coverage'}

    extensions = {'.py', '.ts', '.tsx', '.js', '.jsx'}
    if file_type == "py":
        extensions = {'.py'}
    elif file_type == "ts":
        extensions = {'.ts', '.tsx', '.js', '.jsx'}

    result = {
        'symbol': name,
        'definition': None,
        'usages': [],
        'usage_count': 0,
        'is_exported': False,
        'files_checked': 0
    }

    # Patterns for definitions
    def_patterns = [
        rf'\bdef\s+{re.escape(name)}\s*\(',           # Python function
        rf'\bclass\s+{re.escape(name)}\b',            # Python/TS class
        rf'\bfunction\s+{re.escape(name)}\s*\(',      # JS function
        rf'\bconst\s+{re.escape(name)}\s*=',          # JS const
        rf'\blet\s+{re.escape(name)}\s*=',            # JS let
        rf'\bexport\s+(?:default\s+)?(?:function|class|const)\s+{re.escape(name)}',  # Export
    ]

    for root_dir, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for file in files:
            file_path = Path(root_dir) / file
            if file_path.suffix.lower() not in extensions:
                continue

            result['files_checked'] += 1

            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.split('\n')

                rel_path = str(file_path.relative_to(root))

                # Check for definition
                for i, line in enumerate(lines, 1):
                    for pattern in def_patterns:
                        if re.search(pattern, line):
                            result['definition'] = {
                                'file': rel_path,
                                'line': i,
                                'content': line.strip()[:100]
                            }
                            if 'export' in line.lower():
                                result['is_exported'] = True
                            break

                # Count usages (simple word boundary match)
                usage_pattern = rf'\b{re.escape(name)}\b'
                for i, line in enumerate(lines, 1):
                    if re.search(usage_pattern, line):
                        # Skip the definition line
                        if result['definition'] and result['definition']['line'] == i and result['definition']['file'] == rel_path:
                            continue
                        result['usages'].append({
                            'file': rel_path,
                            'line': i,
                            'content': line.strip()[:80]
                        })
                        result['usage_count'] += 1

            except Exception:
                pass

    # Limit usages to first 20 to save context
    if len(result['usages']) > 20:
        result['usages'] = result['usages'][:20]
        result['usages_truncated'] = True

    result['summary'] = (
        f"Symbol '{name}': "
        f"{'defined in ' + result['definition']['file'] if result['definition'] else 'definition not found'}, "
        f"{result['usage_count']} usages"
    )

    logger.info(result['summary'])
    return result


@mcp.tool()
def smart_search(query: str, path: str = ".", file_type: str = "all", max_results: int = 20) -> dict:
    """
    Search codebase with context and return summarized results.

    USE THIS instead of grep/ripgrep when you need to:
    - Find code patterns
    - Search for specific implementations
    - Understand how something is used

    Args:
        query: Search pattern (supports regex)
        path: Directory to search
        file_type: "py", "ts", or "all"
        max_results: Maximum results to return (default: 20)

    Returns:
        Dictionary containing:
        - matches: List of matches with file, line, context
        - match_count: Total matches found
        - files_with_matches: Number of files containing matches
        - summary: Overview of results
    """
    import re
    from pathlib import Path

    logger.info(f"Searching for '{query}' in {path}")

    root = Path(path).resolve()
    skip_dirs = {'node_modules', '.git', '__pycache__', 'venv', 'dist', 'build', 'coverage'}

    extensions = {'.py', '.ts', '.tsx', '.js', '.jsx', '.json', '.md'}
    if file_type == "py":
        extensions = {'.py'}
    elif file_type == "ts":
        extensions = {'.ts', '.tsx', '.js', '.jsx'}

    result = {
        'query': query,
        'matches': [],
        'match_count': 0,
        'files_with_matches': set(),
        'files_checked': 0
    }

    try:
        pattern = re.compile(query, re.IGNORECASE)
    except re.error:
        pattern = re.compile(re.escape(query), re.IGNORECASE)

    for root_dir, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for file in files:
            file_path = Path(root_dir) / file
            if file_path.suffix.lower() not in extensions:
                continue

            result['files_checked'] += 1

            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()

                rel_path = str(file_path.relative_to(root))

                for i, line in enumerate(lines, 1):
                    if pattern.search(line):
                        result['match_count'] += 1
                        result['files_with_matches'].add(rel_path)

                        if len(result['matches']) < max_results:
                            # Get context (1 line before and after)
                            context_before = lines[i-2].strip() if i > 1 else ""
                            context_after = lines[i].strip() if i < len(lines) else ""

                            result['matches'].append({
                                'file': rel_path,
                                'line': i,
                                'content': line.strip()[:100],
                                'context_before': context_before[:60] if context_before else None,
                                'context_after': context_after[:60] if context_after else None
                            })

            except Exception:
                pass

    result['files_with_matches'] = list(result['files_with_matches'])

    result['summary'] = (
        f"Found {result['match_count']} matches in "
        f"{len(result['files_with_matches'])} files "
        f"(searched {result['files_checked']} files)"
    )

    if result['match_count'] > max_results:
        result['truncated'] = True
        result['summary'] += f" - showing first {max_results}"

    logger.info(result['summary'])
    return result


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    """Run the MCP server."""
    logger.info("Starting Justice Tools MCP Server")
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
