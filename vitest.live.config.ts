import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['api/live-api.test.ts'],
    testTimeout: 120_000,
  },
});
