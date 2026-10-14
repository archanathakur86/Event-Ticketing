import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useNavigate, useParams } from 'react-router-dom'
import { getAdminTicketById } from '@/api/tickets.api'
import TicketTemplatePreview from '@/components/tickets/TicketTemplatePreview'

export default function TicketDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    loadTicketDetails()
  }, [id])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const qrPayload =
          ticket?.qrCode || ticket?.qr_code || (ticket?.ticket_code
            ? JSON.stringify({ ticket_code: ticket.ticket_code, event_id: ticket.event_id?._id, user_id: ticket.user_id?._id })
            : '')

        if (!qrPayload) {
          if (mounted) setQrCodeUrl('')
          return
        }
        const url = await QRCode.toDataURL(String(qrPayload))
        if (mounted) setQrCodeUrl(url)
      } catch (err) {
        if (mounted) setQrCodeUrl('')
      }
    })()
    return () => { mounted = false }
  }, [ticket])

  const loadTicketDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const ticketData = await getAdminTicketById(id)
      if (!ticketData) {
        setError('Ticket not found')
        return
      }
      setTicket(ticketData)

    } catch (e) {
      console.error('Failed to load ticket details:', e)
      const status = e && (e.status || (e.response && e.response.status))
      if (status === 401 || status === 403) {
        navigate('/login')
        return
      }
      setError(e?.message || 'Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      booked: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  const getPaymentBadge = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0)
  }

  const eventName = ticket?.event_id?.event_name || 'N/A'
  const studentName = ticket?.user_id?.fullName || 'N/A'
  const studentEmail = ticket?.user_id?.email || 'N/A'
  const ticketId = ticket?.ticket_code || ticket?._id || 'N/A'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading ticket details...</div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-red-600 mb-4">{error || 'Ticket not found'}</div>
          <button
            onClick={() => navigate('/admin/tickets')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/admin/tickets')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tickets
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Ticket Details</h1>
          </div>
          <div className="flex gap-3">
            {getStatusBadge(ticket.status)}
            {getPaymentBadge(ticket.payment_status)}
          </div>
        </div>

        <div className="mb-6">
          <TicketTemplatePreview
            ticket={{
              ...ticket,
              ticketCode: ticketId,
              attendeeName: studentName,
              attendeeEmail: studentEmail,
              eventName,
              paymentStatus: ticket?.payment_status,
            }}
            fallbackEventName={eventName}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Student Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium text-gray-900">
                    {ticket.user_id?.fullName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium text-gray-900">
                    {ticket.user_id?.email || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-medium text-gray-900">
                    {ticket.user_id?.phone || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Role</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {ticket.user_id?.role || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Event Name</span>
                  <span className="font-medium text-gray-900">
                    {ticket.event_id?.event_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Event Date</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(ticket.event_id?.event_date)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Location</span>
                  <span className="font-medium text-gray-900">
                    {ticket.event_id?.location || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Capacity</span>
                  <span className="font-medium text-gray-900">
                    {ticket.event_id?.capacity || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Event Price</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(ticket.event_id?.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ticket Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Ticket ID</span>
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {ticket.ticket_code || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Ticket Type</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {ticket.ticket_type || 'regular'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Booking Date</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(ticket.created_at)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(ticket.updated_at)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Price Paid</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(ticket.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Payment Status</span>
                  <span>{getPaymentBadge(ticket.payment_status)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Ticket Status</span>
                  <span>{getStatusBadge(ticket.status)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Assigned</span>
                  <span className="font-medium text-gray-900">
                    {ticket.is_assigned ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">QR Code</h2>
              {qrCodeUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                    <img
                      src={qrCodeUrl}
                      alt="Ticket QR Code"
                      className="w-full max-w-xs"
                    />
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    Scan this QR code for ticket verification
                  </div>
                  <a
                    href={qrCodeUrl}
                    download={`ticket-${ticket.ticket_code}.png`}
                    className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700"
                  >
                    Download QR Code
                  </a>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  QR Code not available
                </div>
              )}

              {/* Additional Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={() => navigate(`/admin/events/${ticket.event_id?._id}`)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  View Event Details
                </button>
                <button
                  onClick={loadTicketDetails}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Refresh Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
