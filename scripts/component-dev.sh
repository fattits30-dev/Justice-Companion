#!/usr/bin/env bash
# Justice Companion - Widget Test Helper
# Cross-platform: Linux, macOS, Windows (Git Bash), Android/Termux

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
header() { echo -e "\n${CYAN}=== $* ===${NC}\n"; }

detect_flutter() {
    if [ -n "${FLUTTER_EXECUTABLE:-}" ]; then
        echo "$FLUTTER_EXECUTABLE"
    elif command -v flutter &>/dev/null; then
        echo "flutter"
    else
        echo ""
    fi
}

FLUTTER_CMD=$(detect_flutter)

show_help() {
    echo "Widget Test Helper"
    echo ""
    echo "Usage: $0 <command> [path]"
    echo ""
    echo "Commands:"
    echo "  test [path]     Run widget/unit tests (default: all)"
    echo "  watch [path]    Watch mode (if supported by flutter test)"
    echo "  lint            Run flutter analyze"
    echo "  list            List test files"
    echo ""
    echo "Examples:"
    echo "  $0 test"
    echo "  $0 test test/widget_test.dart"
    echo "  $0 watch test/unit"
    echo "  $0 lint"
    echo "  $0 list"
    echo ""
}

ensure_flutter() {
    if [ -z "$FLUTTER_CMD" ]; then
        warn "Flutter not found. Install Flutter and ensure it is on PATH."
        exit 1
    fi
}

run_tests() {
    local path="${1:-}"
    header "Running Flutter Tests"
    ensure_flutter
    if [ -n "$path" ]; then
        info "Path: $path"
        $FLUTTER_CMD test "$path"
    else
        $FLUTTER_CMD test
    fi
    success "Tests completed"
}

watch_tests() {
    local path="${1:-}"
    header "Watch Mode - Flutter Tests"
    ensure_flutter
    if $FLUTTER_CMD test --help 2>&1 | grep -q -- "--watch"; then
        if [ -n "$path" ]; then
            $FLUTTER_CMD test --watch "$path"
        else
            $FLUTTER_CMD test --watch
        fi
    else
        warn "Watch mode not supported by this Flutter version. Running once."
        run_tests "$path"
    fi
}

lint_components() {
    header "Running flutter analyze"
    ensure_flutter
    $FLUTTER_CMD analyze
}

list_components() {
    header "Test Files"
    if [ -d "test" ]; then
        find test -name "*_test.dart" | sed 's|^./||'
    else
        warn "No test/ directory found."
    fi
}

COMMAND="${1:-help}"
PATH_ARG="${2:-}"

case "$COMMAND" in
    test)
        run_tests "$PATH_ARG"
        ;;
    watch)
        watch_tests "$PATH_ARG"
        ;;
    lint)
        lint_components
        ;;
    list)
        list_components
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        warn "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
