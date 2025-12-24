#!/bin/bash

##############################################################################
# Stop Validation Script
# Checks if work is properly completed before ending session
##############################################################################

PROJECT_DIR="/data/data/com.termux/files/home/Justice-Companion"
cd "$PROJECT_DIR" || exit 1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛑 SESSION END VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Output for Claude Code hook system
output_message() {
    cat <<EOF
{
  "systemMessage": "$1"
}
EOF
}

WARNINGS=""
ERRORS=""

# Check for uncommitted changes
echo "🔍 Checking Git Status..."
if [[ -n $(git status --porcelain) ]]; then
    WARNINGS="${WARNINGS}\n⚠️  Uncommitted changes detected"
    git status --short
fi
echo ""

# Check if work is complete
echo "📋 Completion Checklist:"
echo ""
echo "Before ending session, verify:"
echo "  [ ] Current task complete (check Planner MCP)"
echo "  [ ] Tests pass (or acknowledged as CI-only)"
echo "  [ ] Code committed via GitHub MCP"
echo "  [ ] Planner MCP updated"
echo "  [ ] Memory MCP updated with learnings"
echo ""

# Build final message
if [[ -n "$ERRORS" ]]; then
    output_message "❌ CANNOT END SESSION: Critical issues detected:${ERRORS}\n\nFix these before ending session."
    exit 1
elif [[ -n "$WARNINGS" ]]; then
    output_message "⚠️  SESSION END WARNING: ${WARNINGS}\n\nReview the completion checklist above. If work is intentionally incomplete, document it in Memory MCP."
    exit 0
else
    output_message "✅ SESSION END VALIDATION PASSED: Work appears complete. Verify checklist above before ending."
    exit 0
fi
