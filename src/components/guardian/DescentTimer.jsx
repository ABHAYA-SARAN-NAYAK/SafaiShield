function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function DescentTimer({ elapsed = 0, status = 'running' }) {
  const getTimerColor = () => {
    if (status === 'alarming') return 'text-danger'
    if (status === 'missed') return 'text-warning'
    if (elapsed > 600) return 'text-warning' // > 10 min
    return 'text-safe'
  }

  return (
    <div className={`text-center ${status === 'alarming' ? 'animate-pulse' : ''}`}>
      <p className={`text-hero font-mono tracking-wider ${getTimerColor()}`}>
        {formatTime(elapsed)}
      </p>
    </div>
  )
}
