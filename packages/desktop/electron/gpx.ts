/**
 * GPX file parsing and photo matching for ScanCorrect
 *
 * Parses GPX track files and matches photos to track points based on timestamps.
 */

import { XMLParser } from 'fast-xml-parser'

export interface GPXTrackPoint {
  latitude: number
  longitude: number
  timestamp: string // ISO timestamp
  elevation?: number
}

export interface GPXTrack {
  id: string
  name: string
  importedAt: string
  points: GPXTrackPoint[]
}

export interface GPXMatchResult {
  imagePath: string
  imageTimestamp: string
  matchedPoint?: GPXTrackPoint
  matchedLocation?: {
    name: string
    latitude: number
    longitude: number
  }
  timeDifferenceSeconds?: number
  confidence: 'exact' | 'close' | 'far' | 'no_match'
}

interface GPXTrkPt {
  '@_lat': string
  '@_lon': string
  time?: string
  ele?: string | number
}

interface GPXTrkSeg {
  trkpt?: GPXTrkPt | GPXTrkPt[]
}

interface GPXTrk {
  name?: string
  trkseg?: GPXTrkSeg | GPXTrkSeg[]
}

interface GPXDocument {
  gpx?: {
    trk?: GPXTrk | GPXTrk[]
    metadata?: {
      name?: string
    }
  }
}

/**
 * Parse GPX file content into a structured track
 */
export function parseGPX(content: string): GPXTrack {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })

  const gpx = parser.parse(content) as GPXDocument

  if (!gpx.gpx) {
    throw new Error('Invalid GPX file: missing gpx root element')
  }

  const points: GPXTrackPoint[] = []
  let trackName = 'Imported Track'

  // Get track name from metadata or first track
  if (gpx.gpx.metadata?.name) {
    trackName = gpx.gpx.metadata.name
  }

  // Handle single or multiple tracks
  const tracks = gpx.gpx.trk
  const trackArray = Array.isArray(tracks) ? tracks : tracks ? [tracks] : []

  for (const trk of trackArray) {
    if (trk.name && trackName === 'Imported Track') {
      trackName = trk.name
    }

    // Handle single or multiple segments
    const segments = trk.trkseg
    const segmentArray = Array.isArray(segments) ? segments : segments ? [segments] : []

    for (const seg of segmentArray) {
      // Handle single or multiple track points
      const trkpts = seg.trkpt
      const pointArray = Array.isArray(trkpts) ? trkpts : trkpts ? [trkpts] : []

      for (const pt of pointArray) {
        if (!pt['@_lat'] || !pt['@_lon']) {
          continue
        }

        const point: GPXTrackPoint = {
          latitude: parseFloat(pt['@_lat']),
          longitude: parseFloat(pt['@_lon']),
          timestamp: pt.time || '',
        }

        if (pt.ele !== undefined) {
          point.elevation = typeof pt.ele === 'string' ? parseFloat(pt.ele) : pt.ele
        }

        // Only include points with valid timestamps for matching
        if (point.timestamp) {
          points.push(point)
        }
      }
    }
  }

  if (points.length === 0) {
    throw new Error('No valid track points with timestamps found in GPX file')
  }

  // Sort points by timestamp
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return {
    id: crypto.randomUUID(),
    name: trackName,
    importedAt: new Date().toISOString(),
    points,
  }
}

/**
 * Match photos to GPX track points based on timestamps
 */
function wallClockToUtcMs(timestamp: string, offsetMinutes: number): number {
  if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp)) {
    return Date.parse(timestamp)
  }

  const asUtc = Date.parse(`${timestamp}Z`)
  return asUtc - offsetMinutes * 60_000
}

export function matchPhotosToGPX(
  track: GPXTrack,
  images: Array<{ path: string; timestamp: string }>,
  toleranceSeconds: number = 60,
  cameraUtcOffsetMinutes?: number | null
): GPXMatchResult[] {
  const results: GPXMatchResult[] = []

  for (const image of images) {
    if (!image.timestamp) {
      results.push({
        imagePath: image.path,
        imageTimestamp: '',
        confidence: 'no_match',
      })
      continue
    }

    const imageTime = cameraUtcOffsetMinutes == null
      ? new Date(image.timestamp).getTime()
      : wallClockToUtcMs(image.timestamp, cameraUtcOffsetMinutes)

    if (isNaN(imageTime)) {
      results.push({
        imagePath: image.path,
        imageTimestamp: image.timestamp,
        confidence: 'no_match',
      })
      continue
    }

    // Find closest track point using binary search for efficiency
    let closestPoint: GPXTrackPoint | undefined
    let minDiff = Infinity

    // Simple linear search (could optimize with binary search for large tracks)
    for (const point of track.points) {
      const pointTime = new Date(point.timestamp).getTime()
      if (isNaN(pointTime)) continue

      const diff = Math.abs(pointTime - imageTime)

      if (diff < minDiff) {
        minDiff = diff
        closestPoint = point
      }
    }

    const diffSeconds = minDiff / 1000

    // Determine confidence level
    let confidence: GPXMatchResult['confidence']
    if (diffSeconds <= 5) {
      confidence = 'exact'
    } else if (diffSeconds <= toleranceSeconds) {
      confidence = 'close'
    } else if (diffSeconds <= toleranceSeconds * 2) {
      confidence = 'far'
    } else {
      confidence = 'no_match'
    }

    const result: GPXMatchResult = {
      imagePath: image.path,
      imageTimestamp: image.timestamp,
      timeDifferenceSeconds: Math.round(diffSeconds),
      confidence,
    }

    if (closestPoint && confidence !== 'no_match') {
      result.matchedPoint = closestPoint
      result.matchedLocation = {
        name: `GPS: ${closestPoint.latitude.toFixed(6)}, ${closestPoint.longitude.toFixed(6)}`,
        latitude: closestPoint.latitude,
        longitude: closestPoint.longitude,
      }
    }

    results.push(result)
  }

  return results
}

/**
 * Get track statistics
 */
export function getTrackStats(track: GPXTrack): {
  pointCount: number
  startTime: string
  endTime: string
  duration: string
} {
  const pointCount = track.points.length

  if (pointCount === 0) {
    return {
      pointCount: 0,
      startTime: '',
      endTime: '',
      duration: '',
    }
  }

  const startTime = track.points[0].timestamp
  const endTime = track.points[track.points.length - 1].timestamp

  const startDate = new Date(startTime)
  const endDate = new Date(endTime)
  const durationMs = endDate.getTime() - startDate.getTime()

  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  let duration = ''
  if (hours > 0) {
    duration = `${hours}h ${minutes}m`
  } else {
    duration = `${minutes}m`
  }

  return {
    pointCount,
    startTime,
    endTime,
    duration,
  }
}
