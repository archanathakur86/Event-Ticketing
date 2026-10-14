import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { showToast } from '../../../components/ui/Toast'
import * as eventService from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import { initiatePayment } from '@/api/payments.api'

function formatDateTime(dateValue) {
  if (!dateValue) return 'Date not available'
  try {
    return new Date(dateValue).toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return String(dateValue)
  }
}

function isActiveStudentTicket(ticket) {
  const ticketStatus = String(ticket?.ticketStatus || ticket?.status || '').toLowerCase()
  const paymentStatus = String(ticket?.paymentStatus || '').toLowerCase()
  if (ticketStatus === 'cancelled') return false
  if (paymentStatus === 'failed' || paymentStatus === 'refunded' || paymentStatus === 'pending') return false
  if (Number(ticket?.price || 0) <= 0) return ticketStatus === 'booked'
  return ticketStatus === 'booked' && paymentStatus === 'paid'
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export default function StudentEventBookingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const { user } = useAuthStore()

  const [event, setEvent] = useState(location.state?.event || null)
  const [myTickets, setMyTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  async function loadBookingData({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      const [eventRes, ticketsRes] = await Promise.all([
        eventService.getEventById(id),
        user?.id ? ticketService.getTicketsByUser(user.id) : Promise.resolve([]),
      ])
      setEvent(eventRes || location.state?.event || null)
      setMyTickets(Array.isArray(ticketsRes) ? ticketsRes : [])
    } catch (err) {
      setEvent(location.state?.event || null)
      setMyTickets([])
      throw err
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await loadBookingData()
        if (!mounted) return
      } catch (err) {
        console.error('Failed to load student booking page', err)
        if (mounted) {
          setEvent(location.state?.event || null)
          setMyTickets([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, user?.id])

  useEffect(() => {
    const refresh = () => { loadBookingData({ silent: true }).catch(() => {}) }
    const intervalId = window.setInterval(refresh, 10000)
    window.addEventListener('events:changed', refresh)
    window.addEventListener('tickets:changed', refresh)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('events:changed', refresh)
      window.removeEventListener('tickets:changed', refresh)
    }
  }, [id, user?.id])

  const existingTicket = useMemo(() => {
    return (myTickets || []).find((ticket) => String(ticket.eventId) === String(id) && isActiveStudentTicket(ticket))
  }, [myTickets, id])

  useEffect(() => {
    setAlreadyRegistered(Boolean(existingTicket))
  }, [existingTicket])

  const price = Number(event?.price || 0)
  const seatsLeft = Number(event?.availableSeats ?? event?.capacity ?? 0)
  const organizer = event?.createdBy || event?.organizer || 'ConfNow'
  const studentName = user?.fullName || user?.name || 'Student'
  const studentEmail = user?.email || '—'
  const studentPhone = user?.phone || user?.mobile || 'Not added'
  const totalAmount = price

  async function handleProceed() {
    if (!event?.id || submitting) return

    if (existingTicket || alreadyRegistered) {
      showToast({ title: 'Already registered', message: 'You already registered for this event.', type: 'warn' })
      return
    }

    if (seatsLeft <= 0) {
      showToast({ title: 'Event full', message: 'No seats are available for this event.', type: 'warn' })
      return
    }

    setSubmitting(true)
    try {
      if (Number(price || 0) <= 0) {
        await ticketService.createTicket({
          event_id: event.id,
          ticket_type: "regular",
        })
        setAlreadyRegistered(true)
        window.dispatchEvent(new CustomEvent('tickets:changed'))
        window.dispatchEvent(new CustomEvent('events:changed'))
        showToast({ title: 'Booking successful', message: 'Your free ticket has been generated.', type: 'success' })
        navigate('/student/tickets')
        return
      }

      const res = await initiatePayment({ event_id: event.id })

      if (res && res.is_free) {
        window.dispatchEvent(new CustomEvent('tickets:changed'))
        window.dispatchEvent(new CustomEvent('events:changed'))
        showToast({ title: 'Booking successful', message: 'Your ticket has been generated.', type: 'success' })
        navigate('/student/tickets')
        return
      }

      if (res?.payu_url && res?.payu_params) {
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = res.payu_url

        Object.entries(res.payu_params).forEach(([key, value]) => {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value ?? '')
          form.appendChild(input)
        })

        document.body.appendChild(form)
        form.submit()
        form.remove()
        return
      }

      throw new Error('Unable to start payment')
    } catch (err) {
      if (/already have a ticket for this event/i.test(String(err?.message || ''))) {
        setAlreadyRegistered(true)
        showToast({
          title: 'Already registered',
          message: 'You already registered for this event.',
          type: 'warn',
        })
        return
      }
      if ((Number(err?.status) === 408 || /failed to fetch/i.test(String(err?.message || ''))) && Number(price || 0) === 0) {
        try {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            if (attempt > 0) await wait(1200)
            const freshTickets = user?.id ? await ticketService.getTicketsByUser(user.id) : []
            const bookedTicket = (freshTickets || []).find(
              (ticket) => String(ticket.eventId) === String(event.id) && isActiveStudentTicket(ticket),
            )
            if (bookedTicket) {
              window.dispatchEvent(new CustomEvent('tickets:changed'))
              window.dispatchEvent(new CustomEvent('events:changed'))
              setAlreadyRegistered(true)
              showToast({
                title: 'Booking successful',
                message: 'Your free ticket was created successfully.',
                type: 'success',
              })
              navigate('/student/tickets')
              return
            }
          }
        } catch (verifyErr) {
          // Fall through to the original error toast if verification also fails.
        }
      }
      console.error('Failed to initiate student booking', err)
      showToast({ title: 'Booking failed', message: err?.message || 'Failed to start payment.', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading event details...</div>
  }

  if (!event) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Event not found</h1>
        <p className="mt-2 text-sm text-slate-500">This event is unavailable or may have been removed.</p>
        <button
          onClick={() => navigate('/student/browse')}
          className="mt-5 rounded-xl bg-[#123386] px-4 py-2 text-sm font-medium text-white"
        >
          Back to Events
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <button
          onClick={() => navigate('/student/browse')}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </button>

        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Event Booking</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{event.name || event.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{event.description || 'No description available.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{event.status || 'Published'}</span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {price > 0 ? `₹${price.toLocaleString()}` : 'Free Entry'}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Event Information</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoItem label="Event" value={event.name || event.title} />
                <InfoItem label="Date & Time" value={formatDateTime(event.date)} />
                <InfoItem label="Venue" value={event.location || 'Venue not set'} />
                <InfoItem label="Organizer" value={organizer} />
                <InfoItem label="Ticket Price" value={price > 0 ? `₹${price.toLocaleString()}` : 'Free'} />
                <InfoItem label="Seats Available" value={String(Math.max(0, seatsLeft))} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Student Information</h2>
                  <p className="mt-1 text-sm text-slate-500">This information will be used for the ticket and payment.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">1 ticket per student</span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoItem label="Name" value={studentName} />
                <InfoItem label="Email" value={studentEmail} />
                <InfoItem label="Phone" value={studentPhone} />
                <InfoItem label="Quantity" value="1" />
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Price Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Ticket Price" value={price > 0 ? `₹${price.toLocaleString()}` : '₹0'} />
                <SummaryRow label="Service Fee" value="₹0" />
                <SummaryRow label="Total" value={`₹${totalAmount.toLocaleString()}`} strong />
              </div>

              {existingTicket || alreadyRegistered ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  You already registered for this event.
                </div>
              ) : null}

              {seatsLeft <= 0 ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  This event is currently full.
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleProceed}
                disabled={submitting || !!existingTicket || alreadyRegistered || seatsLeft <= 0}
                className="mt-5 w-full rounded-2xl bg-[#123386] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2b71] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting
                  ? 'Processing...'
                  : seatsLeft <= 0
                    ? 'Sold Out'
                    : existingTicket || alreadyRegistered
                      ? 'Already Registered'
                      : price > 0
                        ? 'Proceed to Payment'
                        : 'Book Ticket'}
              </button>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                After successful payment, your QR ticket will be generated automatically and shown in My Tickets.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium leading-6 text-slate-900">{value || '—'}</div>
    </div>
  )
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}>{value}</span>
    </div>
  )
}
