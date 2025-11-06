import React, { useState } from 'react'
import EmailPreviewModal from '../../components/admin/EmailPreviewModal'
import AdminHeader from '../../components/admin/AdminHeader'

export default function EmailTemplates() {
  const [welcomeTemplate, setWelcomeTemplate] = useState(`Welcome to the Bestibule community! 🎉

Hey there, future AI-guided success story! 👋

You've just joined something special - a community where artificial intelligence meets authentic human growth. Welcome to Bestibule, where every day brings new insights, guidance, and support tailored just for you.

Here's what makes your journey with us unique:

• **Daily AI Insights**: Each weekday, receive wisdom from our specialized AI Supporters - Life Coaches, Therapists, and Wellness Experts who understand your goals

• **Saturday Recaps**: Every weekend, get a beautifully curated summary of the week's most impactful content, so you never miss the insights that matter

• **Sunday Previews**: Start each week with excitement as you discover what's coming up and how it can transform your daily routine

• **Personalized Growth**: Our AI adapts to your journey, providing guidance that evolves with your progress and goals

**Why Bestibule?**
We've created something that feels genuinely human - each AI Supporter has their own personality, expertise, and unique perspective. It's like having a personal team of advisors working around the clock, just for you.

**Your journey starts tomorrow morning** with your first daily insight. Get ready to experience the future of personal development! 🌅

Welcome to the community that's changing how people grow and succeed.

With excitement for your journey,
The Bestibule Team

P.S. Keep an eye on your inbox tomorrow - your first insight will be worth the wait! ✨`)

  const [followUpTemplate, setFollowUpTemplate] = useState(`Your transformation starts tomorrow! 🚀

Good evening, future success story! 🌙

Tomorrow morning marks a pivotal moment in your journey - your first daily insight from Bestibule will arrive in your inbox, and your path to AI-guided personal growth begins.

**What's coming your way this week:**

• **Monday - Life Coaching**: Start your week with powerful insights on goal-setting, motivation, and creating the life you envision

• **Tuesday - Wellness & Self-Care**: Discover practical strategies for maintaining your physical and mental well-being

• **Wednesday - Career & Productivity**: Learn how to optimize your professional performance and achieve your career goals

• **Thursday - Mental Health & Therapy**: Receive compassionate guidance on emotional wellness and personal development

• **Friday - Mindfulness & Growth**: End your week with practices that promote inner peace and continued growth

**The Bestibule Experience:**
Every Saturday, you'll receive a beautifully curated recap of the week's most impactful insights. Every Sunday, get excited about what's coming up next. It's like having a personal team of expert advisors, available 24/7, working exclusively for your success.

**Your journey to a better tomorrow starts in just a few hours.** 

Sweet dreams - tomorrow's insight will be the beginning of something extraordinary! 🌟

Ready for transformation,
The Bestibule Team

P.S. Set your morning routine to include a few minutes with your daily insight. You'll be amazed at how this small habit transforms your entire day! ✨`)

  const [isEditing, setIsEditing] = useState(false)
  const [previewModal, setPreviewModal] = useState({ isOpen: false, emailData: null, emailType: null })

  const handleSave = () => {
    // Here you would save to your database or config
    console.log('Saving templates:', { welcomeTemplate, followUpTemplate })
    setIsEditing(false)
    alert('Templates saved! (This would actually save to your database)')
  }

  // Convert template text to HTML email format using table-based layout
  const convertTemplateToHtml = (templateText, emailType) => {
    const subject = emailType === 'welcome' 
      ? 'Welcome to Bestibule! Meet Your AI Supporters 🤖✨'
      : 'Tomorrow is the Day! Your First Daily Insight Arrives 📚✨'
    
    const preheader = emailType === 'welcome'
      ? 'Welcome—your daily, gentle guidance begins tomorrow morning 🌅'
      : 'Tomorrow morning, your first daily insight arrives. Get ready! 🌅'
    
    // Convert plain text to HTML with proper formatting
    const htmlContent = templateText
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#8b8551;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/•/g, '✨')
    
    return `
      <!doctype html>
      <html lang="en" style="margin:0;padding:0;">
        <head>
          <meta charset="utf-8">
          <meta name="color-scheme" content="light only">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>${subject}</title>
          <style>
            .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; }
            @media (max-width:600px){ .container{ width:100%!important } .px{ padding-left:20px!important; padding-right:20px!important } }
          </style>
        </head>
        <body style="margin:0; padding:0; background:#F9F5EC; font-family:Inter, -apple-system, Arial, sans-serif;">
          <span class="preheader">${preheader}</span>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F9F5EC;">
            <tr>
              <td align="center" style="padding:28px 0;">
                
                <!-- Main Container -->
                <table role="presentation" width="600" class="container" cellspacing="0" cellpadding="0" border="0" style="width:600px; max-width:100%; margin:0 auto; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header with gradient -->
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
                            
                            <!-- Brand Name -->
                            <h1 style="margin:0 0 8px 0; font-family:Georgia, 'Times New Roman', serif; font-size:32px; font-weight:700; color:#3a2c1a; letter-spacing:-0.5px;">
                              Bestibule
                            </h1>
                            <p style="margin:0; font-family:Georgia, serif; font-size:16px; font-style:italic; color:#8b8551;">
                              — Best of You —
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td class="px" style="padding:40px 30px; background:#FFFFFF;">
                      <div style="font-size:16px; line-height:1.7; color:#3a2c1a;">
                        ${htmlContent}
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td class="px" style="padding:25px 30px; background:linear-gradient(180deg, #f0ebe0 0%, #e6dec4 100%); border-top:1px solid #d6c9a9; text-align:center;">
                      <p style="margin:0 0 10px 0; font-size:12px; color:#8b8551;">
                        You're receiving this because you subscribed to <strong style="color:#3a2c1a;">Bestibule AI Supporters</strong>.
                      </p>
                      <p style="margin:0; font-size:12px; color:#8b8551;">
                        <a href="#" style="color:#b6875c; text-decoration:none; font-weight:500;">Unsubscribe</a> • 
                        <a href="#" style="color:#b6875c; text-decoration:none; font-weight:500;">Update Preferences</a> • 
                        <a href="mailto:connect@bestibule.ca" style="color:#b6875c; text-decoration:none; font-weight:500;">Contact Us</a>
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

  // Preview functions
  function handlePreviewWelcomeEmail() {
    const htmlContent = convertTemplateToHtml(welcomeTemplate, 'welcome')
    const previewData = {
      subject: 'Welcome to Bestibule! Meet Your AI Supporters 🤖✨',
      html: htmlContent,
      content: welcomeTemplate,
      to: 'preview@example.com',
      from: 'Bestibule AI Supporters <connect@bestibule.ca>'
    }
    setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'welcome' })
  }

  function handlePreviewFollowUpEmail() {
    const htmlContent = convertTemplateToHtml(followUpTemplate, 'followup')
    const previewData = {
      subject: 'Tomorrow is the Day! Your First Daily Insight Arrives 📚✨',
      html: htmlContent,
      content: followUpTemplate,
      to: 'preview@example.com',
      from: 'Bestibule AI Supporters <connect@bestibule.ca>'
    }
    setPreviewModal({ isOpen: true, emailData: previewData, emailType: 'followup' })
  }

  function handleClosePreview() {
    setPreviewModal({ isOpen: false, emailData: null, emailType: null })
  }

  return (
    <div className="min-h-screen bg-theme-background">
      <AdminHeader />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-theme-text" style={{ fontFamily: 'Georgia, serif' }}>📧 Email Templates</h1>
              <p className="text-theme-text-muted mt-1">Customize your welcome and follow-up email content</p>
            </div>
            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-theme-border text-theme-text rounded-lg hover:bg-theme-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                  >
                    Save Templates
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                >
                  Edit Templates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Welcome Email Template */}
        <div className="bg-theme-surface border border-theme-border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-theme-text">📧 Welcome Email Template</h2>
              <p className="text-theme-text-muted text-sm mt-1">This email is sent when someone first subscribes</p>
            </div>
            <button
              onClick={handlePreviewWelcomeEmail}
              className="px-4 py-2 bg-brand-light text-brand-dark rounded-lg hover:bg-brand-accent hover:text-white transition-colors text-sm font-medium"
            >
              👁️ Preview Email
            </button>
          </div>
          
          {isEditing ? (
            <textarea
              value={welcomeTemplate}
              onChange={(e) => setWelcomeTemplate(e.target.value)}
              className="w-full h-64 p-4 border border-theme-border rounded-lg bg-theme-background text-theme-text resize-none focus:outline-none focus:ring-2 focus:ring-theme-accent"
              placeholder="Enter your welcome email template..."
            />
          ) : (
            <div className="bg-theme-background border border-theme-border rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-theme-text font-mono text-sm">{welcomeTemplate}</pre>
            </div>
          )}
        </div>

        {/* Follow-up Email Template */}
        <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-theme-text">📧 Follow-up Email Template</h2>
              <p className="text-theme-text-muted text-sm mt-1">This email is sent the day before their first blog post</p>
            </div>
            <button
              onClick={handlePreviewFollowUpEmail}
              className="px-4 py-2 bg-brand-light text-brand-dark rounded-lg hover:bg-brand-accent hover:text-white transition-colors text-sm font-medium"
            >
              👁️ Preview Email
            </button>
          </div>
          
          {isEditing ? (
            <textarea
              value={followUpTemplate}
              onChange={(e) => setFollowUpTemplate(e.target.value)}
              className="w-full h-64 p-4 border border-theme-border rounded-lg bg-theme-background text-theme-text resize-none focus:outline-none focus:ring-2 focus:ring-theme-accent"
              placeholder="Enter your follow-up email template..."
            />
          ) : (
            <div className="bg-theme-background border border-theme-border rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-theme-text font-mono text-sm">{followUpTemplate}</pre>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-blue-800 mb-3">💡 Tips for Better Emails</h3>
          <ul className="space-y-2 text-blue-700">
            <li>• Keep the tone warm and personal - like writing to a friend</li>
            <li>• Use emojis sparingly to add personality without being overwhelming</li>
            <li>• Make it clear what value they'll get from subscribing</li>
            <li>• Include a clear call-to-action or next step</li>
            <li>• Keep it concise - most people scan emails quickly</li>
          </ul>
        </div>

        {/* Email Preview Modal */}
        <EmailPreviewModal
          isOpen={previewModal.isOpen}
          onClose={handleClosePreview}
          emailData={previewModal.emailData}
          emailType={previewModal.emailType}
        />
      </div>
    </div>
  )
}
