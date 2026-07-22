import { useState, useEffect } from 'react'
import { useWorker } from '../../context/WorkerContext'
import { t } from '../../lib/i18n'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const { worker } = useWorker()

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      online
        ? 'bg-safe/10 text-safe'
        : 'bg-warning/10 text-warning'
    }`}>
      <div className={`w-2 h-2 rounded-full ${online ? 'bg-safe' : 'bg-warning animate-pulse'}`} />
      <span>{online ? t('app.online', worker.language) : t('app.offline', worker.language)}</span>
    </div>
  )
}
