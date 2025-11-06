import { db } from '../firebaseConfig'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore'

// Collection references
const SUBSCRIBERS_COLLECTION = 'newsletter_subscribers'
const EMAIL_CAMPAIGNS_COLLECTION = 'email_campaigns'
const EMAIL_PREFERENCES_COLLECTION = 'email_preferences'

/**
 * Email preference types
 */
export const EMAIL_TYPES = {
  INDIVIDUAL_BLOG: 'individual_blog',
  WEEKLY_RECAP: 'weekly_recap', 
  WEEKLY_PREVIEW: 'weekly_preview'
}

/**
 * Default email preferences
 */
export const DEFAULT_EMAIL_PREFERENCES = {
  individualBlog: true,
  weeklyRecap: true, 
  weeklyPreview: true,
  frequency: 'all' // 'all', 'weekly_only', 'individual_only'
}

/**
 * Create or update subscriber email preferences
 */
export async function updateSubscriberPreferences(userId, preferences) {
  try {
    const preferencesRef = doc(db, EMAIL_PREFERENCES_COLLECTION, userId)
    await updateDoc(preferencesRef, {
      ...preferences,
      updatedAt: Timestamp.now()
    })
    return true
  } catch (error) {
    // If document doesn't exist, create it
    if (error.code === 'not-found') {
      try {
        await addDoc(collection(db, EMAIL_PREFERENCES_COLLECTION), {
          userId,
          ...DEFAULT_EMAIL_PREFERENCES,
          ...preferences,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        return true
      } catch (createError) {
        console.error('Error creating email preferences:', createError)
        throw createError
      }
    }
    console.error('Error updating email preferences:', error)
    throw error
  }
}

/**
 * Get subscriber email preferences
 */
export async function getSubscriberPreferences(userId) {
  try {
    const preferencesRef = doc(db, EMAIL_PREFERENCES_COLLECTION, userId)
    const docSnap = await getDoc(preferencesRef)
    
    if (docSnap.exists()) {
      return docSnap.data()
    } else {
      // Return default preferences if none exist
      return {
        userId,
        ...DEFAULT_EMAIL_PREFERENCES
      }
    }
  } catch (error) {
    console.error('Error getting email preferences:', error)
    throw error
  }
}

/**
 * Get all subscribers (actual email addresses) - deduplicated
 */
export async function getAllSubscribers() {
  try {
    const subscribersRef = collection(db, SUBSCRIBERS_COLLECTION)
    const querySnapshot = await getDocs(subscribersRef)
    
    const allSubscribers = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }))
    
    // Deduplicate by email address (case insensitive)
    const uniqueSubscribers = []
    const seenEmails = new Set()
    
    for (const subscriber of allSubscribers) {
      const emailLower = subscriber.email?.toLowerCase()
      if (emailLower && !seenEmails.has(emailLower)) {
        seenEmails.add(emailLower)
        uniqueSubscribers.push(subscriber)
      }
    }
    
    console.log(`📊 Subscribers: ${allSubscribers.length} total, ${uniqueSubscribers.length} unique`)
    
    return uniqueSubscribers
  } catch (error) {
    console.error('Error getting all subscribers:', error)
    // If collection doesn't exist yet, return empty array
    return []
  }
}

/**
 * Get subscribers for a specific email type
 */
export async function getSubscribersForEmailType(emailType) {
  try {
    const subscribersRef = collection(db, SUBSCRIBERS_COLLECTION)
    const querySnapshot = await getDocs(subscribersRef)
    
    const allSubscribers = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(subscriber => {
        switch (emailType) {
          case EMAIL_TYPES.INDIVIDUAL_BLOG:
            return subscriber.individualBlog === true
          case EMAIL_TYPES.WEEKLY_RECAP:
            return subscriber.weeklyRecap === true
          case EMAIL_TYPES.WEEKLY_PREVIEW:
            return subscriber.weeklyPreview === true
          default:
            return false
        }
      })
    
    // Deduplicate by email address (case insensitive)
    const uniqueSubscribers = []
    const seenEmails = new Set()
    
    for (const subscriber of allSubscribers) {
      const emailLower = subscriber.email?.toLowerCase()
      if (emailLower && !seenEmails.has(emailLower)) {
        seenEmails.add(emailLower)
        uniqueSubscribers.push(subscriber)
      }
    }
    
    return uniqueSubscribers
  } catch (error) {
    console.error('Error getting subscribers for email type:', error)
    // If collection doesn't exist yet, return empty array
    return []
  }
}

/**
 * Clean up duplicate subscribers from the database
 */
export async function cleanupDuplicateSubscribers() {
  try {
    const subscribersRef = collection(db, SUBSCRIBERS_COLLECTION)
    const querySnapshot = await getDocs(subscribersRef)
    
    const allSubscribers = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }))
    
    // Group subscribers by email (case insensitive)
    const emailGroups = {}
    for (const subscriber of allSubscribers) {
      const emailLower = subscriber.email?.toLowerCase()
      if (emailLower) {
        if (!emailGroups[emailLower]) {
          emailGroups[emailLower] = []
        }
        emailGroups[emailLower].push(subscriber)
      }
    }
    
    // Find duplicates and delete them (keep the first one)
    const duplicateIds = []
    for (const [email, subscribers] of Object.entries(emailGroups)) {
      if (subscribers.length > 1) {
        // Keep the first subscriber, delete the rest
        for (let i = 1; i < subscribers.length; i++) {
          duplicateIds.push(subscribers[i].id)
        }
        console.log(`🧹 Found ${subscribers.length - 1} duplicates for ${email}`)
      }
    }
    
    // Delete duplicate subscribers
    const deletePromises = duplicateIds.map(id => 
      deleteDoc(doc(db, SUBSCRIBERS_COLLECTION, id))
    )
    
    await Promise.all(deletePromises)
    
    console.log(`✅ Cleaned up ${duplicateIds.length} duplicate subscribers`)
    return { deleted: duplicateIds.length }
    
  } catch (error) {
    console.error('Error cleaning up duplicate subscribers:', error)
    throw error
  }
}

