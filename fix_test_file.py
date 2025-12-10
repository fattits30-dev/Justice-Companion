import os

file_path = r"c:\Users\sava6\ClaudeHome\projects\Justice Companion\backend\tests\services\ai\test_unified_ai_service.py"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Keep lines 0 to 623 (indices 0 to 623) -> line 1 to 624
# Remove lines 624 to 990 (indices 623 to 990)
# Keep lines 991 to end (indices 990 to end)

# Adjusting for 0-based indexing:
# Line 624 is index 623.
# Line 991 is index 990.

new_lines = lines[:623] + lines[990:]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Removed lines 624-990. New line count: {len(new_lines)}")
