// Lightweight frontend mocks for missing backend APIs.
// Persists data to localStorage so state survives reloads during development.

function load(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) { return fallback }
}

function save(key: string, val: any) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) {}
}

const USERS_KEY = 'mock_users_v1'
const LOGS_KEY = 'mock_logs_v1'
const NOTIF_KEY = 'mock_notifications_v1'
const ATT_KEY = 'mock_attendance_v1'

function seed() {
  if (!load(USERS_KEY, null)) {
    const users = [
      { id: '1', fullName: 'Admin User', email: 'admin@example.com', role: 'super admin', status: 'active' },
      { id: '2', fullName: 'Coordinator One', email: 'coord@example.com', role: 'coordinator', status: 'active' },
    ]
    save(USERS_KEY, users)
  }
  if (!load(LOGS_KEY, null)) {
    const users = load(USERS_KEY, [])
    const now = Date.now()
    const logs = []
    // Create multiple recent login/logout entries for seeded users
    for (const u of users) {
      for (let i = 0; i < 3; i++) {
        const t = new Date(now - i * 60 * 60 * 1000 - Math.floor(Math.random() * 30 * 60 * 1000)).toISOString()
        logs.push({ id: makeId('l'), userId: u.id, type: 'login', message: 'User logged in', createdAt: t, meta: { loginTime: t, name: u.fullName, email: u.email, role: u.role, status: 'Online' } })
        if (Math.random() > 0.4) {
          const t2 = new Date(now - i * 60 * 60 * 1000 + Math.floor(Math.random() * 20 * 60 * 1000)).toISOString()
          logs.push({ id: makeId('l'), userId: u.id, type: 'logout', message: 'User logged out', createdAt: t2, meta: { logoutTime: t2, name: u.fullName, email: u.email, role: u.role, status: 'Offline' } })
        }
      }
    }
    save(LOGS_KEY, logs)
  }
  if (!load(NOTIF_KEY, null)) save(NOTIF_KEY, [])
  if (!load(ATT_KEY, null)) save(ATT_KEY, [])
}

seed()

function makeId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8)
}

export function canHandle(path: string) {
  return path.startsWith('/api/users') || path.startsWith('/api/logs') || path.startsWith('/api/notifications') || path.startsWith('/api/attendance')
}

