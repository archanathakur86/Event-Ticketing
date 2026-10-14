import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '@/api/auth.api'
import { showToast } from '../../components/ui/Toast'
import useAuthStore from '@/store/authStore'
import * as ticketService from '@/api/tickets.api'
import * as attendanceService from '@/api/attendance.api'
import * as eventService from '@/api/events.api'

function getAssignedEventsForUser(allEvents, user) {
  const events = Array.isArray(allEvents) ? allEvents.filter(Boolean) : []
  const meIds = [user?.id, user?._id, user?.userId].filter(Boolean).map(String)
  const meEmail = String(user?.email || '').toLowerCase()

  if (events.length === 0) return []

  const hasExplicitAssignment = events.some(ev => ev.coordinatorId || ev.coordinator?._id)
  if (!hasExplicitAssignment) return events

  return events.filter(ev => {
    const coordinatorId = ev.coordinatorId || ev.coordinator?._id || ev.coordinator_id
    const coordinatorEmail = String(ev.coordinator?.email || ev.coordinator_email || ev.coordinatorEmail || '').toLowerCase()
    if (meIds.length > 0 && meIds.includes(String(coordinatorId || ''))) return true
    if (meEmail && coordinatorEmail === meEmail) return true
    return false
  })
}

export default function CoordinatorSidebar({ collapsed, onToggle, mobileOpen = false, onCloseMobile = () => { } }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const compact = collapsed && !mobileOpen

  const items = [
    { key: 'profile', label: 'My Profile', to: '/coordinator/profile' },
    { key: 'dashboard', label: 'Overview', to: '/coordinator' },
    { key: 'events', label: 'My Events', to: '/coordinator/events' },
    { key: 'tickets', label: 'Tickets', to: '/coordinator/tickets' },
    { key: 'attendance', label: 'Attendance', to: '/coordinator/attendance' },
    { key: 'notifications', label: 'Notifications', to: '/coordinator/notifications' },
  ]

  function IconFor(key) {
    if (key === 'events') return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7a2 2 0 012-2h3v12H5a2 2 0 01-2-2V7z" fill="#fff" opacity=".06" /><path d="M8 5h8a2 2 0 012 2v10a2 2 0 01-2 2H8V5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
    if (key === 'tickets') return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 12h.01M12 12h.01M17 12h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
    if (key === 'attendance') return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
    if (key === 'notifications') return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
    )
    if (key === 'profile') return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  }

  const [ticketCount, setTicketCount] = useState(0)
  const [pendingAttendanceCount, setPendingAttendanceCount] = useState(0)

  useEffect(() => {
    let mounted = true
    async function loadCounts() {
      try {
        const allEvents = await eventService.getAllEvents()
        const assigned = getAssignedEventsForUser(allEvents, user)
        const assignedIds = new Set((assigned || []).map(e => String(e.id)))

        const tickets = await ticketService.getAllTickets()
        const tcount = (tickets || []).filter(t => assignedIds.has(String(t.eventId))).length

        const attendance = await attendanceService.fetchAttendance()
        const pending = (attendance || []).filter(a => assignedIds.size === 0 ? false : assignedIds.has(String(a.eventId)) && !['present', 'used', 'attended'].includes(String(a.status || '').toLowerCase())).length

        if (!mounted) return
        setTicketCount(tcount)
        setPendingAttendanceCount(pending)
      } catch (err) {
        console.error('Failed to load coordinator counts', err)
      }
    }
    loadCounts()

    function onChange() { loadCounts() }
    window.addEventListener('events:changed', onChange)
    window.addEventListener('tickets:changed', onChange)
    window.addEventListener('attendance:changed', onChange)
    return () => { mounted = false; window.removeEventListener('events:changed', onChange); window.removeEventListener('tickets:changed', onChange); window.removeEventListener('attendance:changed', onChange) }
  }, [user])

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onCloseMobile}
      />
      <aside
        className={`fixed top-0 left-0 h-screen z-40 bg-white border-r border-gray-200 transition-all duration-200 ease-in-out shadow-lg ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
          } md:translate-x-0 ${compact ? 'md:w-20' : 'md:w-72'}`}
        aria-expanded={!compact}
      >
        <div className="h-full flex flex-col">
          <div className={`flex items-center justify-between ${compact ? 'px-3 py-3' : 'px-4 py-3'} border-b border-gray-100 bg-gradient-to-r from-[#123386] to-[#0b2a60] text-white`}>
            <div className="flex items-center gap-3">
              <div title="ConfNow Coordinator Portal">
                <svg className={`transition-transform ${compact ? 'h-7 w-7 scale-90' : 'h-9 w-9 scale-100'}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="8" fill="#ffffff" />
                  <path d="M12 28c4-6 8-10 12-10s8 4 12 10" stroke="#123386" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="24" cy="18" r="4" fill="#123386" />
                </svg>
              </div>
              {!compact && (
                <div>
                  <div className="font-extrabold tracking-wider text-3xl">ConfNow</div>
                  <div className="text-xs text-white/80">Coordinator Portal</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onToggle} className="hidden md:inline-flex items-center justify-center p-1 rounded hover:bg-white/10" aria-label={collapsed ? 'Expand' : 'Collapse'}>
                <svg className="h-5 w-5 text-white transform transition-transform duration-150" viewBox="0 0 24 24" fill="none">
                  {collapsed ? (
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </button>
              <button onClick={onCloseMobile} className="inline-flex md:hidden items-center justify-center p-1 rounded hover:bg-white/10" aria-label="Close menu">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-6">
            <div className="px-2 space-y-4">
              <div>
                <button className={`${compact ? 'hidden' : 'w-full flex items-center justify-between px-3 mb-2 text-xs uppercase tracking-wider text-gray-400'}`} aria-expanded="true">
                  <span>Overview</span>
                </button>

                <div className={`overflow-hidden ${compact ? 'max-h-96' : 'max-h-none'}`}>
                  <ul className="space-y-1">
                    {items.map(item => (
                      <li key={item.key}>
                        <NavLink
                          to={item.to}
                          title={item.label}
                          onClick={() => onCloseMobile()}
                          className={({ isActive }) =>
                            `group flex items-center gap-3 px-3 py-2 rounded-md text-base text-gray-700 transition-all duration-150 ${isActive ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-500 shadow-sm' : 'hover:bg-gray-50 hover:shadow-sm'
                            }`
                          }
                        >
                          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 transition-transform group-hover:scale-105">
                            {IconFor(item.key)}
                          </span>
                          <span className={`${compact ? 'hidden' : 'inline text-base font-medium'}`}>{item.label}</span>
                          {item.key === 'tickets' && ticketCount > 0 && (
                            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{ticketCount}</span>
                          )}
                          {item.key === 'attendance' && pendingAttendanceCount > 0 && (
                            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">{pendingAttendanceCount}</span>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </nav>

          <div className="px-3 py-3 border-t border-gray-100">
            <div className="h-px bg-gray-100 my-3" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold">{(user?.name || user?.username || 'C').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={`${compact ? 'hidden' : 'flex-1'}`}>
                <div className="text-base font-medium flex items-center gap-2">
                  <span>{user?.name || user?.username || 'Coordinator'}</span>
                </div>
                <div className="text-sm text-gray-500">Coordinator</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {!compact ? (
                <>
                  <button onClick={() => navigate('/coordinator/profile')} className="flex-1 px-3 py-2 rounded-md text-base bg-gray-50 hover:bg-gray-100">Profile</button>
                  <button onClick={async () => { try { await logout() } catch (e) { }; try { showToast({ title: 'Logged out', message: 'You have been logged out', type: 'info' }) } catch (e) { }; try { navigate('/') } catch (e) { window.location.href = '/' } }} className="px-3 py-2 rounded-md text-base bg-red-50 text-red-600 hover:bg-red-100">Logout</button>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full justify-between">
                  <button onClick={() => navigate('/coordinator/profile')} title="Profile" className="w-9 h-9 rounded-md flex items-center justify-center bg-gray-50 hover:bg-gray-100">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt="profile" className="w-7 h-7 object-cover rounded" />
                    ) : (
                      <svg className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM6 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                  <button onClick={async () => { try { await logout() } catch (e) { }; try { showToast({ title: 'Logged out', message: 'You have been logged out', type: 'info' }) } catch (e) { }; try { navigate('/') } catch (e) { window.location.href = '/' } }} title="Logout" className="w-9 h-9 rounded-md flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M17 16l4-4m0 0l-4-4m4 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
