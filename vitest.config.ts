// @ts-check
/** @type {import('vitest').UserConfig} */
const config = {
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
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
  },
};

export default config;
