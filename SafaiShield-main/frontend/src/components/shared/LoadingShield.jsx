export default function LoadingShield({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative w-20 h-20">
        {/* Shield shape */}
        <svg viewBox="0 0 100 100" className="w-full h-full animate-pulse-slow">
          <defs>
            <linearGradient id="loadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: '#F97316', stopOpacity: 0.8 }} />
            </linearGradient>
          </defs>
          <path
            d="M50 5 L90 20 L90 50 C90 75 70 92 50 98 C30 92 10 75 10 50 L10 20 Z"
            fill="url(#loadGrad)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
        </svg>
        {/* Spinning ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
      <p className="text-muted text-sm">{text}</p>
    </div>
  )
}
