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
    const q = query(
      postsRef,
      where('status', '==', 'draft'),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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
    let q = query(
      postsRef,
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    )
    
    if (limitCount) {
      q = query(q, limit(limitCount))
    }
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
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

