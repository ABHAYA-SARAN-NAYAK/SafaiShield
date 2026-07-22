export default function RiskBadge({ level = 'medium', size = 'md' }) {
  const config = {
    high: { class: 'badge-danger', label: 'HIGH RISK', icon: '🔴' },
    medium: { class: 'badge-warning', label: 'MEDIUM RISK', icon: '🟠' },
    low: { class: 'badge-safe', label: 'LOW RISK', icon: '🟢' },
  }

  const { class: cls, label, icon } = config[level] || config.medium

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5',
  }

  return (
    <span className={`${cls} ${sizeClasses[size] || sizeClasses.md}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </span>
  )
}
