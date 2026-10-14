import Log from '../models/Log.js'

export const getAllLogs = async (req, res) => {
  try {
    // Query params: page, limit, startDate, endDate, role, type
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10))
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '15'), 10)))
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null
    const role = req.query.role ? String(req.query.role) : null
    const type = req.query.type ? String(req.query.type) : null

    const query = {}
    if (type) query.type = type

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        const s = new Date(startDate)
        s.setHours(0, 0, 0, 0)
        query.createdAt.$gte = s
      }
      if (endDate) {
        const e = new Date(endDate)
        e.setHours(23, 59, 59, 999)
        query.createdAt.$lte = e
      }
    }

    // If role filter provided, find matching userIds first
    if (role) {
      // Lazy-load User model to avoid circular requires
      const User = (await import('../models/User.js')).default
      // Support comma-separated list of roles from frontend (e.g. "super admin,administration")
      let rolesToMatch = [role]
      if (String(role).includes(',')) {
        rolesToMatch = String(role).split(',').map(r => r.trim()).filter(Boolean)
      }
      const userIds = await User.find({ role: rolesToMatch.length === 1 ? rolesToMatch[0] : { $in: rolesToMatch } }).select('_id').lean()
      const ids = (userIds || []).map(u => u._id)
      if (ids.length === 0) {
        return res.status(200).json({ data: [], total: 0 })
      }
      query.userId = { $in: ids }
    }

    const total = await Log.countDocuments(query)
    const logs = await Log.find(query).populate('userId', 'fullName email role status').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    const mapped = logs.map(l => ({
      id: l._id,
      userId: l.userId?._id || null,
      name: l.userId?.fullName || (l.meta && l.meta.name) || '',
      email: l.userId?.email || (l.meta && l.meta.email) || '',
      role: l.userId?.role || (l.meta && l.meta.role) || '',
      loginTime: (l.meta && l.meta.loginTime) || l.createdAt,
      logoutTime: (l.meta && l.meta.logoutTime) || null,
      status: (l.meta && l.meta.status) || '',
      type: l.type,
      message: l.message,
      meta: l.meta,
      createdAt: l.createdAt,
    }))
    return res.status(200).json({ data: mapped, total })
  } catch (e) {
    console.error('getAllLogs error:', e)
    return res.status(500).json({ message: 'Failed to fetch logs' })
  }
}

export const getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params
    const logs = await Log.find({ userId }).populate('userId', 'fullName email role status').sort({ createdAt: -1 })
    const mapped = logs.map(l => ({
      id: l._id,
      userId: l.userId?._id || null,
      name: l.userId?.fullName || (l.meta && l.meta.name) || '',
      email: l.userId?.email || (l.meta && l.meta.email) || '',
      role: l.userId?.role || (l.meta && l.meta.role) || '',
      loginTime: (l.meta && l.meta.loginTime) || l.createdAt,
      logoutTime: (l.meta && l.meta.logoutTime) || null,
      location: (l.meta && l.meta.location) || '',
      status: (l.meta && l.meta.status) || '',
      type: l.type,
      message: l.message,
      meta: l.meta,
      createdAt: l.createdAt,
    }))
    return res.status(200).json(mapped)
  } catch (e) {
    console.error('getUserLogs error:', e)
    return res.status(500).json({ message: 'Failed to fetch user logs' })
  }
}

export const addLog = async (req, res) => {
  try {
    const payload = req.body || {}
    // Validate userId - convert invalid values to null
    if (payload.userId === 'undefined' || payload.userId === '' || payload.userId === undefined) {
      payload.userId = null
    }
    const entry = new Log(payload)
    await entry.save()
    return res.status(201).json(entry)
  } catch (e) {
    console.error('addLog error:', e)
    return res.status(500).json({ message: 'Failed to add log' })
  }
}

export default { getAllLogs, getUserLogs, addLog }
