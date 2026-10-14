import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTicketsByUser, cancelTicket as cancelTicketRequest, downloadTicketPdf } from '@/api/tickets.api'
import { getCurrentUser } from '@/api/auth.api'
import QRCode from 'qrcode'
import useAuthStore from '@/store/authStore'

function formatPaymentLabel(ticket) {
  const ticketStatus = String(ticket?.ticketStatus || ticket?.status || '').toLowerCase()
  if (ticketStatus === 'cancelled') return 'Cancelled'
  const value = String(ticket?.paymentStatus || '').toLowerCase()
  if (value === 'paid') return 'Paid'
  if (!value && Number(ticket?.price || 0) <= 0) return 'Free'
  return 'Unpaid'
}

function canAccessTicketAsset(ticket) {
  const ticketStatus = String(ticket?.ticketStatus || ticket?.status || '').toLowerCase()
  if (ticketStatus === 'cancelled') return false
  const payment = String(ticket?.paymentStatus || '').toLowerCase()
  if (Number(ticket?.price || 0) <= 0) return true
  return payment === 'paid'
}

function shouldShowStudentTicket(ticket) {
  const ticketStatus = String(ticket?.ticketStatus || ticket?.status || '').toLowerCase()
  const payment = String(ticket?.paymentStatus || '').toLowerCase()
  if (ticketStatus === 'cancelled') return true
  if (Number(ticket?.price || 0) <= 0) return ticketStatus === 'booked'
  return ticketStatus === 'booked' && payment === 'paid'
}

