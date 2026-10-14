import React from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/api/auth.api'
import useAuthStore from '@/store/authStore'
import * as eventService from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import { getAttendanceByEvent } from '@/api/attendance.api'
import { useEffect, useState } from 'react'
import MetricCard from '@/modules/student/components/MetricCard'
import AppSelect from '@/components/ui/AppSelect'

function getAssignedEventsForUser(allEvents, user) {
  const events = Array.isArray(allEvents) ? allEvents.filter(Boolean) : []
  const meIds = [user?.id, user?._id, user?.userId].filter(Boolean).map(String)
  const meEmail = String(user?.email || '').toLowerCase()

  if (events.length === 0) return []

  // `/api/events` is already coordinator-scoped on the backend.
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

export default function CoordinatorDashboard() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()

  const [assignedEvents, setAssignedEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [ticketPreview, setTicketPreview] = useState([])
  const [eventStats, setEventStats] = useState({ registrations: 0, revenue: 0, attendance: 0 })
  const [recentAttendance, setRecentAttendance] = useState([])

  const isCoordinator = (() => {
    const r = user?.role || user?.roles
    if (!r) return false
    if (typeof r === 'string') return r.toLowerCase().includes('coordinator')
    if (Array.isArray(r)) return r.map(x => String(x).toLowerCase()).includes('coordinator')
    return false
  })()
  async function handleLogout() {
    try {
      await logout()
    } catch (e) {}
    if (setUser) setUser(null)
    navigate('/')
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const all = await eventService.getAllEvents()
        const assigned = getAssignedEventsForUser(all, user)
        if (!mounted) return
        setAssignedEvents(assigned)
        if (assigned && assigned.length > 0) {
          setSelectedEventId(assigned[0].id)
        } else {
          setSelectedEventId(null)
        }
      } catch (err) {
        console.error('Failed to load coordinator events', err)
      }
    })()
    function onChange() {  ;(async () => {
      const all = await eventService.getAllEvents()
      const assigned = getAssignedEventsForUser(all, user)
      setAssignedEvents(assigned)
    })() }
    window.addEventListener('events:changed', onChange)
    return () => { mounted = false; window.removeEventListener('events:changed', onChange) }
  }, [user])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!selectedEventId) {
        setSelectedEvent(null)
        setTicketPreview([])
        setEventStats({ registrations: 0, revenue: 0, attendance: 0 })
        return
      }
      try {
        const ev = assignedEvents.find(e => String(e.id) === String(selectedEventId)) || await eventService.getEventById(selectedEventId)
        if (!mounted) return
        setSelectedEvent(ev)
        const ticketRes = await ticketService.getCoordinatorEventTickets(selectedEventId)
        const eventTickets = Array.isArray(ticketRes?.tickets) ? ticketRes.tickets : []
        const attendanceRes = await getAttendanceByEvent(selectedEventId)
        const attendanceRows = Array.isArray(attendanceRes?.attendance) ? attendanceRes.attendance : []
        const registrations = eventTickets.length
        const revenue = eventTickets.filter(t => String(t.paymentStatus).toLowerCase() === 'paid').reduce((s, t) => s + (Number(t.price) || 0), 0)
        const attendance = attendanceRows.filter(r => String(r?.status || '').toLowerCase() === 'present').length
        setEventStats({ registrations, revenue, attendance })
        setTicketPreview(eventTickets.slice(0, 8))
      } catch (err) {
        console.error('Failed to load event tickets', err)
      }
    })()
    return () => { mounted = false }
  }, [selectedEventId, assignedEvents])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const assignedIds = (assignedEvents || []).map(e => String(e.id)).filter(Boolean)
        const batches = await Promise.all(
          assignedIds.map(async (eventId) => {
            try {
              const res = await getAttendanceByEvent(eventId)
              return Array.isArray(res?.attendance) ? res.attendance : []
            } catch (err) {
              return []
            }
          })
        )
        if (!mounted) return
        const filtered = batches.flat().filter(Boolean)
        filtered.sort((a, b) => {
          const ta = a.marked_at || a.markedAt || a.updatedAt || a.createdAt || a.time || a.timestamp || ''
          const tb = b.marked_at || b.markedAt || b.updatedAt || b.createdAt || b.time || b.timestamp || ''
          return new Date(tb) - new Date(ta)
        })
        setRecentAttendance(filtered.slice(0, 5))
      } catch (e) {
        console.error('Failed to load recent attendance', e)
        if (mounted) setRecentAttendance([])
      }
    })()
    function onChange() {  ;(async () => {
      try {
        const assignedIds = (assignedEvents || []).map(e => String(e.id)).filter(Boolean)
        const batches = await Promise.all(
          assignedIds.map(async (eventId) => {
            try {
              const res = await getAttendanceByEvent(eventId)
              return Array.isArray(res?.attendance) ? res.attendance : []
            } catch (err) {
              return []
            }
          })
        )
        const filtered = batches.flat().filter(Boolean)
        filtered.sort((a, b) => new Date(b.marked_at || b.markedAt || b.updatedAt || b.createdAt || b.time || b.timestamp || '') - new Date(a.marked_at || a.markedAt || a.updatedAt || a.createdAt || a.time || a.timestamp || ''))
        setRecentAttendance(filtered.slice(0,5))
      } catch (e) {}
    })() }
    window.addEventListener('attendance:changed', onChange)
    return () => { mounted = false; window.removeEventListener('attendance:changed', onChange) }
  }, [assignedEvents])

  function formatTime(ts) {
    if (!ts) return '—'
    try {
      const d = new Date(ts)
      if (isNaN(d)) return ts
      return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return ts
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#123386] to-[#0b2a60] text-white rounded-lg">
        <svg className="h-9 w-9" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="8" fill="#ffffff" />
          <path d="M12 28c4-6 8-10 12-10s8 4 12 10" stroke="#123386" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="18" r="4" fill="#123386" />
        </svg>
        <span className="text-lg font-extrabold">ConfNow - Coordinator Portal</span>
      </div>
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand">Coordinator Overview</h1>
          <p className="text-sm text-gray-500">Manage assigned events and attendance</p>
        </div>
        <div />
      </header>

      <section className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="text-sm text-gray-500">Select Event</label>
            <div className="mt-1">
              <AppSelect
                value={selectedEventId ?? ''}
                onChange={setSelectedEventId}
                placeholder="-- Select an event --"
                className="w-full min-w-[240px]"
                options={(assignedEvents || []).map(ev => ({
                  value: ev.id,
                  label: ev.name || ev.title || `Event ${ev.id}`,
                }))}
              />
            </div>
          </div>
          <div className="text-sm text-gray-500">Assigned: {(assignedEvents || []).length}</div>
        </div>

        {selectedEvent ? (
          <div className="mt-3 p-3 border border-gray-100 rounded-md bg-gray-50 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{selectedEvent.name || selectedEvent.title || `Event ${selectedEvent.id}`}</div>
              <div className="text-xs text-gray-500 mt-1 truncate">
                {formatTime(selectedEvent.startDate || selectedEvent.date || selectedEvent.eventDate) || 'Date not set'} • {selectedEvent.location || selectedEvent.venue || selectedEvent.address || 'Location not set'}
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${String(selectedEvent.status || '').toLowerCase() === 'ongoing' ? 'bg-green-50 text-green-700' : String(selectedEvent.status || '').toLowerCase() === 'scheduled' ? 'bg-brand/10 text-brand' : 'bg-gray-50 text-gray-700'}`}>
                {selectedEvent.status || selectedEvent.state || 'Unknown'}
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {(() => {
            const regs = Number(eventStats.registrations || 0)
            const present = Number(eventStats.attendance || 0)
            const absent = Math.max(0, regs - present)
            const rate = regs > 0 ? Math.round((present / regs) * 100) : 0
            return (
              <>
                <MetricCard title="Total Registrations" value={regs.toLocaleString()} />
                <MetricCard title="Present" value={present.toLocaleString()} />
                <MetricCard title="Absent" value={absent.toLocaleString()} />
                <MetricCard title="Attendance Rate" value={`${rate}%`} />
              </>
            )
          })()}
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-900">Ticket Preview</h2>
          <div className="text-sm text-gray-500">{selectedEvent ? selectedEvent.name : 'No event selected'}</div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Code</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">User</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Price</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(ticketPreview || []).map(t => (
                <tr key={t.id} className="hover:bg-gray-50 border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-800">{t.ticketCode || t.code || t.id}</td>
                  <td className="px-3 py-2 text-gray-600">{t.attendeeName || t.attendeeEmail || t.userId || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{typeof t.price === 'number' ? `₹${t.price.toLocaleString()}` : t.price}</td>
                  <td className="px-3 py-2"><span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{t.paymentStatus || t.status}</span></td>
                </tr>
              ))}
              {(ticketPreview || []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-3 text-sm text-gray-500">No tickets for selected event.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="text-sm text-gray-500">Actions for coordinators</div>
        </div>

        {isCoordinator ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <button
              onClick={() => navigate('/coordinator/events/create')}
              className="flex flex-col items-start p-4 bg-white border rounded-lg"
            >
              <div className="text-sm font-medium text-gray-700">Create Event</div>
              <div className="mt-2 text-xs text-gray-500">Create a new event as coordinator</div>
            </button>

            <button onClick={() => {
                if (!selectedEventId) return window.alert('Please select an event first')
                navigate(`/admin/events/${selectedEventId}/tickets`)
              }} className="flex flex-col items-start p-4 bg-white border rounded-lg">
              <div className="text-sm font-medium text-gray-700">View Tickets</div>
              <div className="mt-2 text-xs text-gray-500">See all tickets for the selected event</div>
            </button>

            <button onClick={() => {
                if (!selectedEventId) return window.alert('Please select an event first')
                navigate(`/admin/attendance/scan?event=${selectedEventId}`)
              }} className="flex flex-col items-start p-4 bg-white border rounded-lg">
              <div className="text-sm font-medium text-gray-700">Scan QR</div>
              <div className="mt-2 text-xs text-gray-500">Open scanner to scan attendee tickets</div>
            </button>

            <button onClick={() => {
                if (!selectedEventId) return window.alert('Please select an event first')
                navigate(`/admin/attendance/mark?event=${selectedEventId}`)
              }} className="flex flex-col items-start p-4 bg-white border rounded-lg">
              <div className="text-sm font-medium text-gray-700">Mark Attendance</div>
              <div className="mt-2 text-xs text-gray-500">Manually mark attendees as present</div>
            </button>

            <button onClick={() => {
                if (!selectedEventId) return window.alert('Please select an event first')
                navigate(`/admin/events/${selectedEventId}/tickets/download`)
              }} className="flex flex-col items-start p-4 bg-white border rounded-lg">
              <div className="text-sm font-medium text-gray-700">Download Bulk Tickets</div>
              <div className="mt-2 text-xs text-gray-500">Download all tickets (CSV/PDF) for the event</div>
            </button>

            <button onClick={() => {
                if (!selectedEventId) return window.alert('Please select an event first')
                navigate(`/admin/events/${selectedEventId}/attendance/export`)
              }} className="flex flex-col items-start p-4 bg-white border rounded-lg">
              <div className="text-sm font-medium text-gray-700">Export Attendance</div>
              <div className="mt-2 text-xs text-gray-500">Export attendance report for the event</div>
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">You don't have coordinator permissions for quick actions.</div>
        )}
      </section>

      <section className="bg-white border border-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-900">Recent Attendance Activity</h2>
          <div className="text-sm text-gray-500">Showing {recentAttendance.length}</div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Student Name</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Ticket ID</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Status</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {(recentAttendance || []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-800">{r.studentName || r.name || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.ticketId || r.ticketCode || r.ticket || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${String(r.status).toLowerCase() === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatTime(r.markedAt || r.updatedAt || r.createdAt || r.time || r.timestamp)}</td>
                </tr>
              ))}
              {(recentAttendance || []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-3 text-sm text-gray-500">No recent attendance activity.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
