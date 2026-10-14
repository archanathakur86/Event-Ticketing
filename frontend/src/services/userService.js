import { api } from './api'

export async function getAllUsers() {
  try {
    const res = await api.get('/api/users')
    if (res && Array.isArray(res.users)) return res.users
    if (res && Array.isArray(res)) return res
    return []
  } catch (err) {
    // If backend does not implement /api/users, surface feature-pending to UI
    if (err && err.status === 404) {
      const e = new Error('Feature pending: /api/users')
      e.featurePending = true
      throw e
    }
    throw err
  }
}

export async function createUser(data) {
  try {
    const res = await api.post('/api/users', data)
    return (res && res.user) ? res.user : res
  } catch (err) {
    if (err && err.status === 404) {
      const e = new Error('Feature pending: /api/users')
      e.featurePending = true
      throw e
    }
    throw err
  }
}

export async function updateUser(id, data) {
  try {
    const res = await api.patch(`/api/users/${id}`, data)
    return (res && res.user) ? res.user : res
  } catch (err) {
    if (err && err.status === 404) {
      const e = new Error('Feature pending: /api/users')
      e.featurePending = true
      throw e
    }
    throw err
  }
}

export async function deleteUser(id) {
  try {
    await api.del(`/api/users/${id}`)
    return true
  } catch (err) {
    if (err && err.status === 404) {
      const e = new Error('Feature pending: /api/users')
      e.featurePending = true
      throw e
    }
    throw err
  }
}

export async function fetchUsers() { return getAllUsers() }
