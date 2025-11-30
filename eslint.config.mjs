import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "build",
      "release",
      "dev-dist",
      "*.config.js",
      "*.config.ts",
      "mcp-server/**/*", // MCP server has its own tsconfig
      "scripts/**/*", // Scripts run outside main project
      "archived-scripts/**/*", // Archived experimental scripts
      "src/test-utils/**/*", // Test utilities not in main tsconfig
      "e2e/**/*", // Legacy Playwright recordings (superseded by tests/e2e)
      "e2e-tests/**/*", // Standalone E2E tests (no tsconfig)
      "tests/e2e/**/*", // E2E tests (no tsconfig)
      "tests/**/*", // Test files not in main tsconfig
      "electron/__tests__/**/*", // Electron tests not in tsconfig.electron.json
      "temp-*.tsx", // Temporary test files
      "temp-*.ts", // Temporary test files
      "**/*.test.tsx", // Orphaned test files not in tsconfig
      "**/*.test.ts", // Test files not in tsconfig
      "**/*.test.js", // Test files with JSX
      "src/**/*.js", // All JS files (JSX requires .jsx extension)
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // Allow require() imports in database.ts for conditional/lazy loading
      "@typescript-eslint/no-require-imports": "off",

      // Import/Export rules
      "import/extensions": [
        "warn",
        "ignorePackages",
        {
          ts: "always", // Explicit .ts extension for TypeScript modules
          tsx: "always", // Explicit .tsx extension for React modules
          js: "never", // Keep JS imports extensionless to match bundler defaults
          jsx: "never",
        },
      ],

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Too many to fix now, enable later
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Common pattern in React

      // General code quality
      "no-console": "off", // Using custom logger, console is fine for now
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // React-specific
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // Disabled - too strict for practical use
      "@typescript-eslint/strict-boolean-expressions": "off",
    },
  }
);
