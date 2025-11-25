import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'
import { detectUserLocation, getCrisisResources, formatCrisisResources } from '../services/locationService'

export default function LearnMore() {
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [crisisResources, setCrisisResources] = useState(null)
  const [location, setLocation] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(true)

  // Load location-aware crisis resources
  useEffect(() => {
    const loadCrisisResources = async () => {
      try {
        setLoadingLocation(true)
        // Try to get location, but don't fail if it doesn't work
        let userLocation = { country: 'CA', province: null, city: null, offline: true }
        try {
          userLocation = await detectUserLocation()
        } catch (locationError) {
          console.warn('Location detection failed, using fallback:', locationError)
        }
        
        const resources = getCrisisResources(userLocation)
        const { message } = formatCrisisResources(resources, userLocation)
        
        setLocation(userLocation)
        setCrisisResources(message)
      } catch (error) {
        console.error('Failed to load crisis resources:', error)
        // Fallback to generic crisis resources
        setCrisisResources(`🚨 **IMMEDIATE SAFETY:**
If you are in immediate danger, call your local emergency number right now.

• **988 Suicide & Crisis Lifeline:** Call or text **988** (24/7)
• **Kids Help Phone (under 29):** Call **1-800-668-6868** or text **CONNECT** to **686868** (24/7)

**Emergency:** Call **911** or go to the nearest emergency department.`)
      } finally {
        setLoadingLocation(false)
      }
    }

    loadCrisisResources()
  }, [])

  return (
    <div className="min-h-screen bg-theme-primary text-theme-text">
      {/* Header */}
      <header className="px-6 py-4 border-b border-theme-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🌿</span>
            <h1 className="text-xl font-bold text-theme-text">Bestibule</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-theme-surface transition-colors text-2xl"
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <Link
              to="/signin"
              className="text-theme-text hover:text-brand-primary transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">About Bestibule</h1>
          <p className="text-xl text-theme-text-secondary max-w-3xl mx-auto">
            Bestibule is your gateway to personalized AI support. We believe everyone deserves access to 
            compassionate guidance, tailored to their unique needs and circumstances.
          </p>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Sign up</h3>
              <p className="text-theme-text-secondary">Create your account in seconds with just your email and password. Start your journey to better support today.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-secondary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Choose your supporter</h3>
              <p className="text-theme-text-secondary">Browse our 25+ specialized AI supporters and find the perfect match for your needs.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Start chatting</h3>
              <p className="text-theme-text-secondary">Begin your conversation and receive personalized guidance whenever you need it.</p>
            </div>
          </div>
        </section>


        {/* What Makes Us Different */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">What makes us different</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-theme-card border border-theme-border rounded-xl p-8">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold mb-4">Gentle, not pushy</h3>
              <p className="text-theme-text-secondary">We don't bombard you with questions or pressure you into action. Our approach is presence-first - we listen, reflect, and offer gentle guidance when you're ready.</p>
            </div>
            
            <div className="bg-theme-card border border-theme-border rounded-xl p-8">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-4">Specialized, not generic</h3>
              <p className="text-theme-text-secondary">Each supporter has a unique voice, expertise, and approach. You're not talking to a one-size-fits-all chatbot, but to someone who truly understands your specific needs.</p>
            </div>
            
            <div className="bg-theme-card border border-theme-border rounded-xl p-8">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-semibold mb-4">Supportive, not therapeutic</h3>
              <p className="text-theme-text-secondary">We're here to support and guide, not diagnose or treat. Think of us as a wise friend who's always there to listen and offer perspective, not replace professional help.</p>
            </div>
            
            <div className="bg-theme-card border border-theme-border rounded-xl p-8">
              <div className="text-4xl mb-4">💙</div>
              <h3 className="text-xl font-semibold mb-4">Human-centered, not profit-driven</h3>
              <p className="text-theme-text-secondary">We built Bestibule because we believe everyone deserves access to compassionate support. Our focus is on your well-being, not on keeping you engaged or selling you more services.</p>
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Privacy & Security</h2>
          <div className="bg-theme-card border border-theme-border rounded-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <span>🔒</span>
                  <span>Your Privacy Matters</span>
                </h3>
                <ul className="space-y-2 text-theme-text-secondary">
                  <li>• We take your privacy seriously</li>
                  <li>• Your conversations are stored securely</li>
                  <li>• You can delete your account and data anytime</li>
                  <li>• We don't share your personal information</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <span>🛡️</span>
                  <span>Secure Platform</span>
                </h3>
                <ul className="space-y-2 text-theme-text-secondary">
                  <li>• Secure authentication system</li>
                  <li>• Regular security updates</li>
                  <li>• Protected data transmission</li>
                  <li>• Industry-standard security practices</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Important Information */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Important Information</h2>
          <div className="space-y-6">
            <div className="bg-theme-card border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">About Bestibule</h3>
              <p className="text-theme-text-secondary">Bestibule is a platform that connects you with AI-powered supporters designed to provide guidance, support, and companionship. Each supporter has a unique personality and expertise area.</p>
            </div>
            <div className="bg-theme-card border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">How It Works</h3>
              <p className="text-theme-text-secondary">You create an account, choose a supporter that matches your needs, and start chatting. Each supporter has their own conversation history and responds based on their specialized knowledge and personality.</p>
            </div>
            <div className="bg-theme-card border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Not Therapy or Medical Advice</h3>
              <p className="text-theme-text-secondary">Bestibule provides supportive conversations and general guidance, but it's not a replacement for professional therapy, medical advice, or crisis intervention. For serious concerns, please consult qualified professionals.</p>
            </div>
            <div className="bg-theme-card border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
              <p className="text-theme-text-secondary">Simply sign up, browse the available supporters, and start a conversation. You can try different supporters to find the ones that resonate with you and your needs.</p>
            </div>
          </div>
        </section>

        {/* Crisis Resources */}
        <section className="mb-16">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-600">🚨 Crisis Support</h3>
            {loadingLocation ? (
              <p className="text-theme-text-secondary">Loading local crisis resources...</p>
            ) : (
              <div className="space-y-4">
                <p className="text-theme-text">
                  <strong>Bestibule's AI supporters provide coaching-style guidance and general information.</strong> They're not a substitute for professional diagnosis, therapy, or medical advice.
                </p>
                {crisisResources && (
                  <div className="bg-theme-surface rounded-lg p-4 mt-4">
                    <h4 className="font-semibold mb-2 text-theme-text">
                      {location?.country ? `Local crisis resources (${location.country})` : 'Crisis resources'}
                    </h4>
                    <pre className="whitespace-pre-wrap text-sm text-theme-text-secondary font-sans">
                      {crisisResources}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Ready to Get Started */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-theme-text-secondary mb-8">
            Join thousands of people who have found support and guidance through Bestibule.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/signup"
              className="bg-brand-primary text-white px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
            <Link
              to="/signin"
              className="bg-transparent border border-theme-border text-theme-text px-8 py-4 rounded-lg font-semibold hover:bg-theme-surface transition-colors"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
