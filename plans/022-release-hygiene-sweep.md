# Plan 022: Release-hygiene sweep — privacy page, changelog, doc refresh, dep fixes, coverage ratchet

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. The five steps are independent — if one hits a STOP condition,
> report it and continue with the others. When done, update the status row
> for this plan in `plans/README.md` — unless a reviewer dispatched you and
> told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2d58d27..HEAD -- CLAUDE.md packages/desktop/vitest.config.ts packages/website/components/Footer.tsx package-lock.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch for that step, treat it as a STOP condition for that step only.

## Status

- **Priority**: P3
- **Effort**: S–M (five small independent tasks)
- **Risk**: LOW
- **Depends on**: none (but do NOT run alongside other plans in the same worktree — Step 4 touches package-lock.json)
- **Category**: docs / dx / deps
- **Planned at**: commit `2d58d27`, 2026-07-17

## Why this matters

Five small gaps that matter for a public, auto-updating release:

1. **No privacy disclosure** — the app sends coordinates and search text to
   two third-party services (Nominatim at `nominatim.openstreetmap.org`, see
   `packages/desktop/electron/geocoding.ts:10`; Mapbox at `api.mapbox.com`,
   see `packages/desktop/electron/mapbox.ts`), and neither the website nor
   the app says so anywhere. Location data is PII; a public release needs a
   privacy statement.
2. **No changelog** — with auto-update shipping (users get updated without
   re-visiting the site), there is no `CHANGELOG.md` and no release-notes
   surface beyond GitHub's auto-generated notes.
3. **CLAUDE.md is stale** — it says Electron 31 (now 42), omits the
   `electron/handlers/` directory that owns the whole IPC surface, doesn't
   mention auto-update, and claims electron-store persists a "user tier"
   that doesn't exist in `StoreSchema` (`electron/store.ts:12–23`). Agents
   navigate by this file; wrong maps cost every future session.
4. **Five npm audit advisories are fixable without breaking changes**
   (undici, form-data, js-yaml, joi, @babel/core — all dev/build-time). The
   remaining advisories require vitest 4 / vite 8 majors and are explicitly
   NOT this plan.
5. **The coverage floor is a no-op** — statements/lines threshold is 15%,
   which catches almost nothing. The config's own comment says thresholds
   should sit ~2 points below measured values and be ratcheted.

## Current state

- `CLAUDE.md` (repo root) — project doc; "Electron 31" appears in the intro; monorepo layout section lists `electron/` files without `handlers/`; "Shipped features (as of v0.3.2)" list; a line claiming electron-store persists "user tier".
- `packages/website/` — Next.js 16 App Router; pages at `app/page.tsx`, `app/guides/...`; site-wide footer component at `components/Footer.tsx`.
- No `CHANGELOG.md` anywhere in the repo.
- `packages/desktop/vitest.config.ts:42–47` — thresholds `{ statements: 15, branches: 77, functions: 50, lines: 15 }`.
- Root `npm audit` (Node 22): 13 advisories — 1 low, 7 moderate, 3 high, 2 critical; all in dev/build tooling (electron-builder chain, vitest/vite chain, wait-on, website postcss chain). None affect the shipped app's 4 runtime deps.

## Commands you will need

⚠️ The default shell on this machine may resolve to Node 14. Prefix command
chains with: `export PATH="$HOME/.nvm/versions/node/v22.15.1/bin:$PATH"`

| Purpose | Command | Expected |
|---|---|---|
| Typecheck all | `npm run typecheck` (root) | exit 0 |
| Desktop tests | `cd packages/desktop && npm run test` | all pass |
| Desktop coverage | `cd packages/desktop && npm run test:coverage` | pass + coverage table |
| Website build | `npm run build:website` (root) | exit 0 |
| Audit | `npm audit` (root) | see Step 4 expectations |

## Scope

**In scope**:
- `CLAUDE.md`
- `CHANGELOG.md` (create, repo root)
- `packages/website/app/privacy/page.tsx` (create)
- `packages/website/components/Footer.tsx` (add link)
- `packages/desktop/vitest.config.ts` (thresholds only)
- `package-lock.json` (via `npm audit fix` only)
- `plans/README.md` (status row)

**Out of scope**:
- vitest 4 / vite 8 / electron-builder major upgrades — separate migration, do not attempt (`npm audit fix --force` is FORBIDDEN).
- In-app privacy UI (a note inside the geocoding modal) — deferred; website page only.
- Any change under `packages/desktop/src` or `packages/desktop/electron`.
- AGENTS.md / README.md — only CLAUDE.md is being refreshed here (AGENTS.md mirrors it; update it ONLY if it contains the same stale claims — check with grep, mirror the same fixes if so).

## Git workflow

- Branch: `advisor/022-release-hygiene`
- One commit per step.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Privacy page + footer link

Create `packages/website/app/privacy/page.tsx` following the structure/style
of an existing simple page (look at `app/guides/fix-scanner-metadata/page.tsx`
for layout conventions, metadata export, and Tailwind classes). Content must
state, plainly:

- ScanCorrect processes photos locally; images never leave the machine.
- When you use **location search / reverse geocoding**, the coordinates or
  place text you enter are sent to OpenStreetMap Nominatim
  (openstreetmap.org privacy policy applies).
- When you use the **map picker**, map tiles and place search go to Mapbox
  using your configured token (Mapbox privacy policy applies).
