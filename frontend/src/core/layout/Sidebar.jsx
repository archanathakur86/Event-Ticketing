import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { logout } from '@/api/auth.api'
import { showToast } from '../../components/ui/Toast'
import * as notificationService from '@/api/notifications.api'
import * as ticketService from '@/api/tickets.api'

const navGroups = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Overview', to: '/admin', icon: HomeIcon },
      { key: 'manage_users', label: 'Manage Users', to: '/admin/users', icon: UsersIcon },
    ],
  },
  {
    key: 'events',
    label: 'Event Management',
    items: [
      { key: 'events', label: 'Events', to: '/admin/events', icon: CalendarIcon },
      { key: 'attendance', label: 'Attendance', to: '/admin/attendance', icon: CheckIcon },
      { key: 'tickets', label: 'Tickets', to: '/admin/tickets', icon: TicketIcon },
    ],
  },
  {
    key: 'users',
    label: 'User Management',
    items: [
      { key: 'users', label: 'Users', to: '/admin/users', icon: UsersIcon },
      { key: 'logs', label: 'Login Logs', to: '/admin/logs', icon: LogIcon },
    ],
  },
  {
    key: 'comm',
    label: 'Communication',
    items: [
      { key: 'notifications', label: 'Notifications', to: '/admin/notifications', icon: BellIcon },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    items: [
      { key: 'reports', label: 'Reports', to: '/admin/reports', icon: ReportIcon },
    ],
  },
]

// Role-based menu configuration
const menuConfig = {
  superadmin: ['overview', 'events', 'users', 'comm'],
  admin: ['overview', 'events', 'users', 'comm', 'reports'],
  administration: ['overview', 'reports'],
  administrator: ['overview', 'reports'],
  coordinator: ['overview', 'events'],
  support: ['overview', 'comm'],
}

