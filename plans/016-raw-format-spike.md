# Plan 016: Spike — RAW/DNG format support feasibility

> **Executor instructions**: This is a SPIKE, not a build plan. The
> deliverable is a written report + passing experiment tests, NOT shipped
> features. Timebox: if any step exceeds ~2× its expected effort, write up
> what you learned and stop. When done, update `plans/README.md` and commit
> the report.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/electron/exif.ts packages/desktop/src/App.tsx`

## Status

- **Priority**: P3 (lowest — market-expansion bet, no user demand evidenced in-repo)
- **Effort**: M (timeboxed)
- **Risk**: LOW (spike outputs are a report + tests, no product change)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

ScanCorrect accepts only JPEG/TIFF. Some scanning workflows (camera-scanning with a digital camera, some lab scanners) produce DNG or proprietary RAW (CR2/CR3, NEF, ARW). ExifTool — already bundled via exiftool-vendored — supports writing to DNG and to many RAW formats, so format expansion might be cheap; but RAW metadata writing has real hazards (some formats are effectively read-only for safe writing, some tools write XMP sidecars instead, and a botched write can corrupt a negative's only digital copy). This spike answers: which formats can ScanCorrect safely support, with what backup semantics, at what effort — so a future build plan is grounded instead of hopeful.

## Current state

- File acceptance — `packages/desktop/src/App.tsx` filters dropped files to `jpg|jpeg|tiff|tif` (find the exact regex/extension list with `grep -n -i "jpe\?g\|tiff" packages/desktop/src/App.tsx packages/shared/src/utils.ts` — `packages/shared/src/utils.ts` has an `isImageFile` helper; check which one the drop path actually uses).
- Write path — `packages/desktop/electron/exif.ts` (343 lines): `writeExifData(exiftool, filePath, data, keepBackup)` — read it to know which tags are written (Make, Model, lens, ISO, aperture, etc.) and how backups work (backup dir under userData; `restoreFromBackup`). The integration test `packages/desktop/electron/__tests__/exif.integration.test.ts` runs against real exiftool with fixture images — this is the harness the spike extends.
- exiftool-vendored ^35 — full ExifTool underneath; writability per format is documented at https://exiftool.org/#supported (TIFF-based RAW like DNG/NEF/CR2 are generally writable; CR3 is writable; some like X3F are not; safe practice for proprietary RAW is often XMP sidecar or DNG-only).
- Test fixtures — look in `packages/desktop/electron/__tests__/` / any `fixtures` dir for how current test images are stored/generated. RAW fixtures are large; prefer tiny real DNGs (e.g. generated from a small TIFF via Adobe DNG SDK is not available — instead source the smallest legal sample files; raw.pixls.us hosts CC0 samples. Do NOT commit files >1 MB; if samples are large, download-on-demand in the test and skip when offline, or commit a tiny DNG only).

## Questions the spike must answer

1. For each of DNG, CR2, CR3, NEF, ARW: does `writeExifData`'s current tag set write successfully via the bundled exiftool, and does the file remain readable (exiftool read-back + thumbnail extraction still works)?
2. Does the backup/restore path (`exif.ts`) behave byte-identically for these formats (restore returns the original hash)?
3. Do embedded thumbnails extract for these formats via the existing `extract-thumbnail` tiers (exiftool binary tags / nativeImage)? Renderer preview likely can't decode RAW — what does the grid show?
4. Is in-place writing actually safe per format, or should support be DNG-only (+ XMP sidecars for others)? What does ExifTool's documentation say vs. what the experiments show?
5. What's the honest effort estimate and recommended scope for a build plan?

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Integration tests | `npm run test:integration` | pass (existing + spike tests) |
| Single spike file | `npx vitest run --config vitest.integration.config.ts electron/__tests__/raw-spike.integration.test.ts` | pass/skip cleanly |

## Scope

**In scope**:
- `packages/desktop/electron/__tests__/raw-spike.integration.test.ts` (new, clearly named as spike)
- Small fixture files or a download-on-demand fixture helper
- `plans/016-raw-format-spike-REPORT.md` (the deliverable)

**Out of scope**:
- ANY change to `App.tsx`, `exif.ts`, `shared/utils.ts`, preload, or the file filter. The product does not change in this plan.

## Git workflow

- Branch: `advisor/016-raw-spike`
- Commits: spike tests + report. The branch may be merged or kept as reference — operator's call; say so in the report.

## Steps

### Step 1: Fixtures

Acquire minimal sample files for DNG + 2–3 proprietary formats (CC0 sources; record provenance in the report). Implement skip-if-missing so CI never depends on downloads.

**Verify**: `ls` the fixtures; each loads in exiftool (`read` returns Make/Model).

### Step 2: Write/read-back/restore experiments

In `raw-spike.integration.test.ts` (modeled on `exif.integration.test.ts`): for each format — copy fixture to tmp; `writeExifData` with a representative tag set incl. GPS location; read back and assert tags; verify backup restore returns original bytes (hash compare); attempt thumbnail extraction via `exiftool.extractBinaryTagToBuffer('PreviewImage', ...)`.

**Verify**: `npm run test:integration` — spike tests pass or fail *informatively* (a failing format is a spike RESULT; convert it to a passing test that asserts the documented failure, e.g. `expect(writeResult.success).toBe(false)`).

### Step 3: Report

Write `plans/016-raw-format-spike-REPORT.md`: per-format matrix (writes? reads back? restores byte-exact? thumbnail?), the safety verdict (in-place vs sidecar vs unsupported), renderer-preview implications, recommended supported set, and an effort estimate for the build plan. End with a clear recommendation: build / build-DNG-only / don't build.

**Verify**: report answers all five questions in "Questions the spike must answer".

## Test plan

The spike tests ARE the experiment. They must be deterministic (skip when fixtures absent) and must not slow the default `npm run test` (integration config only).

## Done criteria

- [ ] Spike test file exists, runs under the integration config, passes (with documented-failure assertions where applicable)
- [ ] Report file exists and answers all 5 questions with evidence
- [ ] Zero product-code changes (`git status` shows only test/fixture/report files)
- [ ] `plans/README.md` updated

## STOP conditions

- Fixture acquisition stalls (no small legal samples for a format) — drop that format, note it.
- exiftool-vendored behaves differently from upstream ExifTool docs in a way that needs library-internals digging beyond the timebox — record the discrepancy as a finding.

## Maintenance notes

- If the verdict is "build": the follow-up plan touches `shared/utils.ts` `isImageFile`, the App.tsx filter, thumbnail fallbacks for undecodable previews, and the docs' supported-format list — and must include the backup-semantics guarantees this spike validated.
