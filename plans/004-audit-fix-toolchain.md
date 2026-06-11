# Plan 004: Clear npm audit vulnerabilities in the build toolchain

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- package.json package-lock.json packages/desktop/package.json`
> Then re-run `npm audit` — if it already reports 0 vulnerabilities, mark this
> plan DONE-by-drift in `plans/README.md` and stop.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: MED (electron-builder major bump touches the release pipeline)
- **Depends on**: 001 (CI as the verification gate)
- **Category**: security / deps
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

`npm audit` at the planning commit reports **17 vulnerabilities (6 moderate, 7 high, 4 critical)**. The critical/high items are transitive dev/build dependencies — `tar` (symlink/hardlink path traversal, multiple CVEs), `shell-quote` (escape bypass), `tmp` (path traversal) — pulled in via `electron-builder@^24` and the test toolchain (`happy-dom@^15` has a VM-escape advisory). These don't ship in the app binary, but they run during release builds and CI, and a dirty audit masks future real findings. Note: advisories against `electron` itself are intentionally NOT addressed here — the Electron major upgrade is plan 009.

## Current state

- Root: npm workspaces; lockfile is `package-lock.json` at repo root.
- `packages/desktop/package.json` devDependencies (relevant): `electron-builder: ^24.13.3`, `happy-dom: ^15.0.0`, `electron: ^31.0.2` (do not touch electron here).
- Root `package.json` has an `overrides` block already (pins `postcss`) — that's the existing mechanism for forcing transitive versions if `npm audit fix` can't.
- Release pipeline that depends on electron-builder: `packages/desktop` scripts `dist`/`pack`, `.github/workflows/build.yml` and `release.yml`, plus the `build` config block in `packages/desktop/package.json` (electron-builder config: asarUnpack for exiftool, mac signing/notarization, nsis, AppImage/deb).
- Packaged smoke test exists: `npm run test:smoke` in `packages/desktop` (`playwright.smoke.config.ts`, `e2e/smoke/packaged.test.ts`) — this is the verification that packaging still works after an electron-builder bump. It requires a packed app (`npm run pack` first).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Audit | `npm audit` (repo root) | target: 0 vulnerabilities, or only electron-core advisories left |
| Safe fixes | `npm audit fix` (repo root) | exit 0, lockfile updated |
| Typecheck | `npm run typecheck` (root) | exit 0 |
| Desktop tests | `npm run test` (packages/desktop) | pass |
| Pack app | `npm run pack` (packages/desktop) | exit 0, app in `release/` |
| Smoke test | `npm run test:smoke` (packages/desktop) | pass |

## Scope

**In scope**:
- `package.json` (root — `overrides` only), `package-lock.json`
- `packages/desktop/package.json` (devDependency version ranges: `electron-builder`, `happy-dom`)

**Out of scope**:
- `electron` version (plan 009), `electron-store` version (plan 009), any production dependency of the desktop app (`exiftool-vendored`, `fast-xml-parser`), all source code, all workflow files.

## Git workflow

- Branch: `advisor/004-audit-fix-toolchain`
- Commit per logical step (`npm audit fix` bumps; electron-builder bump separate).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Apply non-breaking fixes

From repo root: `npm audit fix` (NOT `--force`). Then `npm audit` and record what remains.

**Verify**: `npm run typecheck` (root) → exit 0; `npm run test` (packages/desktop) → pass.

### Step 2: Bump happy-dom

If the happy-dom advisory remains: in `packages/desktop/package.json` set `happy-dom` to the latest major (check `npm view happy-dom version`), run `npm install` at root.

**Verify**: `npm run test` (packages/desktop) → pass. happy-dom majors occasionally change DOM behavior; if more than a couple of tests fail with DOM-API errors, try the latest minor of the next-lower major; if still failing, STOP.

### Step 3: Bump electron-builder if needed for tar/tmp/shell-quote

If tar/tmp advisories remain under `app-builder-lib`/`electron-builder`: bump `electron-builder` to `^26` in `packages/desktop/package.json`, `npm install` at root. If advisories STILL remain (electron-builder pins old tar), add root `overrides` entries instead (the repo already uses `overrides` for postcss — follow that pattern), e.g. `"tar": "^7.5.11"` — but only for packages where the major bump is API-compatible for the consumer; if unsure, prefer the electron-builder bump alone and report leftovers.

**Verify**: `npm run pack` (packages/desktop) → exit 0 and `npm run test:smoke` → pass. This is mandatory: electron-builder 24→26 changed defaults; the smoke test plus a look at the produced artifact (app exists under `release/`) is the gate.

### Step 4: Final audit

**Verify**: `npm audit` → 0 vulnerabilities, OR only advisories whose path is `electron` itself (record those in your report — they belong to plan 009).

## Test plan

No new tests. Gates: full desktop unit suite, typecheck, `pack` + packaged smoke test. If you can also run `npm run test:e2e`, do.

## Done criteria

- [ ] `npm audit` reports 0 vulnerabilities excluding electron-core advisories
- [ ] `npm run test` (desktop) and `npm run typecheck` (root) exit 0
- [ ] `npm run pack` succeeds and `npm run test:smoke` passes
- [ ] Only `package.json`, `package-lock.json`, `packages/desktop/package.json` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- `npm audit fix` wants to change `electron` or any production dependency — revert and report.
- electron-builder ^26 breaks `npm run pack` (config schema change, e.g. notarize/signing options) after one reasonable fix attempt against the v26 migration notes.
- happy-dom bump breaks >3 tests after trying adjacent versions.
- mac signing/notarization config errors: you cannot verify signing locally — flag for the operator to watch the next `release.yml` run.

## Maintenance notes

- The macOS signing/notarization path (`build/entitlements.mac.plist`, `notarize: true`) only truly exercises on a tagged release build in CI — the first release after this lands should be watched closely.
- Add `npm audit --audit-level=high` as a CI step later if the team wants to stay clean (deliberately not included here to avoid blocking CI on unfixable transitive advisories).
