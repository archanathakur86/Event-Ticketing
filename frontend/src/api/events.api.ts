import { api } from './client'
import { Event } from './contracts'

export async function getAllEvents(): Promise<Event[]> {
  const res = await api.get('/api/events')
  const rawArr = Array.isArray(res) ? res : (res && Array.isArray((res as any).events)) ? (res as any).events : (res && Array.isArray((res as any).data)) ? (res as any).data : (res && Array.isArray((res as any).payload)) ? (res as any).payload : []
  return (rawArr || []).map(mapServerEvent)
}

// raw response (preserves server payload shape)
export async function getAllEventsRaw() {
  try {
    // First try authenticated request (include cookies) — needed for admin pages
    const resAuth = await api.get('/api/events')
    return resAuth
  } catch (errAuth: any) {
    // If auth fails, fall back to unauthenticated public fetch (omit credentials)
    if (errAuth && (errAuth.status === 401 || (errAuth.message && /unauth/i.test(errAuth.message)))) {
      try {
        const resPublic = await api.get('/api/events', { credentials: 'omit' })
        return resPublic
      } catch (errPub: any) {
        console.warn('getAllEventsRaw: unauthenticated and public fetch failed; err=', errPub)
        // Temporary client-side fallback: when server requires authentication for events
        // but the UI expects public events (e.g., homepage/browse), return a small
        // sample dataset so unauthenticated users see something. This is a UX fallback
        // and should be replaced by a proper server-side public endpoint.
        const sample = [
          {
            _id: 'sample-1',
            event_name: 'Sample Open Event',
            event_description: 'This is a placeholder event visible to unauthenticated users.',
            event_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
            location: 'Campus Hall',
            capacity: 100,
            price: 0,
          },
        ]
        return sample
      }
    }
    throw errAuth
  }
}

export async function getAdminEventsRaw() {
  const res = await api.get('/api/events/admin/all')
  return res
}

export function mapServerEvent(raw: any): Event {
  if (!raw) return {} as Event
  const ev: any = {
    id: raw.id ?? raw._id ?? raw.event_id,
    // handle backend fields `event_name` and `event_date`
    name: raw.name ?? raw.title ?? raw.event_name ?? raw.event_name,
    title: raw.title ?? raw.name ?? raw.event_name ?? raw.event_name,
    date: raw.date ?? raw.event_date ?? raw.event_date,
    location: raw.location ?? raw.venue,
    description: raw.description ?? raw.event_description ?? raw.event_description ?? '',
    price: raw.price ?? raw.event_price ?? raw.cost ?? 0,
    availableSeats: raw.availableSeats ?? raw.available_seats ?? raw.capacity ?? undefined,
    capacity: raw.capacity ?? raw.available_seats ?? undefined,
    createdBy: raw.createdBy ?? raw.created_by?.fullName ?? raw.created_by_name ?? raw.created_by?.email ?? raw.creator?.fullName ?? raw.creator?.email ?? '-',
    createdById: raw.createdById ?? raw.created_by?._id ?? raw.created_by ?? raw.creator?._id,
    coordinatorId: raw.coordinator_id?._id ?? raw.coordinator_id ?? raw.coordinatorId,
    coordinator: raw.coordinator_id && typeof raw.coordinator_id === 'object' ? raw.coordinator_id : undefined,
    // derive status: backend doesn't have `status` field; infer from name/description when cancelled
    status: (raw.status ?? raw.state) ?? ((String(raw.event_name || raw.name || raw.event_description || '')).toLowerCase().includes('cancel') ? 'Cancelled' : undefined),
    raw,
  }
  return ev as Event
}

export async function getEventById(id: string | number) {
  try {
    const res = await api.get(`/api/events/${id}`, { timeoutMs: 25000 })
    const raw = (res && (res as any).event) ? (res as any).event : (res && (res as any).data && (res as any).data.event) ? (res as any).data.event : res
    return mapServerEvent(raw)
  } catch (err) {
    const raw = await getAllEventsRaw()
    const arr = Array.isArray(raw)
      ? raw
      : (raw && Array.isArray((raw as any).events))
        ? (raw as any).events
        : []
    const match = (arr || []).find((item: any) => String(item?.id ?? item?._id ?? item?.event_id) === String(id))
    if (match) return mapServerEvent(match)
    throw err
  }
}

export async function createEvent(payload: any) {
  // map frontend form shape to backend expected shape
  const serverPayload = {
    event_name: payload.name ?? payload.event_name,
    event_description: payload.description ?? payload.event_description,
    event_date: payload.date ?? payload.event_date,
    location: payload.location,
    capacity: payload.capacity !== undefined ? Number(payload.capacity) : payload.capacity,
    price: payload.price !== undefined ? Number(payload.price) : 0,
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    ...(payload.coordinator_id !== undefined && payload.coordinator_id !== '' ? { coordinator_id: payload.coordinator_id } : {}),
  }
  const res = await api.post('/api/events', serverPayload)
  return res
}

export async function updateEvent(id: string | number, payload: any) {
  const serverPayload = {
    event_name: payload.name ?? payload.event_name,
    event_description: payload.description ?? payload.event_description,
    event_date: payload.date ?? payload.event_date,
    location: payload.location,
    capacity: payload.capacity !== undefined ? Number(payload.capacity) : payload.capacity,
    price: payload.price !== undefined ? Number(payload.price) : undefined,
    // include status when provided (used for canceling an event)
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.coordinator_id !== undefined ? { coordinator_id: payload.coordinator_id } : {}),
  }
  const res = await api.put(`/api/events/${id}`, serverPayload)
  return res
}

export async function deleteEvent(id: string | number) {
  await api.del(`/api/events/${id}`)
  return true
}

export default { getAllEvents, getAllEventsRaw, getAdminEventsRaw, getEventById, createEvent, updateEvent, deleteEvent }
