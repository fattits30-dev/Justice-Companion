#!/usr/bin/env python3
"""
Fix Suggester Agent - Pattern-based error analysis
Justice Companion Multi-Agent System

Responsibility: Analyze errors and suggest fixes using best practices
Auto-generates suggestions without AI or terminal prompts
"""

import sys
import json
import time
import re
from pathlib import Path
from datetime import datetime, timezone

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from state_manager import StateManager


class FixSuggesterAgent:
    """
    Agent responsible for suggesting fixes using pattern-based analysis.

    Single Responsibility: Analyze test failures and suggest fixes
    Uses best practices and common error patterns
    """

    def __init__(self, config: dict):
        self.config = config
        self.agent_id = "fix_suggester"

        # Determine project root (parent of automation directory)
        self.project_root = Path(__file__).parent.parent.parent

        # State management (relative to project root)
        state_file = self.project_root / 'automation' / 'state' / 'app_state.json'
        lock_file = self.project_root / 'automation' / 'state' / 'app_state.lock'
        self.state = StateManager(state_file, lock_file)

        # Directories (relative to project root)
        self.tasks_dir = self.project_root / 'automation' / 'tasks'
        self.suggestions_dir = self.project_root / 'automation' / 'suggestions'
        self.suggestions_dir.mkdir(parents=True, exist_ok=True)

        # Statistics
        self.stats = {
            'tasks_analyzed': 0,
            'suggestions_created': 0,
            'start_time': None
        }

        # Processed tasks tracking
        self.processed_tasks = set()

        # Error pattern database
        self.error_patterns = self._build_error_patterns()

    def _build_error_patterns(self):
        """Build database of error patterns and suggested fixes (GitHub-sourced best practices)."""
        return [
            # === MODULE RESOLUTION ERRORS ===
            {
                'pattern': r"Cannot find module ['\"]\.\.?/",
                'category': 'Import Path Error',
                'diagnosis': 'Relative import path incorrect or tsconfig.json misconfigured',
                'fix': 'STEP 1: Check tsconfig.json has "moduleResolution": "node"\nSTEP 2: Add "baseUrl": "." or "baseUrl": "./src"\nSTEP 3: Verify file exists at the path\nSTEP 4: Check case sensitivity (forceConsistentCasingInFileNames: true)',
                'example': '// tsconfig.json\n{\n  "compilerOptions": {\n    "moduleResolution": "node",\n    "baseUrl": ".",\n    "forceConsistentCasingInFileNames": true\n  }\n}'
            },
            {
                'pattern': r"Cannot find module ['\"]@/|Cannot find module ['\"]~/",
                'category': 'Path Alias Error',
                'diagnosis': 'Path aliases (@/ or ~/) defined in tsconfig but not working',
                'fix': 'STEP 1: Add path mapping in tsconfig.json\nSTEP 2: Install tsconfig-paths: npm install --save-dev tsconfig-paths\nSTEP 3: Register paths in your entry file or use ts-node -r tsconfig-paths/register',
                'example': '// tsconfig.json\n{\n  "compilerOptions": {\n    "baseUrl": ".",\n    "paths": {\n      "@/*": ["src/*"],\n      "~/*": ["src/*"]\n    }\n  }\n}\n// In your main file:\nimport "tsconfig-paths/register";'
            },
            {
                'pattern': r"Cannot find module ['\"]([a-z0-9@/-]+)['\"]",
                'category': 'Missing npm Package',
                'diagnosis': 'Package not installed in node_modules',
                'fix': 'STEP 1: Install the package: npm install <package-name>\nSTEP 2: If TypeScript types missing: npm install --save-dev @types/<package-name>\nSTEP 3: If still failing: rm -rf node_modules package-lock.json && npm install',
                'example': '# For the exact package in error:\nnpm install <package-name>\nnpm install --save-dev @types/<package-name>'
            },

            # === TYPE SAFETY ERRORS ===
            {
                'pattern': r"Object is possibly 'null'|Object is possibly 'undefined'",
                'category': 'Null/Undefined Safety',
                'diagnosis': 'Value not checked before use (strict null checks enabled)',
                'fix': 'SOLUTION 1: Optional chaining - obj?.property\nSOLUTION 2: Nullish coalescing - const value = obj ?? defaultValue\nSOLUTION 3: Type guard - if (obj != null) { obj.property }\nSOLUTION 4: Non-null assertion (use sparingly) - obj!.property',
                'example': '// Best practice (type guard):\nif (user != null) {\n  console.log(user.name);\n}\n\n// Or optional chaining:\nconst name = user?.name ?? "Unknown";'
            },
            {
                'pattern': r"Property ['\"]value['\"] does not exist on type ['\"]EventTarget['\"]",
                'category': 'Event Type Error (React/DOM)',
                'diagnosis': 'event.target needs type assertion to access specific element properties',
                'fix': 'Type cast event.target to the specific HTML element type',
                'example': '// For input elements:\nconst value = (event.target as HTMLInputElement).value;\n\n// For select elements:\nconst index = (event.target as HTMLSelectElement).selectedIndex;\n\n// For textarea:\nconst text = (event.target as HTMLTextAreaElement).value;'
            },
            {
                'pattern': r"Element implicitly has an ['\"]any['\"] type because.*has no index signature",
                'category': 'Index Signature Error',
                'diagnosis': 'Trying to access object property dynamically without index signature',
                'fix': 'SOLUTION 1: Use keyof for type-safe access - obj[key as keyof typeof obj]\nSOLUTION 2: Add index signature to interface - [key: string]: ValueType\nSOLUTION 3: Use Record type - Record<string, ValueType>',
                'example': '// Solution 1 (type-safe):\nconst key = "name";\nconst value = obj[key as keyof typeof obj];\n\n// Solution 2 (flexible):\ninterface MyType {\n  [key: string]: string | number;\n  name: string;\n}'
            },

            # === REACT/TYPESCRIPT SPECIFIC ===
            {
                'pattern': r"Type ['\"]string['\"] is not assignable to type ['\"]ReactNode['\"]|Type.*is not assignable.*ReactNode",
                'category': 'React Props Type Error',
                'diagnosis': 'Component expects ReactNode but received more restrictive type',
                'fix': 'Change prop type from string to ReactNode to accept both strings and JSX',
                'example': '// Before:\ninterface Props {\n  children: string; // ❌ Too restrictive\n}\n\n// After:\nimport { ReactNode } from "react";\ninterface Props {\n  children: ReactNode; // ✅ Accepts strings, JSX, etc.\n}'
            },
            {
                'pattern': r"Property ['\"](\w+)['\"] does not exist on type",
                'category': 'Missing Type Property',
                'diagnosis': 'Property not defined in interface/type or typo in property name',
                'fix': 'STEP 1: Check for typos in property name\nSTEP 2: Add property to interface/type definition\nSTEP 3: Use optional property if not always present: property?: Type',
                'example': '// Add to interface:\ninterface User {\n  name: string;\n  email?: string; // Optional property\n}\n\n// Or for React props:\ninterface Props {\n  isImportant?: boolean; // Optional prop\n}'
            },

            # === TYPE INFERENCE & CONVERSION ===
            {
                'pattern': r"['\"](\w+)['\"] is not assignable to type ['\"]never['\"]",
                'category': 'Never Type Inference Error',
                'diagnosis': 'TypeScript inferred never[] for array/object - needs explicit type',
                'fix': 'Add explicit type annotation when initializing arrays/objects',
                'example': '// Before:\nconst items = []; // ❌ Inferred as never[]\n\n// After:\nconst items: MyType[] = []; // ✅ Explicit type\n\n// Or for objects:\nconst data: Record<string, string> = {};'
            },
            {
                'pattern': r"Argument of type ['\"](\w+)['\"] is not assignable to parameter of type ['\"](\w+)['\"]",
                'category': 'Type Mismatch in Function Call',
                'diagnosis': 'Function called with wrong type',
                'fix': 'SOLUTION 1: Convert type - Number(str), String(num), Boolean(val)\nSOLUTION 2: Type assertion - value as TargetType\nSOLUTION 3: Update function signature to accept both types',
                'example': '// Type conversion:\nconst num = Number(stringValue);\nconst str = String(numberValue);\n\n// Type assertion (use carefully):\nfunctionExpectingString(value as string);'
            },

            # === COMMON LOGIC ERRORS ===
            {
                'pattern': r"validation logic is backwards",
                'category': 'Inverted Logic Error',
                'diagnosis': 'Boolean condition or comparison operator flipped',
                'fix': 'STEP 1: Check comparison operators (< vs >, <= vs >=)\nSTEP 2: Check boolean logic (true vs false, ! operator)\nSTEP 3: Review test expectations to understand correct logic',
                'example': '// Wrong:\nif (value < minValue) return true; // ❌ Backwards\n\n// Correct:\nif (value >= minValue) return true; // ✅ Fixed'
            },
            {
                'pattern': r"Right-hand side of ['\"]instanceof['\"] is not an object",
                'category': 'Invalid instanceof Usage',
                'diagnosis': 'Using instanceof with primitive type or non-constructor',
                'fix': 'Use typeof for primitives, instanceof only for classes/constructors',
                'example': '// Wrong:\nif (value instanceof String) // ❌\n\n// Correct:\nif (typeof value === "string") // ✅ For primitives\nif (value instanceof Date) // ✅ For class instances'
            },
            {
                'pattern': r"Expected (\d+) arguments, but got (\d+)",
                'category': 'Wrong Number of Arguments',
                'diagnosis': 'Function called with incorrect argument count',
                'fix': 'STEP 1: Check function signature for required parameters\nSTEP 2: Provide all required arguments\nSTEP 3: If argument is optional, add default value or ? in function signature',
                'example': '// Function definition:\nfunction createUser(name: string, email: string, age?: number) {}\n\n// Correct calls:\ncreateUser("Alice", "a@example.com"); // ✅\ncreateUser("Bob", "b@example.com", 30); // ✅'
            },

            # === TEST FAILURES ===
            {
                'pattern': r"should (\w+) with valid input",
                'category': 'Test Assertion Failure',
                'diagnosis': 'Implementation does not meet test expectations',
                'fix': 'STEP 1: Read test code to understand expected behavior\nSTEP 2: Run test in isolation to see exact failure\nSTEP 3: Add console.log to debug actual vs expected values\nSTEP 4: Fix implementation logic to match test requirements',
                'example': '// Debug approach:\nconsole.log("Actual:", actualValue);\nconsole.log("Expected:", expectedValue);\n// Then fix the implementation logic'
            },
        ]

    def start(self):
        """Start the fix suggester agent."""
        print(f"[{self.agent_id}] Starting Fix Suggester Agent")
        print(f"[{self.agent_id}] Mode: Pattern-based analysis (auto-suggest)")

        self.stats['start_time'] = datetime.now(timezone.utc)

        # Update state
        def update_status(state):
            if 'agents' not in state:
                state['agents'] = {}
            state['agents'][self.agent_id] = {
                'status': 'running',
                'last_heartbeat': datetime.now(timezone.utc).isoformat()
            }
            return state

        self.state.update(update_status)

        print(f"[{self.agent_id}] [READY] Listening for tasks...")

        # Event loop
        try:
            while True:
                self._process_tasks()
                time.sleep(3)  # Check every 3 seconds

                if int(time.time()) % 30 == 0:
                    self._heartbeat()

        except KeyboardInterrupt:
            print(f"\n[{self.agent_id}] Shutting down...")
            self._print_stats()

    def _process_tasks(self):
        """Process pending tasks from tasks directory."""
        if not self.tasks_dir.exists():
            return

        # Find unprocessed tasks
        task_files = sorted(self.tasks_dir.glob('*.json'))

        for task_file in task_files:
            task_id = task_file.stem

            # Skip if already processed
            if task_id in self.processed_tasks:
                continue

            # Read task
            with open(task_file) as f:
                task = json.load(f)

            # Only process pending test_failure tasks
            if task.get('status') != 'pending' or task.get('type') != 'test_failure':
                continue

            # Analyze and suggest fix
            self._analyze_and_suggest(task_id, task)

            # Mark as processed
            self.processed_tasks.add(task_id)

    def _analyze_and_suggest(self, task_id: str, task: dict):
        """Analyze error using pattern matching and suggest fix."""
        print(f"\n[{self.agent_id}] Analyzing task: {task_id[:8]}...")
        self.stats['tasks_analyzed'] += 1

        files = task.get('files', [])
        test_result = task.get('test_result', {})
        error_output = test_result.get('stdout', '') or test_result.get('stderr', '')

        # Pattern-based analysis
        matches = []
        for pattern_data in self.error_patterns:
            pattern = pattern_data['pattern']
            match = re.search(pattern, error_output, re.MULTILINE | re.IGNORECASE)
            if match:
                matches.append({
                    'pattern': pattern_data,
                    'match': match,
                    'matched_text': match.group(0)
                })

        if matches:
            # Use first (most specific) match
            best_match = matches[0]
            pattern_info = best_match['pattern']

            suggestion = f"""**Error Category:** {pattern_info['category']}

**Matched Error:**
{best_match['matched_text']}

**Diagnosis:**
{pattern_info['diagnosis']}

**Suggested Fix:**
{pattern_info['fix']}

**Example:**
{pattern_info['example']}

**Files Affected:**
{chr(10).join(f'  - {f}' for f in files)}

**Recommended Actions:**
1. Review the file(s) listed above
2. Locate the error in the code
3. Apply the suggested fix pattern
4. Re-run tests to verify the fix

**Full Error Output (truncated to 500 chars):**
{error_output[:500]}...
"""

            # Save suggestion
            self._save_suggestion(task_id, files, error_output, suggestion)
            print(f"[{self.agent_id}] [OK] Suggestion created")

        else:
            # Generic suggestion when no pattern matches
            suggestion = f"""**Error Category:** Unknown Pattern

**Full Error Output:**
{error_output[:1000]}

**Generic Troubleshooting Steps:**
1. Read the error message carefully
2. Check for typos in variable/function names
3. Verify all imports are correct
4. Check type annotations match actual usage
5. Look for null/undefined safety issues
6. Review test expectations vs implementation

**Files Affected:**
{chr(10).join(f'  - {f}' for f in files)}

**Recommended Actions:**
- Use TypeScript strict mode to catch type errors
- Add null checks where objects might be undefined
- Ensure all required function parameters are provided
- Verify return types match function signatures
"""

            # Save generic suggestion
            self._save_suggestion(task_id, files, error_output, suggestion)
            print(f"[{self.agent_id}] [GENERIC] Suggestion created (no pattern match)")

        self.stats['suggestions_created'] += 1

    def _save_suggestion(self, task_id: str, files: list, error: str, analysis: str):
        """Save suggestion to file."""
        suggestion_data = {
            'suggestion_id': task_id,
            'task_id': task_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'files': files,
            'error': error,
            'analysis': analysis,
            'status': 'auto_suggested',
            'approved': False,
            'source': 'pattern_matcher'
        }

        # Save JSON file
        suggestion_file = self.suggestions_dir / f"{task_id}.json"
        with open(suggestion_file, 'w') as f:
            json.dump(suggestion_data, f, indent=2)

        # Create human-readable text file
        readable_file = self.suggestions_dir / f"{task_id}.txt"
        self._create_readable_suggestion(readable_file, suggestion_data)

        print(f"[{self.agent_id}] Saved: {suggestion_file.name}")

    def _create_readable_suggestion(self, file_path: Path, suggestion_data: dict):
        """Create human-readable suggestion file."""
        task_id = suggestion_data['task_id']
        files = suggestion_data['files']
        analysis = suggestion_data['analysis']
        created_at = suggestion_data['created_at']

        content = f"""{'='*70}
JUSTICE COMPANION - FIX SUGGESTION (AUTO-GENERATED)
{'='*70}

Suggestion ID: {task_id[:8]}...
Created:       {created_at}
Source:        Pattern-based analysis

{'='*70}
FILES AFFECTED
{'='*70}

{chr(10).join(f'  - {f}' for f in files)}

{'='*70}
ANALYSIS & SUGGESTED FIX
{'='*70}

{analysis}

{'='*70}
AUTO-GENERATED SUGGESTION
{'='*70}

This suggestion was automatically generated using error pattern matching
and TypeScript/React best practices. Review carefully before applying.

{'='*70}
"""

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    def _heartbeat(self):
        """Update heartbeat in state."""
        def update_heartbeat(state):
            if 'agents' not in state:
                state['agents'] = {}
            if self.agent_id not in state['agents']:
                state['agents'][self.agent_id] = {}
            state['agents'][self.agent_id]['last_heartbeat'] = datetime.now(timezone.utc).isoformat()
            return state

        self.state.update(update_heartbeat)

    def _print_stats(self):
        """Print agent statistics."""
        uptime = datetime.now(timezone.utc) - self.stats['start_time']

        print("\n" + "="*60)
        print(f"{self.agent_id.upper()} STATISTICS")
        print("="*60)
        print(f"Uptime:              {uptime}")
        print(f"Tasks analyzed:      {self.stats['tasks_analyzed']}")
        print(f"Suggestions created: {self.stats['suggestions_created']}")
        print("="*60 + "\n")


def load_config():
    """Load configuration from .env file."""
    env_file = Path(__file__).parent.parent / '.env'
    config = {'PROJECT_ROOT': str(Path(__file__).parent.parent.parent)}

    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()

    return config


if __name__ == '__main__':
    print("="*60)
    print("FIX SUGGESTER AGENT")
    print("Justice Companion Multi-Agent System")
    print("="*60)
    print("Mode: Pattern-based analysis (auto-suggest)")
    print("="*60)

    config = load_config()
    agent = FixSuggesterAgent(config)
    agent.start()
