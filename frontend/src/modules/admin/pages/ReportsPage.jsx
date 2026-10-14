import React, { useEffect, useState } from 'react'
import * as eventService from '@/api/events.api'
import * as ticketService from '@/api/tickets.api'
import * as paymentService from '@/api/payments.api'

function pct(present, registered) {
  if (!registered) return '0%'
  return Math.round((present / registered) * 100) + '%'
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers.join(',')]
  for (const r of rows) {
    const line = headers.map((h) => {
      const key = h
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
      const val = r[key] !== undefined ? String(r[key]) : ''
      return '"' + val.replace(/"/g, '""') + '"'
    })
    csv.push(line.join(','))
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function exportAttendance() {
  const headers = ['Event Name', 'Registered', 'Present', 'Absent', 'Attendance %']
  const rows = attendanceRows.map((r) => ({
    event_name: r.event,
    registered: r.registered,
    present: r.present,
    absent: r.absent,
    attendance___: pct(r.present, r.registered)
  }))
  const mapped = rows.map((r) => ({
    'event name': r.event_name,
    registered: r.registered,
    present: r.present,
    absent: r.absent,
    'attendance %': r.attendance___
  }))
  downloadCSV('attendance_report.csv', headers, mapped)
}

function exportRevenue(rows) {
  const headers = ['Event Name', 'Ticket Price', 'Tickets Sold', 'Revenue Generated']
  const mapped = (rows || []).map((r) => ({
    'event name': r.event,
    'ticket price': r.price,
    'tickets sold': r.sold,
    'revenue generated': r.revenue
  }))
  downloadCSV('revenue_report.csv', headers, mapped)
}

export default function ReportsPage() {
  const [events, setEvents] = useState([])
  const [tickets, setTickets] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [revPage, setRevPage] = useState(1)
  const [revPageSize, setRevPageSize] = useState(10)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [evs, tks, pays] = await Promise.all([
          eventService.getAllEvents(),
          ticketService.getAllTickets(),
          paymentService.getAllPayments(),
        ])
        if (!mounted) return
        setEvents(evs || [])
        setTickets(tks || [])
        setPayments(pays || [])
      } catch (e) {
        console.error('Failed to load reports data', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const totalEvents = events.length
  // /api/users is REMAINING — show feature pending
  const totalUsers = 'Feature Pending Backend API'
  const totalTickets = tickets.length
  const totalRevenue = (payments || []).filter(p => ['success', 'paid', 'completed'].includes(String(p.status || p.payment_status || '').toLowerCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const summary = [
    { id: 1, label: 'Total Events', value: totalEvents },
    { id: 2, label: 'Total Users', value: totalUsers },
    { id: 3, label: 'Total Tickets', value: totalTickets },
    { id: 4, label: 'Total Revenue', value: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(totalRevenue) }
  ]

  const revenueRows = (events || []).map((ev) => {
    const evTickets = (tickets || []).filter(t => String(t.eventId) === String(ev.id) || String(t.event_id) === String(ev.id))
    const sold = evTickets.length
    const evPayments = (payments || []).filter(p => String(p.eventId || p.event || p.event_id || p.raw?.event_id) === String(ev.id))
    const revenue = evPayments.filter(p => ['success', 'paid', 'completed'].includes(String(p.status || p.payment_status || '').toLowerCase())).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    return { id: ev.id, event: ev.name || ev.title || ev.event_name, price: ev.price != null ? (typeof ev.price === 'number' ? `₹${ev.price}` : ev.price) : '-', sold, revenue: `₹${revenue.toFixed(2)}` }
  })

  // pagination for revenue rows
  const revTotal = (revenueRows || []).length
  const revTotalPages = Math.max(1, Math.ceil(revTotal / revPageSize))
  const revStart = (revPage - 1) * revPageSize
  const revPaginated = (revenueRows || []).slice(revStart, revStart + revPageSize)

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Analyze platform performance and event insights</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportAttendance} className="px-3 py-2 bg-white border border-gray-200 text-sm rounded-md hover:bg-gray-50">Export Attendance</button>
          <button onClick={() => exportRevenue(revenueRows)} className="px-3 py-2 bg-white border border-gray-200 text-sm rounded-md hover:bg-gray-50">Export Revenue</button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900">Attendance Report</h2>
            <div className="text-sm text-gray-500">Overview by event</div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead>
                <tr className="bg-white">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Event Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Registered</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Present</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Absent</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Attendance %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {/* Attendance still uses placeholders until attendance endpoint exists */}
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">Feature Pending</td>
                  <td className="px-4 py-3 text-right text-gray-600">-</td>
                  <td className="px-4 py-3 text-right text-gray-600">-</td>
                  <td className="px-4 py-3 text-right text-gray-600">-</td>
                  <td className="px-4 py-3 text-right text-gray-600">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900">Revenue Overview</h2>
            <div className="text-sm text-gray-500">Revenue by event</div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead>
                <tr className="bg-white">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Event Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Ticket Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Tickets Sold</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {revPaginated.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{r.event}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.price}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.sold}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 flex items-center justify-between">
            <div className="text-xs text-gray-600">Showing {revStart + 1} to {Math.min(revStart + revPaginated.length, revTotal)} of {revTotal} events</div>
            <div className="flex items-center gap-2">
              <select value={revPageSize} onChange={(e) => { setRevPageSize(Number(e.target.value)); setRevPage(1) }} className="px-2 py-1 border rounded text-sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
              <button onClick={() => setRevPage(p => Math.max(1, p - 1))} disabled={revPage <= 1} className={`px-3 py-1 border rounded text-sm ${revPage <= 1 ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>Prev</button>
              <div className="hidden sm:flex items-center gap-1">
                {(() => {
                  const pages = []
                  const maxButtons = 5
                  let start = Math.max(1, revPage - Math.floor(maxButtons / 2))
                  let end = start + maxButtons - 1
                  if (end > revTotalPages) { end = revTotalPages; start = Math.max(1, end - maxButtons + 1) }
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button key={i} onClick={() => setRevPage(i)} className={`px-3 py-1 border rounded text-sm ${i === revPage ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}>{i}</button>
                    )
                  }
                  return pages
                })()}
              </div>
              <button onClick={() => setRevPage(p => Math.min(revTotalPages, p + 1))} disabled={revPage >= revTotalPages} className={`px-3 py-1 border rounded text-sm ${revPage >= revTotalPages ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white hover:bg-gray-50'}`}>Next</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
