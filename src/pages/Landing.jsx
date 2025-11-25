import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'
import { db } from '../firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function Landing() {
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleNewsletterSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const emailLower = email.trim().toLowerCase()
      
      console.log('📝 Saving subscriber to Firestore:', emailLower)
      
      // Save email to Firestore (use the same collection name as the admin panel)
      const docRef = await addDoc(collection(db, 'newsletter_subscribers'), {
        email: emailLower,
        subscribedAt: serverTimestamp(),
        status: 'active',
        individualBlog: true,
        weeklyRecap: true,
        weeklyPreview: true
      })
      
      console.log('✅ Subscriber saved successfully:', docRef.id)
      console.log('🔄 About to send welcome email...')
      
      // Send welcome email via the secure Cloud Function  
      console.log('🔄 Attempting to send welcome email...')
      
      try {
        console.log('📧 About to import welcome service...')
        
        // Import the welcome email service
        const welcomeService = await import('../services/welcomeSequenceService')
        console.log('✅ Welcome service imported successfully')
        console.log('Welcome service keys:', Object.keys(welcomeService))
        
        if (!welcomeService.sendWelcomeEmail) {
          throw new Error('sendWelcomeEmail function not found in imported module')
        }
        
        console.log('📧 Calling sendWelcomeEmail...')
        await welcomeService.sendWelcomeEmail(emailLower)
        
        console.log('✅ Welcome email sent successfully')
      } catch (emailError) {
        console.error('⚠️ Error sending welcome email:', emailError)
        console.error('Error message:', emailError.message)
        console.error('Error stack:', emailError.stack)
        // Don't fail the signup if email fails - subscriber is already saved
      }
      
      setSuccess(true)
      setEmail('')
      
      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      console.error('❌ Newsletter signup error:', err)
      setError('Something went wrong. Please try again. Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-theme-primary flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🌿</span>
            <h1 className="text-2xl font-bold text-theme-text">Bestibule</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-theme-surface transition-colors text-2xl"
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate('/blog')}
              className="px-4 py-2 text-theme-text hover:text-brand-primary transition-colors"
            >
              Blog
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-2xl">
          <div className="mb-6">
            <span className="inline-block bg-brand-primary/20 text-brand-primary px-4 py-2 rounded-full text-sm font-semibold mb-6">
              Coming Soon
            </span>
          </div>
          
          <h1 className="text-5xl font-bold text-theme-text mb-6">
            Gentle guidance, your way.
          </h1>
          <p className="text-xl text-theme-text-secondary mb-8">
            We're building something special. Join our newsletter for regular insights and updates from our AI supporters.
          </p>
          
          {/* Newsletter Signup Form */}
          <div className="max-w-md mx-auto mb-8">
            {success ? (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 text-green-600 dark:text-green-400">
                ✓ Thanks for subscribing! Check your inbox soon.
              </div>
            ) : (
              <form onSubmit={handleNewsletterSignup} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 rounded-lg bg-theme-surface border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-brand-primary"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-brand-primary text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            )}
            {error && (
              <p className="mt-3 text-red-500 text-sm">{error}</p>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/blog')}
              className="bg-transparent border border-theme-border text-theme-text px-6 py-3 rounded-lg font-semibold hover:bg-theme-surface transition-colors"
            >
              Read Our Blog
            </button>
            <button
              onClick={() => navigate('/learn-more')}
              className="bg-transparent border border-theme-border text-theme-text px-6 py-3 rounded-lg font-semibold hover:bg-theme-surface transition-colors"
            >
              Learn More
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-theme-border">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="text-theme-text-muted">
            © 2025 Bestibule. Supportive AI companions for your journey.
          </div>
          {/* Hidden login link - small and subtle */}
          <button
            onClick={() => navigate('/signin')}
            className="text-xs text-theme-text-muted hover:text-theme-text transition-colors opacity-50 hover:opacity-100"
          >
            Sign In
          </button>
        </div>
      </footer>
    </div>
  )
}
