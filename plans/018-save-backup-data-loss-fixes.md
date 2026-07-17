# Plan 018: Stop the save/backup flow from destroying originals and lying about restores

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2d58d27..HEAD -- packages/desktop/src/App.tsx packages/desktop/electron/exif.ts packages/desktop/electron/handlers/exif-handlers.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (data loss)
- **Planned at**: commit `2d58d27`, 2026-07-17

## Why this matters

ScanCorrect's whole promise is "your originals are safe — every write is
backed up." Four bugs currently break that promise:

1. **Saving twice destroys the pristine backup.** A successful save never
   clears the image's `pendingChanges`, so the UI keeps reporting unsaved
   changes and invites a second save. The second write backs up the
   *already-modified* file to the same deterministic backup path
   (sha256 of the file path), overwriting the pristine original via
   `fs.rename`. Restore-to-original is then permanently impossible.
2. **Undo lies on failure.** The `restore-backup` IPC handler ignores
   `restoreFromBackup`'s boolean return (it returns `false` on failure — it
   never throws), so the renderer always sees `{ success: true }`, deletes
   the processing-log entry, and the user loses their only retry affordance.
3. **`backupPath` is the one renderer-supplied path that skips validation.**
   Every other fs/exiftool-reaching handler calls `assertAbsolutePath`;
   `restore-backup` validates `filePath` but not `backupPath`.
4. **One bad path fails a whole batch read.** In `read-exif-batch`,
   `assertAbsolutePath` runs *outside* the per-file try/catch inside a
   `Promise.all`, so a single invalid path rejects the entire batch; the
   caller in `App.tsx` has no catch, so an entire drop loads with no
   metadata.

## Current state

Relevant files:

- `packages/desktop/src/App.tsx` — all app state (images, pendingChanges) lives here in `useState`; the save loop is `handleSaveChanges` (lines 456–535).
- `packages/desktop/electron/exif.ts` — `writeExifData` backup move at lines 234–256; `getBackupPath` (deterministic sha256 path) at lines 13–17; `moveFile` (rename, overwrites) at lines 23–34; `restoreFromBackup` at lines 272–327 returns `boolean`, never throws.
- `packages/desktop/electron/handlers/exif-handlers.ts` — IPC handlers; `read-exif-batch` at lines 59–73, `restore-backup` at lines 168–176.
- `packages/desktop/electron/handlers/guard.ts` — `assertAbsolutePath(p)` throws on non-absolute or NUL-containing paths.

`App.tsx:491–501` — success branch never clears `pendingChanges`:

```tsx
        setImages((prev) =>
          prev.map((img) =>
            img.path === image.path
              ? {
                  ...img,
                  status: writeResult.success ? "success" : "error",
                  error: writeResult.error,
                }
              : img
          )
        );
```

(`pendingChanges` is cleared only in `handleDiscardChanges`, App.tsx:580–589,
which sets `pendingChanges: {}`. The unsaved-changes indicator
`window.__hasUnsavedChanges`, App.tsx:165–169, and the `imagesWithChanges`
counter, App.tsx:592–594, both key off non-empty `pendingChanges`.)

`exif.ts:234–240` — second save clobbers the pristine backup:

```ts
    if (keepBackup) {
      const exiftoolBackup = `${filePath}_original`
      const destBackupPath = getBackupPath(filePath)
      await ensureBackupDir()
      try {
        await moveFile(exiftoolBackup, destBackupPath)
        return { success: true, backupPath: destBackupPath }
```

`exif-handlers.ts:59–73` — assert outside the per-file try:

```ts
  ipcMain.handle('read-exif-batch', async (_, filePaths: string[]): Promise<ExifBatchResult> => {
    const entries = await Promise.all(
      filePaths.map(async (filePath) => {
        assertAbsolutePath(filePath)
        try {
          const data = await readExifData(exiftool, filePath)
          ...
```

`exif-handlers.ts:168–176` — restore result dropped, backupPath unvalidated:

