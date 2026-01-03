#!/usr/bin/env bash
# Justice Companion - Test Runner Script
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
MODE="${1:-frontend}"  # frontend, backend, e2e, all

PYTHON_CMD=$(detect_python)
FLUTTER_CMD=$(detect_flutter)

info "Running tests..."
[ -n "$FLUTTER_CMD" ] && info "Flutter: $FLUTTER_CMD"

run_frontend_tests() {
    if [ -z "$FLUTTER_CMD" ]; then
        warn "Flutter not found. Skipping frontend tests."
        return 0
    fi
    info "Running frontend tests (Flutter)..."
    $FLUTTER_CMD test
    success "Frontend tests completed"
}

run_backend_tests() {
    if [ -z "$PYTHON_CMD" ]; then
        warn "Python not found. Skipping backend tests."
        return 0
    fi

    info "Running backend tests (pytest)..."
    export PYTHONPATH="$PROJECT_ROOT"

    if [ -d "backend/venv" ]; then
        # Use virtual environment if available
        source backend/venv/bin/activate 2>/dev/null || true
    fi

    $PYTHON_CMD -m pytest backend/tests -v --tb=short
    success "Backend tests completed"
}

run_e2e_tests() {
    if [ -z "$FLUTTER_CMD" ]; then
        warn "Flutter not found. Skipping e2e tests."
        return 0
    fi
    if [ -d "integration_test" ]; then
        info "Running integration tests (Flutter)..."
        $FLUTTER_CMD test integration_test
        success "Integration tests completed"
    else
        warn "No integration_test/ directory found. Skipping e2e tests."
    fi
}

case "$MODE" in
    frontend)
        run_frontend_tests
        ;;
    backend)
        run_backend_tests
        ;;
    e2e)
        run_e2e_tests
        ;;
    all)
        run_frontend_tests
        run_backend_tests
        info "Skipping e2e tests in 'all' mode. Run './scripts/test.sh e2e' separately."
        ;;
    *)
        echo "Usage: $0 [frontend|backend|e2e|all]"
        echo ""
        echo "  frontend  - Run Flutter tests (default)"
        echo "  backend   - Run pytest backend tests"
        echo "  e2e       - Run Flutter integration tests"
        echo "  all       - Run frontend + backend tests"
        exit 1
        ;;
esac

success "Test run completed!"