export async function handleMock(method: string, path: string, body?: any, opts?: any) {
  // small delay to simulate network
  await new Promise(r => setTimeout(r, 80))

  // USERS
  if (path === '/api/users' && method === 'GET') {
    return load(USERS_KEY, [])
  }
  if (path.startsWith('/api/users/') ) {
    const parts = path.split('/')
    const id = parts[3]
    const users = load(USERS_KEY, [])
    if (method === 'GET') return users.find(u => String(u.id) === String(id)) || null
    if (method === 'PATCH' || method === 'PUT') {
      const idx = users.findIndex(u => String(u.id) === String(id))
      if (idx === -1) throw Object.assign(new Error('Not found'), { status: 404 })
      users[idx] = { ...users[idx], ...(body || {}) }
      save(USERS_KEY, users)
      return users[idx]
    }
    if (method === 'DELETE') {
      const remaining = users.filter(u => String(u.id) !== String(id))
      save(USERS_KEY, remaining)
      return { success: true }
    }
  }
  if (path === '/api/users' && (method === 'POST' || method === 'PUT')) {
    const users = load(USERS_KEY, [])
    const u = { id: makeId('u'), ...body }
    users.unshift(u)
    save(USERS_KEY, users)
    return u
  }

  // LOGS
  if (path.startsWith('/api/logs') && method === 'GET') {
    const qs = (path.split('?')[1] || '')
    const params = new URLSearchParams(qs)
    const page = Math.max(1, Number(params.get('page') || 1))
    const limit = Math.max(1, Number(params.get('limit') || 1000))
    const type = params.get('type')
    const role = params.get('role')
    const startDate = params.get('startDate')
    const endDate = params.get('endDate')

    let logs = load(LOGS_KEY, [])
    const users = load(USERS_KEY, [])

    if (type) logs = logs.filter(l => String(l.type) === String(type))

    // Enrich logs with user information when available
    logs = logs.map(l => {
      const u = users.find(u => String(u.id) === String(l.userId))
      return {
        ...l,
        name: u ? u.fullName : (l.meta && l.meta.name) || '',
        email: u ? u.email : (l.meta && l.meta.email) || '',
        role: u ? u.role : (l.meta && l.meta.role) || '',
        status: u ? u.status : (l.meta && l.meta.status) || '',
        loginTime: (l.meta && l.meta.loginTime) || l.createdAt,
        logoutTime: (l.meta && l.meta.logoutTime) || null,
      }
    })

    if (role) logs = logs.filter(l => String(l.role) === String(role))

    if (startDate) {
      const s = new Date(startDate)
      s.setHours(0, 0, 0, 0)
      logs = logs.filter(l => new Date(l.loginTime || l.createdAt) >= s)
    }
    if (endDate) {
      const e = new Date(endDate)
      e.setHours(23, 59, 59, 999)
      logs = logs.filter(l => new Date(l.loginTime || l.createdAt) <= e)
    }

    const total = logs.length
    const start = (page - 1) * limit
    const pageLogs = logs.slice(start, start + limit)

    const mapped = pageLogs.map(l => ({
      id: l.id,
      userId: l.userId,
      name: l.name,
      email: l.email,
      role: l.role,
      loginTime: l.loginTime,
      logoutTime: l.logoutTime,
      status: l.status,
      type: l.type,
      message: l.message,
      meta: l.meta,
      createdAt: l.createdAt,
    }))

    return { data: mapped, total }
  }
  if (path.startsWith('/api/logs/user/')) {
    const userId = path.split('/')[3]
    const logs = load(LOGS_KEY, [])
    const users = load(USERS_KEY, [])
    const user = users.find(u => String(u.id) === String(userId))
    const filtered = logs.filter(l => String(l.userId) === String(userId)).map(l => ({
      ...l,
      name: user ? user.fullName : (l.meta && l.meta.name) || '',
      email: user ? user.email : (l.meta && l.meta.email) || '',
      role: user ? user.role : (l.meta && l.meta.role) || '',
      status: user ? user.status : (l.meta && l.meta.status) || '',
      loginTime: (l.meta && l.meta.loginTime) || l.createdAt,
      logoutTime: (l.meta && l.meta.logoutTime) || null,
    }))
    return filtered
  }
  if (path === '/api/logs' && method === 'POST') {
    const logs = load(LOGS_KEY, [])
    const entry = { id: makeId('l'), createdAt: new Date().toISOString(), ...body }
    logs.unshift(entry)
    save(LOGS_KEY, logs)
    return entry
  }

  // NOTIFICATIONS
  if (path.startsWith('/api/notifications') && method === 'GET') {
    const qs = (path.split('?')[1] || '')
    const params = new URLSearchParams(qs)
    const uid = params.get('userId')
    const notes = load(NOTIF_KEY, [])
    return uid ? notes.filter(n => String(n.userId) === String(uid)) : notes
  }
  if (path === '/api/notifications' && method === 'POST') {
    const notes = load(NOTIF_KEY, [])
    const n = { id: makeId('n'), createdAt: new Date().toISOString(), read: false, ...body }
    notes.unshift(n)
    save(NOTIF_KEY, notes)
    return n
  }
  if (path.match(/^\/api\/notifications\/[^\/]+\/read/) && (method === 'POST' || method === 'PUT')) {
    const id = path.split('/')[2]
    const notes = load(NOTIF_KEY, [])
    const idx = notes.findIndex(x => String(x.id) === String(id))
    if (idx !== -1) { notes[idx].read = true; save(NOTIF_KEY, notes); return notes[idx] }
    throw Object.assign(new Error('Not found'), { status: 404 })
  }
  if (path.startsWith('/api/notifications/') && method === 'DELETE') {
    const id = path.split('/')[2]
    const notes = load(NOTIF_KEY, [])
    const remaining = notes.filter(x => String(x.id) !== String(id))
    save(NOTIF_KEY, remaining)
    return { success: true }
  }

  // ATTENDANCE
  if (path === '/api/attendance' && method === 'GET') {
    return load(ATT_KEY, [])
  }
  if (path.startsWith('/api/attendance/') && method === 'GET') {
    const eventId = path.split('/')[2]
    const recs = load(ATT_KEY, [])
    return recs.filter(r => String(r.eventId) === String(eventId))
  }
  if (path === '/api/attendance/checkin' && method === 'POST') {
    const recs = load(ATT_KEY, [])
    const r = { id: makeId('a'), createdAt: new Date().toISOString(), status: 'present', ...body }
    recs.unshift(r); save(ATT_KEY, recs); return r
  }
  if ((path === '/api/attendance/bulk' || path === '/api/attendance') && (method === 'PATCH' || method === 'PUT')) {
    const recs = load(ATT_KEY, [])
    const { ids = [], data = {} } = body || {}
    const updated = recs.map(r => ids.includes(r.id) ? { ...r, ...data } : r)
    save(ATT_KEY, updated)
    return { success: true }
  }
  if (path.startsWith('/api/attendance/') && (method === 'PATCH' || method === 'PUT')) {
    const id = path.split('/')[2]
    const recs = load(ATT_KEY, [])
    const idx = recs.findIndex(r => String(r.id) === String(id))
    if (idx === -1) throw Object.assign(new Error('Not found'), { status: 404 })
    recs[idx] = { ...recs[idx], ...(body || {}) }
    save(ATT_KEY, recs)
    return recs[idx]
  }

  throw Object.assign(new Error('Mock handler: endpoint not implemented'), { status: 501 })
}

export default { canHandle, handleMock }
