import React from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

export default function RoleRoute({ children, roles = [] }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return null
  if (!user) return <Navigate to="/login" replace />

  const userRole = String(user?.role || '').toLowerCase()
  const userRolesArr = Array.isArray(user?.roles) ? user.roles.map(r => String(r).toLowerCase()) : []

  const allowed = (roles || []).some(r => {
    const rr = String(r || '').toLowerCase()
    if (!rr) return false
    if (userRole && userRole.includes(rr)) return true
    if (userRolesArr.includes(rr)) return true
    return false
  })

  if (!allowed) return <Navigate to="/" replace />
  return children
}
