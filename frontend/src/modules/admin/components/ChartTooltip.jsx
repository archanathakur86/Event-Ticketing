import React from 'react'

export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]
  return (
    <div className="bg-white border border-gray-100 rounded-md p-2 text-sm text-gray-800 shadow-md transition-opacity duration-150 ease-in-out">
      {label && <div className="text-xs text-gray-500">{label}</div>}
      <div className="font-medium">{formatter ? formatter(item.value) : item.value}</div>
    </div>
  )
}
