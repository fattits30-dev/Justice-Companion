// @ts-check
/** @type {import('vitest').UserConfig} */
const config = {
  test: {
    globals: true,
    environment: "jsdom", // Use jsdom for browser API support (localStorage, window, etc.)
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: [
      "node_modules",
      "dist",
      ".idea",
      ".git",
      "e2e/**/*",
      "e2e-tests/**/*",
      "tests/e2e/**/*",
      "backend/**/*",
    ],
    setupFiles: ["./src/test/setup.ts"],
    // Performance optimizations
    pool: "threads", // Use worker threads for parallel execution
    poolOptions: {
      threads: {
        // Use multiple threads (default is CPU cores - 1)
        minThreads: 1,
        maxThreads: 4, // Limit to 4 threads for CI environments
      },
    },
    // Optimize test execution
    fileParallelism: true, // Run test files in parallel
    // Reduce overhead
    mockReset: false, // Don't reset mocks between tests automatically
    restoreMocks: false, // Don't restore mocks automatically
    clearMocks: false, // Don't clear mock calls automatically
    // Timeouts
    testTimeout: 30000, // 30 seconds per test (default is 5s)
    hookTimeout: 30000, // 30 seconds for hooks
  },
};

export default config;
