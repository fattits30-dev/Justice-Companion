#!/usr/bin/env bash
# Justice Companion - Development Server Script
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
NC='\033[0m' # No Color

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
        warn "Python not found. Backend will not be available."
        echo ""
    fi
}

# Parse arguments
MODE="${1:-frontend}"  # frontend, backend, full

PKG_MGR=$(detect_package_manager)
PYTHON_CMD=$(detect_python)

info "Project root: $PROJECT_ROOT"
info "Package manager: $PKG_MGR"
[ -n "$PYTHON_CMD" ] && info "Python: $PYTHON_CMD"

case "$MODE" in
    frontend)
        info "Starting frontend dev server (Vite)..."
        $PKG_MGR run dev
        ;;
    backend)
        if [ -z "$PYTHON_CMD" ]; then
            error "Python is required for backend. Install python3."
            exit 1
        fi
        info "Starting backend dev server (uvicorn)..."
        export PYTHONPATH="$PROJECT_ROOT"
        $PYTHON_CMD -m uvicorn backend.main:app --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" --reload --reload-dir backend
        ;;
    full)
        if [ -z "$PYTHON_CMD" ]; then
            warn "Python not found. Starting frontend only."
            $PKG_MGR run dev
        else
            info "Starting full stack (frontend + backend)..."
            $PKG_MGR run dev:full
        fi
        ;;
    *)
        echo "Usage: $0 [frontend|backend|full]"
        echo ""
        echo "  frontend  - Start Vite dev server only (default)"
        echo "  backend   - Start FastAPI backend only"
        echo "  full      - Start both frontend and backend"
        exit 1
        ;;
esac
