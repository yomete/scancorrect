# Plan 008: Bulk IPC for EXIF reads + binary, bounded thumbnail cache

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/electron packages/desktop/src/hooks packages/desktop/src/App.tsx`
> Plan 007 restructures `electron/` before this plan — the handler code will
> live in `electron/handlers/` if 007 landed. Read the live files; excerpts
> below are from 217c979 for content, not location.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 006, 007 (if 007 is skipped, this plan still works against main.ts but touch only the named handlers)
- **Category**: perf
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

Loading a batch of scans does one `read-exif` IPC + exiftool call per file (`App.tsx` fires them all via `Promise.all`), and one `extract-thumbnail` IPC per visible card, throttled to 4 concurrent by a module-global queue in the renderer. Thumbnails travel as base64 data-URL strings over IPC and are then written back over IPC to disk as `.txt` files in an unbounded cache directory. For a 100-image roll this is ~200 IPC round-trips, ~33% size inflation on every thumbnail, and a cache that only ever grows. The fixes: a bulk EXIF read endpoint, binary thumbnail cache files read/written in the main process (renderer never round-trips cache content), and a size cap with LRU eviction.

## Current state

- Renderer drop flow — `packages/desktop/src/App.tsx:289-311`: `Promise.all(newImages.map(async (image) => { const result = await window.electronAPI.readExif(image.path) ... }))` then appends to state, skipping already-loaded paths.
- `read-exif` handler — at 217c979 `electron/main.ts:651-659`: calls `readExifData(exiftool, filePath)` from `electron/exif.ts`, returns `{ data, isScanner } | { error }`. `exiftool-vendored` maintains its own process pool, so concurrent reads are fine; the waste is per-call IPC + renderer-side fan-out, and there's no batching or dedup.
- Thumbnail extraction — `electron/main.ts:813-851`: tries embedded EXIF thumbnail via `exiftool.extractBinaryTagToBuffer`, falls back to `nativeImage.createThumbnailFromPath` (mac/win) then `nativeImage.createFromPath` + resize; returns `data:image/jpeg;base64,...` or null.
- Cache handlers — `electron/main.ts:864-892`: `get-cached-thumbnail` reads `THUMBNAIL_CACHE_DIR/<hash>.txt` as utf-8 (the data URL); `cache-thumbnail` writes it. The renderer hook (`src/hooks/useThumbnailExtraction.ts`) orchestrates: check cache → enqueue extraction (module-global `MAX_THUMBNAIL_EXTRACTIONS = 4`) → write cache. So every cached thumbnail crosses IPC twice (once on write, once on every later read).
- Settings: `thumbnailCacheEnabled` via `get/set-cache-setting` handlers and `useSettingsStore`.
- The mock surface in `packages/desktop/src/__tests__/setup.ts` stubs `readExif`, `extractThumbnail`, `getCachedThumbnail`, `cacheThumbnail` — new API methods need mocks there too.

## Design (decided — do not re-litigate)

1. **`read-exif-batch(filePaths: string[])`** → `Promise<Record<string, { data: ExifData; isScanner: boolean } | { error: string }>>`. Main process runs the per-file reads with `Promise.all` (exiftool pools internally); per-file errors land in the per-path entry, never reject the whole batch. Renderer drop flow makes ONE call. Keep the old `read-exif` channel for single-file uses (sidebar refresh etc.).
2. **Move cache orchestration into the main process.** Change `extract-thumbnail` semantics to "get-thumbnail": check disk cache first (if enabled), extract on miss, write cache (binary `.jpg`, not base64 `.txt`), return the data URL to the renderer. Renderer hook becomes: one IPC call. Remove `get-cached-thumbnail`/`cache-thumbnail` from preload usage in the hook (keep the channels registered for one release if you prefer zero-risk, but the renderer stops calling them — actually: remove the channels AND the preload methods AND their mocks; nothing else uses them, verify with `grep -rn "getCachedThumbnail\|cacheThumbnail" packages/desktop/src`).
3. **Bounded cache**: on app startup (and after each write), if `THUMBNAIL_CACHE_DIR` exceeds 100 MB, delete oldest-mtime files until under 80 MB. Also migrate: delete any legacy `*.txt` cache files on startup (cheap: they'll just re-extract).
4. **Raise renderer concurrency limit to 8** in `useThumbnailExtraction.ts` (the main process extraction is mostly waiting on exiftool/OS anyway). Keep the queue — it prevents 500 simultaneous IPC calls.

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Electron compile | `npx tsc -p electron --noEmit` | exit 0 |
| Unit tests | `npm run test` | pass |
| E2E | `npm run test:e2e` | pass — includes `load-preview-select` test that exercises previews |
| Integration | `npm run test:integration` | pass |

## Scope

**In scope**:
- `electron/handlers/exif-handlers.ts` + `electron/handlers/thumbnails.ts` (or main.ts if 007 unlanded), `electron/thumbnails.ts`
- `electron/ipc-types.ts`, `electron/preload.ts` (add `readExifBatch`, change `extractThumbnail` contract, remove cache pass-through methods)
- `src/hooks/useThumbnailExtraction.ts`, `src/App.tsx` (drop flow only), `src/__tests__/setup.ts` (mocks)
- New/updated tests in `electron/__tests__/` and the hook's behavior via existing component tests

**Out of scope**:
- Virtualizing the image grid, React.memo sweeps, any UI change
- `write-exif` batching (writes are user-initiated and already per-file with progress feedback)
- imageStore changes

## Git workflow

- Branch: `advisor/008-bulk-ipc-thumbnails`
- Commits: (1) batch read endpoint + renderer use, (2) main-process thumbnail cache + binary format + eviction, (3) concurrency bump + cleanup.

## Steps

### Step 1: `read-exif-batch`

Add the handler (per Design 1) next to `read-exif`, the preload method `readExifBatch(paths: string[])`, the type in `ipc-types.ts`, and the setup.ts mock. Switch the `App.tsx:289-311` drop flow to one `readExifBatch(newImages.map(i => i.path))` call, mapping results back per path (preserve the existing "skip already-loaded paths" append logic exactly).

**Verify**: `npm run typecheck` exit 0; `npm run test` pass; `npm run test:integration` pass (add an integration test: batch-read 3 fixture files, one nonexistent → 2 data + 1 error entry; model on existing `__tests__/exif.integration.test.ts`).

### Step 2: Main-process thumbnail cache

Implement Design 2+3 in `electron/thumbnails.ts`: `getThumbnail(filePath, { cacheEnabled }): Promise<string | null>` — cache check (binary `<hash>.jpg`, return as data URL), extract on miss (existing 3-tier logic, moved verbatim), cache write as raw JPEG bytes, eviction + legacy `.txt` cleanup helpers called from app startup. Rewire the `extract-thumbnail` handler to call it. Simplify `useThumbnailExtraction.ts`: drop the `getCachedThumbnail`/`cacheThumbnail` calls; the effect becomes cache-transparent (one `extractThumbnail` call through the queue). Remove the dead preload methods, channels, and mocks.

Note: the extraction returns JPEG bytes in all three tiers (embedded thumb is JPEG; both nativeImage paths call `.toJPEG(80)`) — so a `.jpg` cache file is always valid.

**Verify**: `npx tsc -p electron --noEmit` exit 0; new unit tests in `electron/__tests__/thumbnails.test.ts` (cache hit avoids extraction — inject a spy; eviction deletes oldest beyond cap; `.txt` legacy files removed; cacheEnabled=false skips read AND write) pass; `npm run test:e2e` passes — especially the existing `load-preview-select` e2e test, which is the regression net for previews.

### Step 3: Concurrency + cleanup

Set `MAX_THUMBNAIL_EXTRACTIONS = 8`. Run full gate.

**Verify**: `npm run test && npm run test:integration && npm run test:e2e` all pass; `grep -rn "getCachedThumbnail\|cacheThumbnail" packages/desktop/src packages/desktop/electron` → no matches.

## Test plan

- `electron/__tests__/exif.integration.test.ts`: + batch-read case (above).
- `electron/__tests__/thumbnails.test.ts` (new): cache hit / miss / disabled / eviction / legacy cleanup, using a temp dir (`fs.mkdtempSync(path.join(os.tmpdir(), ...))`) — model file-fixture handling on `__tests__/exif.test.ts`.
- Existing e2e `load-preview-select` covers the renderer wiring end-to-end.

## Done criteria

- [ ] Dropping N files issues 1 `read-exif-batch` IPC (assert in code review; e2e still green)
- [ ] Thumbnail cache dir contains only `.jpg` files after a run; legacy `.txt` removed on startup
- [ ] Eviction test proves the 100 MB cap
- [ ] All suites pass (unit, integration, e2e)
- [ ] `npm run typecheck` (root) exit 0
- [ ] `plans/README.md` updated

## STOP conditions

- Plan 007 hasn't landed AND main.ts has drifted from the excerpts in ways that make the handler locations ambiguous.
- The e2e `load-preview-select` test fails after Step 2 and one fix attempt — previews shipped broken once before (see commit 3e80392's fix); treat regressions here as release-critical.
- Something other than the hook calls `getCachedThumbnail`/`cacheThumbnail`.
- Batch reads of 100+ files cause exiftool timeouts (its `taskTimeoutMillis` is 10000) — if the integration test shows timeouts, chunk the batch in the main process (e.g. 16 at a time) and note it; if that fails too, stop.

## Maintenance notes

- The 100 MB/80 MB cache bounds and concurrency 8 are starting points — tune with real rolls.
- If a virtualized grid is ever added, the renderer queue may become unnecessary (only visible cards mount).
- Reviewer: check per-file error isolation in the batch handler (one corrupt file must not fail the roll) and that `App.tsx` still appends rather than replaces on second drop.
