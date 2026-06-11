# Plan 014: Auto-update via electron-updater + GitHub Releases

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`. NOTE: full end-to-end update
> verification requires publishing real releases — the final step defines
> exactly what the operator must check manually.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/package.json packages/desktop/electron .github/workflows/release.yml`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (touches the release pipeline; failure mode is users stuck or broken installs)
- **Depends on**: 004 (electron-builder current), 007 (handlers layout — soft), NOT on 009
- **Category**: direction
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

ScanCorrect ships signed + notarized macOS builds and Windows/Linux installers via GitHub Releases (workflows already exist; v0.3.x cadence shows active patching — v0.3.2 fixed broken image previews). But users only get fixes if they revisit the website. `electron-updater` works with the existing electron-builder + GitHub Releases setup with modest config: this is the highest-leverage distribution improvement available, and 90% of its prerequisites (signing, notarization, release publishing) are already done.

## Current state

- `packages/desktop/package.json` `build` block: appId `com.scancorrect.app`, mac dmg+zip with `hardenedRuntime`, entitlements, `notarize: true`; win nsis+portable; linux AppImage+deb; output `../../release`. **No `publish` config** — electron-updater requires `build.publish` to locate the feed.
- `.github/workflows/release.yml` — read it first; per commit history it publishes release assets directly on tagged releases (commit `ee0f38c`). electron-updater additionally needs the update metadata files (`latest-mac.yml`, `latest.yml`, `latest-linux.yml`, and `.blockmap` files) uploaded alongside the installers — `electron-builder --publish` generates and uploads these; manual asset upload paths often miss them. Determine which mechanism the workflow uses.
- Main process: no updater code anywhere (`grep -rn autoUpdater packages/desktop` → nothing). App lifecycle lives in `electron/main.ts` (post-007: thin main.ts).
- The repo this publishes to: check `git remote -v` and any `repository` field; electron-updater's GitHub provider needs `owner`/`repo` in `build.publish`.
- Renderer feedback surface: `src/components/Footer.tsx` exists; processing log / footer area is the natural place for an unobtrusive update notice. IPC mock surface: `src/__tests__/setup.ts`.
- mac specifics: zip target is REQUIRED for mac auto-update (already present alongside dmg — good). Updates must be signed with the same identity (already CI-signed).
- Linux: electron-updater supports AppImage only (not deb) — deb users won't auto-update; that's acceptable, surface "update available" with a link instead.

## Design (decided)

