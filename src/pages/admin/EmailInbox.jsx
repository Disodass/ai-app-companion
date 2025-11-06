import React, { useState, useEffect } from 'react'
import { 
  getInboxEmails, 
  getUnreadEmailCount, 
  markEmailAsRead, 
  markEmailAsReplied,
  searchEmails,
  deleteEmail
} from '../../services/inboxService'
import { authenticatedFetch } from '../../services/emailHelper'
import AdminHeader from '../../components/admin/AdminHeader'

export default function EmailInbox() {
  const [emails, setEmails] = useState([])
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'replied'
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyContent, setReplyContent] = useState('')

  useEffect(() => {
    loadInboxData()
  }, [])

  async function loadInboxData() {
    setLoading(true)
    setError('')
    try {
      const [emailsData, unreadData] = await Promise.all([
        getInboxEmails(100),
        getUnreadEmailCount()
      ])
      
      setEmails(emailsData)
      setUnreadCount(unreadData)
      
      console.log(`📬 Loaded ${emailsData.length} emails, ${unreadData} unread`)
    } catch (error) {
      console.error('Error loading inbox:', error)
      setError('Failed to load inbox emails')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSelect(email) {
    setSelectedEmail(email)
    
    // Mark as read if not already read
    if (!email.isRead) {
      try {
        await markEmailAsRead(email.id)
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, isRead: true } : e
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Error marking email as read:', error)
      }
    }
  }

  async function handleSearch() {
    if (!searchTerm.trim()) {
      loadInboxData()
      return
    }

    setLoading(true)
    try {
      const searchResults = await searchEmails(searchTerm, { isRead: filter === 'unread' })
      setEmails(searchResults)
    } catch (error) {
      console.error('Error searching emails:', error)
      setError('Failed to search emails')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  async function handleReply() {
    if (!selectedEmail || !replyContent.trim()) {
      setError('Please enter a reply message')
      setTimeout(() => setError(''), 3000)
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Send reply email
      const replySubject = selectedEmail.subject.startsWith('Re:') 
        ? selectedEmail.subject 
        : `Re: ${selectedEmail.subject}`
      
      const response = await authenticatedFetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Bestibule AI Supporters <connect@bestibule.ca>',
          to: selectedEmail.replyTo || selectedEmail.from,
          subject: replySubject,
          html: convertTextToHtml(replyContent),
          replyTo: selectedEmail.messageId
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        // Mark original email as replied
        await markEmailAsReplied(selectedEmail.id, result.id)
        
        // Update local state
        setEmails(prev => prev.map(e => 
          e.id === selectedEmail.id ? { ...e, isReplied: true } : e
        ))
        
        setSuccess(`✅ Reply sent to ${selectedEmail.from}`)
        setTimeout(() => setSuccess(''), 5000)
        setShowReplyModal(false)
        setReplyContent('')
      } else {
        throw new Error(result.message || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      setError(`Failed to send reply: ${error.message}`)
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteEmail(emailId) {
    if (!confirm('Are you sure you want to delete this email? This action cannot be undone.')) {
      return
    }

    try {
      await deleteEmail(emailId)
      setEmails(prev => prev.filter(e => e.id !== emailId))
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null)
      }
      setSuccess('✅ Email deleted')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting email:', error)
      setError('Failed to delete email')
      setTimeout(() => setError(''), 5000)
    }
  }

  function convertTextToHtml(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
  }

  function formatDate(date) {
    if (!date) return 'Unknown'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function getFilteredEmails() {
    let filtered = emails
    
    if (filter === 'unread') {
      filtered = filtered.filter(e => !e.isRead)
    } else if (filter === 'replied') {
      filtered = filtered.filter(e => e.isReplied)
    }
    
    return filtered
  }

  return (
    <div className="min-h-screen bg-theme-background">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-theme-text" style={{ fontFamily: 'Georgia, serif' }}>📬 Email Inbox</h1>
              <p className="text-theme-text-muted mt-1">
                {unreadCount > 0 ? `${unreadCount} unread emails` : 'All caught up!'}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadInboxData}
                disabled={loading}
                className="px-4 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent-hover transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <button
                onClick={async () => {
                  try {
                    await createTestEmail({
                      subject: 'Test Email from Customer',
                      from: 'customer@example.com',
                      textContent: 'Hello! I have a question about your AI supporters. Can you help me understand how the daily insights work?',
                      priority: 'normal',
                      labels: ['support', 'question']
                    })
                    setSuccess('✅ Test email created!')
                    setTimeout(() => setSuccess(''), 3000)
                    loadInboxData()
                  } catch (error) {
                    setError('Failed to create test email')
                    setTimeout(() => setError(''), 3000)
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                🧪 Add Test Email
              </button>
            </div>
          </div>
        </div>


        {/* Search and Filters */}
        <div className="bg-theme-surface border border-theme-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search emails by subject, sender, or content..."
                className="w-full px-4 py-2 border border-theme-border rounded-lg bg-theme-background text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-theme-border rounded-lg bg-theme-background text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
              >
                <option value="all">All Emails</option>
                <option value="unread">Unread</option>
                <option value="replied">Replied</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent-hover transition-colors"
              >
                🔍 Search
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Email List and Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <div className="bg-theme-surface border border-theme-border rounded-lg">
              <div className="p-4 border-b border-theme-border">
                <h3 className="font-semibold text-theme-text">
                  Inbox ({getFilteredEmails().length})
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-theme-text-muted">
                    Loading emails...
                  </div>
                ) : getFilteredEmails().length === 0 ? (
                  <div className="p-4 text-center text-theme-text-muted">
                    No emails found
                  </div>
                ) : (
                  getFilteredEmails().map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailSelect(email)}
                      className={`p-4 border-b border-theme-border cursor-pointer hover:bg-theme-background transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-theme-background border-l-4 border-l-theme-accent' : ''
                      } ${!email.isRead ? 'bg-theme-card' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${!email.isRead ? 'font-bold text-theme-text' : 'text-theme-text'}`} style={{ fontSize: '18px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                            {email.from}
                          </p>
                          <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-theme-text' : 'text-theme-text-muted'}`} style={{ fontSize: '16px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                            {email.subject}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {!email.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {email.isReplied && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Replied
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-theme-text-muted" style={{ fontSize: '14px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                        {formatDate(email.receivedAt)}
                      </p>
                      {(email.text || email.textContent) && (
                        <p className="text-sm text-theme-text-muted mt-1 line-clamp-2" style={{ fontSize: '15px', lineHeight: '1.5', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                          {(email.text || email.textContent).substring(0, 120)}...
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Email Detail */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <div className="bg-theme-surface border border-theme-border rounded-lg">
                <div className="p-4 border-b border-theme-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-theme-text">
                      {selectedEmail.subject}
                    </h3>
                    <button
                      onClick={() => handleDeleteEmail(selectedEmail.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  <div className="text-sm text-theme-text-muted" style={{ fontSize: '18px', lineHeight: '1.6', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                    <p><strong>From:</strong> {selectedEmail.from}</p>
                    <p><strong>To:</strong> {selectedEmail.to}</p>
                    <p><strong>Date:</strong> {formatDate(selectedEmail.receivedAt)}</p>
                  </div>
                </div>
                <div className="p-6">
                  {selectedEmail.html || selectedEmail.htmlContent ? (
                    <div 
                      className="prose prose-lg max-w-none text-theme-text"
                      style={{ fontSize: '20px', lineHeight: '1.7', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html || selectedEmail.htmlContent }}
                    />
                  ) : (
                    <div 
                      className="whitespace-pre-wrap text-theme-text"
                      style={{ fontSize: '20px', lineHeight: '1.7', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
                    >
                      {selectedEmail.text || selectedEmail.textContent}
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-theme-border">
                  <button
                    onClick={() => setShowReplyModal(true)}
                    className="px-4 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent-hover transition-colors"
                  >
                    📧 Reply
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-theme-surface border border-theme-border rounded-lg p-8 text-center">
                <div className="text-theme-text-muted">
                  <div className="text-4xl mb-4">📧</div>
                  <p>Select an email to view its content</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reply Modal */}
        {showReplyModal && selectedEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  📧 Reply to {selectedEmail.from}
                </h3>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Reply Message
                  </label>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your reply here..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  style={{ minWidth: '120px' }}
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={loading || !replyContent.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  style={{ minWidth: '120px' }}
                >
                  {loading ? 'Sending...' : '📧 Send Reply'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
