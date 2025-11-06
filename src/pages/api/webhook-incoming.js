// Webhook endpoint for receiving incoming emails from Resend
// This handles the POST request from Resend when emails are received

import { saveIncomingEmail } from '../../services/inboxService'

/**
 * Handle incoming email webhook from Resend
 * This function processes incoming emails and saves them to the inbox
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📧 Received webhook from Resend:', req.body)

    // Verify webhook signature (optional but recommended for security)
    const signature = req.headers['resend-signature']
    if (!verifyWebhookSignature(req.body, signature)) {
      console.log('⚠️ Invalid webhook signature')
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Extract email data from webhook payload
    const webhookData = req.body
    const emailData = {
      messageId: webhookData.message_id || webhookData.id,
      subject: webhookData.subject || 'No Subject',
      from: webhookData.from || webhookData.sender,
      to: webhookData.to || webhookData.recipient,
      replyTo: webhookData.reply_to || webhookData.from,
      date: webhookData.date ? new Date(webhookData.date) : new Date(),
      
      // Content
      textContent: webhookData.text || webhookData.text_content || '',
      htmlContent: webhookData.html || webhookData.html_content || '',
      
      // Metadata
      priority: determineEmailPriority(webhookData),
      labels: determineEmailLabels(webhookData),
      
      // Raw webhook data for debugging
      rawData: webhookData
    }

    console.log('📬 Processing email:', emailData.subject)

    // Save to inbox
    const result = await saveIncomingEmail(emailData)
    
    console.log('✅ Email saved successfully:', result.id)

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Email processed successfully',
      emailId: result.id
    })

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return res.status(500).json({
      error: 'Failed to process email',
      message: error.message
    })
  }
}

/**
 * Verify webhook signature for security
 * This is a placeholder - implement proper signature verification
 */
function verifyWebhookSignature(body, signature) {
  // TODO: Implement proper webhook signature verification
  // For now, we'll accept all requests in development
  console.log('🔐 Webhook signature verification (placeholder)')
  return true
}

/**
 * Determine email priority based on content and sender
 */
function determineEmailPriority(emailData) {
  const subject = (emailData.subject || '').toLowerCase()
  const from = (emailData.from || '').toLowerCase()
  const content = (emailData.text || emailData.html || '').toLowerCase()
  
  // High priority keywords
  const highPriorityKeywords = ['urgent', 'asap', 'emergency', 'help', 'support', 'bug', 'error']
  const hasHighPriority = highPriorityKeywords.some(keyword => 
    subject.includes(keyword) || content.includes(keyword)
  )
  
  if (hasHighPriority) return 'high'
  
  // Low priority keywords
  const lowPriorityKeywords = ['newsletter', 'marketing', 'promotion', 'unsubscribe']
  const hasLowPriority = lowPriorityKeywords.some(keyword => 
    subject.includes(keyword) || from.includes(keyword)
  )
  
  if (hasLowPriority) return 'low'
  
  return 'normal'
}

/**
 * Determine email labels based on content and sender
 */
function determineEmailLabels(emailData) {
  const labels = []
  const subject = (emailData.subject || '').toLowerCase()
  const from = (emailData.from || '').toLowerCase()
  const content = (emailData.text || emailData.html || '').toLowerCase()
  
  // Support emails
  if (subject.includes('support') || subject.includes('help') || from.includes('support')) {
    labels.push('support')
  }
  
  // Newsletter replies
  if (subject.includes('re:') && (subject.includes('newsletter') || subject.includes('bestibule'))) {
    labels.push('newsletter-reply')
  }
  
  // Feedback
  if (subject.includes('feedback') || subject.includes('suggestion') || content.includes('feedback')) {
    labels.push('feedback')
  }
  
  // Bug reports
  if (subject.includes('bug') || subject.includes('error') || content.includes('not working')) {
    labels.push('bug-report')
  }
  
  return labels
}