/**
 * Delete subscriber by email address
 */
export async function deleteSubscriberByEmail(email) {
  try {
    console.log(`🗑️ Deleting subscriber: ${email}`)
    
    // Find all subscribers with this email
    const subscribersRef = collection(db, SUBSCRIBERS_COLLECTION)
    const q = query(subscribersRef, where('email', '==', email.toLowerCase()))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error(`No subscriber found with email: ${email}`)
    }
    
    // Delete all matching subscribers (in case of duplicates)
    const deletePromises = []
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref))
    })
    
    await Promise.all(deletePromises)
    
    console.log(`✅ Deleted ${deletePromises.length} subscriber(s) with email: ${email}`)
    return { deleted: deletePromises.length, email }
    
  } catch (error) {
    console.error('Error deleting subscriber:', error)
    throw error
  }
}

/**
 * Delete multiple subscribers by email addresses
 */
export async function deleteSubscribersByEmails(emails) {
  try {
    console.log(`🗑️ Deleting ${emails.length} subscribers`)
    
    const results = []
    for (const email of emails) {
      try {
        const result = await deleteSubscriberByEmail(email)
        results.push({ success: true, email, ...result })
      } catch (error) {
        results.push({ success: false, email, error: error.message })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    console.log(`✅ Deleted ${successCount} subscribers (${failCount} failed)`)
    return { results, successCount, failCount }
    
  } catch (error) {
    console.error('Error deleting multiple subscribers:', error)
    throw error
  }
}

/**
 * Create an email campaign record
 */
export async function createEmailCampaign(campaignData) {
  try {
    const campaignsRef = collection(db, EMAIL_CAMPAIGNS_COLLECTION)
    const docRef = await addDoc(campaignsRef, {
      ...campaignData,
      status: 'draft', // 'draft', 'scheduled', 'sent', 'failed'
      createdAt: Timestamp.now(),
      sentAt: null
    })
    
    return {
      id: docRef.id,
      ...campaignData
    }
  } catch (error) {
    console.error('Error creating email campaign:', error)
    throw error
  }
}

/**
 * Update email campaign status
 */
export async function updateEmailCampaignStatus(campaignId, status, sentAt = null) {
  try {
    const campaignRef = doc(db, EMAIL_CAMPAIGNS_COLLECTION, campaignId)
    const updateData = {
      status,
      updatedAt: Timestamp.now()
    }
    
    if (sentAt) {
      updateData.sentAt = sentAt
    }
    
    await updateDoc(campaignRef, updateData)
    return true
  } catch (error) {
    console.error('Error updating email campaign status:', error)
    throw error
  }
}

/**
 * Get email campaigns
 */
export async function getEmailCampaigns(limitCount = null) {
  try {
    const campaignsRef = collection(db, EMAIL_CAMPAIGNS_COLLECTION)
    const querySnapshot = await getDocs(campaignsRef)
    
    let campaigns = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
    
    if (limitCount) {
      campaigns = campaigns.slice(0, limitCount)
    }
    
    return campaigns
  } catch (error) {
    console.error('Error getting email campaigns:', error)
    throw error
  }
}

/**
 * Add a test subscriber (for testing purposes)
 */
export async function addTestSubscriber(email, preferences = DEFAULT_EMAIL_PREFERENCES) {
  try {
    const subscribersRef = collection(db, SUBSCRIBERS_COLLECTION)
    await addDoc(subscribersRef, {
      email,
      ...preferences,
      isTestSubscriber: true, // Mark as test subscriber
      subscribedAt: Timestamp.now(),
      createdAt: Timestamp.now()
    })
    
    // Also create their email preferences
    const preferencesRef = collection(db, EMAIL_PREFERENCES_COLLECTION)
    await addDoc(preferencesRef, {
      email,
      ...DEFAULT_EMAIL_PREFERENCES,
      ...preferences,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    
    return true
  } catch (error) {
    console.error('Error adding test subscriber:', error)
    throw error
  }
}

/**
 * Get campaign analytics
 */
export async function getCampaignAnalytics() {
  try {
    const campaigns = await getEmailCampaigns()
    
    const analytics = {
      total: campaigns.length,
      sent: campaigns.filter(c => c.status === 'sent').length,
      draft: campaigns.filter(c => c.status === 'draft').length,
      scheduled: campaigns.filter(c => c.status === 'scheduled').length,
      failed: campaigns.filter(c => c.status === 'failed').length,
      byType: {
        individualBlog: campaigns.filter(c => c.emailType === EMAIL_TYPES.INDIVIDUAL_BLOG).length,
        weeklyRecap: campaigns.filter(c => c.emailType === EMAIL_TYPES.WEEKLY_RECAP).length,
        weeklyPreview: campaigns.filter(c => c.emailType === EMAIL_TYPES.WEEKLY_PREVIEW).length
      }
    }
    
    return analytics
  } catch (error) {
    console.error('Error getting campaign analytics:', error)
    throw error
  }
}
