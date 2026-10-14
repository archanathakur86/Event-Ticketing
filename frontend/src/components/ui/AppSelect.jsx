import React, { useEffect, useMemo, useRef, useState } from 'react'

export default function AppSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  className = '',
  menuClassName = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function onDocClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value],
  )

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <svg className={`ml-3 h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <div className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${menuClassName}`}>
          <div className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options</div>
            ) : (
              options.map((option) => {
                const active = String(option.value) === String(value)
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => {
                      onChange?.(option.value)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <span className="truncate">{option.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
