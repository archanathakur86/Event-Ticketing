import React from 'react'

export default function EmptyState({ message = 'No data' }) {
  return <div className="empty-state">{message}</div>
}
