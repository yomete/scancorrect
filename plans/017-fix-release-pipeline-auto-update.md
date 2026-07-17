# Plan 017: Make auto-update actually work — fix the release pipeline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2d58d27..HEAD -- .github/workflows/release.yml packages/desktop/electron/updater.ts packages/desktop/electron/handlers/misc.ts packages/desktop/package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (release pipeline)
- **Planned at**: commit `2d58d27`, 2026-07-17

## Why this matters

**Auto-update is broken in production right now.** The published v0.3.2 GitHub
release (repo `yomete/scancorrect`) contains DMG/ZIP/EXE/AppImage installers
but **no `latest-mac.yml` / `latest.yml` / `latest-linux.yml` files** — verified
via `gh api repos/yomete/scancorrect/releases`. electron-updater fetches those
YAML manifests to discover updates; without them, `checkForUpdates()` 404s
silently in every installed copy of the app and no user ever receives an
update. The cause: `release.yml` runs `npx electron-builder` with no
`--publish` flag, so manifest generation is left to electron-builder's
mood-dependent defaults, and nothing asserts the manifests exist before upload.

Three adjacent release-pipeline gaps get fixed in the same file while we're
here: tags publish without running any tests, nothing checks that the git tag
matches `package.json` version (a mismatch makes electron-updater treat the
new release as not-newer), and the `install-update-now` IPC calls
`quitAndInstall()` even if no update was ever downloaded.

## Current state

Relevant files:

- `.github/workflows/release.yml` — tag-triggered (`v*.*.*`) build+publish across macos/windows/ubuntu; no test gate, no version check, no manifest assertion.
- `packages/desktop/package.json` — version `0.3.2` (line 4); electron-builder `build.publish` block (lines 134–138) points at github/yomete/scancorrect.
- `packages/desktop/electron/updater.ts` — electron-updater init; `update-downloaded` listener at lines 18–23.
- `packages/desktop/electron/handlers/misc.ts` — `install-update-now` IPC handler at lines 66–68.
- `packages/desktop/electron/__tests__/updater.test.ts` and `handlers-misc.test.ts` — existing test files to extend.

`release.yml:74–78` (build step, no publish flag):

```yaml
      - name: Build desktop app
        working-directory: packages/desktop
        run: |
          npm run build
          npx electron-builder
```

`release.yml:85–98` (upload step expects `release/latest*.yml` which nothing guarantees):

```yaml
      - name: Publish to GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          ...
          files: |
            release/*.dmg
            ...
            release/latest*.yml
```

`misc.ts:66–68` (unguarded install):

```ts
  ipcMain.handle('install-update-now', (): void => {
    autoUpdater.quitAndInstall()
  })
```

`updater.ts:18–23` (where the downloaded state is known):

```ts
  autoUpdater.on('update-downloaded', (info) => {
    const win = getMainWindow()
    if (win) {
      win.webContents.send('update-ready', info.version)
    }
  })
```

Conventions: `electron/` source uses **no semicolons** and CommonJS-compiled
TS. Handler modules receive dependencies via a deps object (see
`registerMiscHandlers` in `misc.ts:15–22`). Tests use vitest with mocks in
`packages/desktop/electron/__mocks__/`.

## Commands you will need

⚠️ The default shell on this machine may resolve to Node 14. Every command
chain must first run:
`export PATH="$HOME/.nvm/versions/node/v22.15.1/bin:$PATH"`

| Purpose | Command (from repo root unless noted) | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `cd packages/desktop && npm run test` | all pass (247+ at plan time) |
| Lint | `cd packages/desktop && npm run lint` | exit 0 |
| Workflow YAML parses | `npx --yes js-yaml .github/workflows/release.yml > /dev/null` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/release.yml`
- `packages/desktop/electron/updater.ts`
- `packages/desktop/electron/handlers/misc.ts`
- `packages/desktop/electron/__tests__/updater.test.ts`
- `packages/desktop/electron/__tests__/handlers-misc.test.ts`
- `packages/desktop/electron/main.ts` — ONLY if wiring a new deps field into `registerMiscHandlers` requires it (see Step 4).
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `packages/desktop/package.json` `build` config — packaging changes (universal mac, files globs) belong to plan 021.
- `.github/workflows/test.yml` and `build.yml` — they are correct.
- `packages/desktop/src/components/Footer.tsx` — the update-pill UI stays as is.
- Signing/notarization steps in release.yml (lines 43–72) — working; don't restructure.

## Git workflow

- Branch: `advisor/017-fix-release-pipeline` (matches existing `advisor/NNN-slug` convention in git log)
- Commit style: short imperative, e.g. `fix: emit update manifests deterministically in release build` (see `git log --oneline` for examples)
- Do NOT push or tag unless the operator instructed it.

## Steps

### Step 1: Make manifest generation deterministic and asserted

In `.github/workflows/release.yml`, change the build step to pass
`--publish never` (this still generates `latest*.yml` because `build.publish`
is configured in package.json, but never attempts electron-builder's own
upload — avoiding a potential duplicate-draft-release collision with the
softprops upload step). Then add an assertion step between build and publish:

```yaml
      - name: Build desktop app
        working-directory: packages/desktop
        run: |
          npm run build
          npx electron-builder --publish never

      - name: Assert update manifest exists
        working-directory: packages/desktop
        shell: bash
        run: |
          if [ "$RUNNER_OS" = "macOS" ]; then f=release/latest-mac.yml; fi
          if [ "$RUNNER_OS" = "Windows" ]; then f=release/latest.yml; fi
          if [ "$RUNNER_OS" = "Linux" ]; then f=release/latest-linux.yml; fi
          if [ ! -f "$f" ]; then
            echo "::error::$f was not generated — auto-update would be broken. Failing release."
            exit 1
          fi
          cat "$f"
