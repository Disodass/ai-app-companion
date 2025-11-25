import { getSubscribersForEmailType, createEmailCampaign, EMAIL_TYPES, updateEmailCampaignStatus } from './newsletterService'
import { updateBlogPostEmailStatus } from './blogService'
import { getLastWeekPosts, getThisWeekPosts } from './weeklySummaryService'

/**
 * Email automation service for sending different types of newsletters
 */

/**
 * Send individual blog post email
 */
export async function sendIndividualBlogEmail(post) {
  try {
    // Get subscribers who want individual blog emails
    const subscribers = await getSubscribersForEmailType(EMAIL_TYPES.INDIVIDUAL_BLOG)
    
    if (subscribers.length === 0) {
      console.log('No subscribers for individual blog emails')
      return { success: true, subscribers: 0 }
    }

    // Create email campaign record
    const campaignData = {
      emailType: EMAIL_TYPES.INDIVIDUAL_BLOG,
      subject: `New Blog Post: ${post.title}`,
      content: generateIndividualBlogEmailContent(post),
      subscriberCount: subscribers.length,
      postId: post.id,
      scheduledFor: new Date(),
      metadata: {
        supporterId: post.supporterId,
        wordCount: post.wordCount,
        tags: post.tags
      }
    }

    const campaign = await createEmailCampaign(campaignData)
    
    // Send emails via Resend API
    const sendResult = await sendEmailViaResend(campaign, subscribers)
    
    if (sendResult.success) {
      // Update campaign status
      await updateEmailCampaignStatus(campaign.id, 'sent', new Date())
      
      // Update blog post email status
      await updateBlogPostEmailStatus(post.id, true, new Date())
      
      return { success: true, campaignId: campaign.id, subscribers: subscribers.length }
    } else {
      await updateEmailCampaignStatus(campaign.id, 'failed')
      throw new Error('Failed to send email campaign')
    }
    
  } catch (error) {
    console.error('Error sending individual blog email:', error)
    throw error
  }
}

/**
 * Send weekly recap email
 */
export async function sendWeeklyRecapEmail() {
  try {
    // Get last week's posts
    const lastWeekPosts = await getLastWeekPosts()
    
    if (lastWeekPosts.length === 0) {
      console.log('No posts from last week to recap')
      return { success: true, posts: 0 }
    }

    // Get subscribers who want weekly recap emails
    const subscribers = await getSubscribersForEmailType(EMAIL_TYPES.WEEKLY_RECAP)
    
    if (subscribers.length === 0) {
      console.log('No subscribers for weekly recap emails')
      return { success: true, subscribers: 0 }
    }

    // Create email campaign record
    const campaignData = {
      emailType: EMAIL_TYPES.WEEKLY_RECAP,
      subject: `Weekly Recap: ${lastWeekPosts.length} Amazing Posts from Our AI Supporters`,
      content: generateWeeklyRecapEmailContent(lastWeekPosts),
      subscriberCount: subscribers.length,
      scheduledFor: new Date(),
      metadata: {
        postCount: lastWeekPosts.length,
        dateRange: {
          start: lastWeekPosts[0]?.publishedAt?.toDate(),
          end: lastWeekPosts[lastWeekPosts.length - 1]?.publishedAt?.toDate()
        }
      }
    }

    const campaign = await createEmailCampaign(campaignData)
    
    // Send emails via Resend API
    const sendResult = await sendEmailViaResend(campaign, subscribers)
    
    if (sendResult.success) {
      await updateEmailCampaignStatus(campaign.id, 'sent', new Date())
      return { success: true, campaignId: campaign.id, subscribers: subscribers.length }
    } else {
      await updateEmailCampaignStatus(campaign.id, 'failed')
      throw new Error('Failed to send weekly recap email')
    }
    
  } catch (error) {
    console.error('Error sending weekly recap email:', error)
    throw error
  }
}

/**
 * Send weekly preview email
 */
