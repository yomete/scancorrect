# Plan 020: Correct GPX time-matching across timezones (camera-clock offset support)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2d58d27..HEAD -- packages/desktop/electron/gpx.ts packages/desktop/electron/handlers/gpx-handlers.ts packages/desktop/src/components/GPXImport packages/desktop/electron/preload.ts packages/desktop/electron/ipc-types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (changes matching semantics for a paid feature; default must preserve current behavior)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2d58d27`, 2026-07-17

## Why this matters

GPX matching pairs photos to GPS track points by timestamp. Photo timestamps
come from EXIF `DateTimeOriginal`, which has **no timezone** — it's the camera
wall clock. The matcher parses that zone-less string with `new Date(...)`,
which interprets it in the **machine's local timezone**, while GPX `<time>`
values carry `Z`/offsets and parse as UTC. So matching is only correct when
the photo was shot in the same UTC offset the user's machine is in at scan
time. The core film workflow — travel photos scanned back at home — is off by
(capture offset − home offset) hours; with the default 60-second tolerance,
that means wrong GPS coordinates written to files or blanket `no_match`. A DST
boundary between capture and scan shifts everything by another hour.

The fix, standard in photo tools (Lightroom's approach): let the user state
the **camera clock's UTC offset** in the GPX import modal, default "same as
this computer" (today's behavior, so nothing silently changes for home
scans), and use it to convert photo wall-clock times to UTC before comparing.

## Current state

Relevant files:

- `packages/desktop/electron/gpx.ts` — `parseGPX` (points sorted at line 130; timestamps kept as ISO strings from `<time>`, line 110) and `matchPhotosToGPX(track, images, toleranceSeconds = 60)` (lines 143–~210).
- `packages/desktop/electron/handlers/gpx-handlers.ts` — IPC registration for `parse-gpx` / `match-photos-gpx` (thin passthroughs).
- `packages/desktop/electron/preload.ts` — `matchPhotosToGPX(track, images, tolerance)` bridge.
- `packages/desktop/electron/ipc-types.ts` — shared IPC types (`GPXTrack`, `GPXMatchResult`, …).
- `packages/desktop/src/components/GPXImport/GPXImportModal.tsx` — modal; builds `imagesToMatch` from `img.dateTimeOriginal` (lines 72–75), calls `window.electronAPI.matchPhotosToGPX(track, imagesToMatch, tolerance)` (lines 77–81); already has a `tolerance` control.
- `packages/desktop/electron/exif.ts:136–149` — produces `dateTimeOriginal` as zone-less `YYYY-MM-DDTHH:MM:SS`.
- `packages/desktop/electron/__tests__/gpx.test.ts` — existing matcher tests; all timestamps are `Z`-suffixed or same-zone (no cross-offset/DST cases).

`gpx.ts:160` and `:177` — the naive comparison:

```ts
    const imageTime = new Date(image.timestamp).getTime()   // zone-less → parsed as machine-LOCAL
    ...
      const pointTime = new Date(point.timestamp).getTime() // "...Z" → parsed as UTC
```

Conventions: `electron/` = no semicolons. IPC types live in
`electron/ipc-types.ts` and are re-exported where needed; preload exposes
typed methods on `window.electronAPI`. UI selects in the modal follow the
existing tolerance control's style (read GPXImportModal.tsx before editing).

## Commands you will need

