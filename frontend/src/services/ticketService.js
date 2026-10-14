import { api } from './api'

export function mapServerTicket(t) {
  if (!t) return null
  return {
    id: t._id || t.id,
    ticketCode: t.ticket_code || t.ticketCode || t.ticketCode,
    userId: t.user_id ? (t.user_id._id || t.user_id) : t.userId,
    userName: t.user_id?.fullName || t.user_id?.name || '',
    userEmail: t.user_id?.email || '',
    paymentStatus: t.payment_status || t.paymentStatus || (t.status === 'booked' ? 'Paid' : t.status),
    price: t.price || 0,
    eventId: t.event_id ? (t.event_id._id || t.event_id) : t.eventId,
    eventName: t.event_id?.event_name || t.event_id?.name || '',
    eventDate: t.event_id?.event_date || t.event_id?.date || '',
    eventLocation: t.event_id?.location || '',
    ticketType: t.ticket_type || t.ticketType,
    status: t.status || 'booked',
    isAssigned: t.is_assigned || false,
    createdAt: t.created_at || t.createdAt || new Date().toISOString(),
    raw: t,
  }
}

export async function getMyTickets() {
  try {
    // Use the existing endpoint - backend filters by logged-in user
    const res = await api.get('/api/tickets')
    // Handle both response formats
    const rawTickets = res?.tickets || res?.data?.tickets || []
    const items = Array.isArray(rawTickets) ? rawTickets.map(mapServerTicket) : []
    const count = res?.count || res?.data?.count || items.length
    return { tickets: items, count }
  } catch (err) {
    console.error('getMyTickets error:', err)
    if (err && err.status === 404) return { tickets: [], count: 0 }
    throw err
  }
}

export async function createTicket(ticketData = {}) {
  try {
    const payload = {
      event_id: ticketData.eventId || ticketData.event_id,
      ticket_type: ticketData.ticketType || ticketData.ticket_type || 'regular',
    }
    const res = await api.post('/api/tickets/book', payload)
    const ticket = mapServerTicket(res?.ticket || res?.data?.ticket || res)
    window.dispatchEvent(new CustomEvent('tickets:changed'))
    return ticket
  } catch (err) {
    console.error('createTicket error:', err)
    // Re-throw with the backend message preserved
    const errorMessage = err?.response?.data?.message 
      || err?.data?.message 
      || err?.message 
      || 'Failed to book ticket'
    const error = new Error(errorMessage)
    error.originalError = err
    throw error
  }
}

export async function getTicketsByUser(userId) {
  try {
    const res = await api.get('/api/tickets')
    const items = (res && res.tickets) ? res.tickets.map(mapServerTicket) : []
    if (userId) return items.filter(t => String(t.userId) === String(userId))
    return items
  } catch (err) {
    if (err && err.status === 404) return []
    throw err
  }
}

export async function getAllTickets(filters = {}) {
  try {
    const qs = []
    if (filters.event_id) qs.push(`event_id=${encodeURIComponent(filters.event_id)}`)
    if (filters.status) qs.push(`status=${encodeURIComponent(filters.status)}`)
    const query = qs.length ? `?${qs.join('&')}` : ''
    const res = await api.get(`/api/tickets${query}`)
    const items = (res && res.data && Array.isArray(res.data.tickets)) ? res.data.tickets : (res && Array.isArray(res.tickets) ? res.tickets : [])
    return (items || []).map(mapServerTicket)
  } catch (err) {
    if (err && err.status === 404) return []
    throw err
  }
}

export async function getTicketsByEvent(eventId) {
  try {
    if (!eventId) return { tickets: [], count: 0 }
    const query = `?event_id=${encodeURIComponent(eventId)}`
    const res = await api.get(`/api/tickets${query}`)
    const raw = (res && res.data && Array.isArray(res.data.tickets)) ? res.data.tickets : (res && Array.isArray(res.tickets) ? res.tickets : [])
    const items = (raw || []).map(mapServerTicket)
    const count = (res && res.data && typeof res.data.count === 'number') ? res.data.count : (res && typeof res.count === 'number' ? res.count : items.length)
    return { tickets: items, count }
  } catch (err) {
    if (err && err.status === 404) return { tickets: [], count: 0 }
    throw err
  }
}

