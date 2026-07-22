import { useState, useEffect, useCallback } from 'react'

const CACHE_KEY = 'safaishield_weather'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export function useWeather(lat, lng) {
  const [weather, setWeather] = useState({
    temp: null,
    humidity: null,
    description: '',
    icon: '',
    loading: false,
    error: null,
    cached: false,
  })

  const fetchWeather = useCallback(async (latitude, longitude) => {
    if (!latitude || !longitude) return

    // Check cache first
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setWeather({
          temp: cached.temp,
          humidity: cached.humidity,
          description: cached.description,
          icon: cached.icon,
          loading: false,
          error: null,
          cached: true,
        })
        return
      }
    } catch {}

    const apiKey = import.meta.env.VITE_OPENWEATHER_KEY

    if (!apiKey || apiKey === 'your-weather-key') {
      // Mock weather data for demo
      const mockWeather = {
        temp: 34 + Math.round(Math.random() * 8),
        humidity: 55 + Math.round(Math.random() * 30),
        description: 'Hazy sunshine',
        icon: '02d',
        timestamp: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(mockWeather))
      setWeather({ ...mockWeather, loading: false, error: null, cached: false })
      return
    }

    setWeather(prev => ({ ...prev, loading: true, error: null }))

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Weather API error')
      const data = await res.json()

      const weatherData = {
        temp: Math.round(data.main.temp),
        humidity: data.main.humidity,
        description: data.weather[0]?.description || '',
        icon: data.weather[0]?.icon || '',
        timestamp: Date.now(),
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(weatherData))
      setWeather({ ...weatherData, loading: false, error: null, cached: false })
    } catch (err) {
      // Try cache fallback
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
        if (cached) {
          setWeather({
            temp: cached.temp,
            humidity: cached.humidity,
            description: cached.description,
            icon: cached.icon,
            loading: false,
            error: 'Using cached weather',
            cached: true,
          })
          return
        }
      } catch {}
      setWeather(prev => ({ ...prev, loading: false, error: err.message }))
    }
  }, [])

  useEffect(() => {
    fetchWeather(lat, lng)
  }, [lat, lng, fetchWeather])

  return { ...weather, refresh: () => fetchWeather(lat, lng) }
}
