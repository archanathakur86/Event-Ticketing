import React, { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-md rounded-lg ring-1 ring-black/5">
          <h2 className="text-2xl font-semibold text-gray-900 text-center">Forgot your password?</h2>
          <p className="mt-2 text-sm text-gray-500 text-center">Enter your email to receive a reset link.</p>

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

            <div className="mt-6">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Send Reset Link
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <a href="/login" className="text-blue-600 font-medium hover:text-blue-700">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
