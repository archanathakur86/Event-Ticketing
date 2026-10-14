import { api } from './client'
import { Ticket } from './contracts'

export async function createTicket(payload: any) {
  const normalized = {
    event_id: payload?.event_id ?? payload?.eventId,
    ticket_type: payload?.ticket_type ?? payload?.ticketType ?? 'regular',
  }
  const res = await api.post('/api/tickets/book', normalized)
  return (res && (res as any).ticket) ? (res as any).ticket : res
}

export async function getTicketsByUser(userId: string | number) {
  const res = await api.get(`/api/tickets?userId=${userId}`)
  const raw = Array.isArray(res) ? res : (res && (res as any).tickets) ? (res as any).tickets : []
  return (raw || []).map(mapServerTicket)
}

export async function getAllTickets(query: any = {}) {
  const q = Object.keys(query || {}).length ? ('?' + new URLSearchParams(query).toString()) : ''
  const res = await api.get(`/api/tickets${q}`)
  if (Array.isArray(res)) return res
  if (res && Array.isArray((res as any).tickets)) return (res as any).tickets
  if (res && (res as any).data && Array.isArray((res as any).data.tickets)) return (res as any).data.tickets
  return []
}

// raw response and mapper to preserve compatibility with legacy callers
export async function getAllTicketsRaw() {
  const res = await api.get('/api/tickets')
  return res
}

export function mapServerTicket(raw: any): Ticket {
  if (!raw) return {} as Ticket
  const resolveId = (v: any) => {
    if (!v && v !== 0) return undefined
    if (typeof v === 'string' || typeof v === 'number') return v
    if (typeof v === 'object') return v._id ?? v.id ?? undefined
    return undefined
  }
  return {
    id: raw.id ?? raw._id,
    eventId: resolveId(raw.eventId ?? raw.event_id ?? raw.event),
    userId: resolveId(raw.userId ?? raw.user_id ?? raw.user),
    createdAt: raw.createdAt ?? raw.created_at,
    ticketCode: raw.ticketCode ?? raw.code ?? raw.ticket_code,
    status: raw.status,
    ticketStatus: raw.ticketStatus ?? raw.ticket_status ?? raw.status,
    paymentStatus: raw.paymentStatus ?? raw.payment_status,
    price: raw.price ?? raw.amount,
    ticketType: raw.ticketType ?? raw.ticket_type,
    attendeeName: raw.attendeeName ?? raw.user_id?.fullName ?? raw.user?.fullName ?? raw.student_name,
    attendeeEmail: raw.attendeeEmail ?? raw.user_id?.email ?? raw.user?.email ?? raw.email,
    eventName: raw.eventName ?? raw.event_id?.event_name ?? raw.event?.event_name,
    eventDate: raw.eventDate ?? raw.event_id?.event_date ?? raw.event?.event_date,
    location: raw.location ?? raw.event_id?.location ?? raw.event?.location,
    eventDescription: raw.eventDescription ?? raw.event_id?.event_description ?? raw.event?.event_description,
    qrCode: raw.qrCode ?? raw.qr_code,
    raw,
  } as Ticket
}

export async function getTicketById(ticketId: string | number) {
  if (!ticketId) return null
  try {
    const res = await api.get(`/api/tickets/${ticketId}`)
    return res && (res as any).ticket ? mapServerTicket((res as any).ticket) : null
  } catch (e) {
    return null
  }
}

export async function getTicketsByEvent(eventId: string | number) {
  if (!eventId) return { tickets: [], count: 0 }
  try {
    const query = `?event_id=${encodeURIComponent(String(eventId))}`
    const res = await api.get(`/api/tickets${query}`)
    const raw = (res && (res as any).tickets) ? (res as any).tickets : (res && res.data && Array.isArray(res.data.tickets) ? res.data.tickets : [])
    const items = (raw || []).map(mapServerTicket)
    const count = (res && (res as any).data && typeof (res as any).data.count === 'number') ? (res as any).data.count : (res && typeof (res as any).count === 'number' ? (res as any).count : items.length)
    return { tickets: items, count }
  } catch (e) {
    return { tickets: [], count: 0 }
  }
}

export async function getCoordinatorEventTickets(eventId: string | number) {
  return getTicketsByEvent(eventId)
}

export async function updateTicket(id: string | number, payload: any) {
  const res = await api.put(`/api/tickets/${id}`, payload)
  return res
}

export async function cancelTicket(id: string | number) {
  const res = await api.patch(`/api/tickets/${id}/cancel`)
  return res && (res as any).ticket ? mapServerTicket((res as any).ticket) : res
}

export default { createTicket, getTicketsByUser, getAllTickets, updateTicket }

export async function downloadTicketPdf(ticketId: string | number) {
  if (!ticketId) throw new Error('Missing ticket id')
  const BASE = import.meta.env.VITE_API_URL || ''
  const url = `${BASE}/api/tickets/download/${ticketId}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err: any = new Error(text || 'Failed to download ticket')
    err.status = res.status
    throw err
  }
  const blob = await res.blob()
  return blob
}

// Admin-only: Get all tickets
export async function getAdminTickets(filters?: { event_id?: string; status?: string; payment_status?: string }) {
  try {
    const params = new URLSearchParams()
    if (filters?.event_id) params.append('event_id', filters.event_id)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.payment_status) params.append('payment_status', filters.payment_status)

    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await api.get(`/api/tickets/admin/all${query}`)

    if (res && Array.isArray((res as any).tickets)) {
      return {
        tickets: (res as any).tickets,
        count: (res as any).count || (res as any).tickets.length
      }
    }
    return { tickets: [], count: 0 }
  } catch (e) {
    console.error('Failed to fetch admin tickets:', e)
    throw e
  }
}

// Admin-only: Get ticket details by ID
export async function getAdminTicketById(ticketId: string | number) {
  if (!ticketId) return null
  try {
    const res = await api.get(`/api/tickets/admin/${ticketId}`)
    return res && (res as any).ticket ? (res as any).ticket : null
  } catch (e) {
    console.error('Failed to fetch admin ticket details:', e)
    throw e
  }
}

export async function bulkDownloadTickets(eventId: string | number) {
  if (!eventId) throw new Error('Missing event id')
  const BASE = import.meta.env.VITE_API_URL || ''
  const url = `${BASE}/api/tickets/bulk-download/${eventId}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err: any = new Error(text || 'Failed to bulk download tickets')
    err.status = res.status
    throw err
  }
  const blob = await res.blob()
  // Trigger download
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = `tickets-event-${eventId}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(downloadUrl)
  return blob
}

export async function getTicketByCode(code: string) {
  if (!code) return null
  try {
    const res = await getAllTicketsRaw()
    const rawTickets = (res && (res as any).tickets) ? (res as any).tickets : []
    const mapped = (rawTickets || []).map(mapServerTicket)
    const ticket = mapped.find((t: any) =>
      t.ticketCode === code ||
      (t.raw && (t.raw.ticket_code === code || t.raw.code === code))
    )
    return ticket || null
  } catch (e) {
    return null
  }
}
