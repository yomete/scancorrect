# Plan 006: Single source of truth for IPC contract types (preload vs renderer)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/electron/preload.ts packages/desktop/src/types.ts packages/desktop/electron/main.ts packages/desktop/electron/exif.ts`
> On drift, re-verify the excerpts below before proceeding.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW–MED
- **Depends on**: none (should land BEFORE plan 007)
- **Category**: tech-debt
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

The types that define the IPC contract are hand-duplicated in three places and have **already drifted**: `ExifData` in `packages/desktop/electron/preload.ts:18-33` is missing the `dateTimeOriginal` field that `packages/desktop/src/types.ts:41-54` has (used for GPX matching). The renderer believes the contract includes a field the preload typing doesn't know about; nothing catches this because the two sides never import from each other. Meanwhile `packages/shared/src/types.ts` contains a third, stale copy of an old `ElectronAPI` (with an `editExif` method that no longer exists). Consolidating these makes future IPC changes (plans 007, 008) one-edit changes instead of three-edit drift hazards.

## Current state

- `packages/desktop/electron/preload.ts` (285 lines) — lines 3–~160 define local interfaces (`CameraProfile`, `GeocodingResult`, `ExifData`, `CustomValues`, `ProcessingLogEntry`, `FinderMetadataSnapshot`, and more), then an `ElectronAPI` interface, then `contextBridge.exposeInMainWorld('electronAPI', electronAPI)` at line 279. The preload's `ExifData` (lines 18–33):

```ts
interface ExifData {
  make?: string
  model?: string
  lens?: string
  iso?: number
  aperture?: number
  shutterSpeed?: number
  focalLength?: number
  exposureComp?: number
  filmStock?: string
  location?: { name: string; latitude: number; longitude: number }
  dateOriginal?: string
}
```

- `packages/desktop/src/types.ts:41-54` — renderer `ExifData` has, in addition: `dateTimeOriginal?: string // Full ISO timestamp for GPX matching`, and `location?: LocationValue` (a named type). This is the drift.
- `packages/desktop/electron/main.ts:11` imports `ExifData` from `./exif` — the main process's canonical `ExifData` lives in `packages/desktop/electron/exif.ts`. main.ts also locally re-declares `CustomValues`, `ProcessingLogEntry`, etc. (lines 15+), duplicating preload.
- `packages/shared/src/types.ts` — stale: old `ElectronAPI` (`editExif`, `ProcessResult`), plus `Theme`/`AppConfig` (currently unused by desktop — verify with `grep -rn "from 'shared'" packages/desktop/src packages/website` and `grep -rn '@?shared' packages/desktop/src/*.ts*`).
- Build constraint that shapes the fix: `electron/` compiles with its own tsconfig (`packages/desktop/electron/tsconfig.json`, CommonJS, `include: ["*.ts"]` — check whether it includes only top-level files) while `src/` compiles via Vite/bundler resolution. A types-only file is safe to share across both as long as it contains **only types** (no runtime imports), because `tsc` for electron must be able to compile it and Vite erases it.

## Decision (made by the advisor — do not re-litigate)

