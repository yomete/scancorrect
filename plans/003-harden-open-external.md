# Plan 003: Harden the will-navigate / shell.openExternal handler

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/electron/main.ts`
> On any drift, compare the "Current state" excerpt against the live code; on
> a mismatch around lines 560–580, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

The window's `will-navigate` handler forwards any non-localhost navigation to `shell.openExternal()` with no scheme allowlist. Two problems: (1) the `file://` origin check never matches — in Chromium, `new URL('file:///x').origin` is the string `"null"`, not `"file://"` — so in the packaged app (loaded via `loadFile`) every internal navigation is treated as external; (2) `shell.openExternal` with an unvalidated URL can launch arbitrary protocol handlers (`smb:`, `vscode:`, custom schemes). The renderer is first-party with context isolation, so exploitability is low, but this is the standard Electron hardening checklist item and the fix is a few lines. Also, `new URL(navigationUrl)` can throw on malformed URLs, crashing the handler.

## Current state

- `packages/desktop/electron/main.ts:572-577` (inside `createWindow()`):

```ts
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    }
  })
```

- The window is created with `contextIsolation: true`, `nodeIntegration: false` (`main.ts:511-515`). Dev loads `http://localhost:5173`; production loads `dist/index.html` via `mainWindow.loadFile` (`main.ts:519-526`).
- There is no `setWindowOpenHandler` registered anywhere in `main.ts` (verify with `grep -n setWindowOpenHandler packages/desktop/electron/main.ts` — expect no matches). `window.open` / `target="_blank"` from the renderer therefore uses Electron's default (creates a new BrowserWindow).
- Existing tests for main-process modules live in `packages/desktop/electron/__tests__/` (vitest, see `gpx.test.ts` for style), but `main.ts` itself has no tests — do not try to unit-test it here; the e2e suite (`packages/desktop/e2e/app.test.ts`) is the regression net.

## Commands you will need

| Purpose | Command (from `packages/desktop`) | Expected on success |
|---|---|---|
| Typecheck electron code | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| E2E | `npm run test:e2e` | all pass |

## Scope

**In scope**:
- `packages/desktop/electron/main.ts` — only the `will-navigate` block and one added `setWindowOpenHandler` block.

**Out of scope**:
- Any other handler in main.ts; the IPC path-validation question (deliberately deferred to plan 007's refactor); preload.ts.

## Git workflow

- Branch: `advisor/003-harden-open-external`
- One commit, e.g. `Harden will-navigate: allowlist http/https before shell.openExternal`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Replace the will-navigate block

Replace the excerpt above with logic that (a) never throws on bad URLs, (b) allows internal navigations (dev server origin, and `file:` protocol in production), (c) only ever hands `http:`/`https:` URLs to the OS, and (d) blocks everything else outright:

```ts
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(navigationUrl)
    } catch {
      event.preventDefault()
      return
    }
    const isInternal =
      parsedUrl.origin === 'http://localhost:5173' || parsedUrl.protocol === 'file:'
    if (isInternal) return
    event.preventDefault()
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
      shell.openExternal(navigationUrl)
    }
  })
```

Match the file's existing style (2-space indent, no semicolons is NOT the style here — main.ts omits semicolons; copy whichever the surrounding lines use — the excerpt above shows the file uses no-semicolon style, keep it).

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Add a window-open handler

Immediately after the `will-navigate` block, add:

```ts
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url)
      if (protocol === 'https:' || protocol === 'http:') {
        shell.openExternal(url)
      }
    } catch {
      // malformed URL — drop it
    }
    return { action: 'deny' }
  })
```

**Verify**: `npm run typecheck` → exit 0; `npm run build` → exit 0.

### Step 3: Manual/e2e regression

**Verify**: `npm run test:e2e` (use `xvfb-run` only on Linux) → all pass. The e2e suite loads the built app; if it navigates internally it will catch a broken `file:` allowance.

## Test plan

No new unit tests (main.ts is untestable until plan 007 splits it; that plan's handler tests should include a URL-policy unit test once the policy is extracted). Regression = existing e2e suite passing plus a manual check if you can run the app: external links in the UI (if any) still open in the default browser; `file:` navigation in the packaged app still works.

## Done criteria

- [ ] `grep -n "openExternal" packages/desktop/electron/main.ts` shows it called only inside `http:`/`https:` protocol checks
- [ ] `grep -n "setWindowOpenHandler" packages/desktop/electron/main.ts` → 1 match
- [ ] `npm run typecheck` and `npm run build` exit 0
- [ ] `npm run test:e2e` passes
- [ ] Only `electron/main.ts` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The live `will-navigate` block differs materially from the excerpt (drift).
- E2E tests fail after the change in a way that suggests legitimate in-app navigation is being blocked (e.g. the app uses an anchor-based router) — report which navigation broke.
- You find the app intentionally relies on `window.open` to create real child windows (search renderer: `grep -rn "window.open" packages/desktop/src/`) — the deny-all handler would break that; report instead.

## Maintenance notes

- If the dev server port ever changes from 5173 (see `packages/desktop/package.json` dev script and `vite.config.ts`), the origin allowlist here must follow.
- When plan 007 extracts main.ts modules, consider moving this URL policy into a small exported `isSafeExternalUrl(url)` so it gains a unit test.
