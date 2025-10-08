#!/usr/bin/env python3
"""Interactive API key setup for orchestrator."""
import os
from pathlib import Path

env_file = Path(__file__).parent / '.env'

print("=" * 60)
print("ANTHROPIC API KEY SETUP")
print("=" * 60)
print()
print("Get your API key from: https://console.anthropic.com/settings/keys")
print()
print("Your API key should start with: sk-ant-api03-")
print()

# Read current .env
with open(env_file, 'r') as f:
    lines = f.readlines()

# Prompt for API key
api_key = input("Paste your API key here: ").strip()

if not api_key:
    print("[ERROR] No API key provided. Exiting.")
    exit(1)

if not api_key.startswith('sk-ant-'):
    print("[WARNING] API key doesn't start with 'sk-ant-'")
    confirm = input("Continue anyway? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Cancelled.")
        exit(1)

# Update .env file
new_lines = []
for line in lines:
    if line.startswith('ANTHROPIC_API_KEY='):
        new_lines.append(f'ANTHROPIC_API_KEY={api_key}\n')
        print("[OK] API key updated")
    else:
        new_lines.append(line)

# Write back
with open(env_file, 'w') as f:
    f.writelines(new_lines)

print("[OK] Configuration saved to automation/.env")
print()
print("Next step: Restart orchestrator")
print("  1. Press Ctrl+C in orchestrator terminal")
print("  2. Run: python automation/scripts/orchestrator.py")
print()
print("=" * 60)
