import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import Routes from './app/routes'
import ToastContainer from './components/ui/Toast'

export default function App() {
  return (
    <BrowserRouter>
      <Routes />
      <ToastContainer />
    </BrowserRouter>
  )
}
