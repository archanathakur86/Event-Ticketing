import { api } from './api'

export async function fetchAttendance() {
	try {
		const res = await api.get('/api/attendance')
		return (res && Array.isArray(res.attendance)) ? res.attendance : (Array.isArray(res) ? res : [])
	} catch (err) {
		if (err && err.status === 404) {
			const e = new Error('Feature pending: /api/attendance')
			e.featurePending = true
			throw e
		}
		throw err
	}
}

export async function updateAttendance(id, data) {
	try {
		const res = await api.patch(`/api/attendance/${id}`, data)
		return (res && res.attendance) ? res.attendance : res
	} catch (err) {
		if (err && err.status === 404) {
			const e = new Error('Feature pending: /api/attendance')
			e.featurePending = true
			throw e
		}
		throw err
	}
}

export async function updateAttendanceBulk(ids = [], data) {
	try {
		const res = await api.patch('/api/attendance/bulk', { ids, data })
		return (res && Array.isArray(res.updated)) ? res.updated : res
	} catch (err) {
		if (err && err.status === 404) {
			const e = new Error('Feature pending: /api/attendance')
			e.featurePending = true
			throw e
		}
		throw err
	}
}

export default { fetchAttendance, updateAttendance, updateAttendanceBulk }
