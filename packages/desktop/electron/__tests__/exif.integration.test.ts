import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ExifTool } from "exiftool-vendored";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { readExifData, writeExifData, initBackupDir } from "../exif";
import { isLikelyScannerMetadata } from "../scanner-detection";

// Integration test that spawns the REAL vendored ExifTool binary and round-trips
// metadata through an actual file. The unit tests mock exiftool-vendored, so a
// per-OS binary that fails to spawn or write (wrong arch, missing Perl on Linux,
// asar-unpack path regression) would never be caught there. This runs on
// macOS/Windows/Linux in CI via the `integration-tests` job in
// .github/workflows/test.yml.

const FIXTURE = path.join(__dirname, "..", "..", "e2e", "fixtures", "sample.jpg");

describe("exif integration (real ExifTool binary)", () => {
  let exiftool: ExifTool;
  let workDir: string;

  beforeAll(async () => {
    exiftool = new ExifTool();
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "scancorrect-exif-"));
    initBackupDir(path.join(workDir, "backups"));
  });

  afterAll(async () => {
    await exiftool.end();
    await fs.rm(workDir, { recursive: true, force: true });
  });

  async function copyFixture(name: string): Promise<string> {
    const dest = path.join(workDir, name);
    await fs.copyFile(FIXTURE, dest);
    return dest;
  }

  it("writes and reads back camera make/model/iso/gps", async () => {
    const file = await copyFixture("roundtrip.jpg");

    const result = await writeExifData(
      exiftool,
      file,
      {
        make: "Nikon",
        model: "FM2",
        iso: 400,
        location: { name: "London", latitude: 51.5074, longitude: -0.1278 },
      },
      false // keepBackup=false -> -overwrite_original, no backup file
    );
    expect(result.success).toBe(true);

    const data = await readExifData(exiftool, file);
    expect(data.make).toBe("Nikon");
    expect(data.model).toBe("FM2");
    expect(data.iso).toBe(400);
    expect(data.location?.latitude).toBeCloseTo(51.5074, 3);
    expect(data.location?.longitude).toBeCloseTo(-0.1278, 3);
  });

  it("read-exif-batch: returns data for valid files and error for missing file", async () => {
    const file1 = await copyFixture("batch1.jpg");
    const file2 = await copyFixture("batch2.jpg");
    const missing = path.join(workDir, "nonexistent.jpg");

    const filePaths = [file1, file2, missing];
    const results = Object.fromEntries(
      await Promise.all(
        filePaths.map(async (filePath) => {
          try {
            const data = await readExifData(exiftool, filePath);
            const isScanner = isLikelyScannerMetadata(data.make, data.model);
            return [filePath, { data, isScanner }] as const;
          } catch (error) {
            return [filePath, { error: error instanceof Error ? error.message : "Unknown error" }] as const;
          }
        })
      )
    );

    // Two valid files should have data
    expect("data" in results[file1]).toBe(true);
    expect("data" in results[file2]).toBe(true);
    // Missing file should have an error, not throw the whole batch
    expect("error" in results[missing]).toBe(true);
    expect(typeof (results[missing] as { error: string }).error).toBe("string");
  });

  it("creates a verifiable backup when keepBackup is enabled", async () => {
    const file = await copyFixture("backup.jpg");

    const result = await writeExifData(exiftool, file, {
      make: "Leica",
      model: "M6",
    });
    expect(result.success).toBe(true);
    expect(result.backupPath).toBeTruthy();
    // The backup must actually exist on disk (exercises the cross-volume-safe
    // moveFile fallback on the real OS).
    await expect(fs.access(result.backupPath!)).resolves.toBeUndefined();

    const data = await readExifData(exiftool, file);
    expect(data.make).toBe("Leica");
    expect(data.model).toBe("M6");
  });
});
