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

PKG_MGR=$(detect_package_manager)

info "Building Justice Companion..."
info "Package manager: $PKG_MGR"

# Clean previous build
if [ -d "dist" ]; then
    info "Cleaning previous build..."
    rm -rf dist
fi

# Run TypeScript compilation
info "Running TypeScript compilation..."
$PKG_MGR run typecheck || {
    error "TypeScript errors found. Fix them before building."
    exit 1
}

# Build with Vite
info "Building production bundle with Vite..."
export CI=true
$PKG_MGR run build

# Verify build output
if [ -d "dist" ]; then
    BUILD_SIZE=$(du -sh dist | cut -f1)
    FILE_COUNT=$(find dist -type f | wc -l | tr -d ' ')

    success "Build completed successfully!"
    echo ""
    info "Build output: dist/"
    info "Total size: $BUILD_SIZE"
    info "Files: $FILE_COUNT"
    echo ""

    # List main files
    info "Main build files:"
    ls -lh dist/*.html 2>/dev/null || true
    ls -lh dist/assets/*.js 2>/dev/null | head -5 || true
else
    error "Build failed - dist/ directory not created"
    exit 1
fi

success "Production build ready in dist/"
