import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest Configuration for Justice Companion
 *
 * Supports two test environments:
 * 1. Node environment: For services, repositories, utilities
 * 2. jsdom environment: For React components
 *
 * Test patterns:
 * - Service/utility tests use Node environment
 * - Component tests use jsdom environment
 *
 * Usage:
 * - npm test                      - Run all tests
 * - npm run test:components       - Component tests only
 * - npm run test:components:watch - Watch mode
 * - npm run test:coverage         - Coverage report
 * - npm run test:ui               - Visual UI
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Default to jsdom for component tests
    // Service tests override this with /* @vitest-environment node */
    environment: 'jsdom',

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Setup files run before each test file
    setupFiles: ['./src/test-utils/setup.ts'],

    // Test file patterns - include both .ts and .tsx
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
    ],

    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'dist-electron/**',
      'release/**',
      '.{idea,git,cache,output,temp}/**',
      '**/*.d.ts',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test-utils/**',
        'src/types/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // Coverage thresholds (aim for 80%+)
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },

    // Test timeout
    testTimeout: 10000,
    hookTimeout: 10000,

    // Retry failed tests (0 = no retries)
    retry: 0,

    // Mock reset behavior
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // CSS handling for components
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },

    // Reporter
    reporters: ['verbose'],
  },
});
