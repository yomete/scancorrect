# Plan 009: Upgrade Electron 31 → current stable (and electron-store 8 → 10+)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/package.json packages/desktop/electron package.json`
> Expect drift from plans 004/006/007 — that's fine and assumed. Check the
> installed electron version first: if already ≥ 40, reassess whether this
> plan is needed at all.

## Status

- **Priority**: P3 (do LAST among the dependency plans — biggest blast radius)
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: 001, 004, 007 (the full test pyramid must be green first; 007's modular handlers make breakage localizable)
- **Category**: migration
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

Desktop pins `electron: ^31.0.2` (mid-2024); current stable is in the 40s. Eleven majors of Chromium/Node security patches are missing, and `npm audit` flags advisories against electron 31 itself (header injection, window.open scoping, commandLineSwitches). The longer this waits the more majors pile up. Bundled with it: `electron-store: ^8.2.0` is two majors behind; v9+ is pure ESM, which interacts with the CommonJS `electron/tsconfig.json` build — they should be migrated together since both touch the main-process module format.

## Current state

- `packages/desktop/package.json`: `electron: ^31.0.2` (devDep, also pinned in root devDeps — `package.json` root has `electron: ^31.0.2` too; keep them in sync), `electron-builder: ^24.13.3` (may already be ^26 if plan 004 landed), `electron-store: ^8.2.0` (production dep), `"electronVersion": "31.0.2"` hardcoded inside the `build` config block — must be updated or removed (electron-builder auto-detects).
- `electron/tsconfig.json`: `module: commonjs`. main.ts uses `import type Store from 'electron-store'` with a lazy `getStore()` (dynamic `require` or import — read the live code; at 217c979 the store is created lazily inside `getStore()`).
- Known breaking changes on the 31→4x path that this codebase actually hits:
  - **`File.path` removal (E32)**: already handled — preload uses `webUtils.getPathForFile` (`preload.ts:210`).
  - **`nativeImage.createThumbnailFromPath`**: still present, but verify behavior on each OS via the thumbnail tests/e2e.
  - **utilityProcess/ESM main support**: not used; CommonJS main remains supported — no forced ESM migration for Electron itself.
  - Each major's notes: https://www.electronjs.org/docs/latest/breaking-changes — read every section for majors 32–<target> that mentions APIs found in `electron/` (grep list below).
- API surface actually used (from `grep -n "from 'electron'" electron/*.ts`): `app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage` (main.ts), `contextBridge, ipcRenderer, webUtils` (preload.ts). Small, stable surface — the risk is mostly in build/packaging and Chromium behavior, not API removals.
- Full verification pyramid exists: unit (`npm run test`), integration with real exiftool (`test:integration`), e2e (`test:e2e`, 3 OSes in CI), packaged smoke (`pack` + `test:smoke`), plus `.github/workflows/build.yml`/`release.yml`.

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Install (root) | `npm install` | exit 0 |
| All local suites | `npm run test:all` | pass |
| Pack + smoke | `npm run pack && npm run test:smoke` | pass |
| Current electron version | `npx electron --version` | the bumped version |

## Scope

**In scope**:
- `packages/desktop/package.json` (electron, electron-store, electron-builder if needed, `build.electronVersion`)
- root `package.json` (electron devDep sync)
- `package-lock.json`
- `packages/desktop/electron/**` — only changes forced by breaking-change notes or by electron-store's ESM API
- `packages/desktop/electron/tsconfig.json` — only if electron-store ESM requires module-format changes

**Out of scope**:
- React/renderer dependency bumps (React 19 etc. — separate decision, not planned)
- Feature changes of any kind; `exiftool-vendored` bump

## Git workflow

- Branch: `advisor/009-electron-upgrade`
- One commit per electron major step that required code changes; squash trivial no-change steps. CI must be green per commit if pushed.

## Steps

### Step 1: Baseline

Confirm everything is green BEFORE touching versions: `npm run test:all` and `npm run pack && npm run test:smoke`.

**Verify**: all pass. If not, STOP — fix the baseline first (separate work).

### Step 2: Read the breaking-changes notes

For each major from 33 to the chosen target (latest stable at execution time), list items that intersect the API surface above or the packaging config. Write the list into your report.

**Verify**: the list exists; nothing on it is an unknown.

### Step 3: Bump Electron in stages

Stage A: bump to the highest major with zero items on your list (likely several majors at once). Stage B+: one major at a time for majors with list items, applying required code changes. At each stage: update both package.json electron entries + `build.electronVersion`, `npm install`, then run unit + e2e.

**Verify** (each stage): `npm run test && npm run test:e2e` pass.

### Step 4: Packaged verification

**Verify**: `npm run pack && npm run test:smoke` pass. On macOS also open `release/mac*/ScanCorrect.app` manually if possible: drop an image, see preview, write metadata, restore backup.

### Step 5: electron-store 8 → 10/11

Bump `electron-store` to latest. It's ESM-only: with `module: commonjs` the require will fail at runtime. Options in order of preference: (a) dynamic `import('electron-store')` inside the existing lazy `getStore()` (minimal change — the accessor is already async-friendly if 007 landed; make `getStore` async and update its callers, which after 007 are localized in `electron/store.ts`); (b) full ESM main process (set `"type": "module"` semantics for dist-electron — larger change, avoid unless (a) fails). Also read electron-store v9/v10 changelogs for renamed options (e.g. constructor defaults) — the app uses plain `get/set` with defaults, low exposure.

**Verify**: `npm run test` pass (the `__mocks__/electron-store.ts` mock may need its export shape updated to match v10 — keep it matching the real module); e2e pass; smoke pass; manually confirm profiles persist across two app launches if running locally (`npm run electron:dev` twice).

### Step 6: Full gate + audit

**Verify**: `npm run test:all` pass; `npm run pack && npm run test:smoke` pass; `npm audit` no longer lists electron advisories; `npm run typecheck` (root) exit 0.

## Test plan

No new tests; this plan leans on the existing pyramid. One addition if Step 5 chose dynamic import: a unit test asserting `getStore()` memoizes (single instance across calls) — place in `electron/__tests__/`.

## Done criteria

- [ ] `npx electron --version` = chosen target (latest stable at execution)
- [ ] `electron-store` ≥ 10 installed and profiles persist (smoke/e2e green)
- [ ] `npm audit`: zero electron advisories
- [ ] `npm run test:all` and packaged smoke pass
- [ ] `build.electronVersion` matches or is removed
- [ ] `plans/README.md` updated

## STOP conditions

- Baseline (Step 1) isn't green.
- Any single major bump breaks the packaged smoke test and the breaking-changes notes don't explain it after one investigation pass — report the failing major and symptom; partial upgrades (stopping at the last green major) are an acceptable reported outcome.
- electron-builder cannot package the new Electron (signing/notarization config errors) — the release pipeline is the crown jewel here; do not improvise around signing.
- electron-store migration requires converting the whole main process to ESM (option b) — that's a scope expansion; report first.

## Maintenance notes

- Adopt a cadence: bump one Electron major per month-ish so this never becomes an 11-major cliff again. Consider Renovate/Dependabot config as a follow-up.
- First tagged release after this lands needs a human watching `release.yml` (signing + notarization) and a manual install test of the produced DMG.
