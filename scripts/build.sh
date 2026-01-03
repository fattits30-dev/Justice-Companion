#!/usr/bin/env bash
# Justice Companion - Build Script
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

MODE="${1:-web}"  # web, apk, appbundle, ios, macos, linux, windows
FLUTTER_CMD=$(detect_flutter)

if [ -z "$FLUTTER_CMD" ]; then
    error "Flutter not found. Install Flutter and ensure it is on PATH."
    exit 1
fi

info "Building Justice Companion ($MODE)..."
info "Flutter: $FLUTTER_CMD"

case "$MODE" in
    web)
        $FLUTTER_CMD build web
        if [ -d "build/web" ]; then
            BUILD_SIZE=$(du -sh build/web | cut -f1)
            FILE_COUNT=$(find build/web -type f | wc -l | tr -d ' ')
            success "Build completed successfully!"
            info "Build output: build/web/"
            info "Total size: $BUILD_SIZE"
            info "Files: $FILE_COUNT"
        else
            error "Build failed - build/web/ directory not created"
            exit 1
        fi
        ;;
    apk)
        $FLUTTER_CMD build apk --release
        ;;
    appbundle)
        $FLUTTER_CMD build appbundle --release
        ;;
    ios)
        $FLUTTER_CMD build ios --release
        ;;
    macos)
        $FLUTTER_CMD build macos --release
        ;;
    linux)
        $FLUTTER_CMD build linux --release
        ;;
    windows)
        $FLUTTER_CMD build windows --release
        ;;
    *)
        echo "Usage: $0 [web|apk|appbundle|ios|macos|linux|windows]"
        exit 1
        ;;
esac

success "Build finished."
