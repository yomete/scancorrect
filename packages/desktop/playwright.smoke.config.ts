import { defineConfig } from "@playwright/test";

// Smoke tests run against the PACKAGED app (electron-builder --dir output), not
// the source build. Kept in its own config so the normal `test:e2e` run (which
// launches from source) doesn't try to run them. Invoked from build.yml after
// packaging, on each OS in the matrix.
export default defineConfig({
  testDir: "./e2e/smoke",
  testMatch: "**/*.test.ts",
  timeout: 120000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"]],
});
