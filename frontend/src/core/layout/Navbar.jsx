import React, { useState, useRef, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { showToast } from '../../components/ui/Toast'
import { logout } from '@/api/auth.api'
import { getUnreadCount } from '@/api/notifications.api'

export default function Navbar({ onOpenCoordinatorMenu }) {
  const { user, setUser } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef()
  const location = useLocation()
  const navigate = useNavigate()

  const isAdminRoute = location.pathname.startsWith('/admin')
  const roleLower = (user?.role || '').toLowerCase()
  const roleLowerNormalized = roleLower.replace(/\s+/g, '')
  const isAdminUser = ['superadmin', 'coordinator', 'administration', 'admin'].includes(roleLower) || roleLowerNormalized === 'superadmin'
  const isCoordinatorUser = roleLower.includes('coordinator')
  const isStudentUser = roleLower.includes('student')
  const showNotificationBell = isCoordinatorUser || isStudentUser
  const isCoordinatorRoute = location.pathname.startsWith('/coordinator') || location.pathname.startsWith('/admin/coordinator')
  const showPublicNav = !isAdminRoute && !isCoordinatorRoute && !isCoordinatorUser

  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)

    let mounted = true
    async function fetchUnreadCount() {
      try {
        if (!user || !mounted) return
        const count = await getUnreadCount()
        if (mounted) setUnreadCount(count)
      } catch (err) {
        console.error('Failed to fetch unread count:', err)
      }
    }
    
    fetchUnreadCount()
    const intervalId = window.setInterval(fetchUnreadCount, 15000)
    
    // Refresh count when notifications change
    function onNotificationsChanged() {
      fetchUnreadCount()
    }
    function onWindowFocus() {
      fetchUnreadCount()
    }
    window.addEventListener('notifications:changed', onNotificationsChanged)
    window.addEventListener('focus', onWindowFocus)

    return () => {
      mounted = false
      window.clearInterval(intervalId)
      document.removeEventListener('click', onDoc)
      window.removeEventListener('notifications:changed', onNotificationsChanged)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [user])

  function handleLogout() {
    ;(async () => {
      try {
        await logout()
      } catch (e) {}
      if (setUser) setUser(null)
      try { showToast({ title: 'Logged out', message: 'You have been logged out', type: 'info' }) } catch (e) {}
      try { navigate('/') } catch (e) { window.location.href = '/' }
    })()
  }

  const title = mapPathToTitle(location.pathname)

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
        {title === 'Events' ? (
          <Link to="/events" className="text-lg font-semibold text-gray-800">{title}</Link>
        ) : isAdminRoute || isCoordinatorRoute ? (
          <div className="flex items-center gap-6">
            {isCoordinatorRoute && onOpenCoordinatorMenu && (
              <button
                type="button"
                onClick={onOpenCoordinatorMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 md:hidden"
                aria-label="Open sidebar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div className="text-2xl font-semibold text-gray-800">{title === 'Overview' ? (isCoordinatorRoute || isCoordinatorUser ? 'Coordinator' : 'Admin') : title}</div>
          </div>
        ) : showPublicNav ? (
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <svg className="h-8 w-8" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="8" fill="#123386" />
                <path d="M12 28c4-6 8-10 12-10s8 4 12 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="24" cy="18" r="4" fill="#ffffff" />
              </svg>
              <span className="text-lg font-extrabold text-gray-800">ConfNow</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-4">
              <Link
                to="/"
                className={`text-sm ${location.pathname === '/' ? 'text-gray-900 font-medium' : 'text-gray-600'} hover:text-gray-900`}
              >
                Home
              </Link>

              <Link
                to="/events"
                className={`text-sm ${location.pathname.startsWith('/events') ? 'text-gray-900 font-medium' : 'text-gray-600'} hover:text-gray-900`}
              >
                Events
              </Link>

              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
                Login
              </Link>

              <Link to="/register" className="text-sm text-indigo-600 font-medium hover:underline">
                Sign Up
              </Link>
            </nav>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="text-lg font-semibold text-gray-800">{isCoordinatorUser || isCoordinatorRoute ? 'Coordinator' : 'Portal'}</div>
          </div>
        )}

              <div className="flex items-center gap-4">
                {user ? (
                  <div className="flex items-center gap-3">
                    {/* Notification bell placed before avatar */}
                    {showNotificationBell ? (
                      <button 
                        onClick={() => {
                          if (isCoordinatorRoute || isCoordinatorUser) {
                            navigate('/coordinator/notifications')
                          } else {
                            navigate('/student/notifications')
                          }
                        }} 
                        title="Notifications" 
                        id="nav-notif-btn" 
                        className="ml-3 relative inline-flex items-center justify-center w-9 h-9 rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    ) : null}
                    <div className="h-9 w-9 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-semibold">{(user.name||user.username||'A').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-sm font-medium text-gray-800">{user.name || user.username}</div>
                      <div className="text-xs text-gray-500">{user.role || ''}</div>
                    </div>
                    <button onClick={handleLogout} className="ml-1 inline-flex items-center gap-2 px-3 py-1 border rounded text-sm text-gray-700 hover:bg-gray-50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                      </svg>
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Login</Link>
                    <Link to="/register" className="text-sm text-indigo-600 font-medium hover:underline">Sign Up</Link>
                  </div>
                )}
              </div>
      </div>
    </header>
  )
}

function mapPathToTitle(path) {
  if (path.startsWith('/events')) return 'Events'
  if (path.startsWith('/users')) return 'Users'
  if (path.startsWith('/attendance')) return 'Attendance'
  if (path.startsWith('/notifications')) return 'Notifications'
  if (path.startsWith('/logs')) return 'Login Logs'
  if (path.startsWith('/admin')) return 'Overview'
  return 'ConfNow'
}
