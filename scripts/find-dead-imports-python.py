#!/usr/bin/env python3
"""
Dead Import Finder for Python - Justice Companion Cleanup Tool

Scans Python files for unused imports and reports them.
Uses Python's AST module for accurate parsing.

Usage: python scripts/find-dead-imports-python.py [--fix] [--json] [path]

Options:
  --fix    Auto-remove dead imports (creates backup first)
  --json   Output results as JSON
  path     Specific directory to scan (default: backend)
"""

import ast
import os
import sys
import json
import shutil
from pathlib import Path
from typing import Dict, List, Set, Tuple, NamedTuple
from dataclasses import dataclass, asdict


@dataclass
class DeadImport:
    name: str
    line: int
    import_type: str  # 'import' or 'from'
    module: str


@dataclass
class FileResult:
    file: str
    total_imports: int
    dead_imports: List[DeadImport]


class ImportVisitor(ast.NodeVisitor):
    """AST visitor to collect all imports and their usage."""
    
    def __init__(self):
        self.imports: List[Tuple[str, int, str, str]] = []  # (name, line, type, module)
        self.used_names: Set[str] = set()
        self.in_import = False
    
    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name.split('.')[0]
            self.imports.append((name, node.lineno, 'import', alias.name))
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node: ast.ImportFrom):
        module = node.module or ''
        for alias in node.names:
            if alias.name == '*':
                continue  # Can't track star imports
            name = alias.asname if alias.asname else alias.name
            self.imports.append((name, node.lineno, 'from', f"{module}.{alias.name}"))
        self.generic_visit(node)
    
    def visit_Name(self, node: ast.Name):
        self.used_names.add(node.id)
        self.generic_visit(node)
    
    def visit_Attribute(self, node: ast.Attribute):
        # Track the base name of attribute access (e.g., 'os' in 'os.path')
        if isinstance(node.value, ast.Name):
            self.used_names.add(node.value.id)
        self.generic_visit(node)
    
    def visit_FunctionDef(self, node: ast.FunctionDef):
        # Check decorators
        for decorator in node.decorator_list:
            self.visit(decorator)
        # Check annotations
        if node.returns:
            self._extract_annotation_names(node.returns)
        for arg in node.args.args + node.args.posonlyargs + node.args.kwonlyargs:
            if arg.annotation:
                self._extract_annotation_names(arg.annotation)
        self.generic_visit(node)
    
    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self.visit_FunctionDef(node)
    
    def visit_AnnAssign(self, node: ast.AnnAssign):
        self._extract_annotation_names(node.annotation)
        self.generic_visit(node)
    
    def _extract_annotation_names(self, node):
        """Extract names from type annotations."""
        if node is None:
            return
        if isinstance(node, ast.Name):
            self.used_names.add(node.id)
        elif isinstance(node, ast.Subscript):
            self._extract_annotation_names(node.value)
            if hasattr(node.slice, 'elts'):  # Tuple of types
                for elt in node.slice.elts:
                    self._extract_annotation_names(elt)
            else:
                self._extract_annotation_names(node.slice)
        elif isinstance(node, ast.Tuple):
            for elt in node.elts:
                self._extract_annotation_names(elt)
        elif isinstance(node, ast.List):
            for elt in node.elts:
                self._extract_annotation_names(elt)
        elif isinstance(node, ast.Attribute):
            if isinstance(node.value, ast.Name):
                self.used_names.add(node.value.id)
        elif isinstance(node, ast.BinOp):  # Union types with |
            self._extract_annotation_names(node.left)
            self._extract_annotation_names(node.right)
        elif isinstance(node, ast.Constant):
            if isinstance(node.value, str):
                # Forward reference as string
                self.used_names.add(node.value.split('[')[0].strip())
        # Skip other types (bool, None, etc.)


def find_python_files(directory: Path, ignore_dirs: Set[str] = None) -> List[Path]:
    """Recursively find all Python files."""
    if ignore_dirs is None:
        ignore_dirs = {'__pycache__', '.git', '.venv', 'venv', 'node_modules', '.pytest_cache', '.mypy_cache'}
    
    files = []
    for item in directory.iterdir():
        if item.is_dir():
            if item.name not in ignore_dirs:
                files.extend(find_python_files(item, ignore_dirs))
        elif item.is_file() and item.suffix == '.py':
            files.append(item)
    return files