⚠️ The default shell on this machine may resolve to Node 14. Prefix command
chains with: `export PATH="$HOME/.nvm/versions/node/v22.15.1/bin:$PATH"`

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` (repo root) | exit 0 |
| Unit tests | `cd packages/desktop && npm run test -- gpx` | all pass |
| Full unit suite | `cd packages/desktop && npm run test` | all pass |
| Lint | `cd packages/desktop && npm run lint` | exit 0 |

## Scope

**In scope**:
- `packages/desktop/electron/gpx.ts` (matcher signature + time normalization)
- `packages/desktop/electron/handlers/gpx-handlers.ts` (pass new param)
- `packages/desktop/electron/preload.ts` (bridge signature)
- `packages/desktop/electron/ipc-types.ts` (if the electronAPI type interface lives here or in preload — follow where `matchPhotosToGPX` is typed)
- `packages/desktop/src/components/GPXImport/GPXImportModal.tsx` (offset select)
- `packages/desktop/electron/__tests__/gpx.test.ts`, `handlers-gpx.test.ts`
- `plans/README.md` (status row)

**Out of scope**:
- `packages/desktop/electron/exif.ts` — do NOT change how `dateTimeOriginal`
  is read or written; the zone-less wall-clock string is the correct raw datum.
- Persisting the chosen offset (electron-store) — nice-to-have, deferred.
- Auto-detecting timezone from track geometry — deferred (see Maintenance).
- The GPS-write flow after matching — unchanged.

## Git workflow

- Branch: `advisor/020-gpx-timezone`
- Commit per step; e.g. `feat: camera UTC-offset support in GPX matching`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add offset-aware time parsing to the matcher

In `gpx.ts`, extend the signature:

```ts
export function matchPhotosToGPX(
  track: GPXTrack,
  images: Array<{ path: string; timestamp: string }>,
  toleranceSeconds: number = 60,
  cameraUtcOffsetMinutes?: number | null
): GPXMatchResult[]
```

Semantics:
- `cameraUtcOffsetMinutes == null` (undefined/null) → current behavior:
  `new Date(image.timestamp).getTime()` (machine-local interpretation).
  This is the compatibility default.
- Otherwise → interpret the zone-less wall-clock as that fixed offset:

```ts
function wallClockToUtcMs(timestamp: string, offsetMinutes: number): number {
  // timestamp is zone-less "YYYY-MM-DDTHH:MM:SS" camera wall clock.
  // Date.parse(ts + 'Z') gives the instant as if the wall clock were UTC;
  // subtracting the offset yields the true UTC instant.
  const asUtc = Date.parse(`${timestamp}Z`)
  return asUtc - offsetMinutes * 60_000
}
```

(A camera at UTC+9 showing 10:00 means 01:00 UTC: `asUtc` = 10:00Z, minus
540 min = 01:00Z. Correct.) If `timestamp` already contains a `Z` or an
explicit offset (defensive), fall back to plain `Date.parse(timestamp)`.
Guard: if the input already fails to parse (NaN), keep the existing
`no_match` path (gpx.ts:162–169) untouched.

GPX point times (`point.timestamp`) keep their existing parsing — they carry
explicit zones.

**Verify**: `cd packages/desktop && npm run test -- gpx` → existing tests still pass (default path unchanged)

### Step 2: Thread the parameter through IPC

- `handlers/gpx-handlers.ts`: accept and forward the 4th argument on the
  `match-photos-gpx` channel (open the file, mirror how `tolerance` flows).
- `preload.ts`: extend `matchPhotosToGPX` in both the exposed implementation
  and the `ElectronAPI` type: `(track, images, tolerance?, cameraUtcOffsetMinutes?)`.
- If the renderer's `ElectronAPI` type is declared elsewhere (check
  `src/types.ts` / `vite-env.d.ts` for a duplicate declaration), update it
  too — typecheck will tell you.

**Verify**: `npm run typecheck` → exit 0

### Step 3: Add the offset control to the GPX modal

In `GPXImportModal.tsx`, next to the existing tolerance control (find it in
the `configure` step UI), add a select labeled **"Camera clock timezone"**:

- Default option: `Same as this computer` → passes `null`.
- Options `UTC−12:00` … `UTC+14:00` in 30-minute steps is overkill; use
  whole hours −12…+14 plus the common half-hours (+5:30, +9:30) — value in
  minutes.
- State: `const [cameraOffset, setCameraOffset] = useState<number | null>(null)`.
- Pass it as the 4th arg in the `matchPhotosToGPX` call (lines 77–81).
- Style: copy the existing tolerance select/input's classNames exactly.

**Verify**: `npm run typecheck` → exit 0; `cd packages/desktop && npm run lint` → exit 0

### Step 4: Tests

In `electron/__tests__/gpx.test.ts` (follow existing test structure), add a
`describe('camera UTC offset', ...)`:

1. **Cross-offset match**: photo wall-clock `2024-06-15T10:00:00`, camera
   offset +540 (UTC+9); track point at `2024-06-15T01:00:10Z` → matches with
   `exact`/near confidence (10s diff).
2. **Same data, no offset param**: behavior depends on machine TZ — assert
   only that it does NOT throw and returns a result array (don't assert
   confidence; CI machines vary). Add a comment explaining why.
3. **Negative offset**: offset −300 (UTC−5), photo `2024-06-15T10:00:00`,
   point `2024-06-15T15:00:00Z` → match.
4. **Half-hour offset**: +330 (UTC+5:30) case.
5. **DST irrelevance**: fixed offsets don't observe DST — assert two photos
   on either side of a DST boundary (e.g. 2024-03-10 US) with offset −480
   map to instants exactly `wallclock + 8h` in UTC (no 1-hour jump).
6. **Already-zoned timestamp defensive fallback**: timestamp
   `2024-06-15T10:00:00Z` with offset +540 → parsed as UTC (offset ignored).

In `handlers-gpx.test.ts`: one test that the 4th IPC arg reaches
`matchPhotosToGPX` (mirror existing passthrough tests).

**Verify**: `cd packages/desktop && npm run test` → all pass, including ~7 new tests

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `cd packages/desktop && npm run lint` exits 0
- [ ] `cd packages/desktop && npm run test` exits 0 with the new offset tests present
- [ ] `grep -n "cameraUtcOffsetMinutes" packages/desktop/electron/gpx.ts packages/desktop/electron/preload.ts packages/desktop/src/components/GPXImport/GPXImportModal.tsx` → matches in all three
- [ ] Default behavior unchanged: running only the pre-existing gpx tests passes without modification to their assertions
- [ ] `git status` shows no files modified outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `matchPhotosToGPX` in gpx.ts no longer matches the excerpt (drift).
- You find the `ElectronAPI` type declared in more than two places and they
  disagree — report the duplication instead of adding a third.
- Changing the preload signature breaks e2e tests that stub `electronAPI` —
  report which stub needs the optional param rather than making it required.
- Any pre-existing gpx test would need its ASSERTIONS changed to pass — the
  default path must be behavior-identical; assertion changes mean the
  compatibility default is broken.

## Maintenance notes

- Deferred follow-ups: persist the last-used offset in electron-store;
  auto-suggest an offset from the GPX track's first point longitude
  (±rough); per-image timezone override.
- The `wallClockToUtcMs` helper is the single place wall-clock→UTC semantics
  live; any future EXIF `OffsetTimeOriginal` support should feed it.
- Reviewer: check test 2's comment (machine-TZ-dependent) so nobody later
  "fixes" it into a flaky assertion; confirm the modal default is
  `Same as this computer` so existing users see zero change.
