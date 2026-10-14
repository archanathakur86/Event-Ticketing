import React, { useState, useEffect } from 'react'
import { getNotifications, markAllAsRead, sendNotification } from '@/api/notifications.api'
import AppSelect from '@/components/ui/AppSelect'
import * as eventService from '@/api/events.api'
import useAuthStore from '@/store/authStore'
import { showToast } from '@/components/ui/Toast'

function categorize(n) {
  const t = (n.subject || '').toLowerCase()
  const b = (n.message_body || '').toLowerCase()
  if (t.includes('reminder') || b.includes('reminder')) return 'reminder'
  if (t.includes('payment') || b.includes('payment') || t.includes('paid') || b.includes('paid')) return 'payment'
  if (t.includes('update') || b.includes('update')) return 'update'
  if (t.includes('cancel') || b.includes('cancel') || t.includes('cancelled') || b.includes('cancelled')) return 'cancel'
  return 'other'
}

export default function CoordinatorNotifications() {
  const { user } = useAuthStore()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [events, setEvents] = useState([])
  const [sending, setSending] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    event: '',
    subject: '',
    message_body: '',
  })

  useEffect(() => {
    loadNotifications()
    loadEvents()
  }, [])

  async function loadNotifications() {
    try {
      setLoading(true)
      const n = await getNotifications()
      setNotes(n || [])
      
      // Mark all as read when opening the page
      await markAllAsRead()
      
      // Wait a bit for backend to update, then trigger count refresh
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('notifications:changed'))
      }, 300)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadEvents() {
    try {
      const allEvents = await eventService.getAllEvents()
      const myIds = [user?.id, user?._id, user?.userId].filter(Boolean).map(String)
      const myEmail = String(user?.email || '').toLowerCase()
      const assigned = (allEvents || []).filter((ev) => {
        const coordinatorId = ev.coordinatorId || ev.coordinator?._id || ev.coordinator_id
        const coordinatorEmail = String(ev.coordinator?.email || ev.coordinator_email || ev.coordinatorEmail || '').toLowerCase()
        return (coordinatorId && myIds.includes(String(coordinatorId))) || (myEmail && coordinatorEmail === myEmail)
      })
      setEvents(assigned)
    } catch (err) {
      console.error('Failed to load coordinator events:', err)
      setEvents([])
    }
  }

  function resetForm() {
    setForm({
      event: '',
      subject: '',
      message_body: '',
    })
  }

  async function handleSend() {
    if (!form.event || !form.subject.trim() || !form.message_body.trim()) {
      showToast({
        title: 'Missing details',
        message: 'Event, subject, and message are required',
        type: 'error',
      })
      return
    }

    try {
      setSending(true)
      await sendNotification({
        eventId: form.event,
        subject: form.subject.trim(),
        message: form.message_body.trim(),
      })
      showToast({
        title: 'Notification sent',
        message: 'Students for this event have been notified',
        type: 'success',
      })
      setIsModalOpen(false)
      resetForm()
      await loadNotifications()
      window.dispatchEvent(new CustomEvent('notifications:changed'))
    } catch (err) {
      console.error('Failed to send coordinator notification:', err)
      showToast({
        title: 'Send failed',
        message: err?.message || 'Failed to send notification',
        type: 'error',
      })
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    async function refresh() {
      const n = await getNotifications()
      setNotes(n || [])
    }
    window.addEventListener('notifications:changed', refresh)
    return () => window.removeEventListener('notifications:changed', refresh)
  }, [])

  const categorized = notes.map(n => ({ ...n, category: categorize(n) }))
  const visible = filter === 'all' ? categorized : categorized.filter(n => n.category === filter)

  if (loading) return <div className="p-6">Loading notifications...</div>

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Compose Notification
        </button>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => {
            setIsModalOpen(false)
            resetForm()
          }}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">Compose Notification</h3>
              <p className="mt-2 text-sm text-gray-500">
                Send an update to students registered for one of your assigned events.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Event</label>
                <select
                  value={form.event}
                  onChange={(e) => setForm((s) => ({ ...s, event: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                >
                  <option value="">Select event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title || event.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                  placeholder="Notification subject"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Message</label>
                <textarea
                  rows={6}
                  value={form.message_body}
                  onChange={(e) => setForm((s) => ({ ...s, message_body: e.target.value }))}
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                  placeholder="Write your message here"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <AppSelect
          value={filter}
          onChange={setFilter}
          className="w-full sm:w-64"
          options={[
            { value: 'all', label: 'All' },
            { value: 'reminder', label: 'Event Reminders' },
            { value: 'payment', label: 'Payment Notifications' },
            { value: 'update', label: 'Event Updates' },
            { value: 'cancel', label: 'Cancellations' },
            { value: 'other', label: 'Other' },
          ]}
        />
        
        <div className="sm:ml-auto text-sm text-gray-500">
          {visible.length} notification{visible.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {visible.map(n => {
          const when = n.createdAt || n.sentAt || n.date
          return (
            <div key={n._id || n.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-semibold text-gray-900">{n.subject}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      n.category === 'reminder' ? 'bg-blue-50 text-blue-700' :
                      n.category === 'payment' ? 'bg-green-50 text-green-700' :
                      n.category === 'update' ? 'bg-yellow-50 text-yellow-700' :
                      n.category === 'cancel' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {n.category}
                    </span>
                  </div>
                  {n.eventName ? (
                    <div className="mb-2 text-sm font-medium text-blue-700">
                      Event: {n.eventName}
                    </div>
                  ) : null}
                  <div className="text-sm text-gray-600 mb-2">{n.message_body}</div>
                  <div className="text-xs text-gray-400">
                    {when ? new Date(when).toLocaleString() : 'Recently'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        
        {visible.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p>No notifications in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
