import { api } from './client'

function mapNotification(raw: any) {
  if (!raw) return raw
  return {
    ...raw,
    id: raw.id ?? raw._id,
    read: typeof raw.read !== 'undefined' ? raw.read : Boolean(raw.isRead),
    subject: raw.subject ?? raw.title ?? '',
    message_body: raw.message_body ?? raw.body ?? '',
    senderName: raw.senderName ?? raw.sent_by?.fullName ?? raw.sent_by?.email ?? '',
    senderRole: raw.senderRole ?? raw.sent_by?.role ?? '',
    eventName: raw.eventName ?? raw.event_id?.event_name ?? '',
  }
}

export async function getNotifications() {
  // Backend endpoint returns notifications based on authenticated user (via token)
  const res = await api.get('/api/notifications')
  const list = Array.isArray(res) ? res : (res && (res as any).notifications) ? (res as any).notifications : []
  return (list || []).map(mapNotification)
}

export async function getUnreadCount() {
  const res = await api.get('/api/notifications')
  return (res && (res as any).unreadCount) ? (res as any).unreadCount : 0
}

export async function addNotification(n: any) {
  const res = await api.post('/api/notifications', n)
  return res
}

export async function sendNotification(payload: any) {
  const res = await api.post('/api/notifications/send', payload)
  return res
}

export async function markAsRead(id: string | number) {
  await api.post(`/api/notifications/${id}/read`)
  return true
}

export async function markAllAsRead() {
  await api.post('/api/notifications/mark-all-read')
  return true
}

export default { getNotifications, getUnreadCount, addNotification, markAsRead, markAllAsRead }
