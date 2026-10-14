import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEventById } from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import * as paymentService from '@/api/payments.api'

export default function AdminEventViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [tickets, setTickets] = useState([])
  const [payments, setPayments] = useState([])
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      console.log('AdminEventViewPage: load for id=', id)
      setLoading(true)
      try {
        const evRaw = await getEventById(id)
        const ev = evRaw || null
        // fetch tickets and payments using server-side filters
        const tRes = await ticketService.getTicketsByEvent(id)
        const pRes = await paymentService.getPaymentsByEvent(id)
        if (!mounted) return
        setEvent(ev)
        console.log('AdminEventViewPage: set event', ev)
        setTickets((tRes && tRes.tickets) ? tRes.tickets : [])
        setPayments((pRes && pRes.payments) ? pRes.payments : [])
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  // reload tickets when status filter changes
  useEffect(() => {
    let mounted = true
    async function reloadTickets() {
      try {
        const filters = {}
        if (id) filters.event_id = id
        if (ticketStatusFilter && ticketStatusFilter !== 'all') filters.status = ticketStatusFilter
        const list = await ticketService.getAllTickets(filters)
        if (!mounted) return
        setTickets(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error('Failed to reload tickets', e)
      }
    }
    reloadTickets()
    return () => { mounted = false }
  }, [id, ticketStatusFilter])

  if (loading) return <div className="p-6">Loading...</div>
  if (!event) return <div className="p-6">Event not found</div>

  const capacity = Number(event.capacity || 0)
  const ticketsSold = (tickets || []).filter(t => String(t.status || '').toLowerCase() === 'booked').length
  const remainingTickets = Math.max(0, capacity - ticketsSold)
  const totalRevenue = (payments || []).filter(p => ['success', 'paid', 'completed'].includes(String(p.status || '').toLowerCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const fill = capacity > 0 ? Math.round((ticketsSold / capacity) * 100) : 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500">{event.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/admin/events/${id}/tickets`)} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">View Tickets</button>
          <button onClick={() => navigate('/admin/events')} className="px-3 py-2 bg-gray-100 rounded-md text-sm">Back</button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-500">Fill Percentage</div>
          <div className="text-sm font-medium text-gray-700">{fill}%</div>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className={`${fill >= 70 ? 'bg-green-500' : fill >= 40 ? 'bg-amber-500' : 'bg-red-500'} h-2 rounded-full`}
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500">Total Capacity</div>
          <div className="text-xl font-medium text-gray-900">{capacity}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500">Tickets Sold</div>
          <div className="text-xl font-medium text-gray-900">{ticketsSold}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500">Remaining Tickets</div>
          <div className="text-xl font-medium text-gray-900">{remainingTickets}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500">Total Revenue</div>
          <div className="text-xl font-medium text-gray-900">${totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Recent Registrations</h3>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Showing {tickets.length} tickets</div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter:</label>
            <select value={ticketStatusFilter} onChange={(e) => setTicketStatusFilter(e.target.value)} className="px-2 py-1 border rounded text-sm">
              <option value="all">All</option>
              <option value="booked">Booked</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="text-sm text-gray-500">No registrations yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ticket Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">User Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">User Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ticket Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ticket Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Payment Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Created At</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {tickets.map(t => {
                  const rawUser = t.raw && t.raw.user_id ? t.raw.user_id : (typeof t.userId === 'object' ? t.userId : null)
                  const userName = rawUser ? (rawUser.fullName || rawUser.fullname || rawUser.name || '') : ''
                  const userEmail = rawUser ? (rawUser.email || '') : ''
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-gray-700">{t.ticketCode}</td>
                      <td className="px-4 py-2 text-gray-700">{userName}</td>
                      <td className="px-4 py-2 text-gray-600">{userEmail}</td>
                      <td className="px-4 py-2 text-gray-600">{t.ticketType || t.ticket_type || '-'}</td>
                      <td className="px-4 py-2 text-gray-600">{t.status}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {(() => {
                          const ps = (t.paymentStatus || t.payment_status || t.raw?.payment_status || t.raw?.status || '').toString()
                          const key = ps.toLowerCase()
                          if (key === 'refunded') return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Refunded</span>
                          if (key === 'pending') return <span className="px-2 py-1 text-xs rounded-full bg-amber-50 text-amber-800">Pending</span>
                          if (key === 'success' || key === 'paid' || key === 'completed') return <span className="px-2 py-1 text-xs rounded-full bg-green-50 text-green-800">{ps}</span>
                          if (key === 'failed') return <span className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-700">Failed</span>
                          return ps || '-'
                        })()}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{new Date(t.createdAt || t.created_at || t.raw?.created_at || Date.now()).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/tickets/${t.id}`)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const blob = await ticketService.downloadTicketPdf(t.id)
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `ticket-${t.ticketCode || t.id}.pdf`
                                document.body.appendChild(a)
                                a.click()
                                a.remove()
                                URL.revokeObjectURL(url)
                              } catch (err) {
                                console.error('Failed to download ticket', err)
                                alert('Failed to download ticket')
                              }
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
