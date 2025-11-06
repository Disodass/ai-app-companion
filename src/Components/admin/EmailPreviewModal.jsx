import React from 'react'

export default function EmailPreviewModal({ isOpen, onClose, emailData, emailType }) {
  if (!isOpen) return null

  const getEmailTypeLabel = (type) => {
    switch (type) {
      case 'welcome': return 'Welcome Email'
      case 'followup': return 'Follow-up Email'
      case 'weekly_recap': return 'Weekly Recap Newsletter'
      case 'weekly_preview': return 'Weekly Preview Newsletter'
      case 'individual_blog': return 'Individual Blog Post'
      default: return 'Email Preview'
    }
  }

  const getEmailTypeIcon = (type) => {
    switch (type) {
      case 'welcome': return '👋'
      case 'followup': return '📧'
      case 'weekly_recap': return '📋'
      case 'weekly_preview': return '🔮'
      case 'individual_blog': return '📝'
      default: return '📧'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getEmailTypeIcon(emailType)}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getEmailTypeLabel(emailType)}</h2>
              <p className="text-sm text-gray-500">Preview how this email will look to recipients</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="w-5 h-5 text-gray-500 text-lg font-bold">×</span>
          </button>
        </div>

        {/* Email Preview */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="text-xs text-gray-600 mb-2">
              <strong>From:</strong> {emailData?.from || 'Bestibule AI Supporters <connect@bestibule.ca>'}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              <strong>To:</strong> {emailData?.to || 'subscriber@example.com'}
            </div>
            <div className="text-xs text-gray-600 mb-4">
              <strong>Subject:</strong> {emailData?.subject || 'Email Subject'}
            </div>
          </div>

          {/* Email Content */}
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{backgroundColor: '#F4F3EE'}}>
            <div 
              className="email-preview-content"
              style={{
                width: '100%',
                maxWidth: '100%',
                overflow: 'auto',
                minHeight: '400px',
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: '#F4F3EE'
              }}
              dangerouslySetInnerHTML={{ 
                __html: emailData?.html || emailData?.content || '<p>No content available</p>' 
              }}
            />
          </div>

          {/* Raw HTML Toggle (for debugging) */}
          {emailData?.html && (
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                Show Raw HTML
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-x-auto">
                <code>{emailData.html}</code>
              </pre>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