export async function sendWeeklyPreviewEmail() {
  try {
    // Get this week's posts
    const thisWeekPosts = await getThisWeekPosts()
    
    if (thisWeekPosts.length === 0) {
      console.log('No posts scheduled for this week to preview')
      return { success: true, posts: 0 }
    }

    // Get subscribers who want weekly preview emails
    const subscribers = await getSubscribersForEmailType(EMAIL_TYPES.WEEKLY_PREVIEW)
    
    if (subscribers.length === 0) {
      console.log('No subscribers for weekly preview emails')
      return { success: true, subscribers: 0 }
    }

    // Create email campaign record
    const campaignData = {
      emailType: EMAIL_TYPES.WEEKLY_PREVIEW,
      subject: `This Week's Preview: ${thisWeekPosts.length} Exciting Posts Coming Up`,
      content: generateWeeklyPreviewEmailContent(thisWeekPosts),
      subscriberCount: subscribers.length,
      scheduledFor: new Date(),
      metadata: {
        postCount: thisWeekPosts.length,
        dateRange: {
          start: thisWeekPosts[0]?.publishedAt?.toDate(),
          end: thisWeekPosts[thisWeekPosts.length - 1]?.publishedAt?.toDate()
        }
      }
    }

    const campaign = await createEmailCampaign(campaignData)
    
    // Send emails via Resend API
    const sendResult = await sendEmailViaResend(campaign, subscribers)
    
    if (sendResult.success) {
      await updateEmailCampaignStatus(campaign.id, 'sent', new Date())
      return { success: true, campaignId: campaign.id, subscribers: subscribers.length }
    } else {
      await updateEmailCampaignStatus(campaign.id, 'failed')
      throw new Error('Failed to send weekly preview email')
    }
    
  } catch (error) {
    console.error('Error sending weekly preview email:', error)
    throw error
  }
}

/**
 * Generate individual blog email content
 */
