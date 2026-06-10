import { test, expect, _electron as electron } from "@playwright/test";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// Drives the real load -> preview -> select flow and captures screenshots at
// each stage. Runs in the e2e matrix (Ubuntu under xvfb in CI), so it both
// exercises the actual UI on every OS and produces visual proof of the Linux
// build. Screenshots land in packages/desktop/screenshots/ and are uploaded by
// the E2E job (see .github/workflows/test.yml).

const SHOTS = path.join(__dirname, "..", "screenshots");
const FIXTURE = path.join(__dirname, "fixtures", "scan-sample.jpg");

test("loads images, renders previews, and opens the metadata panel", async () => {
  fs.mkdirSync(SHOTS, { recursive: true });

  // Stage a few copies of the fixture as a "roll" in a temp dir.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-shots-"));
  const filePaths = [
    "HP5_221025.jpg",
    "HP5_221026.jpg",
    "HP5_221027.jpg",
    "HP5_221028.jpg",
    "HP5_221029.jpg",
    "HP5_221030.jpg",
  ].map((name) => {
    const dest = path.join(workDir, name);
    fs.copyFileSync(FIXTURE, dest);
    return dest;
  });

  const app = await electron.launch({
    args: [path.join(__dirname, ".."), "--no-sandbox"],
    // NODE_ENV=test makes the main process load the built dist instead of the
    // (non-running) Vite dev server. Matches e2e/app.test.ts.
    env: { ...process.env, NODE_ENV: "test" },
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    const platform = process.platform;

    // 1. Empty drop zone.
    await expect(page.getByText("Supported: JPG, JPEG, TIFF")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, `01-dropzone-${platform}.png`) });

    // 2. Mock the native open dialog in the MAIN process so clicking the drop
    //    zone loads our staged files (the real native picker can't be scripted).
    await app.evaluate(async ({ dialog }, paths) => {
      // override for the test run
      (dialog as unknown as { showOpenDialog: unknown }).showOpenDialog =
        async () => ({ canceled: false, filePaths: paths });
    }, filePaths);

    await page.getByText("Supported: JPG, JPEG, TIFF").click();

    // 3. Grid populates and thumbnails decode.
    await expect(page.getByText(/images loaded/)).toBeVisible({ timeout: 20000 });
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("img")).some(
          (img) => (img as HTMLImageElement).naturalWidth > 0
        ),
      undefined,
      { timeout: 20000 }
    );
    await page.screenshot({ path: path.join(SHOTS, `02-grid-${platform}.png`) });

    // 4. Select the first image to open the metadata panel.
    await page.locator("img").first().click();
    await page.screenshot({ path: path.join(SHOTS, `03-selected-${platform}.png`) });

    // Sanity: previews actually rendered (this is the bug we just fixed).
    const previewCount = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll("img")).filter(
          (img) => (img as HTMLImageElement).naturalWidth > 0
        ).length
    );
    expect(previewCount).toBeGreaterThan(0);
  } finally {
    await app.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});
