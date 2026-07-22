import { useEffect, useState, useRef } from 'react'

export default function RiskMeter({ score = 0, label = '', animated = true, heatstrokeWarning = null }) {
  const targetScore = Math.max(0, Math.min(100, Number(score) || 0))
  const [currentScore, setCurrentScore] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
    }
    if (!animated) { setCurrentScore(targetScore); return }
    const duration = 1200
    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrentScore(Math.round(eased * targetScore))
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [targetScore, animated])

  const getColor = (s) => {
    if (s >= 66) return '#DC2626'
    if (s >= 36) return '#D97706'
    return '#16A34A'
  }

  const getGlowColor = (s) => {
    if (s >= 66) return 'rgba(220, 38, 38, 0.3)'
    if (s >= 36) return 'rgba(217, 119, 6, 0.3)'
    return 'rgba(22, 163, 74, 0.3)'
  }

  const getRiskLabelText = (s) => {
    if (label) return label.toUpperCase()
    if (s >= 66) return 'HIGH RISK'
    if (s >= 36) return 'MEDIUM RISK'
    return 'LOW RISK'
  }

  const color = getColor(currentScore)
  const glowColor = getGlowColor(currentScore)
  const riskLabel = getRiskLabelText(currentScore)

  // SVG half-circle gauge — correct formula
  const radius = 80
  const circumference = Math.PI * radius
  const offset = circumference - (currentScore / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 200, height: 120 }}>
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#334155"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 8px ${glowColor})`,
              transition: animated ? 'none' : 'stroke-dashoffset 1.2s ease-out',
            }}
          />
          <text x="100" y="85" textAnchor="middle" fill={color}
                fontSize="42" fontWeight="800" fontFamily="Inter, sans-serif">
            {currentScore}
          </text>
          <text x="100" y="105" textAnchor="middle" fill="#94A3B8"
                fontSize="11" fontFamily="Inter, sans-serif">
            / 100
          </text>
        </svg>
      </div>
      <div
        className={`badge text-sm font-bold tracking-wide ${
          currentScore >= 66 ? 'badge-danger' : currentScore >= 36 ? 'badge-warning' : 'badge-safe'
        } ${currentScore >= 66 ? 'animate-pulse-slow' : ''}`}
      >
        {riskLabel}
      </div>

      {/* Heatstroke warning card */}
      {heatstrokeWarning && (
        <div className="w-full card bg-warning/10 border border-warning/30 space-y-2 animate-pulse">
          <div className="flex items-center gap-2 text-warning font-bold text-xs">
            <span>🌡️</span>
            <span>HEATSTROKE WARNING</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">{heatstrokeWarning}</p>
        </div>
      )}
    </div>
  )
}