function generateIndividualBlogEmailContent(post) {
  return `
    <!doctype html>
    <html lang="en" style="margin:0;padding:0;">
      <head>
        <meta charset="utf-8">
        <meta name="color-scheme" content="light only">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>New Blog Post: ${post.title}</title>
        <style>
          .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; }
          @media (max-width:600px){ .container{ width:100%!important } .px{ padding-left:20px!important; padding-right:20px!important } }
        </style>
      </head>
      <body style="margin:0; padding:0; background:#F9F5EC; font-family:Inter, -apple-system, Arial, sans-serif;">
        <span class="preheader">${post.excerpt || 'Read the full post to discover valuable insights...'}</span>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F9F5EC;">
          <tr>
            <td align="center" style="padding:28px 0;">
              
              <!-- Main Container -->
              <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:100%; margin:0 auto; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td class="px" style="padding:40px 30px; background:linear-gradient(180deg, #E6DEC4 0%, #D4C299 100%); text-align:center;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <!-- Logo Badge -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 16px auto;">
                            <tr>
                              <td style="width:50px; height:50px; background:linear-gradient(135deg, #8b8551 0%, #b6875c 100%); border-radius:50%; text-align:center; vertical-align:middle;">
                                <span style="color:#f9f5ec; font-size:24px; font-weight:bold; font-family:Georgia, serif; line-height:50px;">B</span>
                              </td>
                            </tr>
                          </table>
                          
                          <h1 style="margin:0 0 8px 0; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:700; color:#3a2c1a;">
                            Bestibule
                          </h1>
                          <p style="margin:0; font-family:Georgia, serif; font-size:14px; font-style:italic; color:#8b8551;">
                            New Blog Post 📝
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td class="px" style="padding:40px 30px; background:#FFFFFF;">
                    <h2 style="margin:0 0 20px 0; font-size:24px; font-weight:700; color:#3a2c1a; line-height:1.3; font-family:Georgia, serif;">
                      ${post.title}
                    </h2>
                    
                    <!-- Excerpt Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
                      <tr>
                        <td style="padding:20px; background:linear-gradient(135deg, #f0ebe0 0%, #e6dec4 100%); border-radius:8px; border-left:3px solid #b6875c;">
                          <p style="margin:0; font-size:16px; line-height:1.6; color:#3a2c1a; font-style:italic;">
                            ${post.excerpt || 'Read the full post to discover valuable insights...'}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px auto;" align="center">
                      <tr>
                        <td style="border-radius:8px; background:linear-gradient(180deg, #d4c299 0%, #c0a46d 100%); box-shadow:0 4px 12px rgba(180, 135, 92, 0.3);">
                          <a href="${getBlogPostUrl(post.id)}" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:600; color:#3a2c1a; text-decoration:none; font-family:Inter, Arial, sans-serif;">
                            Read Full Post →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td class="px" style="padding:25px 30px; background:linear-gradient(180deg, #f0ebe0 0%, #e6dec4 100%); border-top:1px solid #d6c9a9; text-align:center;">
                    <p style="margin:0 0 10px 0; font-size:12px; color:#8b8551;">
                      You're receiving this because you subscribed to <strong style="color:#3a2c1a;">individual blog post notifications</strong>.
                    </p>
                    <p style="margin:0; font-size:12px; color:#8b8551;">
                      <a href="${getUnsubscribeUrl()}" style="color:#b6875c; text-decoration:none; font-weight:500;">Unsubscribe</a> • 
                      <a href="${getPreferencesUrl()}" style="color:#b6875c; text-decoration:none; font-weight:500;">Update Preferences</a>
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

/**
 * Generate weekly recap email content
 */
function generateWeeklyRecapEmailContent(posts) {
  const postsList = posts.map(post => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
      <tr>
        <td style="padding:20px; background:linear-gradient(135deg, #f0ebe0 0%, #e6dec4 100%); border-radius:8px; border-left:4px solid #b6875c;">
          <h3 style="margin:0 0 10px 0; font-size:18px; font-weight:600; color:#3a2c1a;">
            <a href="${getBlogPostUrl(post.id)}" style="color:#8b8551; text-decoration:none;">
              ${post.title}
            </a>
          </h3>
          <p style="margin:0; font-size:15px; line-height:1.6; color:#3a2c1a;">
            ${post.excerpt || 'Read the full post for valuable insights...'}
          </p>
        </td>
      </tr>
    </table>
  `).join('')

  return `
    <!doctype html>
    <html lang="en" style="margin:0;padding:0;">
      <head>
        <meta charset="utf-8">
        <meta name="color-scheme" content="light only">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Weekly Recap from Bestibule</title>
        <style>
          .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; }
          @media (max-width:600px){ .container{ width:100%!important } .px{ padding-left:20px!important; padding-right:20px!important } }
        </style>
      </head>
      <body style="margin:0; padding:0; background:#F9F5EC; font-family:Inter, -apple-system, Arial, sans-serif;">
        <span class="preheader">Here's a recap of the ${posts.length} amazing posts our AI Supporters shared this week</span>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F9F5EC;">
          <tr>
            <td align="center" style="padding:28px 0;">
              
              <!-- Main Container -->
              <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:100%; margin:0 auto; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td class="px" style="padding:40px 30px; background:linear-gradient(180deg, #E6DEC4 0%, #D4C299 100%); text-align:center;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <!-- Logo Badge -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 16px auto;">
                            <tr>
                              <td style="width:50px; height:50px; background:linear-gradient(135deg, #8b8551 0%, #b6875c 100%); border-radius:50%; text-align:center; vertical-align:middle;">
                                <span style="color:#f9f5ec; font-size:24px; font-weight:bold; font-family:Georgia, serif; line-height:50px;">B</span>
                              </td>
                            </tr>
                          </table>
                          
                          <h1 style="margin:0 0 8px 0; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:700; color:#3a2c1a;">
                            Bestibule
                          </h1>
                          <p style="margin:0; font-family:Georgia, serif; font-size:14px; font-style:italic; color:#8b8551;">
                            📋 Weekly Recap
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td class="px" style="padding:40px 30px; background:#FFFFFF;">
                    <p style="margin:0 0 30px 0; font-size:18px; line-height:1.6; color:#3a2c1a; text-align:center;">
                      Here's a recap of the <strong style="color:#8b8551;">${posts.length} amazing blog posts</strong> our AI Supporters shared this week:
                    </p>
                    
                    ${postsList}
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:40px auto 20px auto;" align="center">
                      <tr>
                        <td style="border-radius:8px; background:linear-gradient(180deg, #d4c299 0%, #c0a46d 100%); box-shadow:0 4px 12px rgba(180, 135, 92, 0.3);">
                          <a href="${getBlogUrl()}" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:600; color:#3a2c1a; text-decoration:none; font-family:Inter, Arial, sans-serif;">
                            Visit Our Blog →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td class="px" style="padding:25px 30px; background:linear-gradient(180deg, #f0ebe0 0%, #e6dec4 100%); border-top:1px solid #d6c9a9; text-align:center;">
                    <p style="margin:0 0 10px 0; font-size:12px; color:#8b8551;">
                      You're receiving this because you subscribed to <strong style="color:#3a2c1a;">weekly recap notifications</strong>.
                    </p>
                    <p style="margin:0; font-size:12px; color:#8b8551;">
                      <a href="${getUnsubscribeUrl()}" style="color:#b6875c; text-decoration:none; font-weight:500;">Unsubscribe</a> • 
                      <a href="${getPreferencesUrl()}" style="color:#b6875c; text-decoration:none; font-weight:500;">Update Preferences</a>
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

/**
 * Generate weekly preview email content
 */
function generateWeeklyPreviewEmailContent(posts) {
  const postsList = posts.map(post => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
      <tr>
        <td style="padding:20px; background:linear-gradient(135deg, #f0ebe0 0%, #e6dec4 100%); border-radius:8px; border-left:4px solid #b6875c;">
          <h3 style="margin:0 0 10px 0; font-size:18px; font-weight:600; color:#3a2c1a;">
            ${post.title}
          </h3>
          <p style="margin:0 0 10px 0; font-size:15px; line-height:1.6; color:#3a2c1a;">
            ${post.excerpt || 'Coming soon - stay tuned for valuable insights...'}
          </p>
          <p style="margin:0; font-size:13px; font-weight:600; color:#8b8551;">
            📅 ${formatDate(post.publishedAt?.toDate())}
          </p>
        </td>
      </tr>
    </table>
  `).join('')

  return `
    <!doctype html>
    <html lang="en" style="margin:0;padding:0;">
      <head>
        <meta charset="utf-8">
        <meta name="color-scheme" content="light only">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>This Week's Preview from Bestibule</title>
        <style>
          .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; }
          @media (max-width:600px){ .container{ width:100%!important } .px{ padding-left:20px!important; padding-right:20px!important } }
        </style>
      </head>
      <body style="margin:0; padding:0; background:#F9F5EC; font-family:Inter, -apple-system, Arial, sans-serif;">
        <span class="preheader">Get ready for ${posts.length} exciting blog posts coming this week!</span>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F9F5EC;">
          <tr>
            <td align="center" style="padding:28px 0;">
              
              <!-- Main Container -->
              <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:100%; margin:0 auto; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td class="px" style="padding:40px 30px; background:linear-gradient(180deg, #E6DEC4 0%, #D4C299 100%); text-align:center;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <!-- Logo Badge -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 16px auto;">
                            <tr>
                              <td style="width:50px; height:50px; background:linear-gradient(135deg, #8b8551 0%, #b6875c 100%); border-radius:50%; text-align:center; vertical-align:middle;">
                                <span style="color:#f9f5ec; font-size:24px; font-weight:bold; font-family:Georgia, serif; line-height:50px;">B</span>
                              </td>
                            </tr>
                          </table>
                          
                          <h1 style="margin:0 0 8px 0; font-family:Georgia, 'Times New Roman', serif; font-size:28px; font-weight:700; color:#3a2c1a;">
                            Bestibule
                          </h1>
                          <p style="margin:0; font-family:Georgia, serif; font-size:14px; font-style:italic; color:#8b8551;">
                            🔮 This Week's Preview
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td class="px" style="padding:40px 30px; background:#FFFFFF;">
                    <p style="margin:0 0 30px 0; font-size:18px; line-height:1.6; color:#3a2c1a; text-align:center;">
                      Get ready for <strong style="color:#8b8551;">${posts.length} exciting blog posts</strong> coming this week from our AI Supporters:
                    </p>
                    
                    ${postsList}
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:40px auto 20px auto;" align="center">
                      <tr>
                        <td style="border-radius:8px; background:linear-gradient(180deg, #d4c299 0%, #c0a46d 100%); box-shadow:0 4px 12px rgba(180, 135, 92, 0.3);">
                          <a href="${getBlogUrl()}" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:600; color:#3a2c1a; text-decoration:none; font-family:Inter, Arial, sans-serif;">
                            Visit Our Blog →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td class="px" style="padding:25px 30px; background:linear-gradient(180deg, #f0ebe0 0%, #e6dec4 100%); border-top:1px solid #d6c9a9; text-align:center;">
                    <p style="margin:0 0 10px 0; font-size:12px; color:#8b8551;">
                      You're receiving this because you subscribed to <strong style="color:#3a2c1a;">weekly preview notifications</strong>.
                    </p>
                    <p style="margin:0; font-size:12px; color:#8b8551;">
                      <a href="${getUnsubscribeUrl()}" style="color:#b6875c; text-decoration:none; font-weight:500;">Unsubscribe</a> • 
                      <a href="${getPreferencesUrl()}" style="color:#b6875c; text-decoration:none; font-weight:500;">Update Preferences</a>
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

/**
 * Send email via Resend API
 */
export async function sendEmailViaResend(campaign, subscribers) {
  try {
    console.log(`📧 Sending ${campaign.emailType} email to ${subscribers.length} subscribers via Mailersend`)
    console.log(`Subject: ${campaign.subject}`)
    
    // Send email to each subscriber
    const emailPromises = subscribers.map(async (subscriber) => {
      try {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Bestibule AI Supporters <connect@bestibule.ca>',
            to: subscriber.email,
            subject: campaign.subject,
            html: campaign.content,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error(`❌ Failed to send email to ${subscriber.email}:`, errorData)
          return { success: false, email: subscriber.email, error: errorData.details || errorData.error }
        }
        
        const data = await response.json()
        console.log(`✅ Email sent successfully to ${subscriber.email}`, data)
        return { success: true, email: subscriber.email, messageId: data.messageId }
      } catch (error) {
        console.error(`❌ Error sending email to ${subscriber.email}:`, error)
        return { success: false, email: subscriber.email, error: error.message }
      }
    })
    
    const results = await Promise.all(emailPromises)
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`📊 Email send results: ${successful} successful, ${failed} failed`)
    
    // Return success if at least one email was sent successfully
    return { 
      success: successful > 0, 
      successful, 
      failed,
      results 
    }
    
  } catch (error) {
    console.error('❌ Error in sendEmailViaResend:', error)
    return { 
      success: false, 
      error: error.message,
      successful: 0,
      failed: subscribers.length 
    }
  }
}

/**
 * Helper functions for URLs (replace with actual URLs)
 */
function getBlogPostUrl(postId) {
  return `https://bestibule.ca/blog/${postId}`
}