```ts
  ipcMain.handle('restore-backup', async (_, filePath: string, backupPath: string): Promise<{ success: boolean; error?: string }> => {
    assertAbsolutePath(filePath)
    try {
      await restoreFromBackup(filePath, backupPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error restoring backup' }
    }
  })
```

Conventions: `electron/` = no semicolons; `src/` = semicolons (Prettier-ish).
Handler tests live in `packages/desktop/electron/__tests__/handlers-exif.test.ts`
(existing `restore-backup` tests at lines 210–235 — follow their DI/mock
style). exif unit tests in `electron/__tests__/exif.test.ts` (backup/restore
suite at lines 363–511).

## Commands you will need

⚠️ The default shell on this machine may resolve to Node 14. Every command
chain must first run:
`export PATH="$HOME/.nvm/versions/node/v22.15.1/bin:$PATH"`

| Purpose | Command (repo root unless noted) | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `cd packages/desktop && npm run test` | all pass |
| Lint | `cd packages/desktop && npm run lint` | exit 0 |
| Integration (optional, slower) | `cd packages/desktop && npm run test:integration` | all pass |

## Scope

**In scope**:
- `packages/desktop/src/App.tsx` (the save-success branch only)
- `packages/desktop/electron/exif.ts` (`writeExifData` backup block only)
- `packages/desktop/electron/handlers/exif-handlers.ts` (`read-exif-batch`, `restore-backup`)
- `packages/desktop/electron/__tests__/exif.test.ts`, `handlers-exif.test.ts`
- `plans/README.md` (status row)

**Out of scope**:
- `packages/desktop/src/store/imageStore.ts` — it's currently dead code (nothing outside tests imports it); do not wire it up here.
- The close-with-unsaved-changes flow in `electron/main.ts` — plan 019.
- `restoreFromBackup` internals in exif.ts (lines 272–327) — its rollback logic is correct and well-tested; only its *callers* change.
- preload.ts / IPC channel names / response shapes — unchanged contract.

## Git workflow

