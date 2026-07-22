import { Link } from 'react-router-dom'
import LanguagePicker from '../shared/LanguagePicker'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-night/95 backdrop-blur-md border-b border-border-custom">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#3B82F6' }} />
                  <stop offset="100%" style={{ stopColor: '#F97316' }} />
                </linearGradient>
              </defs>
              <path
                d="M50 5 L90 20 L90 50 C90 75 70 92 50 98 C30 92 10 75 10 50 L10 20 Z"
                fill="url(#navGrad)"
              />
              <text x="50" y="58" textAnchor="middle" fontFamily="Inter,sans-serif"
                    fontSize="28" fontWeight="800" fill="white">SS</text>
            </svg>
          </div>
          <span className="font-bold text-text-primary group-hover:text-accent transition-colors">
            SafaiShield
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <LanguagePicker compact />
          <Link
            to="/profile"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface border border-border-custom hover:border-accent/50 transition-colors"
            aria-label="Profile"
          >
            <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
