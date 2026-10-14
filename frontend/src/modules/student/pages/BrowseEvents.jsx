import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllEvents, getAllEventsRaw, mapServerEvent } from '@/api/events.api'
import useAuthStore from '@/store/authStore'
import { getTicketsByUser } from '@/api/tickets.api'

function isActiveStudentTicket(ticket) {
  const ticketStatus = String(ticket?.ticketStatus || ticket?.status || '').toLowerCase()
  const paymentStatus = String(ticket?.paymentStatus || '').toLowerCase()
  if (ticketStatus === 'cancelled') return false
  if (paymentStatus === 'failed' || paymentStatus === 'refunded' || paymentStatus === 'pending') return false
  if (Number(ticket?.price || 0) <= 0) return ticketStatus === 'booked'
  return ticketStatus === 'booked' && paymentStatus === 'paid'
}

// Ensure debug helpers exist as no-ops before the component mounts.
if (typeof window !== 'undefined') {
  try {
    // @ts-ignore
    window.__setBrowseEvents = window.__setBrowseEvents || function () { console.warn('window.__setBrowseEvents no-op (component not mounted)') }
    // @ts-ignore
    window.__getBrowseEvents = window.__getBrowseEvents || function () { return window.__lastFetchedEvents || [] }
  } catch (e) {
    // ignore
  }
}

