/**
 * Nominatim geocoding service for ScanCorrect
 *
 * Provides forward and reverse geocoding using OpenStreetMap's Nominatim API.
 * Implements rate limiting (1 request per second) as required by Nominatim's usage policy.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const RATE_LIMIT_MS = 1000
const USER_AGENT = 'ScanCorrect/1.0'
const MAX_RESULTS = 5

let lastRequestTime = 0

export interface GeocodingResult {
  displayName: string
  latitude: number
  longitude: number
  type: string
}

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

async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const delay = RATE_LIMIT_MS - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  lastRequestTime = Date.now()
}

export async function geocodeLocation(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length === 0) {
    return []
  }

  await enforceRateLimit()

  const url = new URL(`${NOMINATIM_BASE}/search`)
  url.searchParams.set('q', query.trim())
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(MAX_RESULTS))

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT
      }
    })

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`)
    }

    const results = (await response.json()) as NominatimSearchResult[]

    return results.map((result): GeocodingResult => ({
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type
    }))
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Geocoding failed: ${error.message}`)
    }
    throw new Error('Geocoding failed: Unknown error')
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  if (!isFinite(latitude) || !isFinite(longitude)) {
    return null
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90')
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180')
  }

  await enforceRateLimit()

  const url = new URL(`${NOMINATIM_BASE}/reverse`)
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('format', 'json')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Reverse geocoding request failed: ${response.status} ${response.statusText}`)
    }

    const result = (await response.json()) as NominatimReverseResult

    if (!result || !result.display_name) {
      return null
    }

    return {
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type || 'unknown'
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`)
    }
    throw new Error('Reverse geocoding failed: Unknown error')
  }
}
