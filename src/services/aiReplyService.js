// Server-side AI reply service using Cloud Functions
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

/**
 * Get AI reply from Groq API via Cloud Function (server-side)
 * @param {Object} payload - The Groq API payload (model, messages, temperature, etc.)
 * @returns {Promise<Object>} The Groq API response
 */
export async function getAiReply(payload) {
  const call = httpsCallable(functions, 'aiReply');
  const { data } = await call({ payload });
  return data;
}

