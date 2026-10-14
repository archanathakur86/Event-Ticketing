import React, { useEffect, useMemo, useState } from 'react'
import { getAllUsers, updateUser } from '@/api/users.api'
import { showToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'

function normalizeRole(role) {
  const value = String(role || '').toLowerCase().trim()
  if (value === 'super admin' || value === 'superadmin') return 'admin'
  if (value === 'administration' || value === 'administrator') return 'administrator'
  return value
}

function roleLabel(role) {
  const value = normalizeRole(role)
  if (value === 'student') return 'Student'
  if (value === 'coordinator') return 'Coordinator'
  if (value === 'admin') return 'Admin'
  if (value === 'administrator') return 'Administrator'
  return role || 'Unknown'
}

export default function AdministrationUsersPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [confirmUser, setConfirmUser] = useState(null)
  const [passwordModalUser, setPasswordModalUser] = useState(null)
  const [nextPassword, setNextPassword] = useState('')
  const currentUserId = currentUser?.id || currentUser?._id || currentUser?.userId

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      showToast({ title: 'Error', message: 'Failed to load users', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleRoleChange(userId, role) {
    if (String(userId) === String(currentUserId) && normalizeRole(currentUser?.role) === 'administrator') {
      showToast({ title: 'Not allowed', message: 'Administrator cannot change their own role', type: 'error' })
      return
    }
    setUpdatingId(userId)
    try {
      await updateUser(userId, { role })
      setUsers((current) =>
        current.map((user) => (String(user.id || user._id) === String(userId) ? { ...user, role } : user)),
      )
      showToast({ title: 'Updated', message: 'User role updated', type: 'success' })
    } catch (error) {
      showToast({ title: 'Error', message: 'Failed to update role', type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleStatusToggle(user) {
    const userId = user.id || user._id
    const nextStatus = String(user.status || '').toLowerCase() === 'active' ? 'inactive' : 'active'
    setUpdatingId(userId)
    try {
      await updateUser(userId, { status: nextStatus })
      setUsers((current) =>
        current.map((entry) =>
          String(entry.id || entry._id) === String(userId) ? { ...entry, status: nextStatus } : entry,
        ),
      )
      showToast({
        title: 'Updated',
        message: nextStatus === 'active' ? 'User enabled' : 'User disabled',
        type: 'success',
      })
    } catch (error) {
      showToast({ title: 'Error', message: error?.message || 'Failed to update status', type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  async function handlePasswordReset() {
    const targetUser = passwordModalUser
    const userId = targetUser?.id || targetUser?._id
    const trimmedPassword = nextPassword.trim()

    if (!userId) return
    if (trimmedPassword.length < 6) {
      showToast({ title: 'Invalid password', message: 'Password must be at least 6 characters', type: 'error' })
      return
    }

    setUpdatingId(userId)
    try {
      await updateUser(userId, { password: trimmedPassword })
      showToast({
        title: 'Password reset',
        message: `${targetUser?.name || targetUser?.fullName || 'User'} password updated successfully`,
        type: 'success',
      })
      setPasswordModalUser(null)
      setNextPassword('')
    } catch (error) {
      showToast({ title: 'Error', message: error?.message || 'Failed to reset password', type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  function handleActionClick(user) {
    const targetId = user.id || user._id
    if (String(targetId) === String(currentUserId) && String(user.status || '').toLowerCase() === 'active') {
      showToast({ title: 'Not allowed', message: 'You cannot disable your own account', type: 'error' })
      return
    }
    if (String(user.status || '').toLowerCase() === 'active') {
      setConfirmUser(user)
      return
    }
    handleStatusToggle(user)
  }

  const filteredUsers = useMemo(() => {
    const query = String(search || '').trim().toLowerCase()
    return (Array.isArray(users) ? users : []).filter((user) => {
      const matchesSearch =
        !query ||
        String(user.name || user.fullName || '').toLowerCase().includes(query) ||
        String(user.email || '').toLowerCase().includes(query)
      const matchesRole = !roleFilter || normalizeRole(user.role) === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Manage Users</h1>
        <p className="mt-2 text-sm text-slate-500">Administrator view for all system users and role management.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#123386] focus:ring-2 focus:ring-[#123386]/10"
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#123386] focus:ring-2 focus:ring-[#123386]/10"
        >
          <option value="">All Users</option>
          <option value="student">Students</option>
          <option value="coordinator">Coordinators</option>
          <option value="admin">Admins</option>
          <option value="administrator">Administrators</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userId = user.id || user._id
                  const currentRole = normalizeRole(user.role)
                  return (
                    <tr key={String(userId)}>
                      <td className="px-6 py-4 font-medium text-slate-900">{user.name || user.fullName || 'Unnamed User'}</td>
                      <td className="px-6 py-4 text-slate-600">{user.email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">Current: {roleLabel(user.role)}</div>
                          <select
                            value={['student', 'coordinator', 'admin'].includes(currentRole) ? currentRole : 'admin'}
                            onChange={(event) => handleRoleChange(userId, event.target.value)}
                            disabled={
                              String(updatingId) === String(userId) ||
                              (String(userId) === String(currentUserId) && normalizeRole(currentUser?.role) === 'administrator')
                            }
                            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#123386] focus:ring-2 focus:ring-[#123386]/10"
                          >
                            <option value="student">Student</option>
                            <option value="coordinator">Coordinator</option>
                            <option value="admin">Admin</option>
                          </select>
                          {String(userId) === String(currentUserId) && normalizeRole(currentUser?.role) === 'administrator' ? (
                            <div className="text-xs text-amber-600">You cannot change your own role.</div>
                          ) : null}
                        </div>
                      </td>
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
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordModalUser(user)
                              setNextPassword('')
                            }}
                            disabled={String(updatingId) === String(userId)}
                            className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActionClick(user)}
                            disabled={String(updatingId) === String(userId)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                              String(user.status || '').toLowerCase() === 'active'
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {String(user.status || '').toLowerCase() === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={() => setConfirmUser(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Disable user?</h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirmUser.name || confirmUser.fullName || 'This user'} will be marked inactive and may lose access until re-enabled.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const user = confirmUser
                  setConfirmUser(null)
                  await handleStatusToggle(user)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {passwordModalUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={() => {
            setPasswordModalUser(null)
            setNextPassword('')
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Reset user password</h2>
            <p className="mt-2 text-sm text-slate-600">
              Set a new password for {passwordModalUser.name || passwordModalUser.fullName || 'this user'}.
            </p>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="admin-reset-password">
                New password
              </label>
              <input
                id="admin-reset-password"
                type="text"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#123386] focus:ring-2 focus:ring-[#123386]/10"
              />
              <p className="text-xs text-slate-500">Use at least 6 characters.</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPasswordModalUser(null)
                  setNextPassword('')
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={String(updatingId) === String(passwordModalUser.id || passwordModalUser._id)}
                className="rounded-lg bg-[#123386] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0f2c73] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
