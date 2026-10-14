import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createTicket } from '@/api/tickets.api'
import { getCurrentUser } from '@/api/auth.api'
import eventService from '@/api/events.api'
import { initiatePayment } from '@/services/paymentService'

export default function EventDetailsPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedType, setSelectedType] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [bookingError, setBookingError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const ev = await eventService.getEventById(id)
        if (!mounted) return
        setEvent(ev)
        setSelectedType(ev?.ticketTypes?.[0]?.id ?? null)
      } catch (err) {
        console.error('Failed to load event', err)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const currentTicket = useMemo(() => (event?.ticketTypes || []).find(t => t.id === selectedType) || null, [event, selectedType])
  const total = useMemo(() => (currentTicket ? currentTicket.price * quantity : 0), [currentTicket, quantity])

  // async function handleBookNow() {
  //   try {
  //     const user = await getCurrentUser()
  //     if (!user) {
  //       setShowAuthModal(true)
  //       return
  //     }

  //     const payload = {
  //       eventId: event?.id || id,
  //       eventName: event?.title || event?.name,
  //       eventDate: event?.date,
  //       location: event?.location,
  //       price: total,
  //       userId: user.id ?? user?.email ?? 'unknown',
  //       ticketType: currentTicket?.id ?? selectedType,
  //       quantity,
  //     }

  //     const t = await createTicket(payload)
  //     if (!t) throw new Error('Booking failed')
  //     navigate('/payment/success')
  //   } catch (err) {
  //     console.error('Booking failed', err)
  //     window.alert('Booking failed. Please try again.')
  //   }
  // }

  async function handleBookNow() {
    setBookingError(null) // Clear previous error
    try {
      const user = await getCurrentUser()
      if (!user) {
        setShowAuthModal(true)
        return
      }
      console.log(user)

      // Get ticket type from selected type or default to regular
      const ticketType = currentTicket?.id || selectedType || 'regular'
      
      // Use PayU payment flow
      const res = await initiatePayment(event?.id || id, ticketType)
      
      // If free ticket, redirect to success
      if (res.is_free) {
        navigate('/payment/success?txnid=FREE')
        return
      }
      
      // If payment already initiated, inform user
      if (res.redirect) {
        setBookingError('You already have a pending payment for this event. Please complete or cancel it first.')
        return
      }
      
      // Payment initiated - redirect happens automatically via paymentService
    } catch (err) {
      console.error('Booking failed', err)
      // Extract error message from backend response
      const errorMessage = err?.response?.data?.error 
        || err?.data?.error 
        || err?.response?.data?.message 
        || err?.data?.message 
        || err?.message 
        || 'Booking failed. Please try again.'
      setBookingError(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-sm text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/events')}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
          >
            Browse Events
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hero Image */}
            {event.image && (
              <div className="mb-5 rounded-lg overflow-hidden bg-gray-200" style={{ height: '320px' }}>
                <img
                  src={event.image}
                  alt={event.title || event.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* Event Header */}
            <div className="bg-white rounded-lg p-6 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block px-2.5 py-0.5 bg-gray-900 text-white text-xs font-medium rounded">
                  {event.status || 'Published'}
                </span>
              </div>
              
              <h1 className="text-3xl font-semibold text-gray-900 mb-4 leading-tight">
                {event.title || event.name}
              </h1>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">{formatDate(event.date)}</span>
                </div>

                <div className="flex items-center text-sm">
                  <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{event.location}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg p-6 mb-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Event</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Capacity</p>
                <p className="text-xl font-semibold text-gray-900">
                  {event.capacity ? Number(event.capacity).toLocaleString() : '—'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Price From</p>
                <p className="text-xl font-semibold text-gray-900">
                  {currentTicket ? `₹${Number(currentTicket.price).toLocaleString()}` : '—'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Available</p>
                <p className="text-xl font-semibold text-gray-900">
                  {currentTicket ? (currentTicket.available ?? '—') : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Book Tickets</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Ticket Type
                  </label>
                  <select
                    value={selectedType || ''}
                    onChange={e => { setSelectedType(e.target.value); setQuantity(1) }}
                    className="w-full px-3 py-2.5 text-sm rounded border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none bg-white"
                  >
                    {(event.ticketTypes || []).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.label} — ₹{Number(t.price).toLocaleString()} ({t.available ?? '—'} left)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 rounded text-lg font-medium"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      min={1}
                      max={currentTicket ? currentTicket.available : 99}
                      onChange={e => {
                        const v = Number(e.target.value || 1)
                        const max = currentTicket ? currentTicket.available : 99
                        setQuantity(Math.min(Math.max(1, v), max))
                      }}
                      className="flex-1 text-center text-base font-medium py-2 rounded border border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                    />
                    <button
                      onClick={() => setQuantity(q => Math.min(currentTicket ? currentTicket.available : 999, q + 1))}
                      className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 rounded text-lg font-medium"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-2xl font-semibold text-gray-900">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={handleBookNow}
                    className="w-full py-3 bg-gray-900 hover:bg-black text-white font-medium rounded text-sm transition-colors"
                  >
                    Book Now
                  </button>

                  <p className="mt-3 text-xs text-center text-gray-500">
                    Secure payment • Instant confirmation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          aria-labelledby="auth-modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowAuthModal(false)} 
          />

          <div className="relative max-w-sm w-full bg-white rounded-lg shadow-xl p-6">
            <h3 id="auth-modal-title" className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Please sign in or create an account to book tickets.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => { setShowAuthModal(false); navigate('/login') }}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-medium rounded text-sm transition-colors"
              >
                Sign In
              </button>

              <button
                onClick={() => { setShowAuthModal(false); navigate('/register') }}
                className="w-full py-2.5 bg-white border border-gray-300 text-gray-900 font-medium rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Create Account
              </button>

              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-2 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