export default function MyTicketsPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuthStore()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedQR, setSelectedQR] = useState(null)
  const [shareTicket, setShareTicket] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancellingTicketId, setCancellingTicketId] = useState(null)
  const [selectedQrImage, setSelectedQrImage] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const user = authUser || await getCurrentUser()
        if (!user) {
          navigate('/login')
          return
        }

        const items = await getTicketsByUser(user.id ?? user.email ?? user)
        if (!mounted) return
        setTickets((items || []).filter(shouldShowStudentTicket))
      } catch (err) {
        if (!mounted) return
        console.error('Failed to load tickets', err)
        if (!authUser && (err?.status === 401 || /auth|login|unauthor/i.test(String(err?.message || '')))) {
          navigate('/login')
          return
        }
        setError(err?.message || 'Failed to load tickets')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [navigate, authUser])

  const stats = useMemo(() => ({
    total: tickets.length,
    paid: tickets.filter(t => canAccessTicketAsset(t)).length,
    upcoming: tickets.filter(t => {
      const status = String(t.ticketStatus || t.status || '').toLowerCase()
      return status !== 'used' && status !== 'cancelled'
    }).length,
  }), [tickets])

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase()
    return tickets.filter(t => {
      const name = (t.eventName || t.event || t.name || '').toString().toLowerCase()
      const code = (t.ticketCode || t.code || '').toString().toLowerCase()
      const matchesQuery = !q || name.includes(q) || code.includes(q)

      if (!matchesQuery) return false

      if (!statusFilter || statusFilter === 'all') return true
      const payment = (t.paymentStatus || '').toString()
      const stat = (t.status || '').toString()
      if (statusFilter === 'paid') return payment.toLowerCase() === 'paid'
      if (statusFilter === 'used') return stat.toLowerCase() === 'used'
      if (statusFilter === 'cancelled') return stat.toLowerCase() === 'cancelled'
      return true
    })
  }, [tickets, query, statusFilter])

  useEffect(() => {
    async function onChange() {
      try {
        const u = authUser || await getCurrentUser()
        if (!u) return
        const items = await getTicketsByUser(u.id ?? u.email ?? u)
        setTickets((items || []).filter(shouldShowStudentTicket))
      } catch (e) { /* ignore */ }
    }
    window.addEventListener('tickets:changed', onChange)
    return () => window.removeEventListener('tickets:changed', onChange)
  }, [authUser])

  useEffect(() => {
    let active = true
    ;(async () => {
      const qrPayload = selectedQR?.qrCode || selectedQR?.qr_code || ''
      if (!qrPayload) {
        setSelectedQrImage('')
        return
      }
      try {
        const url = await QRCode.toDataURL(String(qrPayload))
        if (active) setSelectedQrImage(url)
      } catch (err) {
        if (active) setSelectedQrImage('')
      }
    })()
    return () => { active = false }
  }, [selectedQR])

  const handleDownload = (ticket) => {
    ;(async () => {
      try {
        if (!canAccessTicketAsset(ticket)) {
          alert('Only paid tickets can be downloaded.')
          return
        }
        const id = ticket?.id || ticket?._id
        if (!id) { alert('Ticket id missing'); return }
        const blob = await downloadTicketPdf(id)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(ticket.ticketCode || id)}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch (e) {
        console.error('Download failed', e)
        alert(e?.message || 'Failed to download ticket')
      }
    })()
  }

  const handleAddToCalendar = (ticket) => {
    try {
      const evDate = ticket.eventDate || ticket.date
      if (!evDate) { alert('No event date available'); return }
      const start = new Date(evDate)
      const end = new Date(start.getTime() + (ticket.durationMinutes || 60) * 60000)
      const pad = (n) => String(n).padStart(2, '0')
      const toCalendarDate = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: ticket.eventName || ticket.event || ticket.name || 'Event',
        dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
        details: `Ticket ${ticket.ticketCode || ''}`,
        location: ticket.location || '',
      })
      window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.warn('Failed to open calendar link', e)
      alert('Failed to add to calendar')
    }
  }

  const handleCancel = async (ticket) => {
    if (!ticket?.id || cancellingTicketId === ticket.id) return
    setCancellingTicketId(ticket.id)
    try {
      const updated = await cancelTicketRequest(ticket.id)
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...updated } : t))
      setCancelTarget(null)
      window.dispatchEvent(new CustomEvent('tickets:changed'))
      window.dispatchEvent(new CustomEvent('payments:changed'))
    } catch (e) {
      console.error('Failed to cancel ticket', e)
      alert(e?.message || 'Failed to cancel ticket')
    } finally {
      setCancellingTicketId(null)
    }
  }

  const handleShare = (ticket) => {
    if (!canAccessTicketAsset(ticket)) {
      alert('Complete payment first to share this ticket.')
      return
    }
    setShareTicket(ticket)
  }

  const shareVia = (platform) => {
    if (!shareTicket) return
    const eventName = shareTicket.eventName || shareTicket.event || shareTicket.name || 'Event'
    const code = shareTicket.ticketCode || shareTicket.code || ''
    const text = `I'm attending ${eventName}! My ticket code: ${code}`
    const url = window.location.href

    if (platform === 'copy') {
      navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
    }
    setShareTicket(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30">
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
            <p className="text-sm text-gray-600 mt-1">All your event tickets in one place</p>
          </div>

      {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by event or ticket code"
            className="px-4 py-2.5 border border-gray-200 rounded-xl w-full sm:w-72 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm"
          />
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm">
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={() => navigate('/student/browse')} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">Browse Events</button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <aside className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-5 hover:shadow-md transition-shadow">
          <div>
            <div className="text-xs text-indigo-600 font-bold mb-2 tracking-wide">TOTAL TICKETS</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="text-xs text-indigo-600 font-bold mb-2 tracking-wide">PAID</div>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="text-xs text-indigo-600 font-bold mb-2 tracking-wide">UPCOMING / ACTIVE</div>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <button onClick={() => navigate('/student/browse')} className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              Browse More Events
            </button>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">Loading tickets…</div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl text-gray-300 mb-4">🎫</div>
                <h3 className="text-lg font-semibold text-gray-900">No tickets found</h3>
                <p className="mt-2 text-sm text-gray-600">Try adjusting your search or browse events to get tickets.</p>
                <div className="mt-4">
                  <button onClick={() => navigate('/student/browse')} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Browse Events</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(t => {
                  const eventName = t.eventName || t.event || t.name || 'Event'
                  const code = t.ticketCode || t.code || '—'
                  const eventDate = t.eventDate || t.date || null
                  const location = t.location || 'TBA'
                  const paymentStatus = formatPaymentLabel(t)
                  const ticketStatus = t.ticketStatus || t.status || 'Pending'
                  const ticketType = t.ticketType || t.ticket_type || 'Regular'
                  const price = t.price || '—'
                  const isPast = eventDate ? new Date(eventDate) < new Date() : false
                  const isUpcoming = !isPast && eventDate
                  const canUseTicketAssets = canAccessTicketAsset(t)
                  const isCancelled = String(ticketStatus).toLowerCase() === 'cancelled'

                  return (
                    <article key={t.id} className={`rounded-2xl border transition-all overflow-hidden ${isPast ? 'bg-gray-50/50 border-gray-200' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg transform hover:-translate-y-1'}`}>
                      <div className="p-5">
                        {/* Top Section: Title and Badges */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{eventName}</h3>
                            <p className="text-xs text-gray-500 mt-1">Ticket: <span className="font-mono text-indigo-700 font-medium">{code}</span></p>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
                            {isUpcoming && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Upcoming
                              </span>
                            )}
                            {isPast && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                Past
                              </span>
                            )}
                            {String(paymentStatus).toLowerCase() === 'paid' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                ✓ Paid
                              </span>
                            )}
                            {ticketStatus === 'Used' || ticketStatus === 'used' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                ✓ Used
                              </span>
                            )}
                            {ticketStatus === 'Cancelled' || ticketStatus === 'cancelled' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Event Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-indigo-50/50 rounded-xl">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-600 mb-1 font-semibold">Date</span>
                            <div className="flex items-center text-sm text-gray-900 gap-2">
                              <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{eventDate ? new Date(eventDate).toLocaleDateString() : '—'}</span>
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-xs text-gray-600 mb-1 font-medium uppercase">Time</span>
                            <div className="flex items-center text-sm text-gray-900 gap-2">
                              <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{eventDate ? new Date(eventDate).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '—'}</span>
                            </div>
                          </div>

                          <div className="flex flex-col md:col-span-2">
                            <span className="text-xs text-gray-600 mb-1 font-medium uppercase">Location</span>
                            <div className="flex items-center text-sm text-gray-900 gap-2">
                              <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span className="truncate">{location}</span>
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-4 pb-4 border-b border-gray-100 text-xs">
                          <div>
                            <span className="text-gray-600 block text-xs mb-1">Type</span>
                            <span className="font-medium text-gray-900">{ticketType}</span>
                          </div>
                          {price !== '—' && (
                            <div>
                              <span className="text-gray-600 block text-xs mb-1">Price</span>
                              <span className="font-medium text-gray-900">₹{typeof price === 'number' ? price.toLocaleString() : price}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600 block text-xs mb-1">Status</span>
                            <span className={`font-medium ${ticketStatus === 'Used' || ticketStatus === 'used' ? 'text-indigo-600' : ticketStatus === 'Cancelled' ? 'text-red-600' : 'text-gray-900'}`}>{ticketStatus}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-xs mb-1">Payment</span>
                            <span className={`font-medium ${paymentStatus === 'Paid' || paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{paymentStatus}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => navigate(`/student/tickets/${t.id}`)} className="flex-1 min-w-[110px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                            View Ticket
                          </button>
                          {!isCancelled && (
                            <button type="button" onClick={() => setSelectedQR(t)} className="px-3 py-2 border border-gray-200 text-indigo-600 hover:bg-indigo-50 text-xs font-medium rounded-xl transition-all" title="QR Code">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm12 2h2m-2 4h4m-4-8h4m-2 0v6" />
                              </svg>
                            </button>
                          )}
                          <button type="button" onClick={() => handleDownload(t)} disabled={!canUseTicketAssets} className={`px-3 py-2 border text-xs font-medium rounded-xl transition-all ${canUseTicketAssets ? 'border-gray-200 text-indigo-600 hover:bg-indigo-50' : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'}`} title="Download">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => handleAddToCalendar(t)} className="px-3 py-2 border border-gray-200 text-indigo-600 hover:bg-indigo-50 text-xs font-medium rounded-xl transition-all" title="Calendar">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => handleShare(t)} className="px-3 py-2 border border-gray-200 text-indigo-600 hover:bg-indigo-50 text-xs font-medium rounded-xl transition-all" title="Share">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </button>
                          {ticketStatus.toLowerCase() !== 'cancelled' && ticketStatus.toLowerCase() !== 'used' && String(t.paymentStatus || '').toLowerCase() !== 'paid' && (
                            <button type="button" onClick={() => setCancelTarget(t)} className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium rounded-xl transition-all">
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
                <button type="button" onClick={() => setSelectedQR(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-indigo-50 rounded-lg p-6 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">Scan at venue</p>
                  <div className="w-56 h-56 bg-white rounded-lg border-2 border-indigo-200 flex items-center justify-center">
                    {selectedQrImage ? (
                      <img src={selectedQrImage} alt="QR" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <div className="text-gray-300 mb-2">No QR available</div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-4">Code: {selectedQR.ticketCode || selectedQR.ticket_code}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedQR(null)} className="w-full mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cancel Ticket</h3>
                <p className="mt-1 text-sm text-gray-600">
                  This ticket will be cancelled and you will lose QR access to it.
                </p>
              </div>
              <button type="button" onClick={() => setCancelTarget(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="font-medium text-gray-900">{cancelTarget.eventName || 'Event ticket'}</div>
              <div className="mt-1 text-gray-600">Ticket: {cancelTarget.ticketCode || '—'}</div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Ticket
              </button>
              <button
                type="button"
                onClick={() => handleCancel(cancelTarget)}
                disabled={cancellingTicketId === cancelTarget.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {cancellingTicketId === cancelTarget.id ? 'Cancelling...' : 'Cancel Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Share Ticket</h3>
                <button type="button" onClick={() => setShareTicket(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">{shareTicket.eventName || shareTicket.event || shareTicket.name}</p>
              <div className="space-y-2">
                <button type="button" onClick={() => shareVia('whatsapp')} className="w-full px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.798c0 2.734.732 5.41 2.124 7.738L.929 23.5l8.272-2.737a9.857 9.857 0 004.618 1.176h.004c5.427 0 9.856-4.429 9.856-9.854 0-2.635-.648-5.12-1.876-7.302-1.235-2.195-2.982-3.979-5.126-5.244-2.129-1.224-4.596-1.902-7.142-1.902" />
                  </svg>
                  WhatsApp
                </button>
                <button type="button" onClick={() => shareVia('twitter')} className="w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7s1.1 5.2-5.5 8.5a4.5 4.5 0 01-6.5-4.5s-.9-1.8 2-4.3" />
                  </svg>
                  Twitter
                </button>
                <button type="button" onClick={() => shareVia('copy')} className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <button type="button" onClick={() => setShareTicket(null)} className="w-full mt-4 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium transition-colors hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
