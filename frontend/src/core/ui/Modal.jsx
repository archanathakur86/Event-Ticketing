import React from 'react'

export default function Modal({ children, open }) {
  if (!open) return null
  return <div className="modal">{children}</div>
}
