import { defineConfig } from "vitest/config";

// Integration tests run the REAL exiftool-vendored binary (no mocks), so they
// use the node environment and a generous timeout (the ExifTool process is slow
// to spawn the first time, especially on cold Windows CI runners). Kept separate
// from the default unit run, which mocks exiftool-vendored.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["electron/**/*.integration.test.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
