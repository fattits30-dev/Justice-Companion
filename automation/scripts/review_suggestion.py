#!/usr/bin/env python3
"""
Review Suggestion - Human approval interface for AI-generated fix suggestions
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone


def review_suggestion(suggestion_id: str):
    """Review and approve/reject a fix suggestion."""
    suggestions_dir = Path('automation/suggestions')

    # Find suggestion file (allow partial ID)
    suggestion_files = list(suggestions_dir.glob(f'{suggestion_id}*.json'))

    if not suggestion_files:
        print(f"[ERROR] No suggestion found for ID: {suggestion_id}")
        return

    if len(suggestion_files) > 1:
        print(f"[ERROR] Multiple suggestions match '{suggestion_id}':")
        for f in suggestion_files:
            print(f"  - {f.stem}")
        return

    suggestion_file = suggestion_files[0]

    # Read suggestion
    with open(suggestion_file) as f:
        suggestion = json.load(f)

    # Display suggestion
    print("="*70)
    print("FIX SUGGESTION REVIEW")
    print("="*70)
    print(f"Suggestion ID: {suggestion['suggestion_id'][:8]}...")
    print(f"Task ID:       {suggestion['task_id'][:8]}...")
    print(f"Created:       {suggestion['created_at']}")
    print()
    print(f"Files affected:")
    for file in suggestion['files']:
        print(f"  - {file}")
    print()
    print("="*70)
    print("AI ANALYSIS & SUGGESTED FIX")
    print("="*70)
    print(suggestion['ai_analysis'])
    print("="*70)
    print()

    # Get human decision
    while True:
        decision = input("Approve this fix? (y/n/s=skip): ").strip().lower()

        if decision in ['y', 'yes']:
            # Approve suggestion
            suggestion['status'] = 'approved'
            suggestion['approved'] = True
            suggestion['reviewed_at'] = datetime.now(timezone.utc).isoformat()

            with open(suggestion_file, 'w') as f:
                json.dump(suggestion, f, indent=2)

            print("[APPROVED] Suggestion approved")
            print("Next step: Manually apply the suggested changes")
            print(f"Files to edit:")
            for file in suggestion['files']:
                print(f"  - {file}")
            break

        elif decision in ['n', 'no']:
            # Reject suggestion
            suggestion['status'] = 'rejected'
            suggestion['approved'] = False
            suggestion['reviewed_at'] = datetime.now(timezone.utc).isoformat()

            with open(suggestion_file, 'w') as f:
                json.dump(suggestion, f, indent=2)

            print("[REJECTED] Suggestion rejected")
            break

        elif decision in ['s', 'skip']:
            print("[SKIPPED] Suggestion review skipped")
            break

        else:
            print("Invalid input. Please enter y (yes), n (no), or s (skip)")


def list_pending_suggestions():
    """List all pending suggestions."""
    suggestions_dir = Path('automation/suggestions')

    if not suggestions_dir.exists():
        print("No suggestions directory found")
        return

    suggestion_files = list(suggestions_dir.glob('*.json'))

    if not suggestion_files:
        print("No pending suggestions")
        return

    pending = []
    approved = []
    rejected = []

    for f in suggestion_files:
        with open(f) as file:
            suggestion = json.load(file)

        status = suggestion.get('status', 'pending_approval')

        if status == 'pending_approval':
            pending.append(suggestion)
        elif status == 'approved':
            approved.append(suggestion)
        elif status == 'rejected':
            rejected.append(suggestion)

    print("="*70)
    print("SUGGESTIONS SUMMARY")
    print("="*70)
    print(f"Pending:  {len(pending)}")
    print(f"Approved: {len(approved)}")
    print(f"Rejected: {len(rejected)}")
    print()

    if pending:
        print("PENDING SUGGESTIONS:")
        for s in pending:
            print(f"  [{s['suggestion_id'][:8]}] Files: {', '.join(s['files'])}")
            print(f"    Review with: python automation/scripts/review_suggestion.py {s['suggestion_id'][:8]}")
        print()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python automation/scripts/review_suggestion.py <suggestion_id>")
        print("  python automation/scripts/review_suggestion.py --list")
        sys.exit(1)

    if sys.argv[1] == '--list':
        list_pending_suggestions()
    else:
        suggestion_id = sys.argv[1]
        review_suggestion(suggestion_id)
