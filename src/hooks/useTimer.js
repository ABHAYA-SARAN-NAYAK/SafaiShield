import { useState, useEffect, useCallback, useRef } from 'react'

export function useTimer({ onMiss, onWarning, intervalSeconds = 90, graceSeconds = 15 }) {
  const [elapsed, setElapsed] = useState(0)
  const [sinceLastPing, setSinceLastPing] = useState(0)
  const [status, setStatus] = useState('running') // running | warning | missed | alarming
  const [pingCount, setPingCount] = useState(0)
  const [pingHistory, setPingHistory] = useState([])
  const onMissRef = useRef(onMiss)
  const onWarningRef = useRef(onWarning)

  // Keep callbacks fresh without retriggering effects
  useEffect(() => { onMissRef.current = onMiss }, [onMiss])
  useEffect(() => { onWarningRef.current = onWarning }, [onWarning])

  // Main elapsed timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Ping interval tracker
  useEffect(() => {
    const id = setInterval(() => {
      setSinceLastPing(s => {
        const next = s + 1

        if (next >= intervalSeconds + graceSeconds) {
          setStatus('alarming')
          onMissRef.current?.()
          return next // Stop incrementing after alarm
        } else if (next >= intervalSeconds) {
          if (s < intervalSeconds) {
            // Just crossed threshold
            onWarningRef.current?.()
          }
          setStatus('missed')
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [intervalSeconds, graceSeconds])

  const confirm = useCallback(() => {
    setSinceLastPing(0)
    setStatus('running')
    setPingCount(c => c + 1)
    setPingHistory(prev => [
      { time: Date.now(), elapsed, status: 'ok' },
      ...prev,
    ])
  }, [elapsed])

  const reset = useCallback(() => {
    setElapsed(0)
    setSinceLastPing(0)
    setStatus('running')
    setPingCount(0)
    setPingHistory([])
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
    confirm,
    reset,
    isGracePeriod,
  }
}