- Branch: `advisor/018-save-backup-data-loss`
- Commit per step; short imperative messages (`fix: clear pendingChanges after successful save`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Clear `pendingChanges` on successful save

In `App.tsx` `handleSaveChanges`, in the success-path `setImages` (lines
491–501), when `writeResult.success` is true also reset the changes:

```tsx
              ? {
                  ...img,
                  status: writeResult.success ? "success" : "error",
                  error: writeResult.error,
                  pendingChanges: writeResult.success ? {} : img.pendingChanges,
                }
```

This automatically fixes the stale "unsaved changes" indicator
(`__hasUnsavedChanges`) and the `imagesWithChanges` counter, both of which
derive from `pendingChanges`.

**Verify**: `npm run typecheck` → exit 0; `cd packages/desktop && npm run lint` → exit 0

### Step 2: Never overwrite an existing backup in `writeExifData`

In `exif.ts` lines 234–240: before `moveFile`, check whether
`destBackupPath` already exists. If it does, the pristine first-save backup
is authoritative — delete the fresh exiftool `_original` (it's a copy of the
already-modified file) and return the existing backup path:

```ts
    if (keepBackup) {
      const exiftoolBackup = `${filePath}_original`
      const destBackupPath = getBackupPath(filePath)
      await ensureBackupDir()
      const backupAlreadyExists = await fs.access(destBackupPath).then(() => true, () => false)
      if (backupAlreadyExists) {
        try {
          await fs.unlink(exiftoolBackup)
        } catch {
          // best-effort cleanup; the authoritative backup is already in place
        }
        return { success: true, backupPath: destBackupPath }
      }
      try {
        await moveFile(exiftoolBackup, destBackupPath)
        ...
```

Keep the existing catch/fallback logic below unchanged. No semicolons.

**Verify**: `cd packages/desktop && npm run test -- exif` → existing exif tests pass

### Step 3: Propagate restore failures and validate `backupPath`

Replace the `restore-backup` handler body (exif-handlers.ts:168–176):

```ts
  ipcMain.handle('restore-backup', async (_, filePath: string, backupPath: string): Promise<{ success: boolean; error?: string }> => {
    assertAbsolutePath(filePath)
    assertAbsolutePath(backupPath)
    try {
      const ok = await restoreFromBackup(filePath, backupPath)
      return ok
        ? { success: true }
        : { success: false, error: 'Restore failed — the backup file may be missing or unreadable' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error restoring backup' }
    }
  })
```

Deliberate design note: do NOT constrain `backupPath` to the app backup
directory — `writeExifData`'s fallback path (exif.ts:242–248) legitimately
returns `${filePath}_original` (next to the image) as `backupPath` when the
move to the backup dir fails, and old processing-log entries may carry such
paths. Absolute+no-NUL validation matches the rest of the IPC surface.

The renderer already handles `success: false` correctly (`handleUndo`,
App.tsx:554–559, shows an alert and keeps the log entry) — no renderer change.

**Verify**: `cd packages/desktop && npm run test -- handlers-exif` → pass

### Step 4: Make `read-exif-batch` fail per-file, not per-batch

Move the assertion inside the try (exif-handlers.ts:59–73):

```ts
      filePaths.map(async (filePath) => {
        try {
          assertAbsolutePath(filePath)
          const data = await readExifData(exiftool, filePath)
          const isScanner = isLikelyScannerMetadata(data.make, data.model)
          return [filePath, { data, isScanner }] as const
        } catch (error) {
          return [filePath, { error: error instanceof Error ? error.message : 'Unknown error reading EXIF data' }] as const
        }
      })
```

**Verify**: `cd packages/desktop && npm run test -- handlers-exif` → pass

### Step 5: Tests

Add to `electron/__tests__/exif.test.ts` (model on the existing
`restoreFromBackup` suite at lines 389–478, which uses real temp dirs):

1. `writeExifData` with an existing backup at `getBackupPath(file)`: after a
   second write, the backup file's contents still equal the ORIGINAL
   contents (not the modified ones), and the returned `backupPath` is the
   existing backup.
2. The second write's `${filePath}_original` litter file is removed.

Add to `electron/__tests__/handlers-exif.test.ts` (model on lines 210–235):

3. `restore-backup` returns `{ success: false, error: ... }` when
   `restoreFromBackup` resolves `false` (mock it to return false).
4. `restore-backup` rejects/errors on a relative `backupPath`.
5. `read-exif-batch` with `['relative.jpg', '/absolute/good.jpg']` resolves
   (does not reject) and returns an `{ error }` entry for the relative path
   and a data entry for the good one.

**Verify**: `cd packages/desktop && npm run test` → all pass including 5 new tests

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `cd packages/desktop && npm run lint` exits 0
- [ ] `cd packages/desktop && npm run test` exits 0; the 5 new tests exist and pass
- [ ] `grep -n "pendingChanges: writeResult.success" packages/desktop/src/App.tsx` → 1 match
- [ ] `grep -n "assertAbsolutePath(backupPath)" packages/desktop/electron/handlers/exif-handlers.ts` → 1 match
- [ ] In `exif-handlers.ts`, `assertAbsolutePath(filePath)` inside `read-exif-batch` appears AFTER the `try {` line
- [ ] `git status` shows no files modified outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `handleSaveChanges` in App.tsx no longer matches the excerpt (e.g. someone
  migrated state to `imageStore`) — the fix location moves.
- `restoreFromBackup` has been changed to throw instead of returning
  `false` — Step 3's mapping would double-report.
- Any existing exif/handler test fails after Step 2 in a way that suggests
  the backup no-clobber check breaks the EXDEV fallback path
  (exif.test.ts:504–511) — report rather than weakening the check.

## Maintenance notes

- Step 2 establishes **first-save-wins backup semantics**: the backup always
  holds the file as it was before ScanCorrect's FIRST write. If a future
  feature wants "backup = state before the most recent save", that's a
  product decision requiring versioned backup paths — don't silently flip.
- If app state ever migrates from App.tsx `useState` to the (currently dead)
  Zustand `imageStore`, port the clear-on-success behavior — the store's
  `discardImageChanges` already does the equivalent.
- Reviewer: check the second-save test actually asserts on file CONTENTS,
  not just existence — that's the regression that matters.
