import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/**/*.test.{ts,tsx}',
      'electron/**/*.test.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'dist-electron',
      'e2e',
      // Integration tests use the real ExifTool binary and run via
      // vitest.integration.config.ts (and the integration-tests CI job).
      '**/*.integration.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.{ts,tsx}',
        'electron/**/*.ts'
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'electron/**/*.test.ts',
        'src/__tests__/**',
        'electron/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      // Overall coverage floor, set ~2 points below measured values
      // (statements/lines 19.5%, branches 80.58%, functions 56.25% as of
      // plan 022 merge, 2026-07-17). Ratchet these up as new tests are added.
      thresholds: {
        statements: 17,
        branches: 78,
        functions: 54,
        lines: 17,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