export default function BrowseEvents() {
  const { user } = useAuthStore()
  const userId = user?.id || user?._id || user?.userId || null
  const [events, setEvents] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sortBy, setSortBy] = useState('dateAsc')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const navigate = useNavigate()

  function openEventBooking(event) {
    navigate(`/student/events/${event.id}`, { state: { event } })
  }

  async function loadBrowseData({ silent = false } = {}) {
    if (!silent) setLoading(true)
    setFetchError(null)
    let all = []
    try {
      const mapped = await getAllEvents()
      all = Array.isArray(mapped) ? mapped : []
    } catch (e) {
      setFetchError(e?.message || String(e))
      try {
        const raw = await getAllEventsRaw()
        const arr = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.events) ? raw.events : [])
        all = (arr || []).map(item => mapServerEvent(item))
      } catch (er) {
        all = []
      }
    }
    let myTickets = []
    try { myTickets = userId ? await getTicketsByUser(userId) : [] } catch (e) { myTickets = [] }
    const mapped = (all || []).map(item => mapServerEvent(item))
    setEvents(mapped || [])
    setTickets(myTickets || [])
    if (!silent) setLoading(false)
  }

  // Expose stable debug helpers for manual testing in browser console.
  // Use a ref to avoid stale closures and re-run deletion during every events change.
  const eventsRef = useRef(events)
  useEffect(() => { eventsRef.current = events }, [events])

  useEffect(() => {
    try {
      // setter: directly call component's setEvents
      // @ts-ignore
      window.__setBrowseEvents = (arr) => { try { setEvents(arr || []) } catch (e) { console.warn(e) } }
      // getter: read from ref so it always returns latest events
      // @ts-ignore
      window.__getBrowseEvents = () => eventsRef.current
    } catch (e) {
      // ignore
    }
    return () => {
      try {
        // remove helpers on unmount
        // @ts-ignore
        delete window.__setBrowseEvents
        // @ts-ignore
        delete window.__getBrowseEvents
      } catch (e) {}
    }
  }, [])

  const IconLocation = (
    <svg className="w-4 h-4 text-gray-400 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z"></path>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 21s6-4.686 6-9a6 6 0 10-12 0c0 4.314 6 9 6 9z"></path>
    </svg>
  )

  const IconCalendar = (
    <svg className="w-4 h-4 text-gray-400 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path>
    </svg>
  )

  const IconPrice = (
    <svg className="w-4 h-4 text-gray-400 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 2v4" />
    </svg>
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await loadBrowseData()
      } catch (err) {
        if (mounted) {
          console.error('BrowseEvents: load failed', err)
          setEvents([])
          setTickets([])
          setLoading(false)
        }
      }
    })()
    return () => { mounted = false }
  }, [userId])

  useEffect(() => {
    const refresh = () => { loadBrowseData({ silent: true }).catch(() => {}) }
    const intervalId = window.setInterval(refresh, 15000)
    window.addEventListener('events:changed', refresh)
    window.addEventListener('tickets:changed', refresh)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('events:changed', refresh)
      window.removeEventListener('tickets:changed', refresh)
    }
  }, [userId])

  // Safety-net: if for any reason events state is empty after initial load,
  // attempt a direct unauthenticated fetch to ensure students see public events.
  useEffect(() => {
    if ((events || []).length > 0) return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/events', { credentials: 'omit' })
        const text = await res.text()
        let json
        try { json = JSON.parse(text) } catch { json = text }
        const arr = Array.isArray(json) ? json : (json && Array.isArray(json.events) ? json.events : [])
        const mapped = (arr || []).map(item => mapServerEvent(item))
        if (!mounted) return
        if (mapped.length > 0) {
          setEvents(mapped)
        }
      } catch (err) {
        // ignore fallback errors
        console.warn('BrowseEvents fallback fetch failed', err)
      }
    })()
    return () => { mounted = false }
  }, [events])

  const registeredEventIds = useMemo(
    () => new Set((tickets || []).filter(isActiveStudentTicket).map(t => String(t.eventId))),
    [tickets],
  )

  // show only published events fetched from the server, exclude cancelled
  const published = events.filter(e => {
    const status = String(e.status || '').toLowerCase()
    return (status === 'published' || !e.status) && status !== 'cancelled'
  })

  // Filters
  const results = useMemo(() => {
    const q = (query || '').toLowerCase()
    return published
      .filter(e => {
        if (!q) return true
        const name = String(e.name || e.title || '').toLowerCase()
        const location = String(e.location || '').toLowerCase()
        const description = String(e.description || '').toLowerCase()
        return name.includes(q) || location.includes(q) || description.includes(q)
      })
      .filter(e => {
        if (!dateFilter) return true
        try {
          const sel = new Date(dateFilter)
          const ed = new Date(e.date)
          return ed.toDateString() === sel.toDateString()
        } catch (err) { return true }
      })
      .map(e => ({
        ...e,
        remainingSeats: Number(e.availableSeats ?? e.capacity ?? 0),
        capacityTotal: Number(e.capacity ?? e.availableSeats ?? 0),
      }))
      .sort((a,b) => {
        if (sortBy === 'dateAsc') return new Date(a.date) - new Date(b.date)
        if (sortBy === 'dateDesc') return new Date(b.date) - new Date(a.date)
        if (sortBy === 'priceAsc') return (Number(a.price)||0) - (Number(b.price)||0)
        if (sortBy === 'priceDesc') return (Number(b.price)||0) - (Number(a.price)||0)
        if (sortBy === 'seatsDesc') return (Number(b.remainingSeats)||0) - (Number(a.remainingSeats)||0)
        return 0
      })
  }, [published, query, dateFilter, sortBy])

  const [quickView, setQuickView] = useState(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setQuickView(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const recommendations = useMemo(() => {
    const now = new Date()
    return published
      .map(e => ({ ...e, remainingSeats: Number(e.availableSeats ?? e.capacity ?? 0) }))
      .filter(e => e.remainingSeats > 0)
      .filter(e => !registeredEventIds.has(String(e.id)))
      .filter(e => e.date && new Date(e.date) > now)
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0,3)
  }, [published, registeredEventIds])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 flex items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600"></div>
    </div>
  )

  const formatDate = (d) => {
    try { return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) } catch (e) { return d }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="mb-7 sm:mb-9">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-2">Discover Events</h1>
          <p className="text-sm sm:text-base text-gray-600">Find and book tickets for the best events happening near you</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white/95 backdrop-blur rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-all p-5 sm:p-6 mb-7 sm:mb-9">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="block text-xs font-bold text-indigo-600 mb-2 tracking-wide">SEARCH</label>
              <div className="relative">
                <svg className="w-4 h-4 text-indigo-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  placeholder="Search by event name, location, or keyword" 
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-indigo-600 mb-2 tracking-wide">DATE</label>
              <input 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)} 
                type="date" 
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white transition-all shadow-sm"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-bold text-indigo-600 mb-2 tracking-wide">SORT</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)} 
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white cursor-pointer transition-all shadow-sm"
              >
                <option value="dateAsc">Earliest First</option>
                <option value="dateDesc">Latest First</option>
                <option value="priceAsc">Low to High</option>
                <option value="priceDesc">High to Low</option>
                <option value="seatsDesc">Most Available</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => { setQuery(''); setDateFilter(''); setSortBy('dateAsc') }}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 text-indigo-600 font-medium shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5 sm:mb-7">
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{results.length}</span> {results.length === 1 ? 'event' : 'events'} available
            </p>
          </div>
          {fetchError && <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded">Error: {fetchError}</span>}
        </div>

        {/* Events Grid */}
        {results.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No events found</h3>
            <p className="text-sm text-gray-600">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((ev) => {
              const isRegistered = registeredEventIds.has(String(ev.id))
              const eventDateLabel = ev.date
                ? new Date(ev.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Date TBA'
              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
                  onClick={() => openEventBooking(ev)}
                >
                  {/* Event Image Placeholder */}
                  <div className="h-32 sm:h-40 bg-gradient-to-br from-indigo-100 via-blue-50 to-indigo-50 flex items-center justify-center group-hover:from-indigo-200 group-hover:via-blue-100 group-hover:to-indigo-100 transition-all relative overflow-hidden">
                    <svg className="w-9 h-9 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    {/* Status */}
                    {isRegistered && (
                      <span className="inline-block w-fit px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg mb-3">
                        ✓ Registered
                      </span>
                    )}

                    {/* Title */}
                    <h3 className="text-[15px] sm:text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors leading-snug">
                      {ev.title || ev.name}
                    </h3>

                    {/* Date & Location */}
                    <div className="space-y-1.5 mb-4 text-xs text-gray-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{eventDateLabel}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-bold text-gray-900">
                          {ev.price ? `₹${Number(ev.price).toLocaleString()}` : 'Free'}
                        </span>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${ev.remainingSeats > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-red-700 bg-red-50'}`}>
                          {ev.remainingSeats > 0 ? `${ev.remainingSeats} left` : 'Sold Out'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEventBooking(ev) }}
                        className={`w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-colors ${ev.remainingSeats > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
                      >
                        {ev.remainingSeats > 0 ? 'View & Book' : 'Sold Out'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {quickView && (
        <BrowseEventsQuickView
          event={quickView}
          onClose={() => setQuickView(null)}
          onBook={(ev) => { openEventBooking(ev); setQuickView(null) }}
        />
      )}
    </div>
  )
}

export function BrowseEventsQuickView({ event, onClose, onBook }) {
  if (!event) return null
  const percent = event.capacityTotal > 0 ? Math.round(((event.capacityTotal - event.remainingSeats) / event.capacityTotal) * 100) : 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl p-4 sm:p-6 z-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 pr-8">{event.name}</h3>
            <div className="text-sm text-gray-500 mt-1">{new Date(event.date).toLocaleString()} · {event.location}</div>
            <div className="mt-4 text-sm text-gray-700">{event.description}</div>
            <div className="mt-4">
              <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                <div style={{ width: `${percent}%` }} className="h-2 bg-green-500" />
              </div>
              <div className="text-xs text-gray-500 mt-2">{event.remainingSeats} seats left • capacity {event.capacityTotal}</div>
            </div>
          </div>

          <div className="w-full sm:w-44 flex-shrink-0 sm:text-right">
            <div className="text-sm font-semibold text-indigo-600">{event.price ? `₹${event.price}` : 'Free'}</div>
            <div className="mt-3 sm:mt-6">
              <button onClick={() => onBook(event)} disabled={(event.remainingSeats||0) <= 0} className={`w-full px-4 py-2 rounded text-white ${((event.remainingSeats||0) <= 0) ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {(event.remainingSeats||0) <= 0 ? 'Full' : 'Register'}
              </button>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
      </div>
    </div>
  )
}
