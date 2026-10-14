import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '@/api/client'

export default function PaymentSuccessPage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const ticketId = params.get('ticket')

  const [loading, setLoading] = useState(true)
  const [payment, setPayment] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (!ticketId) throw new Error('Missing ticket id')
        const res = await api.get(`/api/payments/${ticketId}`)
        if (!mounted) return
        setPayment(res.payment || null)
        setTicket((res.payment && res.payment.ticket) || null)
      } catch (err) {
        setError(err?.data?.message || err.message || 'Failed to fetch payment')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [ticketId])

  const downloadTicket = async () => {
    try {
      if (!ticket || !ticket._id) return
      const url = `${import.meta.env.VITE_API_URL || ''}/api/tickets/download/${ticket._id}`
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to download ticket')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `ticket-${ticket._id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('download error', err)
      alert('Failed to download ticket')
    }
  }

  if (loading) return <div className="p-6">Loading payment status...</div>

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-xl font-semibold text-red-600">Payment info unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">{error}</p>
        <div className="mt-6">
          <button onClick={() => navigate('/events')} className="px-4 py-2 bg-indigo-600 text-white rounded">Browse Events</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Payment Successful</h2>
            <p className="text-sm text-gray-600">Your payment was processed successfully.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h3 className="text-sm text-gray-500">Ticket</h3>
            {ticket ? (
              <div className="mt-2">
                <div className="text-lg font-medium">{ticket.ticket_code || ticket.ticketCode || ticket._id}</div>
                <div className="text-sm text-gray-500 mt-1">Status: {ticket.status || 'booked'}</div>
                <div className="text-sm text-gray-500 mt-1">Type: {ticket.ticket_type || ticket.ticketType || 'regular'}</div>
              </div>
            ) : <div className="mt-2 text-sm text-gray-500">No ticket details available.</div>}
          </div>

          <div className="p-4 border rounded">
            <h3 className="text-sm text-gray-500">Payment</h3>
            <div className="mt-2">
              <div className="text-lg font-medium">{payment?.payment_status || payment?.status || 'success'}</div>
              <div className="text-sm text-gray-500 mt-1">Amount: ₹{payment?.amount || payment?.amount}</div>
              <div className="text-sm text-gray-500 mt-1">Transaction: {payment?.transaction_id || payment?.payu_txnid || payment?.id}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate('/student/tickets')} className="px-4 py-2 bg-indigo-600 text-white rounded">View My Tickets</button>
          <button onClick={downloadTicket} disabled={!ticket} className="px-4 py-2 bg-green-600 text-white rounded">Download Ticket</button>
          <button onClick={() => navigate('/student')} className="px-4 py-2 border rounded">Back to Dashboard</button>
        </div>
      </div>
    </div>
  )
}
