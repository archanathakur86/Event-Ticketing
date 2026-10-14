import React, { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { register as authRegister, isEmailAvailable } from '@/api/auth.api'
import { showToast } from '../../../components/ui/Toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [emailAvailable, setEmailAvailable] = useState(null) 
  const [checkingEmail, setCheckingEmail] = useState(false)
  const redirectTo = location.state?.from || null

  const passwordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword])
  const passwordStrong = useMemo(() => {
    const hasLength = password.length >= 8
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;-]/.test(password)
    return hasLength && hasSpecial
  }, [password])
  const canSubmit = name && email && password && confirmPassword && passwordsMatch && passwordStrong && emailAvailable === true

  async function handleSubmit(e) {
    e.preventDefault()
    if (!passwordsMatch) return
    setSubmitting(true)
    setError(null)

    try {

      const ok = await isEmailAvailable(email)
      if (!ok) throw new Error('This email is already registered. Try logging in.')
      await authRegister({ name, email, phone, password })
      navigate('/login', { state: redirectTo ? { from: redirectTo } : undefined })
    } catch (err) {
      const status = err?.status || err?.response?.status
      // If backend indicates email already registered, show the yellow banner immediately
      if (status === 409 || String(err?.message).toLowerCase().includes('email already')) {
        setEmailAvailable(false)
        const msg = 'This email is already registered. Try logging in.'
        setError(msg)
        try { showToast({ title: 'Email exists', message: msg, type: 'warn' }) } catch (e) {}
      } else {
        const msg = err?.message || 'Registration failed'
        setError(msg)
        try { showToast({ title: 'Registration error', message: msg, type: 'error' }) } catch (e) {}
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-md rounded-lg ring-1 ring-black/5">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 mr-3">
              <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="8" fill="#123386" />
                <path d="M12 28c4-6 8-10 12-10s8 4 12 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="24" cy="18" r="4" fill="#ffffff" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Create your account</h2>
              <p className="text-sm text-gray-500">Create an account to get started — organizers, students, and attendees welcome.</p>
            </div>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
            {email && emailAvailable === false && (
              <div className="flex items-start justify-between gap-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center font-semibold">!</div>
                  <div className="text-sm text-yellow-900">
                    This email is already registered. <strong>Try logging in</strong> to continue.
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: redirectTo ? { from: redirectTo } : undefined })}
                    className="px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
                  >
                    Login
                  </button>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailAvailable(null)
                  }}
                  onBlur={async () => {
                    if (!email) return
                    setCheckingEmail(true)
                    setError(null)
                    try {
                      const ok = await isEmailAvailable(email)
                      setEmailAvailable(ok)
                      if (ok === false) {
                        showToast({ title: 'Email exists', message: 'This email is already registered — try logging in.', type: 'warn' })
                      }
                    } catch (err) {
                      setEmailAvailable(null)
                    } finally {
                      setCheckingEmail(false)
                    }
                  }}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>
            {checkingEmail && (
              <p className="mt-2 text-sm text-gray-500">Checking email availability…</p>
            )}
            {email && emailAvailable === false && (
              <p className="mt-2 text-sm text-red-600">This email is already registered. Try logging in.</p>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">Use at least 8 characters and include a special character (e.g. !@#$%).</p>
              {password && !passwordStrong && (
                <p className="mt-2 text-sm text-red-600">Password must be 8+ characters and include a special character.</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-200'}`}
                />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="mt-2 text-sm text-red-600">Passwords do not match.</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white ${canSubmit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
              >
                {submitting ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigate('/login')
              }}
              className="text-blue-600 font-medium hover:text-blue-700 cursor-pointer"
            >
              Login
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed top-6 right-6 bg-white border border-red-100 shadow-md rounded-md px-4 py-3 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-semibold">!</div>
            <div className="text-sm font-medium text-gray-900">{error}</div>
          </div>
        </div>
      )}
    </div>
  )
}
