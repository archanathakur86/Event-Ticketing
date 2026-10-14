import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEventById } from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import * as paymentService from '@/api/payments.api'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'

export default function EventAnalyticsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [tickets, setTickets] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const ev = await getEventById(id)
        const allTickets = await ticketService.getAllTickets()
        const eventTickets = (allTickets || []).filter(t => String(t.eventId) === String(id))
        const allPayments = await paymentService.getAllPayments()
        const eventPayments = (allPayments || []).filter(p => String(p.meta?.eventId) === String(id))
        if (!mounted) return
        setEvent(ev)
        setTickets(eventTickets)
        setPayments(eventPayments)
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="p-6">Loading analytics...</div>
  if (!event) return <div className="p-6">Event not found</div>

  const registrations = tickets.length
  const revenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const capacity = Number(event.capacity || 0)
  const fill = capacity > 0 ? Math.round((registrations / capacity) * 100) : 0
  const months = 6
  const monthlyData = useMemo(() => {
    const now = new Date()
    const arr = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      arr.push({ key, label: d.toLocaleString(undefined, { month: 'short' }), registrations: 0, revenue: 0 })
    }

    tickets.forEach(t => {
      const dt = new Date(t.createdAt || t.created_at || Date.now())
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const row = arr.find(a => a.key === k)
      if (row) row.registrations += 1
    })

    payments.forEach(p => {
      const dt = new Date(p.createdAt || p.created_at || Date.now())
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const row = arr.find(a => a.key === k)
      if (row) row.revenue += Number(p.amount) || 0
    })

    return arr.map(a => ({ name: a.label, registrations: a.registrations, revenue: Number(a.revenue.toFixed(2)) }))
  }, [tickets, payments])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics — {event.name}</h1>
          <p className="text-sm text-gray-500">Overview of registrations and revenue</p>
        </div>
        <div>
          <button onClick={() => navigate(`/admin/events/${id}`)} className="px-3 py-2 bg-gray-100 rounded-md text-sm">Back</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500">Registrations</div>
          <div className="text-xl font-medium text-gray-900">{registrations}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500">Revenue</div>
          <div className="text-xl font-medium text-gray-900">${revenue.toFixed(2)}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500">Fill %</div>
          <div className="text-xl font-medium text-gray-900">{fill}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Registrations (last {months} months)</h3>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="registrations" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Revenue (last {months} months)</h3>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