Create `packages/desktop/electron/ipc-types.ts` as the single source for IPC-boundary types, and have BOTH `preload.ts`/`main.ts` and the renderer (`src/types.ts` re-exporting) import from it. Keep `packages/shared` out of the desktop IPC contract (its package exports point at `src/` and the website doesn't need these types); instead, delete the stale `ElectronAPI`/`ProcessResult` from shared if nothing imports them.

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Typecheck (renderer + electron) | `npm run typecheck` | exit 0 |
| Electron compile | `npx tsc -p electron --noEmit` | exit 0 |
| Tests | `npm run test` | pass |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:
- `packages/desktop/electron/ipc-types.ts` (create — types only, zero runtime code)
- `packages/desktop/electron/preload.ts`, `packages/desktop/electron/main.ts`, `packages/desktop/electron/exif.ts` (import/move types)
- `packages/desktop/src/types.ts` (re-export shared IPC types; keep renderer-only types like `ImageFile` here)
- `packages/desktop/electron/tsconfig.json` and `packages/desktop/tsconfig.json` ONLY if include paths must be adjusted for the new file
- `packages/shared/src/types.ts` / `index.ts` (delete stale `ElectronAPI`/`ProcessResult` ONLY if `grep -rn 'ElectronAPI\|ProcessResult' packages/desktop/src packages/website --include='*.ts*'` shows no importers from shared)

**Out of scope**:
- Changing any runtime IPC behavior, channel names, or handler logic.
- The `window.electronAPI` global type declaration mechanism, beyond pointing it at the consolidated types.
- `packages/shared/dist/` (plan 011 handles committed dist).

## Git workflow

- Branch: `advisor/006-shared-ipc-types`
- Commits: (1) add ipc-types.ts + electron side, (2) renderer side, (3) shared cleanup. Plain imperative messages.

## Steps

### Step 1: Inventory the duplicated types

List every interface declared in `preload.ts`, in `main.ts` (lines ~15–160), in `exif.ts`, and in `src/types.ts`. Build the union; where the same name differs across files, the **renderer version in `src/types.ts` is authoritative** (it's the most complete — e.g. `ExifData.dateTimeOriginal`), EXCEPT types that exist only in electron (e.g. exif write internals) which stay where they are.

**Verify**: produce the list in your working notes; confirm `ExifData` discrepancy matches the excerpt above.

### Step 2: Create `electron/ipc-types.ts`

Move the IPC-boundary types there: `CameraProfile`, `ExifData`, `LocationValue`, `GeocodingResult`, `CustomValues`, `ProcessingLogEntry`, `SavedLocation`, `LocationHistoryEntry`, `GPXTrack`, `FinderMetadataSnapshot`, the dialog/result shapes — everything that crosses `ipcRenderer.invoke`. Types only; no imports of `electron` or any runtime module (type-only imports of other type files are fine).

**Verify**: `npx tsc -p electron --noEmit` → exit 0 (the file must be picked up by `electron/tsconfig.json`'s include — it sits in `electron/`, so the existing `"*.ts"` include covers it).

### Step 3: Point electron files at it

In `preload.ts`, `main.ts`, `exif.ts`: delete the local duplicate interfaces and `import type { ... } from './ipc-types'`. `exif.ts`'s `ExifData` moves to ipc-types (it gains `dateTimeOriginal` — confirm `writeExifData` handles that field or ignores it gracefully; it's optional so unhandled-but-typed is acceptable, note it in your report).

**Verify**: `npx tsc -p electron --noEmit` → exit 0; `npm run test` → pass (electron __tests__ exercise exif/gpx modules).

### Step 4: Point the renderer at it

In `src/types.ts`, replace the duplicated IPC types with `export type { ExifData, CameraProfile, ... } from '../electron/ipc-types'` (relative import of a types-only file is erased at build; Vite's `tsconfig.json` `include: ["src"]` may need `"electron/ipc-types.ts"` added — adjust if typecheck complains). Keep renderer-only types (`ImageFile`, `MergeDecision`, view/UI types) defined locally.

**Verify**: `npm run typecheck` → exit 0; `npm run build` → exit 0; `npm run test` → pass.

### Step 5: Clean stale shared types

If the grep in Scope confirms no importers: remove `ElectronAPI` and `ProcessResult` from `packages/shared/src/types.ts` (and their re-exports in `index.ts`). Leave `Theme`/`AppConfig` (plan 013 will use `AppConfig`).

**Verify**: `npm run typecheck` from repo root → exit 0 for all workspaces.

## Test plan

No new tests required; this is a types-only refactor. The gate is typecheck across both tsconfigs + existing suites. One drift-prevention bonus if cheap: in `src/types.ts`, the re-export itself now guarantees renderer/preload agreement — note this in the PR description.

## Done criteria

- [ ] `grep -c "interface ExifData" packages/desktop -r --include='*.ts'` → exactly 1 (in `electron/ipc-types.ts`)
- [ ] `npm run typecheck` (root, all workspaces) exits 0
- [ ] `npx tsc -p packages/desktop/electron --noEmit` exits 0
- [ ] `npm run build` and `npm run test` (desktop) pass
- [ ] No runtime diff: `git diff` shows only type declarations/imports moved (reviewer check)
- [ ] `plans/README.md` updated

## STOP conditions

- The renderer tsconfig cannot resolve `../electron/ipc-types` without enabling options that change other behavior (e.g. it requires turning off `isolatedModules` or adding broad includes) — report the constraint and the two candidate placements (`src/` vs `electron/`) instead of forcing it.
- Two same-named types differ in a way that isn't a pure superset (conflicting field types, not just missing fields) — that's a live contract bug; report it rather than silently picking one.
- Anything imports `ElectronAPI` from shared.

## Maintenance notes

- All future IPC additions (plans 007, 008, 013, 014) must add types to `electron/ipc-types.ts` only.
- Reviewer should diff each moved interface against its deleted copies to confirm supersets, not silent narrowing.
