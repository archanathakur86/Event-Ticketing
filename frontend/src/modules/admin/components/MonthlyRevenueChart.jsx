import React, { useEffect, useState } from 'react'
import ChartContainer from './ChartContainer'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import ChartTooltip from './ChartTooltip'
import * as paymentService from '@/api/payments.api'
import * as ticketService from '@/api/tickets.api'

function getLastNMonths(n = 6) {
  const res = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString(undefined, { month: 'short' })
    res.push({ key, label })
  }
  return res
}

const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })

export default function MonthlyRevenueChart({ months = 6 }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // Use admin tickets endpoint for revenue from booked tickets
        const [payments, ticketsResponse] = await Promise.all([
          paymentService.getAllPayments(),
          ticketService.getAdminTickets({ status: 'booked' })
        ])
        const tickets = ticketsResponse?.tickets || []
        const monthsArr = getLastNMonths(months)
        const totals = Object.fromEntries(monthsArr.map(m => [m.key, 0]))

        // Primary: from successful payments
        ;(payments || []).forEach(p => {
          const status = String(p.payment_status || p.status || '').toLowerCase()
          if (status && !['success', 'paid'].includes(status)) return
          const d = new Date(p.created_at || p.createdAt || p.payment_date)
          if (isNaN(d)) return
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (key in totals) totals[key] = (totals[key] || 0) + (Number(p.amount) || 0)
        })

        // Fallback: if no payment revenue, use ticket prices
        const hasPaymentRevenue = Object.values(totals).some(v => Number(v) > 0)
        if (!hasPaymentRevenue) {
          ;(tickets || []).forEach(t => {
            const d = new Date(t.created_at || t.createdAt)
            if (isNaN(d)) return
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (key in totals) totals[key] = (totals[key] || 0) + (Number(t.price || 0))
          })
        }

        const chartData = monthsArr.map(m => ({ month: m.label, revenue: totals[m.key] || 0 }))
        if (mounted) setData(chartData)
      } catch (err) {
        console.error('Failed to load monthly revenue', err)
        if (mounted) setData([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()

    function onChange() { load() }
    window.addEventListener('payments:changed', onChange)
    window.addEventListener('tickets:changed', onChange)
    return () => { mounted = false; window.removeEventListener('payments:changed', onChange); window.removeEventListener('tickets:changed', onChange) }
  }, [months])

  const hasAny = (data || []).some(d => Number(d.revenue) > 0)

  return (
    <ChartContainer title="Monthly Revenue" subtitle={`Last ${months} months`} loading={loading}>
      {!loading && !hasAny && (
        <div className="mb-2 text-sm text-gray-500">No revenue in the selected range — showing zeros.</div>
      )}

      {!loading && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 6 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
            <XAxis type="number" tick={{ fill: '#6b7280' }} tickFormatter={(v) => currencyFormatter.format(v)} />
            <YAxis dataKey="month" type="category" tick={{ fill: '#6b7280' }} />
            <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => currencyFormatter.format(v)} />} />
            <Bar dataKey="revenue" fill="#0ea5a4" radius={[6,6,6,6]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
