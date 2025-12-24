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
check_fail() { fail "$1"; ((ERRORS++)); }
check_warn() { warn "$1"; ((WARNINGS++)); }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "       Justice Companion - Project Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check Node.js
info "Checking Node.js..."
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js: $NODE_VERSION"
else
    check_fail "Node.js not found"
fi

# 2. Check npm
info "Checking npm..."
if command -v npm &>/dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm: v$NPM_VERSION"
else
    check_fail "npm not found"
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

# 5. Check package.json
info "Checking package.json..."
if [ -f "package.json" ]; then
    check_pass "package.json exists"
else
    check_fail "package.json not found"
fi

# 6. Check node_modules
info "Checking dependencies..."
if [ -d "node_modules" ]; then
    MODULE_COUNT=$(ls node_modules | wc -l | tr -d ' ')
    check_pass "node_modules: $MODULE_COUNT packages"
else
    check_fail "node_modules not found - run 'npm install'"
fi

# 7. Check TypeScript
info "Checking TypeScript config..."
if [ -f "tsconfig.json" ]; then
    check_pass "tsconfig.json exists"
else
    check_fail "tsconfig.json not found"
fi

# 8. Check Vite
info "Checking Vite config..."
if [ -f "vite.config.ts" ] || [ -f "vite.config.mts" ]; then
    check_pass "Vite config exists"
else
    check_fail "Vite config not found"
fi

# 9. Check ESLint
info "Checking ESLint config..."
if [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    check_pass "ESLint config exists"
else
    check_warn "ESLint config not found"
fi

# 10. Check Husky hooks
info "Checking Git hooks..."
if [ -d ".husky" ] && [ -f ".husky/pre-commit" ]; then
    check_pass "Husky pre-commit hook configured"
else
    check_warn "Husky hooks not set up"
fi

# 11. Check source directories
info "Checking project structure..."
if [ -d "src" ]; then
    SRC_FILES=$(find src -name "*.ts" -o -name "*.tsx" | wc -l | tr -d ' ')
    check_pass "src/: $SRC_FILES TypeScript files"
else
    check_fail "src/ directory not found"
fi

if [ -d "backend" ]; then
    BACKEND_FILES=$(find backend -name "*.py" | wc -l | tr -d ' ')
    check_pass "backend/: $BACKEND_FILES Python files"
else
    check_warn "backend/ directory not found"
fi

# 12. Check scripts
info "Checking dev scripts..."
SCRIPTS=("dev.sh" "test.sh" "build.sh" "lint.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -f "scripts/$script" ]; then
        check_pass "scripts/$script exists"
    else
        check_warn "scripts/$script not found"
    fi
done

# 13. Quick lint check
info "Running quick lint check..."
if npm run lint &>/dev/null; then
    check_pass "Lint check passed"
else
    check_warn "Lint check had issues (run 'npm run lint' for details)"
fi

# 14. TypeScript check
info "Running TypeScript check..."
if npm run typecheck &>/dev/null; then
    check_pass "TypeScript compilation OK"
else
    check_fail "TypeScript errors found (run 'npm run typecheck' for details)"
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
