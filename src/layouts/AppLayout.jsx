import React from 'react'
import { Outlet } from 'react-router-dom'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-theme-primary text-theme-text">
      <main className="pt-14">{children ?? <Outlet />}</main>
    </div>
  )
}
