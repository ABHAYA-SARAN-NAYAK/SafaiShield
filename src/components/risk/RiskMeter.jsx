import { useEffect, useState } from 'react'

export default function RiskMeter({ score = 0, label = '', animated = true }) {
  const [currentScore, setCurrentScore] = useState(animated ? 0 : score)

  useEffect(() => {
    if (!animated) { setCurrentScore(score); return }
    const duration = 1500
    const start = performance.now()
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrentScore(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score, animated])

  const getColor = (s) => {
    if (s >= 65) return '#DC2626'
    if (s >= 35) return '#D97706'
    return '#16A34A'
  }

  const getGlowColor = (s) => {
    if (s >= 65) return 'rgba(220, 38, 38, 0.3)'
    if (s >= 35) return 'rgba(217, 119, 6, 0.3)'
    return 'rgba(22, 163, 74, 0.3)'
  }

  const color = getColor(currentScore)
  const glowColor = getGlowColor(currentScore)

  // SVG half-circle gauge
  const radius = 80
  const circumference = Math.PI * radius // half circle
  const offset = circumference - (currentScore / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 200, height: 120 }}>
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#334155"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Colored arc */}
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
              transition: animated ? 'none' : 'stroke-dashoffset 1.5s ease-out',
            }}
          />
          {/* Score number */}
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
      {label && (
        <div
          className={`badge text-sm ${
            currentScore >= 65 ? 'badge-danger' : currentScore >= 35 ? 'badge-warning' : 'badge-safe'
          } ${currentScore >= 65 ? 'animate-pulse-slow' : ''}`}
        >
          {label}
        </div>
      )}
    </div>
  )
}
