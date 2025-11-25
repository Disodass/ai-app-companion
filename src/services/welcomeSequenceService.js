import { getSubscribersForEmailType, createEmailCampaign, EMAIL_TYPES, updateEmailCampaignStatus } from './newsletterService'

/**
 * Welcome email sequence service
 */

/**
 * Send welcome email to new subscriber
 */
export async function sendWelcomeEmail(subscriberEmail, subscriberId = null) {
  try {
    console.log(`📧 Sending welcome email to ${subscriberEmail}`)
    
    const welcomeContent = generateWelcomeEmailContent(subscriberId)
    
    // Send email via secure Cloud Function
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bestibule <connect@bestibule.ca>',
        to: subscriberEmail,
        replyTo: 'connect@bestibule.ca',
        subject: 'Welcome to Bestibule',
        html: welcomeContent,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || errorData.error || 'Failed to send email')
    }
    
    const data = await response.json()
    console.log(`✅ Welcome email sent successfully to ${subscriberEmail}`, data)
    
    // Create campaign record for tracking
    const campaignData = {
      emailType: 'welcome_sequence',
      subject: 'Welcome to Bestibule! Meet Your AI Supporters 🤖✨',
      content: welcomeContent,
      subscriberCount: 1,
      scheduledFor: new Date(),
      metadata: {
        subscriberEmail,
        sequenceStep: 1,
        messageId: data.messageId || data.id || 'sent'
      }
    }
    
    await createEmailCampaign(campaignData)
    
    return { 
      success: true, 
        messageId: data.messageId || data.id || 'sent',
      subscriberEmail 
    }
    
  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
    throw error
  }
}

/**
 * Send follow-up email (Day 2)
 */
export async function sendFollowUpEmail(subscriberEmail, subscriberId = null) {
  try {
    console.log(`📧 Sending follow-up email to ${subscriberEmail}`)
    
    const followUpContent = generateFollowUpEmailContent(subscriberId)
    
    // Send email via secure Cloud Function
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bestibule <connect@bestibule.ca>',
        to: subscriberEmail,
        replyTo: 'connect@bestibule.ca',
        subject: 'Choose what feels right for you',
        html: followUpContent,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || errorData.error || 'Failed to send email')
    }
    
    const data = await response.json()
    console.log(`✅ Follow-up email sent successfully to ${subscriberEmail}`, data)
    
    // Create campaign record
    const campaignData = {
      emailType: 'welcome_sequence',
      subject: 'Your Daily Dose of AI Wisdom Starts Tomorrow 📚',
      content: followUpContent,
      subscriberCount: 1,
      scheduledFor: new Date(),
      metadata: {
        subscriberEmail,
        sequenceStep: 2,
        messageId: data.id
      }
    }
    
    await createEmailCampaign(campaignData)
    
    return { 
      success: true, 
        messageId: data.messageId || data.id || 'sent',
      subscriberEmail 
    }
    
  } catch (error) {
    console.error('❌ Error sending follow-up email:', error)
    throw error
  }
}

/**
 * Generate welcome email content
 */
