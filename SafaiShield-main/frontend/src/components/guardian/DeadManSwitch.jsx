import { useMemo } from 'react'

export default function DeadManSwitch({
  timeToNextPing = 90,
  intervalSeconds = 90,
  status = 'running',
  isGracePeriod = false,
  isListening = false,
  warningMessage = '',
  flashGreen = false,
  onConfirm,
}) {
  // SVG ring countdown
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, timeToNextPing / intervalSeconds)
  const dashOffset = circumference * (1 - progress)

  const ringColor = useMemo(() => {
    if (status === 'alarming') return '#DC2626'
    if (isGracePeriod || status === 'missed') return '#D97706'
    if (timeToNextPing < 20) return '#D97706'
    return '#16A34A'
  }, [status, isGracePeriod, timeToNextPing])

  const buttonBg = useMemo(() => {
    if (status === 'alarming') return 'bg-danger'
    if (isGracePeriod || status === 'missed') return 'bg-warning animate-pulse'
    return 'bg-safe hover:bg-green-600'
  }, [status, isGracePeriod])

  return (
    <div className={`flex flex-col items-center gap-4 p-4 rounded-3xl transition-all duration-500 ${
      flashGreen ? 'bg-safe/20 border-2 border-safe ring-4 ring-safe/30' : ''
    }`}>
      {/* Listening for Voice Badge */}
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 border border-accent/40 rounded-full text-accent font-bold text-xs animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
          <span>Listening for voice...</span>
        </div>
      )}

      {warningMessage && (
        <div className="bg-warning/20 border border-warning/50 text-warning px-3 py-1 rounded-lg text-xs font-bold animate-bounce">
          ⚠️ {warningMessage}
        </div>
      )}

      <div className="relative">
        {/* Countdown ring */}
        <svg width="140" height="140" className="transform -rotate-90">
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke="#334155"
            strokeWidth="6"
          />
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
              filter: `drop-shadow(0 0 6px ${ringColor}40)`,
            }}
          />
        </svg>

        {/* Center button */}
        <button
          onClick={onConfirm}
          className={`absolute inset-3 rounded-full ${buttonBg} 
                     flex flex-col items-center justify-center p-2
                     transition-all duration-200 active:scale-95
                     shadow-lg text-center`}
          style={{
            boxShadow: `0 0 20px ${ringColor}30`,
          }}
        >
          <div className="text-center text-white">
            {status === 'alarming' ? (
              <span className="text-2xl">🚨</span>
            ) : (
              <div className="flex flex-col items-center justify-center leading-tight">
                <span className="text-xl mb-0.5">✅</span>
                <span className="text-[10px] font-extrabold tracking-tight uppercase">TAP — WORKER IS SAFE</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className={`font-bold text-lg ${
          status === 'alarming' ? 'text-danger' : isGracePeriod ? 'text-warning' : 'text-safe'
        }`}>
          {status === 'alarming' ? '🚨 ALARM TRIGGERED' :
           isGracePeriod ? '⚠️ TAP OR SAY SAFE NOW!' :
           '✅ WORKER IS OK'}
        </p>
        {!isGracePeriod && status !== 'alarming' && (
          <p className="text-sm text-muted mt-1">
            Next check in {timeToNextPing}s
          </p>
        )}
      </div>
    </div>
  )
}