def analyze_file(file_path: Path) -> FileResult:
    """Analyze a Python file for dead imports."""
    content = file_path.read_text(encoding='utf-8')
    
    try:
        tree = ast.parse(content)
    except SyntaxError as e:
        return FileResult(str(file_path), 0, [])
    
    visitor = ImportVisitor()
    visitor.visit(tree)
    
    dead_imports = []
    for name, line, import_type, module in visitor.imports:
        if name not in visitor.used_names:
            # Special cases that are often used implicitly
            if name in ('annotations', '__future__'):
                continue
            # Check if it's a typing import used in string annotations
            if import_type == 'from' and 'typing' in module:
                # These are often used in string annotations, skip them
                if any(f'"{name}"' in content or f"'{name}'" in content):
                    continue
            
            dead_imports.append(DeadImport(
                name=name,
                line=line,
                import_type=import_type,
                module=module
            ))
    
    return FileResult(
        file=str(file_path),
        total_imports=len(visitor.imports),
        dead_imports=dead_imports
    )


def remove_dead_imports(file_path: Path, dead_imports: List[DeadImport]) -> bool:
    """Remove dead imports from a file."""
    if not dead_imports:
        return False
    
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')
    dead_lines = {d.line for d in dead_imports}
    dead_names = {d.name for d in dead_imports}
    
    # Create backup
    shutil.copy2(file_path, str(file_path) + '.bak')
    
    new_lines = []
    modified = False
    
    for i, line in enumerate(lines, 1):
        if i in dead_lines:
            stripped = line.strip()
            # Check if entire line is the dead import
            if stripped.startswith('import ') or stripped.startswith('from '):
                # Check if this is a multi-import line
                if ',' in line and 'from' in line:
                    # Parse and remove just the dead imports
                    try:
                        # Simple regex-like removal for "from x import a, b, c"
                        parts = line.split('import ', 1)
                        if len(parts) == 2:
                            prefix = parts[0] + 'import '
                            imports = [i.strip() for i in parts[1].split(',')]
                            live_imports = [i for i in imports if i.split(' as ')[-1].strip() not in dead_names]
                            if live_imports:
                                new_line = prefix + ', '.join(live_imports)
                                new_lines.append(new_line)
                                modified = True
                                continue
                    except Exception:
                        pass
                # Skip the entire line
                modified = True
                continue
        new_lines.append(line)
    
    if modified:
        file_path.write_text('\n'.join(new_lines), encoding='utf-8')
    
    return modified


def main():
    # Fix Windows encoding issues
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    # Parse arguments
    args = sys.argv[1:]
    fix_mode = '--fix' in args
    json_mode = '--json' in args
    
    # Find target path
    path_arg = next((a for a in args if not a.startswith('--')), 'backend')
    
    # Resolve paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    scan_path = project_root / path_arg
    
    if not scan_path.exists():
        print(f"Error: Path not found: {scan_path}", file=sys.stderr)
        sys.exit(1)
    
    # Find and analyze files
    files = find_python_files(scan_path)
    results: List[FileResult] = []
    total_dead = 0
    files_with_dead = 0
    
    for file_path in files:
        try:
            result = analyze_file(file_path)
            result.file = str(file_path.relative_to(project_root))
            
            if result.dead_imports:
                files_with_dead += 1
                total_dead += len(result.dead_imports)
                results.append(result)
                
                if fix_mode:
                    remove_dead_imports(file_path, result.dead_imports)
        except Exception as e:
            if not json_mode:
                print(f"Error processing {file_path}: {e}", file=sys.stderr)
    
    # Output results
    if json_mode:
        output = {
            'scannedFiles': len(files),
            'filesWithDeadImports': files_with_dead,
            'totalDeadImports': total_dead,
            'results': [asdict(r) for r in results],
            'fixed': fix_mode,
        }
        print(json.dumps(output, indent=2, default=lambda x: asdict(x) if hasattr(x, '__dataclass_fields__') else str(x)))
    else:
        # Pretty print
        print(f"\n\033[36m[Python] Dead Import Finder - Justice Companion\033[0m")
        print(f"\033[2mScanning: {scan_path}\033[0m\n")
        
        if not results:
            print("\033[32m[OK] No dead imports found! Your Python code is proper clean, like.\033[0m\n")
        else:
            print(f"\033[33mFound {total_dead} dead imports in {files_with_dead} files:\033[0m\n")
            
            for result in results:
                print(f"\033[34m  {result.file}\033[0m")
                for dead in result.dead_imports:
                    print(f"   \033[31mX\033[0m Line {dead.line}: \033[33m{dead.name}\033[0m \033[2m({dead.import_type} {dead.module})\033[0m")
                print()
            
            if fix_mode:
                print("\033[32m[OK] Removed dead imports (backups created with .bak extension)\033[0m\n")
            else:
                print("\033[2mRun with --fix to auto-remove dead imports\033[0m\n")
        
        # Summary
        print("\033[36m--------------------------------------------\033[0m")
        print("\033[36m[Summary]\033[0m")
        print(f"   Files scanned:     {len(files)}")
        print(f"   Files with issues: {files_with_dead}")
        print(f"   Dead imports:      {total_dead}")
        print("\033[36m--------------------------------------------\033[0m\n")
    
    sys.exit(1 if results else 0)


if __name__ == '__main__':
    main()
