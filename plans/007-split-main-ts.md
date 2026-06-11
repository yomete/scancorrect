# Plan 007: Split electron/main.ts into testable modules and unit-test the IPC handlers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/electron/`
> Plans 003 and 006 are EXPECTED to have modified main.ts/preload.ts before
> this runs — read the live main.ts fully before starting; the line numbers
> below are from commit 217c979 and will have shifted. A structural mismatch
> (handlers missing/renamed) is a STOP condition; shifted lines are not.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: 002 (store tests green), 003 (navigation hardening landed), 006 (ipc-types exists)
- **Category**: tech-debt / tests
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

`packages/desktop/electron/main.ts` is 1015 lines mixing window lifecycle, exiftool process management, 34 `ipcMain.handle` registrations, electron-store access, macOS Spotlight follow-up scheduling, thumbnail extraction, and diagnostics logging. It has 0% test coverage because nothing in it can be imported without booting Electron. Every feature (locations, GPX, thumbnails, mapbox) grows this file. Splitting handler logic into plain modules registered from a thin main.ts makes the handlers unit-testable with the existing vitest + `electron/__mocks__` infrastructure, and is the precondition for safely doing plan 008 (bulk IPC) and plan 009 (Electron upgrade).

## Current state

- `packages/desktop/electron/main.ts` (1015 lines at 217c979). The full handler list (from `grep "ipcMain.handle('" main.ts`):
  `get-profiles, save-profile, delete-profile, show-open-dialog, force-close-window, geocode-location, read-exif, write-exif, verify-folder-metadata, restore-backup, get-custom-values, save-custom-value, get-processing-log, add-log-entry, clear-processing-log, extract-thumbnail, get-cache-setting, set-cache-setting, get-cached-thumbnail, cache-thumbnail, get-saved-locations, save-location, delete-saved-location, increment-location-usage, get-location-history, add-to-location-history, clear-location-history, get-gpx-tracks, save-gpx-track, delete-gpx-track, show-open-gpx-dialog, parse-gpx, match-photos-to-gpx, get-mapbox-token, set-mapbox-token`
- Domain logic is ALREADY partly extracted and tested: `electron/exif.ts` (read/write/backup, tested in `__tests__/exif.test.ts` + integration), `electron/gpx.ts`, `electron/geocoding.ts`, `electron/scanner-detection.ts`, `electron/mapbox.ts`. The untested residue in main.ts is: handler wiring, store access (`getStore()` lazy electron-store), Spotlight scheduling (`scheduleSpotlightFollowUp`, mdls/mdimport via `execFile` — roughly lines 280–400), thumbnail extraction/caching (lines ~810–900), window/dialog code (lines ~490–600), diagnostics snapshot logging inside `write-exif` (lines ~662–712).
- Existing mocks: `electron/__mocks__/exiftool-vendored.ts`, `electron/__mocks__/electron-store.ts`. Existing test style exemplar: `packages/desktop/electron/__tests__/exif.test.ts`.
- `electron/tsconfig.json` includes `"*.ts"` — **subdirectories under electron/ may not be included**; check and extend include patterns if you create `electron/handlers/` (e.g. `"include": ["*.ts", "handlers/*.ts"]`). Output must keep landing in `dist-electron/` such that `main.js` remains the entry (`packages/desktop/package.json` `"main": "dist-electron/main.js"` — compiled subdirs change relative paths; verify `__dirname`-based references like the preload path and `../dist/index.html` still resolve. Preload path is `path.join(__dirname, 'preload.js')` from `createWindow` — keep window code in a top-level file to avoid churn).
- vitest config for electron tests: check `packages/desktop/vitest.config.ts` `include` globs cover `electron/__tests__/**` (they do today) and will cover new test files there.

## Target architecture

Keep it flat and boring — plain functions, no classes, matching the existing extracted modules:

```
electron/
  main.ts            — ~100 lines: app lifecycle, createWindow(), exiftool instance,
                       calls registerAllHandlers({ exiftool, getStore, getMainWindow })
  window.ts          — createWindow(), close-confirmation dialog, will-navigate policy
  store.ts           — lazy electron-store accessor (getStore) + typed get/set helpers
  spotlight.ts       — scheduleSpotlightFollowUp, mdls/mdimport snapshot helpers (mac-only)
  thumbnails.ts      — extractThumbnail(filePath, exiftool), cache read/write, hash, cache dir
  handlers/
    profiles.ts      — get/save/delete-profiles, custom values, processing log
    exif-handlers.ts — read-exif, write-exif (incl. diagnostics), restore-backup, verify-folder-metadata
    locations.ts     — saved locations, history, geocode-location
    gpx-handlers.ts  — gpx track CRUD, show-open-gpx-dialog, parse-gpx, match-photos-to-gpx
    thumbnails.ts    — extract-thumbnail, cache handlers, cache settings
    misc.ts          — show-open-dialog, force-close-window, mapbox token
```

