import en from '../translations/en'
import hi from '../translations/hi'
import te from '../translations/te'
import ta from '../translations/ta'

const translations = { en, hi, te, ta }

export function t(key, language = 'en') {
  const lang = translations[language] || translations.en
  const fallback = translations.en

  // Support nested keys like 'home.greeting'
  const keys = key.split('.')
  let value = lang
  let fallbackValue = fallback

  for (const k of keys) {
    value = value?.[k]
    fallbackValue = fallbackValue?.[k]
  }

  return value || fallbackValue || key
}

export function getLanguageName(code) {
  const names = {
    en: 'English',
    hi: 'हिंदी',
    te: 'తెలుగు',
    ta: 'தமிழ்',
  }
  return names[code] || 'English'
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
]