export default function Sidebar({ collapsed, onToggle, isMobileOpen }) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const roleKey = String(user?.role || '').toLowerCase()
  const roleKeyNormalized = roleKey.replace(/\s+/g, '')
  const isAdministrator = roleKey.includes('administrator') || roleKey.includes('administration')
  function resolveTo(to) {
    if (!to) return to
    if (roleKey.includes('coordinator')) {
      if (to.startsWith('/admin')) return to.replace('/admin', '/coordinator')
    }
    if (isAdministrator) {
      if (to === '/admin') return '/administrator'
      if (to === '/admin/users') return '/administrator/users'
      if (to === '/admin/reports') return '/administrator/reports'
      if (to.startsWith('/admin/')) return to.replace('/admin/', '/administrator/')
    }
    return to
  }
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(navGroups.map(g => [g.key, true])))

  function toggleGroup(key) {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingPayments, setPendingPayments] = useState(0)

  useEffect(() => {
    let mounted = true
    async function loadCounts() {
      try {
        const uid = user?.id || user?._id || user?.userId
        const notes = await notificationService.getNotifications(uid)
        const unread = (notes || []).filter(n => !n.read).length
        const tickets = await ticketService.getAllTickets()
        const pending = (tickets || []).filter(t => String(t.paymentStatus).toLowerCase() === 'pending').length
        if (!mounted) return
        setUnreadCount(unread)
        setPendingPayments(pending)
      } catch (err) {
        console.error('Failed to load sidebar counts', err)
      }
    }
    loadCounts()

    function onChange() { loadCounts() }
    window.addEventListener('notifications:changed', onChange)
    window.addEventListener('tickets:changed', onChange)
    window.addEventListener('payments:changed', onChange)
    return () => { mounted = false; window.removeEventListener('notifications:changed', onChange); window.removeEventListener('tickets:changed', onChange); window.removeEventListener('payments:changed', onChange) }
  }, [])
  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 bg-white border-r border-gray-200 transition-all duration-200 ease-in-out ${collapsed ? 'w-20' : 'w-72'
        } shadow-lg`}
      aria-expanded={!collapsed}
    >
      <div className="h-full flex flex-col">
        <div className={`flex items-center justify-between ${collapsed ? 'px-3 py-3' : 'px-4 py-3'} border-b border-gray-100 bg-gradient-to-r from-[#123386] to-[#0b2a60] text-white`}>
          <div className="flex items-center gap-3">
            <div title="ConfNow Admin Portal">
              <svg className={`transition-transform ${collapsed ? 'h-7 w-7 scale-90' : 'h-9 w-9 scale-100'}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="8" fill="#ffffff" />
                <path d="M12 28c4-6 8-10 12-10s8 4 12 10" stroke="#123386" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="24" cy="18" r="4" fill="#123386" />
              </svg>
            </div>

            {!collapsed && (
              <div>
                <div className="font-extrabold tracking-wider text-3xl">ConfNow</div>
                <div className="text-xs text-white/80">
                  {roleKey.includes('administrator') || roleKey.includes('administration') ? 'Administrator Portal' : 'Admin Portal'}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >

            <svg className="h-5 w-5 text-gray-600 transform transition-transform duration-150" viewBox="0 0 24 24" fill="none">
              {collapsed ? (
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <div className="px-2 space-y-4">
            {navGroups
              .filter((group) => {
                // accept admin role; do not treat superadmin as full-bypass here
                if (roleKey === 'admin') return true
                const allowed = menuConfig[roleKey] || menuConfig[roleKeyNormalized]
                if (!allowed) return group.key === 'overview'
                return allowed.includes(group.key)
              })
              .map((group) => {
                const visibleItems = (group.items || []).filter((item) => {
                  if (item.key === 'manage_users') return isAdministrator
                  return true
                })
                if (visibleItems.length === 0) return null
                return (
                  <div key={group.key}>
                    {visibleItems.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleGroup(group.key)}
                          className={`${collapsed ? 'hidden' : 'w-full flex items-center justify-between px-3 mb-2 text-xs uppercase tracking-wider text-gray-400'}`}
                          aria-expanded={!!openGroups[group.key]}
                        >
                          <span>{group.label}</span>
                          <svg className={`h-4 w-4 text-gray-400 transform transition-transform duration-200 ${openGroups[group.key] ? 'rotate-90' : 'rotate-0'}`} viewBox="0 0 24 24" fill="none">
                            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        <div className={`overflow-hidden transition-all duration-200 ${openGroups[group.key] ? 'max-h-96' : 'max-h-0'}`}>
                          <ul className="space-y-1">
                            {visibleItems.map((item) => (
                              <li key={item.key}>
                                <NavLink
                                  to={resolveTo(item.to)}
                                  title={item.label}
                                  className={({ isActive }) =>
                                    `group flex items-center gap-3 px-3 py-2 rounded-md text-base text-gray-700 transition-all duration-150 ${isActive ? 'bg-blue-50 text-blue-600 font-medium border-l-4 border-blue-500 shadow-sm' : 'hover:bg-gray-50 hover:shadow-sm'
                                    }`
                                  }
                                >
                                  <span className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 transition-transform group-hover:scale-105">
                                    <item.icon />
                                  </span>
                                  <span className={`${collapsed ? 'hidden' : 'inline text-base font-medium'}`}>{item.label}</span>
                                  {item.key === 'notifications' && unreadCount > 0 && (
                                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800">{unreadCount}</span>
                                  )}
                                  {item.key === 'dashboard' && pendingPayments > 0 && (
                                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800">{pendingPayments}</span>
                                  )}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </nav>
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="h-px bg-gray-100 my-3" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-semibold">{(user?.name || user?.username || 'A').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className={`${collapsed ? 'hidden' : 'flex-1'}`}>
              <div className="text-base font-medium flex items-center gap-2">
                <span>{user?.name || user?.username || 'Admin'}</span>
              </div>
              <div className="text-sm text-gray-500">{user?.role || 'Administrator'}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {!collapsed ? (
              <>
                <button
                  onClick={() => navigate(roleKey.includes('administrator') || roleKey.includes('administration') ? '/administrator/profile' : '/admin/profile')}
                  className="flex-1 px-3 py-2 rounded-md text-base bg-gray-50 hover:bg-gray-100"
                >
                  Profile
                </button>
                <button onClick={async () => {
                  try { await logout() } catch (e) { }
                  try { showToast({ title: 'Logged out', message: 'You have been logged out', type: 'info' }) } catch (e) { }
                  try { navigate('/') } catch (e) { window.location.href = '/' }
                }} className="px-3 py-2 rounded-md text-base bg-red-50 text-red-600 hover:bg-red-100">Logout</button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full justify-between">
                <button
                  onClick={() => navigate(roleKey.includes('administrator') || roleKey.includes('administration') ? '/administrator/profile' : '/admin/profile')}
                  title="Profile"
                  className="w-9 h-9 rounded-md flex items-center justify-center bg-gray-50 hover:bg-gray-100"
                >
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="profile" className="w-7 h-7 object-cover rounded" />
                  ) : (
                    <svg className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM6 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
                <button onClick={async () => {
                  try { await logout() } catch (e) { }
                  try { showToast({ title: 'Logged out', message: 'You have been logged out', type: 'info' }) } catch (e) { }
                  try { navigate('/') } catch (e) { window.location.href = '/' }
                }} title="Logout" className="w-9 h-9 rounded-md flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M17 16l4-4m0 0l-4-4m4 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            )}
          </div>


        </div>
      </div>
    </aside>
  )
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21V10h14v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LogIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M3 9v2a2 2 0 002 2 2 2 0 002-2V9m0 0V7a2 2 0 00-2-2 2 2 0 00-2 2v2m4 0h14m0 0V7a2 2 0 00-2-2 2 2 0 00-2 2v2m4 0v2a2 2 0 01-2 2 2 2 0 01-2-2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
