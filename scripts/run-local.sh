#!/bin/bash
# Run Justice Companion locally on the current device

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

export FLUTTER_WEB_PORT="${FLUTTER_WEB_PORT:-5176}"

echo "Starting Justice Companion (Flutter) locally..."
echo "Access at: http://localhost:${FLUTTER_WEB_PORT}"
echo "Press Ctrl+C to stop"
echo ""

./scripts/dev.sh frontend
