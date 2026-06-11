# Plan 005: Resolve the npm-workspaces / yarn packageManager conflict

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- package.json`
> If the `packageManager` field is already gone, mark DONE-by-drift and stop.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

The root `package.json` declares npm workspaces, all scripts use `npm run`, CI runs `npm ci`, and the lockfile is `package-lock.json` — but the file also pins `"packageManager": "yarn@1.22.22+sha512..."`. Any tool that honors the `packageManager` field (corepack, some CIs, IDE integrations) will pick yarn 1, which doesn't understand this workspace setup or the lockfile, producing confusing failures for contributors. The repo is unambiguously an npm repo; the field is wrong.

## Current state

- Root `package.json:34` (last field): `"packageManager": "yarn@1.22.22+sha512.a6b2f7906b721bba..."` 
- Root `package.json:10-12`: `"workspaces": ["packages/*"]`; scripts at lines 13–23 all use `npm run ... --workspace(s)`.
- `package-lock.json` exists at root; `ls yarn.lock` → confirm it does NOT exist (if it does, see STOP conditions).
- CI (`.github/workflows/*.yml`) uses `actions/setup-node` with `cache: 'npm'` and `npm ci`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Clean install | `npm ci` (repo root) | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |

## Scope

**In scope**: root `package.json` (remove one field). Optionally add an `"engines"` note — already present (`node >=20`, `npm >=10`), so no change needed there.

**Out of scope**: lockfile regeneration, any workspace package.json, switching to yarn (the repo's tooling is npm throughout; switching would be a much larger change with no benefit).

## Git workflow

- Branch: `advisor/005-remove-yarn-packagemanager` (or fold into another DX commit if the operator prefers)
- One commit: `Remove stale yarn packageManager field (repo is npm workspaces)`.

## Steps

### Step 1: Remove the field

Delete the `"packageManager": "yarn@1.22.22+..."` line from root `package.json` (watch trailing-comma validity).

**Verify**: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` → exit 0.

### Step 2: Confirm installs still work

**Verify**: `npm ci` → exit 0; `npm run typecheck` → exit 0.

## Test plan

None beyond the verification commands — this is metadata-only.

## Done criteria

- [ ] `grep packageManager package.json` → no matches
- [ ] `npm ci` and `npm run typecheck` exit 0
- [ ] Only root `package.json` modified
- [ ] `plans/README.md` updated

## STOP conditions

- A `yarn.lock` exists at root or in any package (`find . -name yarn.lock -not -path '*/node_modules/*'`) — that suggests someone IS using yarn; report instead of deleting.
- Any CI workflow or script references `yarn` (`grep -rn yarn .github/ scripts/ packages/*/package.json`) — report the references first.

## Maintenance notes

- If the team later wants corepack pinning, the correct value would be `"packageManager": "npm@<version>"`.
