import React from 'react'

export default function ChartContainer({ title, subtitle, children, className = '', loading = false }) {
  return (
    <div className={`bg-slate-50 rounded-lg shadow-sm p-5 md:p-6 overflow-hidden ${className}`}>
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg md:text-xl font-semibold text-slate-900">{title}</div>
            {subtitle && <div className="text-sm text-slate-500 mt-1">{subtitle}</div>}
          </div>
        </div>
      </div>

      <div className="w-full h-56 md:h-72 lg:h-80">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full px-4">
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-40 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
