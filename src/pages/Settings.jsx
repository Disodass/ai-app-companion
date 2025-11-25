import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Settings() {
  const { user, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const loadUserName = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.name) {
              setUserName(userData.name)
            }
          }
        } catch (error) {
          console.error('Error loading user name:', error)
        }
      }
    }

    loadUserName()
  }, [user?.uid])

  const handleLogout = async () => {
    await logout()
    navigate('/home')
  }

  const handleAccountSettings = () => {
    navigate('/account-settings')
  }

  const handleDeleteAccount = () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete your account and ALL data including:\n\n' +
      '• All conversation history\n• Your profile information\n• All settings and preferences\n\n' +
      'This action cannot be undone!\n\n' +
      'Are you sure you want to delete your account?'
    )
    
    if (confirmed) {
      // For now, show another confirmation
      const doubleConfirmed = window.confirm(
        'FINAL WARNING: This will permanently delete everything!\n\n' +
        'Type "DELETE" to confirm (this is just a placeholder - actual implementation needed)'
      )
      
      if (doubleConfirmed) {
        alert('Account deletion functionality needs to be implemented with Firebase Auth and Firestore cleanup.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <header className="bg-theme-card border-b border-theme-border shadow-theme-primary">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/home')}
                className="mr-4 p-2 rounded-md hover:bg-theme-surface transition-colors"
              >
                ← Back
              </button>
              <span className="text-2xl mr-3">🌿</span>
              <h1 className="text-xl font-bold text-theme-text">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* About Me Section */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">About Me</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-medium">
                      {userName ? userName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-theme-text font-medium">
                      {userName || 'Set your name in Account Settings'}
                    </p>
                    <p className="text-theme-text-secondary text-sm">{user?.email}</p>
                    <p className="text-theme-text-secondary text-sm">Member since {new Date().getFullYear()}</p>
                  </div>
                </div>
                <div className="bg-theme-surface rounded-lg p-4">
                  <p className="text-theme-text-secondary text-sm">
                    Welcome to Bestibule! This is your personal dashboard where you can manage your account, 
                    privacy settings, and access important information about our service.
                  </p>
                </div>
              </div>
            </div>

            {/* Legal Section */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Legal</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/privacy-policy')}
                  className="w-full text-left text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={() => navigate('/terms-of-service')}
                  className="w-full text-left text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  Terms of Service
                </button>
                <button 
                  onClick={() => navigate('/cookies')}
                  className="w-full text-left text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  <div>
                    <span className="text-theme-text">Cookie Policy</span>
                    <p className="text-theme-text-secondary text-xs mt-1">
                      Explains how we use cookies to improve your experience and remember your preferences
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-theme-text font-medium">Dark Mode</p>
                    <p className="text-theme-text-secondary text-sm">Toggle between light and dark themes</p>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      darkMode ? 'bg-brand-primary' : 'bg-theme-surface'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>


            {/* Data Management Section */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Data Management</h2>
              <div className="space-y-4">
                <button 
                  onClick={handleAccountSettings}
                  className="w-full bg-theme-surface text-theme-text py-3 px-4 rounded-lg hover:bg-theme-border transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Account Settings</p>
                      <p className="text-theme-text-secondary text-sm">Change email, password, and other account details</p>
                    </div>
                    <span className="text-theme-text-muted">→</span>
                  </div>
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full bg-red-50 text-red-600 py-3 px-4 rounded-lg hover:bg-red-100 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete My Account</p>
                      <p className="text-red-500 text-sm">Permanently delete your account and all data</p>
                    </div>
                    <span className="text-red-400">→</span>
                  </div>
                </button>
              </div>
            </div>


            {/* Support Section */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Support</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-theme-text">Contact Support</span>
                  <span className="text-theme-text-muted text-sm">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-theme-text">Help Center</span>
                  <span className="text-theme-text-muted text-sm">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-theme-text">Send Feedback</span>
                  <span className="text-theme-text-muted text-sm">Coming Soon</span>
                </div>
              </div>
            </div>

            {/* Account Section */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Account</h2>
              <div className="space-y-4">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
