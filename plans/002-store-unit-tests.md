# Plan 002: Add unit tests for the three Zustand stores

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/src/store packages/desktop/src/__tests__/setup.ts`
> On any drift, compare the "Current state" excerpts against the live code; on
> a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

The three Zustand stores in `packages/desktop/src/store/` hold all image/selection/pending-changes state, location CRUD, and settings — and have zero tests (overall `src/` coverage is under 1%). They are pure-ish modules that are cheap to test, and they form the verification baseline for the later `main.ts` refactor (plan 007) and bulk-IPC work (plan 008): if store behavior is pinned by tests, those riskier changes can't silently break selection or pending-changes semantics.

## Current state

- `packages/desktop/src/store/imageStore.ts` (212 lines) — `useImageStore`: images array, `selectedImageIds: Set<string>`, thumbnails `Map`, actions (`addImages`, `updateImage`, `removeImages`, `selectImage`, `toggleImageSelection`, `updatePendingChanges`, `updateMultiplePendingChanges`, `discardImageChanges`, `discardAllChanges`, `applyProfileDefaults`, `setThumbnail`, …) and selectors (`getSelectedImages`, `hasUnsavedChanges`, `getImagesWithChanges`). Notable semantics to pin:
  - `setImages` replaces images AND clears selection (`imageStore.ts:52`).
  - `selectImage` is single-select: it replaces the whole set (`imageStore.ts:82-85`).
  - `removeImages` also drops removed paths from the selection (`imageStore.ts:64-72`).
  - `applyProfileDefaults` merges profile make/model/lens plus `profile.defaults` (iso, aperture, shutterSpeed, focalLength, exposureComp, filmStock, location) into `pendingChanges`, only for the given paths (`imageStore.ts:147-172`).
  - `hasUnsavedChanges` is true only if some image has a non-empty `pendingChanges` object (`imageStore.ts:199-204`).
- `packages/desktop/src/store/locationStore.ts` (117 lines) — `useLocationStore`: every action calls `window.electronAPI.*` (e.g. `getSavedLocations`, `saveLocation`, `deleteSavedLocation`, `incrementLocationUsage`, `getLocationHistory`, `addToLocationHistory`, `clearLocationHistory`, `getGPXTracks`, `deleteGPXTrack`) and then re-loads. `saveLocation` generates `id: crypto.randomUUID()` and `usageCount: 0` (`locationStore.ts:47-56`). `toggleFavorite` flips `isFavorite` and re-saves (`locationStore.ts:68-78`).
- `packages/desktop/src/store/settingsStore.ts` (29 lines) — `useSettingsStore`: `thumbnailCacheEnabled` (default `true`), `setThumbnailCacheEnabled` sets state THEN persists via `window.electronAPI.setCacheSetting`, swallowing persistence errors with `console.error`; `loadSettings` reads `getCacheSetting`.
- Test infra already exists: vitest 2 + happy-dom. `packages/desktop/src/__tests__/setup.ts` stubs `window.electronAPI` with `vi.stubGlobal('electronAPI', {...})` covering all IPC methods (mockResolvedValue defaults). The setup file is wired in `packages/desktop/vitest.config.ts`.
- Exemplar tests for conventions: `packages/desktop/src/components/__tests__/DropZone.test.tsx` (component) and `packages/desktop/src/utils.test.ts` (plain functions). Match their style: `describe`/`it`, vitest imports from `'vitest'`.
- Note: the `locationStore` calls `window.electronAPI.getGPXTracks()` — confirm the exact mock key in setup.ts (it appears as `getGpxTracks` there; case must match the preload API, check `packages/desktop/electron/preload.ts` for the real name before relying on the mock).

## Commands you will need

| Purpose | Command (from `packages/desktop`) | Expected on success |
|---|---|---|
| Tests | `npm run test` | all pass, exit 0 |
| Single file | `npx vitest run src/store/imageStore.test.ts` | all pass |
| Typecheck | `npm run typecheck` | exit 0 |

## Scope

**In scope** (create only):
- `packages/desktop/src/store/imageStore.test.ts`
- `packages/desktop/src/store/locationStore.test.ts`
- `packages/desktop/src/store/settingsStore.test.ts`
- `packages/desktop/src/__tests__/setup.ts` — ONLY if a needed electronAPI mock method is missing; add it matching the existing style.

**Out of scope**:
- Any change to the store implementations. If a test reveals a genuine bug, write the test documenting current behavior, note the bug in your report, and do not fix it here.
- Component tests, App.tsx tests.

## Git workflow

- Branch: `advisor/002-store-unit-tests`
- One commit per store file is fine; plain imperative messages (e.g. `Add unit tests for imageStore`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: imageStore tests

Create `packages/desktop/src/store/imageStore.test.ts`. Zustand stores are testable without React: call `useImageStore.getState().<action>(...)` and assert on `useImageStore.getState()`. Reset between tests with a `beforeEach` that calls `useImageStore.getState().clearImages()` (and re-set any other keys you mutate).

Cover at minimum:
- `addImages` appends; `setImages` replaces and clears selection.
- `selectImage` single-select semantics (selecting B after A leaves only B).
- `toggleImageSelection` add/remove; `selectAllImages` / `deselectAllImages`.
- `removeImages` removes from both `images` and `selectedImageIds`.
- `updatePendingChanges` merges (doesn't replace) prior pending changes.
- `updateMultiplePendingChanges` touches only listed paths.
- `discardImageChanges` / `discardAllChanges` set `pendingChanges` to `undefined`.
- `applyProfileDefaults`: applies make/model/lens; applies each `defaults` field including `iso: 0`-style falsy-but-defined numbers (the code checks `!== undefined` for numeric fields but truthiness for `filmStock`/`location` — pin that distinction); untouched paths unchanged.
- Selectors: `hasUnsavedChanges` false for `{}` pendingChanges, true otherwise; `getImagesWithChanges`; `getSelectedImages`.
- `setThumbnail` stores the data URL and clears the loading flag.

Minimal `ImageFile` fixtures: check `packages/desktop/src/types.ts` for the `ImageFile` interface and build a helper `makeImage(path: string): ImageFile`.

**Verify**: `npx vitest run src/store/imageStore.test.ts` → all pass.

### Step 2: locationStore tests

Create `locationStore.test.ts`. Use the global electronAPI mock; override per-test with `vi.mocked(window.electronAPI.getSavedLocations).mockResolvedValue([...])` (or re-stub). Cover:
- `loadSavedLocations` puts the IPC result into state.
- `saveLocation` calls `electronAPI.saveLocation` with generated `id`, `createdAt`, `usageCount: 0`, then reloads.
- `toggleFavorite` flips `isFavorite` on the matching location and is a no-op for unknown ids.
- `deleteSavedLocation`, `useLocation` (calls `incrementLocationUsage`), `addToHistory` (entry has `id`, `timestamp`, `source`), `clearHistory` (clears state AND calls IPC), `loadGPXTracks` / `deleteGPXTrack`.

Reset store state in `beforeEach` (`useLocationStore.setState({ savedLocations: [], locationHistory: [], gpxTracks: [] })`) and `vi.clearAllMocks()`.

**Verify**: `npx vitest run src/store/locationStore.test.ts` → all pass.

### Step 3: settingsStore tests

Create `settingsStore.test.ts`. Cover:
- default `thumbnailCacheEnabled === true`.
- `setThumbnailCacheEnabled(false)` updates state and calls `setCacheSetting(false)`.
- persistence failure: mock `setCacheSetting` to reject → state still updates, no unhandled rejection (the catch swallows it).
- `loadSettings` reads `getCacheSetting`; failure leaves prior state.

**Verify**: `npx vitest run src/store/settingsStore.test.ts` → all pass.

### Step 4: Full suite + typecheck

**Verify**: from `packages/desktop`: `npm run test` → exit 0; `npm run typecheck` → exit 0.

## Test plan

This plan IS the test plan. Expected outcome: ~25–35 new passing tests across three files; coverage for `src/store/` goes from 0% to substantially covered (spot-check with `npm run test:coverage` — `src/store` lines should exceed 80%).

## Done criteria

- [ ] Three new test files exist and pass
- [ ] `npm run test` (packages/desktop) exits 0
- [ ] `npm run typecheck` (packages/desktop) exits 0
- [ ] `npm run test:coverage` shows `src/store` line coverage ≥ 80%
- [ ] No source files modified except possibly `src/__tests__/setup.ts` (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- A store imports something that breaks under happy-dom (e.g. `crypto.randomUUID` missing — happy-dom should provide it; if not, report rather than polyfilling in source).
- A test exposes a real behavioral bug you'd otherwise be tempted to fix in the store — document and stop on the fix, not the test.
- The electronAPI mock names in setup.ts don't match what `locationStore` calls and fixing requires editing `preload.ts`.

## Maintenance notes

- These tests pin current semantics, including the single-select behavior of `selectImage` and the truthiness check on `filmStock`/`location` in `applyProfileDefaults`. If either is later deemed a bug, change the test deliberately with the fix.
- Plans 007/008 (main.ts split, bulk IPC) assume this suite is green before they start.
