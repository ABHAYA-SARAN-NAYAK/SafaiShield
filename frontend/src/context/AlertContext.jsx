import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { triggerSiren, stopSiren } from '../lib/siren'
import { sendTelegramAlert } from '../lib/telegram'

const AlertContext = createContext(null)

const ALERT_STATES = {
  IDLE: 'idle',
  ALARMING: 'alarming',
  TELEGRAM_SENDING: 'telegram_sending',
  TELEGRAM_SENT: 'telegram_sent',
  RESOLVED: 'resolved',
}

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState(ALERT_STATES.IDLE)
  const [gpsCoords, setGpsCoords] = useState(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const sirenStopRef = useRef(null)

  const triggerAlarm = useCallback(async (message = 'EMERGENCY — Worker in danger!', coords = null, emergencyContactPhone = '') => {
    setAlertState(ALERT_STATES.ALARMING)
    setAlertMessage(message)
    setEmergencyPhone(emergencyContactPhone)

    if (coords) {
      setGpsCoords(coords)
    } else {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      } catch {
        setGpsCoords(null)
      }
    }

    sirenStopRef.current = triggerSiren(30000)

    // SMS fallback — uses sms: URI scheme, works without internet
    if (emergencyContactPhone) {
      const loc = coords ? `${coords.lat?.toFixed(4)},${coords.lng?.toFixed(4)}` : 'Unknown'
      const smsBody = `EMERGENCY: SafaiShield alarm triggered. Worker has not responded. Location: ${loc}. Call 14473 immediately.`
      try {
        window.location.href = 'sms:' + emergencyContactPhone + '?body=' + encodeURIComponent(smsBody)
      } catch {}
    }

    setAlertState(ALERT_STATES.TELEGRAM_SENDING)
    try {
      await sendTelegramAlert(message, coords)
      setAlertState(ALERT_STATES.TELEGRAM_SENT)
    } catch {
      setAlertState(ALERT_STATES.ALARMING)
    }
  }, [])

  const resolveAlarm = useCallback(() => {
    if (sirenStopRef.current) {
      sirenStopRef.current()
      sirenStopRef.current = null
    }
    stopSiren()
    setAlertState(ALERT_STATES.RESOLVED)
    setTimeout(() => setAlertState(ALERT_STATES.IDLE), 2000)
  }, [])

  const isAlarming = alertState === ALERT_STATES.ALARMING ||
                     alertState === ALERT_STATES.TELEGRAM_SENDING ||
                     alertState === ALERT_STATES.TELEGRAM_SENT

  return (
    <AlertContext.Provider value={{
      alertState, gpsCoords, alertMessage, emergencyPhone, isAlarming,
      triggerAlarm, resolveAlarm, ALERT_STATES,
    }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert must be used within AlertProvider')
  return ctx
}
