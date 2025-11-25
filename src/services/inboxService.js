import { db } from '../firebaseConfig'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore'

// Collection references
const INBOX_COLLECTION = 'email_inbox'
const EMAIL_THREADS_COLLECTION = 'email_threads'

/**
 * Email inbox service for managing incoming emails
 */

/**
 * Save incoming email to inbox
 */
export async function saveIncomingEmail(emailData) {
  try {
    console.log('📧 Saving incoming email:', emailData.subject)
    
    const inboxRef = collection(db, INBOX_COLLECTION)
    const docRef = await addDoc(inboxRef, {
      // Email headers
      messageId: emailData.messageId,
      subject: emailData.subject,
      from: emailData.from,
      to: emailData.to,
      replyTo: emailData.replyTo || emailData.from,
      date: emailData.date || Timestamp.now(),
      
      // Email content
      textContent: emailData.textContent || '',
      htmlContent: emailData.htmlContent || '',
      
      // Metadata
      isRead: false,
      isReplied: false,
      priority: emailData.priority || 'normal', // 'low', 'normal', 'high'
      labels: emailData.labels || [],
      threadId: emailData.threadId || null,
      
      // Processing info
      receivedAt: Timestamp.now(),
      processedAt: Timestamp.now(),
      
      // Original webhook data (for debugging)
      rawData: emailData.rawData || null
    })
    
    console.log(`✅ Incoming email saved with ID: ${docRef.id}`)
    return { id: docRef.id, success: true }
    
  } catch (error) {
    console.error('❌ Error saving incoming email:', error)
    throw error
  }
}

/**
 * Get all emails in inbox
 */
export async function getInboxEmails(limitCount = 50) {
  try {
    console.log('📬 Fetching inbox emails')
    
    const inboxRef = collection(db, INBOX_COLLECTION)
    const q = query(
      inboxRef, 
      orderBy('receivedAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const emails = []
    
    querySnapshot.forEach((doc) => {
      emails.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`✅ Fetched ${emails.length} inbox emails`)
    return emails
    
  } catch (error) {
    console.error('❌ Error fetching inbox emails:', error)
    // If collection doesn't exist or has no data, return empty array
    if (error.message?.includes('permission') || error.message?.includes('not found')) {
      console.log('📬 No inbox emails found or collection not accessible')
      return []
    }
    throw error
  }
}

/**
 * Get unread email count
 */
export async function getUnreadEmailCount() {
  try {
    const inboxRef = collection(db, INBOX_COLLECTION)
    const q = query(
      inboxRef, 
      where('isRead', '==', false)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.size
    
  } catch (error) {
    console.error('❌ Error getting unread count:', error)
    // If collection doesn't exist, return 0
    if (error.message?.includes('permission') || error.message?.includes('not found')) {
      console.log('📬 No inbox collection found, returning 0 unread count')
      return 0
    }
    return 0
  }
}

/**
 * Mark email as read
 */
export async function markEmailAsRead(emailId) {
  try {
    console.log(`📖 Marking email ${emailId} as read`)
    
    const emailRef = doc(db, INBOX_COLLECTION, emailId)
    await updateDoc(emailRef, {
      isRead: true,
      readAt: Timestamp.now()
    })
    
    console.log(`✅ Email ${emailId} marked as read`)
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error marking email as read:', error)
    throw error
  }
}

/**
 * Mark email as replied
 */
export async function markEmailAsReplied(emailId, replyMessageId) {
  try {
    console.log(`📤 Marking email ${emailId} as replied`)
    
    const emailRef = doc(db, INBOX_COLLECTION, emailId)
    await updateDoc(emailRef, {
      isReplied: true,
      repliedAt: Timestamp.now(),
      replyMessageId: replyMessageId
    })
    
    console.log(`✅ Email ${emailId} marked as replied`)
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error marking email as replied:', error)
    throw error
  }
}

/**
 * Get email thread (conversation history)
 */
export async function getEmailThread(threadId) {
  try {
    console.log(`🧵 Fetching email thread: ${threadId}`)
    
    const inboxRef = collection(db, INBOX_COLLECTION)
    const q = query(
      inboxRef, 
      where('threadId', '==', threadId),
      orderBy('receivedAt', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    const emails = []
    
    querySnapshot.forEach((doc) => {
      emails.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`✅ Fetched ${emails.length} emails in thread`)
    return emails
    
  } catch (error) {
    console.error('❌ Error fetching email thread:', error)
    throw error
  }
}

/**
 * Create email thread
 */
export function createEmailThread(originalEmailId, replyEmailId) {
  const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  return threadId
}

/**
 * Search emails
 */
export async function searchEmails(searchTerm, filters = {}) {
  try {
    console.log(`🔍 Searching emails for: ${searchTerm}`)
    
    const inboxRef = collection(db, INBOX_COLLECTION)
    let q = query(inboxRef, orderBy('receivedAt', 'desc'))
    
    // Add filters
    if (filters.isRead !== undefined) {
      q = query(q, where('isRead', '==', filters.isRead))
    }
    
    if (filters.from) {
      q = query(q, where('from', '==', filters.from))
    }
    
    const querySnapshot = await getDocs(q)
    const allEmails = []
    
    querySnapshot.forEach((doc) => {
      allEmails.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Client-side search (Firestore doesn't support full-text search)
    const searchResults = allEmails.filter(email => {
      const searchLower = searchTerm.toLowerCase()
      return (
        email.subject?.toLowerCase().includes(searchLower) ||
        email.from?.toLowerCase().includes(searchLower) ||
        email.textContent?.toLowerCase().includes(searchLower)
      )
    })
    
    console.log(`✅ Found ${searchResults.length} emails matching search`)
    return searchResults
    
  } catch (error) {
    console.error('❌ Error searching emails:', error)
    throw error
  }
}

/**
 * Delete email from inbox
 */
export async function deleteEmail(emailId) {
  try {
    console.log(`🗑️ Deleting email: ${emailId}`)
    
    const emailRef = doc(db, INBOX_COLLECTION, emailId)
    await deleteDoc(emailRef)
    
    console.log(`✅ Email ${emailId} deleted`)
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error deleting email:', error)
    throw error
  }
}

/**
 * Create a test email for development/testing
 */
export async function createTestEmail(testData) {
  try {
    console.log('🧪 Creating test email')
    
    const testEmailData = {
      messageId: `test_${Date.now()}`,
      subject: testData.subject || 'Test Email',
      from: testData.from || 'test@example.com',
      to: testData.to || 'connect@bestibule.ca',
      replyTo: testData.replyTo || testData.from,
      date: new Date(),
      
      textContent: testData.textContent || 'This is a test email content for development purposes.',
      htmlContent: testData.htmlContent || '<p>This is a test email content for development purposes.</p>',
      
      isRead: false,
      isReplied: false,
      priority: testData.priority || 'normal',
      labels: testData.labels || ['test'],
      threadId: null,
      
      receivedAt: Timestamp.now(),
      processedAt: Timestamp.now(),
      rawData: { isTestEmail: true, ...testData }
    }
    
    return await saveIncomingEmail(testEmailData)
    
  } catch (error) {
    console.error('❌ Error creating test email:', error)
    throw error
  }
}
