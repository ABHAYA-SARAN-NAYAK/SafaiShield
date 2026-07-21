import { createContext, useContext, useState, useCallback } from 'react'

const SessionContext = createContext(null)

const DEFAULT_SESSION = {
  active: false,
  // Pre-entry check data
  siteType: null,           // 'sewer' | 'septic' | 'ewaste' | 'drain'
  lastCleaned: null,        // '<1week' | '1-4weeks' | '1-6months' | '>6months'
  recentRain: null,         // 'yes' | 'no' | 'unsure'
  depth: null,              // '<3ft' | '3-6ft' | '6-10ft' | '>10ft'
  equipment: [],            // ['gas_detector', 'rope', 'blower', 'gloves', 'helmet', 'none']
  employer: '',
  // Weather
  temperature: null,
  humidity: null,
  // Location
  latitude: null,
  longitude: null,
  // Risk result
  riskScore: null,
  riskLevel: null,          // 'low' | 'medium' | 'high'
  riskDetails: '',
  checklist: [],
  checkCompleted: false,
  checkCompletedAt: null,
  // Descent
  descentActive: false,
  descentStartedAt: null,
  companionVerified: false,
  companionCode: '',
  pingHistory: [],
  // Post-job
  gearProvided: null,
  forcedEntry: null,
  issues: [],
  report: null,
  reportHash: null,
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState({ ...DEFAULT_SESSION })

  const updateSession = useCallback((updates) => {
    setSession(prev => ({ ...prev, ...updates }))
  }, [])

  const startCheck = useCallback(() => {
    setSession(prev => ({
      ...DEFAULT_SESSION,
      active: true,
      latitude: prev.latitude,
      longitude: prev.longitude,
    }))
  }, [])

  const completeCheck = useCallback((riskData) => {
    setSession(prev => ({
      ...prev,
      ...riskData,
      checkCompleted: true,
      checkCompletedAt: Date.now(),
    }))
  }, [])

  const startDescent = useCallback(() => {
    setSession(prev => ({
      ...prev,
      descentActive: true,
      descentStartedAt: Date.now(),
      pingHistory: [],
    }))
  }, [])

  const addPing = useCallback(() => {
    setSession(prev => ({
      ...prev,
      pingHistory: [...prev.pingHistory, { time: Date.now(), status: 'ok' }],
    }))
  }, [])

  const endSession = useCallback(() => {
    // Save to job history before resetting
    const jobLog = { ...session, endedAt: Date.now() }
    try {
      const history = JSON.parse(localStorage.getItem('safaishield_history') || '[]')
      history.unshift(jobLog)
      localStorage.setItem('safaishield_history', JSON.stringify(history))
    } catch (e) {
      console.error('Failed to save job history:', e)
    }
    setSession({ ...DEFAULT_SESSION })
  }, [session])

  const resetSession = useCallback(() => {
    setSession({ ...DEFAULT_SESSION })
  }, [])

  return (
    <SessionContext.Provider value={{
      session, updateSession, startCheck, completeCheck,
      startDescent, addPing, endSession, resetSession,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
