import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useMenu } from '../contexts/MenuContext'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebaseConfig'

export default function Home() {
  const { user } = useAuth()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const { setMenuOpen } = useMenu()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/landing')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Redirect to landing if not authenticated
  if (!user) {
    navigate('/landing')
    return null
  }

  // Authenticated user - show clean home dashboard
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header with Hamburger Menu */}
      <header className="bg-theme-card border-b border-theme-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
              title="Open menu"
            >
              <svg className="w-6 h-6 text-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-2xl">🌿</span>
            <h1 className="text-xl font-bold text-theme-text">Bestibule</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text hover:bg-theme-surface rounded-lg transition-colors"
            >
              Logout
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-theme-surface transition-colors text-2xl"
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-theme-text mb-4">
              Welcome to Bestibule
            </h2>
            <p className="text-xl text-theme-text-secondary mb-8">
              Gentle guidance, your way. Choose from 25+ AI supporters to help you on your journey.
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/conversations', { state: { supporterId: 'ai-friend', supporterName: 'Supporter Friend' } })}
                className="btn-brand-primary px-8 py-3 rounded-lg text-lg font-semibold flex items-center justify-center space-x-2"
              >
                <span>💙</span>
                <span>Supporter Friend</span>
              </button>
              <button
                onClick={() => navigate('/supporters')}
                className="btn-secondary px-8 py-3 rounded-lg text-lg font-semibold flex items-center justify-center space-x-2"
              >
                <span>👥</span>
                <span>Browse All Supporters</span>
              </button>
            </div>
          </div>


        </div>
      </main>
    </div>
  )
}