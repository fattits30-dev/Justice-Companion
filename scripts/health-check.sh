#!/usr/bin/env bash
# Justice Companion - Health Check Script
# Verifies project setup, dependencies, and environment

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
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
fail() { echo -e "${RED}[✗]${NC} $*"; }

ERRORS=0
WARNINGS=0

check_pass() { success "$1"; }
check_fail() { fail "$1"; ERRORS=$((ERRORS + 1)); }
check_warn() { warn "$1"; WARNINGS=$((WARNINGS + 1)); }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "       Justice Companion - Project Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check Flutter
info "Checking Flutter..."
if command -v flutter &>/dev/null; then
    FLUTTER_VERSION=$(flutter --version | head -n 1)
    check_pass "Flutter: $FLUTTER_VERSION"
else
    check_fail "Flutter not found"
fi

# 2. Check Dart
info "Checking Dart..."
if command -v dart &>/dev/null; then
    DART_VERSION=$(dart --version 2>&1)
    check_pass "Dart: $DART_VERSION"
else
    check_warn "Dart not found (Flutter usually provides it)"
fi

# 3. Check Python (optional)
info "Checking Python..."
if command -v python3 &>/dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    check_pass "Python: $PYTHON_VERSION"
elif command -v python &>/dev/null; then
    PYTHON_VERSION=$(python --version 2>&1)
    check_pass "Python: $PYTHON_VERSION"
else
    check_warn "Python not found (backend won't work)"
fi

# 4. Check Git
info "Checking Git..."
if command -v git &>/dev/null; then
    GIT_VERSION=$(git --version)
    check_pass "Git: ${GIT_VERSION#git version }"
else
    check_warn "Git not found"
fi

# 5. Check pubspec.yaml
info "Checking pubspec.yaml..."
if [ -f "pubspec.yaml" ]; then
    check_pass "pubspec.yaml exists"
else
    check_fail "pubspec.yaml not found"
fi

# 6. Check .dart_tool
info "Checking Flutter dependencies..."
if [ -d ".dart_tool" ]; then
    check_pass ".dart_tool exists (deps installed)"
else
    check_warn ".dart_tool not found - run 'flutter pub get'"
fi

# 7. Check source directories
info "Checking project structure..."
if [ -d "lib" ]; then
    DART_FILES=$(find lib -name "*.dart" | wc -l | tr -d ' ')
    check_pass "lib/: $DART_FILES Dart files"
else
    check_fail "lib/ directory not found"
fi

if [ -d "backend" ]; then
    BACKEND_FILES=$(find backend -name "*.py" | wc -l | tr -d ' ')
    check_pass "backend/: $BACKEND_FILES Python files"
else
    check_warn "backend/ directory not found"
fi

# 8. Check env config
info "Checking .env configuration..."
ENV_FILE=""
if [ -f ".env" ]; then
    ENV_FILE=".env"
elif [ -f "backend/.env" ]; then
    ENV_FILE="backend/.env"
fi

if [ -n "$ENV_FILE" ]; then
    if grep -q "^ENCRYPTION_KEY_BASE64=" "$ENV_FILE"; then
        check_pass "ENCRYPTION_KEY_BASE64 set in $ENV_FILE"
    else
        check_warn "ENCRYPTION_KEY_BASE64 not found in $ENV_FILE"
    fi
else
    check_warn "No .env file found (backend requires ENCRYPTION_KEY_BASE64)"
fi

# 9. Check OCR binary
info "Checking Tesseract OCR..."
if command -v tesseract &>/dev/null; then
    TESSERACT_VERSION=$(tesseract --version | head -n 1)
    check_pass "Tesseract: $TESSERACT_VERSION"
else
    check_warn "Tesseract not found (OCR features unavailable)"
fi

# 10. Check scripts
info "Checking dev scripts..."
SCRIPTS=("dev.sh" "test.sh" "build.sh" "lint.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        check_pass "scripts/$script exists"
    else
        check_warn "scripts/$script not found"
    fi
done

# 11. Quick lint check
info "Running quick lint check..."
if command -v flutter &>/dev/null; then
    if flutter analyze &>/dev/null; then
        check_pass "Flutter analyze OK"
    else
        check_warn "Flutter analyze had issues (run './scripts/lint.sh')"
    fi
else
    check_warn "Flutter not found; skipped analyze"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                      Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "All checks passed! Project is healthy."
elif [ $ERRORS -eq 0 ]; then
    warn "$WARNINGS warning(s), but no critical errors."
else
    fail "$ERRORS error(s) and $WARNINGS warning(s) found."
    echo ""
    info "Fix errors before continuing development."
    exit 1
fi

echo ""
info "Run './scripts/dev.sh' to start development"
echo ""
