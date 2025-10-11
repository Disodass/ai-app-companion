import React from 'react'
import { useMenu } from '../contexts/MenuContext'
import { useAuth } from '../contexts/AuthContext'
import { useDarkMode } from '../contexts/DarkModeContext'
import { Link, useNavigate } from 'react-router-dom'

export default function HamburgerMenu() {
  const { open, close } = useMenu()
  const { user, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    close()
    navigate('/home')
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={close}
      />
      
      {/* Menu Panel */}
      <div className="fixed inset-y-0 left-0 w-80 bg-theme-card border-r border-theme-border z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-theme-border">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌿</span>
              <h2 className="text-xl font-bold text-theme-text">Bestibule</h2>
            </div>
            <button
              onClick={close}
              className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
            >
              <svg className="w-6 h-6 text-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              <Link
                to="/home"
                onClick={close}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-theme-surface transition-colors text-theme-text"
              >
                <span className="text-xl">🏠</span>
                <span>Home</span>
              </Link>
              
              <Link
                to="/supporters"
                onClick={close}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-theme-surface transition-colors text-theme-text"
              >
                <span className="text-xl">👥</span>
                <span>Supporters</span>
              </Link>
              
              <Link
                to="/settings"
                onClick={close}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-theme-surface transition-colors text-theme-text"
              >
                <span className="text-xl">⚙️</span>
                <span>Settings</span>
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-theme-border">
            <div className="space-y-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-theme-surface transition-colors text-theme-text w-full"
              >
                <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              {/* User Info */}
              {user && (
                <div className="p-3 rounded-lg bg-theme-surface">
                  <p className="text-sm text-theme-text-secondary">Signed in as</p>
                  <p className="text-theme-text font-medium">{user.email}</p>
                </div>
              )}

              {/* Logout */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-theme-text w-full"
                >
                  <span className="text-xl">🚪</span>
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
