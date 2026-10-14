import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getEventById } from '@/api/events.api'
import { getAdminTickets } from '@/api/tickets.api'
import { getPaymentsByEvent } from '@/api/payments.api'

export default function EventTicketsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [tickets, setTickets] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [ev, tRes, pRes] = await Promise.all([
          getEventById(id),
          getAdminTickets({ event_id: id }),
          getPaymentsByEvent(id),
        ])
        if (!mounted) return
        setEvent(ev || null)
        setTickets(Array.isArray(tRes?.tickets) ? tRes.tickets : [])
        setPayments(Array.isArray(pRes?.payments) ? pRes.payments : [])
      } catch (e) {
        if (!mounted) return
        const status = e?.status || e?.response?.status
        if (status === 401 || status === 403) {
          navigate('/login')
          return
        }
        setError(e?.message || 'Failed to load event tickets')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [id, navigate])

  const stats = useMemo(() => {
    const booked = tickets.filter(t => String(t.status || '').toLowerCase() === 'booked').length
    const pending = tickets.filter(t => String(t.status || '').toLowerCase() === 'pending').length
    const cancelled = tickets.filter(t => String(t.status || '').toLowerCase() === 'cancelled').length
    return { total: tickets.length, booked, pending, cancelled }
  }, [tickets])

  const paymentBuyers = useMemo(() => {
    return (payments || []).map((p) => ({
      id: p?._id,
      name: p?.user_id?.fullName || '-',
      email: p?.user_id?.email || '-',
      paymentStatus: p?.payment_status || '-',
      amount: p?.amount,
      date: p?.payment_date || p?.created_at,
      ticketCode: p?.ticket_id?.ticket_code || '-',
    }))
  }, [payments])

  function badge(value, type) {
    const key = String(value || '').toLowerCase()
    if (type === 'ticket') {
      if (key === 'booked') return 'bg-green-100 text-green-800'
      if (key === 'pending') return 'bg-amber-100 text-amber-800'
      if (key === 'cancelled') return 'bg-red-100 text-red-800'
    }
    if (type === 'payment') {
      if (key === 'paid' || key === 'completed' || key === 'success') return 'bg-green-100 text-green-800'
      if (key === 'pending') return 'bg-amber-100 text-amber-800'
      if (key === 'failed') return 'bg-red-100 text-red-800'
      if (key === 'refunded') return 'bg-slate-100 text-slate-800'
    }
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Event Tickets</h1>
          <p className="text-sm text-gray-500">
            {event?.name || event?.event_name || 'Event'} · Ticket tracking and verification
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/events')}
          className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50"
        >
          Back to Events
        </button>
      </div>

      {loading ? (
        <div className="p-6 bg-white border rounded-lg">Loading tickets...</div>
      ) : error ? (
        <div className="p-6 bg-white border rounded-lg text-red-600">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs text-gray-500">Total Tickets</div>
              <div className="text-xl font-semibold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs text-gray-500">Booked</div>
              <div className="text-xl font-semibold text-green-700">{stats.booked}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-xl font-semibold text-amber-700">{stats.pending}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-xs text-gray-500">Cancelled</div>
              <div className="text-xl font-semibold text-red-700">{stats.cancelled}</div>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            {tickets.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No ticket records found for this event.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ticket ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ticket Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payment Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Booking Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {tickets.map((t) => (
                      <tr key={t._id}>
                        <td className="px-4 py-3 text-gray-700">{t.ticket_code || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{t.user_id?.fullName || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{t.user_id?.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${badge(t.status, 'ticket')}`}>{t.status || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${badge(t.payment_status, 'payment')}`}>{t.payment_status || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/admin/tickets/${t._id}`)}
                            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {tickets.length === 0 && paymentBuyers.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">Payment Buyers (Fallback)</h3>
                <p className="text-xs text-gray-500">Ticket records missing, but payment records found for this event.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payment Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Ticket Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paymentBuyers.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-gray-700">{p.name}</td>
                        <td className="px-4 py-3 text-gray-600">{p.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${badge(p.paymentStatus, 'payment')}`}>{p.paymentStatus}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{typeof p.amount === 'number' ? p.amount : '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{p.ticketCode}</td>
                        <td className="px-4 py-3 text-gray-600">{p.date ? new Date(p.date).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
