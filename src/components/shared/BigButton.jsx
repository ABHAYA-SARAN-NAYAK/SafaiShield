export default function BigButton({ children, onClick, variant = 'accent', disabled = false, className = '', icon, subtitle }) {
  const variants = {
    danger: 'btn-cta-danger',
    safe: 'btn-cta-safe',
    accent: 'btn-cta-accent',
    warning: 'btn-cta-warning',
    surface: 'btn-cta-surface',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant] || variants.accent} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <span>{children}</span>
        </div>
        {subtitle && <span className="text-xs font-normal opacity-80">{subtitle}</span>}
      </div>
    </button>
  )
}
