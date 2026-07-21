import { useAlert } from '../../context/AlertContext'

export default function AlarmTrigger({ coords, onResolve }) {
  const { isAlarming, alertState, gpsCoords, triggerAlarm, resolveAlarm, ALERT_STATES } = useAlert()

  const displayCoords = coords || gpsCoords

  const handleTrigger = () => {
    triggerAlarm('EMERGENCY — Worker in danger! Companion missed check-in!', coords)
  }

  const handleResolve = () => {
    resolveAlarm()
    onResolve?.()
  }

  if (!isAlarming && alertState !== ALERT_STATES.RESOLVED) {
    return (
      <button
        onClick={handleTrigger}
        className="w-full h-14 bg-danger/20 border-2 border-danger text-danger font-bold rounded-2xl
                   flex items-center justify-center gap-2
                   hover:bg-danger hover:text-white transition-all active:scale-[0.97]"
      >
        <span className="text-xl">🚨</span>
        TRIGGER EMERGENCY NOW
      </button>
    )
  }

  if (alertState === ALERT_STATES.RESOLVED) {
    return (
      <div className="card bg-safe/10 border-safe/30 text-center py-4">
        <span className="text-2xl">✅</span>
        <p className="text-safe font-semibold mt-2">Alarm resolved</p>
      </div>
    )
  }

  return (
    <div className="screen-flash rounded-2xl p-6 border-2 border-danger">
      <div className="text-center space-y-4">
        <div className="text-6xl animate-bounce">🚨</div>
        <h2 className="text-2xl font-extrabold text-danger">EMERGENCY</h2>
        <p className="text-lg text-text-primary font-semibold">WORKER IN DANGER</p>

        {displayCoords && (
          <div className="bg-night rounded-xl p-3 text-left">
            <p className="text-xs text-muted mb-1">GPS Coordinates</p>
            <p className="text-lg font-mono text-text-primary">
              {displayCoords.lat?.toFixed(6)}, {displayCoords.lng?.toFixed(6)}
            </p>
            <a
              href={`https://maps.google.com/?q=${displayCoords.lat},${displayCoords.lng}`}
              target="_blank"
              rel="noopener"
              className="text-xs text-accent underline mt-1 block"
            >
              Open in Google Maps
            </a>
          </div>
        )}

        <a
          href="tel:112"
          className="btn-cta-danger text-xl gap-3 no-underline"
        >
          📞 CALL 112 NOW
        </a>

        {alertState === ALERT_STATES.TELEGRAM_SENDING && (
          <p className="text-sm text-warning">📱 Sending Telegram alert...</p>
        )}
        {alertState === ALERT_STATES.TELEGRAM_SENT && (
          <p className="text-sm text-safe">✅ Telegram alert sent!</p>
        )}

        <button
          onClick={handleResolve}
          className="w-full h-12 bg-surface border border-border-custom rounded-xl text-muted hover:text-text-primary transition-colors"
        >
          Cancel alarm — Worker is safe
        </button>
      </div>
    </div>
  )
}
