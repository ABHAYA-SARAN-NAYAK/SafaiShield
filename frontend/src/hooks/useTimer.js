import { useState, useEffect, useCallback, useRef } from 'react'

export function useTimer({ onMiss, onWarning, intervalSeconds = 90, graceSeconds = 15 }) {
  const [elapsed, setElapsed] = useState(0)
  const [sinceLastPing, setSinceLastPing] = useState(0)
  const [status, setStatus] = useState('running')
  const [pingCount, setPingCount] = useState(0)
  const [pingHistory, setPingHistory] = useState([])
  const [missedCount, setMissedCount] = useState(0)
  const onMissRef = useRef(onMiss)
  const onWarningRef = useRef(onWarning)

  useEffect(() => { onMissRef.current = onMiss }, [onMiss])
  useEffect(() => { onWarningRef.current = onWarning }, [onWarning])

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setSinceLastPing(s => {
        const next = s + 1

        if (next >= intervalSeconds + graceSeconds) {
          setStatus('alarming')
          onMissRef.current?.()
          return next
        } else if (next >= intervalSeconds) {
          if (s < intervalSeconds) {
            onWarningRef.current?.()
          }
          setStatus('missed')
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [intervalSeconds, graceSeconds])

  const confirm = useCallback((type = 'tap') => {
    setSinceLastPing(0)
    setStatus('running')
    setPingCount(c => c + 1)
    setPingHistory(prev => [
      { time: Date.now(), elapsed, type },
      ...prev,
    ])
  }, [elapsed])

  const incrementMissed = useCallback(() => {
    setMissedCount(c => {
      const next = c + 1
      setSinceLastPing(0)
      setStatus('running')
      setPingHistory(prev => [
        { time: Date.now(), elapsed, type: 'voice_timeout' },
        ...prev,
      ])
      if (next >= 2) {
        setStatus('alarming')
        onMissRef.current?.()
      }
      return next
    })
  }, [elapsed])

  const emergencyTriggered = useCallback(() => {
    setSinceLastPing(0)
    setStatus('alarming')
    setPingHistory(prev => [
      { time: Date.now(), elapsed, type: 'voice_distress' },
      ...prev,
    ])
    setMissedCount(2)
  }, [elapsed])

  const resetMissedCount = useCallback(() => {
    setMissedCount(0)
  }, [])

  const reset = useCallback(() => {
    setElapsed(0)
    setSinceLastPing(0)
    setStatus('running')
    setPingCount(0)
    setPingHistory([])
    setMissedCount(0)
  }, [])

  const timeToNextPing = Math.max(0, intervalSeconds - sinceLastPing)
  const isGracePeriod = sinceLastPing >= intervalSeconds && sinceLastPing < intervalSeconds + graceSeconds

  return {
    elapsed,
    sinceLastPing,
    timeToNextPing,
    status,
    pingCount,
    pingHistory,
    missedCount,
    confirm,
    incrementMissed,
    emergencyTriggered,
    resetMissedCount,
    reset,
    isGracePeriod,
  }
}
