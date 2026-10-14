import mockApi from './mocks'

// Prefer explicit VITE_API_URL. During local development, if not set,
// default to the backend on localhost:5000 so admin pages hit the real API
// (this helps when frontend runs on a different port and mocks are enabled).
const envBase = import.meta.env.VITE_API_URL || ''
const devDefault = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:5000' : ''
const BASE = envBase !== '' ? envBase : devDefault

async function request(method: string, path: string, body?: any, opts: any = {}) {
  // If an API backend is NOT configured, allow frontend mocks to handle requests.
  // When `VITE_API_URL` (BASE) is set, prefer network/backend so admin pages
  // reflect real server state (e.g. users created via seed).
  if ((!BASE || BASE === '') && mockApi && mockApi.canHandle(path)) {
    try {
      const data = await mockApi.handleMock(method, path, body, opts)
      return data
    } catch (e: any) {
      const err: any = new Error(e?.message || 'Something went wrong — please try again.')
      err.status = e?.status || 500
      err.data = e?.data || null
      throw err
    }
  }

  const url = `${BASE}${path}`
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const controller = new AbortController()
  const hasTimeout = typeof opts.timeoutMs !== 'undefined' && opts.timeoutMs !== null
  const timeoutMs = hasTimeout ? Number(opts.timeoutMs) : 0
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      ...opts,
    })
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId)
    if (error?.name === 'AbortError') {
      const err: any = new Error('Request timed out. Check if backend is running and try again.')
      err.status = 408
      throw err
    }
    throw error
  }
  if (timeoutId) clearTimeout(timeoutId)

  const text = await res.text().catch(() => '')
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  let data: any = null
  if (contentType.includes('application/json') && text) {
    try { data = JSON.parse(text) } catch (e) { data = { message: text } }
  } else if (contentType.includes('text/html')) {
    // Protect users from raw HTML error pages (e.g. Vite or server 404 HTML)
    // Provide a friendly, non-technical message for UI display.
    data = { message: 'Something went wrong — please try again.' }
  } else {
    data = text
  }

  if (!res.ok) {
    const userMessage =
      data && typeof data === 'object' && (data.message || data.error)
        ? (data.message || data.error)
        : (typeof data === 'string' && data.length ? data : 'Something went wrong — please try again.')
    const err: any = new Error(userMessage)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (path: string, opts?: any) => request('GET', path, undefined, opts),
  post: (path: string, body?: any, opts?: any) => request('POST', path, body, opts),
  put: (path: string, body?: any, opts?: any) => request('PUT', path, body, opts),
  patch: (path: string, body?: any, opts?: any) => request('PATCH', path, body, opts),
  del: (path: string, opts?: any) => request('DELETE', path, undefined, opts),
}

export default api
