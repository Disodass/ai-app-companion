// Webhook endpoint for receiving incoming emails from Resend
// This would typically be a server-side endpoint, but for development we'll create a client-side handler

/**
 * Handle incoming email webhook from Resend
 * This function processes incoming emails and saves them to the inbox
 */
export async function handleIncomingEmailWebhook(webhookData) {
  try {
    console.log('📧 Processing incoming email webhook:', webhookData)
    
    // Extract email data from webhook payload
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
    
    // Save to inbox (this would call your inbox service)
    console.log('📬 Saving email to inbox:', emailData.subject)
    
    // For now, we'll simulate saving the email
    // In a real implementation, this would call saveIncomingEmail(emailData)
    return {
      success: true,
      message: 'Email processed successfully',
      emailId: `email_${Date.now()}`
    }
    
  } catch (error) {
    console.error('❌ Error processing incoming email webhook:', error)
    throw error
  }
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

/**
 * Test function to simulate receiving an email
 * This can be used for development and testing
 */
export async function simulateIncomingEmail(testEmailData) {
  console.log('🧪 Simulating incoming email for testing')
  
  const mockWebhookData = {
    message_id: `test_${Date.now()}`,
    subject: testEmailData.subject || 'Test Email',
    from: testEmailData.from || 'test@example.com',
    to: testEmailData.to || 'connect@bestibule.ca',
    date: new Date().toISOString(),
    text: testEmailData.textContent || 'This is a test email content.',
    html: testEmailData.htmlContent || '<p>This is a test email content.</p>',
    ...testEmailData
  }
  
  return await handleIncomingEmailWebhook(mockWebhookData)
}

