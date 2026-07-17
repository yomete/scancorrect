# Implementation Plans

First batch (001–016) generated 2026-06-11 against commit `217c979` — all DONE.
Second batch (017–022) generated 2026-07-17 against commit `2d58d27` from a
production/release-readiness audit. Execute in the order below unless
dependencies say otherwise. Each executor: read the plan fully before starting,
honor its STOP conditions, and update your row when done.

## Current batch (2026-07-17): execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 017 | Fix release pipeline: emit update manifests, test gate, tag/version check, guarded install | P1 | S | — | DONE — implemented in working tree (PBJ, 2026-07-17), not yet committed |
| 018 | Save/backup data-loss fixes (clear pendingChanges, no backup clobber, honest restore, per-file batch errors) | P1 | S | — | DONE — implemented in working tree (PBJ, 2026-07-17), not yet committed |
| 019 | Fix unsaved-changes close guard (sync preventDefault) | P1 | S | 018 (soft — accurate dirty state) | DONE — in working tree (PBJ, 2026-07-17); judge added quit-intent fix (guard was aborting macOS app quits; exiftool.end moved before-quit→will-quit); manual dialog matrix pending operator |
| 020 | GPX timezone correctness (camera UTC-offset in matching) | P2 | M | — | DONE — in working tree (PBJ, 2026-07-17), not yet committed |
| 021 | Universal macOS builds + prune node_modules from package | P2 | M | 017 | DONE — in working tree (PBJ, 2026-07-17); lipo-verified universal, pruned asar, packaged smoke green |
| 022 | Release-hygiene sweep (privacy page, changelog, CLAUDE.md, audit fix, coverage ratchet) | P3 | S–M | — (run last; touches package-lock) | DONE — in working tree (PBJ, 2026-07-17); audit 13→6 advisories (rest need vitest4/vite8 majors) |

### Dependency notes (current batch)

- **017 first**: it makes the next tagged release the end-to-end validation
  for auto-update; 021 changes what that release contains, so 017's manifest
  assertion must already be in place.
- **018 before 019** (soft): 019's dialog is only as truthful as the dirty
  state 018 fixes; they touch different files and can run in parallel
  worktrees if needed.
- **022 last**: its `npm audit fix` touches `package-lock.json` and its
  coverage ratchet should measure AFTER 018/020 add tests.

### Findings audited 2026-07-17 but deliberately NOT planned

- **Windows Authenticode signing absent** (updater signature check is a no-op
  on Windows): requires purchasing/managing a cert — an operator decision,
  not an executable plan. Revisit when Windows distribution matters.
- **Electron fuses + CSP hardening** (no RunAsNode fuse-off, no asar
  integrity, no CSP): real defense-in-depth gaps, local-attacker/future-
  injection threat model, deferred — bundle into a future hardening plan.
- **Thumbnail eviction tests test a copy of the logic, not the real
  functions; electron-store 8→11 has no real-persistence test**: known
  coverage debt; fold into the next test-focused plan.
- **Sequential batch save + unvirtualized image grid** (perf): investigate
  with a few-hundred-image profile before investing; no measured user pain
  yet.
