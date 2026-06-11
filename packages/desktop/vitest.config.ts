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
      // Overall coverage is below 10% (main.ts and preload.ts are untested
      // Electron runtime code). Thresholds are set per-file on the modules
      // that actually have unit tests so the floor is meaningful and ratchets
      // up as new tests are added.
      thresholds: {
        'electron/exif.ts': {
          statements: 93,
          branches: 85,
          functions: 100,
          lines: 93,
        },
        'electron/geocoding.ts': {
          statements: 85,
          branches: 83,
          functions: 100,
          lines: 85,
        },
        'electron/gpx.ts': {
          statements: 96,
          branches: 86,
          functions: 100,
          lines: 96,
        },
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
