import React, { createContext, useState, useEffect } from 'react'
import { getCurrentUser } from '@/api/auth.api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const u = await getCurrentUser()
      if (mounted) {
        setUser(u)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])
  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