- **Dead Zustand `imageStore`** (app runs on App.tsx useState; store+tests
  cover code that doesn't ship): architecture decision needed — adopt the
  store or delete it. Plan 018 fixes the live code path regardless.
- **vitest 4 / vite 8 major upgrades** (clears the remaining audit
  advisories, all dev-only): separate migration when convenient.
- **electron-reload alpha pin, ESLint 9 vs 10 split across workspaces**:
  cosmetic dependency hygiene, batch with the next dep sweep.

## First batch (2026-06-11): execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | CI covers all workspaces (typecheck/lint/build) | P1 | S | — | DONE - merged to main |
| 002 | Unit tests for the three Zustand stores | P1 | S | — | DONE - merged to main |
| 003 | Harden will-navigate / shell.openExternal | P1 | S | — | DONE - merged to main |
| 004 | Clear npm audit vulns in the build toolchain | P1 | S–M | 001 | DONE - merged to main |
| 005 | Remove stale yarn packageManager field | P2 | S | — | DONE - merged to main |
| 006 | Single source of truth for IPC contract types | P1 | S–M | — | DONE - merged to main |
| 007 | Split main.ts into testable handler modules + tests | P2 | L | 002, 003, 006 | DONE - merged to main |
| 008 | Bulk IPC for EXIF reads + binary bounded thumbnail cache | P2 | M | 006, 007 | DONE - merged to main |
| 012 | ESLint for desktop + CI coverage floor | P2 | S–M | 001 (002 helpful) | DONE - merged to main |
| 013 | Persist window bounds / theme / last-used profile | P2 | S–M | 006 (007 helpful) | DONE - merged to main |
| 014 | Auto-update via electron-updater + GitHub Releases | P2 | M | 004 (007 helpful) | DONE - merged to main |
| 009 | Electron 31→current + electron-store 8→10 upgrade | P3 | L | 001, 004, 007 | DONE - merged to main |
| 010 | Refresh stale docs (CLAUDE.md/AGENTS.md/IMPLEMENTATION_PLAN.md) | P3 | S | — | DONE - merged to main |
| 011 | Remove dead code (main-simple.tsx, shared/dist, coverage) | P3 | S | — | DONE - merged to main |
| 015 | Geocoding resilience (queue, cache, rate-limit UX) | P3 | M | — | DONE - merged to main |
| 016 | SPIKE: RAW/DNG format support feasibility | P3 | M | — | DONE - merged to main |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

### Dependency notes (first batch)

- **001 first**: it is the verification gate every other plan's CI checks rely on.
- **002, 003, 006 before 007**: 007 (the main.ts split) needs the store-test baseline, the hardened navigation code in place (so it moves once), and the consolidated IPC types to build on.
- **007 before 008**: bulk-IPC endpoints are built into 007's `electron/handlers/` layout. 008 contains a fallback path if 007 is skipped.
- **004 before 014**: electron-updater wants a current electron-builder; 004 also de-risks the release pipeline 014 modifies.
- **009 last among dependency work**: biggest blast radius; requires the full test pyramid green and benefits from 007's modular handlers to localize breakage. 014 deliberately does NOT wait for 009, but re-verify auto-update after 009 lands (see 014's maintenance notes).
- 005, 010, 011, 015, 016 are independent and can run anytime.
- Plans 013–016 are direction/feature work; everything else is remediation.

### Findings considered and rejected (first audit, 2026-06-11)

(Recorded so they aren't re-audited. All honored and re-verified intact in the 2026-07-17 audit.)

- **Missing `crypto` import in `electron/gpx.ts:133`**: false positive — `crypto` is a global in Node 20 / Electron 31's main process.
- **DevTools exposure in dev mode**: correctly gated behind `isDev()` + `NODE_ENV`; not an issue.
- **Plaintext Mapbox token in electron-store**: electron-store's `encryptionKey` is obfuscation, not security (key ships with the app); OS-keychain integration isn't worth the dependency for a user-supplied token. Not worth doing.
- **XXE in fast-xml-parser GPX parsing**: fast-xml-parser v5 does not process external entities; no action.
- **IPC path validation as a standalone critical finding**: renderer is first-party with `contextIsolation: true` / `nodeIntegration: false`; folded into plan 007 as a small `assertAbsolutePath` defense-in-depth guard.
- **React memoization sweep (useCallback/React.memo across App.tsx)**: no measured render problem; plan 008 addresses the actual perf hotspot (IPC fan-out). Revisit only with profiler evidence.
- **Repointing `packages/shared` exports at `dist/`**: src-exports is a valid pattern for an internal workspace package; committed dist is removed instead (plan 011).
- **Pre-commit hooks (husky/lint-staged)**: team-preference tooling; CI enforcement (001, 012) covers the safety need. Add later if wanted.
- **Website component tests**: marketing site, low business risk; the CI build gate (001) catches the realistic failure mode (broken build).
- **Spotlight write race / per-file write locking**: writes are user-initiated and serialized through UI flow; no evidence of real-world corruption. Revisit if diagnostics logs (`metadata.write` log) ever show interleaved writes.
- **`window.__hasUnsavedChanges` fragility**: hot-reload-only concern; production builds don't reload the renderer.
- **React 18 (desktop) vs 19 (website) alignment**: packages don't share React components today; bump desktop React opportunistically, not as planned work.
