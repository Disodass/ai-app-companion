import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <div className="text-theme-text">Loading...</div>
        </div>
      </div>
    )
  }

  // Redirect based on authentication status
  if (user) {
    return <Navigate to="/home" replace />
  } else {
    return <Navigate to="/landing" replace />
  }
}
