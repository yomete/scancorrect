# Plan 013: Persist window bounds, theme, and last-used profile across sessions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/electron packages/desktop/src/ThemeContext.tsx packages/desktop/src/App.tsx`
> Plans 006/007 likely restructured `electron/` — read the live layout; if
> `electron/handlers/` and `electron/store.ts` exist, build there.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: 006 (ipc-types), ideally 007 (handlers layout)
- **Category**: direction
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

Every launch opens an 800×600 window at the OS default position, and the user's theme choice and selected camera profile reset. For a tool used roll-after-roll, re-selecting the same profile every session is the most-felt friction in the app. All the storage machinery (electron-store) is already wired; `packages/shared/src/types.ts` even sketches the intended shape (`AppConfig` with `theme`, `lastUsedProfile`, `windowBounds`) — it was designed and never built.

## Current state

- Window creation — `packages/desktop/electron/main.ts:500-517` (at 217c979): hardcoded `width: 800, height: 600, minWidth: 600, minHeight: 400`, no position restore, no save on close.
- electron-store — lazy `getStore()` in main.ts (after plan 007: `electron/store.ts`); keys in use include `profiles`, `processingLog`, `savedLocations`, `thumbnailCacheEnabled`, `mapboxAccessToken`. Settings handlers exemplar: `get-cache-setting` / `set-cache-setting` (`main.ts:855-862` at 217c979) — a plain `getStore().get(key, default)` / `.set(key, value)` pair. Match that pattern.
- Theme — `packages/desktop/src/ThemeContext.tsx` (78 lines): React context; read it to find the current source of truth (likely `localStorage` or in-memory). If it already persists via localStorage, theme persistence may already work — verify by running the app or reading the file; in that case drop the theme part of this plan and note it.
- Profile selection — `packages/desktop/src/App.tsx`: `selectedProfile` React state (`useState`), profile list loaded via `getProfiles()`. The drop flow reads `profiles.find(p => p.id === selectedProfile)` (`App.tsx:287`).
- Shared sketch — `packages/shared/src/types.ts`: `AppConfig { theme, lastUsedProfile?, windowBounds? }` (unused today).
- Mock surface: `packages/desktop/src/__tests__/setup.ts` — add mocks for any new electronAPI methods.

## Design (decided)

1. **Window bounds (main process only, no IPC)**: on `createWindow`, read `windowBounds` from the store and pass into `new BrowserWindow` (validate: width/height clamped to ≥ min sizes; if `x/y` are off all current displays — check with `screen.getAllDisplays()` — drop position and let the OS place it). Save on the window's `close` event via `mainWindow.getNormalBounds()` (not `getBounds()` — avoids persisting maximized geometry; optionally also store `isMaximized` and re-maximize on start).
2. **Last-used profile (IPC)**: two handlers `get-last-used-profile` / `set-last-used-profile` (string id or null), preload methods, and in App.tsx: on mount after profiles load, if the stored id exists in the list, select it; whenever `selectedProfile` changes to a non-null value, fire-and-forget `setLastUsedProfile(id)`.
3. **Theme**: only if ThemeContext does NOT already persist — mirror the same get/set-handler pattern with key `theme`.

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` + `npx tsc -p electron --noEmit` | exit 0 |
| Tests | `npm run test` | pass |
| E2E | `npm run test:e2e` | pass |
| Manual | `npm run dev` (or `electron:dev`), resize/move, quit, relaunch | bounds restored |

## Scope

**In scope**:
- `electron/` window-creation code + store accessor (live locations per drift check), new handlers (in `electron/handlers/misc.ts` or main.ts), `electron/ipc-types.ts`, `electron/preload.ts`
- `src/App.tsx` (profile restore wiring), `src/ThemeContext.tsx` (only if needed per Design 3)
- `src/__tests__/setup.ts` (mocks), new unit tests
- `packages/shared/src/types.ts` — optionally delete the unused `AppConfig` sketch once superseded (or leave; note your choice)

**Out of scope**:
- Multi-window support, a settings UI panel, persisting grid/sidebar layout, migrating other localStorage state.

## Git workflow

- Branch: `advisor/013-window-state-persistence`
- Commits: (1) window bounds, (2) last-used profile, (3) theme if applicable.

## Steps

### Step 1: Window bounds persistence

Implement Design 1. Keep the Linux icon spread and `webPreferences` exactly as-is; only `width/height/x/y` become dynamic.

**Verify**: `npx tsc -p electron --noEmit` exit 0; `npm run test:e2e` passes (e2e launches the app — confirms no startup regression); manual resize→quit→relaunch restores, and a stored off-screen position (hand-edit the store JSON in `userData` to e.g. `x: 99999`) falls back to default placement.

### Step 2: Last-used profile

Implement Design 2. Unit-test the handler pair (model on plan 007's handler tests if they exist; otherwise on `electron/__tests__/exif.test.ts` with the electron-store mock). In App.tsx, restore only when the id still exists in the loaded profiles (deleted profiles must not resurrect).

**Verify**: `npm run test` pass; manual: select profile → quit → relaunch → same profile selected; delete that profile → relaunch → no selection, no error.

### Step 3: Theme (conditional)

Per Design 3 after reading ThemeContext.tsx.

**Verify**: theme survives relaunch (manual), `npm run test` pass.

## Test plan

- Unit: handler get/set round-trip for `lastUsedProfile` (+ `theme` if built); bounds-validation helper (clamping + off-screen fallback) as a pure exported function with its own test.
- E2E: existing suite must stay green; optionally extend `e2e/app.test.ts` with a relaunch-restores-profile case if the harness supports relaunch (check how the e2e launches Electron first — if not trivially, skip and rely on manual verification, noting it).

## Done criteria

- [ ] Bounds restore + off-screen fallback verified manually
- [ ] Last-used profile restores (and tolerates deletion)
- [ ] Theme persists (or report shows it already did)
- [ ] All suites pass; root typecheck exit 0
- [ ] `plans/README.md` updated

## STOP conditions

- ThemeContext does something unexpected (e.g. system-theme tracking that persistence would break) — report before changing it.
- e2e harness breaks because tests assume the fixed 800×600 default — if found, make the e2e launch use a fresh `userData` dir instead of weakening the feature; if that's not achievable in one attempt, report.

## Maintenance notes

- If multi-display setups misbehave, the validation helper is the place to tune.
- A future settings panel should surface "reset window/layout".
