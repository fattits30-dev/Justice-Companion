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
        warn "Python not found. Backend will not be available."
        echo ""
    fi
}

# Parse arguments
MODE="${1:-frontend}"  # frontend, backend, full

PYTHON_CMD=$(detect_python)
FLUTTER_CMD=$(detect_flutter)

info "Project root: $PROJECT_ROOT"
[ -n "$PYTHON_CMD" ] && info "Python: $PYTHON_CMD"
[ -n "$FLUTTER_CMD" ] && info "Flutter: $FLUTTER_CMD"

pick_flutter_device() {
    local flutter_cmd="$1"
    local device="${FLUTTER_DEVICE:-}"
    if [ -n "$device" ]; then
        echo "$device"
        return
    fi
    if "$flutter_cmd" devices 2>/dev/null | grep -q "Chrome"; then
        echo "chrome"
        return
    fi
    echo ""
}

run_flutter() {
    local flutter_cmd="$1"
    local device="$2"
    local args=()

    if [ -n "$device" ]; then
        args+=("-d" "$device")
    fi

    if [ "$device" = "chrome" ] || [ "$device" = "web-server" ]; then
        local web_port="${FLUTTER_WEB_PORT:-5176}"
        args+=("--web-port" "$web_port")
        if [ -n "${FLUTTER_WEB_HOST:-}" ]; then
            args+=("--web-hostname" "$FLUTTER_WEB_HOST")
        fi
        info "Using Flutter web port: $web_port (override with FLUTTER_WEB_PORT)"
    fi

    "$flutter_cmd" run "${args[@]}"
}

case "$MODE" in
    frontend)
        if [ -z "$FLUTTER_CMD" ]; then
            error "Flutter is required for the frontend. Install Flutter and ensure it is on PATH."
            exit 1
        fi
        info "Starting Flutter app..."
        DEVICE=$(pick_flutter_device "$FLUTTER_CMD")
        if [ -n "$DEVICE" ]; then
            info "Using device: $DEVICE (override with FLUTTER_DEVICE)"
            run_flutter "$FLUTTER_CMD" "$DEVICE"
        else
            $FLUTTER_CMD run
        fi
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
        if [ -z "$FLUTTER_CMD" ]; then
            error "Flutter is required for the frontend. Install Flutter and ensure it is on PATH."
            exit 1
        fi
        if [ -z "$PYTHON_CMD" ]; then
            warn "Python not found. Starting frontend only."
            DEVICE=$(pick_flutter_device "$FLUTTER_CMD")
            if [ -n "$DEVICE" ]; then
                info "Using device: $DEVICE (override with FLUTTER_DEVICE)"
                run_flutter "$FLUTTER_CMD" "$DEVICE"
            else
                $FLUTTER_CMD run
            fi
        else
            info "Starting full stack (Flutter + backend)..."
            export PYTHONPATH="$PROJECT_ROOT"
            $PYTHON_CMD -m uvicorn backend.main:app --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" --reload --reload-dir backend &
            BACKEND_PID=$!
            trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT
            DEVICE=$(pick_flutter_device "$FLUTTER_CMD")
            if [ -n "$DEVICE" ]; then
                info "Using device: $DEVICE (override with FLUTTER_DEVICE)"
                run_flutter "$FLUTTER_CMD" "$DEVICE"
            else
                $FLUTTER_CMD run
            fi
        fi
        ;;
    *)
        echo "Usage: $0 [frontend|backend|full]"
        echo ""
        echo "  frontend  - Start Flutter app only (default)"
        echo "  backend   - Start FastAPI backend only"
        echo "  full      - Start both frontend and backend"
        exit 1
        ;;
esac
