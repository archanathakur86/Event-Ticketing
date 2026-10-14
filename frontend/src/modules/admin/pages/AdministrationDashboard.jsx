import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/api/auth.api'
import { getAllEvents } from '@/api/events.api'
import { getAllTickets } from '@/api/tickets.api'
import { getAllUsers } from '@/api/users.api'
import useAuthStore from '@/store/authStore'

function normalizeRole(role) {
  return String(role || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
}

function formatDate(value) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdministrationDashboard() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [events, setEvents] = useState([])
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])

  async function handleLogout() {
    try {
      await logout()
    } catch (e) {}
    if (setUser) setUser(null)
    navigate('/')
  }

  async function loadDashboard(isSilent = false) {
    if (!isSilent) setLoading(true)
    setError('')
    try {
      const [eventsData, ticketsData, usersData] = await Promise.all([
        getAllEvents(),
        getAllTickets(),
        getAllUsers(),
      ])

      setEvents(Array.isArray(eventsData) ? eventsData : [])
      setTickets(Array.isArray(ticketsData) ? ticketsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (err) {
      setError(err?.message || 'Failed to load administrator overview')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function refresh(isSilent = false) {
      if (!mounted) return
      await loadDashboard(isSilent)
    }

    refresh()

    const intervalId = window.setInterval(() => {
      refresh(true)
    }, 15000)

    function onChange() {
      refresh(true)
    }

    window.addEventListener('users:changed', onChange)
    window.addEventListener('events:changed', onChange)
    window.addEventListener('tickets:changed', onChange)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
      window.removeEventListener('users:changed', onChange)
      window.removeEventListener('events:changed', onChange)
      window.removeEventListener('tickets:changed', onChange)
    }
  }, [])

  const metrics = useMemo(() => {
    const activeUsers = users.filter((user) => String(user.status || '').toLowerCase() === 'active').length
    const students = users.filter((user) => normalizeRole(user.role) === 'student').length
    const coordinators = users.filter((user) => normalizeRole(user.role) === 'coordinator').length
    const admins = users.filter((user) => ['admin', 'administrator', 'administration', 'superadmin'].includes(normalizeRole(user.role))).length
    const pendingTickets = tickets.filter((ticket) => String(ticket.paymentStatus || ticket.payment_status || '').toLowerCase() === 'pending').length
    return { activeUsers, students, coordinators, admins, pendingTickets }
  }, [tickets, users])

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
  }, [users])

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => event?.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }, [events])

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#0f2d75_0%,#1844aa_58%,#f4f7ff_58%,#ffffff_100%)] shadow-sm">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.4fr_0.9fr] lg:px-8">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/90">
              Administrator Dashboard
            </span>
            <div className="space-y-2">
              <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-4 backdrop-blur-sm">
                <h1 className="text-3xl font-semibold leading-tight text-white">
                  Platform control for users, access, and system visibility
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/85">
                  This is the dedicated administrator dashboard.
                </p>
              </div>
              <p className="max-w-2xl text-sm text-white/78">
                This dashboard is separate from the admin portal. Use it to monitor platform users, review system-wide activity,
                and jump directly into user management.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/administrator/users')}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#123386] shadow-sm transition hover:bg-slate-100"
              >
                Open Manage Users
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Users</div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">{loading ? '—' : users.length}</div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Active Users', value: metrics.activeUsers, tone: 'text-emerald-600' },
          { label: 'Students', value: metrics.students, tone: 'text-slate-900' },
          { label: 'Coordinators', value: metrics.coordinators, tone: 'text-indigo-600' },
          { label: 'Admins & Administrators', value: metrics.admins, tone: 'text-amber-600' },
          { label: 'Pending Payments', value: metrics.pendingTickets, tone: 'text-rose-600' },
        ].map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</div>
            <div className={`mt-3 text-3xl font-semibold ${metric.tone}`}>{loading ? '—' : metric.value}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recently Added Users</h2>
              <p className="text-sm text-slate-500">Latest user accounts across the platform.</p>
            </div>
            <button
              onClick={() => navigate('/administrator/users')}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Manage Users
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500">Loading users...</td>
                  </tr>
                ) : recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500">No users available.</td>
                  </tr>
                ) : (
                  recentUsers.map((user) => (
                    <tr key={String(user.id || user._id)} className="align-top">
                      <td className="px-6 py-4 font-medium text-slate-900">{user.name || user.fullName || 'Unnamed User'}</td>
                      <td className="px-6 py-4 text-slate-600">{user.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600">{String(user.role || '').replace(/\b\w/g, (char) => char.toUpperCase())}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            String(user.status || '').toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {String(user.status || '').toLowerCase() === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
                <p className="text-sm text-slate-500">Next scheduled events visible to the system.</p>
              </div>
              <div className="text-sm font-medium text-slate-500">{loading ? '—' : events.length} total</div>
            </div>
            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading events...</div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-sm text-slate-500">No upcoming events available.</div>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={String(event.id)} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="font-medium text-slate-900">{event.name || event.title || 'Untitled event'}</div>
                    <div className="mt-1 text-sm text-slate-500">{formatDate(event.date)} · {event.location || 'TBA'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="flex justify-end">
        <button
          onClick={handleLogout}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Logout
        </button>
      </section>
    </div>
  )
}
