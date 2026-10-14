import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import EventForm from '../components/EventForm'
import { createEvent } from '@/api/events.api'
import { showToast } from '../../../components/ui/Toast'

export default function CreateEventPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isCoordinatorPath = location.pathname.startsWith('/coordinator')
  const backPath = isCoordinatorPath ? '/coordinator/events' : '/admin/events'
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState({})

  async function handleCreate(vals) {
    if (submitting) return
    setSubmitting(true)
    try {
      console.log('CreateEventPage: submitting', vals)
      await createEvent(vals)
      navigate(backPath)
    } catch (e) {
      console.error('CreateEventPage: create failed', e)
      const msg = e?.message || (e && e.data && e.data.message) || 'Failed to create event'
      try { showToast({ title: 'Create failed', message: msg, type: 'error' }) } catch (err) {}
      console.error('CreateEvent failed', e)
      // derive field-level errors when server returns generic 'required' message
      const se = {}
      if (e && e.data && typeof e.data === 'object') {
        // If backend provided structured errors, copy them
        if (e.data.errors && typeof e.data.errors === 'object') {
          Object.assign(se, e.data.errors)
        }
      }
      if (Object.keys(se).length === 0 && /required/i.test(msg)) {
        // mark empty fields from vals as required
        const requiredFields = ['name', 'date', 'location', 'capacity']
        requiredFields.forEach(f => {
          if (!vals || vals[f] === undefined || vals[f] === '' || vals[f] === null) se[f] = 'This field is required'
        })
        // fallback: if none of the fields are empty, set a general form error
        if (Object.keys(se).length === 0) se._form = msg
      }
      setServerErrors(se)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className={submitting ? 'opacity-60 pointer-events-none' : ''} aria-busy={submitting}>
        <EventForm
          initialValues={{}}
          isEditMode={false}
          onCancel={() => navigate(backPath)}
          onSubmit={handleCreate}
          serverErrors={serverErrors}
        />
      </div>
    </div>
  )
}

