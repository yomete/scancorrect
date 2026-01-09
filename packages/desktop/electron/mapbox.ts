/**
 * Mapbox reverse geocoding service for ScanCorrect
 *
 * Converts coordinates to place names using Mapbox Geocoding API.
 */

export interface MapboxReverseResult {
  name: string
  latitude: number
  longitude: number
}

interface MapboxFeature {
  place_name: string
  center: [number, number]
  place_type: string[]
}

interface MapboxResponse {
  features: MapboxFeature[]
}

export async function reverseGeocodeMapbox(
  latitude: number,
  longitude: number,
  accessToken: string
): Promise<MapboxReverseResult | null> {
  if (!accessToken) {
    throw new Error('Mapbox access token is required')
  }

  if (!isFinite(latitude) || !isFinite(longitude)) {
    return null
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90')
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180')
  }

  // Mapbox expects longitude,latitude (opposite of most APIs)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${accessToken}&types=place,locality,neighborhood,address&limit=1`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Mapbox access token')
      }
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as MapboxResponse

    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      return {
        name: feature.place_name,
        latitude,
        longitude,
      }
    }

    // Fallback: return coordinates as name
    return {
      name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      latitude,
      longitude,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Mapbox reverse geocoding failed: ${error.message}`)
    }
    throw new Error('Mapbox reverse geocoding failed: Unknown error')
  }
}

/**
 * Forward geocoding using Mapbox - search for places by name
 */
export async function forwardGeocodeMapbox(
  query: string,
  accessToken: string,
  limit: number = 5
): Promise<MapboxReverseResult[]> {
  if (!accessToken) {
    throw new Error('Mapbox access token is required')
  }

  if (!query || query.trim().length === 0) {
    return []
  }

  const encodedQuery = encodeURIComponent(query.trim())
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${accessToken}&limit=${limit}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Mapbox access token')
      }
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as MapboxResponse

    return data.features.map((feature) => ({
      name: feature.place_name,
      latitude: feature.center[1], // Mapbox returns [lng, lat]
      longitude: feature.center[0],
    }))
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Mapbox forward geocoding failed: ${error.message}`)
    }
    throw new Error('Mapbox forward geocoding failed: Unknown error')
  }
}
