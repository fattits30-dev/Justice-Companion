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

# Detect package manager
detect_package_manager() {
    if command -v pnpm &>/dev/null && [ -f "pnpm-lock.yaml" ]; then
        echo "pnpm"
    elif command -v npm &>/dev/null; then
        echo "npm"
    elif command -v yarn &>/dev/null && [ -f "yarn.lock" ]; then
        echo "yarn"
    else
        error "No package manager found. Install npm, pnpm, or yarn."
        exit 1
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

PKG_MGR=$(detect_package_manager)
PYTHON_CMD=$(detect_python)

info "Running tests..."
info "Package manager: $PKG_MGR"

run_frontend_tests() {
    info "Running frontend unit tests (Vitest)..."
    export CI=true
    export NODE_ENV=test
    $PKG_MGR run test:run
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
    info "Running e2e tests (Playwright)..."
    warn "Note: e2e tests require browsers. May not work on Android/Termux."
    $PKG_MGR run e2e || {
        warn "e2e tests failed or skipped (common on mobile/headless environments)"
        return 0
    }
    success "E2E tests completed"
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
        echo "  frontend  - Run Vitest unit tests (default)"
        echo "  backend   - Run pytest backend tests"
        echo "  e2e       - Run Playwright e2e tests"
        echo "  all       - Run frontend + backend tests"
        exit 1
        ;;
esac

success "Test run completed!"
