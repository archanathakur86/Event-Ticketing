import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/api/auth.api'
import { useAuth } from '../../../core/hooks/useAuth'
import { showToast } from '../../../components/ui/Toast'
import Button from '../../../core/ui/Button'
import * as eventService from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import * as userService from '@/api/users.api'
import * as logService from '@/api/logs.api'
import MonthlyRegistrationsChart from '../components/MonthlyRegistrationsChart'
import MonthlyRevenueChart from '../components/MonthlyRevenueChart'
import EventCapacityChart from '../components/EventCapacityChart'
import ChartContainer from '../components/ChartContainer'
import * as paymentService from '@/api/payments.api'
import * as notificationService from '@/api/notifications.api'
import * as attendanceService from '@/api/attendance.api'


// removed mock recent data; dashboard will fetch live events/users/payments

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    totalUsers: 0,
    totalTickets: 0,
    totalRevenue: 0,
    attendanceRate: 0,
    activeUsersToday: 0,
  })
  const [alerts, setAlerts] = useState([])
  const [eventsList, setEventsList] = useState([])
  const [ticketsByEventState, setTicketsByEventState] = useState({})
  const [usersList, setUsersList] = useState([])
  const [error, setError] = useState(null)
  const [usersPending, setUsersPending] = useState(false)
  const [logsPending, setLogsPending] = useState(false)
  const [notificationsPending, setNotificationsPending] = useState(false)
  const [attendancePending, setAttendancePending] = useState(false)
  const [recentActivity, setRecentActivity] = useState([])
  const [recentLogins, setRecentLogins] = useState([])
  const [userLastLoginMap, setUserLastLoginMap] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [modalUser, setModalUser] = useState(null)
  const [modalLastLogin, setModalLastLogin] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [analyticsRange, setAnalyticsRange] = useState(6)
  async function handleLogout() {
    try {
      await logout()
    } catch (e) {}
    if (setUser) setUser(null)
    navigate('/')
  }

  useEffect(() => {
    // enforce admin-only access: redirect non-super-admins away
    const roleNorm = String(user?.role || '').toLowerCase().replace(/\s+/g, '')
    if (user && roleNorm !== 'superadmin') {
      navigate('/')
      return
    }
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // fetch core datasets first (events, tickets, payments)
        const [eventsResp, ticketsResp, paymentsResp] = await Promise.all([
          eventService.getAllEvents(),
          ticketService.getAllTickets(),
          paymentService.getAllPayments(),
        ])

        // helper to normalise API responses that may return { count, data } or plain arrays
        const parseList = (resp) => {
          if (!resp) return { list: [], count: 0 }
          if (Array.isArray(resp)) return { list: resp, count: resp.length }
          const list = resp.data || resp.items || resp.results || resp.rows || resp.list || []
          const count = resp.count ?? resp.total ?? resp.meta?.total ?? (Array.isArray(list) ? list.length : 0)
          if (Array.isArray(list) && list.length) return { list, count }
          return { list: Array.isArray(resp) ? resp : (Array.isArray(list) ? list : (typeof resp === 'object' ? [resp] : [])), count: count || (Array.isArray(resp) ? resp.length : 1) }
        }

        const { list: events, count: eventsCount } = parseList(eventsResp)
        const { list: tickets, count: ticketsCount } = parseList(ticketsResp)
        const { list: payments, count: paymentsCount } = parseList(paymentsResp)

        // try fetching users and logs separately; if backend doesn't provide them, mark as pending
        let users = []
        let logs = []
        try {
          users = await userService.getAllUsers()
          setUsersPending(false)
        } catch (ue) {
          if (ue && ue.featurePending) {
            setUsersPending(true)
            users = []
          } else {
            throw ue
          }
        }
        try {
          logs = await logService.getAllLogs()
          setLogsPending(false)
        } catch (le) {
          if (le && le.featurePending) {
            setLogsPending(true)
            logs = []
          } else {
            throw le
          }
        }

        // prefer server-provided counts when available
        const totalEvents = typeof eventsCount === 'number' ? eventsCount : (events || []).length
        const totalUsers = (users || []).length
        const totalTickets = typeof ticketsCount === 'number' ? ticketsCount : (tickets || []).length

        // payment_status may be 'completed' per API reference; accept common success values
        const totalRevenue = (payments || []).filter(p => {
          const st = String(p.payment_status || p.status || p.state || '').toLowerCase()
          return ['completed', 'success', 'paid'].includes(st)
        }).reduce((s, p) => s + (Number(p.amount || p.total || p.value) || 0), 0)

        const attended = (tickets || []).filter(t => String(t.status) === 'Used').length
        const attendanceRate = totalTickets > 0 ? Math.round((attended / totalTickets) * 100) : 0

        // active users today: unique userIds from logs with createdAt on same day
        const today = new Date()
        const isSameDay = (d) => {
          const x = new Date(d)
          return x.getFullYear() === today.getFullYear() && x.getMonth() === today.getMonth() && x.getDate() === today.getDate()
        }
        const usersToday = new Set()
        ;(logs || []).forEach(l => {
          if (l.userId && l.createdAt && isSameDay(l.createdAt)) usersToday.add(String(l.userId))
        })

        if (!mounted) return
        const alertList = []

        // pending payments
        const pendingPayments = (tickets || []).filter(t => String(t.paymentStatus) === 'Pending').length
        if (pendingPayments > 0) {
          alertList.push({ id: 'pending-payments', label: `${pendingPayments} pending`, message: `${pendingPayments} payments awaiting completion`, level: 'yellow' })
        }

        // suspended / inactive users (only if users endpoint available)
        if (!usersPending) {
          const suspendedUsers = (users || []).filter(u => {
            const s = String(u.status || '').toLowerCase()
            return s === 'suspended' || s === 'inactive'
          }).length
          if (suspendedUsers > 0) {
            alertList.push({ id: 'suspended-users', label: `${suspendedUsers} suspended`, message: `${suspendedUsers} suspended/inactive user account(s)`, level: 'red' })
          }
        }

        // events at full capacity and low registration
        const ticketsByEvent = (tickets || []).reduce((acc, t) => {
          const k = String(t.eventId)
          acc[k] = (acc[k] || 0) + 1
          return acc
        }, {})
        setEventsList(events || [])
        setTicketsByEventState(ticketsByEvent)
        setUsersList(users || [])

        setMetrics({ totalEvents, totalUsers, totalTickets, totalRevenue, attendanceRate, activeUsersToday: usersToday.size })
        setAlerts(alertList)
        const activity = (logs || []).filter(l => /user|payment|attendance|notification/i.test(String(l.type || '') + ' ' + String(l.message || '')))
          .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,10)
        setRecentActivity(activity)

        const loginCandidates = (logs || []).filter(l => /login|sign.?in|auth/i.test(String(l.type || '') + ' ' + String(l.message || '') + ' ' + JSON.stringify(l.meta || {})))
          .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,5)
        const usersById = (users || []).reduce((acc,u) => { acc[String(u.id)] = u; return acc }, {})

        // Build per-user latest login map so Recent Users can be sorted by most recent login first.
        const latestLogins = {}
        ;(logs || []).forEach((l) => {
          const uid = String(l.userId || l.user || l.meta?.userId || '')
          if (!uid) return
          const isLogin = /login|sign.?in|auth/i.test(String(l.type || '') + ' ' + String(l.message || '') + ' ' + JSON.stringify(l.meta || {}))
          if (!isLogin) return
          const tsRaw = l.meta?.loginTime || l.createdAt
          const ts = new Date(tsRaw).getTime()
          if (Number.isNaN(ts)) return
          if (!latestLogins[uid] || ts > latestLogins[uid]) latestLogins[uid] = ts
        })

        const enriched = loginCandidates.map(l => {
          const u = usersById[String(l.userId)]
          return {
            id: l.id,
            userId: l.userId,
            name: u?.name || u?.fullName || l.meta?.name || `User ${l.userId}`,
            role: u?.role || l.meta?.role || 'User',
            location: l.meta?.location || l.meta?.ip || '—',
            loginTime: l.meta?.loginTime || l.createdAt,
          }
        })
        setUserLastLoginMap(latestLogins)
        setRecentLogins(enriched)
      } catch (err) {
        console.error('Failed to load admin metrics', err)
        if (mounted) setError(err?.message || 'Failed to load overview data')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    function onChange() { load() }
    window.addEventListener('events:changed', onChange)
    window.addEventListener('tickets:changed', onChange)
    window.addEventListener('logs:changed', onChange)
    window.addEventListener('users:changed', onChange)
    return () => { mounted = false; window.removeEventListener('events:changed', onChange); window.removeEventListener('tickets:changed', onChange); window.removeEventListener('logs:changed', onChange); window.removeEventListener('users:changed', onChange) }
  }, [])

  async function openUserModal(u) {
    try {
      setModalUser(u)
      setModalOpen(true)
      setModalLoading(true)
      setModalLastLogin(null)
      if (logsPending) {
        setModalLastLogin('Feature pending: /api/logs')
      } else {
        const logs = await logService.getUserLogs(u.id)
        const login = (logs || []).find(l => /login|sign.?in|auth|logged/i.test(String(l.type || '') + ' ' + String(l.message || '') + ' ' + JSON.stringify(l.meta || {})))
        const time = login ? (login.meta?.loginTime || login.createdAt) : null
        setModalLastLogin(time)
      }
    } catch (e) {
      console.error('Failed to load user logs', e)
    } finally {
      setModalLoading(false)
    }
  }

  function closeUserModal() {
    setModalOpen(false)
    setModalUser(null)
    setModalLastLogin(null)
  }

  async function handleToggleUser(u) {
    try {
      const s = String(u.status || '').toLowerCase()
      const newStatus = s === 'active' ? 'Inactive' : 'Active'
      const updated = await userService.updateUser(u.id, { status: newStatus })
    
      setUsersList(prev => prev.map(x => (String(x.id) === String(u.id) ? updated : x)))
      window.dispatchEvent(new CustomEvent('users:changed'))
      showToast({ title: 'Updated', message: `${updated.name || 'User'} status set to ${updated.status}`, type: 'success' })
    } catch (err) {
      console.error('Failed to update user', err)
      showToast({ title: 'Error', message: 'Failed to update user', type: 'error' })
    }
  }
  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded">
          <strong className="font-medium">Error:</strong> {error}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Welcome back, {user?.name || 'Admin'}</h2>
        <p className="text-sm text-gray-500 mt-1">{logsPending ? 'Login activity feature pending on backend.' : ((recentLogins && recentLogins[0]) ? `Last login: ${new Date(recentLogins[0].loginTime).toLocaleString()}` : 'Have a productive day.')}</p>
      </div>
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-5">
          {/* Total Events */}
          <div className="rounded-lg p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition">
            <div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{loading ? '—' : metrics.totalEvents}</div>
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Total Events</div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600"><EventIcon /></div>
          </div>

          {/* Total Users */}
          <div className="rounded-lg p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{loading ? '—' : metrics.totalUsers}</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Total Users</div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-gradient-to-br from-green-50 to-green-100 text-green-600"><UsersIcon /></div>
          </div>

          {/* Total Tickets */}
          <div className="rounded-lg p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{loading ? '—' : metrics.totalTickets}</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Total Tickets</div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600"><TicketIcon /></div>
          </div>

          {/* Total Revenue */}
          <div className="rounded-lg p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{loading ? '—' : (metrics.totalRevenue != null ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(metrics.totalRevenue) : '—')}</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Total Revenue</div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700"><RevenueIcon /></div>
          </div>

          {/* Attendance Rate */}
          <div className="rounded-lg p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{loading ? '—' : `${metrics.attendanceRate}%`}</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Attendance Rate</div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600"><AttendanceIcon /></div>
          </div>

          {/* Active Users Today */}
          <div className="rounded-lg p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{loading ? '—' : metrics.activeUsersToday}</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Active Users Today</div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700"><ActiveUsersIcon /></div>
          </div>
        </div>
      </section>

      {/* Analytics Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Analytics Overview</h3>
          <div>
            <label htmlFor="analytics-range" className="sr-only">Analytics range</label>
            <select
              id="analytics-range"
              value={analyticsRange}
              onChange={(e) => setAnalyticsRange(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <MonthlyRegistrationsChart months={analyticsRange} />
          </div>
          <div className="bg-white rounded-lg p-4">
            <MonthlyRevenueChart months={analyticsRange} />
          </div>
        </div>

        <div className="mt-4">
          <EventCapacityChart months={analyticsRange} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Events</h3>
              <div className="text-sm text-gray-500">Showing 5</div>
            </div>
            <ul className="space-y-3 divide-y divide-gray-100">
              {loading && <li className="py-4 text-sm text-gray-500">Loading events…</li>}
              {!loading && (eventsList || []).length === 0 && <li className="py-4 text-sm text-gray-500">No events found.</li>}
              {!loading && (eventsList || []).length > 0 && (eventsList || []).slice().sort((a,b) => new Date(b.created_at || b.createdAt || b.date || b.createdAt) - new Date(a.created_at || a.createdAt || a.date || a.createdAt)).slice(0,5).map((ev) => {
                const registered = ticketsByEventState[String(ev.id)] || 0
                const capacity = Number(ev.capacity ?? ev.availableSeats ?? 0)
                const percent = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0
                const status = ev.status || (new Date(ev.date) < new Date() ? 'Past' : 'Upcoming')
                return (
                  <li key={ev.id} className="flex items-center justify-between py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-800 truncate">{ev.name || ev.title || 'Untitled Event'}</div>
                        <div className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString()}</div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div className="text-xs text-gray-500">{registered} registered</div>
                        <div className="text-xs text-gray-500">{capacity} capacity</div>
                        <div className="w-40 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div style={{ width: `${percent}%` }} className={`h-2 ${percent >= 70 ? 'bg-green-500' : percent >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center gap-3">
                      <button onClick={() => navigate(`/admin/events/${ev.id}`)} title="View" className="p-2 rounded hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                        </svg>
                      </button>
                      <button onClick={() => navigate(`/admin/events/${ev.id}/edit`)} title="Edit" className="p-2 rounded hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l7 7M16 3l5 5-9 9-5 1 1-5 9-9z" />
                        </svg>
                      </button>
                      <div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${status === 'Published' ? 'bg-green-50 text-green-700' : status === 'Draft' ? 'bg-gray-50 text-gray-700' : 'bg-red-50 text-red-700'}`}>{status}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>


                  <div className="bg-white border border-gray-100 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                      <div className="text-sm text-gray-500">Last 10</div>
                    </div>
                    <div className="flow-root">
                      {logsPending ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded text-yellow-800">Feature Pending Backend API: /api/logs</div>
                      ) : loading ? (
                        <div className="p-4 text-sm text-gray-500">Loading activity…</div>
                      ) : (recentActivity || []).length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No recent activity.</div>
                      ) : (
                        <ul className="-mb-8">
                          {(recentActivity || []).map((a, idx) => (
                            <li key={a.id} className="mb-8">
                            <div className="relative pb-8">
                              <span className="absolute left-0 top-0 -ml-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white" />
                              <div className="ml-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${activityBadgeClass(a.type)}`}>{String(a.type || '').replace(':',' ').toUpperCase()}</span>
                                    <div className="text-sm text-gray-800">{a.message || 'Activity'}</div>
                                  </div>
                                  <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</div>
                                </div>
                                {a.userId && (
                                  <div className="text-xs text-gray-500 mt-1">User: {a.userId}</div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                        </ul>
                      )}
                    </div>
                  </div>
          <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Users (latest login first)</h3>
              <div className="text-sm text-gray-500">Showing 5</div>
            </div>
            {usersPending ? (
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded text-yellow-800">Feature Pending Backend API: /api/users</div>
            ) : (
              <ul className="space-y-3 divide-y divide-gray-100">
                {(usersList || [])
                  .slice()
                  .sort((a, b) => {
                    const aId = String(a.id || a._id || '')
                    const bId = String(b.id || b._id || '')
                    const aLast = Number(userLastLoginMap[aId] || 0)
                    const bLast = Number(userLastLoginMap[bId] || 0)
                    if (bLast !== aLast) return bLast - aLast
                    return new Date(b.createdAt || b._createdAt || 0) - new Date(a.createdAt || a._createdAt || 0)
                  })
                  .slice(0,5)
                  .map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{u.name || u.fullName || u.email}</div>
                      <div className="text-xs text-gray-400">{u.email} · <span className="capitalize">{u.role || 'User'}</span></div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last login: {userLastLoginMap[String(u.id || u._id || '')] ? new Date(userLastLoginMap[String(u.id || u._id || '')]).toLocaleString() : 'Never'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button onClick={() => openUserModal(u)} title="View" className="p-2 rounded hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                        </svg>
                      </button>

                      <button onClick={() => handleToggleUser(u)} title={String(u.status || '').toLowerCase() === 'suspended' ? 'Enable user' : 'Suspend user'} className="px-2 py-1 text-sm rounded bg-gray-50 hover:bg-gray-100">
                        {String(u.status || '').toLowerCase() === 'suspended' ? 'Enable' : 'Suspend'}
                      </button>

                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusClass(u.status)}`}>
                        {u.status || 'Unknown'}
                      </span>
                    </div>
                  </li>
                ))}
                {(usersList || []).length === 0 && (
                  <li className="text-sm text-gray-500">No users found.</li>
                )}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <h4 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-md">
                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-blue-50 text-blue-600"><EventIcon /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">Create Event</div>
                  <div className="text-xs text-gray-500">Add a new event to the system</div>
                </div>
                <Button onClick={() => navigate('/admin/events/create')} className="ml-2">Create</Button>
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-md">
                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-green-50 text-green-600"><UsersIcon /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">Add User</div>
                  <div className="text-xs text-gray-500">Invite or create a new user account</div>
                </div>
                <Button onClick={() => navigate('/admin/users')} className="ml-2" disabled={usersPending}>{usersPending ? 'Pending' : 'Add'}</Button>
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-md">
                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-yellow-50 text-yellow-600"><NotificationIcon /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">Send Notification</div>
                  <div className="text-xs text-gray-500">Push announcements to users</div>
                </div>
                <Button onClick={() => navigate('/admin/notifications')} className="ml-2" disabled={notificationsPending}>{notificationsPending ? 'Pending' : 'Send'}</Button>
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-md">
                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-600"><UploadIcon /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">Upload ID Template</div>
                  <div className="text-xs text-gray-500">Upload badge or ID template for attendees</div>
                </div>
                <Button onClick={() => navigate('/admin/id-templates')} className="ml-2">Upload</Button>
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-md">
                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-purple-50 text-purple-600"><AttendanceIcon /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">View Attendance</div>
                  <div className="text-xs text-gray-500">Open attendance reports</div>
                </div>
                <Button onClick={() => navigate('/admin/attendance')} className="ml-2" disabled={attendancePending}>{attendancePending ? 'Pending' : 'View'}</Button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <h4 className="text-md font-medium text-gray-900 mb-2">Overview</h4>
              <h4 className="text-md font-medium text-gray-900 mb-2">System Alerts</h4>
              {alerts && alerts.length > 0 ? (
                <ul className="space-y-3">
                  {alerts.map(a => (
                    <li key={a.id} className="flex items-start gap-3">
                      <span className={`mt-1 inline-flex items-center px-2 py-0.5 text-xs rounded-full ${a.level === 'red' ? 'bg-red-50 text-red-700' : a.level === 'yellow' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>{a.label}</span>
                      <div className="text-sm text-gray-700">{a.message}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">OK</span>
                  <div className="text-sm text-gray-500">All systems operational</div>
                </div>
              )}
          </div>

            <div className="bg-white border border-gray-100 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-medium text-gray-900">Recent Login Activity</h4>
                <button onClick={() => navigate('/admin/logs')} className="text-sm text-blue-600 hover:underline">View All Logs</button>
              </div>
              <div className="space-y-3">
                {logsPending ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-100 rounded text-yellow-800">Feature Pending Backend API: /api/logs</div>
                ) : (
                  <>
                    {(recentLogins || []).map((l) => (
                      <div key={l.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{l.name}</div>
                          <div className="text-xs text-gray-500">{l.role} · {l.location}</div>
                        </div>
                        <div className="text-xs text-gray-400">{new Date(l.loginTime).toLocaleString()}</div>
                      </div>
                    ))}
                    {(recentLogins || []).length === 0 && (
                      <div className="text-sm text-gray-500">No recent logins.</div>
                    )}
                  </>
                )}
              </div>
            </div>
        </aside>
      </section>
      {modalOpen && <ProfileModal user={modalUser} lastLogin={modalLastLogin} loading={modalLoading} onClose={closeUserModal} />}
    </div>
  )
}

// Profile modal rendering
function ProfileModal({ user, lastLogin, loading, onClose }) {
  if (!user) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-sm w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold text-gray-900">User Profile</h3>
          <p className="text-sm text-gray-500 mt-2">View user details</p>
        </div>
        <div className="px-6 pb-6">
          {loading ? (
            <div className="py-6 text-center text-sm text-gray-500">Loading…</div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500">Full Name</div>
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{user.email}</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-gray-500">Role</div>
                  <div className="text-sm text-gray-900">{user.role}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="text-sm text-gray-900">{user.status}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Created</div>
                <div className="text-sm text-gray-900">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</div>
              </div>
              <div>
                  <div className="text-xs text-gray-500">Last Login</div>
                  <div className="text-sm text-gray-900">{typeof lastLogin === 'string' && lastLogin.includes('Feature pending') ? lastLogin : (lastLogin ? new Date(lastLogin).toLocaleString() : 'Never Logged In')}</div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={onClose} className="px-4 py-2 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function statusClass(status) {
  if (status === 'Active') return 'bg-green-50 text-green-700'
  if (status === 'Invited') return 'bg-yellow-50 text-yellow-700'
  if (status === 'Suspended' || status === 'Inactive') return 'bg-red-50 text-red-700'
  return 'bg-gray-50 text-gray-700'
}

function activityBadgeClass(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('user')) return 'bg-blue-50 text-blue-700'
  if (t.includes('payment')) return 'bg-green-50 text-green-700'
  if (t.includes('attendance')) return 'bg-purple-50 text-purple-700'
  if (t.includes('notification')) return 'bg-yellow-50 text-yellow-700'
  return 'bg-gray-50 text-gray-700'
}

function EventIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M3 7h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 11h10v6H7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function AttendanceIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ActiveUsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11zM6 20v-2a4 4 0 014-4h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 11a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NotificationIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8l-5-5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}