Each `handlers/*.ts` exports `register<X>Handlers(deps)` where `deps` carries `{ ipcMain, exiftool, getStore, getMainWindow, dialog }` as needed — dependencies passed in, not imported, so tests can pass fakes without mocking the `electron` module wholesale. (Where that's awkward, `vi.mock('electron')` is acceptable; prefer deps.)

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Electron compile | `npx tsc -p electron --noEmit` | exit 0 |
| Unit tests | `npm run test` | pass |
| Build | `npm run build` | exit 0 |
| Run E2E | `npm run test:e2e` (xvfb-run on Linux) | pass |
| Integration | `npm run test:integration` | pass |
| Pack + smoke | `npm run pack && npm run test:smoke` | pass |

## Scope

**In scope**: `packages/desktop/electron/**` (main.ts, new modules, new tests under `electron/__tests__/`), `packages/desktop/electron/tsconfig.json` (include globs only), `packages/desktop/vitest.config.ts` (test include globs only if needed).

**Out of scope**:
- `preload.ts` (channel names and API shape are frozen — zero renderer-visible change)
- Any behavior change inside handlers (pure move-and-wire; the ONE permitted addition is the defense-in-depth path check below)
- `src/**` renderer code
- Bulk-IPC handlers (plan 008 — do not pre-build them)

## Permitted hardening (do during the move, nothing more)

When moving `read-exif`, `write-exif`, `restore-backup`, `extract-thumbnail`, `get-cached-thumbnail`/`cache-thumbnail`: wrap the incoming `filePath` with a tiny shared guard in `handlers/` (e.g. `assertAbsolutePath(p)`: `path.isAbsolute(p)` and no `\0`) that throws a clean error otherwise. This changes behavior only for malformed input that would have failed anyway. Do NOT attempt directory allowlisting — drag-and-drop legitimately produces arbitrary user paths.

## Git workflow

- Branch: `advisor/007-split-main-ts`
- Commit per extracted module ("Extract thumbnail handlers from main.ts", …), tests in the same commit as their module. Never leave a commit where the app doesn't build.

## Steps

### Step 1: Read and map the live main.ts

Read the whole current file. Produce the handler→target-module mapping per the architecture above; flag anything not in the table.

**Verify**: every `ipcMain.handle` channel in the live file is assigned a target module.

### Step 2: Extract leaf utilities (`store.ts`, `spotlight.ts`, `thumbnails.ts`)

Move code verbatim; export functions; main.ts imports them. No handler moves yet.

**Verify**: `npx tsc -p electron --noEmit` exit 0 → `npm run build` exit 0 → `npm run test` pass → launch e2e (`npm run test:e2e`) pass.

### Step 3: Extract handler groups one at a time

For each `handlers/*.ts`: move the `ipcMain.handle` calls into `registerXHandlers(deps)`, call it from main.ts. After EACH group: compile + unit tests. After all groups: main.ts should be roughly app lifecycle + exiftool init + `registerAllHandlers` + menu.

**Verify** (after each group): `npx tsc -p electron --noEmit` → exit 0. (After all): `grep -c "ipcMain.handle" electron/main.ts` → 0; `npm run test:e2e` → pass.

### Step 4: Unit-test the handler modules

New tests in `electron/__tests__/`, modeled on `exif.test.ts`. Strategy: call `registerXHandlers` with a fake `ipcMain` that records `(channel, fn)` into a Map, then invoke the captured fns directly with fake deps (mock exiftool from `__mocks__/exiftool-vendored.ts`, mock store from `__mocks__/electron-store.ts`).

Minimum coverage:
- `profiles.ts`: get/save/delete round-trip against the mock store; processing-log append/clear.
- `exif-handlers.ts`: read-exif success + error mapping (`{ error }` shape); write-exif success schedules Spotlight follow-up (inject a spy), failure returns `{ success: false, error }`; restore-backup pass-through; the new `assertAbsolutePath` guard rejects relative paths.
- `locations.ts`: CRUD round-trips; increment-usage updates count.
- `gpx-handlers.ts`: parse-gpx delegates to `parseGPX` (already tested) and stores the track.
- `thumbnails.ts` (handlers): cache hit short-circuits extraction; cache write honors `thumbnailCacheEnabled` setting handlers.

**Verify**: `npm run test` → pass; `npm run test:coverage` → `electron/handlers` ≥ 70% lines.

### Step 5: Full gate

**Verify**: `npm run typecheck`, `npm run test`, `npm run test:integration`, `npm run test:e2e`, `npm run pack && npm run test:smoke` — all pass.

## Test plan

Described in Step 4. Net-new: ~5 test files under `electron/__tests__/`. Pattern file: `packages/desktop/electron/__tests__/exif.test.ts`.

## Done criteria

- [ ] `electron/main.ts` ≤ ~150 lines and contains zero `ipcMain.handle` calls
- [ ] All 35 channels still registered (compare `grep -roh "ipcMain.handle('[^']*'" electron/ | sort` against the list in Current state — plus nothing renamed)
- [ ] All suites pass: unit, integration, e2e, packaged smoke
- [ ] `electron/handlers` coverage ≥ 70% lines
- [ ] No changes outside `packages/desktop/electron/` + the two config files (`git status`)
- [ ] `plans/README.md` updated

## STOP conditions

- The live main.ts structure differs materially from the handler list above (channels added/removed since 217c979) — re-map first; if >5 unknown handlers, report back.
- Compiled output layout breaks the packaged app (preload path, `../dist/index.html`, or `build/icon.png` resolution from `__dirname`) and one fix attempt fails — packaging is release-critical.
- e2e or smoke tests fail after a move and the cause isn't an obvious wiring slip.
- You feel the need to "improve" handler logic during the move — don't; report the improvement idea instead.

## Maintenance notes

- New IPC channels now go: type in `electron/ipc-types.ts` (plan 006), handler in the matching `handlers/*.ts`, exposure in `preload.ts`, mock in `src/__tests__/setup.ts`.
- Plan 008 builds bulk endpoints directly into `handlers/exif-handlers.ts` and `handlers/thumbnails.ts`.
- Reviewer focus: diff each moved block against the original for accidental edits; verify dependency injection didn't change lazy-init order (electron-store must not be constructed before `app.whenReady`).
