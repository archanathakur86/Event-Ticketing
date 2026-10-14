import { api } from './client'

const PAYU_BASE_URL = import.meta.env.VITE_PAYU_BASE_URL || 'https://test.payu.in/_payment'

function normalizePaymentInitResponse(res: any) {
  if (!res || typeof res !== 'object') return res

  // Keep backward compatibility for pages that expect payu_url + payu_params.
  if (res?.payu_url && res?.payu_params) return res

  const required = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'hash', 'surl', 'furl']
  const hasPayuFields = required.every((field) => res[field] !== undefined && res[field] !== null)

  if (!hasPayuFields) return res

  return {
    ...res,
    payu_url: PAYU_BASE_URL,
    payu_params: {
      key: res.key,
      txnid: res.txnid,
      amount: res.amount,
      productinfo: res.productinfo,
      firstname: res.firstname,
      email: res.email,
      phone: res.phone,
      surl: res.surl,
      furl: res.furl,
      hash: res.hash,
      service_provider: res.service_provider,
    },
  }
}

export async function getAllPayments(query: any = {}) {
  const q = Object.keys(query || {}).length ? ('?' + new URLSearchParams(query).toString()) : ''
  const res = await api.get(`/api/payments${q}`)
  // normalize to array for callers that expect a list
  if (Array.isArray(res)) return res
  if (res && Array.isArray((res as any).payments)) return (res as any).payments
  if (res && Array.isArray((res as any).data)) return (res as any).data
  return []
}

export async function initiatePayment(payload: { event_id: string | number; ticket_type?: string }) {
  const res = await api.post('/api/payments/create-payment', payload)
  return normalizePaymentInitResponse(res)
}

export async function getPaymentById(id: string | number) {
  const res = await api.get(`/api/payments/${id}`)
  return res
}

export async function getPaymentsByEvent(eventId: string | number) {
  const res = await api.get(`/api/payments?event_id=${encodeURIComponent(String(eventId))}`)
  if (!res) return { count: 0, payments: [] }
  if (Array.isArray(res)) return { count: res.length, payments: res }
  if (res && Array.isArray((res as any).payments)) return { count: (res as any).count || (res as any).payments.length, payments: (res as any).payments }
  if (res && Array.isArray((res as any).data)) return { count: (res as any).count || (res as any).data.length, payments: (res as any).data }
  return { count: 0, payments: [] }
}

export default { getAllPayments, getPaymentById, initiatePayment }
