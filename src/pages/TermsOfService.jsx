import React from 'react'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useNavigate } from 'react-router-dom'

export default function TermsOfService() {
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
            <h1 className="text-xl font-bold text-theme-text">Terms of Service</h1>
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
            
            <h2 className="text-2xl font-bold text-theme-text mb-4">1. Acceptance of Terms</h2>
            <p className="text-theme-text-secondary mb-6">
              By accessing and using Bestibule, you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">2. Description of Service</h2>
            <p className="text-theme-text-secondary mb-6">
              Bestibule provides AI-powered companion services through specialized supporters designed to offer 
              guidance, support, and conversation. Our service is not a replacement for professional therapy, 
              medical advice, or crisis intervention.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">3. User Responsibilities</h2>
            <p className="text-theme-text-secondary mb-4">You agree to:</p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li>Provide accurate and complete information when creating your account</li>
              <li>Use the service in a lawful and respectful manner</li>
              <li>Not attempt to harm, disrupt, or gain unauthorized access to our systems</li>
              <li>Not use the service for illegal or harmful purposes</li>
              <li>Respect the privacy and rights of other users</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">4. Prohibited Uses</h2>
            <p className="text-theme-text-secondary mb-4">You may not use our service:</p>
            <ul className="list-disc list-inside text-theme-text-secondary mb-6 space-y-2">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
            </ul>

            <h2 className="text-2xl font-bold text-theme-text mb-4">5. Service Availability</h2>
            <p className="text-theme-text-secondary mb-6">
              We strive to provide continuous service availability but cannot guarantee uninterrupted access. 
              We reserve the right to modify, suspend, or discontinue the service at any time without notice.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">6. Intellectual Property</h2>
            <p className="text-theme-text-secondary mb-6">
              The service and its original content, features, and functionality are and will remain the exclusive 
              property of Bestibule and its licensors. The service is protected by copyright, trademark, and other laws.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-theme-text-secondary mb-6">
              The information on this service is provided on an "as is" basis. To the fullest extent permitted by law, 
              this Company excludes all representations, warranties, conditions and terms relating to our service and 
              the use of this service.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">8. Limitation of Liability</h2>
            <p className="text-theme-text-secondary mb-6">
              In no event shall Bestibule, nor its directors, employees, partners, agents, suppliers, or affiliates, 
              be liable for any indirect, incidental, special, consequential, or punitive damages, including without 
              limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use 
              of the service.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">9. Medical Disclaimer</h2>
            <p className="text-theme-text-secondary mb-6">
              <strong>Important:</strong> Bestibule is not a medical service and does not provide medical advice, 
              diagnosis, or treatment. Our AI supporters are designed for general guidance and support only. 
              If you are experiencing a medical emergency, please contact your local emergency services immediately. 
              For mental health concerns, please consult with a qualified healthcare professional.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">10. Termination</h2>
            <p className="text-theme-text-secondary mb-6">
              We may terminate or suspend your account and bar access to the service immediately, without prior notice 
              or liability, under our sole discretion, for any reason whatsoever and without limitation, including but 
              not limited to a breach of the Terms.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">11. Changes to Terms</h2>
            <p className="text-theme-text-secondary mb-6">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
              If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>

            <h2 className="text-2xl font-bold text-theme-text mb-4">12. Contact Information</h2>
            <p className="text-theme-text-secondary">
              If you have any questions about these Terms of Service, please contact us through the Settings page.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}


