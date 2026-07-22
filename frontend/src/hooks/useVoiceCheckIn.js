import { useState, useRef, useCallback } from 'react'

const PROMPTS = {
  en: 'Are you okay? Say yes to confirm.',
  hi: 'Kya aap theek hain? Haan bolein.',
  te: 'Meeru okay ga unnara? Avunu cheppandi.',
  ta: 'Neengal sari irkkireerkalaa? Aamaam sollunga.',
}

const SAFE_WORDS = [
  'yes', 'okay', 'ok', 'safe',
  'haan', 'theek',
  'avunu', 'aamaam',
]

const EMERGENCY_WORDS = [
  'no', 'help', 'emergency', 'danger',
  'nahi', 'ledu', 'illai',
]

export function useVoiceCheckIn({
  language = 'en',
  onSafeConfirmed,
  onEmergencyTriggered,
  onTimeout,
}) {
  const [isListening, setIsListening] = useState(false)
  const [isPrompting, setIsPrompting] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const [flashGreen, setFlashGreen] = useState(false)
  const [lastSpeech, setLastSpeech] = useState('')

  const recognitionRef = useRef(null)
  const timeoutRef = useRef(null)

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      osc.start()
      setTimeout(() => { osc.stop(); ctx.close() }, 250)
    } catch {}
  }, [])

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    setIsListening(false)
    setIsPrompting(false)
  }, [])

  const triggerSafe = useCallback(() => {
    cleanup()
    setWarningMessage('')
    setFlashGreen(true)
    playBeep()
    setTimeout(() => setFlashGreen(false), 1500)
    onSafeConfirmed?.('voice')
  }, [cleanup, onSafeConfirmed, playBeep])

  const triggerEmergency = useCallback(() => {
    cleanup()
    setWarningMessage('')
    onEmergencyTriggered?.()
  }, [cleanup, onEmergencyTriggered])

  const triggerTimeout = useCallback(() => {
    cleanup()
    setWarningMessage('')
    onTimeout?.()
  }, [cleanup, onTimeout])

  const listenForCheckIn = useCallback(() => {
    if (typeof window === 'undefined') return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      triggerTimeout()
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN'
    recognition.continuous = false
    recognition.interimResults = true

    let detectedResponse = false
    let finished = false

    const finishTimeout = () => {
      if (finished) return
      finished = true
      triggerTimeout()
    }

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('').toLowerCase()
      setLastSpeech(text)

      const hasSafe = SAFE_WORDS.some(w => text.includes(w))
      const hasEmergency = EMERGENCY_WORDS.some(w => text.includes(w))

      if (hasEmergency) {
        detectedResponse = true
        finished = true
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        try { recognition.stop() } catch {}
        triggerEmergency()
      } else if (hasSafe) {
        detectedResponse = true
        finished = true
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        try { recognition.stop() } catch {}
        triggerSafe()
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (detectedResponse || finished) return
      finishTimeout()
    }

    try {
      setIsListening(true)
      recognition.start()
      // 10-second timeout
      timeoutRef.current = setTimeout(() => {
        if (detectedResponse || finished) return
        try { recognition.stop() } catch {}
        setIsListening(false)
        finishTimeout()
      }, 10000)
    } catch {
      setIsListening(false)
      finishTimeout()
    }
  }, [language, triggerSafe, triggerEmergency, triggerTimeout])

  const startVoiceCheckInPrompt = useCallback(() => {
    cleanup()
    setWarningMessage('')

    if (!window.speechSynthesis) {
      setIsPrompting(true)
      listenForCheckIn()
      return
    }

    window.speechSynthesis.cancel()
    const promptText = PROMPTS[language] || PROMPTS.en
    const utterance = new SpeechSynthesisUtterance(promptText)
    utterance.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN'
    utterance.rate = 0.9

    setIsPrompting(true)

    utterance.onend = () => {
      setIsPrompting(false)
      listenForCheckIn()
    }

    utterance.onerror = () => {
      setIsPrompting(false)
      listenForCheckIn()
    }

    window.speechSynthesis.speak(utterance)
  }, [language, listenForCheckIn, cleanup])

  const stopVoiceCheckIn = useCallback(() => {
    cleanup()
  }, [cleanup])

  return {
    startVoiceCheckInPrompt,
    stopVoiceCheckIn,
    triggerSafe,
    triggerEmergency,
    isListening,
    isPrompting,
    warningMessage,
    flashGreen,
    lastSpeech,
  }
}
