import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useNavigate } from 'react-router-dom'
import { updateEmail, updatePassword, sendEmailVerification } from 'firebase/auth'
import { auth, db } from '../firebaseConfig'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export default function AccountSettings() {
  const { user } = useAuth()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState(user?.email || '')
  const [name, setName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadUserName = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.name) {
              setName(userData.name)
            }
          }
        } catch (error) {
          console.error('Error loading user name:', error)
        }
      }
    }

    loadUserName()
  }, [user?.uid])

  const handleUpdateName = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Store name in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        email: user.email,
        updatedAt: new Date()
      }, { merge: true })
      setMessage('Name updated successfully!')
    } catch (error) {
      setError('Failed to update name: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEmail = async (e) => {
    e.preventDefault()
    if (!email || email === user?.email) {
      setError('Please enter a new email address')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await updateEmail(auth.currentUser, email)
      await sendEmailVerification(auth.currentUser)
      setMessage('Email updated! Please check your new email for verification.')
    } catch (error) {
      setError('Failed to update email: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await updatePassword(auth.currentUser, newPassword)
      setMessage('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
    } catch (error) {
      setError('Failed to update password: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendVerification = async () => {
    try {
      await sendEmailVerification(auth.currentUser)
      setMessage('Verification email sent! Please check your inbox.')
    } catch (error) {
      setError('Failed to send verification email: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-theme-primary text-theme-text">
      {/* Header */}
      <header className="bg-theme-card border-b border-theme-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/settings')}
              className="mr-4 p-2 rounded-md hover:bg-theme-surface transition-colors"
            >
              ← Back
            </button>
            <span className="text-2xl">🌿</span>
            <h1 className="text-xl font-bold text-theme-text">Account Settings</h1>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-theme-surface transition-colors text-2xl"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">Current Email</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={user?.email || ''}
                      disabled
                      className="flex-1 bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-theme-text-secondary"
                    />
                    {user?.emailVerified ? (
                      <span className="text-green-600 text-sm">✓ Verified</span>
                    ) : (
                      <button
                        onClick={handleSendVerification}
                        className="text-blue-600 text-sm hover:text-blue-700"
                      >
                        Verify Email
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Update Name */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Update Name</h2>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-theme-text"
                    placeholder="Enter your preferred name"
                    maxLength={50}
                  />
                  <p className="text-theme-text-secondary text-xs mt-1">
                    This name will be shown in your profile.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-primary text-white py-2 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Name'}
                </button>
              </form>
            </div>

            {/* Update Email */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Update Email Address</h2>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">New Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-theme-text"
                    placeholder="Enter new email address"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-primary text-white py-2 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Email'}
                </button>
              </form>
            </div>

            {/* Update Password */}
            <div className="bg-theme-card border border-theme-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Update Password</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-theme-text"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-theme-text"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-primary text-white py-2 px-4 rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Messages */}
            {message && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">{message}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Security Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-yellow-800 font-semibold mb-2">🔒 Security Note</h3>
              <p className="text-yellow-700 text-sm">
                For your security, password changes require you to be recently signed in. 
                If you have trouble updating your password, try signing out and back in first.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
