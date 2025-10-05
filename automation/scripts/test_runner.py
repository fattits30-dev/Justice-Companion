#!/usr/bin/env python3
"""
Test Runner - Automated Test Execution and Analysis
Justice Companion Automation Framework
"""

import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


class TestRunner:
    """
    Manages test execution and result analysis for the Justice Companion app.
    
    Integrates with npm test scripts and provides structured test results.
    """
    
    def __init__(self, project_root: Path):
        """
        Initialize test runner.
        
        Args:
            project_root: Root directory of Justice Companion project
        """
        self.project_root = Path(project_root)
        
        if not (self.project_root / 'package.json').exists():
            raise ValueError(f"No package.json found in {project_root}")
    
    def run_tests(
        self,
        test_path: Optional[str] = None,
        timeout: int = 300
    ) -> Dict:
        """
        Execute tests and return structured results.
        
        Args:
            test_path: Optional specific test file or pattern to run
            timeout: Maximum seconds to wait for tests (default: 300)
            
        Returns:
            Dictionary with test results:
            {
                'passed': bool,
                'returncode': int,
                'stdout': str,
                'stderr': str,
                'timestamp': str,
                'duration': float,
                'test_path': str or None
            }
        """
        start_time = datetime.utcnow()
        
        # Build command
        cmd = ['npm', 'test']
        if test_path:
            cmd.append(test_path)
        
        # Run tests
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            return {
                'passed': result.returncode == 0,
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'timestamp': start_time.isoformat() + 'Z',
                'duration': duration,
                'test_path': test_path
            }
        
        except subprocess.TimeoutExpired:
            return {
                'passed': False,
                'returncode': -1,
                'stdout': '',
                'stderr': f'Tests timed out after {timeout} seconds',
                'timestamp': start_time.isoformat() + 'Z',
                'duration': timeout,
                'test_path': test_path
            }
        
        except Exception as e:
            return {
                'passed': False,
                'returncode': -1,
                'stdout': '',
                'stderr': f'Test execution failed: {str(e)}',
                'timestamp': start_time.isoformat() + 'Z',
                'duration': 0,
                'test_path': test_path
            }
    
    def run_type_check(self) -> Dict:
        """
        Run TypeScript type checking.
        
        Returns:
            Dictionary with type check results
        """
        result = subprocess.run(
            ['npm', 'run', 'type-check'],
            cwd=self.project_root,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        return {
            'passed': result.returncode == 0,
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    def run_linter(self) -> Dict:
        """
        Run ESLint checks.
        
        Returns:
            Dictionary with linter results
        """
        result = subprocess.run(
            ['npm', 'run', 'lint'],
            cwd=self.project_root,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        return {
            'passed': result.returncode == 0,
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    def parse_test_failures(self, test_output: str) -> List[Dict]:
        """
        Parse test output to identify specific failures.
        
        Args:
            test_output: stdout or stderr from test run
            
        Returns:
            List of failure dictionaries with details
        """
        failures = []
        
        for line in test_output.split('\n'):
            # Look for common failure patterns
            if any(marker in line for marker in ['FAIL', 'Error:', 'Failed:', '✗', '×']):
                failures.append({
                    'line': line.strip(),
                    'type': 'test_failure',
                    'severity': 'high'
                })
        
        return failures
    
    def get_test_summary(self, results: Dict) -> str:
        """
        Generate human-readable test summary.
        
        Args:
            results: Test results dictionary
            
        Returns:
            Formatted summary string
        """
        if results['passed']:
            return f"[OK] Tests passed in {results['duration']:.2f}s"
        else:
            failures = self.parse_test_failures(
                results['stdout'] + results['stderr']
            )
            return f"✗ Tests failed ({len(failures)} issues) in {results['duration']:.2f}s"


# Example usage
if __name__ == '__main__':
    import json

    # Initialize test runner (use PROJECT_ROOT env var or current directory)
    project_root = Path(os.getenv('PROJECT_ROOT', Path.cwd()))
    runner = TestRunner(project_root)
    
    # Run tests
    print("Running tests...")
    results = runner.run_tests()
    
    print(f"\nTest Summary: {runner.get_test_summary(results)}")
    print(f"Full results:\n{json.dumps(results, indent=2)}")
    
    if not results['passed']:
        print("\nParsing failures...")
        failures = runner.parse_test_failures(results['stderr'])
        print(f"Found {len(failures)} failure(s):")
        for failure in failures[:5]:  # Show first 5
            print(f"  - {failure['line']}")
