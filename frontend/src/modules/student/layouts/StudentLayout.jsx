import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { logout } from '@/api/auth.api'
import * as notificationService from '@/api/notifications.api'
import { showToast } from '@/components/ui/Toast'

export default function StudentLayout() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const links = [
    { to: '/student', label: 'Overview' },
    { to: '/student/tickets', label: 'My Tickets' },
    { to: '/student/browse', label: 'Browse Events' },
    { to: '/student/notifications', label: 'Notifications' },
    { to: '/student/support', label: 'Support' },
  ]

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    try {
      await logout()
    } catch (e) {}
    if (setUser) setUser(null)
    try {
      showToast({
        title: 'Logged out',
        message: 'You have been logged out',
        type: 'info',
      })
    } catch (e) {}
    try {
      navigate('/')
    } catch (e) {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 md:h-screen md:overflow-hidden md:flex">
      <aside className="hidden md:flex w-72 shrink-0 bg-white border-r shadow-sm flex-col h-screen sticky top-0">
        <div className="bg-[#123386] p-5 border-b text-white">
          <div className="flex items-center gap-3">
            <svg className="h-9 w-9" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="8" fill="#ffffff" />
              <path d="M12 28c4-6 8-10 12-10s8 4 12 10" stroke="#123386" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="18" r="4" fill="#123386" />
            </svg>
            <div>
              <div className="text-lg font-semibold">ConfNow</div>
              <div className="text-xs opacity-90">Student Portal</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600 pl-2' : 'text-gray-700 hover:bg-gray-100'}`}>
              <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-semibold">
                <NavIcon name={l.label} />
              </div>
              <div className="flex-1">{l.label}</div>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-4">
            <div onClick={() => navigate('/student/profile')} role="button" title="Open profile" className="w-12 h-12 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-indigo-100 hover:shadow-sm">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-semibold text-lg">{(user?.name||user?.username||'S').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <div className="text-base font-semibold text-gray-900">{user?.name || user?.username || 'Student'}</div>
                <div className="flex-1" />
                <button title="Open profile settings" aria-label="Open profile settings" onClick={() => navigate('/student/profile')} className="p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.82l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06A2 2 0 014.27 16.88l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 018.12 4.27l.06.06a1.65 1.65 0 001.82.33H10a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c.09.59.58 1.09 1.17 1.17H17a1.65 1.65 0 001.51 1 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.82 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10c.01.62.51 1.12 1.14 1.13H21a2 2 0 010 4h-.09c-.62.01-1.12.51-1.13 1.13v.24z" />
                  </svg>
                </button>
              </div>
              <div className="text-sm muted">Student</div>
            </div>
          </div>
          <div className="mt-3">
            <button onClick={() => window.location.href = '/student/support'} className="w-full px-3 py-2 rounded-md text-sm text-white bg-[#123386] hover:bg-[#17338a]">
              Get Help
            </button>
          </div>
          
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white border-r shadow-xl flex flex-col">
            <div className="bg-[#123386] p-5 border-b text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-white/20 flex items-center justify-center font-bold">K</div>
                <div>
                  <div className="text-lg font-semibold">ConfNow</div>
                  <div className="text-xs opacity-90">Student Portal</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-2 rounded hover:bg-white/10" aria-label="Close menu">✕</button>
            </div>

            <button
              onClick={() => navigate('/student/profile')}
              className="mx-4 mt-4 mb-2 p-3 rounded-xl border border-indigo-100 bg-indigo-50/60 flex items-center gap-3 text-left hover:bg-indigo-50"
              title="Open profile"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center shrink-0">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold">{(user?.name||user?.username||'S').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{user?.name || user?.username || 'Student'}</div>
                <div className="text-xs text-gray-600">My Profile</div>
              </div>
            </button>

            <nav className="p-4 space-y-2 overflow-y-auto">
              {links.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600 pl-2' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-semibold">
                    <NavIcon name={l.label} />
                  </div>
                  <div className="flex-1">{l.label}</div>
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto p-4 border-t">
              <button onClick={handleLogout} className="w-full px-3 py-2 border rounded text-sm flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex min-h-screen flex-col md:h-screen md:overflow-hidden">
        <header className="flex items-center justify-between px-3 sm:px-4 py-3 bg-white border-b">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileNavOpen(true)} className="md:hidden p-2 rounded hover:bg-gray-100" aria-label="Open menu">☰</button>
            <div className="text-xl sm:text-2xl font-semibold">Student</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* notification bell (left of avatar) */}
            <div>
              <NotificationBell />
            </div>
            <button onClick={() => navigate('/student/profile')} title="My Profile" className="w-9 h-9 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-semibold">{(user?.name||'S').charAt(0).toUpperCase()}</span>
              )}
            </button>
            <div className="hidden sm:block text-sm text-gray-600 max-w-[140px] truncate">{user?.name}</div>
            <button onClick={handleLogout} className="px-2 sm:px-3 py-1 border rounded text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pt-1 px-3 sm:px-4 md:px-6 pb-4 sm:pb-6 hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavIcon({ name }) {
  const key = String(name || '').toLowerCase()
  if (key.includes('dash') || key.includes('overview')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    )
  }
  if (key.includes('event')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  if (key.includes('ticket')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2-2 4 4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6" />
      </svg>
    )
  }
  if (key.includes('browse')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.567 3-3.5S13.657 1 12 1 9 2.567 9 4.5 10.343 8 12 8zM6 21h12" />
      </svg>
    )
  }
  if (key.includes('payment')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6" />
      </svg>
    )
  }
  if (key.includes('notification')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )
  }
  if (key.includes('profile')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.485 0 4.805.7 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  if (key.includes('support')) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636A9 9 0 105.636 18.364 9 9 0 0018.364 5.636z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l2 2" />
      </svg>
    )
  }
  // default: generic circle
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  )
}

function NotificationBell() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        if (!user) {
          if (mounted) setUnread(0)
          return
        }
        const count = await notificationService.getUnreadCount()
        if (mounted) setUnread(Number(count) || 0)
      } catch (err) {
        if (mounted) setUnread(0)
      }
    }
    load()
    const onChange = () => load()
    const onFocus = () => load()
    const intervalId = window.setInterval(load, 15000)
    window.addEventListener('notifications:changed', onChange)
    window.addEventListener('focus', onFocus)
    return () => {
      mounted = false
      window.clearInterval(intervalId)
      window.removeEventListener('notifications:changed', onChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [user?.id])

  return (
    <button title="Notifications" onClick={() => navigate('/student/notifications')} className="relative p-2 rounded hover:bg-gray-100">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unread > 0 && (
        <span id="global-unread-count" className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
