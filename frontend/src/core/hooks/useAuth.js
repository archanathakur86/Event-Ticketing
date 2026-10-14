import useAuthStore from '../../store/authStore'

export function useAuth() {
  const { user, setUser, isAuthenticated, login, logout } = useAuthStore()
  return { user, setUser, isAuthenticated, login, logout }
}

export default useAuth
