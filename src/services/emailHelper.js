import { auth } from '../firebaseConfig'

/**
 * Helper to send authenticated fetch requests
 * Adds Firebase Auth token to Authorization header
 */
export async function authenticatedFetch(url, options = {}) {
  const token = await auth.currentUser?.getIdToken()
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token && { 'Authorization': `Bearer ${token}` }),
    }
  })
}

