import React, { useEffect, useMemo, useState } from 'react'
import logService from '@/api/logs.api'

export default function LoginLogsPage() {
  const [logs, setLogs] = useState([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let mounted = true
    async function loadPage() {
      setLoading(true)
      try {
        // expand canonical role filter into backend role list if needed
        let roleParam = undefined
        if (roleFilter && roleFilter !== 'all') {
          const grp = roleGroupsMap[roleFilter]
          roleParam = grp ? grp.join(',') : roleFilter
        }
        // Fetch login logs only
        const res = await logService.getAllLogs({ page, limit: pageSize, startDate: startDate || undefined, endDate: endDate || undefined, role: roleParam, type: 'login' })
        if (!mounted) return
        let data = res && (res.data || (Array.isArray(res) ? res : []))
        let tot = (res && (res.total || (Array.isArray(res) ? res.length : 0))) || 0

        // Enrich with logout times: fetch logout logs with same role filter
        try {
          const logoutRes = await logService.getAllLogs({ type: 'logout', role: roleParam, limit: 1000 })
          const logouts = (logoutRes && (logoutRes.data || (Array.isArray(logoutRes) ? logoutRes : []))) || []
          
          // Create a map of userId -> array of logout entries sorted by time
          const logoutsByUser = new Map()
          for (const logout of logouts) {
            const uid = String(logout.userId)
            if (!logoutsByUser.has(uid)) {
              logoutsByUser.set(uid, [])
            }
            logoutsByUser.get(uid).push({
              time: new Date(logout.logoutTime || logout.meta?.logoutTime || logout.createdAt),
              data: logout
            })
          }
          
          // Sort each user's logout entries by time
          for (const [uid, entries] of logoutsByUser.entries()) {
            entries.sort((a, b) => a.time.getTime() - b.time.getTime())
          }

          // For each login, find the first logout that happened after it
          data = (data || []).map(login => {
            const loginTime = new Date(login.loginTime || login.meta?.loginTime || login.createdAt)
            const uid = String(login.userId)
            const userLogouts = logoutsByUser.get(uid) || []
            
            // Find the first logout after this login
            const matchingLogout = userLogouts.find(lo => lo.time > loginTime)
            
            return {
              ...login,
              logoutTime: matchingLogout ? matchingLogout.data.logoutTime || matchingLogout.data.meta?.logoutTime || matchingLogout.data.createdAt : null,
              status: matchingLogout ? 'Offline' : 'Online'
            }
          })
        } catch (e) {
          console.debug('Failed to fetch logout logs', e)
        }

        setLogs(data)
        setTotal(tot)
      } catch (e) {
        console.error('Failed to load logs page', e)
        if (!mounted) return
        setLogs([])
        setTotal(0)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    loadPage()
    return () => { mounted = false }
  }, [page, pageSize, startDate, endDate, roleFilter])

  const roles = useMemo(() => {
    // Fixed list: only show All Roles, Admin, Coordinator, and Student
    return ['all', 'admin', 'coordinator', 'student']
  }, [])

  // mapping used when sending role filter to backend: expand canonical -> backend roles
  const roleGroupsMap = useMemo(() => ({
    admin: ['super admin', 'administration', 'administrator', 'admin'],
    coordinator: ['coordinator'],
    student: ['student'],
  }), [])

  function resetFilters() {
    setRoleFilter('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // Server returns already filtered/paginated `logs` and `total`.
  // Use `logs` directly for rendering rows to avoid double-filtering issues.
  const displayed = logs || []

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))
  const startIndex = (page - 1) * pageSize

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Login Logs</h1>
          <p className="text-sm text-gray-500">Track user login and logout activity</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === 'all' ? 'All Roles' : r === 'admin' ? 'Administrator' : r === 'coordinator' ? 'Coordinator' : r === 'student' ? 'Student' : r}
              </option>
            ))}
          </select>

          <div>
            <label className="sr-only">Per page</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button onClick={resetFilters} className="px-3 py-2 text-sm border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Clear Filters</button>
          
        </div>
      </header>

      <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">Logs</h2>
          <div className="text-sm text-gray-500">{loading ? '…' : `${total} records`}</div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Login Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Logout Time</th>
                
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {displayed.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">{l.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{l.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{l.role}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{new Date(l.loginTime).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{l.logoutTime ? new Date(l.logoutTime).toLocaleString() : '—'}</td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${l.status === 'Online' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600">{total === 0 ? 'No logs found' : `Showing ${startIndex + 1}–${Math.min(total, startIndex + pageSize)} of ${total} logs`}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className={`px-3 py-1 border rounded text-sm ${page <= 1 ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>Prev</button>
            <div className="hidden sm:flex items-center gap-1">
              {(() => {
                const pages = []
                const maxButtons = 5
                let start = Math.max(1, page - Math.floor(maxButtons / 2))
                let end = start + maxButtons - 1
                if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxButtons + 1) }
                for (let i = start; i <= end; i++) {
                  pages.push(<button key={i} onClick={() => setPage(i)} className={`px-3 py-1 border rounded text-sm ${i === page ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}>{i}</button>)
                }
                return pages
              })()}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className={`px-3 py-1 border rounded text-sm ${page >= totalPages ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>Next</button>
            <div className="text-sm text-gray-500">{total} logs</div>
          </div>
        </div>
      </section>
    </div>
  )
}
