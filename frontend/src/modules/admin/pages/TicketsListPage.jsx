import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminTickets } from '@/api/tickets.api'
import { getAllEventsRaw, mapServerEvent } from '@/api/events.api'

export default function TicketsListPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10
  
  // Filters
  const [eventFilter, setEventFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [eventFilter, statusFilter, paymentStatusFilter])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch tickets with filters
      const filters = {}
      if (eventFilter) filters.event_id = eventFilter
      if (statusFilter) filters.status = statusFilter
      if (paymentStatusFilter) filters.payment_status = paymentStatusFilter
      
      const ticketsRes = await getAdminTickets(filters)
      setTickets(ticketsRes.tickets || [])

      // Fetch all events for filter dropdown
      const eventsRes = await getAllEventsRaw()
      const rawEvents = eventsRes && Array.isArray(eventsRes.events) ? eventsRes.events : []
      const mappedEvents = rawEvents.map(mapServerEvent)
      setEvents(mappedEvents)
    } catch (e) {
      console.error('Failed to load tickets:', e)
      const status = e && (e.status || (e.response && e.response.status))
      if (status === 401 || status === 403) {
        navigate('/login')
        return
      }
      setError(e?.message || 'Failed to load tickets')
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Filter tickets based on search query
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const ticketCode = ticket.ticket_code?.toLowerCase() || ''
    const studentName = ticket.user_id?.fullName?.toLowerCase() || ''
    const eventName = ticket.event_id?.event_name?.toLowerCase() || ''
    return ticketCode.includes(query) || studentName.includes(query) || eventName.includes(query)
  })

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tickets Management</h1>
          <p className="text-gray-600">View and manage all booked tickets</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Ticket ID, Student, Event..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Event Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event
              </label>
              <select
                value={eventFilter}
                onChange={(e) => {
                  setEventFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Events</option>
                {events.map((event) => (
                  <option key={event.id || event._id} value={event.id || event._id}>
                    {event.name || event.event_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ticket Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="booked">Booked</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Payments</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(eventFilter || statusFilter || paymentStatusFilter || searchQuery) && (
            <button
              onClick={() => {
                setEventFilter('')
                setStatusFilter('')
                setPaymentStatusFilter('')
                setSearchQuery('')
                setCurrentPage(1)
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Tickets</div>
            <div className="text-2xl font-bold text-gray-900">{tickets.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Booked</div>
            <div className="text-2xl font-bold text-green-600">
              {tickets.filter(t => t.status === 'booked').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {tickets.filter(t => t.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Cancelled</div>
            <div className="text-2xl font-bold text-red-600">
              {tickets.filter(t => t.status === 'cancelled').length}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-600">Loading tickets...</div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-red-600">{error}</div>
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-600">No tickets found</div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTickets.map((ticket) => (
                      <tr key={ticket._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {ticket.ticket_code || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ticket.user_id?.fullName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ticket.event_id?.event_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentBadge(ticket.payment_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(ticket.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/admin/tickets/${ticket._id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow mt-6 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredTickets.length)} of{' '}
                    {filteredTickets.length} tickets
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-4 py-2 border rounded-lg ${
                            currentPage === i + 1
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
