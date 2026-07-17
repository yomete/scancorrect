# Plan 021: Ship universal macOS builds and stop bundling all of node_modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2d58d27..HEAD -- packages/desktop/package.json .github/workflows/release.yml`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (packaging changes can silently break the packaged app — the smoke test is the gate)
- **Depends on**: 017 (its manifest assertion must keep passing; universal builds change `latest-mac.yml` contents)
- **Category**: release/packaging
- **Planned at**: commit `2d58d27`, 2026-07-17

## Why this matters

Two packaging problems:

1. **Intel Macs are silently excluded.** The mac electron-builder target
   declares no architectures, and CI builds on `macos-latest` (arm64), so
   every published artifact is arm64-only (verified: the v0.3.2 release
   assets are all `*-arm64.*`). The website's "Download for macOS" button
   serves the first `.dmg` to everyone — Intel users get a binary that won't
   run natively, and once auto-update works (plan 017), `latest-mac.yml`
   would be arm64-only too. Fix: build `universal` binaries.
2. **The app ships all of `node_modules`.** The `files` list explicitly
   includes `node_modules/**/*`, overriding electron-builder's default
   production-dependency pruning — devDependency trees can end up inside the
   93–119 MB DMGs. Removing the glob lets electron-builder pack only the 4
   runtime deps (electron-store, electron-updater, exiftool-vendored,
   fast-xml-parser) and their transitive closure. Also, the `asarUnpack`
   entry `node_modules/@photostructure/**/*` references a package that no
   longer exists in the tree (current exiftool-vendored layout ships
   `exiftool-vendored.pl`/`.exe` instead) — dead config to remove.

## Current state

Relevant files:

- `packages/desktop/package.json` — electron-builder config under `"build"`; `files` (lines 80–88), `asarUnpack` (lines 89–92), `mac` target (lines 93–103), `publish` (lines 134–138). App version 0.3.2.
- `.github/workflows/release.yml` — mac job runs on `macos-latest` (arm64).
- `packages/website/app/download/[platform]/route.ts` — serves the first asset matching `/\.dmg$/` for mac (lines 6–10); works unchanged with a single universal DMG.
- Smoke tests: `packages/desktop/playwright.smoke.config.ts`, run via `npm run test:smoke`, require a packaged app from `npm run pack`.

`package.json:80–92` (current files/asarUnpack):

```json
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "build/icon.png",
      "package.json",
      "node_modules/**/*",
      "!**/*.{map,d.ts}",
      "!**/{test,tests,__tests__,example,examples,doc,docs}/**"
    ],
    "asarUnpack": [
      "node_modules/exiftool-vendored*/**/*",
      "node_modules/@photostructure/**/*"
    ],
```

`package.json:93–103` (mac target, no arch):

```json
    "mac": {
      "category": "public.app-category.photography",
      "hardenedRuntime": true,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.inherit.plist",
      "notarize": true,
      "target": [
        "dmg",
        "zip"
      ]
    },
```

Key architecture fact: `exiftool-vendored` on macOS/Linux uses
`exiftool-vendored.pl` — a **Perl** distribution with no
architecture-specific native binaries — so a universal Electron build does
not hit per-arch native-module mismatches from it. The `asarUnpack` of
`exiftool-vendored*/**/*` is what lets the Perl exiftool be spawned from
disk; it must keep working.

## Commands you will need

⚠️ The default shell on this machine may resolve to Node 14. Prefix command
chains with: `export PATH="$HOME/.nvm/versions/node/v22.15.1/bin:$PATH"`

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` (repo root) | exit 0 |
| Package locally (no installer) | `cd packages/desktop && npm run pack` | exit 0; `release/mac-universal/` (or `mac/`) contains ScanCorrect.app |
| Smoke test (packaged app) | `cd packages/desktop && npm run test:smoke` | all pass |
| Inspect asar contents | `npx --yes @electron/asar list "packages/desktop/release/mac-universal/ScanCorrect.app/Contents/Resources/app.asar" \| head -50` | listing prints |

## Scope

**In scope**:
- `packages/desktop/package.json` (`build.files`, `build.asarUnpack`, `build.mac.target` only)
- `plans/README.md` (status row)

**Out of scope**:
- `.github/workflows/release.yml` — no change needed; universal builds work on arm64 runners. (Plan 017 owns that file.)
- `packages/website/app/download/[platform]/route.ts` — a single universal DMG matches the existing regex; don't touch.
- Windows/Linux targets, signing, entitlements, `deb.depends`.
- Version bumps.

## Git workflow

- Branch: `advisor/021-mac-universal-packaging`
- Commits: one per step (`feat: build universal macOS binaries`, `fix: let electron-builder prune node_modules`, …)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Baseline pack + smoke (before any change)

Establish that packaging works today on this machine, so later failures are
attributable to your changes:

**Verify**: `cd packages/desktop && npm run pack && npm run test:smoke` → all pass. Note the app size: `du -sh release/mac*/ScanCorrect.app`

### Step 2: Universal mac target

In `package.json` `build.mac.target`, request universal explicitly:

```json
      "target": [
        { "target": "dmg", "arch": ["universal"] },
        { "target": "zip", "arch": ["universal"] }
      ]
