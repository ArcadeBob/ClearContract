import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    exclude: ['api/live-api.test.ts', 'node_modules/**'],
    setupFiles: ['src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        'src/test/**',
        'api/test-fixtures/**',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'src/index.tsx',
        'src/vite-env.d.ts',
        'src/data/mockContracts.ts',
      ],
      thresholds: {
        statements: 60,
        functions: 60,
      },
    },
  },
})