import React, { useEffect, useState } from 'react'
import { getAllEvents, updateEvent } from '@/api/events.api'
import { getTicketsByUser, updateTicket } from '@/api/tickets.api'
import useAuthStore from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

export default function StudentEvents() {
  const { user } = useAuthStore()
  const [events, setEvents] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const [all, myTickets] = await Promise.all([getAllEvents(), getTicketsByUser(user?.id)])
      if (!mounted) return
      setEvents(all || [])
      setTickets(myTickets || [])
      setLoading(false)
    }
    if (user) load()
    return () => { mounted = false }
  }, [user])

  const myEventIds = new Set((tickets || []).map(t => String(t.eventId)))
  const myEvents = events.filter(e => myEventIds.has(String(e.id)))

  const findTicketForEvent = (eventId) => (tickets || []).find(t => String(t.eventId) === String(eventId) && String(t.userId) === String(user?.id))

  const handleDownload = (ticket) => {
    try {
      const data = JSON.stringify(ticket, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(ticket.ticketCode || 'ticket')}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download failed', e)
      alert('Failed to download ticket')
    }
  }

  const handleAddToCalendar = (ticket, event) => {
    try {
      const evDate = event?.date || ticket?.eventDate || ticket?.date
      if (!evDate) { alert('No event date available'); return }
      const start = new Date(evDate)
      const end = new Date(start.getTime() + (event?.durationMinutes || 60) * 60000)
      const pad = (n) => String(n).padStart(2, '0')
      const toICSDate = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ConfNow//EN\nBEGIN:VEVENT\nUID:${ticket.id}@confnow\nDTSTAMP:${toICSDate(new Date())}\nDTSTART:${toICSDate(start)}\nDTEND:${toICSDate(end)}\nSUMMARY:${(event?.name||event?.title||ticket?.eventName||'Event').replace(/\n/g,' ')}\nDESCRIPTION:Ticket ${ticket.ticketCode}\nLOCATION:${event?.location||ticket?.location||''}\nEND:VEVENT\nEND:VCALENDAR`
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(event?.name||'event')}.ics`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.warn('Failed to generate ics', e)
      alert('Failed to add to calendar')
    }
  }

  const handleCancelRegistration = async (ticket, event) => {
    if (!confirm('Cancel your registration for this event?')) return
    try {
      const updated = await updateTicket(ticket.id, { status: 'Cancelled' })
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, ...updated } : t))
      if (event && typeof event.availableSeats !== 'undefined') {
        await updateEvent(event.id, { availableSeats: (Number(event.availableSeats) || 0) + 1 })
        const all = await getAllEvents()
        setEvents(all || [])
      }
    } catch (e) {
      console.error('Failed to cancel registration', e)
      alert('Failed to cancel registration')
    }
  }

  if (loading) return <div className="p-3 sm:p-6">Loading...</div>
  if (!myEvents.length) return <div className="p-3 sm:p-6">You have not registered for any events.</div>

  return (
    <div className="p-3 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">My Events</h2>
      <div className="space-y-3">
        {myEvents.map(e => (
          <div key={e.id} className="p-4 bg-white rounded shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="font-medium">{e.name}</div>
              <div className="text-sm text-gray-500">{e.date} · {e.location}</div>
            </div>
            <div className="text-sm">
              <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700">{e.status || 'Upcoming'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