function generateWelcomeEmailContent(subscriberId = null) {
  const unsubUrl = getUnsubscribeUrl(subscriberId)
  const prefsUrl = getPreferencesUrl()
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to Bestibule</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root { color-scheme: light only; }
    @media (max-width:600px){ .container{width:100% !important} .px{padding-left:20px !important; padding-right:20px !important} }
  </style>
</head>
<body style="margin:0;background:#F4F3EE;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EE;">
    <tr><td align="center">
      <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#F4F3EE;">
        <tr><td height="28"></td></tr>
        <tr><td class="px" style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="56" valign="middle" align="left">
                <img src="https://bestibule.ca/bestibule_logo_800x800.png" width="56" height="56" alt="Bestibule" style="display:block;border-radius:12px;">
              </td>
              <td align="left" style="font:600 28px/1.25 Georgia, Times New Roman, serif; color:#55422F; padding-left:12px;">
                Bestibule
                <div style="font:400 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#3a3a3a;">Best of You</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td height="18"></td></tr>
        <tr><td class="px" style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;">
            <tr><td style="padding:28px;">
              <p style="margin:0 0 14px;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                Hi there, 👋
              </p>
              <p style="margin:0 0 14px;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                Welcome to Bestibule — a calm space for reflection, insight, and steady growth. Each weekday, you'll receive a short message from one of our AI Supporters — voices shaped to guide, comfort, and challenge you in thoughtful ways.
              </p>
              <p style="margin:0 0 14px;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                You'll also get gentle Saturday recaps and Sunday previews to help you look back and look ahead without pressure.
              </p>
              <p style="margin:0 0 18px;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                Every note is designed to meet you where you are — never to overwhelm, only to remind you that small, consistent reflection can shape something lasting.
              </p>
              <p style="margin:18px 0 0;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                We're glad you're here. 🌱<br>— <span style="font-style:italic;">The Bestibule Team</span>
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td height="20"></td></tr>
        <tr><td class="px" style="padding:0 28px;">
          <p style="margin:0 0 18px;font:400 12px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#666;text-align:left;">
            You're receiving this because you subscribed to Bestibule AI Supporters.<br>
            <a href="${unsubUrl}" style="color:#70896B;text-decoration:underline;">Unsubscribe</a> • <a href="${prefsUrl}" style="color:#70896B;text-decoration:underline;">Update preferences</a>
          </p>
        </td></tr>
        <tr><td height="24"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Generate follow-up email content (Preferences Reminder)
 */
function generateFollowUpEmailContent(subscriberId = null) {
  const unsubUrl = getUnsubscribeUrl(subscriberId)
  const prefsUrl = getPreferencesUrl()
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Choose what feels right for you</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root { color-scheme: light only; }
    @media (max-width:600px){ .container{width:100% !important} .px{padding-left:20px !important; padding-right:20px !important} }
  </style>
</head>
<body style="margin:0;background:#F4F3EE;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EE;">
    <tr><td align="center">
      <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#F4F3EE;">
        <tr><td height="28"></td></tr>
        <tr><td class="px" style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="56" valign="middle" align="left">
                <img src="https://bestibule.ca/bestibule_logo_800x800.png" width="56" height="56" alt="Bestibule" style="display:block;border-radius:12px;">
              </td>
              <td align="left" style="font:600 28px/1.25 Georgia, Times New Roman, serif; color:#55422F; padding-left:12px;">
                Bestibule
                <div style="font:400 14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#3a3a3a;">Best of You</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td height="18"></td></tr>
        <tr><td class="px" style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;">
            <tr><td style="padding:28px;">
              <p style="margin:0 0 14px;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                Hi again, 👋
              </p>
              <p style="margin:0 0 14px;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                We know not everyone enjoys a daily email — and that's okay. Bestibule is here to support you in a way that fits your life.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 14px;">
                <tr><td style="font:600 15px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">Choose what you'd like to receive:</td></tr>
                <tr><td style="height:6px"></td></tr>
                <tr><td style="font:400 15px/1.8 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                  • <strong>Weekday insights</strong> — short notes from our AI Supporters<br>
                  • <strong>Saturday recap</strong> — a calm reflection on the week's highlights<br>
                  • <strong>Sunday preview</strong> — a simple look ahead to begin grounded
                </td></tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
                <a href="${prefsUrl}" style="display:inline-block;background:#70896B;color:#FFFFFF;text-decoration:none;font:600 15px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:12px 18px;border-radius:999px;">Manage my preferences</a>
              </td></tr></table>
              <p style="margin:18px 0 0;font:400 16px/1.7 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;">
                However you choose to stay connected, we're grateful you're here. 🌱<br>— <span style="font-style:italic;">The Bestibule Team</span>
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td height="20"></td></tr>
        <tr><td class="px" style="padding:0 28px;">
          <p style="margin:0 0 18px;font:400 12px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#666;text-align:left;">
            You're receiving this because you subscribed to Bestibule AI Supporters.<br>
            <a href="${unsubUrl}" style="color:#70896B;text-decoration:underline;">Unsubscribe</a> • <a href="${prefsUrl}" style="color:#70896B;text-decoration:underline;">Update preferences</a>
          </p>
        </td></tr>
        <tr><td height="24"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Helper functions for URLs
 */
function getBlogUrl() {
  return 'https://bestibule.ca/blog'
}

function getUnsubscribeUrl(subscriberId = '{{SUBSCRIBER_ID}}') {
  return `https://bestibule.ca/unsubscribe/${subscriberId}`
}

function getPreferencesUrl() {
  return 'https://bestibule.ca/preferences'
}

/**
 * Generate preview for welcome email
 */
export function generateWelcomeEmailPreview() {
  const htmlContent = generateWelcomeEmailContent('preview-subscriber-id')
  return {
    html: htmlContent,
    content: `Welcome to Bestibule — a calm space for reflection, insight, and steady growth.`,
    to: 'preview@example.com',
    from: 'Bestibule <connect@bestibule.ca>',
    subject: 'Welcome to Bestibule 🌿',
    type: 'welcome'
  }
}

/**
 * Generate preview for follow-up email
 */
export function generateFollowUpEmailPreview() {
  const htmlContent = generateFollowUpEmailContent('preview-subscriber-id')
  return {
    html: htmlContent,
    content: `Choose the emails that feel right for you — weekdays, Saturdays, Sundays, or all three.`,
    to: 'preview@example.com',
    from: 'Bestibule <connect@bestibule.ca>',
    subject: 'Choose what feels right for you 🌱',
    type: 'followup'
  }
}
