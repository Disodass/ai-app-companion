import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'
import { db } from '../firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { AI_FRIEND, getAllActiveSupporters } from '../data/supporters'
import Logo from '../Components/Logo'

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
            <Logo size="lg" />
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
      <main className="flex-1 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <section className="relative text-center mb-16">
            {/* Layer 2: Atmosphere (empty for now, decorative) */}
            <div 
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              role="presentation"
            >
              {/* Visual layer will go here - currently empty */}
              {/* Future: subtle backgrounds, gradients, or images that create atmosphere */}
            </div>

            {/* Layer 1: Content (existing, stays exactly as-is) */}
            <div className="relative z-10">
              <h1 className="text-5xl md:text-6xl font-bold text-theme-text mb-6">
                Gentle guidance, your way.
              </h1>
              <p className="text-xl md:text-2xl text-theme-text-secondary mb-8 max-w-3xl mx-auto">
                Connect with 25+ specialized AI supporters designed to help you navigate life's challenges and opportunities.
              </p>
              
              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-brand-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                >
                  <span>🚀</span>
                  <span>Get Started Free</span>
                </button>
                <button
                  onClick={() => navigate('/signin')}
                  className="bg-transparent border-2 border-theme-border text-theme-text px-8 py-4 rounded-lg text-lg font-semibold hover:bg-theme-surface transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          </section>

          {/* Featured Supporters */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-theme-text text-center mb-8">
              Meet Your AI Supporters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* AI Friend - Featured */}
              <div 
                onClick={() => navigate('/signup')}
                className="bg-theme-card border border-theme-border rounded-xl p-6 cursor-pointer hover:border-brand-primary transition-all hover:shadow-lg"
              >
                <div className="text-4xl mb-4">{AI_FRIEND.icon}</div>
                <h3 className="text-xl font-bold text-theme-text mb-2">{AI_FRIEND.name}</h3>
                <p className="text-theme-text-secondary text-sm mb-4">{AI_FRIEND.description}</p>
                <p className="text-theme-text-muted text-xs italic">"{AI_FRIEND.voice}"</p>
              </div>

              {/* Sample Supporters */}
              {getAllActiveSupporters().slice(0, 2).map((supporter) => (
                <div 
                  key={supporter.id}
                  onClick={() => navigate('/signup')}
                  className="bg-theme-card border border-theme-border rounded-xl p-6 cursor-pointer hover:border-brand-primary transition-all hover:shadow-lg"
                >
                  <div className="text-4xl mb-4">{supporter.icon}</div>
                  <h3 className="text-xl font-bold text-theme-text mb-2">{supporter.name}</h3>
                  <p className="text-theme-text-secondary text-sm mb-4">{supporter.description}</p>
                  <p className="text-theme-text-muted text-xs italic">"{supporter.voice}"</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button
                onClick={() => navigate('/learn-more')}
                className="text-brand-primary hover:text-brand-secondary font-semibold"
              >
                Explore All 25+ Supporters →
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-theme-text mb-2">Private & Secure</h3>
              <p className="text-theme-text-secondary">Your conversations are encrypted and never shared.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-theme-text mb-2">Always Available</h3>
              <p className="text-theme-text-secondary">Get support whenever you need it, 24/7.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-theme-text mb-2">Specialized Guidance</h3>
              <p className="text-theme-text-secondary">Each supporter is tailored to specific needs and goals.</p>
            </div>
          </div>
          
          {/* Newsletter Signup - Secondary */}
          <div className="bg-theme-card border border-theme-border rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-theme-text text-center mb-4">
              Stay Updated
            </h3>
            <p className="text-theme-text-secondary text-center mb-6">
              Join our newsletter for insights, tips, and updates from our AI supporters.
          </p>
            {success ? (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 text-green-600 dark:text-green-400 text-center">
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
              <p className="mt-3 text-red-500 text-sm text-center">{error}</p>
            )}
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
