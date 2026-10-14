import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicketById, downloadTicketPdf } from '@/api/tickets.api'
import { getCurrentUser } from '@/api/auth.api'
import TicketTemplatePreview from '@/components/tickets/TicketTemplatePreview'

export default function TicketDetailsPage() {
  const navigate = useNavigate()
  const { id: ticketId } = useParams()

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const user = await getCurrentUser()
        if (!user) {
          navigate('/login')
          return
        }

        const t = await getTicketById(ticketId)
        if (!t) {
          setError('Ticket not found')
          return
        }

        if (!mounted) return
        setTicket(t)
      } catch (err) {
        console.error('Failed to load ticket', err)
        if (!mounted) return
        setError('Failed to load ticket')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [ticketId, navigate])

  function handleDownload() {
    // download PDF from backend endpoint
    ;(async () => {
      try {
        const paymentState = String(ticket?.paymentStatus || '').toLowerCase()
        if (Number(ticket?.price || 0) > 0 && paymentState !== 'paid') {
          window.alert('Only paid tickets can be downloaded.')
          return
        }
        const id = ticket?.id || ticket?._id
        if (!id) { window.alert('No ticket available for download.'); return }
        const blob = await downloadTicketPdf(id)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ticket-${id}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('download failed', err)
        window.alert('Failed to download ticket')
      }
    })()
  }

  if (loading) return <div className="p-6">Loading ticket…</div>

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">{error}</div>
        <div className="mt-4">
          <button onClick={() => navigate('/student/tickets')} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Back to My Tickets</button>
        </div>
      </div>
    )
  }

  const paymentState = String(ticket.paymentStatus || '').toLowerCase()
  const ticketState = String(ticket.status || ticket.ticketStatus || '').toLowerCase()
  const status = ticketState === 'cancelled'
    ? 'Cancelled'
    : paymentState === 'paid' || Number(ticket.price || 0) <= 0
      ? 'Paid'
      : 'Unpaid'
  const canDownload = ticketState !== 'cancelled' && (Number(ticket.price || 0) <= 0 || paymentState === 'paid')
  const showQr = ticketState !== 'cancelled'

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{ticket.eventName || ticket.event || ticket.name}</h1>
            <p className="mt-1 text-sm text-gray-600">Ticket Details & access</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Status</div>
            <div className="mt-1">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status === 'Paid' ? 'bg-green-100 text-green-800' : status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : status === 'Failed' ? 'bg-red-100 text-red-800' : status === 'Refunded' ? 'bg-slate-200 text-slate-800' : 'bg-gray-100 text-gray-800'}`}>
                {status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <TicketTemplatePreview ticket={ticket} fallbackEventName={ticket.eventName || ticket.event || ticket.name} showQr={showQr} />
        <div className="flex flex-wrap gap-3">
          <button onClick={handleDownload} disabled={!canDownload} className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm ${canDownload ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Download Ticket</button>
          <button onClick={() => navigate('/student/tickets')} className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Back to My Tickets</button>
          <button onClick={() => navigator.share?.({ title: ticket.eventName, text: 'My ticket', url: window.location.href })} className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Share</button>
        </div>
      </div>
    </div>
  )
}
