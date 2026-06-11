import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to mock the module before importing
vi.mock('../geocoding', async () => {
  const actual = await vi.importActual('../geocoding') as Record<string, unknown>

  // Create a mock version that doesn't have rate limiting issues in tests
  return {
    ...actual,
    // We'll test the validation and parsing logic, but mock the fetch calls
  }
})

// For testing the actual implementation, we need to handle rate limiting
// The geocoding module uses a module-level chain variable
// which persists between tests — use fake timers for queue tests.

describe('geocoding', () => {
  const mockFetch = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    // Reset module-level queue and cache so tests don't bleed into each other
    const { _resetForTesting } = await import('../geocoding')
    _resetForTesting()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('geocodeLocation validation', () => {
    it('should return empty array for empty query', async () => {
      // Import fresh to test
      const { geocodeLocation } = await import('../geocoding')
      const results = await geocodeLocation('')
      expect(results).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return empty array for whitespace-only query', async () => {
      const { geocodeLocation } = await import('../geocoding')
      const results = await geocodeLocation('   ')
      expect(results).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('reverseGeocode validation', () => {
    it('should return null for non-finite latitude', async () => {
      const { reverseGeocode } = await import('../geocoding')
      expect(await reverseGeocode(NaN, -122.4194)).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return null for non-finite longitude', async () => {
      const { reverseGeocode } = await import('../geocoding')
      expect(await reverseGeocode(37.7749, NaN)).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return null for Infinity coordinates', async () => {
      const { reverseGeocode } = await import('../geocoding')
      expect(await reverseGeocode(Infinity, -122.4194)).toBeNull()
      expect(await reverseGeocode(37.7749, -Infinity)).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw error for latitude > 90', async () => {
      const { reverseGeocode } = await import('../geocoding')
      await expect(reverseGeocode(91, -122.4194)).rejects.toThrow(
        'Latitude must be between -90 and 90'
      )
    })

    it('should throw error for latitude < -90', async () => {
      const { reverseGeocode } = await import('../geocoding')
      await expect(reverseGeocode(-91, -122.4194)).rejects.toThrow(
        'Latitude must be between -90 and 90'
      )
    })

    it('should throw error for longitude > 180', async () => {
      const { reverseGeocode } = await import('../geocoding')
      await expect(reverseGeocode(37.7749, 181)).rejects.toThrow(
        'Longitude must be between -180 and 180'
      )
    })

    it('should throw error for longitude < -180', async () => {
      const { reverseGeocode } = await import('../geocoding')
      await expect(reverseGeocode(37.7749, -181)).rejects.toThrow(
        'Longitude must be between -180 and 180'
      )
    })
  })

  // Note: The following tests verify the API call behavior
  // In a real test environment, you'd want to either:
  // 1. Reset the module-level chain between tests
  // 2. Use dependency injection for the rate limiter
  // 3. Test the rate limiting logic in isolation

  describe('geocodeLocation API calls', () => {
    it('should call Nominatim API with correct URL structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      const { geocodeLocation } = await import('../geocoding')

      // Allow rate limiting delay to pass
      await new Promise(resolve => setTimeout(resolve, 1100))
      await geocodeLocation('San Francisco')

      expect(mockFetch).toHaveBeenCalled()
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('nominatim.openstreetmap.org/search')
      expect(url).toContain('format=json')
    }, 10000)

    it('should include User-Agent header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      const { geocodeLocation } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))
      await geocodeLocation('Test')

      const options = mockFetch.mock.calls[0][1] as RequestInit
      expect(options.headers).toEqual({ 'User-Agent': 'ScanCorrect/1.0' })
    }, 10000)

    it('should parse geocoding results correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            display_name: 'San Francisco, California, USA',
            lat: '37.7749',
            lon: '-122.4194',
            type: 'city'
          }
        ]
      })

      const { geocodeLocation } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))
      const results = await geocodeLocation('San Francisco unique query abc123')

      expect(Array.isArray(results)).toBe(true)
      const arr = results as import('../geocoding').GeocodingResult[]
      expect(arr).toHaveLength(1)
      expect(arr[0]).toEqual({
        displayName: 'San Francisco, California, USA',
        latitude: 37.7749,
        longitude: -122.4194,
        type: 'city'
      })
    }, 10000)

    it('should return { error: "failed" } on HTTP failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const { geocodeLocation } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))

      const result = await geocodeLocation('test http failure query')
      expect(result).toEqual({ error: 'failed' })
    }, 10000)
  })

  describe('reverseGeocode API calls', () => {
    it('should call Nominatim reverse API with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_name: 'Test',
          lat: '37.7749',
          lon: '-122.4194'
        })
      })

      const { reverseGeocode } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))
      await reverseGeocode(37.7749, -122.4194)

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('nominatim.openstreetmap.org/reverse')
      expect(url).toContain('lat=37.7749')
      expect(url).toContain('lon=-122.4194')
    }, 10000)

    it('should return null for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const { reverseGeocode } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))
      const result = await reverseGeocode(0, 0)

      expect(result).toBeNull()
    }, 10000)

    it('should return null for empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const { reverseGeocode } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))
      const result = await reverseGeocode(37.7749, -122.4195)

      expect(result).toBeNull()
    }, 10000)

    it('should handle missing type in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_name: 'Test Location',
          lat: '37.7749',
          lon: '-122.4194'
        })
      })

      const { reverseGeocode } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))
      const result = await reverseGeocode(37.7749, -122.4196)

      const geo = result as import('../geocoding').GeocodingResult
      expect(geo?.type).toBe('unknown')
    }, 10000)
  })

  // ── New tests for queue, cache, and retry behavior ────────────────────────

  describe('serial queue: concurrency spacing', () => {
    it('two concurrent calls fire with ≥1.1s spacing', async () => {
      vi.useFakeTimers()
      const { geocodeLocation } = await import('../geocoding')

      const timestamps: number[] = []
      mockFetch.mockImplementation(() => {
        timestamps.push(Date.now())
        return Promise.resolve({
          ok: true,
          json: async () => []
        })
      })

      const p1 = geocodeLocation('concurrent query alpha')
      const p2 = geocodeLocation('concurrent query beta')

      // Advance time enough for both to complete
      await vi.runAllTimersAsync()
      await Promise.all([p1, p2])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(timestamps).toHaveLength(2)
      const gap = timestamps[1] - timestamps[0]
      expect(gap).toBeGreaterThanOrEqual(1100)

      vi.useRealTimers()
    }, 30000)
  })

  describe('LRU cache', () => {
    it('same query twice results in one fetch', async () => {
      vi.useFakeTimers()
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [{ display_name: 'Paris', lat: '48.8566', lon: '2.3522', type: 'city' }]
      })

      const { geocodeLocation } = await import('../geocoding')

      const q = 'paris cache dedup test'
      const p1 = geocodeLocation(q)
      await vi.runAllTimersAsync()
      await p1

      mockFetch.mockClear()
      // Second call hits cache — no timers needed
      const result = await geocodeLocation(q)
      expect(Array.isArray(result)).toBe(true)

      // No new fetch — second was a cache hit
      expect(mockFetch).toHaveBeenCalledTimes(0)

      vi.useRealTimers()
    }, 15000)

    it('normalizes query case for cache key', async () => {
      vi.useFakeTimers()
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      })

      const { geocodeLocation } = await import('../geocoding')

      const p1 = geocodeLocation('Berlin Case Test XYZ')
      await vi.runAllTimersAsync()
      await p1

      mockFetch.mockClear()
      const result = await geocodeLocation('berlin case test xyz')
      expect(Array.isArray(result)).toBe(true)
      // Cache hit — no new fetch
      expect(mockFetch).toHaveBeenCalledTimes(0)

      vi.useRealTimers()
    }, 15000)

    it('101 distinct queries evict the first', async () => {
      vi.useFakeTimers()
      const { geocodeLocation } = await import('../geocoding')

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      })

      // Fill cache with 101 unique queries (evicts query 0)
      const queries = Array.from({ length: 101 }, (_, i) => `eviction test query number ${i}`)
      const promises = queries.map(q => geocodeLocation(q))
      await vi.runAllTimersAsync()
      await Promise.all(promises)

      // Query 0 should have been evicted; a re-request fetches again
      mockFetch.mockClear()
      mockFetch.mockResolvedValue({ ok: true, json: async () => [] })
      const refetch = geocodeLocation(queries[0])
      await vi.runAllTimersAsync()
      await refetch

      expect(mockFetch).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    }, 30000)
  })

  describe('retry behavior', () => {
    it('fetch 429 once → retries after 2s → returns results', async () => {
      vi.useFakeTimers()
      const { geocodeLocation } = await import('../geocoding')

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ display_name: 'Rome', lat: '41.9', lon: '12.5', type: 'city' }]
        })

      const p = geocodeLocation('rome retry success test')
      await vi.runAllTimersAsync()
      const result = await p

      expect(Array.isArray(result)).toBe(true)
      const arr = result as import('../geocoding').GeocodingResult[]
      expect(arr[0].displayName).toBe('Rome')
      expect(mockFetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    }, 30000)

    it('fetch 429 twice → returns { error: "rate-limited" }', async () => {
      vi.useFakeTimers()
      const { geocodeLocation } = await import('../geocoding')

      mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests' })

      const p = geocodeLocation('rate limited twice test')
      await vi.runAllTimersAsync()
      const result = await p

      expect(result).toEqual({ error: 'rate-limited' })

      vi.useRealTimers()
    }, 30000)

    it('network rejection twice → returns { error: "offline" }', async () => {
      vi.useFakeTimers()
      const { geocodeLocation } = await import('../geocoding')

      mockFetch.mockRejectedValue(new Error('fetch failed'))

      const p = geocodeLocation('offline test query unique')
      await vi.runAllTimersAsync()
      const result = await p

      expect(result).toEqual({ error: 'offline' })

      vi.useRealTimers()
    }, 30000)
  })
})
