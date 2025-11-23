import { collection, collectionGroup, query, where, orderBy, limit, onSnapshot, addDoc, doc, setDoc, serverTimestamp, updateDoc, getDocs, getDoc } from "firebase/firestore";
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

// Find or create a conversation for a specific supporter
// Since user is the only user, find conversation with MOST messages regardless of structure
export async function findOrCreateSupporterConversation(uid, supporterId) {
  console.log('🔍 Finding conversation with most messages (user is only user):', uid, 'supporter:', supporterId);
  
  try {
    // PRIMARY METHOD: Use collectionGroup to find ALL messages across ALL conversations
    // This works regardless of conversation structure, ID format, or membership fields
    console.log('📊 Searching ALL messages across ALL conversations using collectionGroup...');
    
    let conversationCounts = new Map(); // conversationId -> messageCount
    
    try {
      // Get all messages from all conversations
      const allMessagesQuery = query(collectionGroup(db, "messages"), limit(10000)); // Limit to prevent timeout
      const allMessagesSnapshot = await getDocs(allMessagesQuery);
      
      console.log(`📥 Found ${allMessagesSnapshot.size} total messages across all conversations`);
      
      // Group messages by conversation ID (extract from document path)
      for (const messageDoc of allMessagesSnapshot.docs) {
        const pathParts = messageDoc.ref.path.split('/');
        // Path format: conversations/{conversationId}/messages/{messageId}
        if (pathParts.length >= 3 && pathParts[0] === 'conversations') {
          const conversationId = pathParts[1];
          conversationCounts.set(conversationId, (conversationCounts.get(conversationId) || 0) + 1);
        }
      }
      
      console.log(`📋 Found ${conversationCounts.size} unique conversations with messages`);
      
      // Convert to array and sort by message count
      const conversations = Array.from(conversationCounts.entries())
        .map(([id, count]) => ({ id, messageCount: count }))
        .sort((a, b) => b.messageCount - a.messageCount);
      
      if (conversations.length > 0) {
        const bestConv = conversations[0];
        console.log(`✅ Found conversation with most messages: ${bestConv.id} (${bestConv.messageCount} messages)`);
        
        // Log all conversations found
        console.log('📋 All conversations found:', conversations.map(c => `${c.id}: ${c.messageCount} messages`).join(', '));
        
        // If multiple conversations exist, mark others as deprecated
        if (conversations.length > 1) {
          console.log(`⚠️ Found ${conversations.length} conversations. Marking others as deprecated.`);
          for (let i = 1; i < conversations.length; i++) {
            const depConv = conversations[i];
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
        
        return { id: bestConv.id };
      }
    } catch (collectionGroupError) {
      console.error('❌ collectionGroup search failed:', collectionGroupError);
      console.error('Error code:', collectionGroupError.code);
      console.error('Falling back to known ID format checks...');
      
      // FALLBACK: Check known conversation ID formats
      const knownIds = [
        `dm_${uid}`,
        `dm__${uid}`,
        `supporter__${uid}__ai-friend`,
        `supporter__${uid}__supporter_friend`,
      ];
      
      let bestConv = null;
      let maxCount = 0;
      
      for (const convId of knownIds) {
        try {
          const convRef = doc(db, "conversations", convId);
          const convSnap = await getDoc(convRef);
          
          if (convSnap.exists()) {
            const data = convSnap.data();
            const count = await getMessageCount(convId, data.messageCount);
            
            if (count > maxCount) {
              maxCount = count;
              bestConv = { id: convId, messageCount: count };
            }
            
            console.log(`✅ Found conversation ${convId}: ${count} messages`);
          }
        } catch (err) {
          console.warn(`⚠️ Error checking ${convId}:`, err.message);
        }
      }
      
      if (bestConv && bestConv.messageCount > 0) {
        console.log(`✅ Selected conversation: ${bestConv.id} (${bestConv.messageCount} messages)`);
        return { id: bestConv.id };
      }
    }
    
    // No conversations with messages found - create new one
    console.log('📋 No existing conversations with messages found. Creating new conversation.');
    const convId = `supporter__${uid}__${supporterId}`;
    const convRef = doc(db, "conversations", convId);
    const existing = await getDoc(convRef);
    
    if (!existing.exists()) {
      console.log('🆕 Creating new supporter conversation:', convId);
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
    } else {
      const existingData = existing.data();
      const messageCount = existingData.messageCount || 0;
      console.log('✅ Using existing supporter conversation:', convId, `(${messageCount} messages)`);
    }
    
    console.log('🎯 Final conversation ID selected:', convId);
    return { id: convId };
    
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
