import React, { useEffect, useMemo, useState } from 'react'
import { getNotifications, markAllAsRead } from '@/api/notifications.api'

function categorize(n) {
  const t = (n.subject || '').toLowerCase()
  const b = (n.message_body || '').toLowerCase()
  if (t.includes('reminder') || b.includes('reminder')) return 'reminder'
  if (t.includes('payment') || b.includes('payment') || t.includes('paid') || b.includes('paid')) return 'payment'
  if (t.includes('update') || b.includes('update')) return 'update'
  if (t.includes('cancel') || b.includes('cancel') || t.includes('cancelled') || b.includes('cancelled')) return 'cancel'
  return 'other'
}

export default function StudentNotifications() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const n = await getNotifications()
        if (!mounted) return
        setNotes(n || [])
        
        // Mark all as read when opening the page
        await markAllAsRead()
        
        // Wait a bit for backend to update, then trigger count refresh
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('notifications:changed'))
        }, 300)
      } catch (err) {
        console.error('Failed to load notifications:', err)
        if (mounted) setNotes([])
      }
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    async function refresh() {
      const n = await getNotifications()
      setNotes(n || [])
    }
    window.addEventListener('notifications:changed', refresh)
    return () => window.removeEventListener('notifications:changed', refresh)
  }, [])

  const categorized = useMemo(() => (notes || []).map(n => ({ ...n, category: categorize(n) })), [notes])
  const visible = useMemo(() => {
    if (!filter || filter === 'all') return categorized
    return categorized.filter(n => n.category === filter)
  }, [categorized, filter])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-3 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Notifications</h2>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border rounded">
          <option value="all">All</option>
          <option value="reminder">Event Reminders</option>
          <option value="payment">Payment Success</option>
          <option value="update">Event Updates</option>
          <option value="cancel">Cancel Announcements</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        {visible.map(n => {
          const when = n.createdAt || n.sentAt || n.date
          return (
            <div key={n._id || n.id} className={`p-3 rounded ${n.isRead ? 'bg-white' : 'bg-indigo-50'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{n.subject}</div>
                  </div>
                  {n.eventName ? (
                    <div className="mt-1 text-sm font-medium text-blue-700">
                      Event: {n.eventName}
                    </div>
                  ) : null}
                  <div className="text-sm text-gray-500 mt-1">{n.message_body}</div>
                  <div className="text-xs text-gray-400 mt-1">{when ? new Date(when).toLocaleString() : ''}</div>
                </div>
              </div>
            </div>
          )
        })}
        {!visible.length && <div className="text-gray-500">No notifications for this category.</div>}
      </div>
    </div>
  )
}