- `electron-updater` as a production dependency of desktop.
- On app ready (production only, and only when `process.env.PORTABLE_EXECUTABLE_DIR` is unset — NSIS portable builds can't update): `autoUpdater.checkForUpdates()` on launch and every 4 hours.
- **Download yes, install on quit**: `autoUpdater.autoDownload = true`, on `update-downloaded` notify the renderer (`update-ready` event with version) and call `autoUpdater.quitAndInstall()` only when the user clicks "Restart to update" in the UI; otherwise it installs on natural quit (`autoInstallOnAppQuit = true`).
- Renderer: minimal — a small pill/button in `Footer.tsx`: "v0.4.0 ready — Restart to update", wired via preload (`onUpdateReady(cb)`, `installUpdateNow()`). No modal, no nagging.
- Errors and "no update": log only (`console`), never user-facing.

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Typecheck/compile | `npm run typecheck`; `npx tsc -p electron --noEmit` | exit 0 |
| Tests | `npm run test` | pass |
| Pack | `npm run pack` | exit 0 |
| Smoke | `npm run test:smoke` | pass |

## Scope

**In scope**:
- `packages/desktop/package.json` (dep + `build.publish`)
- `electron/updater.ts` (new), wiring in `electron/main.ts`, `electron/preload.ts`, `electron/ipc-types.ts`
- `src/components/Footer.tsx` (or the component the operator's UI conventions favor — keep it minimal), `src/__tests__/setup.ts`
- `.github/workflows/release.yml` ONLY if it uploads assets manually and must switch to `electron-builder --publish always` (or add the yml/blockmap files to the upload list)

**Out of scope**:
- Differential updates tuning, staged rollouts, an update-settings UI, Windows code signing acquisition (if builds are unsigned on Windows, auto-update still works but SmartScreen warns — note, don't solve).

## Git workflow

- Branch: `advisor/014-auto-update`
- Commits: (1) updater module + config, (2) renderer UI, (3) release workflow change if needed.

## Steps

### Step 1: Config + updater module

Add `electron-updater` (latest) to desktop `dependencies`. Add to the `build` block: `"publish": { "provider": "github", "owner": "<from git remote>", "repo": "<from git remote>" }`. Create `electron/updater.ts` implementing the Design (export `initAutoUpdater(getMainWindow)`; guard: `if (isDev() || process.env.PORTABLE_EXECUTABLE_DIR) return`). Call from main.ts after window creation.

**Verify**: `npx tsc -p electron --noEmit` exit 0; `npm run pack && npm run test:smoke` pass (updater must no-op gracefully in the unpublished packed app — the smoke test catches a hard crash on startup).

### Step 2: Renderer notice

Preload: `onUpdateReady(callback)` (ipcRenderer.on wrapper) + `installUpdateNow()` (invoke). Footer pill per Design. Add setup.ts mocks. Match existing component style (Tailwind classes, see Footer.tsx itself).

**Verify**: `npm run test` pass; `npm run typecheck` exit 0.

### Step 3: Release workflow metadata

Read `.github/workflows/release.yml`. If it runs electron-builder without `--publish` and uploads assets itself: either switch to `electron-builder --publish always` with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`, or extend the upload globs to include `release/latest*.yml` and `release/*.blockmap`. Choose whichever is the smaller diff for this workflow.

**Verify**: YAML parses; the chosen glob/flag provably covers the yml files (`npm run pack` locally won't generate publish metadata without `--publish`; run `npx electron-builder --dir --publish never` and inspect — if metadata generation can't be confirmed locally, state so in the report and rely on the operator's staged release in Step 4).

### Step 4: Operator verification protocol (document, don't execute)

Append to your report (and to the PR description): cut `v0.X.Y-test` prerelease, install it locally, then cut `v0.X.(Y+1)-test`; the installed app should detect, download, and on restart be the new version — on macOS (dmg-installed app) and Windows (nsis). Linux AppImage if available. Only after this passes should the change be in a real release.

## Test plan

- Unit: `electron/__tests__/updater.test.ts` — `initAutoUpdater` no-ops in dev/portable; `update-downloaded` event forwards `update-ready` to the window (fake autoUpdater via `vi.mock('electron-updater')`); `installUpdateNow` handler calls `quitAndInstall`.
- Smoke test green is the "doesn't crash unsigned/unpublished" gate.
- True end-to-end is the Step 4 operator protocol.

## Done criteria

- [ ] `build.publish` present; `electron-updater` in dependencies
- [ ] Unit tests for the updater module pass; full desktop suite green
- [ ] `npm run pack && npm run test:smoke` pass
- [ ] release.yml provably ships `latest*.yml` + blockmaps (or report explains the `--publish` switch)
- [ ] Step 4 protocol written into the PR/report
- [ ] `plans/README.md` updated

## STOP conditions

- `release.yml` structure doesn't match either expected shape (no electron-builder invocation found) — report its actual mechanism.
- electron-updater requires an electron-builder version newer than installed and plan 004 hasn't landed — do 004 first.
- The smoke test fails with updater enabled in any guard configuration — never ship a startup crash; report.
- Anything pushes you toward auto-`quitAndInstall` without user action — that's explicitly against the chosen UX.

## Maintenance notes

- Every future release MUST be published with the metadata files or updates silently stop; consider a release-workflow assertion (fail if `latest*.yml` missing) as follow-up.
- When plan 009 (Electron upgrade) lands, re-run the Step 4 protocol — updater + new Electron is the riskiest combo.
- deb-package users never auto-update; if Linux adoption matters, revisit.
