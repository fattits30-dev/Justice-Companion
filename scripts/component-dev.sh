#!/usr/bin/env bash
# Justice Companion - Component Development Script
# Cross-platform: Linux, macOS, Windows (Git Bash), Android/Termux
#
# This script helps you work on UI components in isolation without needing
# the backend running. Perfect for Android/Termux development.

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

# Detect package manager
detect_package_manager() {
    if command -v pnpm &>/dev/null && [ -f "pnpm-lock.yaml" ]; then
        echo "pnpm"
    elif command -v npm &>/dev/null; then
        echo "npm"
    else
        echo "npm"
    fi
}

PKG_MGR=$(detect_package_manager)

show_help() {
    echo "Component Development Helper"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  test [path]     Run component tests (default: all UI components)"
    echo "  watch [path]    Watch mode - rerun tests on file changes"
    echo "  lint [path]     Lint components"
    echo "  list            List all components and their test status"
    echo "  new <name>      Create a new component with test file"
    echo ""
    echo "Examples:"
    echo "  $0 test                           # Test all UI components"
    echo "  $0 test src/components/ui/Button  # Test Button component"
    echo "  $0 watch                          # Watch all UI component tests"
    echo "  $0 watch Button                   # Watch Button tests only"
    echo "  $0 lint                           # Lint all components"
    echo "  $0 list                           # Show component test coverage"
    echo "  $0 new MyComponent                # Create new component"
    echo ""
}

run_tests() {
    local path="${1:-src/components/ui/}"
    header "Running Component Tests"
    info "Path: $path"

    # Handle shorthand component names
    if [[ ! "$path" =~ "/" ]]; then
        # It's just a component name, search for it
        local found=$(find src/components -name "${path}*.tsx" ! -name "*.test.tsx" | head -1)
        if [ -n "$found" ]; then
            path="${found%.tsx}"
        fi
    fi

    npx vitest run "$path" --reporter=verbose
}

watch_tests() {
    local path="${1:-src/components/ui/}"
    header "Watch Mode - Component Tests"
    info "Path: $path"
    info "Press 'q' to quit, 'a' to run all tests"
    echo ""

    # Handle shorthand component names
    if [[ ! "$path" =~ "/" ]]; then
        local found=$(find src/components -name "${path}*.tsx" ! -name "*.test.tsx" | head -1)
        if [ -n "$found" ]; then
            path="${found%.tsx}"
        fi
    fi

    npx vitest "$path"
}

lint_components() {
    local path="${1:-src/components/}"
    header "Linting Components"
    $PKG_MGR run lint -- "$path"
}

list_components() {
    header "Component Test Coverage"

    echo -e "${CYAN}UI Components:${NC}"
    for file in src/components/ui/*.tsx; do
        [ -f "$file" ] || continue
        [[ "$file" == *.test.tsx ]] && continue

        local name=$(basename "$file" .tsx)
        local test_file="${file%.tsx}.test.tsx"

        if [ -f "$test_file" ]; then
            echo -e "  ${GREEN}✓${NC} $name"
        else
            echo -e "  ${RED}✗${NC} $name ${YELLOW}(no tests)${NC}"
        fi
    done

    echo ""
    echo -e "${CYAN}Auth Components:${NC}"
    for file in src/components/auth/*.tsx; do
        [ -f "$file" ] || continue
        [[ "$file" == *.test.tsx ]] && continue

        local name=$(basename "$file" .tsx)
        local test_file="${file%.tsx}.test.tsx"

        if [ -f "$test_file" ]; then
            echo -e "  ${GREEN}✓${NC} $name"
        else
            echo -e "  ${RED}✗${NC} $name ${YELLOW}(no tests)${NC}"
        fi
    done

    echo ""
    echo -e "${CYAN}Other Components:${NC}"
    for file in src/components/*.tsx; do
        [ -f "$file" ] || continue
        [[ "$file" == *.test.tsx ]] && continue

        local name=$(basename "$file" .tsx)
        local test_file="${file%.tsx}.test.tsx"

        if [ -f "$test_file" ]; then
            echo -e "  ${GREEN}✓${NC} $name"
        else
            echo -e "  ${RED}✗${NC} $name ${YELLOW}(no tests)${NC}"
        fi
    done
}

create_component() {
    local name="$1"

    if [ -z "$name" ]; then
        echo "Error: Component name required"
        echo "Usage: $0 new ComponentName"
        exit 1
    fi

    local component_file="src/components/ui/${name}.tsx"
    local test_file="src/components/ui/${name}.test.tsx"

    if [ -f "$component_file" ]; then
        warn "Component $component_file already exists"
        exit 1
    fi

    header "Creating Component: $name"

    # Create component file
    cat > "$component_file" << EOF
import { forwardRef, HTMLAttributes } from "react";
import { clsx } from "clsx";

export interface ${name}Props extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary";
}

export const ${name} = forwardRef<HTMLDivElement, ${name}Props>(
  ({ variant = "default", className, children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-gray-800 text-white",
      primary: "bg-primary-500 text-white",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-lg p-4",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

${name}.displayName = "${name}";
EOF

    success "Created $component_file"

    # Create test file
    cat > "$test_file" << EOF
/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import { createRef } from "react";

import { ${name} } from "./${name}";

describe("${name}", () => {
  it("renders children", () => {
    render(<${name}>Hello</${name}>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies default variant", () => {
    render(<${name} data-testid="component">Test</${name}>);
    expect(screen.getByTestId("component")).toHaveClass("bg-gray-800");
  });

  it("applies primary variant", () => {
    render(<${name} variant="primary" data-testid="component">Test</${name}>);
    expect(screen.getByTestId("component")).toHaveClass("bg-primary-500");
  });

  it("merges custom className", () => {
    render(<${name} className="custom" data-testid="component">Test</${name}>);
    expect(screen.getByTestId("component")).toHaveClass("custom");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<${name} ref={ref}>Test</${name}>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
EOF

    success "Created $test_file"

    echo ""
    info "Run tests with: $0 test $name"
    info "Watch tests with: $0 watch $name"
}

# Main command dispatch
case "${1:-help}" in
    test)
        run_tests "${2:-}"
        ;;
    watch)
        watch_tests "${2:-}"
        ;;
    lint)
        lint_components "${2:-}"
        ;;
    list)
        list_components
        ;;
    new)
        create_component "${2:-}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
