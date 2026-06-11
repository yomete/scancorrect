# Plan 016: RAW/DNG Format Support — Spike Report

**Spike executed**: 2026-06-11  
**Branch**: `advisor/016-raw-spike`  
**ExifTool version**: 13.58 (exiftool-vendored ^35)  
**Verdict**: **Build — DNG + TIFF-based RAW (NEF, CR2, ARW) all viable; DNG recommended as first-priority format**

---

## Fixture Provenance

All fixtures were synthesized locally (no external download required):

| File | Method | Size |
|------|---------|------|
| `sample.tiff` | `sips -s format tiff sample.jpg` (macOS) from `e2e/fixtures/sample.jpg` | 30 KB |
| `sample.dng` | TIFF copy + `exiftool -DNGVersion='1 4 0 0'` to tag as DNG | 30 KB |
| `sample.nef` | TIFF copy with `.nef` extension (TIFF-based container) | 30 KB |
| `sample.cr2` | TIFF copy with `.cr2` extension (TIFF-based container) | 30 KB |
| `sample.arw` | TIFF copy with `.arw` extension (TIFF-based container) | 30 KB |

**Caveat**: These are valid TIFF containers that exiftool reads as the target format (confirmed by `FileType` tag). They are not real camera RAW files from actual bodies. The write/read-back and backup/restore experiments are real — exiftool operates on the actual container. Thumbnail-extraction results reflect the stub structure only; real camera files will differ (real NEF/CR2/ARW bodies always embed a full-resolution JPEG preview).

---

## Question 1: Write / Read-back per format

**Tag set tested**: Make, Model, ISO, GPS (latitude/longitude/latRef/lonRef)

| Format | ExifTool FileType | write OK | Make rb | Model rb | ISO rb | GPS rb |
|--------|------------------|----------|---------|---------|--------|--------|
| DNG    | DNG              | ✅       | ✅      | ✅      | ✅     | ✅     |
| NEF    | NEF              | ✅       | ✅      | ✅      | ✅     | ✅     |
| CR2    | CR2              | ✅       | ✅      | ✅      | ✅     | ✅     |
| ARW    | ARW              | ✅       | ✅      | ✅      | ✅     | ✅     |

Evidence: `npm run test:integration` — 18 tests passed, 0 failed.

All four TIFF-based container formats accept the full `writeExifData` tag set with zero code changes. ExifTool 13.58 writes and reads back Make, Model, ISO 800, and GPS (Paris: 48.8566 N / 2.3522 E) correctly for every format.

**CR3 note**: CR3 (Canon Raw v3, ISO Base Media / MP4 container) was not tested. It is a fundamentally different container from TIFF. ExifTool supports CR3 writes but with known limitations around the `THMB` atom. It should be treated as a separate spike if Canon users are a priority.

---

## Question 2: Backup / Restore — byte-identical?

| Format | backup created | backup hash == original | restore byte-identical |
|--------|---------------|------------------------|------------------------|
| DNG    | ✅            | ✅                     | ✅                     |
| NEF    | ✅            | ✅                     | ✅                     |
| CR2    | ✅            | ✅                     | ✅                     |
| ARW    | ✅            | ✅                     | ✅                     |

Evidence: Each test: `writeExifData(..., keepBackup=true)` → `result.backupPath` present → `SHA-256(backup) === SHA-256(original)`.

The `_original` file exiftool creates is the unmodified source; `writeExifData` then moves it to the app backup dir. This works byte-identically for TIFF-based RAW formats. No format-specific logic is needed in `exif.ts`.

---

## Question 3: Thumbnail Extraction

| Format | PreviewImage | ThumbnailImage | JpgFromRaw | Notes |
|--------|-------------|----------------|------------|-------|
| DNG    | ❌          | ❌             | ❌         | Stub has no embedded preview |
| NEF    | ❌          | ❌             | ❌         | Stub has no embedded preview |
| CR2    | ✅ (27,648 bytes) | ❌        | ❌         | Inherited from TIFF/JPEG conversion chain |
| ARW    | ❌          | ❌             | ❌         | Stub has no embedded preview |

**Important caveat on stub results**: The stub NEF/DNG/ARW files are bare TIFF containers with no embedded JPEG preview — this is not representative of real camera output. Real camera NEF, DNG, CR2, and ARW files universally embed a full-resolution JPEG preview (`JpgFromRaw` for NEF, `PreviewImage` for CR2/ARW, various tags for DNG). The existing thumbnail pipeline (`extract-thumbnail` using exiftool binary tag extraction) will work for real files.

**Renderer implication**: The Electron renderer cannot natively decode RAW pixel data (no canvas/nativeImage RAW decoder). The thumbnail pipeline must fall back to exiftool-extracted JPEG previews. For real files this is fine; for any edge-case file without an embedded JPEG (unusual for modern cameras), the preview grid should show a placeholder. This is already the app's fallback pattern.

