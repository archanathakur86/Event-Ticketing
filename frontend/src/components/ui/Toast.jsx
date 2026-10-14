import React, { useEffect, useState } from 'react'

let pushToast = null
let queuedToasts = []

export function showToast({ title = '', message = '', type = 'info', timeout = 4000 } = {}) {
  const t = { id: Date.now(), title, message, type, timeout }
  if (typeof pushToast === 'function') {
    pushToast(t)
  } else {
    queuedToasts.push(t)
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    pushToast = (t) => setToasts((s) => [t, ...s])
    if (queuedToasts.length) {
      queuedToasts.forEach((t) => pushToast(t))
      queuedToasts = []
    }
    return () => {
      pushToast = null
    }
  }, [])

  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((t) => {
      return setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== t.id))
      }, t.timeout)
    })
    return () => timers.forEach((id) => clearTimeout(id))
  }, [toasts])

  if (!toasts.length) return null

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-sm w-full px-4 py-3 rounded-md shadow-md border ${
            t.type === 'error' ? 'bg-red-50 border-red-200' : t.type === 'warn' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {t.title && <div className="text-sm font-semibold text-gray-900">{t.title}</div>}
              {t.message && <div className="text-sm text-gray-700">{t.message}</div>}
            </div>
            <button
              onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export { pushToast as __internal_pushToast }
