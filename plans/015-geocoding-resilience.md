# Plan 015: Geocoding resilience — request queue, result cache, rate-limit feedback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command. On any STOP condition, stop and report. When done,
> update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 217c979..HEAD -- packages/desktop/electron/geocoding.ts packages/desktop/electron/__tests__/geocoding.test.ts`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (006 helpful for types)
- **Category**: direction
- **Planned at**: commit `217c979`, 2026-06-11

## Why this matters

Location tagging uses OpenStreetMap Nominatim, which mandates 1 request/second. The current implementation enforces a simple inter-request delay but: concurrent callers all sleep then fire together (the `lastRequestTime` read-then-set race), there's no caching (re-typing "Paris" re-queries), no handling of HTTP 429/503 from Nominatim, and no offline/failed-state surfaced to the user beyond a thrown error. Film batches are exactly the workload that hits this: tagging 30 frames across 3 locations should cost 3 lookups, not 30 serialized seconds or a silent failure.

## Current state

- `packages/desktop/electron/geocoding.ts` (149 lines) — `NOMINATIM_BASE`, `RATE_LIMIT_MS = 1000`, `USER_AGENT = 'ScanCorrect/1.0'`, `MAX_RESULTS = 5`. The limiter:

```ts
let lastRequestTime = 0

async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const delay = RATE_LIMIT_MS - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  lastRequestTime = Date.now()
}
```

  Race: two concurrent calls both compute the same delay, both wake, both fire — 2 req/s. Then `geocodeLocation(query)` (and presumably a reverse-geocode function — read the rest of the file) fetch and map results; read lines 60–149 for the exact fetch/error handling before changing it.
- Existing tests: `packages/desktop/electron/__tests__/geocoding.test.ts` — read it; it shows the established mocking approach for `fetch` and timing. Extend, don't replace.
- Call sites: `geocode-location` IPC handler (main.ts at 217c979, `handlers/locations.ts` post-007) → preload `geocodeLocation` → renderer (`App.tsx` and `BulkLocationModal.tsx` / location components — `grep -rn geocodeLocation packages/desktop/src` to enumerate).
- Saved-locations + history already exist (electron-store) — the cache here is a separate, internal lookup cache, not user-facing data.

## Design (decided)

1. **Serial queue limiter**: replace `enforceRateLimit` with a promise-chain queue (`let chain = Promise.resolve()`; each request appends `chain = chain.then(run)` with a ≥1100 ms spacing between *completions of scheduling*, tracked inside the chain). Guarantees ≤1 in-flight and ≥1.1 s spacing under any concurrency.
2. **LRU result cache**: normalize the query (`trim().toLowerCase()`), cache up to 100 entries in-memory with insertion-order Map eviction. Reverse geocoding caches on rounded coords (4 decimals ≈ 11 m). In-memory only — no store persistence (results go stale; saved-locations already covers durable reuse).
3. **Retry + typed failure**: on 429/503 or network error, retry once after 2 s; then return a typed result the UI can show. Change the handler's return shape to `{ results: GeocodingResult[] } | { error: 'rate-limited' | 'offline' | 'failed' }` — and update the renderer call sites to show a small inline message ("Nominatim is rate-limiting, retrying shortly" / "No connection") instead of whatever happens today on a throw (read the call sites to see current error handling and keep the UX minimal).

## Commands you will need

| Purpose | Command (packages/desktop) | Expected |
|---|---|---|
| Unit tests | `npx vitest run electron/__tests__/geocoding.test.ts` | pass |
| Full suite | `npm run test` | pass |
| Typecheck | `npm run typecheck` + `npx tsc -p electron --noEmit` | exit 0 |

## Scope

**In scope**:
- `packages/desktop/electron/geocoding.ts`, its test file, the `geocode-location`/reverse handler + `ipc-types.ts` + `preload.ts` (return-shape change)
- Renderer call sites of `geocodeLocation`/reverse (error display only — minimal UI)
- `src/__tests__/setup.ts` mock shape update

**Out of scope**:
- Switching providers, Mapbox-based geocoding fallback, offline map tiles, persisting the lookup cache, batch-geocode endpoints.

## Git workflow

- Branch: `advisor/015-geocoding-resilience`
- Commits: (1) limiter+cache+retry in geocoding.ts with tests, (2) IPC shape + renderer messaging.

## Steps

### Step 1: Rework geocoding.ts

Implement Design 1–3 inside the module (the queue and cache are module-level, mirroring the current `lastRequestTime` style — flat functions, no classes). Use `vi.useFakeTimers()` in tests for the spacing assertions.

Tests to add (extend `geocoding.test.ts`, matching its existing mock style):
- two concurrent `geocodeLocation` calls → fetch invoked twice with ≥1.1 s spacing (fake timers).
- same query twice → one fetch (cache hit); 101 distinct queries → first evicted.
- fetch 429 → one retry after 2 s → success path returns results.
- 429 twice → `{ error: 'rate-limited' }`; network rejection ×2 → `{ error: 'offline' }`.

**Verify**: `npx vitest run electron/__tests__/geocoding.test.ts` → all pass (old + new).

### Step 2: Propagate the result shape

Update handler, ipc-types, preload, setup.ts mock, and each renderer call site. Keep renderer changes to: map `{ error }` to a one-line status message in the location search UI; no new components.

**Verify**: `npm run typecheck` (root) exit 0; `npm run test` pass; `npm run test:e2e` pass.

## Test plan

Step 1's six unit cases + existing geocoding tests + e2e suite green. Manual (optional): in dev, search a location twice and observe (via main-process console log) a single network hit.

## Done criteria

- [ ] Concurrency test proves ≤1 req per 1.1 s under parallel calls
- [ ] Cache + eviction + retry + typed-error tests pass
- [ ] All call sites compile against the new shape; suites green
- [ ] `plans/README.md` updated

## STOP conditions

- The live geocoding.ts (lines 60–149) does response handling materially different from what Design 3 assumes (e.g. it already retries) — reconcile first; if the existing tests encode contradictory behavior, report.
- Renderer error-display turns into >~30 lines of UI change — the UI half is the deprioritizable half; land the module half, report the rest.

## Maintenance notes

- If users hit limits anyway, next steps are: persisting the cache, batching identical bulk-modal queries, or a Mapbox geocoding fallback using the existing token setting (the `mapbox.ts` module already exists).
- Nominatim policy also requires a valid User-Agent — already set; keep it on any new request path.
