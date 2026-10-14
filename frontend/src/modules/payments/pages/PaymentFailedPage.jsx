import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function PaymentFailedPage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const reason = params.get('reason') || 'payment_failed'

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-full bg-red-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.707-10.707a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293z" clipRule="evenodd" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-gray-900">Payment Failed</h1>
        <p className="mt-2 text-sm text-gray-600">Your payment could not be completed. Reason: <span className="font-medium text-gray-800">{reason}</span></p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none"
          >
            Retry Payment
          </button>

          <button
            onClick={() => navigate('/events')}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Browse Events
          </button>
        </div>
      </div>
    </div>
  )
}
