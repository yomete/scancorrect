import { test, expect, _electron as electron } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Smoke-tests the PACKAGED app (electron-builder --dir output). This is the only
// check that proves the asar-unpacked, per-OS ExifTool binary actually spawns
// inside the shipped layout — the source-launched E2E and the mocked unit tests
// cannot. Run after `electron-builder --dir` in .github/workflows/build.yml.

// e2e/smoke -> e2e -> desktop -> packages -> repo root -> release
const RELEASE_DIR = path.resolve(__dirname, "..", "..", "..", "..", "release");
const FIXTURE = path.resolve(__dirname, "..", "fixtures", "sample.jpg");

function packagedBinary(): string {
  if (process.platform === "win32") {
    return path.join(RELEASE_DIR, "win-unpacked", "ScanCorrect.exe");
  }
  if (process.platform === "darwin") {
    const macDir = fs.readdirSync(RELEASE_DIR).find((d) => d.startsWith("mac"));
    if (!macDir) throw new Error(`No mac* build dir in ${RELEASE_DIR}`);
    const appDir = fs
      .readdirSync(path.join(RELEASE_DIR, macDir))
      .find((d) => d.endsWith(".app"));
    if (!appDir) throw new Error(`No .app in ${path.join(RELEASE_DIR, macDir)}`);
    return path.join(
      RELEASE_DIR,
      macDir,
      appDir,
      "Contents",
      "MacOS",
      appDir.replace(/\.app$/, "")
    );
  }
  // linux: executableName defaults to productName ("ScanCorrect"); fall back to
  // scanning for the lone extension-less executable in linux-unpacked.
  const dir = path.join(RELEASE_DIR, "linux-unpacked");
  const entries = fs.readdirSync(dir);
  const exe =
    entries.find((e) => e.toLowerCase() === "scancorrect") ||
    entries.find(
      (e) => !e.includes(".") && fs.statSync(path.join(dir, e)).isFile()
    );
  if (!exe) throw new Error(`No executable in ${dir}: ${entries.join(", ")}`);
  return path.join(dir, exe);
}

test("packaged app launches and writes EXIF via the bundled ExifTool", async () => {
  const binary = packagedBinary();
  expect(fs.existsSync(binary), `packaged binary missing: ${binary}`).toBe(true);

  // Work on a throwaway copy so the committed fixture is never mutated.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "scancorrect-smoke-"));
  const target = path.join(workDir, "smoke.jpg");
  fs.copyFileSync(FIXTURE, target);

  const app = await electron.launch({
    executablePath: binary,
    args: ["--no-sandbox"], // chrome-sandbox isn't SUID-root on CI runners
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Exercises the real runtime path: renderer -> IPC -> main -> ExifTool spawned
    // from app.asar.unpacked.
    const write = await page.evaluate(
      (p) =>
        (window as any).electronAPI.writeExif(p, {
          make: "SmokeTest",
          model: "Packaged",
        }),
      target
    );
    expect(write.success, `writeExif failed: ${write.error ?? ""}`).toBe(true);

    const read = await page.evaluate(
      (p) => (window as any).electronAPI.readExif(p),
      target
    );
    expect("data" in read).toBe(true);
    expect(read.data.make).toBe("SmokeTest");
    expect(read.data.model).toBe("Packaged");
  } finally {
    await app.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});
