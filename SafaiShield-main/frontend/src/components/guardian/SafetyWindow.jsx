export default function SafetyWindow({ elapsed = 0, maxMinutes = 12 }) {
  const maxSeconds = maxMinutes * 60
  const progress = Math.min(elapsed / maxSeconds, 1)
  const remaining = Math.max(0, 1 - progress)
  const remainingMinutes = Math.max(0, Math.ceil((maxSeconds - elapsed) / 60))

  const getColor = () => {
    if (remaining <= 0.15) return { bar: 'bg-danger', text: 'text-danger', glow: 'shadow-danger/30' }
    if (remaining <= 0.4) return { bar: 'bg-warning', text: 'text-warning', glow: 'shadow-warning/30' }
    return { bar: 'bg-safe', text: 'text-safe', glow: 'shadow-safe/30' }
  }

  const colors = getColor()

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted">Safety window</span>
        <span className={`text-sm font-semibold ${colors.text}`}>
          {Math.round(remaining * 100)}% remaining
        </span>
      </div>

      <div className="w-full h-3 bg-night rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-1000 ease-linear ${
            remaining <= 0.15 ? 'animate-pulse' : ''
          }`}
          style={{ width: `${remaining * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted">
          Max safe time: {maxMinutes} min
        </span>
        <span className={`text-xs font-semibold ${colors.text}`}>
          {remaining > 0 ? `${remainingMinutes} min left` : 'TIME EXCEEDED'}
        </span>
      </div>
    </div>
  )
}
