import { api } from './api'
import * as ticketService from './ticketService'

// PayU payment base URL (test or production)
const PAYU_BASE_URL = import.meta.env.VITE_PAYU_BASE_URL || 'https://test.payu.in/_payment'

export async function processPayment() { return { status: 'ok' } }

/**
 * Create payment and get PayU parameters
 * @param {string} eventId - Event ID to book ticket for
 * @param {string} ticketType - Ticket type: 'regular', 'vip', or 'early_bird'
 * @returns {Promise<Object>} PayU parameters for form submission
 */
export async function createPayment(eventId, ticketType = 'regular') {
  try {
    const res = await api.post('/api/payments/create-payment', {
      event_id: eventId,
      ticket_type: ticketType,
    })
    return res
  } catch (err) {
    console.error('paymentService.createPayment error', err)
    throw err
  }
}

/**
 * Redirect to PayU payment gateway
 * @param {Object} payuParams - PayU parameters from createPayment response
 */
export function redirectToPayU(payuParams) {
  // Create form and submit to PayU
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = PAYU_BASE_URL

  // Required PayU fields - must all be present
  const requiredFields = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'hash', 'surl', 'furl']
  const optionalFields = ['phone', 'service_provider']

  // Add required fields (always add, use empty string as fallback)
  requiredFields.forEach(field => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = field
    input.value = payuParams[field] ?? ''
    form.appendChild(input)
  })

  // Add optional fields if present
  optionalFields.forEach(field => {
    if (payuParams[field] !== undefined && payuParams[field] !== null) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = field
      input.value = payuParams[field]
      form.appendChild(input)
    }
  })

  // Debug log
  console.log('PayU Form Params:', Object.fromEntries(
    Array.from(form.elements).map(el => [el.name, el.value])
  ))

  document.body.appendChild(form)
  form.submit()
}

/**
 * Initiate payment flow - creates payment and redirects to PayU
 * @param {string} eventId - Event ID
 * @param {string} ticketType - Ticket type
 * @returns {Promise<Object>} Response data (if free ticket, returns ticket details)
 */
export async function initiatePayment(eventId, ticketType = 'regular') {
  const res = await createPayment(eventId, ticketType)
  
  // If free ticket, no payment needed
  if (res.is_free) {
    return res
  }
  
  // If payment already initiated, return redirect info
  if (res.redirect) {
    return res
  }
  
  // Redirect to PayU
  redirectToPayU(res)
  return res
}

/**
 * Get order status by transaction ID
 * @param {string} txnid - Transaction ID
 * @returns {Promise<Object>} Order details
 */
export async function getOrderStatus(txnid) {
  try {
    const res = await api.get(`/api/payments/order/${txnid}`)
    return res
  } catch (err) {
    console.error('paymentService.getOrderStatus error', err)
    throw err
  }
}

/**
 * Fetch payments from backend
 * @param {Object} filters - Query filters
 * @param {string} [filters.event_id] - Filter by event ID
 * @param {string} [filters.status] - Filter by payment status
 * @param {string} [filters.user_id] - Filter by user ID (for students to see only their payments)
 * @returns {Promise<Array>} Array of mapped payment objects
 */
export async function getAllPayments(filters = {}) {
	try {
		const qs = []
		if (filters.event_id) qs.push(`event_id=${encodeURIComponent(filters.event_id)}`)
		if (filters.status) qs.push(`status=${encodeURIComponent(filters.status)}`)
		if (filters.user_id) qs.push(`user_id=${encodeURIComponent(filters.user_id)}`)
		const query = qs.length ? `?${qs.join('&')}` : ''
		const res = await api.get(`/api/payments${query}`)
		const raw = (res && res.data && Array.isArray(res.data.payments)) ? res.data.payments : (res && Array.isArray(res.payments) ? res.payments : [])
		return (raw || []).map(mapPaymentResponse)
	} catch (err) {
		console.error('paymentService.getAllPayments error', err)
		if (err && err.status === 404) return []
		throw err
	}
}

/**
 * Map backend payment response to frontend format
 * @param {Object} p - Raw payment object from backend
 * @returns {Object} Mapped payment object
 */
function mapPaymentResponse(p) {
	// Handle populated ticket_id object
	const ticket = p.ticket_id && typeof p.ticket_id === 'object' ? {
		id: p.ticket_id._id,
		ticketCode: p.ticket_id.ticket_code,
		status: p.ticket_id.status,
		paymentStatus: p.ticket_id.payment_status,
	} : p.ticket_id || null

	// Handle populated event_id object
	const event = p.event_id && typeof p.event_id === 'object' ? {
		id: p.event_id._id,
		eventName: p.event_id.event_name,
		eventDate: p.event_id.event_date,
	} : p.event_id || null

	// Handle productinfo object
	const productInfo = p.productinfo && typeof p.productinfo === 'object' ? {
		description: p.productinfo.description,
		ticketType: p.productinfo.ticket_type,
		eventName: p.productinfo.event_name,
		price: p.productinfo.price,
	} : null

	return {
		id: p._id || p.id,
		txnid: p.txnid,
		amount: Number(p.amount) || 0,
		status: p.status || 'pending',
		paymentDate: p.payment_date,
		createdAt: p.created_at || p.createdAt,
		updatedAt: p.updated_at || p.updatedAt,
		// User info
		userId: typeof p.user_id === 'object' ? p.user_id._id : p.user_id,
		fullName: p.fullName,
		email: p.email,
		phone: p.phone,
		// Nested objects
		ticket,
		event,
		productInfo,
		// PayU response data
		mihpayid: p.mihpayid,
		mode: p.mode,
		bankRefNum: p.bank_ref_num,
		bankcode: p.bankcode,
		// Keep raw for debugging
		raw: p,
	}
}
/**
 * Get payments for a specific event
 * @param {string} eventId - Event ID
 * @param {string} [userId] - Optional user ID to filter (for students)
 * @returns {Promise<Object>} Object with payments array and count
 */
export async function getPaymentsByEvent(eventId, userId = null) {
	try {
		if (!eventId) return { payments: [], count: 0 }
		const qs = [`event_id=${encodeURIComponent(eventId)}`]
		if (userId) qs.push(`user_id=${encodeURIComponent(userId)}`)
		const query = `?${qs.join('&')}`
		const res = await api.get(`/api/payments${query}`)
		const items = (res && res.payments) ? res.payments : []
		const mapped = (items || []).map(mapPaymentResponse)
		return { payments: mapped, count: (res && typeof res.count === 'number') ? res.count : mapped.length }
	} catch (err) {
		console.error('paymentService.getPaymentsByEvent error', err)
		if (err && err.status === 404) return { payments: [], count: 0 }
		throw err
	}
}

/**
 * Get payments for current student (convenience method)
 * @param {string} userId - Current user's ID
 * @param {Object} [filters] - Additional filters
 * @returns {Promise<Array>} Array of mapped payment objects
 */
export async function getMyPayments(userId, filters = {}) {
	if (!userId) return []
	return getAllPayments({ ...filters, user_id: userId })
}
