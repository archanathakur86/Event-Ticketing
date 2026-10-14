import React, { useEffect, useState } from 'react'
import ChartContainer from './ChartContainer'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import ChartTooltip from './ChartTooltip'
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

export default function MonthlyRegistrationsChart({ months = 6 }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // Use admin endpoint to get ALL tickets
        const response = await ticketService.getAdminTickets({})
        const tickets = response?.tickets || []
        const monthsArr = getLastNMonths(months)
        const counts = Object.fromEntries(monthsArr.map(m => [m.key, 0]))

        ;(tickets || []).forEach(t => {
          const d = new Date(t.created_at || t.createdAt)
          if (isNaN(d)) return
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (key in counts) counts[key] = (counts[key] || 0) + 1
        })

        const chartData = monthsArr.map(m => ({ month: m.label, count: counts[m.key] || 0 }))
        if (mounted) setData(chartData)
      } catch (err) {
        console.error('Failed to load monthly registrations', err)
        if (mounted) setData([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()

    function onChange() { load() }
    window.addEventListener('tickets:changed', onChange)
    return () => { mounted = false; window.removeEventListener('tickets:changed', onChange) }
  }, [months])

  const hasAny = (data || []).some(d => Number(d.count) > 0)

  return (
    <ChartContainer title="Monthly Registrations" subtitle={`Last ${months} months`} loading={loading}>
      {!loading && !hasAny && (
        <div className="mb-2 text-sm text-gray-500">No registrations in the selected range — showing zeros.</div>
      )}

      {!loading && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
              <YAxis allowDecimals={false} tick={{ fill: '#6b7280' }} />
              <Tooltip content={(props) => <ChartTooltip {...props} />} />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
