import React, { useState, useEffect } from 'react'
import { getCampaignAnalytics, getEmailCampaigns, getAllSubscribers, deleteSubscribersByEmails, EMAIL_TYPES } from '../../services/newsletterService'
import { sendIndividualBlogEmail, sendWeeklyRecapEmail, sendWeeklyPreviewEmail, generateIndividualBlogEmailPreview, generateWeeklyRecapEmailPreview, generateWeeklyPreviewEmailPreview } from '../../services/emailAutomationService'
import { sendWelcomeEmail, sendFollowUpEmail, generateWelcomeEmailPreview, generateFollowUpEmailPreview } from '../../services/welcomeSequenceService'
import { authenticatedFetch } from '../../services/emailHelper'
import EmailPreviewModal from '../../Components/admin/EmailPreviewModal'
import AdminHeader from '../../Components/admin/AdminHeader'

export default function EmailManagement() {
  const [analytics, setAnalytics] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedEmail, setSelectedEmail] = useState('')
  const [emailHistory, setEmailHistory] = useState([])
  const [previewModal, setPreviewModal] = useState({ isOpen: false, emailData: null, emailType: null })
  const [selectedSubscribers, setSelectedSubscribers] = useState([])
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [bulkEmailData, setBulkEmailData] = useState({ subject: '', content: '', emailType: 'custom' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [analyticsData, campaignsData, subscribersData] = await Promise.all([
        getCampaignAnalytics(),
        getEmailCampaigns(20), // Get last 20 campaigns
        getAllSubscribers() // Get all actual subscribers
      ])
      
      setAnalytics(analyticsData)
      setCampaigns(campaignsData)
      setSubscribers(subscribersData)
    } catch (error) {
      console.error('Error loading email data:', error)
      // If collections don't exist yet, that's okay - show empty state
      if (error.message?.includes('permission') || error.message?.includes('not found')) {
        setAnalytics({
          total: 0,
          sent: 0,
          draft: 0,
          scheduled: 0,
          failed: 0,
          byType: {
            individualBlog: 0,
            weeklyRecap: 0,
            weeklyPreview: 0
          }
        })
        setCampaigns([])
      } else {
        setError('Failed to load email data')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadEmailHistory(email) {
    if (!email) return
    
    try {
      // Filter campaigns to find emails sent to this address
      const history = campaigns.filter(campaign => 
        campaign.recipients && 
        campaign.recipients.some(recipient => 
          recipient.email.toLowerCase() === email.toLowerCase()
        )
      )
      
      setEmailHistory(history)
    } catch (error) {
      console.error('Error loading email history:', error)
      setError('Failed to load email history: ' + error.message)
    }
  }

  function handleEmailSelect(email) {
    setSelectedEmail(email)
    setActiveTab('history')
    loadEmailHistory(email)
  }


  // Delete selected subscribers
  async function handleDeleteSelectedSubscribers() {
    if (selectedSubscribers.length === 0) {
      setError('Please select at least one subscriber to delete')
      setTimeout(() => setError(''), 5000)
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedSubscribers.length} subscriber(s)? This action cannot be undone.`)) {
      return
    }

    setSending(true)
    setError('')
    setSuccess('')
    
    try {
      const result = await deleteSubscribersByEmails(selectedSubscribers)
      
      if (result.successCount > 0) {
        setSuccess(`✅ Deleted ${result.successCount} subscriber(s)${result.failCount > 0 ? ` (${result.failCount} failed)` : ''}`)
        setTimeout(() => setSuccess(''), 5000)
        setSelectedSubscribers([])
        // Reload subscribers
        const subscribersData = await getAllSubscribers()
        setSubscribers(subscribersData)
      } else {
        setError('Failed to delete any subscribers')
        setTimeout(() => setError(''), 5000)
      }
    } catch (error) {
      console.error('Error deleting subscribers:', error)
      setError(`Failed to delete subscribers: ${error.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setSending(false)
    }
  }

  // Email preview functions
  function handlePreviewWelcomeEmail() {
    const previewData = generateWelcomeEmailPreview()
    setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'welcome' })
  }

  function handlePreviewFollowUpEmail() {
    const previewData = generateFollowUpEmailPreview()
    setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'followup' })
  }

  function handlePreviewWeeklyRecapEmail() {
    const previewData = generateWeeklyRecapEmailPreview()
    setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'weekly_recap' })
  }

  function handlePreviewWeeklyPreviewEmail() {
    const previewData = generateWeeklyPreviewEmailPreview()
    setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'weekly_preview' })
  }

  function handleClosePreview() {
    setPreviewModal({ isOpen: false, emailData: null, emailType: null })
  }

  // Subscriber management functions
  function handleSubscriberSelect(subscriberEmail) {
    setSelectedSubscribers(prev => {
      if (prev.includes(subscriberEmail)) {
        return prev.filter(email => email !== subscriberEmail)
      } else {
        return [...prev, subscriberEmail]
      }
    })
  }

  function handleSelectAllSubscribers() {
    if (selectedSubscribers.length === subscribers.length) {
      setSelectedSubscribers([])
    } else {
      setSelectedSubscribers(subscribers.map(s => s.email))
    }
  }

  async function handleSendIndividualEmail(subscriberEmail, emailType) {
    // Confirm before sending
    const emailTypeDisplay = emailType === 'welcome' ? 'Welcome' : 'Follow-up'
    if (!confirm(`Send ${emailTypeDisplay} email to ${subscriberEmail}?`)) {
      return
    }

    setSending(true)
    setError('')
    setSuccess('')
    
    try {
      console.log(`📧 Sending ${emailType} email to ${subscriberEmail}`)
      
      let result
      if (emailType === 'welcome') {
        result = await sendWelcomeEmail(subscriberEmail)
      } else if (emailType === 'followup') {
        result = await sendFollowUpEmail(subscriberEmail)
      }
      
      if (result?.success) {
        setSuccess(`✅ ${emailTypeDisplay} email sent to ${subscriberEmail}!`)
        setTimeout(() => setSuccess(''), 5000)
        console.log(`✅ Successfully sent ${emailType} email to ${subscriberEmail}`)
      } else {
        setError(`Failed to send ${emailTypeDisplay} email to ${subscriberEmail}`)
        setTimeout(() => setError(''), 5000)
      }
    } catch (error) {
      console.error('Error sending individual email:', error)
      setError(`Failed to send ${emailTypeDisplay} email to ${subscriberEmail}: ${error.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setSending(false)
    }
  }

  function handleOpenBulkEmailModal() {
    setShowBulkEmailModal(true)
    setBulkEmailData({ subject: '', content: '', emailType: 'custom' })
  }

  function handleCloseBulkEmailModal() {
    setShowBulkEmailModal(false)
    setBulkEmailData({ subject: '', content: '', emailType: 'custom' })
  }

  async function handleSendBulkEmail() {
    if (!bulkEmailData.subject || !bulkEmailData.content) {
      setError('Please enter both subject and content for the bulk email')
      setTimeout(() => setError(''), 5000)
      return
    }

    if (selectedSubscribers.length === 0) {
      setError('Please select at least one subscriber')
      setTimeout(() => setError(''), 5000)
      return
    }

    setSending(true)
    setError('')
    try {
      // Send to each selected subscriber
      const results = []
      for (const email of selectedSubscribers) {
        try {
          // Send via Resend API
          const response = await authenticatedFetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Bestibule AI Supporters <connect@bestibule.ca>',
              to: email,
              subject: bulkEmailData.subject,
              html: convertTextToHtml(bulkEmailData.content),
            }),
          })

          const result = await response.json()
          if (response.ok) {
            results.push({ email, success: true, messageId: result.id })
          } else {
            results.push({ email, success: false, error: result.message })
          }
        } catch (error) {
          results.push({ email, success: false, error: error.message })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      if (successCount > 0) {
        setSuccess(`✅ Bulk email sent to ${successCount} subscribers${failCount > 0 ? ` (${failCount} failed)` : ''}`)
        setTimeout(() => setSuccess(''), 5000)
        setSelectedSubscribers([])
        handleCloseBulkEmailModal()
      } else {
        setError(`Failed to send bulk email to any subscribers`)
        setTimeout(() => setError(''), 5000)
      }
    } catch (error) {
      console.error('Error sending bulk email:', error)
      setError(`Failed to send bulk email: ${error.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setSending(false)
    }
  }

  function convertTextToHtml(text) {
    // Enhanced HTML conversion with warm-earth tone styling
    const htmlContent = text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #8b8551;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color: #b6875c;">$1</em>')
      .replace(/•/g, '&bull;')
    
    // Wrap in warm-earth tone email template
    return `
      <div style="font-family: 'Inter', 'Open Sans', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f5ec;">
        <div style="background: linear-gradient(180deg, #f9f5ec 0%, #e8dec3 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 20\"><path d=\"M0,20 Q25,0 50,20 T100,20\" fill=\"none\" stroke=\"%23d6c9a9\" stroke-width=\"0.5\" opacity=\"0.3\"/></svg>') repeat-x; opacity: 0.4;"></div>
          <div style="position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8b8551 0%, #b6875c 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <span style="color: #f9f5ec; font-size: 16px; font-weight: bold;">B</span>
              </div>
              <h1 style="color: #3a2c1a; margin: 0; font-size: 24px; font-weight: 600; font-family: 'Nunito', 'Poppins', -apple-system, sans-serif;">
                Bestibule
              </h1>
            </div>
            <p style="color: #8b8551; margin: 0; font-size: 14px; font-style: italic; font-weight: 300;">
              — Best of You —
            </p>
          </div>
        </div>
        
        <div style="padding: 30px; background: #f9f5ec; color: #3a2c1a; font-size: 16px; line-height: 1.7;">
          ${htmlContent}
        </div>
        
        <div style="background: linear-gradient(180deg, #f0ebe0 0%, #e6dec4 100%); padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #d6c9a9; position: relative;">
          <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 2px; background: linear-gradient(90deg, #b6875c 0%, #8b8551 50%, #b6875c 100%);"></div>
          <p style="color: #8b8551; font-size: 12px; margin: 15px 0 0 0; font-family: 'Inter', 'Open Sans', -apple-system, sans-serif;">
            You're receiving this because you subscribed to <strong style="color: #3a2c1a;">Bestibule AI Supporters</strong>.
          </p>
        </div>
      </div>
    `
  }

  async function handleSendWeeklyRecap() {
    setSending(true)
    setError('')
    setSuccess('')
    
    try {
      const result = await sendWeeklyRecapEmail()
      if (result.success) {
        setSuccess(`Weekly recap sent successfully to ${result.subscribers} subscribers!`)
        loadData() // Refresh data
      }
    } catch (error) {
      console.error('Error sending weekly recap:', error)
      setError('Failed to send weekly recap email')
    } finally {
      setSending(false)
    }
  }

  async function handleSendWeeklyPreview() {
    setSending(true)
    setError('')
    setSuccess('')
    
    try {
      const result = await sendWeeklyPreviewEmail()
      if (result.success) {
        setSuccess(`Weekly preview sent successfully to ${result.subscribers} subscribers!`)
        loadData() // Refresh data
      }
    } catch (error) {
      console.error('Error sending weekly preview:', error)
      setError('Failed to send weekly preview email')
    } finally {
      setSending(false)
    }
  }


  // Send welcome email to test subscribers
  async function handleSendWelcomeEmails() {
    if (!confirm('This will send welcome emails to your test subscribers. Continue?')) {
      return
    }

    setSending(true)
    setError('')
    setSuccess('')
    
    try {
      const testEmails = [
        'disopate@hotmail.com',
        'Disopate@icloud.com', 
        'disopate@yahoo.ca'
      ]
      
      let successful = 0
      let failed = 0
      
      for (const email of testEmails) {
        try {
          await sendWelcomeEmail(email)
          successful++
          // Add delay to respect Resend rate limits (2 requests per second)
          await new Promise(resolve => setTimeout(resolve, 600)) // 600ms delay
        } catch (error) {
          console.error(`Failed to send welcome email to ${email}:`, error)
          failed++
        }
      }
      
      setSuccess(`Welcome emails sent! ${successful} successful, ${failed} failed.`)
      loadData() // Refresh data
    } catch (error) {
      console.error('Error sending welcome emails:', error)
      setError('Failed to send welcome emails')
    } finally {
      setSending(false)
    }
  }

  // Send follow-up email to test subscribers
  async function handleSendFollowUpEmails() {
    if (!confirm('This will send follow-up emails to your test subscribers. Continue?')) {
      return
    }

    setSending(true)
    setError('')
    setSuccess('')
    
    try {
      const testEmails = [
        'disopate@hotmail.com',
        'Disopate@icloud.com', 
        'disopate@yahoo.ca'
      ]
      
      let successful = 0
      let failed = 0
      
      for (const email of testEmails) {
        try {
          await sendFollowUpEmail(email)
          successful++
        } catch (error) {
          console.error(`Failed to send follow-up email to ${email}:`, error)
          failed++
        }
      }
      
      setSuccess(`Follow-up emails sent! ${successful} successful, ${failed} failed.`)
      loadData() // Refresh data
    } catch (error) {
      console.error('Error sending follow-up emails:', error)
      setError('Failed to send follow-up emails')
    } finally {
      setSending(false)
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100'
      case 'draft': return 'text-yellow-600 bg-yellow-100'
      case 'scheduled': return 'text-blue-600 bg-blue-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  function getEmailTypeLabel(emailType) {
    switch (emailType) {
      case 'individual_blog': return '📝 Individual Blog'
      case 'weekly_recap': return '📋 Weekly Recap'
      case 'weekly_preview': return '🔮 Weekly Preview'
      default: return emailType
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-theme-text-muted">Loading email management...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-background">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-text" style={{ fontFamily: 'Georgia, serif' }}>📧 Email Management</h1>
          <p className="text-theme-text-muted mt-2">
            Manage newsletter campaigns and subscriber preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-theme-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-theme-text-muted hover:text-theme-text hover:border-theme-border'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('subscribers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'subscribers'
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-theme-text-muted hover:text-theme-text hover:border-theme-border'
                }`}
              >
                👥 Subscribers ({subscribers.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-theme-text-muted hover:text-theme-text hover:border-theme-border'
                }`}
              >
                📋 Email History
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'templates'
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-theme-text-muted hover:text-theme-text hover:border-theme-border'
                }`}
              >
                ✏️ Templates
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-muted">Total Campaigns</p>
                  <p className="text-2xl font-bold text-theme-text">{analytics.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-muted">Sent</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.sent}</p>
                </div>
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-muted">Drafts</p>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.draft}</p>
                </div>
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-2xl">❌</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-theme-text-muted">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.failed}</p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Quick Actions */}
        <div className="bg-theme-surface border border-theme-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-theme-text mb-4">🚀 Quick Actions</h2>
          
          {/* Info Message for Empty State */}
          {campaigns.length === 0 && !error && (
            <div className="mb-4 p-4 bg-blue-900 border border-blue-700 rounded-lg">
              <p className="text-blue-200">
                💡 <strong>Getting Started:</strong> Add test subscribers first, then send emails to test the system!
              </p>
            </div>
          )}
          
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg">
              <p className="text-green-200">{success}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSendWeeklyRecap}
                disabled={sending}
                className="flex items-center justify-center p-4 bg-brand-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
              >
                <span className="mr-2">📋</span>
                {sending ? 'Sending...' : 'Send Weekly Recap'}
              </button>
              <button
                onClick={handlePreviewWeeklyRecapEmail}
                className="flex items-center justify-center p-2 bg-brand-light text-brand-dark rounded-lg hover:bg-brand-accent hover:text-white text-sm transition-colors"
              >
                <span className="mr-2">👁️</span>
                Preview
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSendWeeklyPreview}
                disabled={sending}
                className="flex items-center justify-center p-4 bg-brand-secondary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
              >
                <span className="mr-2">🔮</span>
                {sending ? 'Sending...' : 'Send Weekly Preview'}
              </button>
              <button
                onClick={handlePreviewWeeklyPreviewEmail}
                className="flex items-center justify-center p-2 bg-brand-light text-brand-dark rounded-lg hover:bg-brand-secondary hover:text-white text-sm transition-colors"
              >
                <span className="mr-2">👁️</span>
                Preview
              </button>
            </div>
          </div>

          {/* Welcome Sequence Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-theme-text mb-4">🎉 Welcome Sequence (Perfect for Testing!)</h3>
            <p className="text-sm text-theme-text-muted mb-4">
              Send beautiful welcome emails to test your email system. These are designed to engage new subscribers.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSendWelcomeEmails}
                  disabled={sending}
                  className="flex items-center justify-center p-4 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
                >
                  <span className="mr-2">🤖</span>
                  {sending ? 'Sending...' : 'Send Welcome Emails'}
                </button>
                <button
                  onClick={handlePreviewWelcomeEmail}
                  className="flex items-center justify-center p-2 bg-brand-light text-brand-dark rounded-lg hover:bg-brand-primary hover:text-white text-sm transition-colors"
                >
                  <span className="mr-2">👁️</span>
                  Preview Welcome Email
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSendFollowUpEmails}
                  disabled={sending}
                  className="flex items-center justify-center p-4 bg-gradient-to-r from-brand-accent to-brand-secondary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
                >
                  <span className="mr-2">📚</span>
                  {sending ? 'Sending...' : 'Send Follow-Up Emails'}
                </button>
                <button
                  onClick={handlePreviewFollowUpEmail}
                  className="flex items-center justify-center p-2 bg-brand-light text-brand-dark rounded-lg hover:bg-brand-accent hover:text-white text-sm transition-colors"
                >
                  <span className="mr-2">👁️</span>
                  Preview Follow-Up Email
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign History */}
        <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-theme-text mb-4">📈 Recent Campaigns</h2>
          
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-theme-text-muted">No campaigns yet. Send your first newsletter to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme-border">
                    <th className="text-left py-3 px-4 text-theme-text font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-theme-text font-semibold">Subject</th>
                    <th className="text-left py-3 px-4 text-theme-text font-semibold">Subscribers</th>
                    <th className="text-left py-3 px-4 text-theme-text font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-theme-text font-semibold">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-theme-border">
                      <td className="py-3 px-4 text-theme-text">
                        {getEmailTypeLabel(campaign.emailType)}
                      </td>
                      <td className="py-3 px-4 text-theme-text">
                        <div className="max-w-xs truncate" title={campaign.subject}>
                          {campaign.subject}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-theme-text">
                        {campaign.subscriberCount}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-theme-text-muted">
                        {campaign.sentAt ? new Date(campaign.sentAt.toDate()).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Email Type Breakdown */}
        {analytics && (
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-theme-text mb-4">📊 Campaign Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.byType.individualBlog}</div>
                <div className="text-sm text-theme-text-muted">Individual Blog Emails</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analytics.byType.weeklyRecap}</div>
                <div className="text-sm text-theme-text-muted">Weekly Recaps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{analytics.byType.weeklyPreview}</div>
                <div className="text-sm text-theme-text-muted">Weekly Previews</div>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {activeTab === 'subscribers' && (
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-theme-text">👥 Subscriber Management ({subscribers.length} total)</h2>
              <p className="text-theme-text-muted text-sm mt-1">
                Manage your email subscribers and their preferences. Click on an email to view their email history.
              </p>
            </div>
            
            {subscribers.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-theme-text-muted mb-4">No subscribers yet</div>
                <p className="text-sm text-theme-text-muted">
                  Click "Add Test Subscribers" in the Overview tab to add your test emails
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>Note:</strong> This shows your current subscribers and their email preferences. 
                    Select subscribers to send bulk emails, or use the individual email buttons for each subscriber.
                    Click on any email address to view their email history.
                  </p>
                </div>

                {/* Bulk Actions */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubscribers.length === subscribers.length && subscribers.length > 0}
                        onChange={handleSelectAllSubscribers}
                        className="rounded border-theme-border text-theme-accent focus:ring-theme-accent"
                      />
                      <span className="text-sm text-theme-text-muted">
                        Select All ({subscribers.length} subscribers)
                      </span>
                    </label>
                    {selectedSubscribers.length > 0 && (
                      <span className="text-sm text-theme-accent font-medium">
                        {selectedSubscribers.length} selected
                      </span>
                    )}
                  </div>
                  
                  {selectedSubscribers.length > 0 && (
                    <div className="flex space-x-3">
                      <button
                        onClick={handleOpenBulkEmailModal}
                        className="px-4 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent-hover transition-colors text-sm font-medium"
                      >
                        📧 Send Email to Selected ({selectedSubscribers.length})
                      </button>
                      <button
                        onClick={handleDeleteSelectedSubscribers}
                        disabled={sending}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
                      >
                        {sending ? 'Deleting...' : `🗑️ Delete Selected (${selectedSubscribers.length})`}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subscribers.map((subscriber, index) => (
                    <div key={index} className="bg-theme-background border border-theme-border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="checkbox"
                          checked={selectedSubscribers.includes(subscriber.email)}
                          onChange={() => handleSubscriberSelect(subscriber.email)}
                          className="rounded border-theme-border text-theme-accent focus:ring-theme-accent"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center">
                          <span className="text-brand-dark font-medium">
                            {subscriber.email?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p 
                            className="font-medium text-theme-text truncate cursor-pointer hover:text-theme-accent"
                            onClick={() => handleEmailSelect(subscriber.email)}
                          >
                            {subscriber.email}
                          </p>
                          <p className="text-xs text-theme-text-muted">
                            {subscriber.isTestSubscriber ? 'Test Subscriber' : 'Regular Subscriber'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-theme-text-muted">Email Preferences:</p>
                        <div className="flex flex-wrap gap-1">
                          {subscriber.individualBlog && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">📝 Blog Posts</span>
                          )}
                          {subscriber.weeklyRecap && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">📋 Weekly Recap</span>
                          )}
                          {subscriber.weeklyPreview && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">🔮 Weekly Preview</span>
                          )}
                          {!subscriber.individualBlog && !subscriber.weeklyRecap && !subscriber.weeklyPreview && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">No preferences set</span>
                          )}
                        </div>
                      </div>

                      {/* Individual Email Actions */}
                      <div className="mt-4 pt-3 border-t border-theme-border">
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendIndividualEmail(subscriber.email, 'welcome')
                              }}
                              disabled={sending}
                              className="flex-1 px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 hover:text-green-800 transition-colors disabled:opacity-50 border border-green-200"
                              title={`Send Welcome email to ${subscriber.email}`}
                            >
                              📧 Send Welcome
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendIndividualEmail(subscriber.email, 'followup')
                              }}
                              disabled={sending}
                              className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 hover:text-blue-800 transition-colors disabled:opacity-50 border border-blue-200"
                              title={`Send Follow-up email to ${subscriber.email}`}
                            >
                              📚 Send Follow-up
                            </button>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const previewData = generateWelcomeEmailPreview()
                                setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'welcome' })
                              }}
                              className="flex-1 px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-200"
                              title={`Preview Welcome email`}
                            >
                              👁️ Preview Welcome
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const previewData = generateFollowUpEmailPreview()
                                setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'followup' })
                              }}
                              className="flex-1 px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-200"
                              title={`Preview Follow-up email`}
                            >
                              👁️ Preview Follow-up
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
            <h2 className="text-xl font-bold text-theme-text mb-4">📋 Email History</h2>
            
            {!selectedEmail ? (
              <div className="text-center py-8">
                <div className="text-theme-text-muted mb-4">Select an email address to view history</div>
                <p className="text-sm text-theme-text-muted">
                  Go to the Subscribers tab and click on any email address to view their email history
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-theme-text mb-2">Email History for: {selectedEmail}</h3>
                  <button
                    onClick={() => {
                      setSelectedEmail('')
                      setEmailHistory([])
                      setActiveTab('subscribers')
                    }}
                    className="text-theme-primary hover:text-theme-primary-dark text-sm"
                  >
                    ← Back to Subscribers
                  </button>
                </div>
                
                {emailHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-theme-text-muted mb-4">No emails sent to this address yet</div>
                    <p className="text-sm text-theme-text-muted">
                      This email address hasn't received any campaigns yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emailHistory.map((campaign, index) => (
                      <div key={index} className="bg-theme-background border border-theme-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-theme-text">{campaign.subject}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="text-sm text-theme-text-muted">
                          <p><strong>Type:</strong> {getEmailTypeLabel(campaign.emailType)}</p>
                          <p><strong>Sent:</strong> {campaign.sentAt ? new Date(campaign.sentAt.toDate()).toLocaleString() : 'Not sent yet'}</p>
                          <p><strong>Recipients:</strong> {campaign.subscriberCount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
            <h2 className="text-xl font-bold text-theme-text mb-4">✏️ Email Templates</h2>
            <p className="text-theme-text-muted mb-6">
              Edit your email templates to customize the content and branding.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/admin/email/templates"
                className="block p-6 bg-theme-background border border-theme-border rounded-lg hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium text-theme-text mb-2">📧 Welcome & Follow-up Emails</h3>
                <p className="text-theme-text-muted text-sm mb-4">
                  Customize your welcome email sequence and follow-up messages
                </p>
                <span className="text-theme-primary text-sm font-medium">Edit Templates →</span>
              </Link>
              
              <div className="p-6 bg-theme-background border border-theme-border rounded-lg">
                <h3 className="text-lg font-medium text-theme-text mb-2">📋 Newsletter Templates</h3>
                <p className="text-theme-text-muted text-sm mb-4">
                  Weekly recap and preview templates (coming soon)
                </p>
                <span className="text-theme-text-muted text-sm">Coming Soon</span>
              </div>
            </div>
          </div>
        )}

        {/* Email Preview Modal */}
        <EmailPreviewModal
          isOpen={previewModal.isOpen}
          onClose={handleClosePreview}
          emailData={previewModal.emailData}
          emailType={previewModal.emailType}
        />

        {/* Bulk Email Modal */}
        {showBulkEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-theme-text">
                  📧 Send Bulk Email
                </h3>
                <button
                  onClick={handleCloseBulkEmailModal}
                  className="text-theme-text-muted hover:text-theme-text"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    Recipients ({selectedSubscribers.length} selected)
                  </label>
                  <div className="bg-theme-background border border-theme-border rounded-lg p-3 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {selectedSubscribers.map((email, index) => (
                        <span key={index} className="px-2 py-1 bg-brand-light text-brand-dark rounded text-xs">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={bulkEmailData.subject}
                    onChange={(e) => setBulkEmailData({ ...bulkEmailData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-theme-border rounded-lg bg-theme-background text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
                    placeholder="Enter email subject..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">
                    Email Content
                  </label>
                  <textarea
                    value={bulkEmailData.content}
                    onChange={(e) => setBulkEmailData({ ...bulkEmailData, content: e.target.value })}
                    className="w-full h-64 px-3 py-2 border border-theme-border rounded-lg bg-theme-background text-theme-text resize-none focus:outline-none focus:ring-2 focus:ring-theme-accent"
                    placeholder="Enter your email content here... (supports basic formatting like **bold** and *italic*)"
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>Tips:</strong> Use **bold** for bold text, *italic* for italic text. 
                    Line breaks will be preserved. The email will use your Bestibule branding automatically.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseBulkEmailModal}
                  className="px-4 py-2 border border-theme-border text-theme-text rounded-lg hover:bg-theme-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBulkEmail}
                  disabled={sending || !bulkEmailData.subject || !bulkEmailData.content}
                  className="px-4 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent-hover transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending...' : `Send to ${selectedSubscribers.length} subscribers`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
