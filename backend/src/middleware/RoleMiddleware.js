
export const requireRole = (allowed = []) => {
	return (req, res, next) => {
		try {
			const user = req.user
			if (!user) return res.status(401).json({ message: 'Not authenticated' })
			const normalizeRole = (value) => String(value || '')
				.toLowerCase()
				.replace(/[\s_-]+/g, '')
			const role = normalizeRole(user.role)
			const ok = Array.isArray(allowed) && allowed.some(r => normalizeRole(r) === role)
			if (!ok) return res.status(403).json({ message: 'Forbidden: insufficient role' })
			next()
		} catch (e) {
			console.error('requireRole error:', e)
			return res.status(500).json({ message: 'Server error' })
		}
	}
	}

export default { requireRole }

