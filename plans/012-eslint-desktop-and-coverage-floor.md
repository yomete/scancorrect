# Plan 012: Add ESLint to the desktop package and a coverage floor to CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/package.json packages/desktop/vitest.config.ts .github/workflows/test.yml`

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: 001 (CI restructure landed), ideally after 002 (so the coverage floor has something to stand on)
- **Category**: dx
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

The website package has ESLint; the desktop package — the part that rewrites users' files — has none, so unused vars, accidental `any`s, and footguns pass silently. Separately, CI computes coverage and uploads the report but enforces nothing, so coverage can only ratchet down. Two small additions: a flat-config ESLint setup for desktop wired into CI, and a vitest coverage threshold set just below today's actual numbers so it ratchets up with plans 002/007.

## Current state

- `packages/desktop/package.json` — no eslint deps, no `lint` script. TypeScript ^5.5, vitest ^2, React 18. Two TS programs: renderer (`tsconfig.json`, `include: ["src"]`) and main (`electron/tsconfig.json`).
- Code style facts a config must not fight: no semicolons, single quotes, 2-space indent (see any file in `electron/` or `src/`).
- `packages/website` uses `eslint ^10` + `eslint-config-next` — desktop should NOT copy that (Next-specific); use `typescript-eslint` recommended instead.
- CI: `.github/workflows/test.yml` `unit-tests` job runs `npm run test:coverage` (vitest v8 provider, `@vitest/coverage-v8` already installed). `packages/desktop/vitest.config.ts` — read it; it has no `coverage.thresholds` today.
- Current coverage is very low (~8–9% statements overall at 217c979) but plans 002/007 raise it substantially. Set thresholds AFTER measuring at execution time.

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Lint | `npm run lint` (to be created) | exit 0 |
| Coverage | `npm run test:coverage` | exit 0, table printed |
| Typecheck | `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `packages/desktop/package.json` (devDeps: `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`; scripts: `lint`)
- `packages/desktop/eslint.config.js` (create, flat config)
- `packages/desktop/vitest.config.ts` (coverage thresholds)
- `.github/workflows/test.yml` (lint step for desktop in the existing or plan-001 lint location)
- Mechanical auto-fixes from `eslint --fix` across `packages/desktop/{src,electron,e2e}` ONLY

**Out of scope**:
- Website lint config; Prettier/formatting tools; pre-commit hooks (deliberately not planned — the team can add Husky later if wanted); any manual refactor beyond what a rule auto-fix does.

## Git workflow

- Branch: `advisor/012-eslint-coverage-floor`
- Commits: (1) eslint setup + autofixes, (2) manual fixes if trivial, (3) coverage thresholds + CI.

## Steps

### Step 1: Install and configure ESLint (flat config)

In `packages/desktop`: add devDeps `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks` (latest; install from repo root with `npm install -D -w desktop ...`). Create `eslint.config.js`:

- Base: `typescript-eslint` recommended (NOT type-checked variant — keep lint fast and config simple).
- `react-hooks` recommended for `src/**/*.tsx?`.
- Ignores: `dist/`, `dist-electron/`, `coverage/`, `release/`, `playwright-report/`, `test-results/`, `node_modules/`.
- Disable stylistic rules that fight the codebase (no semi/quote enforcement — ESLint stylistic rules off by default in recommended; leave it that way).
- Add `"lint": "eslint ."` to scripts.

**Verify**: `npm run lint` runs and reports a finite list.

### Step 2: Burn down violations

`npx eslint . --fix`, then triage what remains: fix trivially-safe items (unused imports/vars — prefix intentional ones with `_` and configure `argsIgnorePattern: '^_'`), and for anything requiring judgment (real `any`s, hook-deps warnings), downgrade that rule to `warn` rather than refactoring code — this plan installs the ratchet, not a rewrite. Record the warn-list in your report.

**Verify**: `npm run lint` exit 0; `npm run test` and `npm run typecheck` still pass; `git diff` shows only mechanical changes.

### Step 3: Wire lint into CI

In `.github/workflows/test.yml`, add `- run: npm run lint --workspace desktop` (and if plan 001's website job exists, the symmetric structure is already there; otherwise add a small lint job).

**Verify**: YAML parses; command passes locally from repo root.

### Step 4: Coverage floor

Run `npm run test:coverage`; note overall lines/statements/functions/branches. In `vitest.config.ts` add `coverage.thresholds` set ~2 points below measured values (so the suite fails only on regression). 

**Verify**: `npm run test:coverage` exit 0 with thresholds active; temporarily raise a threshold above actual to confirm it fails, then restore.

## Test plan

No new tests. Gates: lint exit 0, coverage threshold mechanism proven to fail-when-violated (Step 4 check).

## Done criteria

- [ ] `npm run lint --workspace desktop` exits 0 locally
- [ ] CI workflow includes the desktop lint step
- [ ] `vitest.config.ts` has thresholds; `npm run test:coverage` exit 0
- [ ] `npm run test`, `npm run typecheck` still pass
- [ ] Only in-scope files + mechanical autofixes in the diff
- [ ] `plans/README.md` updated

## STOP conditions

- ESLint flat-config + the repo's TS version produce config-resolution errors you can't settle in one attempt (version matrix issue) — report versions tried.
- `--fix` produces a diff touching >50 files or any behavioral-looking change — abort the fix, scope rules down, report.
- Measured coverage at execution time is so low (<10%) that thresholds are noise — set thresholds on `src/store/**` and `electron/**` only (per-glob thresholds), note it.

## Maintenance notes

- Ratchet the thresholds upward when plans 002/007 land their tests.
- The warn-list from Step 2 is the backlog for a future strictness pass.
