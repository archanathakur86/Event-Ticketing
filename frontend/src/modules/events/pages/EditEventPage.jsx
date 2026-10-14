import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EventForm from '../components/EventForm'
import { getEventById, updateEvent } from '@/api/events.api'
import { showToast } from '../../../components/ui/Toast'

export default function EditEventPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isCoordinatorPath = window.location.pathname.startsWith('/coordinator')
  const backPath = isCoordinatorPath ? '/coordinator/events' : '/admin/events'
  const [initial, setInitial] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        console.debug('EditEventPage: loading event id=', id)
        const ev = await getEventById(id)
        console.debug('EditEventPage: loaded event', ev)
        if (!mounted) return
        setInitial(ev)
      } catch (e) {
        console.error('EditEventPage: failed to load event', id, e)
        if (!mounted) return
        setInitial(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  async function handleUpdate(vals) {
    try {
      const updated = await updateEvent(id, vals)
      showToast({ title: 'Updated', message: 'Event updated successfully', type: 'success' })
      navigate(backPath)
      return updated
    } catch (e) {
      showToast({ title: 'Error', message: e?.message || 'Failed to update event', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500">Loading event...</div>
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500">Event not found.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Event</h1>
        <p className="text-sm text-gray-500">Update event details below</p>
      </header>

      <EventForm initialValues={initial} isEditMode={true} onCancel={() => navigate(backPath)} onSubmit={handleUpdate} />
    </div>
  )
}
