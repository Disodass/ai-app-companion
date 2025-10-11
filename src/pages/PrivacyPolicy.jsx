import React from 'react'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicy() {
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
            <h1 className="text-xl font-bold text-theme-text">Privacy Policy</h1>
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
            
            <h2 className="text-2xl font-bold text-theme-text mb-4">1. Information We Collect</h2>
            <p className="text-theme-text-secondary mb-6">
              We collect minimal information necessary to provide our AI companion service:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li>Email address for account creation and authentication</li>
              <li>Conversation history with AI supporters</li>
              <li>Basic usage analytics to improve our service</li>
              <li>Device information for technical support</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">2. How We Use Your Information</h2>
            <p className="text-theme-text-secondary mb-6">
              We use your information solely to:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li>Provide AI companion services and conversations</li>
              <li>Maintain your account and conversation history</li>
              <li>Improve our AI supporters and service quality</li>
              <li>Provide customer support when needed</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">3. Data Security</h2>
            <p className="text-theme-text-secondary mb-6">
              We implement appropriate security measures to protect your information:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal information</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">4. Your Rights</h2>
            <p className="text-theme-text-secondary mb-6">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Export your conversation history</li>
              <li>Opt out of certain data processing</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">5. Data Retention</h2>
            <p className="text-theme-text-secondary mb-6">
              We retain your information only as long as necessary to provide our services. 
              You can delete your account at any time, which will permanently remove your data.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">6. Contact Us</h2>
            <p className="text-theme-text-secondary mb-6">
              If you have questions about this Privacy Policy, please contact us through the Settings page.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">7. Changes to This Policy</h2>
            <p className="text-theme-text-secondary">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
