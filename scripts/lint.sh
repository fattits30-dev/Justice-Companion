#!/usr/bin/env bash
# Justice Companion - Linting Script
# Cross-platform: Linux, macOS, Windows (Git Bash), Android/Termux

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Detect Flutter
detect_flutter() {
    if [ -n "${FLUTTER_EXECUTABLE:-}" ]; then
        echo "$FLUTTER_EXECUTABLE"
    elif command -v flutter &>/dev/null; then
        echo "flutter"
    else
        echo ""
    fi
}

# Detect Dart
detect_dart() {
    if command -v dart &>/dev/null; then
        echo "dart"
    else
        echo ""
    fi
}

# Detect Python
detect_python() {
    if [ -n "${PYTHON_EXECUTABLE:-}" ]; then
        echo "$PYTHON_EXECUTABLE"
    elif command -v python3 &>/dev/null; then
        echo "python3"
    elif command -v python &>/dev/null; then
        echo "python"
    else
        echo ""
    fi
}

# Parse arguments
MODE="${1:-all}"  # frontend, backend, all, fix

PYTHON_CMD=$(detect_python)
FLUTTER_CMD=$(detect_flutter)
DART_CMD=$(detect_dart)

info "Running linters..."
[ -n "$FLUTTER_CMD" ] && info "Flutter: $FLUTTER_CMD"

LINT_ERRORS=0

run_frontend_lint() {
    local fix_mode="${1:-false}"

    if [ -z "$FLUTTER_CMD" ]; then
        warn "Flutter not found. Skipping frontend linting."
        return 0
    fi

    info "Linting frontend (Flutter analyze)..."
    $FLUTTER_CMD analyze || LINT_ERRORS=$((LINT_ERRORS + 1))

    if [ -n "$DART_CMD" ]; then
        if [ "$fix_mode" = "true" ]; then
            info "Formatting Dart files..."
            $DART_CMD format .
        else
            info "Checking Dart formatting..."
            $DART_CMD format --output=none --set-exit-if-changed . || LINT_ERRORS=$((LINT_ERRORS + 1))
        fi
    else
        warn "Dart not found. Skipping Dart format checks."
    fi
}

run_backend_lint() {
    if [ -z "$PYTHON_CMD" ]; then
        warn "Python not found. Skipping backend linting."
        return 0
    fi

    info "Linting backend (Python)..."

    # Check for linting tools
    if $PYTHON_CMD -c "import flake8" 2>/dev/null; then
        info "Running flake8..."
        $PYTHON_CMD -m flake8 backend --count --show-source --statistics || LINT_ERRORS=$((LINT_ERRORS + 1))
    else
        warn "flake8 not installed. Run: pip install flake8"
    fi

    if $PYTHON_CMD -c "import mypy" 2>/dev/null; then
        info "Running mypy..."
        $PYTHON_CMD -m mypy backend --ignore-missing-imports || warn "mypy found issues (non-blocking)"
    else
        warn "mypy not installed. Run: pip install mypy"
    fi
}

run_format_check() {
    return 0
}

case "$MODE" in
    frontend)
        run_frontend_lint false
        ;;
    backend)
        run_backend_lint
        ;;
    all)
        run_frontend_lint false
        run_backend_lint
        run_format_check
        ;;
    fix)
        info "Running linters with auto-fix..."
        run_frontend_lint true
        ;;
    *)
        echo "Usage: $0 [frontend|backend|all|fix]"
        echo ""
        echo "  frontend  - Lint frontend (Flutter analyze + Dart format)"
        echo "  backend   - Lint backend (flake8 + mypy)"
        echo "  all       - Lint everything (default)"
        echo "  fix       - Auto-fix frontend issues + format"
        exit 1
        ;;
esac

if [ $LINT_ERRORS -gt 0 ]; then
    error "Linting completed with $LINT_ERRORS error(s)"
    exit 1
else
    success "All linting checks passed!"
fi
