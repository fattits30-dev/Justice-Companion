"""Codebase analysis tools - heavy lifting for Claude."""

import os
import ast
import re
from pathlib import Path
from typing import Optional
from collections import defaultdict


def analyze(path: str = ".") -> dict:
    """
    Analyze entire codebase structure and return comprehensive summary.

    Returns dict with:
    - folder_structure: nested dict of folders
    - stats: file counts by type
    - large_files: files over 300 lines
    - issues: potential problems found
    """
    path = Path(path).resolve()

    stats = defaultdict(int)
    large_files = []
    issues = []
    folder_structure = {}
    total_lines = 0

    # Directories to skip
    skip_dirs = {
        'node_modules', '.git', '__pycache__', 'venv', '.venv',
        'dist', 'build', 'coverage', '.next', '.cache'
    }

    # File extensions to analyze
    code_extensions = {'.py', '.ts', '.tsx', '.js', '.jsx'}

    for root, dirs, files in os.walk(path):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        rel_root = os.path.relpath(root, path)

        for file in files:
            file_path = Path(root) / file
            ext = file_path.suffix.lower()

            stats[f'total_files'] += 1

            if ext in code_extensions:
                stats[f'{ext}_files'] += 1

                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                        line_count = len(lines)
                        total_lines += line_count

                        if line_count > 300:
                            rel_path = os.path.relpath(file_path, path)
                            large_files.append({
                                'path': rel_path,
                                'lines': line_count,
                                'type': ext,
                                'suggestion': _suggest_split(line_count)
                            })
                except Exception:
                    pass

    # Sort large files by line count
    large_files.sort(key=lambda x: x['lines'], reverse=True)

    # Build folder structure summary (top 2 levels)
    folder_structure = _build_folder_summary(path, skip_dirs, max_depth=2)

    # Identify issues
    if len(large_files) > 10:
        issues.append(f"High number of large files: {len(large_files)} files over 300 lines")

    if stats.get('.py_files', 0) > 0 and stats.get('.ts_files', 0) > 0:
        issues.append("Mixed Python and TypeScript - ensure clear backend/frontend separation")

    return {
        'root': str(path),
        'stats': {
            'total_files': stats['total_files'],
            'total_lines': total_lines,
            'by_type': {k: v for k, v in stats.items() if k != 'total_files'}
        },
        'large_files': {
            'count': len(large_files),
            'top_10': large_files[:10]
        },
        'folder_structure': folder_structure,
        'issues': issues,
        'summary': _generate_summary(stats, large_files, total_lines)
    }


def _suggest_split(line_count: int) -> str:
    """Suggest action based on file size."""
    if line_count > 1000:
        return "CRITICAL: Split into 4-5 smaller modules"
    elif line_count > 700:
        return "HIGH: Split into 3-4 smaller modules"
    elif line_count > 500:
        return "MEDIUM: Consider splitting into 2-3 modules"
    else:
        return "LOW: Could be split but not urgent"


def _build_folder_summary(path: Path, skip_dirs: set, max_depth: int = 2) -> dict:
    """Build a summary of folder structure."""
    result = {}

    try:
        for item in path.iterdir():
            if item.is_dir() and item.name not in skip_dirs and not item.name.startswith('.'):
                if max_depth > 0:
                    sub = _build_folder_summary(item, skip_dirs, max_depth - 1)
                    file_count = sum(1 for _ in item.rglob('*') if _.is_file())
                    result[item.name] = {
                        'files': file_count,
                        'subdirs': sub if sub else None
                    }
    except PermissionError:
        pass

    return result


def _generate_summary(stats: dict, large_files: list, total_lines: int) -> str:
    """Generate a human-readable summary."""
    parts = []
    parts.append(f"Codebase: {stats['total_files']} files, {total_lines:,} lines")

    if large_files:
        parts.append(f"Large files: {len(large_files)} over 300 lines")
        if large_files:
            biggest = large_files[0]
            parts.append(f"Biggest: {biggest['path']} ({biggest['lines']} lines)")

    return " | ".join(parts)


def find_large(path: str = ".", min_lines: int = 300) -> dict:
    """
    Find files exceeding line threshold with detailed analysis.
    """
    path = Path(path).resolve()
    large_files = []

    skip_dirs = {'node_modules', '.git', '__pycache__', 'venv', '.venv', 'dist', 'build', 'coverage'}
    code_extensions = {'.py', '.ts', '.tsx', '.js', '.jsx'}

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for file in files:
            file_path = Path(root) / file
            ext = file_path.suffix.lower()

            if ext in code_extensions:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                        line_count = len(lines)

                        if line_count >= min_lines:
                            rel_path = os.path.relpath(file_path, path)

                            # Try to get function/class count
                            structure = _analyze_structure(file_path, ext)

                            large_files.append({
                                'path': rel_path,
                                'lines': line_count,
                                'type': ext,
                                'functions': structure.get('functions', 0),
                                'classes': structure.get('classes', 0),
                                'suggestion': _suggest_split(line_count),
                                'priority': 'HIGH' if line_count > 700 else 'MEDIUM'
                            })
                except Exception:
                    pass

    large_files.sort(key=lambda x: x['lines'], reverse=True)

    return {
        'threshold': min_lines,
        'count': len(large_files),
        'total_excess_lines': sum(f['lines'] - min_lines for f in large_files),
        'files': large_files,
        'by_priority': {
            'HIGH': len([f for f in large_files if f['priority'] == 'HIGH']),
            'MEDIUM': len([f for f in large_files if f['priority'] == 'MEDIUM'])
        }
    }


def _analyze_structure(file_path: Path, ext: str) -> dict:
    """Analyze file structure (functions, classes)."""
    result = {'functions': 0, 'classes': 0}

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        if ext == '.py':
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                    result['functions'] += 1
                elif isinstance(node, ast.ClassDef):
                    result['classes'] += 1
        else:
            # Simple regex for TS/JS
            result['functions'] = len(re.findall(r'\bfunction\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(', content))
            result['classes'] = len(re.findall(r'\bclass\s+\w+', content))
    except Exception:
        pass

    return result
