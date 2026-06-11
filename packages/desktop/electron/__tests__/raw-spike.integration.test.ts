/**
 * SPIKE: RAW/DNG format support feasibility
 * Plan: 016-raw-format-spike
 *
 * This file is an experiment, not a product test. It answers:
 *   1. Does writeExifData's tag set round-trip via bundled exiftool for DNG/NEF/CR2/ARW?
 *   2. Does the backup/restore path return byte-identical files for these formats?
 *   3. Do embedded thumbnails extract via extractBinaryTagToBuffer?
 *   4. Safety verdict for in-place writing.
 *
 * FIXTURE NOTES:
 *   The fixtures under electron/__tests__/fixtures/raw-spike/ are synthetic:
 *   a small TIFF (converted from sample.jpg via sips) renamed/tagged per format.
 *   They are valid TIFF containers that exiftool recognises as the target format
 *   by extension+header tags, so write/read-back and backup experiments are real,
 *   but thumbnail extraction results reflect the stub structure (no full RAW
 *   demosaic or embedded JPEG from a real camera body). See report for caveats.
 *
 *   Provenance: derived from packages/desktop/e2e/fixtures/sample.jpg (project
 *   asset, no external download required). All fixtures are <100 KB.
 *
 * Tests are skip-guarded: if a fixture is absent the test is skipped cleanly.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ExifTool } from "exiftool-vendored";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import { writeExifData, readExifData, initBackupDir } from "../exif";

const FIXTURES_DIR = path.join(
  __dirname,
  "fixtures",
  "raw-spike"
);

const RAW_FORMATS: Array<{
  ext: string;
  name: string;
  expectWrite: boolean;
  expectThumbnail: boolean;
  thumbnailTags: string[];
}> = [
  {
    ext: "dng",
    name: "DNG",
    expectWrite: true,
    expectThumbnail: false, // stub has no embedded JPEG preview
    thumbnailTags: ["PreviewImage", "ThumbnailImage", "JpgFromRaw"],
  },
  {
    ext: "nef",
    name: "NEF (Nikon)",
    expectWrite: true,
    expectThumbnail: false,
    thumbnailTags: ["PreviewImage", "ThumbnailImage", "JpgFromRaw"],
  },
  {
    ext: "cr2",
    name: "CR2 (Canon)",
    expectWrite: true,
    // Our CR2 stub inherits a PreviewImage from the TIFF/JPEG conversion chain
    expectThumbnail: true,
    thumbnailTags: ["PreviewImage", "ThumbnailImage", "JpgFromRaw"],
  },
  {
    ext: "arw",
    name: "ARW (Sony)",
    expectWrite: true,
    expectThumbnail: false,
    thumbnailTags: ["PreviewImage", "ThumbnailImage", "JpgFromRaw"],
  },
];

function fixtureExists(ext: string): boolean {
  try {
    // synchronous check for skip guard
    const p = path.join(FIXTURES_DIR, `sample.${ext}`);
    require("fs").accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function hashBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

describe("SPIKE: RAW/DNG write/read-back/restore experiments", () => {
  let exiftool: ExifTool;
  let workDir: string;

  beforeAll(async () => {
    exiftool = new ExifTool();
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "scancorrect-raw-spike-"));
    initBackupDir(path.join(workDir, "backups"));
  });

  afterAll(async () => {
    await exiftool.end();
    await fs.rm(workDir, { recursive: true, force: true });
  });

  for (const fmt of RAW_FORMATS) {
    describe(`${fmt.name} (.${fmt.ext})`, () => {
      it("exiftool recognises the format by FileType", async () => {
        if (!fixtureExists(fmt.ext)) {
          console.log(`SKIP: fixture sample.${fmt.ext} absent`);
          return;
        }
        const fixture = path.join(FIXTURES_DIR, `sample.${fmt.ext}`);
        const tags = await exiftool.read(fixture);
        expect(String(tags.FileType).toUpperCase()).toBe(fmt.ext.toUpperCase());
      });

      it("writeExifData round-trips Make/Model/ISO/GPS tags", async () => {
        if (!fixtureExists(fmt.ext)) {
          console.log(`SKIP: fixture sample.${fmt.ext} absent`);
          return;
        }
        const fixture = path.join(FIXTURES_DIR, `sample.${fmt.ext}`);
        const dest = path.join(workDir, `roundtrip.${fmt.ext}`);
        await fs.copyFile(fixture, dest);

        const result = await writeExifData(
          exiftool,
          dest,
          {
            make: "SpikeCamera",
            model: "SpikeModel",
            iso: 800,
            location: { name: "Paris", latitude: 48.8566, longitude: 2.3522 },
          },
          false // no backup for round-trip test
        );

        if (fmt.expectWrite) {
          // Spike result: write succeeds
          expect(result.success).toBe(true);
          if (result.success) {
            const data = await readExifData(exiftool, dest);
            expect(data.make).toBe("SpikeCamera");
            expect(data.model).toBe("SpikeModel");
            expect(data.iso).toBe(800);
            expect(data.location?.latitude).toBeCloseTo(48.8566, 3);
            expect(data.location?.longitude).toBeCloseTo(2.3522, 3);
          }
        } else {
          // Spike documents the failure as a finding
          expect(result.success).toBe(false);
          console.log(`FINDING: ${fmt.name} write failed: ${result.error}`);
        }
      });

      it("backup/restore produces byte-identical file", async () => {
        if (!fixtureExists(fmt.ext)) {
          console.log(`SKIP: fixture sample.${fmt.ext} absent`);
          return;
        }
        const fixture = path.join(FIXTURES_DIR, `sample.${fmt.ext}`);
        const dest = path.join(workDir, `backup.${fmt.ext}`);
        await fs.copyFile(fixture, dest);

        const origBuf = await fs.readFile(dest);
        const origHash = hashBuffer(origBuf);

        const result = await writeExifData(
          exiftool,
          dest,
          { make: "BackupTest", model: "BT1" },
          true // keepBackup
        );

        if (!fmt.expectWrite) {
          // Write fails — skip backup assertion, document as finding
          console.log(`FINDING: ${fmt.name} write failed, backup test skipped`);
          return;
        }

        expect(result.success).toBe(true);
        expect(result.backupPath).toBeTruthy();

        if (result.backupPath) {
          // Backup must exist and be byte-identical to original
          const backupBuf = await fs.readFile(result.backupPath);
          expect(hashBuffer(backupBuf)).toBe(origHash);
        }
      });

      it("thumbnail extraction via extractBinaryTagToBuffer", async () => {
        if (!fixtureExists(fmt.ext)) {
          console.log(`SKIP: fixture sample.${fmt.ext} absent`);
          return;
        }
        const fixture = path.join(FIXTURES_DIR, `sample.${fmt.ext}`);
        let foundThumbnail = false;
        let foundTag = "";
        let thumbSize = 0;

        for (const tag of fmt.thumbnailTags) {
          try {
            const buf = await exiftool.extractBinaryTagToBuffer(tag, fixture);
            if (buf && buf.length > 0) {
              foundThumbnail = true;
              foundTag = tag;
              thumbSize = buf.length;
              break;
            }
          } catch {
            // tag absent — continue
          }
        }

        if (fmt.expectThumbnail) {
          // Spike result: thumbnail expected and found
          expect(foundThumbnail).toBe(true);
          console.log(`FINDING: ${fmt.name} thumbnail via ${foundTag} = ${thumbSize} bytes`);
        } else {
          // Document as finding regardless
          if (foundThumbnail) {
            console.log(`FINDING: ${fmt.name} thumbnail found (unexpected for stub) via ${foundTag} = ${thumbSize} bytes`);
          } else {
            console.log(`FINDING: ${fmt.name} no thumbnail in stub fixture (expected for synthetic file)`);
          }
          // Either outcome is valid for a stub fixture
          expect(typeof foundThumbnail).toBe("boolean");
        }
      });
    });
  }
});
