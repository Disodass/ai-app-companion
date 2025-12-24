/**
 * CONVERSATION ID FORMAT STANDARD
 * ================================
 * 
 * ALL conversation IDs MUST follow this format:
 * `dm_{userId}_{supporterId}`
 * 
 * Example: dm_E7UStXuqx1dZdJOpd9uT5utnQsy1_ai-friend
 * Example: dm_E7UStXuqx1dZdJOpd9uT5utnQsy1_executive-coach
 * 
 * DO NOT create conversation IDs anywhere else!
 * ALWAYS use getOrCreateConversation() or findOrCreateSupporterConversation()
 * 
 * This ensures:
 * - One conversation per user+supporter pair
 * - No duplicate conversations
 * - Consistent message history
 * - Easy to find conversations
 * 
 * Legacy formats (for backward compatibility during migration):
 * - dm_{userId} (old AI Friend format)
 * - supporter_{userId}_{supporterId} (old format)
 * - supporter__{userId}__{supporterId} (old format)
 */

import { collection, query, where, orderBy, limit, onSnapshot, addDoc, doc, setDoc, serverTimestamp, updateDoc, getDocs, getDoc, startAfter, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { encryptMessage, ensureConversationKey, decryptMessage, getConversationKey, storeConversationKey, exportKey } from "./encryptionService.js";
import { autoSummarizeConversation } from "./memoryService.js";

// Helper function to get message count efficiently (uses messageCount field if available, otherwise counts)
async function getMessageCount(conversationId, storedCount = null) {
  try {
    // If we have a stored count and it's > 0, use it (faster)
    if (storedCount !== null && storedCount > 0) {
      // Verify by checking if messages exist
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      const checkSnapshot = await getDocs(query(messagesRef, limit(1)));
      if (checkSnapshot.size > 0) {
        return storedCount; // Trust stored count if messages exist
      }
    }
    
    // Otherwise, count actual messages using pagination to get accurate count
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    let totalCount = 0;
    let lastDoc = null;
    const batchSize = 1000;
    
    try {
      // Try with orderBy for pagination
      while (true) {
        let q = query(messagesRef, orderBy('createdAt', 'asc'), limit(batchSize));
        if (lastDoc) {
          q = query(messagesRef, orderBy('createdAt', 'asc'), startAfter(lastDoc), limit(batchSize));
        }
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) break;
        
        totalCount += snapshot.docs.length;
        
        if (snapshot.docs.length < batchSize) break;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }
    } catch (error) {
      // If orderBy fails, fall back to simple query (may be limited)
      console.warn(`⚠️ Could not use orderBy for counting, using simple query:`, error.message);
      const countSnapshot = await getDocs(query(messagesRef));
      totalCount = countSnapshot.size;
    }
    
    return totalCount;
  } catch (error) {
    console.warn(`⚠️ Could not count messages for ${conversationId}:`, error.message);
    return storedCount || 0;
  }
}

// Helper function to verify user is a member of a conversation
async function verifyUserIsMember(conversationId, uid) {
  try {
    const convRef = doc(db, "conversations", conversationId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) return false;
    const data = convSnap.data();
    return Array.isArray(data.members) && data.members.includes(uid);
  } catch (error) {
    console.warn(`⚠️ Could not verify membership for ${conversationId}:`, error.message);
    return false;
  }
}

