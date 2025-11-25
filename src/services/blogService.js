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

// Collection reference
const BLOG_POSTS_COLLECTION = 'blog_posts'

/**
 * Create a new blog post draft
 */
export async function createBlogPost(postData) {
  try {
    const postsRef = collection(db, BLOG_POSTS_COLLECTION)
    const docRef = await addDoc(postsRef, {
      ...postData,
      status: 'draft',
      createdAt: Timestamp.now(),
      publishedAt: null,
      emailSent: false,
      emailSentAt: null
    })
    
    return {
      id: docRef.id,
      ...postData
    }
  } catch (error) {
    console.error('Error creating blog post:', error)
    throw error
  }
}

/**
 * Get a single blog post by ID
 */
export async function getBlogPost(postId) {
  try {
    const docRef = doc(db, BLOG_POSTS_COLLECTION, postId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      }
    } else {
      throw new Error('Post not found')
    }
  } catch (error) {
    console.error('Error getting blog post:', error)
    throw error
  }
}

/**
 * Get all draft posts
 */
export async function getDraftPosts() {
  try {
    const postsRef = collection(db, BLOG_POSTS_COLLECTION)
    const querySnapshot = await getDocs(postsRef)
    
    // Filter drafts in memory (avoids needing index)
    const drafts = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(post => post.status === 'draft')
      .sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
    
    return drafts
  } catch (error) {
    console.error('Error getting draft posts:', error)
    throw error
  }
}

/**
 * Get all published posts
 */
export async function getPublishedPosts(limitCount = null) {
  try {
    const postsRef = collection(db, BLOG_POSTS_COLLECTION)
    const querySnapshot = await getDocs(postsRef)
    
    // Filter published posts in memory (avoids needing index)
    let published = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(post => post.status === 'published')
      .sort((a, b) => b.publishedAt?.toDate() - a.publishedAt?.toDate())
    
    if (limitCount) {
      published = published.slice(0, limitCount)
    }
    
    return published
  } catch (error) {
    console.error('Error getting published posts:', error)
    throw error
  }
}

/**
 * Get posts by supporter
 */
export async function getPostsBySupporter(supporterId) {
  try {
    const postsRef = collection(db, BLOG_POSTS_COLLECTION)
    const q = query(
      postsRef,
      where('supporterId', '==', supporterId),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting posts by supporter:', error)
    throw error
  }
}

/**
 * Update a blog post
 */
export async function updateBlogPost(postId, updates) {
  try {
    const docRef = doc(db, BLOG_POSTS_COLLECTION, postId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
    
    return {
      id: postId,
      ...updates
    }
  } catch (error) {
    console.error('Error updating blog post:', error)
    throw error
  }
}

/**
 * Publish a blog post
 */
export async function publishBlogPost(postId) {
  try {
    const docRef = doc(db, BLOG_POSTS_COLLECTION, postId)
    await updateDoc(docRef, {
      status: 'published',
      publishedAt: Timestamp.now()
    })
    
    return true
  } catch (error) {
    console.error('Error publishing blog post:', error)
    throw error
  }
}

/**
 * Update blog post email status
 */
export async function updateBlogPostEmailStatus(postId, emailSent = false, emailSentAt = null) {
  try {
    const docRef = doc(db, BLOG_POSTS_COLLECTION, postId)
    const updateData = {
      emailSent,
      updatedAt: Timestamp.now()
    }
    
    if (emailSentAt) {
      updateData.emailSentAt = emailSentAt
    }
    
    await updateDoc(docRef, updateData)
    return true
  } catch (error) {
    console.error('Error updating blog post email status:', error)
    throw error
  }
}

/**
 * Delete a blog post
 */
export async function deleteBlogPost(postId) {
  try {
    const docRef = doc(db, BLOG_POSTS_COLLECTION, postId)
    await deleteDoc(docRef)
    return true
  } catch (error) {
    console.error('Error deleting blog post:', error)
    throw error
  }
}

/**
 * Mark a post as email sent
 */
export async function markEmailSent(postId) {
  try {
    const docRef = doc(db, BLOG_POSTS_COLLECTION, postId)
    await updateDoc(docRef, {
      emailSent: true,
      emailSentAt: Timestamp.now()
    })
    return true
  } catch (error) {
    console.error('Error marking email sent:', error)
    throw error
  }
}

/**
 * Get the last published post by a specific supporter (for continue feature)
 */
export async function getLastPostBySupporter(supporterId) {
  try {
    const postsRef = collection(db, BLOG_POSTS_COLLECTION)
    const querySnapshot = await getDocs(postsRef)
    
    // Filter posts in memory to avoid needing complex Firestore indexes
    const supporterPosts = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(post => post.supporterId === supporterId && post.status === 'published')
      .sort((a, b) => b.publishedAt?.toDate() - a.publishedAt?.toDate())
    
    return supporterPosts.length > 0 ? supporterPosts[0] : null
  } catch (error) {
    console.error('Error getting last post by supporter:', error)
    throw error
  }
}

/**
 * Get all posts by a supporter (including drafts)
 */
export async function getAllPostsBySupporter(supporterId) {
  try {
    const postsRef = collection(db, BLOG_POSTS_COLLECTION)
    const querySnapshot = await getDocs(postsRef)
    
    const supporterPosts = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(post => post.supporterId === supporterId)
      .sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
    
    return supporterPosts
  } catch (error) {
    console.error('Error getting all posts by supporter:', error)
    throw error
  }
}

