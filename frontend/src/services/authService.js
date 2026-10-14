
import { api } from './api'

const STORAGE_KEY = 'auth_user'

function clone(v) { return JSON.parse(JSON.stringify(v)) }

async function saveUserLocal(user) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)) } catch (e) {}
}

function normalizeUser(raw) {
  if (!raw) return null
  const u = { ...raw }
  // ensure id is set from _id
  if (!u.id && u._id) u.id = u._id
  // backend uses `fullName`; frontend expects `name`
  if (!u.name && u.fullName) u.name = u.fullName
  // ensure basic optional fields exist
  if (typeof u.emailVerified === 'undefined') u.emailVerified = false
  if (typeof u.profileImage === 'undefined') u.profileImage = null
  return u
}

export async function login(email, password) {
  try {
    const res = await api.post('/api/auth/login', { email, password })
    const raw = (res && res.user) ? res.user : null
    const user = normalizeUser(raw)
    if (user) await saveUserLocal(user)
    return user
  } catch (err) {
    // fallback to local demo users if backend unavailable
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) throw err
      return JSON.parse(raw)
    } catch (e) {
      throw err
    }
  }
}

export async function register(data) {
  try {
    // backend expects `fullName` field; map frontend `name` to `fullName`
    const payload = {
      fullName: data.name || data.fullName || '',
      email: data.email,
      phone: data.phone,
      password: data.password,
    }
    const res = await api.post('/api/auth/register', payload)
    const raw = (res && res.user) ? res.user : null
    const user = normalizeUser(raw)
    if (user) await saveUserLocal(user)
    return user
  } catch (err) {
    throw err
  }
}

export async function isEmailAvailable(email) {
  if (!email) return false
  try {
    const res = await api.get(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
    if (res && typeof res.available !== 'undefined') return Boolean(res.available)
    return true
  } catch (err) {
    // on network errors, optimistically allow (server will reject on submit if necessary)
    return true
  }
}

export async function updateProfile(userId, data = {}) {
  // backend has no update endpoint; update local copy
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cur = JSON.parse(raw)
    if (String(cur.id) !== String(userId)) return null
    const merged = { ...cur, ...data }
    await saveUserLocal(merged)
    return merged
  } catch (e) { return null }
}

export async function changePassword(userId, currentPassword, newPassword) {
  try {
    // API validates current password from auth cookie and updates to new password
    const payload = { currentPassword, newPassword }
    const res = await api.post('/api/auth/change-password', payload)
    if (res && res.success) return true
    throw new Error((res && res.message) ? res.message : 'Failed to change password')
  } catch (err) {
    // surface backend error message when available
    const msg = err?.message || (err?.response && err.response.data && err.response.data.message) || 'Failed to change password'
    throw new Error(msg)
  }
}

export async function verifyPassword(currentPassword) {
  try {
    const res = await api.post('/api/auth/verify-password', { currentPassword })
    return Boolean(res && res.success)
  } catch (err) {
    // If server responds 401, password is incorrect; return false
    if (err?.response && err.response.status === 401) return false
    throw err
  }
}

export async function logout() { 
  try { await api.post('/api/auth/logout') } catch (e) {}
  try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
  return true
}

export async function getCurrentUser() {
  try {
    const res = await api.get('/api/auth/profile')
    const raw = (res && res.user) ? res.user : null
    const user = normalizeUser(raw)
    if (user) await saveUserLocal(user)
    return user
  } catch (err) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return normalizeUser(JSON.parse(raw))
    } catch (e) { return null }
  }
}

export async function deleteAccount() { throw new Error('Not implemented') }

export default { login, register, logout, getCurrentUser, updateProfile, changePassword, isEmailAvailable, deleteAccount }
