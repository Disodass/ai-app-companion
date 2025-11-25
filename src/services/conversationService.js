import { collection, query, where, orderBy, limit, onSnapshot, addDoc, doc, setDoc, serverTimestamp, updateDoc, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

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
    
    // Otherwise, count actual messages (slower but accurate)
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const countSnapshot = await getDocs(messagesRef);
    return countSnapshot.size;
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

// Find or create a conversation for a specific supporter
// CRITICAL: Only queries conversations where user is a member to ensure data isolation
export async function findOrCreateSupporterConversation(uid, supporterId) {
  console.log('🔍 Finding conversation for user:', uid, 'with supporter:', supporterId);
  
  try {
    // STEP 1: Query conversations where user is a member (CRITICAL: filters by user)
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("members", "array-contains", uid)
    );
    
    const conversationsSnapshot = await getDocs(conversationsQuery);
    console.log(`📋 Found ${conversationsSnapshot.size} conversations where user is a member`);
    
    if (conversationsSnapshot.empty) {
      // No conversations found - create new one
      console.log('📋 No conversations found. Creating new conversation.');
      const convId = `supporter__${uid}__${supporterId}`;
      const convRef = doc(db, "conversations", convId);
      
      await setDoc(convRef, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [uid],
        memberMeta: { [uid]: { lastReadAt: serverTimestamp() } },
        lastMessage: null,
        messageCount: 0,
        supporterId: supporterId
      });
      
      // Add welcome message
      await addDoc(collection(db, "conversations", convId, "messages"), {
        text: "Welcome to Bestibule 👋",
        authorId: 'assistant',
        createdAt: serverTimestamp(),
        status: "sent",
        meta: { role: "ai" }
      });
      
      await updateDoc(convRef, { messageCount: 1 });
      console.log('🎯 Created new conversation:', convId);
      return { id: convId };
    }
    
    // STEP 2: Count messages for each conversation and verify user membership
    const conversationsWithCounts = [];
    
    for (const convDoc of conversationsSnapshot.docs) {
      const convId = convDoc.id;
      const convData = convDoc.data();
      
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
    
    if (conversationsWithCounts.length === 0) {
      // No valid conversations found - create new one
      console.log('📋 No valid conversations found. Creating new conversation.');
      const convId = `supporter__${uid}__${supporterId}`;
      const convRef = doc(db, "conversations", convId);
      
      await setDoc(convRef, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [uid],
        memberMeta: { [uid]: { lastReadAt: serverTimestamp() } },
        lastMessage: null,
        messageCount: 0,
        supporterId: supporterId
      });
      
      // Add welcome message
      await addDoc(collection(db, "conversations", convId, "messages"), {
        text: "Welcome to Bestibule 👋",
        authorId: 'assistant',
        createdAt: serverTimestamp(),
        status: "sent",
        meta: { role: "ai" }
      });
      
      await updateDoc(convRef, { messageCount: 1 });
      console.log('🎯 Created new conversation:', convId);
      return { id: convId };
    }
    
    // STEP 3: Filter by supporterId if specified, then sort by message count
    let candidates = conversationsWithCounts;
    
    if (supporterId) {
      // Prefer conversations matching the requested supporterId
      const matchingSupporter = conversationsWithCounts.filter(c => 
        c.supporterId === supporterId || c.id.includes(supporterId)
      );
      
      if (matchingSupporter.length > 0) {
        candidates = matchingSupporter;
        console.log(`📋 Filtered to ${candidates.length} conversations matching supporterId: ${supporterId}`);
      }
    }
    
    // Sort by message count (descending) and return the one with most messages
    candidates.sort((a, b) => b.messageCount - a.messageCount);
    const bestConv = candidates[0];
    
    console.log(`✅ Selected conversation: ${bestConv.id} (${bestConv.messageCount} messages)`);
    
    // Log all conversations found for debugging
    console.log('📋 All user conversations:', candidates.map(c => `${c.id}: ${c.messageCount} messages`).join(', '));
    
    // If multiple conversations exist, mark others as deprecated (only if they belong to same user)
    if (candidates.length > 1) {
      console.log(`⚠️ Found ${candidates.length} conversations. Marking others as deprecated.`);
      for (let i = 1; i < candidates.length; i++) {
        const depConv = candidates[i];
        
        // CRITICAL: Verify user is member before marking as deprecated
        const isMember = await verifyUserIsMember(depConv.id, uid);
        if (!isMember) {
          console.warn(`⚠️ Skipping deprecation of ${depConv.id} - user is not a member`);
          continue;
        }
        
        try {
          const depRef = doc(db, "conversations", depConv.id);
          await updateDoc(depRef, {
            deprecated: true,
            consolidatedInto: bestConv.id,
            consolidatedAt: serverTimestamp()
          });
          console.log(`📋 Marked ${depConv.id} (${depConv.messageCount} messages) as deprecated`);
        } catch (err) {
          console.warn(`⚠️ Could not mark ${depConv.id} as deprecated:`, err.message);
        }
      }
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

export function listenLatestMessages(conversationId, callback, pageSize = 500) {
  console.log('👂 Setting up listener for conversation:', conversationId, `(limit: ${pageSize} messages)`);
  
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "desc"), limit(pageSize));
  
  return onSnapshot(q, (snapshot) => {
    const messageCount = snapshot.docs.length;
    const hasMore = messageCount >= pageSize;
    console.log(`📥 Snapshot received: ${messageCount} messages${hasMore ? ` (may have more, limit reached)` : ''} from conversation: ${conversationId}`);
    
    // Log first and last message timestamps for debugging
    if (messageCount > 0) {
      const firstMsg = snapshot.docs[0].data();
      const lastMsg = snapshot.docs[messageCount - 1].data();
      const firstTime = firstMsg.createdAt?.toDate?.() || 'unknown';
      const lastTime = lastMsg.createdAt?.toDate?.() || 'unknown';
      console.log(`📅 Message time range: ${lastTime} (oldest) to ${firstTime} (newest)`);
    }
    
    callback(snapshot);
  }, (error) => {
    console.error('❌ Messages listener error for conversation:', conversationId, error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  });
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

  // Add the message
  await addDoc(collection(convRef, 'messages'), {
    text,
    authorId: authorId || uid,
    uid: uid,
    createdAt: serverTimestamp(),
    status: "sent",
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {})
  });
  
  // Update conversation last message
  await updateDoc(convRef, {
    lastMessage: text,
    updatedAt: serverTimestamp()
  });
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
