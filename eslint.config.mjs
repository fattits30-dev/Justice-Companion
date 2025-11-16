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
      "*.config.js",
      "*.config.ts",
      "mcp-server/**/*", // MCP server has its own tsconfig
      "scripts/**/*", // Scripts run outside main project
      "archived-scripts/**/*", // Archived experimental scripts
      "src/test-utils/**/*", // Test utilities not in main tsconfig
      "e2e/**/*", // Legacy Playwright recordings (superseded by tests/e2e)
      "e2e-tests/**/*", // Standalone E2E tests (no tsconfig)
      "electron/__tests__/**/*", // Electron tests not in tsconfig.electron.json
      "temp-*.tsx", // Temporary test files
      "temp-*.ts", // Temporary test files
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./tsconfig.electron.json",
          "./tests/e2e/tsconfig.json",
        ],
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
          ts: "never", // Allow extensionless for TypeScript files
          tsx: "never", // Allow extensionless for React TypeScript files
          js: "never", // No .js extension for JavaScript imports
          jsx: "never",
        },
      ],

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // React-specific
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  }
);
