import React from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

export default function ProtectedRoute({ children }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}
