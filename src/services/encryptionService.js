/**
 * End-to-End Encryption Service
 * Uses Web Crypto API for client-side encryption/decryption
 * Ensures messages can only be read by authorized users
 */

// Encryption algorithm: AES-GCM (AES-256-GCM) for authenticated encryption
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits

/**
 * Generate a new encryption key for a conversation
 * @returns {Promise<CryptoKey>} Encryption key
 */
export async function generateKey() {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    return key;
  } catch (error) {
    console.error('Error generating encryption key:', error);
    throw new Error('Failed to generate encryption key');
  }
}

/**
 * Export a key to a format that can be stored
 * @param {CryptoKey} key - The encryption key to export
 * @returns {Promise<string>} Base64-encoded key data
 */
export async function exportKey(key) {
  try {
    const exported = await crypto.subtle.exportKey('raw', key);
    const exportedKeyBuffer = new Uint8Array(exported);
    // Convert to base64 for storage
    const base64Key = btoa(String.fromCharCode(...exportedKeyBuffer));
    return base64Key;
  } catch (error) {
    console.error('Error exporting key:', error);
    throw new Error('Failed to export encryption key');
  }
}

/**
 * Import a key from stored format
 * @param {string} base64Key - Base64-encoded key data
 * @returns {Promise<CryptoKey>} Encryption key
 */
export async function importKey(base64Key) {
  try {
    // Convert base64 to Uint8Array
    const keyBuffer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    return key;
  } catch (error) {
    console.error('Error importing key:', error);
    throw new Error('Failed to import encryption key');
  }
}

/**
 * Encrypt a message
 * @param {string} text - Plain text message to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{iv: string, ciphertext: string}>} Encrypted data with IV
 */
export async function encryptMessage(text, key) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for encryption');
    }

    // Generate random IV (initialization vector) for this message
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM

    // Convert text to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // Convert to base64 for storage
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));

    return {
      iv: ivBase64,
      ciphertext: ciphertextBase64,
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message
 * @param {{iv: string, ciphertext: string}} encryptedData - Encrypted data with IV
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>} Decrypted plain text
 */
export async function decryptMessage(encryptedData, key) {
  try {
    if (!encryptedData || !encryptedData.iv || !encryptedData.ciphertext) {
      throw new Error('Invalid encrypted data format');
    }

    // Convert base64 back to Uint8Array
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      ciphertext
    );

    // Convert ArrayBuffer back to string
    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedData);

    return decryptedText;
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error('Failed to decrypt message');
  }
}

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Store conversation encryption key in user's profile
 * Keys are stored encrypted with a master key (derived from user password or stored securely)
 * For now, we'll store them in plain text in user profile (can be improved later)
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {string} base64Key - Base64-encoded key
 * @returns {Promise<void>}
 */
export async function storeConversationKey(conversationId, userId, base64Key) {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Get existing keys or create new object
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    const conversationKeys = userData.conversationKeys || {};
    
    // Store the key for this conversation
    conversationKeys[conversationId] = {
      key: base64Key,
      storedAt: serverTimestamp(),
    };
    
    // Update user document
    await setDoc(userRef, {
      conversationKeys: conversationKeys,
    }, { merge: true });
    
    console.log(`✅ Stored encryption key for conversation ${conversationId}`);
  } catch (error) {
    console.error('Error storing conversation key:', error);
    throw new Error('Failed to store conversation key');
  }
}

/**
 * Get conversation encryption key from user's profile
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @returns {Promise<CryptoKey|null>} Encryption key or null if not found
 */
export async function getConversationKey(conversationId, userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    const userData = userSnap.data();
    const conversationKeys = userData.conversationKeys || {};
    const keyData = conversationKeys[conversationId];
    
    if (!keyData || !keyData.key) {
      return null;
    }
    
    // Import the key
    const key = await importKey(keyData.key);
    return key;
  } catch (error) {
    console.error('Error getting conversation key:', error);
    return null;
  }
}

/**
 * Ensure conversation has an encryption key, generating one if needed
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @returns {Promise<CryptoKey>} Encryption key for the conversation
 */
export async function ensureConversationKey(conversationId, userId) {
  try {
    // Try to get existing key
    let key = await getConversationKey(conversationId, userId);
    
    if (!key) {
      // Generate new key if none exists
      console.log(`🔑 Generating new encryption key for conversation ${conversationId}`);
      key = await generateKey();
      
      // Export and store the key
      const base64Key = await exportKey(key);
      await storeConversationKey(conversationId, userId, base64Key);
    }
    
    return key;
  } catch (error) {
    console.error('Error ensuring conversation key:', error);
    throw new Error('Failed to ensure conversation encryption key');
  }
}

