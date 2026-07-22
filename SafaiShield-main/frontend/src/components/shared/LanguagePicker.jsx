import { useState } from 'react'
import { useWorker } from '../../context/WorkerContext'
import { SUPPORTED_LANGUAGES } from '../../lib/i18n'

export default function LanguagePicker({ compact = false }) {
  const { worker, setLanguage } = useWorker()
  const [open, setOpen] = useState(false)

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border-custom rounded-xl text-sm hover:border-accent/50 transition-colors"
        >
          <span className="text-lg">🌐</span>
          <span className="text-text-primary">{SUPPORTED_LANGUAGES.find(l => l.code === worker.language)?.nativeName || 'English'}</span>
          <svg className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 bg-surface border border-border-custom rounded-xl shadow-2xl overflow-hidden min-w-[160px] animate-fade-in">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setOpen(false) }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-night/50 transition-colors flex items-center gap-3 ${
                    worker.language === lang.code ? 'text-accent bg-accent/10' : 'text-text-primary'
                  }`}
                >
                  <span className="font-medium">{lang.nativeName}</span>
                  {worker.language === lang.code && <span className="ml-auto text-accent">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {SUPPORTED_LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`option-card justify-center ${worker.language === lang.code ? 'selected' : ''}`}
        >
          <div className="text-center">
            <div className="font-semibold text-lg">{lang.nativeName}</div>
            <div className="text-xs text-muted">{lang.name}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
