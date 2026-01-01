#!/usr/bin/env python3
"""
Justice Tools CLI - Alternative to MCP for Termux

Usage:
    python -m mcp_tools.cli analyze_codebase [path]
    python -m mcp_tools.cli find_large_files [path] [min_lines]
    python -m mcp_tools.cli analyze_file <file_path>
    python -m mcp_tools.cli find_symbol <name> [path]
    python -m mcp_tools.cli smart_search <query> [path]

Output is JSON for easy parsing.
"""

import sys
import json
import argparse
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from mcp_tools.tools import codebase


def main():
    parser = argparse.ArgumentParser(
        description="Justice Companion Codebase Analysis Tools"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # analyze_codebase
    p1 = subparsers.add_parser("analyze_codebase", help="Analyze entire codebase")
    p1.add_argument("path", nargs="?", default=".", help="Path to analyze")

    # find_large_files
    p2 = subparsers.add_parser("find_large_files", help="Find files over line threshold")
    p2.add_argument("path", nargs="?", default=".", help="Path to search")
    p2.add_argument("--min-lines", type=int, default=300, help="Minimum lines")

    # analyze_file
    p3 = subparsers.add_parser("analyze_file", help="Deep analysis of single file")
    p3.add_argument("file_path", help="Path to file")

    # find_symbol
    p4 = subparsers.add_parser("find_symbol", help="Find symbol definitions and usages")
    p4.add_argument("name", help="Symbol name")
    p4.add_argument("path", nargs="?", default=".", help="Path to search")
    p4.add_argument("--type", choices=["py", "ts", "all"], default="all")

    # smart_search
    p5 = subparsers.add_parser("smart_search", help="Search with context")
    p5.add_argument("query", help="Search pattern")
    p5.add_argument("path", nargs="?", default=".", help="Path to search")
    p5.add_argument("--type", choices=["py", "ts", "all"], default="all")
    p5.add_argument("--max", type=int, default=20, help="Max results")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    result = None

    if args.command == "analyze_codebase":
        result = codebase.analyze(args.path)

    elif args.command == "find_large_files":
        result = codebase.find_large(args.path, args.min_lines)

    elif args.command == "analyze_file":
        # Import the analyze_file function from server
        import ast
        import re

        path = Path(args.file_path)
        if not path.exists():
            result = {"error": f"File not found: {args.file_path}"}
        else:
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.split('\n')

                result = {
                    'path': str(path),
                    'lines': len(lines),
                    'functions': [],
                    'classes': [],
                    'imports': [],
                    'issues': []
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
                                    'size': func_lines
                                })
                            elif isinstance(node, ast.ClassDef):
                                methods = [n.name for n in node.body
                                          if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                                result['classes'].append({
                                    'name': node.name,
                                    'line': node.lineno,
                                    'methods': methods
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
                    import_matches = re.findall(r"import\s+.*?from\s+['\"](.+?)['\"]", content)
                    result['imports'] = list(set(import_matches))

                    func_matches = re.finditer(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', content)
                    for match in func_matches:
                        result['functions'].append({
                            'name': match.group(1),
                            'line': content[:match.start()].count('\n') + 1
                        })

                if result['lines'] > 500:
                    result['issues'].append(f"File is large ({result['lines']} lines)")

                result['summary'] = (
                    f"{result['lines']} lines, "
                    f"{len(result['functions'])} functions, "
                    f"{len(result['classes'])} classes"
                )
            except Exception as e:
                result = {"error": str(e)}

    elif args.command == "find_symbol":
        import re

        root = Path(args.path).resolve()
        skip_dirs = {'node_modules', '.git', '__pycache__', 'venv', 'dist', 'build', 'coverage'}

        extensions = {'.py', '.ts', '.tsx', '.js', '.jsx'}
        if args.type == "py":
            extensions = {'.py'}
        elif args.type == "ts":
            extensions = {'.ts', '.tsx', '.js', '.jsx'}

        result = {
            'symbol': args.name,
            'definition': None,
            'usages': [],
            'usage_count': 0
        }

        def_patterns = [
            rf'\bdef\s+{re.escape(args.name)}\s*\(',
            rf'\bclass\s+{re.escape(args.name)}\b',
            rf'\bfunction\s+{re.escape(args.name)}\s*\(',
            rf'\bconst\s+{re.escape(args.name)}\s*=',
        ]

        import os
        for root_dir, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d not in skip_dirs]

            for file in files:
                file_path = Path(root_dir) / file
                if file_path.suffix.lower() not in extensions:
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        lines_list = content.split('\n')

                    rel_path = str(file_path.relative_to(root))

                    for i, line in enumerate(lines_list, 1):
                        for pattern in def_patterns:
                            if re.search(pattern, line):
                                result['definition'] = {
                                    'file': rel_path,
                                    'line': i,
                                    'content': line.strip()[:80]
                                }
                                break

                        usage_pattern = rf'\b{re.escape(args.name)}\b'
                        if re.search(usage_pattern, line):
                            if not (result['definition'] and
                                   result['definition']['line'] == i and
                                   result['definition']['file'] == rel_path):
                                result['usage_count'] += 1
                                if len(result['usages']) < 15:
                                    result['usages'].append({
                                        'file': rel_path,
                                        'line': i
                                    })

                except Exception:
                    pass

        result['summary'] = (
            f"Symbol '{args.name}': "
            f"{'found at ' + result['definition']['file'] + ':' + str(result['definition']['line']) if result['definition'] else 'not found'}, "
            f"{result['usage_count']} usages"
        )

    elif args.command == "smart_search":
        import re
        import os

        root = Path(args.path).resolve()
        skip_dirs = {'node_modules', '.git', '__pycache__', 'venv', 'dist', 'build', 'coverage'}

        extensions = {'.py', '.ts', '.tsx', '.js', '.jsx', '.json', '.md'}
        if args.type == "py":
            extensions = {'.py'}
        elif args.type == "ts":
            extensions = {'.ts', '.tsx', '.js', '.jsx'}

        result = {
            'query': args.query,
            'matches': [],
            'match_count': 0,
            'files_with_matches': []
        }

        try:
            pattern = re.compile(args.query, re.IGNORECASE)
        except re.error:
            pattern = re.compile(re.escape(args.query), re.IGNORECASE)

        files_set = set()

        for root_dir, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d not in skip_dirs]

            for file in files:
                file_path = Path(root_dir) / file
                if file_path.suffix.lower() not in extensions:
                    continue

                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines_list = f.readlines()

                    rel_path = str(file_path.relative_to(root))

                    for i, line in enumerate(lines_list, 1):
                        if pattern.search(line):
                            result['match_count'] += 1
                            files_set.add(rel_path)

                            if len(result['matches']) < args.max:
                                result['matches'].append({
                                    'file': rel_path,
                                    'line': i,
                                    'content': line.strip()[:80]
                                })

                except Exception:
                    pass

        result['files_with_matches'] = list(files_set)
        result['summary'] = (
            f"Found {result['match_count']} matches in "
            f"{len(result['files_with_matches'])} files"
        )

    # Output as JSON
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
