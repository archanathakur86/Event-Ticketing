import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function PaymentFailurePage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const txnid = params.get('txnid')
  const error = params.get('error')

  const getErrorMessage = () => {
    if (error === 'order_not_found') return 'Order not found. Please try booking again.'
    if (error === 'server_error') return 'Server error occurred. Please try again later.'
    if (error === 'capacity_refund') return 'Another payment was confirmed first for the last available seat. Your payment will be refunded.'
    return 'Something went wrong while processing your payment. Please try again or contact support if the problem persists.'
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-full bg-red-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-10.536a1 1 0 10-1.414-1.414L10 8.586 8.879 7.464a1 1 0 00-1.414 1.414L8.586 10l-1.121 1.121a1 1 0 101.414 1.414L10 11.414l1.121 1.121a1 1 0 001.414-1.414L11.414 10l1.122-1.122z" clipRule="evenodd" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-gray-900">Payment Failed</h1>
        <p className="mt-2 text-sm text-gray-600">{getErrorMessage()}</p>

        {txnid && (
          <p className="mt-2 text-xs text-gray-400">Transaction ID: {txnid}</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate('/student/browse')}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none"
          >
            Try Again
          </button>

          <button
            onClick={() => navigate('/student')}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Dashboard
          </button>

          <button
            onClick={() => navigate('/student/support')}
            className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}
