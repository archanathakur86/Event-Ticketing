import React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

export default function EventAccessRoute({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, initialized } = useAuthStore()

  if (!initialized) return null
  if (user) return children

  const from = `${location.pathname}${location.search || ''}${location.hash || ''}`

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#123386]">
          Authentication Required
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Login or create an account to view events.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Event listings and event details are only available after authentication. Continue with login or create a new account to access events.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/login', { state: { from } })}
            className="rounded-xl bg-[#123386] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0f2c73]"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate('/register', { state: { from } })}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  )
}
