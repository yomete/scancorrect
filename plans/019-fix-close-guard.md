# Plan 019: Make the unsaved-changes close guard actually block window close

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2d58d27..HEAD -- packages/desktop/electron/main.ts packages/desktop/src/App.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (touches window close/quit flow — needs manual verification)
- **Depends on**: none (independent of plan 018, but land 018 first so "unsaved changes" state is accurate)
- **Category**: bug (data loss)
- **Planned at**: commit `2d58d27`, 2026-07-17

## Why this matters

The app's "You have unsaved changes" close dialog **never prevents the window
from closing**. The `close` event handler is `async` and `await`s an IPC round
trip to the renderer *before* calling `e.preventDefault()`. Electron decides
whether the close proceeds synchronously, when the listener returns at its
first `await` — so by the time `preventDefault()` runs, the window is already
closing. Users who close the window with pending edits lose them, and the
dialog either never appears or appears against a dying window. This is the
classic Electron async-close-handler gotcha; the fix is to call
`preventDefault()` synchronously and decide asynchronously.

## Current state

Relevant files:

- `packages/desktop/electron/main.ts` — window creation and the buggy close handler (lines 155–189); a separate sync close handler persists window bounds (lines 141–153); `forceCloseWindow` module-level flag (search for its declaration near the top of the file); `isDev()` helper.
- `packages/desktop/electron/handlers/misc.ts` — `force-close-window` IPC (lines 37–40) sets the flag and calls `close()`.
- `packages/desktop/src/App.tsx` — exposes `window.__hasUnsavedChanges` (lines 164–174); listens for `save-before-close` and calls `forceCloseWindow()` after saving (lines 531–544).

`main.ts:156–189` (the buggy handler — excerpt):

```ts
  mainWindow.on('close', async (e) => {
    if (forceCloseWindow) {
      forceCloseWindow = false
      return
    }

    // Ask renderer if there are unsaved changes
    const hasUnsavedChanges = await mainWindow?.webContents.executeJavaScript(
      'window.__hasUnsavedChanges ? window.__hasUnsavedChanges() : false'
    ).catch(() => false)

    if (hasUnsavedChanges) {
      e.preventDefault()          // <-- runs AFTER the first await: too late
      const { response } = await dialog.showMessageBox(mainWindow!, { ... })
      if (response === 0) {
        mainWindow?.webContents.send('save-before-close')
      } else if (response === 1) {
        forceCloseWindow = true
        mainWindow?.close()
      }
      // response === 2: Cancel - do nothing
    }
  })
```

Convention: `electron/` source uses **no semicolons**.

## Commands you will need

⚠️ The default shell on this machine may resolve to Node 14. Prefix command
chains with: `export PATH="$HOME/.nvm/versions/node/v22.15.1/bin:$PATH"`

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` (repo root) | exit 0 |
| Lint | `cd packages/desktop && npm run lint` | exit 0 |
| Unit tests | `cd packages/desktop && npm run test` | all pass |
| E2E (regression check) | `cd packages/desktop && npm run test:e2e` | all pass |
| Manual run | `npm run dev:desktop` (repo root) | app opens |

## Scope

**In scope**:
- `packages/desktop/electron/main.ts` (the unsaved-changes `close` handler only)
- `plans/README.md` (status row)

**Out of scope**:
- The bounds-persisting `close` handler (main.ts:141–153) — correct as is (it's synchronous).
- `App.tsx` — the renderer side (`__hasUnsavedChanges`, `save-before-close` listener, `forceCloseWindow()` call after save) already supports this flow; don't change it.
- `handlers/misc.ts` `force-close-window` — unchanged.
- macOS app-quit semantics beyond what the current code does (Cmd+Q routes through window close here; don't redesign quit).

## Git workflow

- Branch: `advisor/019-fix-close-guard`
- Commit: one commit, e.g. `fix: preventDefault synchronously in unsaved-changes close guard`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Restructure the close handler — prevent first, decide later

Replace the handler at main.ts:156–189 with a synchronous-preventDefault
version. The shape (no semicolons, match surrounding style):

```ts
  // Handle close with unsaved changes warning.
  // e.preventDefault() must run synchronously — Electron evaluates it when the
  // listener returns at its first await. So: always prevent, then decide
  // asynchronously and re-close via the forceCloseWindow path.
  mainWindow.on('close', (e) => {
    if (forceCloseWindow) {
      forceCloseWindow = false
      return
    }

    e.preventDefault()

    void (async () => {
      const hasUnsavedChanges = await mainWindow?.webContents.executeJavaScript(
        'window.__hasUnsavedChanges ? window.__hasUnsavedChanges() : false'
      ).catch(() => false)

      if (!hasUnsavedChanges) {
        forceCloseWindow = true
        mainWindow?.close()
        return
      }

      const { response } = await dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        buttons: ['Save & Close', 'Discard & Close', 'Cancel'],
        defaultId: 2,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes.',
        detail: 'Do you want to save your changes before closing?'
      })

      if (response === 0) {
        mainWindow?.webContents.send('save-before-close')
      } else if (response === 1) {
        forceCloseWindow = true
        mainWindow?.close()
      }
      // response === 2: Cancel — window stays open (already prevented)
    })()
  })
