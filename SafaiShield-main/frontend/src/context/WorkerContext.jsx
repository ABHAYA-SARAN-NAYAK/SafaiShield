import { createContext, useContext, useState, useEffect } from 'react'

const WorkerContext = createContext(null)

const DEFAULT_WORKER = {
  deviceId: '',
  name: '',
  phone: '',
  city: '',
  language: 'en',
  emergencyContactName: '',
  emergencyContactTelegram: '',
  telegramLinked: false,
  telegramCode: '',
  setupComplete: false,
}

export function WorkerProvider({ children }) {
  const [worker, setWorker] = useState(() => {
    try {
      const saved = localStorage.getItem('safaishield_worker')
      const parsed = saved ? JSON.parse(saved) : {}
      if (!parsed.deviceId) {
        parsed.deviceId = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36)
      }
      return { ...DEFAULT_WORKER, ...parsed }
    } catch {
      const deviceId = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36)
      return { ...DEFAULT_WORKER, deviceId }
    }
  })

  useEffect(() => {
    localStorage.setItem('safaishield_worker', JSON.stringify(worker))
  }, [worker])

  const updateWorker = (updates) => {
    setWorker(prev => ({ ...prev, ...updates }))
  }

  const setLanguage = (lang) => {
    setWorker(prev => ({ ...prev, language: lang }))
  }

  const resetWorker = () => {
    setWorker({ ...DEFAULT_WORKER })
    localStorage.removeItem('safaishield_worker')
  }

  // Auto-detect language from browser
  useEffect(() => {
    if (!worker.language || worker.language === 'en') {
      const browserLang = navigator.language?.toLowerCase() || ''
      if (browserLang.startsWith('hi')) setLanguage('hi')
      else if (browserLang.startsWith('te')) setLanguage('te')
      else if (browserLang.startsWith('ta')) setLanguage('ta')
    }
  }, [])

  return (
    <WorkerContext.Provider value={{ worker, updateWorker, setLanguage, resetWorker }}>
      {children}
    </WorkerContext.Provider>
  )
}

export function useWorker() {
  const ctx = useContext(WorkerContext)
  if (!ctx) throw new Error('useWorker must be used within WorkerProvider')
  return ctx
}