```

**Verify**: `cd packages/desktop && npm run pack` → exit 0 and the output dir is `release/mac-universal/`; `lipo -archs "release/mac-universal/ScanCorrect.app/Contents/MacOS/ScanCorrect"` → prints `x86_64 arm64`

### Step 3: Remove the node_modules glob and the dead asarUnpack entry

- Delete the `"node_modules/**/*"` line from `files` (keep everything else,
  including the two `!` exclusions — they still apply to what
  electron-builder auto-includes).
- Delete `"node_modules/@photostructure/**/*"` from `asarUnpack` (keep
  `"node_modules/exiftool-vendored*/**/*"`).

**Verify**:
1. `cd packages/desktop && npm run pack` → exit 0
2. `npx --yes @electron/asar list "release/mac-universal/ScanCorrect.app/Contents/Resources/app.asar" | grep -c "node_modules/electron-store"` → ≥1 (runtime dep still packed)
3. `npx --yes @electron/asar list "release/mac-universal/ScanCorrect.app/Contents/Resources/app.asar" | grep -c "node_modules/vitest\|node_modules/playwright\|node_modules/electron-builder"` → 0 (dev deps pruned)
4. `ls "release/mac-universal/ScanCorrect.app/Contents/Resources/app.asar.unpacked/node_modules/" ` → contains `exiftool-vendored.pl` (the Perl exiftool survived unpack)
5. `du -sh release/mac-universal/ScanCorrect.app` → note size vs Step 1 baseline (expect a meaningful drop despite universal doubling the Electron binary)

### Step 4: Full smoke test against the new package

**Verify**: `cd packages/desktop && npm run test:smoke` → all pass. The smoke
suite exercises the packaged app including EXIF operations — this is the
gate that proves exiftool still spawns from the unpacked path.

## Test plan

No new test files. The verification IS the test: packaged smoke suite green
against a universal, pruned build, plus the asar-content greps in Step 3.

## Done criteria

- [ ] `npm run typecheck` exits 0 (unchanged code, sanity)
- [ ] `grep -n "node_modules/\*\*/\*" packages/desktop/package.json` → no match in `files`
- [ ] `grep -n "@photostructure" packages/desktop/package.json` → no match
- [ ] `grep -n '"universal"' packages/desktop/package.json` → 2 matches (dmg + zip)
- [ ] `lipo -archs` on the packed binary prints `x86_64 arm64`
- [ ] Step 3's asar greps: runtime deps present, dev deps absent, exiftool-vendored.pl unpacked
- [ ] `cd packages/desktop && npm run test:smoke` exits 0 against the final build
- [ ] `git status` shows only package.json (+ plans/README.md) modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Step 1's baseline pack or smoke already fails — the problem predates this
  plan.
- The universal build fails with an error about mismatched/native modules —
  do NOT switch to `x64`+`arm64` dual artifacts as an improvisation; report,
  because dual artifacts change `latest-mac.yml` and the website route
  behavior (first-dmg-wins would become arch-random).
- After Step 3, the smoke test fails on any exiftool operation — the pruning
  broke the vendored binary layout; report the asar/unpacked listing rather
  than re-adding the node_modules glob wholesale.
- Local machine is not macOS (universal + lipo verification impossible) —
  report; this plan requires a Mac.

## Maintenance notes

- The next tagged release after this lands publishes universal artifacts;
  existing arm64 installs will auto-update to universal via `latest-mac.yml`
  (version bump required — see plan 017's tag/version gate).
- If a real native (arch-specific) dependency is ever added, revisit
  universal packaging — `electron-builder` needs per-arch rebuild config for
  those.
- Reviewer: compare DMG sizes before/after in the PR description; confirm
  the `files` exclusions (`!**/*.{map,d.ts}` etc.) were kept.
