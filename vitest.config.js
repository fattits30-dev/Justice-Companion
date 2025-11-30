// @ts-check
/** @type {import('vitest').UserConfig} */
const config = {
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.{test,spec}.{js,ts,tsx}'],
        exclude: ['node_modules', 'dist', '.idea', '.git'],
        setupFiles: ['./src/test/setup.ts']
    }
};
export default config;
