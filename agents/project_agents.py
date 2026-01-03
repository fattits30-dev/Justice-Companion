"""
Justice Companion Project Agents
Autonomous helpers for development tasks
"""
import subprocess
import sys
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/home/jamiesavage/claude/projects/Justice-Companion")
MODEL = "deepseek-coder-v2:16b"

def run_ollama(prompt: str, timeout: int = 300) -> str:
    result = subprocess.run(
        ["ollama", "run", MODEL, prompt],
        capture_output=True, text=True, timeout=timeout
    )
    return result.stdout.strip()

def read_file(path: str) -> str:
    full_path = PROJECT_ROOT / path
    return full_path.read_text() if full_path.exists() else f"File not found: {path}"

class CodeReviewAgent:
    def review_file(self, filepath: str) -> str:
        code = read_file(filepath)
        return run_ollama(f"""Review this code for Justice Companion (legal case management app).
Check: Security, Flutter/Dart best practices, Riverpod patterns, error handling.
File: {filepath}
```
{code[:4000]}
```
Provide specific issues and fixes.""")
    
    def review_backend(self, filepath: str) -> str:
        code = read_file(f"backend/{filepath}")
        return run_ollama(f"""Review this FastAPI code for Justice Companion.
Check: SQL injection, auth issues, validation, DI patterns.
File: {filepath}
```
{code[:4000]}
```
Provide specific issues and fixes.""")

class TestGeneratorAgent:
    def generate_flutter_test(self, filepath: str) -> str:
        code = read_file(filepath)
        return run_ollama(f"""Generate Flutter tests for this code (use flutter_test, mockito, Riverpod).
```dart
{code[:3000]}
```
Generate complete test file.""")
    
    def generate_backend_test(self, filepath: str) -> str:
        code = read_file(f"backend/{filepath}")
        return run_ollama(f"""Generate pytest tests for this FastAPI code.
```python
{code[:3000]}
```
Generate complete test file.""")

class RefactorAgent:
    def suggest_refactor(self, filepath: str) -> str:
        code = read_file(filepath)
        return run_ollama(f"""Analyze for refactoring (DRY, complexity, abstractions, Riverpod patterns):
```
{code[:4000]}
```
Provide suggestions with code examples.""")

class DocumentationAgent:
    def document_file(self, filepath: str) -> str:
        code = read_file(filepath)
        return run_ollama(f"""Generate documentation (purpose, classes, functions, examples):
```
{code[:4000]}
```
Output in markdown.""")

class BugFixAgent:
    def analyze_error(self, error_message: str, context_file: str = None) -> str:
        context = f"\n\nCode:\n```\n{read_file(context_file)[:2000]}\n```" if context_file else ""
        return run_ollama(f"""Analyze this Justice Companion error:
{error_message}{context}
Provide: root cause, exact fix, prevention.""")

class FeatureAgent:
    def plan_feature(self, description: str) -> str:
        return run_ollama(f"""Plan this Justice Companion feature:
{description}

Stack: Flutter+Riverpod frontend, FastAPI+SQLAlchemy backend, SQLCipher DB.
Provide: files to modify, schema changes, API endpoints, UI components, implementation steps.""")

def main():
    agents = {
        "review": CodeReviewAgent(), "test": TestGeneratorAgent(),
        "refactor": RefactorAgent(), "docs": DocumentationAgent(),
        "bugfix": BugFixAgent(), "feature": FeatureAgent(),
    }
    
    if len(sys.argv) < 2:
        print("""
Justice Companion Agents
========================
  review <file>         - Review Flutter/Dart code
  review-backend <file> - Review Python backend
  test <file>           - Generate Flutter tests
  test-backend <file>   - Generate Python tests  
  refactor <file>       - Suggest refactoring
  docs <file>           - Generate documentation
  bugfix "<error>"      - Analyze and fix error
  feature "<desc>"      - Plan feature implementation
        """)
        return
    
    cmd, args = sys.argv[1], sys.argv[2:]
    
    handlers = {
        "review": lambda: agents["review"].review_file(args[0]),
        "review-backend": lambda: agents["review"].review_backend(args[0]),
        "test": lambda: agents["test"].generate_flutter_test(args[0]),
        "test-backend": lambda: agents["test"].generate_backend_test(args[0]),
        "refactor": lambda: agents["refactor"].suggest_refactor(args[0]),
        "docs": lambda: agents["docs"].document_file(args[0]),
        "bugfix": lambda: agents["bugfix"].analyze_error(" ".join(args)),
        "feature": lambda: agents["feature"].plan_feature(" ".join(args)),
    }
    
    if cmd in handlers and args:
        print(handlers[cmd]())
    else:
        print(f"Usage: python project_agents.py <command> <args>")

if __name__ == "__main__":
    main()
