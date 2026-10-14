import React from 'react'

export default function MetricCard({ title, value, subtitle, icon, iconBg = 'bg-blue-50', iconColor = 'text-blue-600', className = '' }) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4 ${className}`}>
      <div className={`w-12 h-12 flex items-center justify-center rounded-md ${iconBg} ${iconColor}`}>
        {icon || (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
          </svg>
        )}
      </div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>
    </div>
  )
}
