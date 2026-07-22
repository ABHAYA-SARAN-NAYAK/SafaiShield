export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('🛡️ SafaiShield SW registered:', registration.scope)
      } catch (err) {
        console.log('SW registration failed:', err)
      }
    })
  }
}

export function isOnline() {
  return navigator.onLine
}

export function onOnlineStatusChange(callback) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))

  return () => {
    window.removeEventListener('online', () => callback(true))
    window.removeEventListener('offline', () => callback(false))
  }
}
