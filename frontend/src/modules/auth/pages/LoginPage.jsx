import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login as authLogin } from '@/api/auth.api'
import useAuthStore from '@/store/authStore'
import { showToast } from '../../../components/ui/Toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()
  const redirectTo = location.state?.from || null

  function withTimeout(promise, timeoutMs = 8000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('Sign in timed out. Please check backend/database and try again.')), timeoutMs)
      }),
    ])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await withTimeout(authLogin(email, password))
      if (setUser) setUser(user)
      if (redirectTo) {
        navigate(redirectTo)
        return
      }
      const role = String(user?.role || '')

      if (role === 'super admin') {
        navigate('/admin')
      } else if (role === 'coordinator') {
        navigate('/coordinator')
      } else if (role === 'administration') {
        navigate('/administrator')
      } else {
        navigate('/student')
      }
    } catch (err) {
      setError(err?.message || 'Login failed')
      try { showToast({ title: 'Sign in failed', message: err?.message || 'Login failed', type: 'error' }) } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickLogin(email, password) {
    setError(null)
    setLoading(true)
    try {
      const user = await withTimeout(authLogin(email, password))
      if (setUser) setUser(user)
      showToast({ title: 'Signed in', message: `Signed in as ${user.name || user.email}`, type: 'success' })
      if (redirectTo) {
        navigate(redirectTo)
        return
      }
      const role = String(user?.role || '')
      if (role === 'super admin') navigate('/admin')
      else if (role === 'coordinator') navigate('/coordinator')
      else if (role === 'administration') navigate('/administrator')
      else navigate('/student')
    } catch (err) {
      setError(err?.message || 'Login failed')
      try { showToast({ title: 'Sign in failed', message: err?.message || 'Login failed', type: 'error' }) } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-md rounded-lg ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold text-gray-900 text-center">Login to your account</h2>
          <p className="mt-2 text-sm text-gray-500 text-center">Sign in to access the student dashboard</p>

          <form className="mt-6" onSubmit={handleSubmit}>
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-700">Remember me</span>
              </label>

              {/* <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-700">
                  Forgot Password?
                </a>
              </div> */}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register', { state: redirectTo ? { from: redirectTo } : undefined })}
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
