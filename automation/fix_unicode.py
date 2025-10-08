#!/usr/bin/env python3
"""Fix Unicode characters in Python files for Windows compatibility."""
import os
import sys

# Unicode to ASCII replacements
REPLACEMENTS = {
    '\u2713': '[OK]',      # [OK] --> [OK]
    '\u2717': '[ERROR]',   # [ERROR] --> [ERROR]
    '\u2192': '-->',       # --> --> -->
    '\u2718': '[X]',       # [X] --> [X]
}

def fix_file(filepath):
    """Fix Unicode characters in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        for unicode_char, ascii_replacement in REPLACEMENTS.items():
            content = content.replace(unicode_char, ascii_replacement)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed: {filepath}")
            return True
        return False
    except Exception as e:
        print(f"Error fixing {filepath}: {e}", file=sys.stderr)
        return False

def main():
    """Find and fix all Python files in automation directory."""
    automation_dir = os.path.join(os.path.dirname(__file__))
    fixed_count = 0

    for root, dirs, files in os.walk(automation_dir):
        for filename in files:
            if filename.endswith('.py'):
                filepath = os.path.join(root, filename)
                if fix_file(filepath):
                    fixed_count += 1

    print(f"\nFixed {fixed_count} file(s)")

if __name__ == '__main__':
    main()
