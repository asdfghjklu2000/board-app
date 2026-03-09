import { useState, useRef, useEffect } from 'react'
import './MultiSelect.css'

export default function MultiSelect({ options, value, onChange, placeholder, allLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allSelected = value.length === 0 || value.length === options.length

  const toggleAll = () => onChange([])

  const toggle = (val) => {
    if (value.includes(val)) {
      const next = value.filter(v => v !== val)
      onChange(next)
    } else {
      onChange([...value, val])
    }
  }

  const label = allSelected
    ? (allLabel || `All`)
    : value.length === 1
      ? options.find(o => o.value === value[0])?.label || value[0]
      : `${value.length} selected`

  return (
    <div className="ms-wrap" ref={ref}>
      <button
        className={`ms-trigger ${open ? 'ms-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className="ms-trigger-label">{placeholder && <span className="ms-trigger-prefix">{placeholder}: </span>}{label}</span>
        <span className="ms-trigger-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ms-dropdown">
          {/* All option */}
          <label className="ms-option ms-option--all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span>All</span>
          </label>
          <div className="ms-divider" />
          {options.map(opt => (
            <label key={opt.value} className="ms-option">
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <span title={opt.label}>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
