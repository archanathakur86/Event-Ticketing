import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import CoordinatorSidebar from './CoordinatorSidebar'
import useAuthStore from '@/store/authStore'

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { user } = useAuthStore()
  const isCoordinator = String(user?.role || '').toLowerCase().includes('coordinator')

  useEffect(() => {
    function setInitial() {
      setCollapsed(window.innerWidth < 768)
      if (window.innerWidth >= 768) setMobileSidebarOpen(false)
    }
    setInitial()
    window.addEventListener('resize', setInitial)
    return () => window.removeEventListener('resize', setInitial)
  }, [])

  const sidebarWidthClass = isCoordinator
    ? (collapsed ? 'md:ml-20' : 'md:ml-72')
    : (collapsed ? 'md:ml-20' : 'md:ml-72')

  return (
    <div className={`min-h-screen bg-[#F8FAFC] overflow-x-hidden ${sidebarWidthClass} transition-all duration-200`}> 
      {isCoordinator ? (
        <>
          <CoordinatorSidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((s) => !s)}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        </>
      ) : (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((s) => !s)} />
      )}

      <div className="min-h-screen flex flex-col">
        <Navbar onOpenCoordinatorMenu={isCoordinator ? () => setMobileSidebarOpen(true) : undefined} />
        <main className="flex-1 overflow-visible p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
          <div className="w-full max-w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
