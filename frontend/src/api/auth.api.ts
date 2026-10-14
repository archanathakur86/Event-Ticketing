import { api } from './client'
import { LoginRequest, LoginResponse, User, RegisterRequest } from './contracts'

function normalizeUser(raw: any): User | null {
  if (!raw) return null
  const u = { ...raw }
  if (!u.name && u.fullName) u.name = u.fullName
  // ensure callers can access a stable `id` field
  if (!u.id && (u._id || u.userId || u.id)) u.id = u._id || u.userId || u.id
  if (typeof u.emailVerified === 'undefined') (u as any).emailVerified = false
  if (typeof u.profileImage === 'undefined') (u as any).profileImage = null
  return u
}

export async function login(email: string, password: string): Promise<User | null> {
  const res = await api.post('/api/auth/login', { email, password })
  const raw = (res && (res as any).user) ? (res as any).user : null
  return normalizeUser(raw)
}

export async function register(data: RegisterRequest): Promise<User | null> {
  const payload = { fullName: data.name || data.fullName || '', email: data.email, phone: data.phone, password: data.password }
  const res = await api.post('/api/auth/register', payload)
  const raw = (res && (res as any).user) ? (res as any).user : null
  return normalizeUser(raw)
}

export async function isEmailAvailable(email: string): Promise<boolean> {
  if (!email) return false
  try {
    const res = await api.get(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
    if (res && typeof (res as any).available !== 'undefined') return Boolean((res as any).available)
    return true
  } catch (e) { return true }
}

export async function updateProfile(userId: string | number, data: any) {
  const res = await api.patch(`/api/users/${userId}`, data)
  return normalizeUser((res && (res as any).user) ? (res as any).user : res)
}

export async function changePassword(userId: string | number, currentPassword: string, newPassword: string) {
  const res = await api.post('/api/auth/change-password', { currentPassword, newPassword })
  if (res && (res as any).success) return true
  throw new Error((res && (res as any).message) ? (res as any).message : 'Failed to change password')
}

export async function verifyPassword(currentPassword: string) {
  const res = await api.post('/api/auth/verify-password', { currentPassword })
  return Boolean(res && (res as any).success)
}

export async function logout() {
  try { await api.post('/api/auth/logout') } catch (e) {}
  return true
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await api.get('/api/auth/profile')
    const raw = (res && (res as any).user) ? (res as any).user : null
    return normalizeUser(raw)
  } catch (e) { return null }
}

export default { login, register, logout, getCurrentUser, updateProfile, changePassword, isEmailAvailable }
