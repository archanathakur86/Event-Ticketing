import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '@/api/auth.api'
import useAuthStore from '@/store/authStore'
import * as eventService from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import * as notificationService from '@/api/notifications.api'
import * as logService from '@/api/logs.api'
import * as paymentService from '@/api/payments.api'
import MetricCard from '../components/MetricCard'
import QRCode from 'qrcode'

const IconCalendar = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path>
  </svg>
)

const IconClock = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"></path>
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
)

const IconTicket = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 10v4a2 2 0 01-2 2h-14a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2z"></path>
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7 12h.01M17 12h.01"></path>
  </svg>
)

const IconWallet = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"></path>
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M16 11h2a1 1 0 010 2h-2"></path>
  </svg>
)

const IconPending = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4"></path>
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01"></path>
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
)

const IconCheck = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"></path>
    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
  </svg>
)

function daysLeft(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  return diff
}

function downloadICS(event) {
  try {
    const start = new Date(event.date)
    const end = new Date(start.getTime() + (event.durationMinutes || 60) * 60000)
    const pad = (n) => String(n).padStart(2, '0')
    const toICSDate = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ConfNow//EN\nBEGIN:VEVENT\nUID:${event.id}@confnow\nDTSTAMP:${toICSDate(new Date())}\nDTSTART:${toICSDate(start)}\nDTEND:${toICSDate(end)}\nSUMMARY:${(event.name||event.title||'Event').replace(/\n/g,' ')}\nDESCRIPTION:${(event.description||'').replace(/\n/g,' ')}\nLOCATION:${(event.location||event.venue||'')}\nEND:VEVENT\nEND:VCALENDAR`
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(event.name||event.title||'event')}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.warn('Failed to generate ics', e)
  }
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const { user: authUser } = useAuthStore()
  const [events, setEvents] = useState([])
  const [tickets, setTickets] = useState([])
  const [notifications, setNotifications] = useState([])
  const [logs, setLogs] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedQR, setSelectedQR] = useState(null)
  const [selectedQrImage, setSelectedQrImage] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ctx = authUser
      const u = ctx || await getCurrentUser()
      setUser(u)

      // Role check: redirect non-students away
      if (u && u.role && String(u.role).toLowerCase() !== 'student') {
        navigate('/')
        return
      }

      const ev = await eventService.getAllEvents()
      setEvents(ev || [])
      if (u) {
        const [tk, ns] = await Promise.all([
          ticketService.getTicketsByUser(u.id),
          notificationService.getNotifications(u.id),
        ])
        setTickets(tk || [])
        setNotifications(ns || [])
        setLogs([])
        setPayments([])

        Promise.allSettled([
          logService.getUserLogs(u.id),
          paymentService.getAllPayments(),
        ]).then(([lgRes, paysRes]) => {
          if (lgRes.status === 'fulfilled') setLogs(lgRes.value || [])
          if (paysRes.status === 'fulfilled') setPayments(paysRes.value || [])
        })
      } else {
        setTickets([])
        setNotifications([])
        setLogs([])
        setPayments([])
      }
    } catch (err) {
      console.error('Failed to load dashboard', err)
      setError(err?.message || 'Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }, [authUser, navigate])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    // auto-refresh the whole dashboard when relevant changes occur
    function refresh() { loadAll() }

    window.addEventListener('tickets:changed', refresh)
    window.addEventListener('events:changed', refresh)
    window.addEventListener('payments:changed', refresh)
    window.addEventListener('logs:changed', refresh)
    window.addEventListener('notifications:changed', refresh)

    return () => {
      window.removeEventListener('tickets:changed', refresh)
      window.removeEventListener('events:changed', refresh)
      window.removeEventListener('payments:changed', refresh)
      window.removeEventListener('logs:changed', refresh)
      window.removeEventListener('notifications:changed', refresh)
    }
  }, [loadAll])

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

  const userTicketEventIds = useMemo(() => new Set(tickets.map(t => String(t.eventId))), [tickets])

  const metrics = useMemo(() => {
    const now = new Date()
    const registeredEvents = userTicketEventIds.size
    const upcomingEvents = tickets.filter(t => {
      const ev = events.find(e => String(e.id) === String(t.eventId))
      if (!ev || !ev.date) return false
      const d = new Date(ev.date)
      return d > now && t.status !== 'Cancelled'
    }).length
    const totalTickets = tickets.length
    const totalSpent = (payments || []).filter(p => String(p.status).toLowerCase() === 'success' || String(p.status).toLowerCase() === 'paid').reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const pendingPayments = (payments || []).filter(p => String(p.status).toLowerCase() === 'pending').length
    const attendedEvents = tickets.filter(t => String(t.status).toLowerCase() === 'used').length
    const attendancePercent = registeredEvents > 0 ? Math.round((attendedEvents / registeredEvents) * 100) : 0
    return { registeredEvents, upcomingEvents, totalTickets, totalSpent, pendingPayments, attendedEvents, attendancePercent }
  }, [tickets, events, userTicketEventIds])

  const upcomingList = useMemo(() => {
    const now = new Date()
    return tickets
      .map(t => ({ ticket: t, event: events.find(e => String(e.id) === String(t.eventId)) }))
      .filter(x => x.event && x.event.date && new Date(x.event.date) > now && x.ticket.status !== 'Cancelled')
      .sort((a,b) => new Date(a.event.date) - new Date(b.event.date))
  }, [tickets, events])

    const recentTickets = useMemo(() => tickets.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,2), [tickets])

    const nextEvent = useMemo(() => (upcomingList && upcomingList.length > 0) ? upcomingList[0] : null, [upcomingList])

    
    const activity = useMemo(() => {
      const mapLog = (l) => ({
        id: `log-${l.id}`,
        type: l.type || 'log',
        title: l.message || (l.type === 'ticket' ? 'Ticket booked' : (l.type || 'Activity')),
        date: l.createdAt || l.timestamp || new Date().toISOString(),
        meta: l.meta || {}
      })

      const mapNotif = (n) => ({
        id: `notif-${n.id}`,
        type: 'notification',
        title: n.title || 'Notification received',
        date: n.createdAt || n.sentAt || new Date().toISOString(),
        meta: { notificationId: n.id }
      })

      const items = [ ...(logs || []).map(mapLog), ...(notifications || []).map(mapNotif) ]
      return items
        .filter(i => i.date)
        .sort((a,b) => new Date(b.date) - new Date(a.date))
        .slice(0,5)
    }, [logs, notifications])

  const unreadCount = useMemo(() => (notifications || []).filter(n => !n.read).length, [notifications])

  const markAllRead = async () => {
    if (!user) return
    const unread = (notifications || []).filter(n => !n.read)
    await Promise.all(unread.map(n => notificationService.markAsRead(n.id)))
    window.dispatchEvent(new CustomEvent('notifications:changed'))
  }

  const handleActivityClick = useCallback((item) => {
    if (!item) return
    if (item.meta && (item.meta.ticketId || item.meta.ticket)) {
      const id = item.meta.ticketId || item.meta.ticket
      navigate(`/student/tickets/${id}`)
      return
    }
    if (item.meta && (item.meta.eventId || item.meta.event)) {
      const id = item.meta.eventId || item.meta.event
      navigate(`/student/events/${id}`)
      return
    }
    if (item.type === 'notification') {
      navigate('/student/notifications')
      return
    }
  }, [navigate])

  
 const Skeleton = ({ className = 'h-6 w-full rounded' }) => <div className={`bg-gray-200/70 ${className} animate-pulse`} />

  return (
    <>
    <div className="px-1 sm:px-2 lg:px-4 py-4 sm:py-6 lg:py-8 h-full overflow-auto w-full">
      <header className="mb-8">
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl sm:text-3xl font-bold shadow-lg ring-4 ring-white/20">
              {user?.name ? user.name.split(' ').map(n => n[0]).slice(0,2).join('') : 'S'}
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-semibold">Welcome back, {user?.name || 'Student'}</h1>
              <p className="mt-1 text-sm opacity-90">Your activity summary and upcoming events</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <button onClick={() => navigate('/student/browse')} className="px-5 py-2.5 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">Browse Events</button>
            <button onClick={() => navigate('/student/tickets')} className="px-5 py-2.5 border-2 border-white/40 text-white rounded-lg font-medium hover:bg-white/10 transition-all backdrop-blur-sm">My Tickets</button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard
          title="Registered Events"
          value={loading ? <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" /> : metrics.registeredEvents}
          icon={IconCalendar}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100"
        />
        <MetricCard
          title="Upcoming Events"
          value={loading ? <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" /> : metrics.upcomingEvents}
          icon={IconClock}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-600"
          className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100"
        />
        <MetricCard
          title="Total Spent"
          value={loading ? <div className="w-28 h-8 bg-gray-200 rounded animate-pulse" /> : (metrics.totalSpent ? `₹${metrics.totalSpent}` : '₹0')}
          icon={IconWallet}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100"
        />
        <MetricCard
          title="Attendance Percentage"
          value={loading ? <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" /> : `${metrics.attendancePercent}%`}
          subtitle={loading ? <div className="w-28 h-3 bg-gray-200 rounded animate-pulse" /> : `${metrics.attendedEvents} attended of ${metrics.registeredEvents}`}
          icon={IconCheck}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100"
        />
      </section>

      <div className="space-y-8">

      {/* Combined Recent Tickets + Activity so layout aligns */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
            <button onClick={() => navigate('/student/tickets')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors">See all</button>
          </div>

          {loading ? (
            <ul className="space-y-3">
              {[1,2,3].map(i => (
                <li key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-md">
                  <div>
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-28 bg-gray-200 rounded animate-pulse mt-2" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </li>
              ))}
            </ul>
          ) : recentTickets.length === 0 ? (
            <div className="text-sm text-gray-500">You have no tickets yet.</div>
          ) : (
            <ul className="space-y-3">
              {recentTickets.map((t) => {
                const eventName = t.eventName || t.event_id?.event_name || t.event_id?.name || 'Event'
                const ticketCode = t.ticketCode || t.ticket_code || '—'
                const paymentStatus = t.paymentStatus || t.payment_status || 'Pending'
                const status = t.status || 'Pending'
                const eventDate = t.event_id?.event_date || t.eventDate || null
                const eventLocation = t.event_id?.location || t.location || 'TBA'
                const ticketType = t.ticket_type || 'Regular'
                const price = t.price || '—'
                const isPast = eventDate ? new Date(eventDate) < new Date() : false
                const isUpcoming = !isPast && eventDate
                
                return (
                  <li key={t.id} className={`rounded-lg border transition-all overflow-hidden ${isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-md'}`}>
                    <div className="p-4">
                      {/* Header with Event Name and Status Badges */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{eventName}</h4>
                          <p className="text-xs text-gray-500 mt-1">{ticketCode}</p>
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
                          {(paymentStatus === 'Paid' || paymentStatus === 'paid') && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Paid
                            </span>
                          )}
                          {(paymentStatus === 'Pending' || paymentStatus === 'pending') && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Event Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{eventDate ? new Date(eventDate).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{eventDate ? new Date(eventDate).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '—'}</span>
                        </div>
                        <div className="flex items-center text-gray-600 col-span-2">
                          <svg className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="truncate">{eventLocation}</span>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-600 pb-4 border-b border-gray-100">
                        <div>
                          <span className="text-gray-500">Type:</span> <span className="font-medium text-gray-900">{ticketType}</span>
                        </div>
                        {price !== '—' && (
                          <div>
                            <span className="text-gray-500">Price:</span> <span className="font-medium text-gray-900">₹{price}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Status:</span> <span className={`font-medium ${status === 'Used' || status === 'used' ? 'text-indigo-600' : status === 'Cancelled' ? 'text-red-600' : 'text-gray-900'}`}>{status}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/student/tickets/${t.id}`)} className="flex-1 px-3 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                          View Ticket
                        </button>
                        <button onClick={() => setSelectedQR(t)} className="px-3 py-2 text-xs font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" title="View QR">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm12 2h2m-2 4h4m-4-8h4m-2 0v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-6">
            <button onClick={() => navigate('/student/browse')} className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">Browse Events</button>
          </div>
        </aside>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
              <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">Recent</span>
            </div>

            {loading ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                <ul className="space-y-6 pl-10">
                  {[1,2,3].map(i => (
                    <li key={i} className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-gray-200" />
                      <div className="bg-white p-3 rounded-md border border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-gray-100 rounded-md" />
                            <div className="space-y-2">
                              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                              <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                            </div>
                          </div>
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m4-2h.01M12 18a6 6 0 100-12 6 6 0 000 12z"></path>
                  </svg>
                </div>
                <div className="mt-4 text-sm text-gray-600">No recent activity yet</div>
                <div className="mt-3">
                  <button onClick={() => navigate('/student/browse')} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">Browse events</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                <ul className="space-y-6 pl-10">
                  {activity.map(item => {
                    const icon = item.type === 'ticket' ? IconTicket : item.type === 'payment' ? IconWallet : item.type === 'attendance' ? IconCheck : IconPending
                    return (
                      <li key={item.id} className="relative">
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-600 shadow-md ring-4 ring-indigo-100" />
                        <div onClick={() => handleActivityClick(item)} role="button" className="bg-white p-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-200 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 flex items-center justify-center rounded-md bg-gray-50 text-gray-600">{icon}</div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                {item.meta && item.meta.ticketCode && (
                                  <div className="text-xs text-gray-500">Ticket: {item.meta.ticketCode}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">{new Date(item.date).toLocaleString()}</div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Notifications removed from dashboard - use sidebar / Notifications page */}
          </div>
        </div>
      </section>

     <section className="mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Profile Completion</h3>
            <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full w-fit">Keep your profile up to date</span>
          </div>

          {loading ? (
            <div>
              <div className="mb-3">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                  <div className="h-2 bg-indigo-600 rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
              <ul className="space-y-3">
                {[1,2,3,4].map(i => (
                  <li key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 bg-gray-100 rounded-full`} />
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : user ? (
            (() => {
              const items = [
                { key: 'name', label: 'Full name', done: Boolean(user.name) },
                { key: 'emailVerified', label: 'Email verified', done: Boolean(user.emailVerified) === true },
                { key: 'phone', label: 'Phone added', done: Boolean(user.phone) },
                { key: 'profileImage', label: 'Profile picture uploaded', done: Boolean(user.profileImage) }
              ]
              const doneCount = items.filter(i => i.done).length
              const percent = Math.round((doneCount / items.length) * 100)
              return (
                <div>
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">{percent}% complete</div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div style={{ width: `${percent}%` }} className="h-3 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full transition-all duration-500 shadow-sm" />
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {items.map(it => (
                      <li key={it.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${it.done ? 'bg-green-100 text-green-600 shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                            {it.done ? IconCheck : IconPending}
                          </div>
                          <div className="text-sm text-gray-700">{it.label}</div>
                        </div>
                        <div>
                          {it.done ? (
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">✓ Completed</span>
                          ) : (
                            <button onClick={() => navigate('/student/profile')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors">Complete now</button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()
          ) : (
            <div className="text-sm text-gray-500">No profile data available.</div>
          )}
        </div>
      </section>

      </div>
    </div>

      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Ticket QR</h3>
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
                      <div className="text-gray-300">No QR available</div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-4">Code: {selectedQR.ticketCode || selectedQR.ticket_code}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedQR(null)} className="w-full mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
