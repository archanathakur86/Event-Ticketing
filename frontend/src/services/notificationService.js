import { api } from './api'

export async function sendNotification(n = {}) {
	try {
		const res = await api.post('/api/notifications', n)
		return (res && res.notification) ? res.notification : res
	} catch (err) {
		if (err && err.status === 404) {
			const e = new Error('Feature pending: /api/notifications')
			e.featurePending = true
			throw e
		}
		throw err
	}
}

export async function getNotifications(userId) {
	try {
		const q = userId ? `?userId=${encodeURIComponent(userId)}` : ''
		const res = await api.get(`/api/notifications${q}`)
		if (res && Array.isArray(res.notifications)) return res.notifications
		if (res && Array.isArray(res)) return res
		return []
	} catch (err) {
		if (err && err.status === 404) {
			const e = new Error('Feature pending: /api/notifications')
			e.featurePending = true
			throw e
		}
		throw err
	}
}

export async function markAsRead(id) {
	try {
		await api.post(`/api/notifications/${id}/read`)
		window.dispatchEvent(new CustomEvent('notifications:changed'))
		return true
	} catch (err) {
		if (err && err.status === 404) {
			const e = new Error('Feature pending: /api/notifications')
			e.featurePending = true
			throw e
		}
		throw err
	}
}

export default { sendNotification, getNotifications, markAsRead }