```

Note: the softprops `files:` globs are relative to the workflow's working
directory (repo root) — check whether the existing globs say `release/*.dmg`
or `packages/desktop/release/*.dmg` and keep the assertion step's paths
consistent with whatever the build actually outputs (electron-builder's
`directories.output` is `release`, relative to `packages/desktop`). If the
existing upload globs are `release/*.dmg` at repo root and prior releases DID
attach installers, softprops evidently resolved them — do not change the
upload globs, only mirror their base path in the assertion.

**Verify**: `npx --yes js-yaml .github/workflows/release.yml > /dev/null` → exit 0

### Step 2: Gate the release on tests

Add a `test` job before the build matrix and make `build` depend on it:

```yaml
jobs:
  test:
    name: Test gate
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
        working-directory: packages/desktop
      - run: npm run test
        working-directory: packages/desktop

  build:
    needs: test
    ...
```

**Verify**: `npx --yes js-yaml .github/workflows/release.yml > /dev/null` → exit 0

### Step 3: Fail the release when tag ≠ package.json version

Add a step to the `test` job (after checkout, before the test runs):

```yaml
      - name: Assert tag matches package.json version
        run: |
          TAG_VERSION="${GITHUB_REF_NAME#v}"
          PKG_VERSION=$(node -p "require('./packages/desktop/package.json').version")
          if [ "$TAG_VERSION" != "$PKG_VERSION" ]; then
            echo "::error::Tag v$TAG_VERSION does not match packages/desktop/package.json version $PKG_VERSION"
            exit 1
          fi
```

**Verify**: `npx --yes js-yaml .github/workflows/release.yml > /dev/null` → exit 0

### Step 4: Guard `install-update-now` behind a real downloaded update

In `updater.ts`, track downloaded state and export a getter (no semicolons):

```ts
let updateDownloaded = false

export function isUpdateDownloaded(): boolean {
  return updateDownloaded
}
```

Set `updateDownloaded = true` inside the existing `update-downloaded`
listener. Then in `misc.ts`, import `isUpdateDownloaded` from `../updater`
and no-op the handler when it's false:

```ts
  ipcMain.handle('install-update-now', (): void => {
    if (!isUpdateDownloaded()) return
    autoUpdater.quitAndInstall()
  })
```

A direct import (rather than threading through `MiscHandlerDeps`) matches how
`misc.ts` already imports `autoUpdater` directly at line 4. If tests need to
control the flag, also export a test-only `_setUpdateDownloadedForTest`
guarded by an underscore name — check how `updater.test.ts` currently mocks
things first and match that approach.

**Verify**: `cd packages/desktop && npm run lint && npm run test` → exit 0, all pass

### Step 5: Tests

- In `handlers-misc.test.ts`: add a test that `install-update-now` does NOT
  call `autoUpdater.quitAndInstall` when no update was downloaded, and DOES
  when the downloaded flag is set. Model the mock/DI style on the existing
  `install-update-now` tests in that file (they exist — search for it).
- In `updater.test.ts`: add a test that the `update-downloaded` event flips
  `isUpdateDownloaded()` to true. Follow the existing event-simulation
  pattern in the file.

**Verify**: `cd packages/desktop && npm run test` → all pass, including the new tests

## Done criteria

- [ ] `export PATH=...v22.15.1/bin:$PATH; npm run typecheck` exits 0
- [ ] `cd packages/desktop && npm run lint` exits 0
- [ ] `cd packages/desktop && npm run test` exits 0 with new updater/misc tests present
- [ ] `npx --yes js-yaml .github/workflows/release.yml` exits 0
- [ ] `grep -n "publish never" .github/workflows/release.yml` → 1 match
- [ ] `grep -n "needs: test" .github/workflows/release.yml` → 1 match
- [ ] `grep -n "latest-mac.yml" .github/workflows/release.yml` → ≥1 match (assertion step)
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The current release.yml build step already passes a `--publish` flag or the
  upload step's file globs don't match the excerpt (drift).
- `electron-builder --publish never` demonstrably does NOT generate
  `latest*.yml` when you test locally (`cd packages/desktop && npm run build
  && npx electron-builder --publish never --dir` won't generate them — that's
  expected for `--dir` builds; only judge from a full target build or defer
  to CI). If you cannot confirm locally, that is fine — the CI assertion step
  is the safety net; do NOT invent an alternative manifest-generation scheme.
- Adding the guard in Step 4 requires changing `preload.ts` or the renderer —
  it must not; the IPC contract is unchanged.

## Maintenance notes

- **The real end-to-end validation is the next tagged release** (e.g.
  v0.3.3): after tagging, confirm the GitHub release contains
  `latest-mac.yml`, `latest.yml`, `latest-linux.yml`, and that an installed
  0.3.2 build detects the update. Nothing in CI can fully prove this.
- Existing 0.3.2 installs WILL start seeing updates as soon as the first
  manifest-bearing release is published — no client-side fix needed.
- Plan 021 changes mac target arches; after it lands, `latest-mac.yml` must
  list both architectures — re-check the assertion still passes.
- Reviewer: scrutinize that the test-gate job doesn't double-bill macOS
  minutes unnecessarily (one gate job is deliberate; don't matrix it).