function getBlogUrl() {
  return 'https://bestibule.ca/blog'
}

function getUnsubscribeUrl(subscriberId = '{{SUBSCRIBER_ID}}') {
  return `https://bestibule.ca/unsubscribe/${subscriberId}`
}

function getPreferencesUrl() {
  return 'https://bestibule.ca/preferences'
}

function formatDate(date) {
  if (!date) return 'TBD'
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Generate preview for individual blog email
 */
export function generateIndividualBlogEmailPreview(post = null) {
  // Use sample post if none provided
  const samplePost = post || {
    id: 'preview-post-id',
    title: 'Sample Blog Post: The Future of AI in Daily Life',
    excerpt: 'Discover how artificial intelligence is transforming the way we work, learn, and interact with technology in our everyday lives.',
    content: 'This is a sample blog post content that would appear in the email preview...',
    author: 'AI Friend',
    publishedAt: new Date(),
    supporterId: 'sample-supporter'
  }

  const htmlContent = generateIndividualBlogEmailContent(samplePost)
  return {
    html: htmlContent,
    content: `New blog post: ${samplePost.title}. ${samplePost.excerpt}`,
    to: 'preview@example.com',
    from: 'Bestibule AI Supporters <connect@bestibule.ca>',
    subject: `New Blog Post: ${samplePost.title}`,
    type: 'individual_blog'
  }
}

/**
 * Generate preview for weekly recap email
 */
export function generateWeeklyRecapEmailPreview() {
  const htmlContent = generateWeeklyRecapEmailContent()
  return {
    html: htmlContent,
    content: `Weekly recap: Here's a recap of amazing blog posts our AI Supporters shared this week.`,
    to: 'preview@example.com',
    from: 'Bestibule AI Supporters <connect@bestibule.ca>',
    subject: `Weekly Recap: Amazing Posts from Our AI Supporters`,
    type: 'weekly_recap'
  }
}

/**
 * Generate preview for weekly preview email
 */
export function generateWeeklyPreviewEmailPreview() {
  const htmlContent = generateWeeklyPreviewEmailContent()
  return {
    html: htmlContent,
    content: `Weekly preview: Get ready for an amazing week ahead with insights from our AI Supporters.`,
    to: 'preview@example.com',
    from: 'Bestibule AI Supporters <connect@bestibule.ca>',
    subject: `Weekly Preview: Your Week Ahead with Bestibule`,
    type: 'weekly_preview'
  }
}

