import React, { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { LocationValue } from '../../types'

interface MapPickerProps {
  initialLocation?: LocationValue
  onLocationSelect: (lat: number, lng: number) => void
  accessToken: string
  style?: string
}

export function MapPicker({
  initialLocation,
  onLocationSelect,
  accessToken,
  style = 'mapbox://styles/mapbox/streets-v12',
}: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = accessToken

    const initialCenter: [number, number] = initialLocation
      ? [initialLocation.longitude, initialLocation.latitude]
      : [-122.4194, 37.7749] // Default to San Francisco

    const initialZoom = initialLocation ? 12 : 3

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style,
      center: initialCenter,
      zoom: initialZoom,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    // Cleanup
    return () => {
      if (marker.current) {
        marker.current.remove()
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [accessToken, style])

  // Handle initial location marker
  useEffect(() => {
    if (!mapLoaded || !map.current) return

    if (initialLocation) {
      if (marker.current) {
        marker.current.setLngLat([initialLocation.longitude, initialLocation.latitude])
      } else {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([initialLocation.longitude, initialLocation.latitude])
          .addTo(map.current)
      }
    }
  }, [mapLoaded, initialLocation])

  // Handle map clicks
  const handleMapClick = useCallback(
    (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat

      // Update or create marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat])
      } else if (map.current) {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([lng, lat])
          .addTo(map.current)
      }

      onLocationSelect(lat, lng)
    },
    [onLocationSelect]
  )

  // Attach click handler
  useEffect(() => {
    if (!mapLoaded || !map.current) return

    map.current.on('click', handleMapClick)

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick)
      }
    }
  }, [mapLoaded, handleMapClick])

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-lg">
          <div className="text-gray-500 dark:text-gray-400">Loading map...</div>
        </div>
      )}
    </div>
  )
}
