const QUEUE_KEY = 'safaishield_telegram_queue'

export async function sendTelegramAlert(param1, param2) {
  let alertType = 'alarm_triggered'
  let details = {}

  if (typeof param1 === 'string' && ['alarm_triggered', 'job_start', 'job_safe_exit', 'violation_report'].includes(param1)) {
    alertType = param1
    details = param2 || {}
  } else if (typeof param1 === 'string') {
    // Legacy call: param1 is message text, param2 is coords
    details = {
      reportText: param1,
      coords: param2,
    }
  }

  let deviceId = ''
  let workerName = ''
  try {
    const saved = JSON.parse(localStorage.getItem('safaishield_worker') || '{}')
    deviceId = saved.deviceId || ''
    workerName = saved.name || 'Worker'
  } catch {}

  const alertData = {
    device_id: deviceId,
    alert_type: alertType,
    worker_name: workerName,
    location_text: details.locationText || (details.coords ? `${details.coords.lat.toFixed(4)}, ${details.coords.lng.toFixed(4)}` : 'Unknown'),
    risk_tier: details.riskTier || null,
    report_text: details.reportText || null,
    timestamp: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    queueMessage(alertData)
    throw new Error('Offline — alert queued')
  }

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const res = await fetch(`${apiUrl}/api/telegram/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertData),
    })
    if (!res.ok) throw new Error('Backend error')
    return true
  } catch (err) {
    queueMessage(alertData)
    console.log('📱 Telegram alert queued:', alertData)
    return true
  }
}

export async function sendReport(reportText, workerPhone) {
  // Map to violation_report alert type
  return sendTelegramAlert('violation_report', { reportText })
}

function queueMessage(data) {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    queue.push(data)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {}
}

export function getQueuedMessages() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

export function syncQueuedMessages() {
  if (!navigator.onLine) return

  const queue = getQueuedMessages()
  if (queue.length === 0) return

  queue.forEach(async (msg) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      await fetch(`${apiUrl}/api/telegram/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      })
    } catch {}
  })

  clearQueue()
}
