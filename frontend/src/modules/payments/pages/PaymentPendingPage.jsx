import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function PaymentPendingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-full bg-yellow-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.681-1.36 3.446 0l5.518 9.8A1.75 1.75 0 0116.888 16H3.112a1.75 1.75 0 01-1.333-2.101l5.478-9.8zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-9a.75.75 0 00-.75.75v5.5c0 .414.336.75.75.75s.75-.336.75-.75v-5.5A.75.75 0 0010 4z" clipRule="evenodd" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-gray-900">Payment Pending</h1>
        <p className="mt-2 text-sm text-gray-600">Your payment is being processed. This may take a few moments — we will update your tickets once the payment completes.</p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate('/student')}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

