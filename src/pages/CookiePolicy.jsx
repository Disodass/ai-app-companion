import React from 'react'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useNavigate } from 'react-router-dom'

export default function CookiePolicy() {
  const { darkMode, toggleDarkMode } = useDarkMode()
  const navigate = useNavigate()

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
            <h1 className="text-xl font-bold text-theme-text">Cookie Policy</h1>
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
        <div className="max-w-4xl mx-auto">
          <div className="bg-theme-card border border-theme-border rounded-xl p-8">
            <p className="text-sm text-theme-text-muted mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="text-2xl font-bold text-theme-text mb-4">What Are Cookies?</h2>
            <p className="text-theme-text-secondary mb-6">
              Cookies are small text files that are stored on your device when you visit our website. 
              They help us provide you with a better experience by remembering your preferences and 
              understanding how you use our service.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">How We Use Cookies</h2>
            <p className="text-theme-text-secondary mb-6">
              Bestibule uses cookies to:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li>Remember your dark/light mode preference</li>
              <li>Keep you logged in between sessions</li>
              <li>Remember your language and region settings</li>
              <li>Improve app performance and loading times</li>
              <li>Understand how you use our service (anonymized)</li>
              <li>Provide personalized content and recommendations</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">Types of Cookies We Use</h2>
            
            <div className="space-y-6 mb-6">
              <div className="bg-theme-surface rounded-lg p-4">
                <h3 className="text-lg font-semibold text-theme-text mb-2">Essential Cookies</h3>
                <p className="text-theme-text-secondary text-sm mb-2">
                  These cookies are necessary for the website to function properly. They cannot be disabled.
                </p>
                <ul className="list-disc list-inside text-theme-text-secondary text-sm space-y-1">
                  <li>Authentication cookies (keep you logged in)</li>
                  <li>Security cookies (protect against fraud)</li>
                  <li>Session cookies (remember your current session)</li>
                </ul>
              </div>

              <div className="bg-theme-surface rounded-lg p-4">
                <h3 className="text-lg font-semibold text-theme-text mb-2">Preference Cookies</h3>
                <p className="text-theme-text-secondary text-sm mb-2">
                  These cookies remember your choices and preferences to improve your experience.
                </p>
                <ul className="list-disc list-inside text-theme-text-secondary text-sm space-y-1">
                  <li>Theme preference (dark/light mode)</li>
                  <li>Language settings</li>
                  <li>Display preferences</li>
                </ul>
              </div>

              <div className="bg-theme-surface rounded-lg p-4">
                <h3 className="text-lg font-semibold text-theme-text mb-2">Analytics Cookies</h3>
                <p className="text-theme-text-secondary text-sm mb-2">
                  These cookies help us understand how you use our service to improve it.
                </p>
                <ul className="list-disc list-inside text-theme-text-secondary text-sm space-y-1">
                  <li>Page views and navigation patterns</li>
                  <li>Feature usage statistics</li>
                  <li>Performance metrics (anonymized)</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-theme-text mb-4">Managing Your Cookie Preferences</h2>
            <p className="text-theme-text-secondary mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Important Note</h3>
              <p className="text-yellow-700 text-sm">
                Disabling essential cookies may prevent you from using certain features of Bestibule, 
                including staying logged in and saving your preferences.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-theme-text mb-4">Third-Party Cookies</h2>
            <p className="text-theme-text-secondary mb-6">
              We may use third-party services that set their own cookies:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li><strong>Firebase:</strong> For authentication and data storage</li>
              <li><strong>Analytics Services:</strong> To understand usage patterns (anonymized)</li>
              <li><strong>Content Delivery Networks:</strong> To improve loading speeds</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">Cookie Retention</h2>
            <p className="text-theme-text-secondary mb-6">
              Different cookies are stored for different periods:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Preference cookies:</strong> Stored for up to 1 year</li>
              <li><strong>Authentication cookies:</strong> Stored for up to 30 days</li>
              <li><strong>Analytics cookies:</strong> Stored for up to 2 years</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">Updates to This Policy</h2>
            <p className="text-theme-text-secondary mb-6">
              We may update this Cookie Policy from time to time. We will notify you of any changes 
              by posting the new Cookie Policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">Contact Us</h2>
            <p className="text-theme-text-secondary">
              If you have questions about our use of cookies, please contact us through the Settings page.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}


