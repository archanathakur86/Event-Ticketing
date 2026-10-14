import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authApi from '@/api/auth.api'

const useAuthStore = create(persist((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  initialized: false,

  setUser(user) {
    set({ user, role: user?.role || null, isAuthenticated: !!user })
  },

  async login(credentials) {
    const user = await authApi.login(credentials.email, credentials.password)
    if (user) set({ user, role: user.role || null, isAuthenticated: true })
    return user
  },

  async logout() {
    try {
      await authApi.logout()
    } catch (e) {
      // ignore logout errors
    }
    set({ user: null, role: null, isAuthenticated: false })
  },

  async initialize() {
    try {
      const user = await authApi.getCurrentUser()
      if (user) {
        set({ user, role: user.role || null, isAuthenticated: true, initialized: true })
        return
      }
      set({ user: null, role: null, isAuthenticated: false, initialized: true })
    } catch (e) {
      set({ user: null, role: null, isAuthenticated: false, initialized: true })
    }
  }
}), {
  name: 'auth-session',
  getStorage: () => sessionStorage,
  partialize: (state) => ({
    user: state.user,
    role: state.role,
    isAuthenticated: state.isAuthenticated,
  }),
}))

export default useAuthStore
export { useAuthStore }
export const authStore = {
  state: { user: null }
}
