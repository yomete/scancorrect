# Plan 010: Refresh stale project docs (CLAUDE.md, AGENTS.md, IMPLEMENTATION_PLAN.md)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- CLAUDE.md AGENTS.md IMPLEMENTATION_PLAN.md README.md`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but if plans 005/007 landed, reflect their outcomes)
- **Category**: docs
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

`CLAUDE.md` and `AGENTS.md` (near-identical content) describe a flat single-package layout (`film-exif-editor/electron/`, `film-exif-editor/src/`) that predates the monorepo — the code actually lives in `packages/desktop`, `packages/website`, `packages/shared`. They also include long obsolete "Setup Instructions" with inline config file contents, and a "Future Enhancements" checklist where several items already shipped. Since CLAUDE.md is injected into every AI coding session on this repo, its inaccuracies actively mislead agents (and humans) every day. `IMPLEMENTATION_PLAN.md` similarly lists shipped features as unbuilt.

## Current state

- `CLAUDE.md` (repo root) and `AGENTS.md` — same ~7.3 KB content. Stale sections: "File Structure" (flat layout), "Setup Instructions" (mkdir/npm init walkthrough with embedded vite.config/tsconfig/index.html contents), "Future Enhancements" (claims unbuilt: "Add more EXIF fields (ISO, focal length, aperture)" — shipped, see `packages/desktop/src/constants/metadata.ts` and profile defaults in `packages/desktop/src/store/imageStore.ts:159-167`; "Image preview functionality" — shipped v0.3.2, see commit `6e32209`; "Undo functionality" — backup/restore exists via `restore-backup` handler).
- Accurate facts to carry into the rewrite (verified at 217c979):
  - Monorepo: npm workspaces, `packages/{desktop,website,shared}`; Node ≥20, npm ≥10.
  - Desktop: Electron 31 + React 18 + Vite + TS; zustand stores in `src/store/`; main process in `electron/` (main.ts, exif.ts, gpx.ts, geocoding.ts, mapbox.ts, scanner-detection.ts, preload.ts); exiftool-vendored bundled; electron-store for persistence; backups under `userData/backups`.
  - Test commands (from `packages/desktop`): `npm run test` (vitest unit), `test:integration` (real exiftool), `test:e2e` (Playwright), `test:smoke` (packaged app), `typecheck`.
  - Website: Next.js 16 / React 19 / Tailwind 4, `npm run dev:website` (port 3001).
  - Features shipped: drag-drop batch loading, camera profiles with defaults (iso/aperture/shutter/focal/exposureComp/filmStock/location), EXIF read/write with backups + restore, scanner-metadata detection, geocoding (Nominatim), saved locations + history, GPX import + photo matching, Mapbox token setting, thumbnails with disk cache, processing log, custom value lists, dark/light theme, macOS signed+notarized releases via GitHub Actions.
- `IMPLEMENTATION_PLAN.md` — phased build plan, largely executed; check off / annotate rather than rewrite history.
- `README.md` — reportedly current; verify quickly, fix only factual errors.
- Other root docs (`BUNDLING-EXIFTOOL.md`, `DEPLOYMENT.md`, `GITHUB-ACTIONS-FIXES.md`, `QUICK-START-DEPLOYMENT.md`) — out of scope except for one task: add a one-line pointer index in README if absent.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Verify claimed paths exist | `ls packages/desktop/electron packages/desktop/src/store` | files match doc claims |
| Verify commands | run each documented command once | works as documented |

## Scope

**In scope**: `CLAUDE.md`, `AGENTS.md`, `IMPLEMENTATION_PLAN.md`, `README.md` (factual fixes only).

**Out of scope**: any code; the four deployment/bundling docs; deleting files. Do NOT invent features or roadmap items — only document what you verify in the code.

## Git workflow

- Branch: `advisor/010-docs-refresh`
- One commit: `Update CLAUDE.md/AGENTS.md/IMPLEMENTATION_PLAN.md to match the monorepo reality`.

## Steps

### Step 1: Rewrite CLAUDE.md

Structure: Project overview (2 sentences) → Monorepo layout (real tree, 3 packages, key files one line each) → How to run/build/test (real commands per package, the table above) → Architecture notes (IPC boundary: preload `contextBridge` → `window.electronAPI`; exiftool-vendored lifecycle; electron-store; backups dir) → Conventions (TypeScript strict, no-semicolon style in `electron/`, vitest + Playwright layers, where mocks live) → Current feature list (from Current state) → Known gaps/roadmap (point at `plans/README.md` instead of duplicating). Keep it under ~150 lines; CLAUDE.md is loaded into every session — concision is a feature. Every path and command you write must be one you verified.

**Verify**: every file path mentioned exists (`ls` each); every command listed runs.

### Step 2: AGENTS.md

Make it the same content as CLAUDE.md (or a one-line file that says "See CLAUDE.md" plus agent-specific notes if any exist). Don't maintain two divergent copies.

**Verify**: `diff CLAUDE.md AGENTS.md` → identical, or AGENTS.md is the pointer stub.

### Step 3: IMPLEMENTATION_PLAN.md

Add a dated header: "Status as of 2026-06-11: phases below largely shipped (v0.3.2)." Check off completed items where the checklist format allows; move genuinely-unbuilt items into a short "Remaining" list at top. Do not delete historical content.

**Verify**: no `[ ]` item remains that the code shows as shipped (spot-check the three named in Current state).

### Step 4: README sweep

Read README.md; fix only factual drift (paths, commands, version claims).

## Test plan

Docs-only; the verification gates above are the test.

## Done criteria

- [ ] CLAUDE.md contains the `packages/` layout and zero references to a root-level `electron/` or `src/` dir
- [ ] All documented commands verified runnable
- [ ] AGENTS.md is identical or a pointer
- [ ] IMPLEMENTATION_PLAN.md has the status header and no falsely-open checkboxes for the three named features
- [ ] Only the four named files modified (`git status`)
- [ ] `plans/README.md` updated

## STOP conditions

- A documented command fails when you run it (e.g. `test:smoke` needs a packed app) — document its real precondition rather than dropping it; if a core command (`npm run test`) fails, STOP and report.
- You're tempted to document behavior you couldn't verify in code.

## Maintenance notes

- Future feature plans (013–016) should update CLAUDE.md's feature list when they land.
- Reviewer: check no invented facts; this doc is trusted context for every future agent session.
