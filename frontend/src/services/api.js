const BASE = import.meta.env.VITE_API_URL || ''

async function request(method, path, body, opts = {}) {
  const url = `${BASE}${path}`
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  })

  const text = await res.text().catch(() => '')
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') && text ? JSON.parse(text) : text

  if (!res.ok) {
    const err = new Error(typeof data === 'string' ? data || res.statusText : (data.message || JSON.stringify(data)))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  get: (path, opts) => request('GET', path, null, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  put: (path, body, opts) => request('PUT', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  del: (path, opts) => request('DELETE', path, null, opts),
}

export default api
