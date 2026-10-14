import React, { useEffect, useState, useMemo } from 'react'
import * as paymentService from '@/api/payments.api'
import { getCurrentUser } from '@/api/auth.api'
import useAuthStore from '@/store/authStore'

export default function StudentPayments() {
  const { user } = useAuthStore()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const f = {}
        if (statusFilter && statusFilter !== 'all') f.status = statusFilter
        const pays = await paymentService.getAllPayments(f)
        if (!mounted) return
        setPayments(pays || [])
      } catch (e) {
        console.error('Failed to load payments', e)
        if (mounted) setPayments([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (user) load()
    return () => { mounted = false }
  }, [user])

  useEffect(() => {
    async function refresh() {
      try {
        const u = await getCurrentUser()
        if (!u) return
        const f = {}
        if (statusFilter && statusFilter !== 'all') f.status = statusFilter
        const pays = await paymentService.getAllPayments(f)
        setPayments(pays || [])
      } catch (e) { }
    }
    window.addEventListener('payments:changed', refresh)
    return () => window.removeEventListener('payments:changed', refresh)
  }, [])

  const totalSpent = (payments || []).filter(p => String(p.status).toLowerCase() === 'success' || String(p.status).toLowerCase() === 'paid').reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const paid = payments.filter(p => String(p.status).toLowerCase() === 'success' || String(p.status).toLowerCase() === 'paid')
  const pending = payments.filter(p => String(p.status).toLowerCase() === 'pending')
  const refunded = payments.filter(p => String(p.status).toLowerCase() === 'refunded')

  const visible = useMemo(() => {
    if (!statusFilter || statusFilter === 'all') return payments
    return payments.filter(t => String(t.status || '').toLowerCase() === String(statusFilter).toLowerCase())
  }, [payments, statusFilter])

  const downloadInvoice = (t) => {
    try {
      const invoice = {
        invoiceId: `INV-${t.id}`,
        ticketId: t.ticketId || null,
        amount: t.amount || 0,
        status: t.status || 'Unknown',
        date: t.createdAt || new Date().toISOString(),
        userId: t.userId || null,
        eventId: t.eventId || null,
      }
      const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceId}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Invoice download failed', e)
      alert('Failed to download invoice')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-3 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Payments</h2>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-lg font-bold">₹{totalSpent}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-gray-600">Filter:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded text-sm">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {visible.map(t => (
          <div key={t.id} className="p-4 bg-white rounded shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-medium">Ticket: {t.ticketId || '—'}</div>
              <div className="text-sm text-gray-500">Status: {t.status} · ₹{t.amount || 0} · Event: {t.eventId || '—'}</div>
              <div className="text-xs text-gray-400">Created: {new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadInvoice(t)} className="px-3 py-1 border rounded text-sm">Invoice</button>
            </div>
          </div>
        ))}
        {!visible.length && <div className="text-gray-500">No transactions found.</div>}
      </div>
    </div>
  )
}
