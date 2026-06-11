# Plan 011: Remove dead code (main-simple.tsx, committed shared/dist, coverage artifacts)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/src/main-simple.tsx packages/shared`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

Three pieces of clutter confuse readers and tooling: (1) `packages/desktop/src/main-simple.tsx` is a "Hello React" stub entry point nothing references; (2) `packages/shared/dist/` contains committed compiled output (`.d.ts`/`.js`) that nothing consumes — the package's `exports` point at `src/*.ts` directly, so dist silently rots; (3) `packages/desktop/coverage/` appears to be committed (coverage HTML referenced main-simple.tsx in a tracked file listing) — generated artifacts shouldn't be in git.

## Current state

- `packages/desktop/src/main-simple.tsx` — 12-line stub. Referenced nowhere: `grep -rn "main-simple" packages/desktop --include='*.ts*' --include='*.html' --include='*.json'` at 217c979 matched only files under `packages/desktop/coverage/` (generated output). The real entry is `src/main.tsx` via root `index.html`/`packages/desktop` vite setup.
- `packages/shared/package.json` exports:

```json
"main": "./src/index.ts",
"exports": { ".": { "import": "./src/index.ts", "require": "./src/index.ts" },
             "./types": { "import": "./src/types.ts", "require": "./src/types.ts" } }
```

  i.e. consumers compile `src/` directly; `packages/shared/dist/` (committed `index.d.ts`, `types.d.ts`, `utils.d.ts`, …) is unused output of the `build` script.
- Check what's actually tracked before acting: `git ls-files packages/shared/dist packages/desktop/coverage` — act only on what this lists.
- `.gitignore` — read it; ensure `coverage/` and `packages/shared/dist/` end up ignored.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Reference check | `grep -rn "main-simple" packages --include='*.ts*' --include='*.html' --include='*.json' \| grep -v coverage` | no matches |
| shared/dist consumers | `grep -rn "shared/dist" packages .github scripts` | no matches |
| Typecheck | `npm run typecheck` (root) | exit 0 |
| Desktop build | `npm run build` (packages/desktop) | exit 0 |
| Tests | `npm run test` (packages/desktop) | pass |

## Scope

**In scope**:
- Delete `packages/desktop/src/main-simple.tsx`
- `git rm -r` whatever `git ls-files` shows under `packages/shared/dist/` and `packages/desktop/coverage/`
- `.gitignore` additions (`packages/desktop/coverage/`, `packages/shared/dist/`)

**Out of scope**:
- Changing `packages/shared/package.json` exports or build script (plan 006 touches shared types; repointing exports at dist was considered and rejected — src-exports is a valid pattern for an internal workspace package).
- Deleting any of the root markdown docs.
- `release/` directory (already ignored or build output — verify with `git ls-files release | head`; if tracked, report, don't delete).

## Git workflow

- Branch: `advisor/011-dead-code-cleanup`
- One commit: `Remove dead code: main-simple.tsx, committed shared/dist and coverage output`.

## Steps

### Step 1: Confirm dead, then delete main-simple.tsx

Run the reference check command. Then `git rm packages/desktop/src/main-simple.tsx`.

**Verify**: `npm run build` (packages/desktop) exit 0; `npm run typecheck` (root) exit 0.

### Step 2: Untrack generated dirs

`git ls-files packages/shared/dist packages/desktop/coverage` → if non-empty, `git rm -r --cached` won't delete local files needed by anything; use plain `git rm -r` for shared/dist (truly unused) and `git rm -r --cached` for coverage (keep local copy harmless). Add both paths to `.gitignore`.

**Verify**: `git ls-files packages/shared/dist packages/desktop/coverage` → empty; `npm run test` (desktop) passes; `npm run test:coverage` still writes a local coverage dir that git ignores (`git status` clean of coverage files after running it).

### Step 3: Full gate

**Verify**: root `npm run typecheck` exit 0; desktop `npm run test` pass; desktop `npm run build` exit 0.

## Test plan

No new tests — deletions gated by build/typecheck/test.

## Done criteria

- [ ] `main-simple.tsx` gone; build + typecheck green
- [ ] No tracked files under `packages/shared/dist` or `packages/desktop/coverage`
- [ ] `.gitignore` covers both
- [ ] `plans/README.md` updated

## STOP conditions

- The reference check finds a live (non-coverage) reference to `main-simple`.
- Anything imports from `shared/dist`.
- `release/` turns out to be tracked with large binaries — report; history rewriting is an operator decision.

## Maintenance notes

- If `packages/shared` ever gets published or consumed outside the workspace, revisit the src-exports decision and reinstate a real build.