// Helper function to copy messages from one conversation to another (skips duplicates)
async function copyMessagesToStandard(sourceConvId, targetConvId, expectedCount) {
  console.log(`📋 Copying messages from ${sourceConvId} to ${targetConvId}...`);
  
  // CRITICAL: Ensure target conversation has correct permissions before copying
  const targetConvRef = doc(db, "conversations", targetConvId);
  const targetConvSnap = await getDoc(targetConvRef);
  if (!targetConvSnap.exists()) {
    throw new Error(`Target conversation ${targetConvId} does not exist!`);
  }
  
  const targetData = targetConvSnap.data();
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) {
    throw new Error('User not authenticated');
  }
  
  // Ensure members array includes current user (required for Firestore rules)
  if (!targetData.members || !targetData.members.includes(currentUserId)) {
    console.log(`⚠️ Target conversation missing user in members. Adding user before copying messages...`);
    await updateDoc(targetConvRef, {
      members: targetData.members ? [...targetData.members, currentUserId] : [currentUserId],
      userId: currentUserId,
      updatedAt: serverTimestamp()
    });
    console.log(`✅ Added user to members array`);
  }
  
  // CRITICAL: Copy encryption key from source to target conversation
  // This ensures encrypted messages can be decrypted after migration
  try {
    const sourceKey = await getConversationKey(sourceConvId, currentUserId);
    if (sourceKey) {
      console.log(`🔑 Found encryption key for source conversation. Copying to target...`);
      // Export the source key and store it for the target conversation
      const base64Key = await exportKey(sourceKey);
      await storeConversationKey(targetConvId, currentUserId, base64Key);
      console.log(`✅ Copied encryption key from ${sourceConvId} to ${targetConvId}`);
    } else {
      // Check if target already has a key - if not, we might need to create one
      const targetKey = await getConversationKey(targetConvId, currentUserId);
      if (!targetKey) {
        console.log(`⚠️ No encryption key found for source conversation. Target conversation will use new key if needed.`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not copy encryption key (messages may not decrypt):`, error.message);
    // Don't fail the migration if key copy fails - messages might not be encrypted
  }
  
  const sourceMessagesRef = collection(db, "conversations", sourceConvId, "messages");
  const targetMessagesRef = collection(db, "conversations", targetConvId, "messages");
  
  // Get existing message IDs in target to avoid duplicates
  let existingIds = new Set();
  try {
    const existingSnapshot = await getDocs(query(targetMessagesRef, limit(1000)));
    existingIds = new Set(existingSnapshot.docs.map(d => d.id));
    console.log(`📋 Target conversation already has ${existingIds.size} messages`);
  } catch (error) {
    console.warn(`⚠️ Could not check existing messages (may be permission issue):`, error.message);
    // Continue anyway - we'll skip duplicates during copy
    existingIds = new Set();
  }
  
  // Fetch all messages from source (paginated if needed)
  let allMessages = [];
  let lastDoc = null;
  const batchSize = 1000;
  
  while (true) {
    let q = query(sourceMessagesRef, limit(batchSize));
    if (lastDoc) {
      q = query(sourceMessagesRef, startAfter(lastDoc), limit(batchSize));
    }
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) break;
    
    // Filter out messages that already exist in target
    const newMessages = snapshot.docs.filter(doc => !existingIds.has(doc.id));
    allMessages.push(...newMessages);
    console.log(`  📥 Fetched ${snapshot.docs.length} messages, ${newMessages.length} new (total: ${allMessages.length})`);
    
    if (snapshot.docs.length < batchSize) break;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  
  console.log(`📋 Total new messages to copy: ${allMessages.length}`);
  
  if (allMessages.length === 0) {
    console.log(`✅ No new messages to copy (all messages already exist in target)`);
    return;
  }
  
  // Copy in batches of 500 (Firestore limit)
  const BATCH_LIMIT = 500;
  let copied = 0;
  
  for (let i = 0; i < allMessages.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = allMessages.slice(i, i + BATCH_LIMIT);
    
    chunk.forEach((msgDoc) => {
      const msgData = msgDoc.data();
      // Only copy fields allowed by Firestore rules: text, authorId, createdAt, status, meta, uid, encrypted, encryptedText
      // This prevents permission errors from extra fields
      const allowedFields = {
        text: msgData.text || null,
        authorId: msgData.authorId || currentUserId, // Preserve "assistant" if present
        createdAt: msgData.createdAt, // Preserve original timestamp
        status: msgData.status || "sent",
        uid: currentUserId, // Always set to current user for Firestore rules
        encrypted: msgData.encrypted || false,
        ...(msgData.encryptedText ? { encryptedText: msgData.encryptedText } : {}),
        ...(msgData.meta && Object.keys(msgData.meta).length > 0 ? { meta: msgData.meta } : {})
      };
      
      // Log first message structure for debugging
      if (i === 0 && chunk.indexOf(msgDoc) === 0) {
        console.log(`  🔍 Sample message fields being copied:`, Object.keys(allowedFields));
        console.log(`  🔍 Original message had fields:`, Object.keys(msgData));
      }
      
      const messageRef = doc(targetMessagesRef, msgDoc.id);
      batch.set(messageRef, allowedFields);
    });
    
    try {
      await batch.commit();
      copied += chunk.length;
      console.log(`  ✅ Copied batch ${Math.floor(i / BATCH_LIMIT) + 1}: ${chunk.length} messages (${copied}/${allMessages.length} total)`);
    } catch (error) {
      console.error(`  ❌ Error copying batch ${Math.floor(i / BATCH_LIMIT) + 1}:`, error.message);
      console.error(`  ❌ Error code:`, error.code);
      
      // If permission error, log message structure for debugging
      if (error.code === 'permission-denied') {
        console.error(`  🔍 Permission denied - logging first message structure for debugging:`);
        if (chunk.length > 0) {
          const firstMsgData = chunk[0].data();
          const firstMsgAllowed = {
            text: firstMsgData.text || null,
            authorId: firstMsgData.authorId || currentUserId,
            createdAt: firstMsgData.createdAt,
            status: firstMsgData.status || "sent",
            uid: currentUserId,
            encrypted: firstMsgData.encrypted || false,
            hasEncryptedText: !!firstMsgData.encryptedText,
            hasMeta: !!(firstMsgData.meta && Object.keys(firstMsgData.meta).length > 0)
          };
          console.error(`  🔍 First message original fields:`, Object.keys(firstMsgData));
          console.error(`  🔍 First message allowed fields:`, firstMsgAllowed);
        }
        
        console.log(`  🔄 Permission denied. Re-verifying members array...`);
        const verifyConvSnap = await getDoc(targetConvRef);
        const verifyData = verifyConvSnap.data();
        if (!verifyData.members || !verifyData.members.includes(currentUserId)) {
          console.log(`  🔧 Fixing members array and retrying...`);
          await updateDoc(targetConvRef, {
            members: [currentUserId],
            userId: currentUserId,
            updatedAt: serverTimestamp()
          });
          // Retry the batch
          try {
            await batch.commit();
            copied += chunk.length;
            console.log(`  ✅ Retry successful: Copied batch ${Math.floor(i / BATCH_LIMIT) + 1}`);
          } catch (retryError) {
            console.error(`  ❌ Retry also failed:`, retryError.message);
            console.error(`  ❌ Retry error details:`, retryError);
            throw retryError;
          }
        } else {
          console.error(`  ❌ Members array is correct, but permission still denied. This might be a field validation issue.`);
          throw error; // Re-throw if members array is correct
        }
      } else {
        throw error; // Re-throw non-permission errors
      }
    }
  }
  
  console.log(`✅ Copy complete: Copied ${copied} new messages to ${targetConvId}`);
  
  // Update message count on target conversation
  const targetRef = doc(db, "conversations", targetConvId);
  const targetSnap = await getDoc(targetRef);
  const currentCount = targetSnap.data()?.messageCount || 0;
  await updateDoc(targetRef, {
    messageCount: currentCount + copied,
    updatedAt: serverTimestamp()
  });
  
  // VERIFY: Check that messages actually exist
  const verifyRef = collection(db, "conversations", targetConvId, "messages");
  const verifySnapshot = await getDocs(query(verifyRef, limit(10)));
  console.log(`🔍 VERIFICATION: Target conversation ${targetConvId} has ${verifySnapshot.size} messages (checked first 10)`);
  
  if (verifySnapshot.size === 0 && copied > 0) {
    console.error(`❌ ERROR: Copy reported ${copied} messages copied, but verification found 0 messages!`);
    console.error(`   This might be a permission issue or the messages weren't actually copied.`);
  }
}

// Helper function to get supporter name for conversation title
function getSupporterName(supporterId) {
  // Import supporters dynamically to avoid circular dependencies
  // For now, use a simple mapping - can be enhanced later
  const names = {
    'ai-friend': 'Chat with Supporter Friend',
    'life-coach': 'Chat with Life Coach',
    'career-coach': 'Chat with Career Coach',
    'productivity-coach': 'Chat with Productivity Coach',
    'executive-coach': 'Chat with Executive Coach',
    'storytelling-helper': 'Chat with Storytelling Helper',
    'ritual-designer': 'Chat with Ritual Designer',
    'therapist': 'Chat with Therapist',
    'grief-counselor': 'Chat with Grief Counselor',
    'inner-child-worker': 'Chat with Inner Child Worker',
    'relationship-helper': 'Chat with Relationship Helper',
  };
  return names[supporterId] || `Chat with ${supporterId}`;
}

/**
 * Get or create a conversation between user and supporter
 * Uses STANDARD format: dm_{userId}_{supporterId}
 * 
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} supporterId - The supporter ID (e.g., "ai-friend", "executive-coach")
 * @returns {Promise<string>} The conversation ID in standard format
 */
export async function getOrCreateConversation(userId, supporterId) {
  // ALWAYS use this format - STANDARD
  const conversationId = `dm_${userId}_${supporterId}`;
  const conversationRef = doc(db, 'conversations', conversationId);
  
  console.log(`🔍 Checking for conversation: ${conversationId}`);
  
  // Check if conversation exists
  const conversationSnap = await getDoc(conversationRef);
  
  if (conversationSnap.exists()) {
    const data = conversationSnap.data();
    console.log(`✅ Found existing conversation: ${conversationId} (${data.messageCount || 0} messages)`);
    
    // Ensure it has required fields (migration)
    const needsUpdate = !data.members || !data.userId || !data.supporterId || !data.type;
    if (needsUpdate) {
      console.log(`🔄 Migrating conversation ${conversationId} - adding required fields`);
      await updateDoc(conversationRef, {
        members: data.members || [userId],
        userId: userId,
        supporterId: supporterId,
        type: 'dm',
        updatedAt: serverTimestamp()
      });
    }
    
    return conversationId;
  }
  
  // Create new conversation with STANDARD structure
  console.log(`🆕 Creating new conversation: ${conversationId}`);
  await setDoc(conversationRef, {
    participants: [userId, supporterId],
    members: [userId],
    userId: userId,
    supporterId: supporterId,
    type: 'dm',
    title: getSupporterName(supporterId),
    messageCount: 0,
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  console.log(`✅ Created conversation: ${conversationId}`);
  return conversationId;
}

// Safeguard: Ensure conversation has members array (migrates old conversations)
export async function ensureConversationHasMembers(conversationId, uid) {
  try {
    const convRef = doc(db, "conversations", conversationId);
    const convSnap = await getDoc(convRef);
    
    if (!convSnap.exists()) {
      return false;
    }
    
    const convData = convSnap.data();
    
    // If no members array, add it
    if (!Array.isArray(convData.members)) {
      console.log(`🔄 Migrating conversation ${conversationId} - adding members array`);
      await updateDoc(convRef, {
        members: [uid],
        updatedAt: serverTimestamp()
      });
      return true;
    }
    
    // If members array exists but doesn't include user, add user
    if (!convData.members.includes(uid)) {
      console.log(`🔄 Adding user to members array in conversation ${conversationId}`);
      await updateDoc(convRef, {
        members: [...convData.members, uid],
        updatedAt: serverTimestamp()
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error ensuring members array for ${conversationId}:`, error);
    return false;
  }
}

// Find or create a conversation for a specific supporter
// Uses STANDARD format: dm_{userId}_{supporterId}
// Migrates legacy formats automatically
export async function findOrCreateSupporterConversation(uid, supporterId) {
  console.log('🔍 Finding conversation for user:', uid, 'with supporter:', supporterId);
  
  try {
    // STEP 1: Check for STANDARD format conversation first
    const standardId = `dm_${uid}_${supporterId}`;
    console.log(`🔍 STEP 1: Checking standard format: ${standardId}`);
    
    try {
      const standardRef = doc(db, "conversations", standardId);
      const standardSnap = await getDoc(standardRef);
      
      if (standardSnap.exists()) {
        const data = standardSnap.data();
        console.log(`✅ Found standard conversation: ${standardId}`);
        console.log(`   Data:`, JSON.stringify({
          members: data.members,
          userId: data.userId,
          supporterId: data.supporterId,
          type: data.type,
          messageCount: data.messageCount
        }, null, 2));
        
        const messageCount = await getMessageCount(standardId, data.messageCount);
        console.log(`   Message count: ${messageCount}`);
        
        // Ensure it has all required fields
        await ensureConversationHasMembers(standardId, uid);
        
        // Verify members array after update
        const verifySnap = await getDoc(standardRef);
        const verifyData = verifySnap.data();
        console.log(`   Verified members:`, verifyData.members);
        
        // IMPORTANT: Even if standard format exists, we still need to check for legacy formats
        // that might have MORE messages (in case of partial migration or duplicates)
        // We'll continue below to check legacy formats, then consolidate if needed
        const standardMessageCount = messageCount;
        console.log(`📋 Standard format has ${standardMessageCount} messages. Checking for legacy formats to consolidate...`);
      } else {
        console.log(`❌ Standard format conversation does not exist: ${standardId}`);
      }
    } catch (err) {
      console.error(`❌ Error checking standard format:`, err);
      throw err;
    }
    
    console.log(`📋 Standard format not found. Checking for legacy formats...`);
    
    // STEP 2: Handle legacy supporter ID aliases
    // If looking for 'ai-friend', also check for 'supporter_friend' (legacy format)
    let legacySupporterIds = [supporterId];
    if (supporterId === 'ai-friend') {
      legacySupporterIds.push('supporter_friend', 'supporter-friend');
      console.log(`🔄 Checking legacy aliases for ai-friend: supporter_friend, supporter-friend`);
    }
    
    // STEP 3: Check for legacy conversations and migrate to standard format
    // Legacy formats to check (in order of priority - most likely to have messages first)
    const legacyIds = [
      `dm_${uid}`,                         // Legacy DM format (may have all messages!)
      `dm__${uid}`,                        // Legacy DM format with double underscore
      `supporter_${uid}_${supporterId}`,   // Single underscore format
      `supporter__${uid}__${supporterId}`, // Double underscore format
      `supporter_${uid}_ai-friend`,        // Single underscore format (for ai-friend)
      `supporter__${uid}__ai-friend`,      // Double underscore format (for ai-friend)
    ];
    
    // Special case: if looking for ai-friend, also check old dm_ formats and supporter_friend variations
    if (supporterId === 'ai-friend') {
      legacyIds.unshift(`dm_${uid}`, `dm__${uid}`);
      // Add supporter_friend variations (legacy format)
      legacyIds.push(
        `supporter_${uid}_supporter_friend`,    // Single underscore with supporter_friend
        `supporter__${uid}__supporter_friend`,  // Double underscore with supporter_friend
        `dm_${uid}_supporter_friend`            // Standard format with supporter_friend (if it exists)
      );
    }
    
    // Query conversations where user is a member
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("members", "array-contains", uid)
    );
    
    const conversationsSnapshot = await getDocs(conversationsQuery);
    console.log(`📋 Found ${conversationsSnapshot.size} conversations where user is a member`);
    
    // Also try to find conversations by querying all and filtering client-side
    // This helps find conversations that might have different ID formats
    let allConvsByPattern = [];
    try {
      // Get ALL conversations (paginated) to check for matches
      console.log(`🔍 Checking ALL conversations for pattern matches with uid: ${uid}...`);
      
      const allConvsRef = collection(db, "conversations");
      let allConvsDocs = [];
      let lastDoc = null;
      const batchSize = 1000;
      
      // Paginate through all conversations
      while (true) {
        let q = query(allConvsRef, limit(batchSize));
        if (lastDoc) {
          q = query(allConvsRef, startAfter(lastDoc), limit(batchSize));
        }
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) break;
        
        allConvsDocs.push(...snapshot.docs);
        console.log(`  📥 Fetched batch: ${snapshot.docs.length} conversations (total so far: ${allConvsDocs.length})`);
        
        if (snapshot.docs.length < batchSize) break;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }
      
      console.log(`🔍 Checking ${allConvsDocs.length} total conversations for matches...`);
      
      allConvsDocs.forEach((doc) => {
        const convId = doc.id;
        const data = doc.data();
        // Check if this conversation ID contains the uid
        if (convId.includes(uid)) {
          // For ai-friend, also match supporter_friend (legacy format)
          const isAiFriendMatch = supporterId === 'ai-friend' && (
            convId.includes('ai-friend') || 
            convId.includes('supporter_friend') ||
            convId.includes('supporter-friend') ||
            convId.endsWith('_supporter_friend') ||  // Explicit check for this format
            data.supporterId === 'ai-friend' ||
            data.supporterId === 'supporter_friend' ||
            data.supporterId === 'supporter-friend'
          );
          
          const hasSupporterMatch = isAiFriendMatch ||
                                     convId.includes('supporter') || 
                                     convId.includes(supporterId) ||
                                     data.supporterId === supporterId;
          
          if (hasSupporterMatch) {
            allConvsByPattern.push(convId);
            console.log(`  📌 Found potential match: ${convId} (${data.messageCount || 0} messages, supporterId: ${data.supporterId || 'none'}, members: ${JSON.stringify(data.members || [])})`);
          }
        }
      });
      
      // Add any pattern matches to legacy IDs to check (avoid duplicates)
      allConvsByPattern.forEach(id => {
        if (!legacyIds.includes(id)) {
          legacyIds.push(id);
        }
      });
      
      console.log(`✅ Found ${allConvsByPattern.length} conversations matching pattern`);
    } catch (err) {
      console.warn('⚠️ Could not check all conversations for patterns:', err.message);
      // Fallback: try a simple query with limit
      try {
        const simpleQuery = query(collection(db, "conversations"), limit(100));
        const simpleSnapshot = await getDocs(simpleQuery);
        console.log(`🔍 Fallback: Checking ${simpleSnapshot.size} conversations...`);
        simpleSnapshot.docs.forEach((doc) => {
          const convId = doc.id;
          if (convId.includes(uid)) {
            console.log(`  📌 Potential match: ${convId}`);
            if (!legacyIds.includes(convId)) {
              legacyIds.push(convId);
            }
          }
        });
      } catch (fallbackErr) {
        console.warn('⚠️ Fallback query also failed:', fallbackErr.message);
      }
    }
    
    const legacyConversations = [];
    for (const convId of legacyIds) {
      try {
        const convRef = doc(db, "conversations", convId);
        const convSnap = await getDoc(convRef);
        
        if (convSnap.exists()) {
          const convData = convSnap.data();
          // Check if conversation has messages (by checking if user sent messages or it has messageCount)
          const messageCount = await getMessageCount(convId, convData.messageCount);
          
          console.log(`✅ Found conversation ${convId}: ${messageCount} messages (stored count: ${convData.messageCount || 'none'})`);
          
          // If no members array, add it now (migration)
          if (!Array.isArray(convData.members)) {
            console.log(`🔄 Migrating legacy conversation ${convId} - adding members array`);
            await updateDoc(convRef, {
              members: [uid],
              updatedAt: serverTimestamp()
            });
          }
          
          legacyConversations.push({
            id: convId,
            messageCount: messageCount,
            supporterId: convData.supporterId,
            data: convData
          });
        }
      } catch (err) {
        console.warn(`⚠️ Error checking legacy conversation ${convId}:`, err.message);
      }
    }
    
    // STEP 2: Count messages for each conversation and verify user membership
    const conversationsWithCounts = [];
    
    // Add conversations from members query
    for (const convDoc of conversationsSnapshot.docs) {
      const convId = convDoc.id;
      const convData = convDoc.data();
      
      // Skip if already found in legacy check
      if (legacyConversations.find(l => l.id === convId)) {
        continue;
      }
      
      // Verify user is actually a member (double-check for security)
      if (!Array.isArray(convData.members) || !convData.members.includes(uid)) {
        console.warn(`⚠️ Skipping ${convId} - user not in members array`);
        continue;
      }
      
      // Count messages for this conversation
      const messageCount = await getMessageCount(convId, convData.messageCount);
      
      conversationsWithCounts.push({
        id: convId,
        messageCount: messageCount,
        supporterId: convData.supporterId,
        data: convData
      });
      
      console.log(`✅ Conversation ${convId}: ${messageCount} messages (supporterId: ${convData.supporterId || 'none'})`);
    }
    
    // Combine all conversations
    let allConversations = [...conversationsWithCounts, ...legacyConversations];
    
    if (allConversations.length === 0) {
      // No conversations found - create new one in STANDARD format
      console.log('📋 No conversations found. Creating new conversation in standard format.');
      const newConvId = await getOrCreateConversation(uid, supporterId);
      console.log(`✅ Created new conversation: ${newConvId}`);
      return { id: newConvId };
    }
    
    // STEP 3: Filter by supporterId FIRST, then pick the one with most messages
    let candidates = allConversations;
    
    if (supporterId) {
      // Filter to conversations matching the requested supporterId
      const matchingSupporter = allConversations.filter(c => {
        // Match by supporterId field (exact match)
        if (c.supporterId === supporterId) return true;
        
        // Match by ID pattern - must match at END of ID (more strict)
        // Standard format: supporter__{uid}__{supporterId}
        if (c.id.endsWith(`__${supporterId}`) || c.id.endsWith(`_${supporterId}`)) {
          return true;
        }
        
        // Special case: ai-friend matching (includes legacy supporter_friend format)
        if (supporterId === 'ai-friend') {
          // dm_ conversations are considered ai-friend conversations (legacy format)
          if (c.id.startsWith('dm_') || c.id.startsWith('dm__')) {
            return true;
          }
          // supporterId field matches
          if (c.supporterId === 'ai-friend' || c.supporterId === 'supporter_friend' || c.supporterId === 'supporter-friend') {
            return true;
          }
          // ID contains supporter_friend (legacy format)
          if (c.id.includes('supporter_friend') || c.id.includes('supporter-friend')) {
            return true;
          }
        }
        
        return false;
      });
      
      if (matchingSupporter.length > 0) {
        candidates = matchingSupporter;
        console.log(`📋 Filtered to ${candidates.length} conversations matching supporterId: ${supporterId}`);
        candidates.forEach((c, idx) => {
          console.log(`  ${idx + 1}. ${c.id}: ${c.messageCount} messages`);
        });
      } else {
        console.log(`⚠️ No conversations found for supporterId: ${supporterId}`);
        console.log(`📋 Available conversations:`, allConversations.map(c => `${c.id} (${c.messageCount} msgs)`).join(', '));
        console.log(`⚠️ Falling back to ALL conversations (will pick one with most messages)`);
        // Don't filter - use all conversations
      }
    }
    
    // Make sure we have candidates
    if (!candidates || candidates.length === 0) {
      console.error('❌ ERROR: No conversations found at all!');
      throw new Error('No conversations found for user');
    }
    
    // Sort by message count (descending) - highest count wins
    candidates.sort((a, b) => b.messageCount - a.messageCount);
    const bestConv = candidates[0];
    
    if (!bestConv) {
      console.error('❌ ERROR: No best conversation selected!');
      throw new Error('Failed to select conversation');
    }
    
    console.log(`🎯 SELECTION: Using conversation with most messages for supporter: ${supporterId || 'any'}`);
    console.log(`   Selected: ${bestConv.id} with ${bestConv.messageCount} messages`);
    
    // STEP 4: Check if standard format exists and compare message counts
    const standardRef = doc(db, "conversations", standardId);
    const standardSnap = await getDoc(standardRef);
    const standardExists = standardSnap.exists();
    const standardMessageCount = standardExists ? await getMessageCount(standardId, standardSnap.data().messageCount) : 0;
    
    // STEP 5: Handle migration/consolidation
    if (bestConv.id !== standardId) {
      console.log(`🔄 Legacy conversation ${bestConv.id} (${bestConv.messageCount} msgs) vs standard ${standardId} (${standardMessageCount} msgs)`);
      
      if (standardExists) {
        // Standard format exists - ensure it has correct permissions before copying messages
        console.log(`📋 Standard format exists. Ensuring it has correct members array...`);
        await ensureConversationHasMembers(standardId, uid);
        
        // Verify members array is set correctly
        const verifySnap = await getDoc(standardRef);
        const verifyData = verifySnap.data();
        if (!verifyData.members || !verifyData.members.includes(uid)) {
          console.warn(`⚠️ Standard conversation missing user in members! Fixing...`);
          await updateDoc(standardRef, {
            members: [uid],
            userId: uid,
            supporterId: supporterId,
            type: 'dm',
            updatedAt: serverTimestamp()
          });
          console.log(`✅ Fixed members array for ${standardId}`);
        }
        
        // Standard format exists - check if it needs messages copied
        if (bestConv.messageCount > standardMessageCount) {
          console.log(`📋 Legacy has MORE messages (${bestConv.messageCount} > ${standardMessageCount}). Copying messages to standard...`);
          // Copy messages from legacy to standard (skip duplicates)
          await copyMessagesToStandard(bestConv.id, standardId, bestConv.messageCount);
          // Update standard conversation with correct message count
          await updateDoc(standardRef, {
            messageCount: bestConv.messageCount,
            lastMessage: bestConv.data.lastMessage || null,
            updatedAt: serverTimestamp()
          });
          // Mark legacy as deprecated (best-effort, don't fail if permission denied)
          const legacyRef = doc(db, "conversations", bestConv.id);
          try {
            await updateDoc(legacyRef, {
              deprecated: true,
              consolidatedInto: standardId,
              consolidatedAt: serverTimestamp()
            });
            console.log(`✅ Consolidated ${bestConv.messageCount} messages from ${bestConv.id} into ${standardId}`);
          } catch (err) {
            // Firestore rules may block legacy docs that have no members - that's okay
            if (err.code === 'permission-denied') {
              console.warn(`⚠️ Skipping legacy deprecation due to permissions for ${bestConv.id} (this is fine)`);
            } else {
              console.warn(`⚠️ Could not mark legacy as deprecated:`, err.message);
            }
            // Don't throw - we already have the standard conversation, so continue
          }
          return { id: standardId };
        } else {
          console.log(`📋 Standard has more or equal messages (${standardMessageCount} >= ${bestConv.messageCount}). Marking legacy as deprecated...`);
          // Standard has more or equal, just mark legacy as deprecated (best-effort)
          const legacyRef = doc(db, "conversations", bestConv.id);
          try {
            await updateDoc(legacyRef, {
              deprecated: true,
              consolidatedInto: standardId,
              consolidatedAt: serverTimestamp()
            });
            console.log(`✅ Marked legacy conversation as deprecated`);
          } catch (err) {
            // Firestore rules may block legacy docs that have no members - that's okay
            if (err.code === 'permission-denied') {
              console.warn(`⚠️ Skipping legacy deprecation due to permissions for ${bestConv.id} (this is fine)`);
            } else {
              console.warn(`⚠️ Could not mark legacy as deprecated:`, err.message);
            }
            // Don't throw - we already have the standard conversation, so continue
          }
          return { id: standardId };
        }
      }
      
      // Standard format doesn't exist, migrate legacy to standard
      console.log(`🔄 Migrating legacy conversation ${bestConv.id} to standard format ${standardId}`);
      
      if (!standardSnap.exists()) {
        // Create standard conversation document with data from legacy
        console.log(`📝 Creating standard conversation document from legacy`);
        await setDoc(standardRef, {
          participants: [uid, supporterId],
          members: [uid],
          userId: uid,
          supporterId: supporterId,
          type: 'dm',
          title: getSupporterName(supporterId),
          messageCount: bestConv.messageCount,
          lastMessage: bestConv.data.lastMessage || null,
          createdAt: bestConv.data.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          migratedFrom: bestConv.id,
          migratedAt: serverTimestamp()
        });
        
        // Copy messages from legacy to standard (if any)
        // Firestore batches are limited to 500 operations, so we need to chunk large migrations
        if (bestConv.messageCount > 0) {
          console.log(`📋 Copying ${bestConv.messageCount} messages from ${bestConv.id} to ${standardId}...`);
          const legacyMessagesRef = collection(db, "conversations", bestConv.id, "messages");
          const standardMessagesRef = collection(db, "conversations", standardId, "messages");
          
          // Fetch all messages (paginated if needed)
          let allMessages = [];
          let lastDoc = null;
          const batchSize = 1000;
          
          while (true) {
            let q = query(legacyMessagesRef, limit(batchSize));
            if (lastDoc) {
              q = query(legacyMessagesRef, startAfter(lastDoc), limit(batchSize));
            }
            
            const snapshot = await getDocs(q);
            if (snapshot.empty) break;
            
            allMessages.push(...snapshot.docs);
            console.log(`  📥 Fetched ${snapshot.docs.length} messages (total: ${allMessages.length})`);
            
            if (snapshot.docs.length < batchSize) break;
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
          }
          
          console.log(`📋 Total messages to copy: ${allMessages.length}`);
          
          // Copy in batches of 500 (Firestore limit)
          const BATCH_LIMIT = 500;
          let copied = 0;
          
          for (let i = 0; i < allMessages.length; i += BATCH_LIMIT) {
            const batch = writeBatch(db);
            const chunk = allMessages.slice(i, i + BATCH_LIMIT);
            
            chunk.forEach((msgDoc) => {
              batch.set(doc(standardMessagesRef, msgDoc.id), msgDoc.data());
            });
            
            await batch.commit();
            copied += chunk.length;
            console.log(`  ✅ Copied batch ${Math.floor(i / BATCH_LIMIT) + 1}: ${chunk.length} messages (${copied}/${allMessages.length} total)`);
          }
          
          console.log(`✅ Migration complete: Copied ${copied} messages to standard format`);
          
          // Update message count on standard conversation
          await updateDoc(standardRef, {
            messageCount: copied,
            updatedAt: serverTimestamp()
          });
          
          // VERIFY: Check that messages actually exist in the new conversation
          const verifyRef = collection(db, "conversations", standardId, "messages");
          const verifySnapshot = await getDocs(query(verifyRef, limit(10)));
          console.log(`🔍 VERIFICATION: Standard conversation ${standardId} has ${verifySnapshot.size} messages (checked first 10)`);
          
          if (verifySnapshot.size === 0 && copied > 0) {
            console.error(`❌ ERROR: Migration reported ${copied} messages copied, but verification found 0 messages!`);
            console.error(`   This might be a permission issue or the messages weren't actually copied.`);
          }
        } else {
          console.log(`⚠️ No messages to copy (messageCount was ${bestConv.messageCount})`);
        }
        
        // Mark legacy conversation as deprecated
        console.log(`📋 Marking legacy conversation ${bestConv.id} as deprecated`);
        const legacyRef = doc(db, "conversations", bestConv.id);
        try {
          await updateDoc(legacyRef, {
            deprecated: true,
            consolidatedInto: standardId,
            consolidatedAt: serverTimestamp()
          });
          console.log(`✅ Marked legacy conversation as deprecated`);
        } catch (err) {
          // Firestore rules may block legacy docs that have no members - that's okay
          if (err.code === 'permission-denied') {
            console.warn(`⚠️ Skipping legacy deprecation due to permissions for ${bestConv.id} (this is fine)`);
          } else {
            console.warn(`⚠️ Could not mark legacy as deprecated:`, err.message);
          }
          // Don't throw - we already have the standard conversation, so continue
        }
        
        console.log(`✅ Migration complete! Using standard format: ${standardId}`);
        console.log(`📋 Final check: Standard conversation document exists:`, (await getDoc(standardRef)).exists());
        return { id: standardId };
      } else {
        // Standard format already exists - but we should have handled this above
        // This should only happen if standard exists but has fewer messages
        console.log(`⚠️ Standard format ${standardId} already exists. Checking if messages need to be copied...`);
        const existingStandardSnap = await getDoc(standardRef);
        const existingStandardCount = await getMessageCount(standardId, existingStandardSnap.data()?.messageCount || 0);
        
        if (bestConv.messageCount > existingStandardCount) {
          console.log(`📋 Standard exists but has fewer messages (${existingStandardCount} < ${bestConv.messageCount}). Copying messages...`);
          await copyMessagesToStandard(bestConv.id, standardId, bestConv.messageCount);
          await updateDoc(standardRef, {
            messageCount: bestConv.messageCount,
            lastMessage: bestConv.data.lastMessage || null,
            updatedAt: serverTimestamp()
          });
          const legacyRef = doc(db, "conversations", bestConv.id);
          try {
            await updateDoc(legacyRef, {
              deprecated: true,
              consolidatedInto: standardId,
              consolidatedAt: serverTimestamp()
            });
            console.log(`✅ Copied ${bestConv.messageCount} messages to existing standard format`);
          } catch (err) {
            // Firestore rules may block legacy docs that have no members - that's okay
            if (err.code === 'permission-denied') {
              console.warn(`⚠️ Skipping legacy deprecation due to permissions for ${bestConv.id} (this is fine)`);
            } else {
              console.warn(`⚠️ Could not mark legacy as deprecated:`, err.message);
            }
            // Don't throw - we already have the standard conversation, so continue
          }
        }
        
        return { id: standardId };
      }
    }
    
    // Ensure conversation has members array (safeguard for future)
    await ensureConversationHasMembers(bestConv.id, uid);
    
    // CRITICAL: Ensure the conversation document exists before returning
    // This prevents permission errors when trying to listen to messages
    const finalConvRef = doc(db, "conversations", bestConv.id);
    const finalConvSnap = await getDoc(finalConvRef);
    if (!finalConvSnap.exists()) {
      console.error(`❌ ERROR: Conversation ${bestConv.id} does not exist! Creating it...`);
      await setDoc(finalConvRef, {
        participants: [uid, supporterId],
        members: [uid],
        userId: uid,
        supporterId: supporterId,
        type: 'dm',
        title: getSupporterName(supporterId),
        messageCount: bestConv.messageCount || 0,
        lastMessage: bestConv.data.lastMessage || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created missing conversation document`);
    }
    
    console.log('🎯 Final conversation ID selected:', bestConv.id);
    return { id: bestConv.id };
    
  } catch (error) {
    console.error('❌ Error in findOrCreateSupporterConversation:', error);
    throw new Error(`Failed to find or create conversation: ${error.message}`);
  }
}

// Legacy function for backward compatibility
export async function findOrCreatePrimaryConversation(uid) {
  return findOrCreateSupporterConversation(uid, 'ai-friend');
}

// Helper function to fetch ALL messages - simple approach, no pagination
// Just fetch everything and sort client-side
async function fetchAllMessages(messagesRef) {
  console.log('📥 Fetching ALL messages (no orderBy, no pagination)...');
  
  try {
    // Simple: just get all documents with no query modifiers
    const snapshot = await getDocs(query(messagesRef));
    const allDocs = snapshot.docs;
    
    console.log(`📥 Fetched ${allDocs.length} messages from Firestore`);
    
    // Sort client-side by createdAt (oldest first, then we'll reverse for display)
    allDocs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return aTime - bTime; // Ascending (oldest first)
    });
    
    console.log(`✅ Sorted ${allDocs.length} messages client-side`);
    
    return allDocs;
  } catch (error) {
    console.error('❌ Error fetching messages:', error.message);
    throw error;
  }
}

export function listenLatestMessages(conversationId, callback, pageSize = 500) {
  console.log('👂 Setting up listener for conversation:', conversationId);
  
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  let unsubscribeListener = null;
  
  // Fetch ALL messages using pagination to ensure we get everything
  fetchAllMessages(messagesRef).then(async (allDocs) => {
    console.log(`📥 Initial fetch: ${allDocs.length} TOTAL messages from conversation: ${conversationId}`);
    
    if (allDocs.length === 0) {
      console.log('📭 No messages found in conversation:', conversationId);
      callback({
        docs: [],
        size: 0,
        empty: true,
        metadata: {},
        query: null,
      });
      return;
    }
    
    // Sort client-side by createdAt descending (newest first)
    const sortedDocs = [...allDocs].sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return bTime - aTime; // Descending
    });
    
    console.log(`📥 After sorting: ${sortedDocs.length} messages (loaded ALL ${allDocs.length} total)`);
    
    // Create sorted snapshot
    const sortedSnapshot = {
      docs: sortedDocs,
      size: sortedDocs.length,
      empty: sortedDocs.length === 0,
      metadata: {},
      query: null,
    };
    
    // Process and send initial messages
    await processSnapshot(sortedSnapshot, callback, conversationId);
    
    // Set up listener for new messages (simple - no orderBy to avoid index)
    unsubscribeListener = onSnapshot(query(messagesRef), async (newSnapshot) => {
      console.log(`📥 Listener update: ${newSnapshot.docs.length} messages`);
      
      // Re-fetch all messages when listener fires (to get updates)
      const allDocs = await fetchAllMessages(messagesRef);
      const allSorted = [...allDocs].sort((a, b) => {
        const aTime = a.data().createdAt?.toMillis?.() || 0;
        const bTime = b.data().createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      const updatedSnapshot = {
        docs: allSorted,
        size: allSorted.length,
        empty: allSorted.length === 0,
        metadata: {},
        query: null,
      };
      
      await processSnapshot(updatedSnapshot, callback, conversationId);
    }, (error) => {
      console.error('❌ Messages listener error:', error);
    });
  }).catch((error) => {
    console.error('❌ Error fetching messages:', conversationId, error);
    callback({
      docs: [],
      size: 0,
      empty: true,
      error: error,
      metadata: {},
      query: null
    });
  });
  
  // Return cleanup function
  return () => {
    if (unsubscribeListener) {
      unsubscribeListener();
    }
  };
}

// Helper function to process snapshot (decrypt, etc.)
async function processSnapshot(snapshot, callback, conversationId) {
  const messageCount = snapshot.docs.length;
  console.log(`📥 Processing ${messageCount} messages from conversation: ${conversationId}`);
  console.log(`📥 Snapshot details: empty=${snapshot.empty}, size=${snapshot.size}, docs.length=${snapshot.docs?.length}`);
  
  // Get current user ID for decryption
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.warn('⚠️ No user authenticated, cannot decrypt messages');
    callback(snapshot);
    return;
  }
  
  // If snapshot is empty, still call callback with empty snapshot
  if (snapshot.empty || messageCount === 0) {
    console.log('📭 Empty snapshot - no messages found in conversation:', conversationId);
    callback(snapshot);
    return;
  }
  
  // Get encryption key for this conversation
  let encryptionKey = null;
  try {
    encryptionKey = await getConversationKey(conversationId, uid);
  } catch (error) {
    console.warn('⚠️ Could not get encryption key:', error);
  }
  
  // Decrypt messages if encrypted
  const decryptedDocs = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      // If message is encrypted and we have a key, decrypt it
      if (data.encrypted && data.encryptedText && encryptionKey) {
        try {
          const decryptedText = await decryptMessage(data.encryptedText, encryptionKey);
          // Return document with decrypted text (preserve all original properties)
          return {
            id: docSnap.id,
            ref: docSnap.ref,
            data: () => ({
              ...data,
              text: decryptedText,
              encrypted: true, // Keep flag for UI
            }),
            exists: docSnap.exists,
            metadata: docSnap.metadata,
          };
        } catch (error) {
          console.error('❌ Error decrypting message:', error);
          // Return document with error message
          return {
            id: docSnap.id,
            ref: docSnap.ref,
            data: () => ({
              ...data,
              text: '[Unable to decrypt message]',
              decryptionError: true,
            }),
            exists: docSnap.exists,
            metadata: docSnap.metadata,
          };
        }
      }
      
      // Return document as-is (not encrypted or no key available - old messages)
      // Old messages are plain text, so they display correctly
      return docSnap;
    })
  );
  
  // Create a new snapshot-like object with decrypted docs
  const decryptedSnapshot = {
    docs: decryptedDocs,
    size: snapshot.size,
    empty: snapshot.empty,
    metadata: snapshot.metadata,
    query: snapshot.query,
  };
  
  // Log first and last message timestamps for debugging
  if (messageCount > 0) {
    const firstMsg = snapshot.docs[0].data();
    const lastMsg = snapshot.docs[messageCount - 1].data();
    const firstTime = firstMsg.createdAt?.toDate?.() || 'unknown';
    const lastTime = lastMsg.createdAt?.toDate?.() || 'unknown';
    console.log(`📅 Message time range: ${lastTime} (oldest) to ${firstTime} (newest)`);
  }
  
  callback(decryptedSnapshot);
}

export async function sendMessage(conversationId, authorId, text, meta = {}) {
  // Get the current user's UID
  const uid = auth.currentUser?.uid || authorId;

  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);

  if (!snap.exists()) {
    // Create conversation document with members array
    await setDoc(convRef, {
      type: 'dm',
      ownerUid: uid,
      members: [uid],                 // add members for modern documents
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } else {
    // CRITICAL: Verify user is a member before allowing message send
    const convData = snap.data();
    if (!convData.members || !convData.members.includes(uid)) {
      throw new Error('User is not a member of this conversation');
    }
    // Update timestamp even if exists
    await setDoc(convRef, { updatedAt: serverTimestamp() }, { merge: true });
  }

  // Ensure conversation has encryption key
  const encryptionKey = await ensureConversationKey(conversationId, uid);
  
  // Encrypt the message text
  let encryptedData = null;
  let messageText = text;
  let isEncrypted = false;
  
  try {
    encryptedData = await encryptMessage(text, encryptionKey);
    isEncrypted = true;
    // Don't store plain text when encrypted
    messageText = null;
  } catch (error) {
    console.error('Error encrypting message, storing as plain text:', error);
    // Fallback: store as plain text if encryption fails
    isEncrypted = false;
  }

  // Add the message
  const messageData = {
    authorId: authorId || uid,
    uid: uid,
    createdAt: serverTimestamp(),
    status: "sent",
    encrypted: isEncrypted,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {})
  };
  
  // Store encrypted or plain text based on encryption success
  if (isEncrypted && encryptedData) {
    messageData.encryptedText = encryptedData;
    // Store a placeholder for lastMessage (can't decrypt in rules)
    messageData.text = '[Encrypted]';
  } else {
    messageData.text = text;
  }
  
  const messageRef = await addDoc(collection(convRef, 'messages'), messageData);
  
  // Update conversation last message (use placeholder for encrypted messages)
  await updateDoc(convRef, {
    lastMessage: isEncrypted ? '[Encrypted message]' : text,
    updatedAt: serverTimestamp()
  });

  // Trigger auto-summarization (non-blocking, runs in background)
  // This checks if 50+ messages exist and creates a summary if needed
  try {
    // Get all messages for summarization check (async, don't block message send)
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const allMessagesSnapshot = await getDocs(query(messagesRef));
    const allMessages = allMessagesSnapshot.docs.map(doc => ({
      id: doc.id,
      text: doc.data().text,
      authorId: doc.data().authorId,
      createdAt: doc.data().createdAt
    })).sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return aTime - bTime; // Ascending (oldest first)
    });
    
    // Trigger summarization (non-blocking, errors are caught)
    autoSummarizeConversation(conversationId, allMessages)
      .catch(err => console.warn('⚠️ Summarization failed (non-critical):', err));
  } catch (error) {
    console.warn('⚠️ Could not trigger summarization:', error);
    // Don't fail message send if summarization check fails
  }

  return messageRef;
}

export async function markConversationRead(conversationId, uid) {
  const convRef = doc(db, "conversations", conversationId);
  await updateDoc(convRef, {
    [`memberMeta.${uid}.lastReadAt`]: serverTimestamp()
  });
}

export function listenUserConversations(uid, callback) {
  const conversationsRef = collection(db, "conversations");
  const q = query(
    conversationsRef,
    where("members", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );
  
  return onSnapshot(q, callback);
}

// Re-export summary functions for convenience (as specified in plan)
// These are implemented in conversationSummaryService.js
export { 
  getConversationSummaries,
  getSummaryContext 
} from './conversationSummaryService';
