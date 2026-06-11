/**
 * Nominatim geocoding service for ScanCorrect
 *
 * Provides forward and reverse geocoding using OpenStreetMap's Nominatim API.
 * Implements rate limiting (1 request per second) as required by Nominatim's usage policy.
 * Uses a serial promise-queue limiter to guarantee ≤1 in-flight request and ≥1.1 s spacing.
 * Caches results in-memory (LRU, up to 100 entries) to avoid redundant lookups.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const RATE_LIMIT_MS = 1100
const RETRY_DELAY_MS = 2000
const USER_AGENT = 'ScanCorrect/1.0'
const MAX_RESULTS = 5
const CACHE_MAX_SIZE = 100

export interface GeocodingResult {
  displayName: string
  latitude: number
  longitude: number
  type: string
}

export type GeocodingResponse = GeocodingResult[] | { error: 'rate-limited' | 'offline' | 'failed' }
export type ReverseGeocodingResponse = GeocodingResult | null | { error: 'rate-limited' | 'offline' | 'failed' }

interface NominatimSearchResult {
  display_name: string
  lat: string
  lon: string
  type: string
}

interface NominatimReverseResult {
  display_name: string
  lat: string
  lon: string
  type?: string
  address?: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

// ── Serial queue limiter ──────────────────────────────────────────────────────
// Each call appends to the chain, ensuring requests fire one at a time with
// at least RATE_LIMIT_MS between completions.
let chain: Promise<void> = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = chain.then(fn)
  // Advance the chain only after the delay — the next queued call will wait
  // for this promise, which resolves RATE_LIMIT_MS after fn resolves/rejects.
  chain = result.then(
    () => new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS)),
    () => new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
  )
  return result
}

// ── LRU cache (insertion-order Map eviction) ──────────────────────────────────
const cache = new Map<string, GeocodingResult[] | GeocodingResult | null>()

function cacheGet(key: string): GeocodingResult[] | GeocodingResult | null | undefined {
  if (!cache.has(key)) return undefined
  // Refresh insertion order for LRU
  const value = cache.get(key)!
  cache.delete(key)
  cache.set(key, value)
  return value
}

/** Reset queue and cache. For use in tests only. */
export function _resetForTesting(): void {
  chain = Promise.resolve()
  cache.clear()
}

function cacheSet(key: string, value: GeocodingResult[] | GeocodingResult | null): void {
  if (cache.size >= CACHE_MAX_SIZE) {
    // Evict oldest entry
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, value)
}

// ── HTTP helper with one retry on 429/503/network error ─────────────────────
async function fetchWithRetry(url: string): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  } catch {
    // Network error — retry once after RETRY_DELAY_MS
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    try {
      response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    } catch {
      throw new Error('offline')
    }
    return response
  }

  if (response.status === 429 || response.status === 503) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    let retry: Response
    try {
      retry = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    } catch {
      throw new Error('offline')
    }
    if (retry.status === 429 || retry.status === 503) {
      throw new Error('rate-limited')
    }
    return retry
  }

  return response
}

export async function geocodeLocation(query: string): Promise<GeocodingResponse> {
  if (!query || query.trim().length === 0) {
    return []
  }

  const key = query.trim().toLowerCase()
  const cached = cacheGet(key)
  if (cached !== undefined) {
    return cached as GeocodingResult[]
  }

  return enqueue(async () => {
    // Check again inside the queue in case a concurrent call just populated it
    const hit = cacheGet(key)
    if (hit !== undefined) return hit as GeocodingResult[]

    const url = new URL(`${NOMINATIM_BASE}/search`)
    url.searchParams.set('q', query.trim())
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', String(MAX_RESULTS))

    let response: Response
    try {
      response = await fetchWithRetry(url.toString())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed'
      if (msg === 'rate-limited') return { error: 'rate-limited' as const }
      if (msg === 'offline') return { error: 'offline' as const }
      return { error: 'failed' as const }
    }

    if (!response.ok) {
      return { error: 'failed' as const }
    }

    const raw = (await response.json()) as NominatimSearchResult[]
    const results: GeocodingResult[] = raw.map(r => ({
      displayName: r.display_name,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      type: r.type
    }))

    cacheSet(key, results)
    return results
  })
}

function roundCoord(n: number): number {
  return Math.round(n * 10000) / 10000
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodingResponse> {
  if (!isFinite(latitude) || !isFinite(longitude)) {
    return null
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90')
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180')
  }

  const key = `rev:${roundCoord(latitude)},${roundCoord(longitude)}`
  const cached = cacheGet(key)
  if (cached !== undefined) {
    return cached as GeocodingResult | null
  }

  return enqueue(async () => {
    const hit = cacheGet(key)
    if (hit !== undefined) return hit as GeocodingResult | null

    const url = new URL(`${NOMINATIM_BASE}/reverse`)
    url.searchParams.set('lat', String(latitude))
    url.searchParams.set('lon', String(longitude))
    url.searchParams.set('format', 'json')

    let response: Response
    try {
      response = await fetchWithRetry(url.toString())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed'
      if (msg === 'rate-limited') return { error: 'rate-limited' as const }
      if (msg === 'offline') return { error: 'offline' as const }
      return { error: 'failed' as const }
    }

    if (!response.ok) {
      if (response.status === 404) {
        cacheSet(key, null)
        return null
      }
      return { error: 'failed' as const }
    }

    const result = (await response.json()) as NominatimReverseResult

    if (!result || !result.display_name) {
      cacheSet(key, null)
      return null
    }

    const geo: GeocodingResult = {
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type || 'unknown'
    }

    cacheSet(key, geo)
    return geo
  })
}
