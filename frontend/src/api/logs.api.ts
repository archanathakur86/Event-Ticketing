import { api } from './client'

export async function getAllLogs(params?: Record<string, any>) {
  let qs = ''
  if (params) {
    const entries = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    qs = entries.length ? '?' + entries.join('&') : ''
  }
  const res = await api.get(`/api/logs${qs}`)
  // If caller provided query params, return normalized { data, total }
  // so paginated/list UI can use totals. If called without params,
  // return an array for backward compatibility with components
  // (e.g., dashboard) that expect an array of logs.
  if (!params) {
    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.data)) return res.data
    // If server returned an object that's not list-like, wrap it safely
    return Array.isArray(res) ? res : (res && res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : [])
  }

  if (Array.isArray(res)) {
    return { data: res, total: res.length }
  }
  return res || { data: [], total: 0 }
}

export async function getUserLogs(userId: string | number) {
  const res = await api.get(`/api/logs/user/${userId}`)
  return res
}

export async function addLog(payload: any) {
  // Ensure userId is null if undefined or invalid
  if (payload && (payload.userId === undefined || payload.userId === 'undefined' || payload.userId === '')) {
    payload.userId = null
  }
  const res = await api.post('/api/logs', payload)
  return res
}

export default { getAllLogs, addLog, getUserLogs }
