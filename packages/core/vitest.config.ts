import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'core',
    // jsdom, not node: renderHook needs a document to mount into. The package
    // itself never touches the DOM — lint forbids it — but its TESTS render
    // hooks, and that is the only reason this is not 'node'.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
