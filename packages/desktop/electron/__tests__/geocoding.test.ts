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
// The geocoding module uses a module-level lastRequestTime variable
// which persists between tests, causing timeouts

describe('geocoding', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
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
  // 1. Reset the module-level lastRequestTime between tests
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
      const results = await geocodeLocation('San Francisco')

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        displayName: 'San Francisco, California, USA',
        latitude: 37.7749,
        longitude: -122.4194,
        type: 'city'
      })
    }, 10000)

    it('should throw error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const { geocodeLocation } = await import('../geocoding')
      await new Promise(resolve => setTimeout(resolve, 1100))

      await expect(geocodeLocation('test')).rejects.toThrow('Geocoding failed')
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
      const result = await reverseGeocode(37.7749, -122.4194)

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
      const result = await reverseGeocode(37.7749, -122.4194)

      expect(result?.type).toBe('unknown')
    }, 10000)
  })
})