```

Notes:
- The clean-close path (no unsaved changes) now goes through
  `forceCloseWindow = true; close()` — the bounds-persisting handler
  (lines 141–153) fires again on that second close event; it is idempotent
  (just re-reads bounds and writes to the store), so that's fine.
- Guard against `mainWindow` being null inside the async block (it can be
  destroyed while awaiting): if `mainWindow?.isDestroyed()` is true, bail out.
  Add that check before `showMessageBox`.

**Verify**: `npm run typecheck` → exit 0; `cd packages/desktop && npm run lint` → exit 0

### Step 2: Regression-check the automated suites

The close flow has no unit test (it lives in `createWindow`, which isn't
DI-testable today — do NOT refactor it for testability in this plan). Run the
E2E suite to confirm app launch/close still works:

**Verify**: `cd packages/desktop && npm run test && npm run test:e2e` → all pass

### Step 3: Manual verification (required — record results in your report)

Run `npm run dev:desktop` and check all four paths:

1. Load an image (drag any JPG in), edit a field (e.g. ISO), close the
   window → dialog appears AND the window is still open behind it.
2. Choose **Cancel** → window stays open.
3. Close again, choose **Discard & Close** → window closes.
4. Relaunch, edit a field, close, choose **Save & Close** → save runs, then
   window closes. (Note: before plan 018 lands, a quirk exists where saved
   images still count as "unsaved" — unrelated to this plan.)
5. With NO edits pending: close → window closes immediately, no dialog.

**Verify**: all five behaviors observed.

## Test plan

Covered by Step 2 (existing suites as regression net) + Step 3 (manual
matrix). No new automated tests — the handler is not unit-testable without a
createWindow refactor, which is explicitly out of scope.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `cd packages/desktop && npm run lint` exits 0
- [ ] `cd packages/desktop && npm run test` exits 0
- [ ] `cd packages/desktop && npm run test:e2e` exits 0
- [ ] In main.ts, the unsaved-changes close listener is NOT declared `async`, and `e.preventDefault()` appears before any `await`-containing block: `grep -n "mainWindow.on('close'" packages/desktop/electron/main.ts` → 2 matches, neither of the listener callbacks is `async (e)`
- [ ] Manual matrix (Step 3) reported with all five results
- [ ] `git status` shows only main.ts (+ plans/README.md) modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The close handler at main.ts:156 doesn't match the excerpt (drift).
- After the change, the app cannot be closed at all in the no-changes case
  (a `forceCloseWindow` re-entry bug) — report with the observed behavior
  rather than adding more flags.
- E2E tests fail on window lifecycle in a way you can't attribute to your
  change within one fix attempt.

## Maintenance notes

- Anyone adding another `close` listener must keep the invariant: nothing may
  `await` before `preventDefault()` in a listener that intends to block close.
- If the app ever becomes multi-window, the module-level `forceCloseWindow`
  boolean must become per-window state.
- Reviewer: confirm the `isDestroyed()` guard exists in the async block and
  that Cancel leaves no stuck `forceCloseWindow = true` state.