- The app checks GitHub for **updates** (transmits app version).
- No analytics, no accounts, no telemetry beyond the above.
- A "questions" contact line (use the repo's GitHub issues URL).

Add a `Privacy` link to `packages/website/components/Footer.tsx` following
its existing link markup.

**Verify**: `npm run build:website` → exit 0 (the new route compiles)

### Step 2: CHANGELOG.md

Create `CHANGELOG.md` at repo root in Keep-a-Changelog format. Seed it with:

- `## [Unreleased]`
- `## [0.3.2] - 2026-07` — summarize from `git log` since the v0.3.1 tag if
  it exists (`git tag -l`; if no earlier tag, summarize the recent feature
  merges: Electron 42 upgrade, auto-update, window-state persistence,
  thumbnail cache rework, geocoding resilience, handlers split, ESLint+CI).

Add one line to `DEPLOYMENT.md`'s release-steps section: "Update
CHANGELOG.md before tagging."

**Verify**: `test -f CHANGELOG.md && grep -c "0.3.2" CHANGELOG.md` → ≥1

### Step 3: CLAUDE.md refresh

Fix only what is stale — do not rewrite the file:

1. "Electron 31" → "Electron 42" wherever it appears.
2. In the monorepo-layout block, the `electron/` line should mention the
   handler modules: `electron/ — main process: main.ts + handlers/ (IPC),
   exif.ts, gpx.ts, geocoding.ts, mapbox.ts, thumbnails.ts, updater.ts,
   store.ts, window-state.ts, spotlight.ts, preload.ts` (match the file's
   existing formatting).
3. Remove "user tier" from the electron-store description (check
   `electron/store.ts` `StoreSchema` for what IS persisted and list that:
   camera profiles, custom dropdown values, processing log, saved locations,
   thumbnail-cache setting, mapbox token, window bounds, last-used profile).
4. Add to "Shipped features": auto-update via electron-updater + GitHub
   Releases (with the Footer update pill); window-bounds persistence.
5. Check `grep -n "Electron 31\|user tier" AGENTS.md` — if AGENTS.md has the
   same staleness, apply the same fixes there.

**Verify**: `grep -rn "Electron 31" CLAUDE.md AGENTS.md` → no matches; `grep -n "handlers/" CLAUDE.md` → ≥1 match

### Step 4: Non-breaking dependency fixes

From the repo root:

```
npm audit fix
```

(NEVER `--force`.) Then confirm nothing broke and count what remains:

- Expected: advisories for undici, form-data, js-yaml, joi, @babel/core
  resolve (exact set may vary — record before/after `npm audit` totals in
  your report). Remaining advisories should be only the vitest/vite/esbuild
  cluster and anything pinned inside electron-builder that needs a major.
- If `npm audit fix` changes NOTHING (some transitive pins can't move
  without majors), record that outcome and revert any lockfile noise —
  that's a valid result, not a failure.

**Verify**: `npm run typecheck` → exit 0; `cd packages/desktop && npm run test` → all pass; `npm run build:website` → exit 0

### Step 5: Ratchet the coverage floor

Measure, then set thresholds ~2 points below measured:

1. `cd packages/desktop && npm run test:coverage` → read the "All files"
   summary row (statements %, branches %, functions %, lines %).
2. Edit `vitest.config.ts:42–47`: set each threshold to
   `floor(measured − 2)`. Update the comment's recorded values and date.
   Note: after plans 018/020 land with their new tests, coverage rises —
   whoever executes this last should measure at that point; the number in
   the config comment must match YOUR measured run.

**Verify**: `cd packages/desktop && npm run test:coverage` → passes with the new thresholds

## Test plan

No new test files. Gates: website build (Step 1), typecheck + full desktop
suite (Step 4), coverage run (Step 5).

## Done criteria

- [ ] `packages/website/app/privacy/page.tsx` exists; `npm run build:website` exits 0; Footer links to `/privacy`
- [ ] `CHANGELOG.md` exists with an Unreleased section and a 0.3.2 entry; DEPLOYMENT.md mentions it
- [ ] `grep -rn "Electron 31" CLAUDE.md AGENTS.md` → no matches; no "user tier" claim remains
- [ ] `npm audit` totals recorded before/after in the execution report; typecheck + desktop tests + website build green after `npm audit fix`
- [ ] `vitest.config.ts` statements/lines thresholds > 15 and within 3 points of the measured values from your own coverage run
- [ ] `git status` shows no files modified outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

- `npm audit fix` bumps a package across a MAJOR version (check `git diff
  package-lock.json` for the top-level manifests) — revert and report.
- Desktop tests fail after Step 4 — revert the lockfile (`git checkout --
  package-lock.json && npm ci`... note `npm ci` mutates node_modules, that
  is acceptable for restoring a working state) and report which advisory
  fix caused it.
- The website has no obvious page to model the privacy page on (guides page
  missing/radically different) — build a minimal page with the site's layout
  wrapper and report the styling as unpolished rather than inventing a design
  system.
- Coverage measurement varies run-to-run by >1 point (flaky coverage) —
  set thresholds 4 points below the lowest observed and note it.

## Maintenance notes

- CHANGELOG.md discipline only works if enforced: consider (future, not this
  plan) a release.yml step that fails when CHANGELOG.md lacks the tag's
  version.
- The privacy page must be updated if any new network call ships
  (telemetry, crash reporting, new geocoders).
- Coverage ratchet is intended to be repeated after every test-adding plan;
  it is deliberately cheap.
