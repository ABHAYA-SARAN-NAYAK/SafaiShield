import { useState, useEffect, useCallback } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState({ lat: null, lng: null, accuracy: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    getCurrentPosition()
  }, [getCurrentPosition])

  return { ...position, loading, error, refresh: getCurrentPosition }
}