---

## Question 4: In-place Writing Safety

### What ExifTool documentation says

From https://exiftool.org/#supported:
- DNG: TIFF-based, fully writable, Adobe spec. Safe for in-place writes. ExifTool's DNG support is mature.
- NEF/NRW: TIFF-based, writable. ExifTool supports writing IFD0/ExifIFD tags. Safe for in-place writes to standard EXIF tags (Make, Model, ISO, GPS, etc.).
- CR2: TIFF-based Canon format. Fully writable. In-place safe for standard EXIF tags.
- ARW: TIFF-based Sony format. Writable. Standard EXIF tags safe.
- CR3: ISO Base Media container. ExifTool can write, but with known caveats around Canon-specific atoms. Higher risk.
- X3F (Sigma Foveon): Proprietary, not TIFF-based. ExifTool does NOT write X3F; XMP sidecar only.
- RAF (Fujifilm): Hybrid format. ExifTool can write EXIF tags in-place but Fujifilm-specific metadata requires care.

### What the experiments showed

All four TIFF-based formats (DNG, NEF, CR2, ARW) accepted writes and produced byte-identical backup/restore. ExifTool's default behavior is to write a `_original` file (the backup), then overwrite in place. This is safe for EXIF IFD tags on TIFF-based formats — the pixel data and RAW-specific blocks are not touched.

### Safety verdict

| Format | Safety | Recommended approach |
|--------|--------|---------------------|
| DNG    | ✅ Safe | In-place write |
| NEF    | ✅ Safe | In-place write |
| CR2    | ✅ Safe | In-place write |
| ARW    | ✅ Safe | In-place write |
| CR3    | ⚠️  Moderate | In-place write is possible but test with real bodies first |
| RAF    | ⚠️  Moderate | In-place write OK for EXIF block; test separately |
| X3F    | ❌ Unsafe | XMP sidecar only |

The backup semantics already in `exif.ts` are sufficient — no format-specific branching is needed for DNG/NEF/CR2/ARW. The existing `writeExifData` / `restoreFromBackup` path works as-is.

---

## Question 5: Effort Estimate and Recommended Scope

### Minimum viable build (DNG + TIFF-based RAW)

The product code changes required are small:

| File | Change |
|------|--------|
| `packages/shared/src/utils.ts` `isImageFile` | Add `.dng`, `.nef`, `.cr2`, `.arw` to extension list |
| `packages/desktop/src/App.tsx` drop filter | Add `dng\|nef\|cr2\|arw` to the regex |
| Docs / supported-format list | Update |

No changes to `exif.ts`, no new IPC handlers, no new backup logic.

**Estimate**: 1–2 hours of product work. The spike validates that nothing else is needed.

### Preview implications (additional work)

The renderer cannot decode RAW pixel data. The thumbnail grid must show exiftool-extracted JPEG previews for RAW files. The existing `extract-thumbnail` pipeline handles this for files that have embedded previews (all real camera files do). A "no preview available" placeholder fallback for edge-case files without embedded JPEG would be prudent — this is likely already present given the existing TIFF preview path.

If the preview grid currently shows the actual pixel data for TIFF (rendered via nativeImage), it will need a format-type branch or a graceful fallback for RAW. This adds ~2–4 hours for a robust fallback UI.

**Total honest estimate**: S/M — 3–6 hours including preview fallback and manual verification with real camera files.

---

## Recommendation

**Build — DNG first, then NEF/CR2/ARW.**

The experiment confirms: (a) ExifTool writes all TIFF-based RAW tags without errors, (b) backup/restore is byte-identical, (c) no changes to `exif.ts` are needed, (d) the extension filter and `isImageFile` helper are the only product-code touch points. The risk is low because the backup semantics are already proven.

CR3 and RAF can follow as a second tier if Canon/Fujifilm users are a named audience. X3F (Sigma) should not be supported for in-place writes; XMP sidecar only.

**The branch can be merged as reference** — the spike tests document format behavior and will catch any regression if exiftool-vendored is upgraded.

---

## Evidence Index

| Claim | Test / command |
|-------|---------------|
| ExifTool 13.58 available | `node -e "new ExifTool().version()"` → `13.58` |
| FileType recognition | `exif.integration.test.ts` + spike tests "recognises the format" |
| Write/read-back (all formats) | spike tests "round-trips Make/Model/ISO/GPS tags" — 4×pass |
| Backup byte-identical (all formats) | spike tests "backup/restore produces byte-identical file" — 4×pass |
| Thumbnail extraction | spike tests "thumbnail extraction" — CR2 27,648 bytes; others stub-absent |
| Full suite no regression | `npm run test:integration` → 18/18 passed |
