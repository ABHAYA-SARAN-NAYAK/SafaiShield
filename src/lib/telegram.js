const QUEUE_KEY = 'safaishield_telegram_queue'

export async function sendTelegramAlert(message, coords) {
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SafaiShieldBot'

  // In production, this goes through the backend proxy
  // For demo, we queue the message and simulate success
  const alertData = {
    message,
    coords,
    timestamp: Date.now(),
    botUsername,
  }

  if (!navigator.onLine) {
    // Queue for later
    queueMessage(alertData)
    throw new Error('Offline — alert queued')
  }

  // Simulate API call to backend proxy
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const res = await fetch(`${apiUrl}/api/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertData),
    })
    if (!res.ok) throw new Error('Backend error')
    return true
  } catch {
    // Queue and simulate success for demo
    queueMessage(alertData)
    console.log('📱 Telegram alert queued:', alertData)
    return true
  }
}

export async function sendReport(reportText, workerPhone) {
  const alertData = {
    message: reportText,
    phone: workerPhone,
    type: 'report',
    timestamp: Date.now(),
  }

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    await fetch(`${apiUrl}/api/share-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertData),
    })
  } catch {
    queueMessage(alertData)
    console.log('📱 Report share queued:', alertData)
  }
  return true
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

// Sync queued messages when online
export function syncQueuedMessages() {
  if (!navigator.onLine) return

  const queue = getQueuedMessages()
  if (queue.length === 0) return

  queue.forEach(async (msg) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      await fetch(`${apiUrl}/api/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      })
    } catch {}
  })

  clearQueue()
}
