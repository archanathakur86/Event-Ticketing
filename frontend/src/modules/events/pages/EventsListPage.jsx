import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllEvents, deleteEvent, updateEvent, getAdminEventsRaw, mapServerEvent } from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import * as paymentService from '@/api/payments.api'

export default function EventsListPage() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [events, setEvents] = useState([])
  const [registrationsMap, setRegistrationsMap] = useState({})
  const [revenueMap, setRevenueMap] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [menuOpenFor, setMenuOpenFor] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [confirmAction, setConfirmAction] = useState(null) // 'delete' | 'cancel' | null

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // Step 1: fetch events (raw response)
        const evRes = await getAdminEventsRaw()
        const rawEvents = evRes && Array.isArray(evRes.events) ? evRes.events : []
        // raw events fetched
        if (!mounted) return
        const mapped = (rawEvents || []).map(mapServerEvent)
        setEvents(mapped)

        // Step 2: fetch all admin tickets (so admins see full data)
        const tAdminRes = await ticketService.getAdminTickets()
        const rawTickets = tAdminRes && Array.isArray(tAdminRes.tickets) ? tAdminRes.tickets : []
        if (!mounted) return
        const mappedTickets = (rawTickets || []).map(ticketService.mapServerTicket)

        // Step 3: fetch all payments
        const pRes = await paymentService.getAllPayments()
        // paymentService.getAllPayments already maps; for raw, attempt to find raw payload
        // payments fetched
        if (!mounted) return

        // Step 4: compute per-event stats
        const regs = {}
        const rev = {}
        ;(mapped || []).forEach(ev => {
          const evId = String(ev.id || ev._id || ev.raw && ev.raw._id || ev.raw && ev.raw.id)
          const sold = (mappedTickets || []).filter(t => String(t.eventId) === evId && String(t.status || '').toLowerCase() === 'booked').length
          const cancelled = (mappedTickets || []).filter(t => String(t.eventId) === evId && String(t.status || '').toLowerCase() === 'cancelled').length
          const payments = (pRes || []).filter(p => {
            const sameEvent = String(p.eventId || p.event || p.raw?.event_id || p.raw?.event) === evId
            const status = String(p.status || p.payment_status || '').toLowerCase()
            const success = status === 'completed' || status === 'success' || status === 'paid'
            return sameEvent && success
          })
          const revenue = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
          const soldFromPayments = (payments || []).length
          regs[evId] = { sold: sold > 0 ? sold : soldFromPayments, cancelled }
          rev[evId] = revenue
        })
        if (!mounted) return
        setRegistrationsMap(Object.fromEntries(Object.entries(regs).map(([k,v]) => [k, v.sold])))
        setRevenueMap(Object.fromEntries(Object.entries(rev).map(([k,v]) => [k, v])))
      } catch (e) {
        console.error('Failed to load events data flow', e)
        if (!mounted) return
        // If user is unauthenticated or token invalid, redirect to login
        const status = e && (e.status || (e.response && e.response.status))
        if (status === 401 || status === 403) {
          navigate('/login')
          return
        }
        // otherwise show a helpful message from server if available
        const msg = (e && (e.message || (e.data && e.data.message))) || 'Failed to load events'
        setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadCounts() {
      try {
        const regs = {}
        const rev = {}
        // fetch counts per event using server filters
        await Promise.all((events || []).map(async (ev) => {
          try {
            const [tRes, pRes] = await Promise.all([
              ticketService.getAdminTickets({ event_id: String(ev.id) }),
              paymentService.getPaymentsByEvent(ev.id)
            ])
            const ticketCount = tRes && typeof tRes.count === 'number' ? tRes.count : (tRes.tickets || []).length
            const successfulPayments = ((pRes && pRes.payments ? pRes.payments : []) || []).filter((p) => {
              const s = String(p?.payment_status || p?.status || '').toLowerCase()
              return s === 'success' || s === 'completed' || s === 'paid'
            }).length
            regs[String(ev.id)] = ticketCount > 0 ? ticketCount : successfulPayments
            rev[String(ev.id)] = (pRes && pRes.payments ? pRes.payments : []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
          } catch (e) {
            console.error('count load failed for event', ev.id, e)
            regs[String(ev.id)] = 0
            rev[String(ev.id)] = 0
          }
        }))

        if (!mounted) return
        setRegistrationsMap(regs)
        setRevenueMap(rev)
      } catch (err) {
        console.error('Failed to load event counts', err)
      }
    }
    loadCounts()

    function onChange() { loadCounts() }
    window.addEventListener('tickets:changed', onChange)
    window.addEventListener('payments:changed', onChange)
    return () => { mounted = false; window.removeEventListener('tickets:changed', onChange); window.removeEventListener('payments:changed', onChange) }
  }, [events])

  // derived filter options
  const locations = Array.from(new Set((events || []).map(e => e.location).filter(Boolean)))

  function applyFilters(list) {
    const q = String(query || '').trim().toLowerCase()
    const now = new Date()
    return (list || []).filter(ev => {
      if (q) {
        const name = String(ev.name || '')
        if (!name.toLowerCase().includes(q)) return false
      }
      if (statusFilter) {
        if (String(ev.status || '').toLowerCase() !== String(statusFilter).toLowerCase()) return false
      }
      if (dateFilter) {
        const d = new Date(ev.date)
        if (isNaN(d)) return false
        if (dateFilter === 'upcoming' && d < now) return false
        if (dateFilter === 'past' && d >= now) return false
      }
      if (locationFilter) {
        if (String(ev.location || '').toLowerCase() !== String(locationFilter).toLowerCase()) return false
      }
      return true
    })
  }

  const filteredEvents = applyFilters(events)
  const totalPages = Math.max(1, Math.ceil((filteredEvents || []).length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedEvents = (filteredEvents || []).slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    const len = (filteredEvents || []).length
    const pages = Math.ceil(len / ITEMS_PER_PAGE) || 1
    if (currentPage > pages) setCurrentPage(pages)
    if (currentPage < 1) setCurrentPage(1)
  }, [filteredEvents.length])

  // close actions menu when clicking outside the toggle or menu
  useEffect(() => {
    function handleDocClick(e) {
      try {
        const onToggle = e.target.closest && e.target.closest('[data-ev-toggle]')
        // check if the click was inside any rendered actions menu
        const menuEl = e.target.closest && e.target.closest('[data-ev-actions]')
        const onMenu = !!menuEl
        if (!onToggle && !onMenu) setMenuOpenFor(null)
      } catch (err) {
        // fail-safe: close menu
        setMenuOpenFor(null)
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [])

  // summary metrics derived from events
  const totalEvents = (events || []).length
  const activeEvents = (events || []).filter(e => {
    const s = String(e.status || '').toLowerCase()
    return s === 'published' || s === 'active' || s === 'upcoming'
  }).length
  const draftEvents = (events || []).filter(e => String(e.status || '').toLowerCase() === 'draft').length
  const cancelledEvents = (events || []).filter(e => String(e.status || '').toLowerCase() === 'cancelled').length

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Events Management</h1>
          <p className="text-sm text-gray-500">Manage and monitor all platform events</p>
        </div>

        <div>
          <button
            onClick={() => navigate('/admin/events/create')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Create Event
          </button>
        </div>
      </header>

      {loading ? (
        <div className="p-6">Loading events...</div>
      ) : error ? (
        <div className="p-6 text-red-600">Error: {error}</div>
      ) : (
        <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Events</h2>
              <div className="text-xs text-gray-500">Showing {filteredEvents.length} of {events.length} items</div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Search events by name"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 border border-gray-200 rounded-md text-sm w-full sm:w-64"
              />

              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }} className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1) }} className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
                <option value="">Any Date</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>

              <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1) }} className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
                <option value="">All Locations</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>

              <button onClick={() => { setQuery(''); setStatusFilter(''); setDateFilter(''); setLocationFilter(''); setCurrentPage(1) }} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">Reset</button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Total Events</div>
              <div className="text-lg font-semibold text-gray-900">{totalEvents}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Active Events</div>
              <div className="text-lg font-semibold text-gray-900">{activeEvents}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Draft Events</div>
              <div className="text-lg font-semibold text-gray-900">{draftEvents}</div>
            </div>
            <div className="bg-white border rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Cancelled Events</div>
              <div className="text-lg font-semibold text-gray-900">{cancelledEvents}</div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Event Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Registrations</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Revenue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fill %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">{ev.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(ev.date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{ev.location}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{ev.capacity}</td>
                  {/* Registrations count */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{registrationsMap[String(ev.id)] || 0}</td>
                  {/* Revenue */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">${((revenueMap[String(ev.id)] || 0)).toFixed(2)}</td>
                  {/* Fill % with progress bar */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => {
                      const regs = Number(registrationsMap[String(ev.id)] || 0)
                      const cap = Number(ev.capacity || 0)
                      const pct = cap > 0 ? Math.min(100, Math.round((regs / cap) * 100)) : 0
                      const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      return (
                        <div className="w-40">
                          <div className="text-xs text-gray-600 mb-1">{pct}%</div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`${barColor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{ev.createdBy || ev.raw?.created_by?.fullName || ev.raw?.created_by?.email || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusBadge(ev.status)}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right relative">
                    <div className="inline-flex items-center gap-2">
                      <div className="relative">
                        <button
                          data-ev-toggle
                          type="button"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const MENU_WIDTH = 192 // px (approx 12rem)
                            const spaceLeft = rect.left + window.scrollX
                            const preferredLeft = spaceLeft - MENU_WIDTH
                            // prefer opening to the left; if not enough space, open to the right
                            const left = (preferredLeft > 8) ? preferredLeft : (rect.left + window.scrollX)
                            const top = rect.bottom + window.scrollY
                            // ensure menu stays within viewport right edge
                            const maxLeft = Math.max(8, window.innerWidth + window.scrollX - MENU_WIDTH - 8)
                            const finalLeft = Math.min(left, maxLeft)
                            setMenuPos({ top, left: finalLeft })
                            console.log('EventsList: open menu for', ev && (ev.id ?? ev._id ?? (ev.raw && ev.raw._id) ?? (ev.raw && ev.raw.id)))
                            setMenuOpenFor(ev.id)
                          }}
                          className="px-2 py-1 border rounded-md bg-white text-gray-600 hover:bg-gray-50 text-sm"
                          aria-haspopup="true"
                          aria-expanded={menuOpenFor === ev.id}
                        >
                          Actions
                        </button>

                        {menuOpenFor === ev.id && (
                          <div
                            data-ev-actions={`menu-${ev.id}`}
                            style={{ position: 'fixed', top: menuPos.top + 'px', left: menuPos.left + 'px', width: '12rem', pointerEvents: 'auto' }}
                            className="bg-white border border-gray-100 rounded-md shadow-sm z-50"
                            onMouseDown={(e) => { console.log('EventsList: menu mousedown on', e.target); }}
                            onClick={(e) => { console.log('EventsList: menu click on', e.target); }}
                          >
                            <ul className="py-1 max-h-screen overflow-auto">
                              {(() => {
                                const targetId = String(ev.id ?? ev._id ?? (ev.raw && ev.raw._id) ?? (ev.raw && ev.raw.id) ?? '')
                                const actions = [
                                  { key: 'view', label: 'View', onClick: () => { setMenuOpenFor(null); navigate(`/admin/events/${targetId}`) }, className: 'text-sm' },
                                  { key: 'viewTickets', label: 'View Tickets', onClick: () => { setMenuOpenFor(null); navigate(`/admin/events/${targetId}/tickets`) }, className: 'text-sm' },
                                  { key: 'edit', label: 'Edit', onClick: () => { setMenuOpenFor(null); navigate(`/admin/events/${targetId}/edit`) }, className: 'text-sm' },
                                  { key: 'download', label: 'Download Tickets', onClick: async () => { setMenuOpenFor(null); try { await ticketService.bulkDownloadTickets(targetId) } catch (err) { console.error('Failed to bulk download tickets', err) } }, className: 'text-sm' },
                                  { key: 'cancel', label: 'Cancel Event', onClick: () => { setMenuOpenFor(null); setSelectedEvent(ev); setConfirmAction('cancel'); setIsModalOpen(true) }, className: 'text-sm' },
                                  { key: 'delete', label: 'Delete', onClick: () => { setMenuOpenFor(null); setSelectedEvent(ev); setConfirmAction('delete'); setIsModalOpen(true) }, className: 'text-sm text-red-600' },
                                ]
                                return actions.map(action => (
                                  <li key={action.key}>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => { console.log('EventsList: button mousedown', action.key, e.target); }}
                                      onClick={(e) => { e.stopPropagation(); console.log('EventsList: action clicked', action.key, { targetId }); try { action.onClick && action.onClick() } catch(err) { console.error(err) } }}
                                      style={{ pointerEvents: 'auto' }}
                                      className={`w-full text-left px-4 py-2 ${action.className} hover:bg-gray-50`}
                                    >{action.label}</button>
                                  </li>
                                ))
                              })()}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination controls */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600">Showing {Math.min(filteredEvents.length, startIndex + 1)} to {Math.min(startIndex + paginatedEvents.length, filteredEvents.length)} of {filteredEvents.length} events</div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={`px-3 py-1 border rounded-md text-sm ${currentPage <= 1 ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>
              Prev
            </button>

            {/* page numbers, show up to 5 pages centered on current */}
            <div className="hidden sm:flex items-center gap-1">
              {(() => {
                const pages = []
                const maxButtons = 5
                let start = Math.max(1, currentPage - Math.floor(maxButtons / 2))
                let end = start + maxButtons - 1
                if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxButtons + 1) }
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border rounded-md text-sm ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}>
                      {i}
                    </button>
                  )
                }
                return pages
              })()}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1 border rounded-md text-sm ${currentPage >= totalPages ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>
              Next
            </button>
          </div>
        </div>
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setIsModalOpen(false)
            setSelectedEvent(null)
            setConfirmAction(null)
          }}
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg shadow-sm w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900">{confirmAction === 'cancel' ? 'Cancel Event' : 'Delete Event'}</h3>
              <p className="text-sm text-gray-500 mt-2">
                {confirmAction === 'cancel' ? (
                  <>Are you sure you want to cancel {selectedEvent && <span className="font-medium">'{selectedEvent.name}'</span>}? This will mark the event as cancelled.</>
                ) : (
                  <>Are you sure you want to delete {selectedEvent && <span className="font-medium">'{selectedEvent.name}'</span>}? This action cannot be undone.</>
                )}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedEvent(null)
                  setConfirmAction(null)
                }}
                className="px-4 py-2 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedEvent) return
                  setDeleting(true)
                  setError(null)
                  try {
                    if (confirmAction === 'cancel') {
                      console.log('EventsList: cancelling event', selectedEvent.id)
                      const payload = { status: 'Cancelled' }
                      console.log('EventsList: cancel payload (setting status)', payload)
                      const resp = await updateEvent(selectedEvent.id, payload)
                      console.log('EventsList: cancel response', resp)
                    } else {
                      console.log('EventsList: deleting event', selectedEvent.id)
                      const resp = await deleteEvent(selectedEvent.id)
                      console.log('EventsList: delete response', resp)
                    }
                    // refresh list and normalize server shape to frontend shape
                    try {
                      const data = await getAllEvents()
                      const arr = Array.isArray(data) ? data : (data && Array.isArray(data.events) ? data.events : [])
                      setEvents((arr || []).map(mapServerEvent))
                    } catch (refreshErr) {
                      console.error('Failed to refresh events after action', refreshErr)
                      setEvents([])
                    }
                    // also notify tickets/payments listeners
                    window.dispatchEvent(new CustomEvent('events:changed'))
                  } catch (e) {
                    console.error('EventsList: action failed', confirmAction, e)
                    // include server side details if present
                    try { console.error('EventsList: error data', e?.data ?? e?.response ?? null) } catch (xx) {}
                    setError(confirmAction === 'cancel' ? `Failed to cancel event: ${e?.message || 'unknown'}` : `Failed to delete event: ${e?.message || 'unknown'}`)
                  } finally {
                    setDeleting(false)
                    setIsModalOpen(false)
                    setSelectedEvent(null)
                    setConfirmAction(null)
                  }
                }}
                disabled={deleting}
                className={`px-4 py-2 rounded-md text-sm ${confirmAction === 'cancel' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'} text-white ${deleting ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {deleting ? (confirmAction === 'cancel' ? 'Cancelling...' : 'Deleting...') : (confirmAction === 'cancel' ? 'Cancel Event' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(d) {
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch (e) {
    return d
  }
}

function statusBadge(status) {
  if (status === 'Active') return 'bg-green-50 text-green-700'
  if (status === 'Upcoming') return 'bg-blue-50 text-blue-700'
  if (status === 'Past') return 'bg-gray-50 text-gray-700'
  return 'bg-gray-50 text-gray-700'
}

function downloadCSV(filename, rows) {
  const header = Object.keys(rows[0] || {})
  const csv = [header.join(','), ...rows.map(r => header.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

