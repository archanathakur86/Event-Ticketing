import { api } from './api'

export function mapServerEvent(ev) {
  if (!ev) return null
  return {
    id: ev._id || ev.id,
    name: ev.event_name || ev.name || ev.title,
    title: ev.event_name || ev.title || ev.name,
    date: ev.event_date || ev.date,
    description: ev.event_description || ev.description || ev.desc,
    location: ev.location || ev.venue,
    venue: ev.location || ev.venue,
    capacity: ev.capacity,
    price: ev.price,
    createdAt: ev.created_at || ev.createdAt || ev.createdAt,
    raw: ev,
  }
}

export async function getAllEvents() {
  try {
    const res = await api.get('/api/events')

    let rawEvents = []

    if (res?.events && Array.isArray(res.events)) {
      // Format: { events: [...], count: n }
      rawEvents = res.events
    } else if (res?.data?.events && Array.isArray(res.data.events)) {
      // Format: { data: { events: [...], count: n } }
      rawEvents = res.data.events
    } else if (Array.isArray(res)) {
      // Format: direct array
      rawEvents = res
    } else if (Array.isArray(res?.data)) {
      // Format: { data: [...] }
      rawEvents = res.data
    }
    const items = rawEvents.map(mapServerEvent).filter(Boolean)
    return items
  } catch (err) {
    if (err && err.status === 404) return []
    throw err
  }
}

export async function getAllEventsRaw() {
  try {
    const res = await api.get('/api/events')

    let rawEvents = []
    let count = 0
    
    if (res?.events && Array.isArray(res.events)) {
      rawEvents = res.events
      count = res.count || rawEvents.length
    } else if (res?.data?.events && Array.isArray(res.data.events)) {
      rawEvents = res.data.events
      count = res.data.count || rawEvents.length
    } else if (Array.isArray(res)) {
      rawEvents = res
      count = res.length
    } else if (Array.isArray(res?.data)) {
      rawEvents = res.data
      count = res.data.length
    }

    return { events: rawEvents, count }
  } catch (err) {
    if (err && err.status === 404) return { events: [], count: 0 }
    throw err
  }
}

export async function getEventById(id) {
  try {
    const res = await api.get(`/api/events/${id}`)
    return mapServerEvent(res && res.event)
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
}

export async function createEvent(data) {
  try {
    const payload = {
      event_name: data.name || data.title,
      event_description: data.description || data.body || data.desc,
      event_date: data.date,
      location: data.location || data.venue,
      capacity: data.capacity,
      price: data.price,
    }
    const res = await api.post('/api/events', payload)
    const ev = mapServerEvent(res && res.event)
    window.dispatchEvent(new CustomEvent('events:changed'))
    return ev
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
}

export async function updateEvent(id, data) {
  try {
    const payload = {
      event_name: data.name || data.title,
      event_description: data.description || data.body || data.desc,
      event_date: data.date,
      location: data.location || data.venue,
      capacity: data.capacity,
      price: data.price,
    }
    const res = await api.put(`/api/events/${id}`, payload)
    const ev = mapServerEvent(res && res.event)
    window.dispatchEvent(new CustomEvent('events:changed'))
    return ev
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
}

export async function deleteEvent(id) {
  try {
    await api.del(`/api/events/${id}`)
    window.dispatchEvent(new CustomEvent('events:changed'))
    return true
  } catch (err) {
    if (err && err.status === 404) return false
    throw err
  }
}

export async function seedEvents(events = []) {
  try {
    // no backend seed endpoint
    return false
  } catch (e) {
    return false
  }
}

export default {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  seedEvents,
}
