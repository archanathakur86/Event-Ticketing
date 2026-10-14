import React, { useEffect, useState } from 'react'
import useAuthStore from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import * as eventService from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import { showToast } from '../../../components/ui/Toast'

function getAssignedEventsForUser(allEvents, user) {
  const events = Array.isArray(allEvents) ? allEvents.filter(Boolean) : []
  const meIds = [user?.id, user?._id, user?.userId].filter(Boolean).map(String)
  const meEmail = String(user?.email || '').toLowerCase()

  if (events.length === 0) return []

  const hasExplicitAssignment = events.some(ev => ev.coordinatorId || ev.coordinator?._id)
  if (!hasExplicitAssignment) return events

  return events.filter(ev => {
    const coordinatorId = ev.coordinatorId || ev.coordinator?._id || ev.coordinator_id
    const coordinatorEmail = String(ev.coordinator?.email || ev.coordinator_email || ev.coordinatorEmail || '').toLowerCase()
    if (meIds.length > 0 && meIds.includes(String(coordinatorId || ''))) return true
    if (meEmail && coordinatorEmail === meEmail) return true
    return false
  })
}

function getEventSourceLabel(event, user) {
  const myIds = [user?.id, user?._id, user?.userId].filter(Boolean).map(String)
  const createdById = String(event?.createdById || event?.raw?.created_by?._id || '')
  const createdByRole = String(event?.raw?.created_by?.role || '').toLowerCase()

  if ((createdById && myIds.includes(createdById)) || createdByRole === 'coordinator') {
    return {
      label: 'Coordinator',
      className: 'bg-green-50 text-green-700',
    }
  }

  return {
    label: 'Admin',
    className: 'bg-blue-50 text-blue-700',
  }
}

function canCoordinatorEditEvent(event, user) {
  const myIds = [user?.id, user?._id, user?.userId].filter(Boolean).map(String)
  const createdById = String(event?.createdById || event?.raw?.created_by?._id || '')
  return createdById && myIds.includes(createdById)
}

export default function CoordinatorEventsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const all = await eventService.getAllEvents()
        if (!mounted) return
        const assigned = getAssignedEventsForUser(all, user)
        setEvents(assigned)
      } catch (e) {
        setEvents([])
      }
    })()
    return () => { mounted = false }
  }, [user])

  const [stats, setStats] = useState({})

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const tickets = await ticketService.getAllTickets()
        if (!mounted) return
        const map = {}
        events.forEach(ev => {
          const evId = String(ev.id)
          const evTickets = (tickets || []).filter(t => String(t.eventId) === evId)
          const regs = evTickets.length
          const present = evTickets.filter(t => ['used', 'attended', 'present'].includes(String(t.status || '').toLowerCase())).length
          const percent = regs > 0 ? Math.round((present / regs) * 100) : 0
          map[evId] = { registrations: regs, attendancePercent: percent }
        })
        if (!mounted) return
        setStats(map)
      } catch (err) {
        console.error('Failed to compute event stats', err)
        if (mounted) setStats({})
      }
    })()
    function reload() { ;(async () => {
      const tickets = await ticketService.getAllTickets()
      const map = {}
      events.forEach(ev => {
        const evId = String(ev.id)
        const evTickets = (tickets || []).filter(t => String(t.eventId) === evId)
        const regs = evTickets.length
        const present = evTickets.filter(t => ['used', 'attended', 'present'].includes(String(t.status || '').toLowerCase())).length
        const percent = regs > 0 ? Math.round((present / regs) * 100) : 0
        map[evId] = { registrations: regs, attendancePercent: percent }
      })
      if (mounted) setStats(map)
    })() }
    window.addEventListener('tickets:changed', reload)
    window.addEventListener('attendance:changed', reload)
    return () => { mounted = false; window.removeEventListener('tickets:changed', reload); window.removeEventListener('attendance:changed', reload) }
  }, [events])

  function fmtDate(d) {
    if (!d) return '—'
    try {
      const dt = new Date(d)
      if (isNaN(dt)) return d
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch (e) { return d }
  }

  function handleEditEvent(event) {
    if (!canCoordinatorEditEvent(event, user)) {
      showToast({
        title: 'Edit not allowed',
        message: 'You cant edit admin created event',
        type: 'warn',
      })
      return
    }
    navigate(`/coordinator/events/${event.id}/edit`)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand">Coordinator — Events</h1>
          <p className="text-sm text-gray-500">Events assigned to you</p>
        </div>
        <button
          onClick={() => navigate('/coordinator/events/create')}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Create Event
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 ? (
          <div className="col-span-full p-6 bg-white border border-gray-100 rounded-lg text-sm text-gray-500">No events assigned to you.</div>
        ) : (
          events.map(ev => {
            const s = stats[String(ev.id)] || { registrations: 0, attendancePercent: 0 }
            const capacity = ev.capacity || ev.capacityLimit || ev.capacity_total || ev.capacityTotal || '—'
            const source = getEventSourceLabel(ev, user)
            return (
              <div key={ev.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-gray-900 truncate">{ev.name || ev.title || `Event ${ev.id}`}</div>
                    <div className="text-xs text-gray-500 mt-1">{fmtDate(ev.startDate || ev.date || ev.eventDate)}</div>
                    <div className="text-xs text-gray-500 mt-1">{ev.location || ev.venue || ev.address || 'Location not set'}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={`px-2 py-1 text-xs rounded-full font-medium ${source.className}`}>{source.label}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-gray-600">
                  <div>
                    <div className="text-xs text-gray-500">Capacity</div>
                    <div className="font-medium">{capacity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Registrations</div>
                    <div className="font-medium">{s.registrations.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Attendance</div>
                    <div className="font-medium">{s.attendancePercent}%</div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => handleEditEvent(ev)}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M13 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Edit Event
                  </button>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
