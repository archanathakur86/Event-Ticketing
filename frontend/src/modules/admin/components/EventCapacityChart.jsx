import React, { useEffect, useState } from 'react'
import ChartContainer from './ChartContainer'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import ChartTooltip from './ChartTooltip'
import * as eventService from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'

function capacityColor(pct) {
  if (pct > 70) return '#059669' 
  if (pct >= 40) return '#d97706' 
  return '#b91c1c' 
}

export default function EventCapacityChart({ months = 6 }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // Use admin endpoint to get ALL tickets
        const [events, ticketsResponse] = await Promise.all([
          eventService.getAllEvents(), 
          ticketService.getAdminTickets({})
        ])
        const tickets = ticketsResponse?.tickets || []

        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - months)
        const recentTickets = (tickets || []).filter(t => {
          const d = new Date(t.created_at || t.createdAt)
          return !isNaN(d) && d >= cutoff
        })

        // Helper to extract event ID from populated or plain field
        const getEventId = (val) => {
          if (!val) return ''
          if (typeof val === 'string') return val
          if (typeof val === 'object') return String(val._id || val.id || '')
          return String(val)
        }

        const regsByEvent = recentTickets.reduce((acc, t) => {
          const k = getEventId(t.event_id || t.eventId)
          if (!k) return acc
          acc[k] = (acc[k] || 0) + 1
          return acc
        }, {})

        const mapped = (events || []).map(ev => {
          const evId = String(ev._id || ev.id)
          const capacity = Number(ev.capacity ?? ev.availableSeats ?? 0) || 0
          const registered = regsByEvent[evId] || 0
          const pct = capacity > 0 ? Math.round((registered / capacity) * 100) : 0
          return {
            id: evId,
            name: ev.event_name || ev.name || ev.title || `Event ${evId}`,
            capacity,
            registered,
            pct,
          }
        })

        const top = mapped.sort((a,b) => b.pct - a.pct).slice(0,5)
        if (mounted) setData(top)
      } catch (err) {
        console.error('Failed to load event capacity', err)
        if (mounted) setData([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()

    function onChange() { load() }
    window.addEventListener('events:changed', onChange)
    window.addEventListener('tickets:changed', onChange)
    return () => { mounted = false; window.removeEventListener('events:changed', onChange); window.removeEventListener('tickets:changed', onChange) }
  }, [months])

  const hasAny = data && data.length > 0

  return (
    <ChartContainer title="Event Capacity" subtitle={`Top 5 events — last ${months} months`} loading={loading}>
      {!loading && !hasAny && (
        <div className="mb-2 text-sm text-gray-500">No events available in the selected range — showing empty chart.</div>
      )}

      {!loading && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
            <XAxis type="number" domain={[0,100]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#6b7280' }} />
            <YAxis dataKey="name" type="category" width={160} tick={{ fill: '#374151', fontSize: 13 }} />
            <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v}%`} />} />
            <Bar dataKey="pct" isAnimationActive={true}>
              {data.map((entry) => (
                <Cell key={`cell-${entry.id}`} fill={capacityColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  )
}
