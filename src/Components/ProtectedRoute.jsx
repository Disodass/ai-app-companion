import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Only these emails have admin access
const ADMIN_EMAILS = [
  'disopate@hotmail.com',
  'disopate@icloud.com'
]

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  console.log('ProtectedRoute: Checking access', { 
    pathname: window.location.pathname,
    userEmail: user?.email,
    loading,
    hasUser: !!user 
  })
  
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-2xl text-theme-text">Loading...</div>
      </div>
    )
  }
  
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to signin')
    return <Navigate to="/signin" replace state={{ from: window.location.pathname }} />
  }
  
  // Check if user has admin access
  if (!ADMIN_EMAILS.includes(user.email)) {
    console.log('ProtectedRoute: Access denied', { userEmail: user.email, adminEmails: ADMIN_EMAILS })
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <div className="text-2xl font-bold text-theme-text mb-2">Access Denied</div>
          <div className="text-theme-text-secondary mb-6">You don't have permission to access this page.</div>
          <div className="text-sm text-theme-text-secondary mb-4">Your email: {user.email}</div>
          <div className="text-xs text-theme-text-secondary mb-4">Path: {window.location.pathname}</div>
          <Navigate to="/" replace />
        </div>
      </div>
    )
  }
  
  console.log('ProtectedRoute: Access granted', { userEmail: user.email, pathname: window.location.pathname })
  
  return children
}

