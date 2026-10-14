import React, { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { getAllEvents } from '@/api/events.api'
import { getAllUsers } from '@/api/users.api'
import { getAllTickets } from '@/api/tickets.api'
import ChartContainer from '../components/ChartContainer'

function monthKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [year, month] = String(key || '').split('-')
  if (!year || !month) return 'N/A'
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function buildMonthlySeries(items, getDateValue) {
  const bucket = new Map()
  for (const item of items || []) {
    const key = monthKey(getDateValue(item))
    if (!key) continue
    bucket.set(key, (bucket.get(key) || 0) + 1)
  }

  return [...bucket.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({
      key,
      month: monthLabel(key),
      value,
    }))
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
}

export default function AdministrationReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])
  const [tickets, setTickets] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)

  async function loadReports(isSilent = false) {
    if (!isSilent) setLoading(true)
    setError('')
    try {
      const [eventsData, usersData, ticketsData] = await Promise.all([
        getAllEvents(),
        getAllUsers(),
        getAllTickets(),
      ])

      setEvents(Array.isArray(eventsData) ? eventsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setTickets(Array.isArray(ticketsData) ? ticketsData : [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err?.message || 'Failed to load reports')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function refresh(isSilent = false) {
      if (!mounted) return
      await loadReports(isSilent)
    }

    refresh()

    const intervalId = window.setInterval(() => {
      refresh(true)
    }, 15000)

    function onChange() {
      refresh(true)
    }

    window.addEventListener('events:changed', onChange)
    window.addEventListener('tickets:changed', onChange)
    window.addEventListener('users:changed', onChange)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
      window.removeEventListener('events:changed', onChange)
      window.removeEventListener('tickets:changed', onChange)
      window.removeEventListener('users:changed', onChange)
    }
  }, [])

  const eventsPerMonth = useMemo(
    () => buildMonthlySeries(events, (event) => event.date || event.createdAt),
    [events],
  )

  const userMix = useMemo(() => {
    const students = users.filter((user) => normalizeRole(user.role) === 'student').length
    const coordinators = users.filter((user) => normalizeRole(user.role) === 'coordinator').length
    const admins = users.filter((user) => ['admin', 'administration', 'administrator', 'superadmin'].includes(normalizeRole(user.role))).length
    const inactive = users.filter((user) => String(user.status || '').toLowerCase() !== 'active').length
    return { students, coordinators, admins, inactive }
  }, [users])

  const reportSummary = useMemo(() => {
    const totalEvents = events.length
    const totalUsers = users.length
    const recentEvents = [...events]
      .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
      .slice(0, 4)

    const recentlyJoinedUsers = [...users]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)

    const upcomingCount = events.filter((event) => {
      const when = new Date(event.date || event.createdAt || 0).getTime()
      return !Number.isNaN(when) && when >= Date.now()
    }).length

    return { totalEvents, totalUsers, recentEvents, recentlyJoinedUsers, upcomingCount }
  }, [events, users])

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 px-5 py-5 lg:px-6">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#102c74_0%,#1743a6_62%,#2457cb_100%)] px-5 py-5 shadow-sm">
            <span className="inline-flex rounded-full border border-white/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#123386] shadow-sm">
              Administrator Reports
            </span>
            <div className="mt-4 max-w-4xl rounded-2xl border border-white/45 bg-white px-5 py-5 shadow-lg">
              <h1 className="text-[1.85rem] font-semibold leading-tight text-slate-950">
                Platform reporting with a cleaner operations view.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This page focuses on publishing activity, access health, and recent platform movement for administrators.
              </p>
            </div>
            <p className="mt-3 text-xs text-white/88">
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : 'Loading latest analytics...'}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 shadow-sm">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Users</div>
                <div className="text-3xl font-semibold leading-none text-slate-900">{loading ? '—' : reportSummary.totalUsers}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 shadow-sm">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Upcoming Events</div>
                <div className="text-3xl font-semibold leading-none text-slate-900">{loading ? '—' : reportSummary.upcomingCount}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Events', value: reportSummary.totalEvents, tone: 'text-[#123386]' },
          { label: 'Inactive Users', value: userMix.inactive, tone: 'text-amber-600' },
          { label: 'Coordinators', value: userMix.coordinators, tone: 'text-emerald-600' },
          { label: 'Students', value: userMix.students, tone: 'text-slate-900' },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
            <div className={`mt-2 text-2xl font-semibold leading-none ${item.tone}`}>{loading ? '—' : item.value}</div>
          </article>
        ))}
      </section>

      <div className="grid gap-6">
        <ChartContainer title="Events Per Month" subtitle="Monthly event publishing trend" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eventsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#123386" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Recently Added Events</h2>
              <p className="text-sm text-slate-500">Useful for tracking current publishing activity on the platform.</p>
            </div>
            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading events...</div>
              ) : reportSummary.recentEvents.length === 0 ? (
                <div className="text-sm text-slate-500">No events available.</div>
              ) : (
                reportSummary.recentEvents.map((event) => (
                  <div key={String(event.id)} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="font-medium text-slate-900">{event.name || event.title || 'Untitled event'}</div>
                    <div className="mt-1 text-sm text-slate-500">{event.location || 'TBA'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Recently Joined Users</h2>
              <p className="text-sm text-slate-500">A quick list of new users helps track access growth and onboarding.</p>
            </div>
            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading users...</div>
              ) : reportSummary.recentlyJoinedUsers.length === 0 ? (
                <div className="text-sm text-slate-500">No users available.</div>
              ) : (
                reportSummary.recentlyJoinedUsers.map((user) => (
                  <div key={String(user.id || user._id)} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900">{user.name || user.fullName || 'Unnamed User'}</div>
                      <div className="mt-1 text-sm text-slate-500">{user.email || 'N/A'}</div>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                      {normalizeRole(user.role) === 'administrator'
                        ? 'Administrator'
                        : normalizeRole(user.role) === 'coordinator'
                          ? 'Coordinator'
                          : normalizeRole(user.role) === 'student'
                            ? 'Student'
                            : 'Admin'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Operations Notes</h2>
              <p className="text-sm text-slate-500">Useful context to read the charts quickly.</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publishing</div>
                <div className="mt-2 text-sm text-slate-700">
                  {loading ? 'Loading...' : `${reportSummary.totalEvents} total events are currently visible on the platform.`}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Access Health</div>
                <div className="mt-2 text-sm text-slate-700">
                  {loading ? 'Loading...' : `${userMix.inactive} user account(s) are currently inactive.`}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coordination</div>
                <div className="mt-2 text-sm text-slate-700">
                  {loading ? 'Loading...' : `${userMix.coordinators} coordinator account(s) are available for event operations.`}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Students</div>
                <div className="mt-2 text-sm text-slate-700">
                  {loading ? 'Loading...' : `${userMix.students} student account(s) are part of the current platform base.`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
