import { useState, useRef, useCallback } from 'react'

const LANGUAGE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
}

export function useVoice(language = 'en') {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const isSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice not supported on this browser. Use Chrome.')
      return
    }

    setError(null)
    setTranscript('')
    setInterimTranscript('')

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SR()
    recognitionRef.current.lang = LANGUAGE_MAP[language] || 'en-IN'
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = true

    recognitionRef.current.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(text)
      // Show interim results live
      const last = e.results[e.results.length - 1]
      if (last && !last.isFinal) {
        setInterimTranscript(last[0].transcript)
      } else {
        setInterimTranscript('')
      }
    }

    recognitionRef.current.onerror = (e) => {
      setError(e.error)
      setListening(false)
    }

    recognitionRef.current.onend = () => setListening(false)

    recognitionRef.current.start()
    setListening(true)
  }, [language, isSupported])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = LANGUAGE_MAP[language] || 'en-IN'
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  }, [language])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
  }, [])

  return {
    transcript,
    interimTranscript,
    listening,
    error,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
