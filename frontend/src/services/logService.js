import { api } from './api'

export async function addLog({ userId = null, type = 'info', message = '', meta = {} } = {}) {
  try {
    // Ensure userId is null if undefined or invalid
    const validUserId = userId && userId !== 'undefined' ? userId : null
    const payload = { userId: validUserId, type, message, meta }
    const res = await api.post('/api/logs', payload)
    return (res && res.log) ? res.log : res
  } catch (err) {
    if (err && err.status === 404) return null
    throw err
  }
}

export async function getUserLogs(userId) {
  try {
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : ''
    const res = await api.get(`/api/logs${q}`)
    if (res && Array.isArray(res.logs)) return res.logs
    if (res && Array.isArray(res)) return res
    return []
  } catch (err) {
    if (err && err.status === 404) {
      const e = new Error('Feature pending: /api/logs')
      e.featurePending = true
      throw e
    }
    throw err
  }
}

export async function getAllLogs() {
  try {
    const res = await api.get('/api/logs')
    if (res && Array.isArray(res.logs)) return res.logs
    if (res && Array.isArray(res)) return res
    return []
  } catch (err) {
    if (err && err.status === 404) {
      const e = new Error('Feature pending: /api/logs')
      e.featurePending = true
      throw e
    }
    throw err
  }
}

export default { addLog, getUserLogs, getAllLogs }