export async function getAllTicketsRaw(filters = {}) {
  try {
    const qs = []
    if (filters.event_id) qs.push(`event_id=${encodeURIComponent(filters.event_id)}`)
    if (filters.status) qs.push(`status=${encodeURIComponent(filters.status)}`)
    const query = qs.length ? `?${qs.join('&')}` : ''
    const res = await api.get(`/api/tickets${query}`)
    const raw = (res && res.data && Array.isArray(res.data.tickets)) ? res.data.tickets : (res && Array.isArray(res.tickets) ? res.tickets : [])
    const count = (res && res.data && typeof res.data.count === 'number') ? res.data.count : (res && typeof res.count === 'number' ? res.count : raw.length)
    return { tickets: raw, count }
  } catch (err) {
    if (err && err.status === 404) return { tickets: [], count: 0 }
    throw err
  }
}

export async function getAllTicketsFiltered(filters = {}) {
  try {
    const qs = []
    if (filters.event_id) qs.push(`event_id=${encodeURIComponent(filters.event_id)}`)
    if (filters.status) qs.push(`status=${encodeURIComponent(filters.status)}`)
    const query = qs.length ? `?${qs.join('&')}` : ''
    const res = await api.get(`/api/tickets${query}`)
    const items = (res && res.tickets) ? res.tickets.map(mapServerTicket) : []
    return { tickets: items, count: (res && typeof res.count === 'number') ? res.count : items.length }
  } catch (err) {
    if (err && err.status === 404) return { tickets: [], count: 0 }
    throw err
  }
}

export async function bulkDownloadTickets(eventId) {
  if (!eventId) throw new Error('Missing event id')
  const BASE = import.meta.env.VITE_API_URL || ''
  const url = `${BASE}/api/tickets/bulk-download/${encodeURIComponent(eventId)}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(text || 'Failed to bulk download tickets')
    err.status = res.status
    throw err
  }
  const blob = await res.blob()
  const filename = `event-${eventId}-tickets.csv`
  const a = document.createElement('a')
  const urlObj = URL.createObjectURL(blob)
  a.href = urlObj
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(urlObj)
  return true
}

export async function getTicketById(ticketId) {
  try {
    const res = await api.get(`/api/tickets/${ticketId}`)
    return res && res.ticket ? mapServerTicket(res.ticket) : null
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
}

export async function getTicketByCode(code) {
  try {
    if (!code) return null
    const all = await getAllTickets()
    const c = String(code).trim()
    return all.find(t => String(t.ticketCode) === c || String(t.code) === c || String(t.id) === c) || null
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
}

export async function updateTicket(id, data = {}) {
  // backend supports cancel via PATCH /api/tickets/:id/cancel
  try {
    if (data.status && String(data.status).toLowerCase() === 'cancelled') {
      await api.patch(`/api/tickets/${id}/cancel`)
      window.dispatchEvent(new CustomEvent('tickets:changed'))
      return getTicketById(id)
    }
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
  // If other updates are supported by backend, call PATCH
  try {
    const res = await api.patch(`/api/tickets/${id}`, data)
    if (data.paymentStatus) window.dispatchEvent(new CustomEvent('payments:changed'))
    window.dispatchEvent(new CustomEvent('tickets:changed'))
    return res && res.ticket ? mapServerTicket(res.ticket) : res
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
}

export default {
  createTicket,
  getTicketsByUser,
  getTicketById,
  getAllTickets,
  updateTicket,
  getMyTickets
}

export async function fetchTickets() { return [] }

export async function downloadTicketPdf(ticketId) {
  if (!ticketId) throw new Error('Missing ticket id')
  const BASE = import.meta.env.VITE_API_URL || ''
  const url = `${BASE}/api/tickets/download/${ticketId}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(text || 'Failed to download ticket')
    err.status = res.status
    throw err
  }
  const blob = await res.blob()
  return blob
}
