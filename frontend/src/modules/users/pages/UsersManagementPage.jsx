import React, { useState, useEffect } from 'react'
import { getAllUsers, createUser, updateUser, deleteUser } from '@/api/users.api'
import { showToast } from '../../../components/ui/Toast'
import { useNavigate } from 'react-router-dom'
import * as logService from '@/api/logs.api'

export default function UsersManagementPage() {
  
  const [users, setUsers] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'student', status: 'active' })
  const [errors, setErrors] = useState({})
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('desc') 
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [lastLogins, setLastLogins] = useState({})
  const [openMenuId, setOpenMenuId] = useState(null)
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false)
  const [actionTarget, setActionTarget] = useState(null)
  const navigate = useNavigate()
  const [isViewing, setIsViewing] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllUsers()
      setUsers(Array.isArray(data) ? data : [])

      try {
        const list = Array.isArray(data) ? data : []
        const promises = list.map(async (u) => {
          const logs = await logService.getUserLogs(u.id)
          
          const login = (logs || []).find(l => /login|sign.?in|auth|logged/i.test(String(l.type || '') + ' ' + String(l.message || '') + ' ' + JSON.stringify(l.meta || {})))
          const time = login ? (login.meta?.loginTime || login.createdAt) : null
          return { id: u.id, time }
        })
        const results = await Promise.all(promises)
        const map = {}
        results.forEach(r => { if (r && r.id != null) map[String(r.id)] = r.time })
        setLastLogins(map)
      } catch (e) {
      }
    } catch (e) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      await fetchUsers()
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    function onDoc(e) {
      setOpenMenuId(null)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => { setCurrentPage(1) }, [search, roleFilter, statusFilter, itemsPerPage, sortOrder])

  async function handleAddUser() {
    const e = {}
    if (!newUser.name || !newUser.name.trim()) e.name = 'Name is required'
    if (!newUser.email || !newUser.email.trim()) e.email = 'Email is required'
    // require password when creating a new user
    const pwd = String(newUser.password || '')
    const rules = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd),
    }
    if (!newUser.id) {
      if (!pwd) e.password = 'Password is required'
      else if (!(rules.length && rules.upper && rules.number && rules.special)) e.password = 'Password does not meet complexity requirements'
    }
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setCreating(true)
    try {
      if (newUser && newUser.id) {
        await updateUser(newUser.id, {
          fullName: newUser.name.trim(),
          email: newUser.email.trim(),
          role: String(newUser.role || '').toLowerCase(),
          status: String(newUser.status || '').toLowerCase()
        })
      } else {
        await createUser({
          fullName: newUser.name.trim(),
          email: newUser.email.trim(),
          password: newUser.password,
          role: String(newUser.role || '').toLowerCase(),
          status: String(newUser.status || '').toLowerCase()
        })
      }
      await fetchUsers()
      setIsModalOpen(false)
      setNewUser({ name: '', email: '', role: 'student', status: 'active', password: '' })
      setErrors({})
    } catch (err) {
      const msg = err?.message || (err?.data && err.data.message) || 'Failed to add user'
      setError(msg)
    } finally {
      setCreating(false)
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const copy = new Set(prev)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  function selectAllVisible(visibleRows) {
    setSelectedIds(prev => {
      const copy = new Set(prev)
      const allSelected = visibleRows.every(r => copy.has(r.id))
      if (allSelected) {
        visibleRows.forEach(r => copy.delete(r.id))
      } else {
        visibleRows.forEach(r => copy.add(r.id))
      }
      return copy
    })
  }

  function confirmBulk(action) {
    if (!selectedIds || selectedIds.size === 0) return
    setBulkAction(action)
    if (action === 'Delete') setBulkModalOpen(true)
    else if (action === 'ChangeRole') {
      const role = window.prompt('Set role for selected users', 'Student')
      if (!role) return
      performBulk(role)
    } else {
      performBulk()
    }
  }

  async function performBulk(roleForChange = null) {
    if (bulkUpdating) return
    setBulkUpdating(true)
    const ids = Array.from(selectedIds)
    try {
      if (bulkAction === 'Enable') {
        await Promise.all(ids.map(id => updateUser(id, { status: 'active' })))
        showToast({ title: 'Updated', message: `Enabled ${ids.length} user(s)`, type: 'success' })
      } else if (bulkAction === 'Disable') {
        await Promise.all(ids.map(id => updateUser(id, { status: 'inactive' })))
        showToast({ title: 'Updated', message: `Disabled ${ids.length} user(s)`, type: 'success' })
      } else if (bulkAction === 'Delete') {
        await Promise.all(ids.map(id => deleteUser(id)))
        showToast({ title: 'Deleted', message: `Deleted ${ids.length} user(s)`, type: 'success' })
      } else if (bulkAction === 'ChangeRole') {
        const role = roleForChange || window.prompt('Set role for selected users', 'Student')
        if (!role) return
        await Promise.all(ids.map(id => updateUser(id, { role: String(role).toLowerCase().trim() })))
        showToast({ title: 'Updated', message: `Updated role for ${ids.length} user(s)`, type: 'success' })
      }
      await fetchUsers()
      setSelectedIds(new Set())
    } catch (e) {
      showToast({ title: 'Error', message: e?.message || 'Bulk action failed', type: 'error' })
    } finally {
      setBulkUpdating(false)
      setBulkModalOpen(false)
      setBulkAction('')
    }
  }

  function formatDateTime(d) {
    if (!d) return 'Never Logged In'
    try {
      const dt = new Date(d)
      if (isNaN(dt)) return d
      return dt.toLocaleString()
    } catch (e) {
      return d
    }
  }

  const q = String(search || '').trim().toLowerCase()
  let filteredList = Array.isArray(users) ? users.slice() : []
  if (roleFilter) filteredList = filteredList.filter((u) => String(u.role || '').toLowerCase() === String(roleFilter).toLowerCase())
  if (statusFilter) filteredList = filteredList.filter((u) => String(u.status || '').toLowerCase() === String(statusFilter).toLowerCase())
  if (q) filteredList = filteredList.filter((u) => (String(u.name || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q)))
  filteredList.sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime()
    const db = new Date(b.createdAt || 0).getTime()
    return sortOrder === 'asc' ? da - db : db - da
  })

  const total = filteredList.length
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginated = filteredList.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages])

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users Management</h1>
          <p className="text-sm text-gray-500">Manage platform users and roles</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm w-48"
            />

            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Coordinator">Coordinator</option>
              <option value="Administration">Administration</option>
              <option value="Student">Student</option>
              <option value="Admin">Admin</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="desc">Created Date: Newest</option>
              <option value="asc">Created Date: Oldest</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
            </select>

            <button
              onClick={() => { setNewUser({ name: '', email: '', role: 'student', status: 'active', password: '' }); setIsModalOpen(true) }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Add User
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Total Users</div>
          <div className="text-lg font-semibold text-gray-900">{loading ? '—' : users.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Active Users</div>
          <div className="text-lg font-semibold text-gray-900">{loading ? '—' : users.filter(u => String(u.status || '').toLowerCase() === 'active').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Inactive Users</div>
          <div className="text-lg font-semibold text-gray-900">{loading ? '—' : users.filter(u => String(u.status || '').toLowerCase() === 'inactive').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Admin Count</div>
          <div className="text-lg font-semibold text-gray-900">{loading ? '—' : users.filter(u => ['admin','super admin'].includes(String(u.role||'').toLowerCase())).length}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Coordinator Count</div>
          <div className="text-lg font-semibold text-gray-900">{loading ? '—' : users.filter(u => String(u.role||'').toLowerCase() === 'coordinator').length}</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500">Student Count</div>
          <div className="text-lg font-semibold text-gray-900">{loading ? '—' : users.filter(u => String(u.role||'').toLowerCase() === 'student').length}</div>
        </div>
      </div>

      <section className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">Users</h2>
          <div className="text-sm text-gray-500">{users.length} users</div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {paginated.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 capitalize">{u.role}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${String(u.status || '').toLowerCase() === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                      {String(u.status || '').toLowerCase() === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDateTime(lastLogins[String(u.id)])}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="relative inline-block text-left">
                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === u.id ? null : u.id) }} className="px-3 py-1 rounded-md text-sm border border-gray-200 bg-white">
                        Actions
                      </button>
                      {openMenuId === u.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                          <div className="py-1">
                            <button onClick={() => { setOpenMenuId(null); setIsViewing(true); setIsModalOpen(true); setNewUser({ name: u.name, email: u.email, role: String(u.role || '').toLowerCase(), status: String(u.status || '').toLowerCase(), id: u.id }) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">View Profile</button>
                            <button onClick={() => { setOpenMenuId(null); setIsViewing(false); setIsModalOpen(true); setNewUser({ name: u.name, email: u.email, role: String(u.role || '').toLowerCase(), status: String(u.status || '').toLowerCase(), id: u.id }) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
                            <button onClick={() => { setOpenMenuId(null); const newRole = window.prompt('Set role for user', String(u.role || 'student')); if (newRole) { updateUser(u.id, { role: String(newRole).toLowerCase().trim() }).then(() => { fetchUsers(); showToast({ title: 'Updated', message: 'Role updated', type: 'success' }) }).catch(() => showToast({ title: 'Error', message: 'Failed to update role', type: 'error' })) } }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Change Role</button>
                            <button onClick={() => { setOpenMenuId(null); const ok = window.confirm('Send password reset email to this user?'); if (ok) { showToast({ title: 'Sent', message: 'Password reset link sent', type: 'success' }) } }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Reset Password</button>
                            <button onClick={() => { setOpenMenuId(null); toggleStatus(u.id) }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">{String(u.status || '').toLowerCase() === 'active' ? 'Disable' : 'Enable'}</button>
                            <button onClick={() => { setOpenMenuId(null); setSelectedUser(u); setIsDeleteModalOpen(true) }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-700">{selectedIds.size} selected</div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setBulkAction('Enable'); performBulk() }} disabled={bulkUpdating} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm">Enable Selected</button>
              <button onClick={() => { setBulkAction('Disable'); performBulk() }} disabled={bulkUpdating} className="px-3 py-2 bg-yellow-600 text-white rounded-md text-sm">Disable Selected</button>
              <button onClick={() => { confirmBulk('Delete') }} disabled={bulkUpdating} className="px-3 py-2 bg-red-600 text-white rounded-md text-sm">Delete Selected</button>
              <button onClick={() => { confirmBulk('ChangeRole') }} disabled={bulkUpdating} className="px-3 py-2 bg-white border rounded-md text-sm">Change Role</button>
              <button onClick={() => setSelectedIds(new Set())} disabled={bulkUpdating} className="px-3 py-2 bg-white border rounded-md text-sm">Clear</button>
            </div>
          </div>
        )}

        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">{total === 0 ? 'No users found' : `Showing ${startIndex + 1}–${Math.min(total, startIndex + itemsPerPage)} of ${total} users`}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className={`px-3 py-1 border rounded-md text-sm ${currentPage <= 1 ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>Prev</button>
            <div className="hidden sm:flex items-center gap-1">
              {(() => {
                const pages = []
                const maxButtons = 5
                let start = Math.max(1, currentPage - Math.floor(maxButtons / 2))
                let end = start + maxButtons - 1
                if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxButtons + 1) }
                for (let i = start; i <= end; i++) {
                  pages.push(<button key={i} onClick={() => setCurrentPage(i)} className={`px-3 py-1 border rounded-md text-sm ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}>{i}</button>)
                }
                return pages
              })()}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className={`px-3 py-1 border rounded-md text-sm ${currentPage >= totalPages ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>Next</button>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-sm w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">{isViewing ? 'User Profile' : (newUser && newUser.id ? 'Edit User' : 'Add New User')}</h3>
              <p className="text-sm text-gray-500 mt-2">{isViewing ? 'View user details' : 'Fill in user details'}</p>
            </div>

            <div className="px-6 pb-6">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Full Name</label>
                  <input
                    value={newUser.name || newUser.fullName || ''}
                    onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value, fullName: e.target.value }))}
                    type="text"
                    disabled={isViewing}
                    className={`w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewing ? 'bg-gray-50' : ''}`}
                    placeholder="Full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Email</label>
                  <input
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
                    type="email"
                    disabled={isViewing}
                    className={`w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewing ? 'bg-gray-50' : ''}`}
                    placeholder="email@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>

                {!isViewing && !newUser.id && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Password</label>
                    <input
                      value={newUser.password || ''}
                      onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
                      type="password"
                      className={`w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      placeholder="Password"
                    />
                    {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                  </div>
                )}

                {!isViewing && !newUser.id && (() => {
                  const pwd = newUser.password || ''
                  const unmet = []
                  if (pwd.length < 8) unmet.push('At least 8 characters')
                  if (!/[A-Z]/.test(pwd)) unmet.push('An uppercase letter')
                  if (!/\d/.test(pwd)) unmet.push('A number')
                  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd)) unmet.push('A special character')
                  if (unmet.length === 0) return null
                  return (
                    <div className="md:col-span-2 mt-2 text-sm">
                      <div className="flex items-center gap-2 text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Missing: {unmet.join(', ')}</span>
                      </div>
                    </div>
                  )
                })()}

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Role</label>
                  <select
                    value={newUser.role || ''}
                    onChange={(e) => setNewUser((s) => ({ ...s, role: e.target.value }))}
                    disabled={isViewing}
                    className={`w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewing ? 'bg-gray-50' : ''}`}
                  >
                    <option value="super admin">Super Admin</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="administration">Administration</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Status</label>
                  <select
                    value={newUser.status}
                    onChange={(e) => setNewUser((s) => ({ ...s, status: e.target.value }))}
                    disabled={isViewing}
                    className={`w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewing ? 'bg-gray-50' : ''}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setIsViewing(false)
                      setNewUser({ name: '', email: '', role: 'student', status: 'active' })
                    }}
                    className="px-4 py-2 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {isViewing ? (
                    <button
                      type="button"
                      onClick={() => setIsViewing(false)}
                      className="px-4 py-2 rounded-md text-sm bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddUser()}
                      disabled={creating}
                      className={`px-4 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 ${creating ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {newUser && newUser.id ? 'Save' : 'Add User'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setIsDeleteModalOpen(false)
            setSelectedUser(null)
          }}
        >
          <div className="bg-white rounded-lg shadow-sm w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete <span className="font-medium">'{selectedUser.name}'</span>? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setSelectedUser(null)
                }}
                className="px-4 py-2 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser()}
                className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {isDisableModalOpen && actionTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => { setIsDisableModalOpen(false); setActionTarget(null) }}
        >
          <div className="bg-white rounded-lg shadow-sm w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">Disable User</h3>
              <p className="text-sm text-gray-500 mt-2">Are you sure you want to disable <span className="font-medium">'{actionTarget.name}'</span>? They will be prevented from logging in.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => { setIsDisableModalOpen(false); setActionTarget(null) }} className="px-4 py-2 rounded-md text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => confirmDisable()} className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700">Disable</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(d) {
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch (e) {
    return d
  }
}

