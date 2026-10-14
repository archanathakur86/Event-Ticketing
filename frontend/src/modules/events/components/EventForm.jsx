import React, { useState, useEffect } from 'react'
import { showToast } from '../../../components/ui/Toast'
import useUIStore from '../../../store/uiStore'
import { getAllUsers } from '@/api/users.api'

function toDateInputValue(value) {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (err) {
    return ''
  }
}

export default function EventForm({ initialValues = {}, isEditMode = false, onCancel = () => {}, onSubmit = () => {}, serverErrors = null }) {
  const setLoading = useUIStore(state => state.setLoading)
  const isCoordinatorPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/coordinator')
  const [form, setForm] = useState({
    name: initialValues.name || '',
    description: initialValues.description || '',
    date: toDateInputValue(initialValues.date),
    location: initialValues.location || '',
    capacity: initialValues.capacity || '',
    price: initialValues.price ?? '',
    status: initialValues.status || 'Draft',
    coordinator_id:
      initialValues.coordinatorId ||
      initialValues.coordinator?._id ||
      initialValues.coordinator?.id ||
      '',
  })
  const [coordinators, setCoordinators] = useState([])
  const [loadingCoordinators, setLoadingCoordinators] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  React.useEffect(() => {
    setForm({
      name: initialValues.name || '',
      description: initialValues.description || '',
      date: toDateInputValue(initialValues.date),
      location: initialValues.location || '',
      capacity: initialValues.capacity || '',
      price: initialValues.price ?? '',
      status: initialValues.status || 'Draft',
      coordinator_id:
        initialValues.coordinatorId ||
        initialValues.coordinator?._id ||
        initialValues.coordinator?.id ||
        '',
    })
  }, [initialValues])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
    // clear field-level server/client error when user edits
    setErrors((prev) => {
      if (!prev || !prev[name]) return prev
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
  }

  React.useEffect(() => {
    if (serverErrors && typeof serverErrors === 'object' && Object.keys(serverErrors).length > 0) {
      setErrors((prev) => ({ ...(prev || {}), ...(serverErrors || {}) }))
    }
  }, [serverErrors])

  useEffect(() => {
    let mounted = true
    async function loadCoordinators() {
      if (isCoordinatorPath) {
        setCoordinators([])
        setLoadingCoordinators(false)
        return
      }
      setLoadingCoordinators(true)
      try {
        const res = await getAllUsers()
        // res may be array or object with users array
        const users = Array.isArray(res) ? res : (res && res.users) ? res.users : (res && res.data && res.data.users) ? res.data.users : []
        if (!mounted) return
        const coords = (users || []).filter(u => String(u.role).toLowerCase() === 'coordinator')
        setCoordinators(coords)
      } catch (err) {
        console.warn('Failed to load coordinators', err)
      } finally {
        if (mounted) setLoadingCoordinators(false)
      }
    }
    loadCoordinators()
    return () => { mounted = false }
  }, [isCoordinatorPath])

  function handleSubmit(e) {
    e.preventDefault()
    // Client-side validation
    const errs = {}
    if (!form.name || String(form.name).trim() === '') errs.name = 'Event name is required'
    if (!form.date) errs.date = 'Event date is required'
    else if (new Date(form.date) < new Date(new Date().toDateString())) errs.date = 'Event date cannot be in the past'
    if (!form.location || String(form.location).trim() === '') errs.location = 'Location is required'
    if (form.capacity === '' || isNaN(Number(form.capacity)) || Number(form.capacity) < 0) errs.capacity = 'Capacity must be a valid non-negative number'
    if (form.price !== '' && (isNaN(Number(form.price)) || Number(form.price) < 0)) errs.price = 'Price must be zero or more'

    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      showToast({ title: 'Validation error', message: 'Please fix the highlighted fields', type: 'error' })
      return
    }

    // Prevent duplicate submissions
    if (submitting) return
    setSubmitting(true)
    setLoading(true)
    Promise.resolve()
      .then(() => onSubmit(form))
      .catch((err) => {
        console.error('EventForm submit failed', err)
        showToast({ title: 'Submit failed', message: err?.message || 'Failed to submit event', type: 'error' })
      })
      .finally(() => { setSubmitting(false); setLoading(false) })
  }

  const eventName = String(form.name || '').trim()
  const selectedCoordinator = coordinators.find(c => String(c._id || c.id) === String(form.coordinator_id || ''))
  const registrationFill = (() => {
    const fields = [form.name, form.date, form.location, form.capacity]
    const completed = fields.filter(value => String(value ?? '').trim() !== '').length
    return Math.round((completed / fields.length) * 100)
  })()

  function FieldError({ name }) {
    if (!errors[name]) return null
    return (
      <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
        <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
        </svg>
        {errors[name]}
      </div>
    )
  }

  function FieldLabel({ children, required = false, hint = '' }) {
    return (
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-800">
          {children}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Event Management</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                {isEditMode ? 'Edit Event' : 'Create Event'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add the core event details, assign a coordinator if needed, and review the summary before saving.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Mode</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{isEditMode ? 'Editing' : 'New Event'}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Progress</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{registrationFill}% complete</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Coordinator</div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-900">{selectedCoordinator?.fullName || selectedCoordinator?.fullname || 'Unassigned'}</div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Core Details</h2>
                <p className="mt-1 text-sm text-slate-500">Set the title, description, schedule and publishing state.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <FieldLabel required hint="Public name">Event Name</FieldLabel>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    type="text"
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10 ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    placeholder="Hackathon for 48hrs"
                  />
                  <FieldError name="name" />
                </div>

                <div>
                  <FieldLabel hint="What attendees should know">Description</FieldLabel>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="5"
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10"
                    placeholder="Give a concise overview, expected audience, and what makes this event worth attending."
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel required>Date</FieldLabel>
                    <input
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      type="date"
                      className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10 ${errors.date ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    />
                    <FieldError name="date" />
                  </div>

                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Upcoming">Upcoming</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Operations</h2>
                <p className="mt-1 text-sm text-slate-500">Define venue, seat limit, and event ownership.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <FieldLabel required hint="Venue or city">Location</FieldLabel>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    type="text"
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10 ${errors.location ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    placeholder="Main campus auditorium"
                  />
                  <FieldError name="location" />
                </div>

                <div>
                  <FieldLabel required hint="Maximum registrations">Capacity</FieldLabel>
                  <input
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10 ${errors.capacity ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    placeholder="250"
                  />
                  <FieldError name="capacity" />
                </div>

                <div>
                  <FieldLabel hint="Set 0 for free events">Ticket Price</FieldLabel>
                  <input
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10 ${errors.price ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    placeholder="200"
                  />
                  <FieldError name="price" />
                </div>

                <div>
                  <FieldLabel hint="Optional owner">Assign Coordinator</FieldLabel>
                  <select
                    name="coordinator_id"
                    value={form.coordinator_id || ''}
                    onChange={handleChange}
                    disabled={isCoordinatorPath}
                    className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-[#0f4c81] focus:bg-white focus:ring-4 focus:ring-[#0f4c81]/10 ${errors.coordinator_id ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  >
                    <option value="">{isCoordinatorPath ? '-- Coordinator locked --' : '-- No coordinator --'}</option>
                    {loadingCoordinators ? (
                      <option value="">Loading...</option>
                    ) : (
                      coordinators.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.fullName || c.fullname || c.email}
                        </option>
                      ))
                    )}
                  </select>
                  <FieldError name="coordinator_id" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Checklist</div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Checklist</div>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  {[
                    ['Name added', !!String(form.name || '').trim()],
                    ['Date selected', !!form.date],
                    ['Location added', !!String(form.location || '').trim()],
                    ['Capacity set', String(form.capacity || '').trim() !== ''],
                    ['Price set', String(form.price ?? '').trim() !== ''],
                  ].map(([label, done]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {done ? '✓' : '•'}
                      </span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Save Changes</h2>
                  <p className="mt-1 text-sm text-slate-500">Review the preview panel, then save the event configuration.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onCancel()}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#123386] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2b71] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isEditMode ? 'Saving...' : 'Creating...'}
                      </>
                    ) : (
                      <>{isEditMode ? 'Update Event' : 'Create Event'}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  )
}
