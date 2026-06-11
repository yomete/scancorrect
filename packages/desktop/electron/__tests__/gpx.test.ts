import { describe, it, expect, vi } from 'vitest'
import { parseGPX, matchPhotosToGPX, getTrackStats, GPXTrack } from '../gpx'

// Mock crypto.randomUUID for consistent test IDs
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-1234')
})

describe('gpx', () => {
  describe('parseGPX', () => {
    it('should parse a simple GPX file with one track', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <name>Morning Walk</name>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
                <ele>10</ele>
              </trkpt>
              <trkpt lat="37.7750" lon="-122.4195">
                <time>2024-01-15T10:05:00Z</time>
                <ele>12</ele>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)

      expect(track.id).toBe('test-uuid-1234')
      expect(track.name).toBe('Morning Walk')
      expect(track.points).toHaveLength(2)
      expect(track.points[0].latitude).toBe(37.7749)
      expect(track.points[0].longitude).toBe(-122.4194)
      expect(track.points[0].timestamp).toBe('2024-01-15T10:00:00Z')
      expect(track.points[0].elevation).toBe(10)
    })

    it('should parse GPX with metadata name', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <metadata>
            <name>My GPS Track</name>
          </metadata>
          <trk>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)
      expect(track.name).toBe('My GPS Track')
    })

    it('should handle multiple track segments', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <name>Multi-segment Track</name>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
              </trkpt>
            </trkseg>
            <trkseg>
              <trkpt lat="37.7750" lon="-122.4195">
                <time>2024-01-15T11:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)
      expect(track.points).toHaveLength(2)
    })

    it('should handle multiple tracks', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <name>First Track</name>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
          <trk>
            <name>Second Track</name>
            <trkseg>
              <trkpt lat="38.0" lon="-123.0">
                <time>2024-01-15T12:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)
      expect(track.name).toBe('First Track')
      expect(track.points).toHaveLength(2)
    })

    it('should sort points by timestamp', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="37.7750" lon="-122.4195">
                <time>2024-01-15T10:05:00Z</time>
              </trkpt>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)
      expect(track.points[0].timestamp).toBe('2024-01-15T10:00:00Z')
      expect(track.points[1].timestamp).toBe('2024-01-15T10:05:00Z')
    })

    it('should skip points without timestamps', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
              </trkpt>
              <trkpt lat="37.7750" lon="-122.4195">
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)
      expect(track.points).toHaveLength(1)
    })

    it('should throw error for invalid GPX', () => {
      expect(() => parseGPX('<invalid>xml</invalid>')).toThrow(
        'Invalid GPX file: missing gpx root element'
      )
    })

    it('should throw error for GPX with no valid points', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      expect(() => parseGPX(gpxContent)).toThrow(
        'No valid track points with timestamps found in GPX file'
      )
    })

    it('should handle elevation as string or number', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
                <ele>100.5</ele>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)
      expect(track.points[0].elevation).toBe(100.5)
    })

    it('should use default name if no name is provided', () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="37.7749" lon="-122.4194">
                <time>2024-01-15T10:00:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`

      const track = parseGPX(gpxContent)
      expect(track.name).toBe('Imported Track')
    })
  })

  describe('matchPhotosToGPX', () => {
    const createTrack = (): GPXTrack => ({
      id: 'test-track',
      name: 'Test Track',
      importedAt: '2024-01-15T00:00:00Z',
      points: [
        { latitude: 37.7749, longitude: -122.4194, timestamp: '2024-01-15T10:00:00Z' },
        { latitude: 37.7750, longitude: -122.4195, timestamp: '2024-01-15T10:05:00Z' },
        { latitude: 37.7751, longitude: -122.4196, timestamp: '2024-01-15T10:10:00Z' }
      ]
    })

    it('should match exact timestamps with high confidence', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '2024-01-15T10:00:00Z' }]

      const results = matchPhotosToGPX(track, images)

      expect(results).toHaveLength(1)
      expect(results[0].confidence).toBe('exact')
      expect(results[0].matchedPoint?.latitude).toBe(37.7749)
      expect(results[0].timeDifferenceSeconds).toBe(0)
    })

    it('should match timestamps within 5 seconds as exact', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '2024-01-15T10:00:03Z' }]

      const results = matchPhotosToGPX(track, images)

      expect(results[0].confidence).toBe('exact')
      expect(results[0].timeDifferenceSeconds).toBe(3)
    })

    it('should match timestamps within tolerance as close', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '2024-01-15T10:00:30Z' }]

      const results = matchPhotosToGPX(track, images, 60)

      expect(results[0].confidence).toBe('close')
      expect(results[0].timeDifferenceSeconds).toBe(30)
    })

    it('should match timestamps within 2x tolerance as far', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '2024-01-15T10:01:30Z' }]

      const results = matchPhotosToGPX(track, images, 60)

      expect(results[0].confidence).toBe('far')
      expect(results[0].timeDifferenceSeconds).toBe(90)
    })

    it('should return no_match for timestamps beyond 2x tolerance', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '2024-01-15T12:00:00Z' }]

      const results = matchPhotosToGPX(track, images, 60)

      expect(results[0].confidence).toBe('no_match')
      expect(results[0].matchedPoint).toBeUndefined()
    })

    it('should return no_match for images without timestamps', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '' }]

      const results = matchPhotosToGPX(track, images)

      expect(results[0].confidence).toBe('no_match')
      expect(results[0].imageTimestamp).toBe('')
    })

    it('should return no_match for invalid timestamps', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: 'not-a-date' }]

      const results = matchPhotosToGPX(track, images)

      expect(results[0].confidence).toBe('no_match')
    })

    it('should handle multiple images', () => {
      const track = createTrack()
      const images = [
        { path: '/photo1.jpg', timestamp: '2024-01-15T10:00:00Z' },
        { path: '/photo2.jpg', timestamp: '2024-01-15T10:05:02Z' },
        { path: '/photo3.jpg', timestamp: '2024-01-15T15:00:00Z' }
      ]

      const results = matchPhotosToGPX(track, images, 60)

      expect(results).toHaveLength(3)
      expect(results[0].confidence).toBe('exact')
      expect(results[1].confidence).toBe('exact')
      expect(results[2].confidence).toBe('no_match')
    })

    it('should include matched location with formatted name', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '2024-01-15T10:00:00Z' }]

      const results = matchPhotosToGPX(track, images)

      expect(results[0].matchedLocation).toBeDefined()
      expect(results[0].matchedLocation?.name).toContain('GPS:')
      expect(results[0].matchedLocation?.latitude).toBe(37.7749)
      expect(results[0].matchedLocation?.longitude).toBe(-122.4194)
    })

    it('should find closest point even if not exact', () => {
      const track = createTrack()
      const images = [{ path: '/photo1.jpg', timestamp: '2024-01-15T10:02:30Z' }]

      const results = matchPhotosToGPX(track, images, 300)

      // 10:02:30 is 2.5 min from 10:00:00 and 2.5 min from 10:05:00
      // The algorithm finds first point with minimum difference, so 10:00:00 wins
      expect(results[0].matchedPoint?.timestamp).toBe('2024-01-15T10:00:00Z')
      expect(results[0].timeDifferenceSeconds).toBe(150) // 2.5 minutes
    })
  })

  describe('getTrackStats', () => {
    it('should return stats for a track', () => {
      const track: GPXTrack = {
        id: 'test',
        name: 'Test',
        importedAt: '2024-01-15T00:00:00Z',
        points: [
          { latitude: 0, longitude: 0, timestamp: '2024-01-15T10:00:00Z' },
          { latitude: 0, longitude: 0, timestamp: '2024-01-15T10:30:00Z' },
          { latitude: 0, longitude: 0, timestamp: '2024-01-15T11:00:00Z' }
        ]
      }

      const stats = getTrackStats(track)

      expect(stats.pointCount).toBe(3)
      expect(stats.startTime).toBe('2024-01-15T10:00:00Z')
      expect(stats.endTime).toBe('2024-01-15T11:00:00Z')
      expect(stats.duration).toBe('1h 0m')
    })

    it('should handle tracks less than an hour', () => {
      const track: GPXTrack = {
        id: 'test',
        name: 'Test',
        importedAt: '2024-01-15T00:00:00Z',
        points: [
          { latitude: 0, longitude: 0, timestamp: '2024-01-15T10:00:00Z' },
          { latitude: 0, longitude: 0, timestamp: '2024-01-15T10:45:00Z' }
        ]
      }

      const stats = getTrackStats(track)

      expect(stats.duration).toBe('45m')
    })

    it('should handle empty tracks', () => {
      const track: GPXTrack = {
        id: 'test',
        name: 'Test',
        importedAt: '2024-01-15T00:00:00Z',
        points: []
      }

      const stats = getTrackStats(track)

      expect(stats.pointCount).toBe(0)
      expect(stats.startTime).toBe('')
      expect(stats.endTime).toBe('')
      expect(stats.duration).toBe('')
    })

    it('should handle multi-hour tracks', () => {
      const track: GPXTrack = {
        id: 'test',
        name: 'Test',
        importedAt: '2024-01-15T00:00:00Z',
        points: [
          { latitude: 0, longitude: 0, timestamp: '2024-01-15T08:00:00Z' },
          { latitude: 0, longitude: 0, timestamp: '2024-01-15T12:30:00Z' }
        ]
      }

      const stats = getTrackStats(track)

      expect(stats.duration).toBe('4h 30m')
    })
  })
})
