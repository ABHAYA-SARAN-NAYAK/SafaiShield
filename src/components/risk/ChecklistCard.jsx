import { useState } from 'react'

export default function ChecklistCard({ items = [], onComplete }) {
  const [checked, setChecked] = useState({})

  const toggle = (id) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)

    // Check if all required items are checked
    const required = items.filter(i => i.required)
    const allChecked = required.every(i => next[i.id])
    if (allChecked) onComplete?.()
  }

  const requiredCount = items.filter(i => i.required).length
  const checkedRequired = items.filter(i => i.required && checked[i.id]).length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted">
          {checkedRequired}/{requiredCount} required items
        </span>
        {checkedRequired === requiredCount && requiredCount > 0 && (
          <span className="badge-safe text-[10px]">✓ Ready</span>
        )}
      </div>

      {items.map(item => (
        <button
          key={item.id}
          onClick={() => toggle(item.id)}
          className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
            checked[item.id]
              ? 'bg-safe/10 border-safe/30'
              : 'bg-night border-border-custom hover:border-accent/30'
          }`}
        >
          <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            checked[item.id]
              ? 'bg-safe border-safe'
              : 'border-muted'
          }`}>
            {checked[item.id] && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <span className={`text-sm ${checked[item.id] ? 'text-safe line-through' : 'text-text-primary'}`}>
              {item.text}
            </span>
            {item.required && !checked[item.id] && (
              <span className="ml-2 text-[10px] text-danger font-medium">REQUIRED</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
