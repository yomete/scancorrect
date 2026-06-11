# Plan 001: Make CI typecheck, test, lint, and build ALL workspaces, not just desktop

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- .github/workflows/test.yml packages/website/package.json packages/shared/package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

This is an npm-workspaces monorepo with three packages (`packages/desktop`, `packages/website`, `packages/shared`), but every job in `.github/workflows/test.yml` sets `working-directory: packages/desktop`. The website (Next.js) is never typechecked, linted, or even built in CI; shared is never typechecked. Type errors or a broken Next.js build in those packages merge silently. Fixing this also unblocks every other plan in `plans/` — they rely on CI as the verification gate.

## Current state

- `.github/workflows/test.yml` — 4 jobs: `unit-tests`, `e2e-tests` (3-OS matrix), `integration-tests` (3-OS matrix), `typecheck`. All desktop-only.
- The typecheck job today (`.github/workflows/test.yml:154-173`):

```yaml
  typecheck:
    name: TypeScript Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run TypeScript check
        working-directory: packages/desktop
        run: npm run typecheck
```

- Root `package.json` already has the right script: `"typecheck": "npm run typecheck --workspaces --if-present"`. All three packages have a `typecheck` script.
- `packages/website/package.json` has `"build": "next build"` and `"lint": "next lint"`; neither runs in CI.
- Desktop has no lint script (that's plan 012, out of scope here).

## Commands you will need

| Purpose | Command (from repo root) | Expected on success |
|---|---|---|
| Install | `npm ci` | exit 0 |
| Typecheck all | `npm run typecheck` | exit 0 |
| Website build | `npm run build --workspace website` | exit 0, `.next/` produced |
| Website lint | `npm run lint --workspace website` | exit 0 (see STOP conditions) |
| Validate workflow YAML | `npx -y yaml-lint .github/workflows/test.yml` or push to a branch and check Actions | parses |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/test.yml`

**Out of scope**:
- `.github/workflows/build.yml`, `release.yml` — desktop packaging pipelines; leave alone.
- Adding ESLint to desktop (plan 012).
- Any `package.json` changes.

## Git workflow

- Branch: `advisor/001-ci-all-workspaces`
- Single commit; message style matches repo (`git log` shows plain imperative sentences, e.g. "CI: also emit Linux screenshots as base64 in the log"). Suggested: `CI: typecheck/lint/build all workspaces, not just desktop`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Broaden the typecheck job

In `.github/workflows/test.yml`, change the `Run TypeScript check` step: remove `working-directory: packages/desktop` and keep `run: npm run typecheck` (root script fans out to all workspaces).

**Verify**: locally from repo root, `npm run typecheck` → exit 0 for all three packages. If it fails for website or shared, see STOP conditions.

### Step 2: Add a website job

Add a new job to `test.yml` (same checkout/node/npm-ci preamble as `typecheck`):

```yaml
  website:
    name: Website Lint & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Lint website
        run: npm run lint --workspace website
      - name: Build website
        run: npm run build --workspace website
```

**Verify**: run both commands locally from repo root → exit 0.

### Step 3: Validate the workflow file

**Verify**: YAML parses (e.g. `node -e "require('js-yaml')" 2>/dev/null` is unreliable — simplest: `npx -y js-yaml .github/workflows/test.yml > /dev/null` → exit 0). Confirm job names are unique.

## Test plan

No new test files. The verification is that the workflow runs green: after merging (or via `gh workflow run` / a draft PR if the operator allows pushing), the `TypeScript Check` and `Website Lint & Build` jobs pass.

## Done criteria

- [ ] `npm run typecheck` (repo root) exits 0
- [ ] `npm run lint --workspace website` exits 0
- [ ] `npm run build --workspace website` exits 0
- [ ] `test.yml` typecheck step has no `working-directory` line
- [ ] `git status` shows only `.github/workflows/test.yml` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- `npm run typecheck` from root fails in `website` or `shared` with pre-existing type errors. Do NOT fix application code (out of scope) — report the error list back instead; fixing them becomes a follow-up.
- `next lint` errors out because ESLint 10 / `next lint` deprecation (Next 16 may have replaced `next lint`). If the lint script itself is broken, drop the lint step from the new job, keep the build step, and report it.
- The website build fails for reasons unrelated to types (e.g. network fetch at build time).

## Maintenance notes

- When tests are added to website/shared (plans 002 covers desktop stores; website tests were deliberately not planned), broaden the `unit-tests` job the same way (`npm run test --workspaces --if-present`).
- Reviewer should check that CI minutes impact is acceptable (one extra ubuntu job).
