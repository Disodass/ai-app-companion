import { collection, collectionGroup, query, where, orderBy, limit, onSnapshot, addDoc, doc, setDoc, serverTimestamp, updateDoc, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

// Helper function to get actual message count from subcollection (more reliable than messageCount field)
async function getActualMessageCount(conversationId) {
  try {
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const messagesSnapshot = await getDocs(query(messagesRef, limit(1)));
    // If we can access messages, count them properly
    const countSnapshot = await getDocs(messagesRef);
    return countSnapshot.size;
  } catch (error) {
    console.warn(`⚠️ Could not count messages for ${conversationId}:`, error.message);
    return 0;
  }
}

// Find or create a conversation for a specific supporter
export async function findOrCreateSupporterConversation(uid, supporterId) {
  console.log('🔍 Finding or creating conversation for user:', uid, 'with supporter:', supporterId);
  
  try {
    const candidateConversations = [];
    
    // Step 1: Check all known conversation ID formats
    const knownIds = [
      `dm_${uid}`,                    // Legacy single underscore
      `dm__${uid}`,                   // Legacy double underscore
      `supporter__${uid}__ai-friend`, // Standard supporter format
      `supporter__${uid}__supporter_friend`, // Alternative format
    ];
    
    console.log('📋 Checking known conversation IDs:', knownIds);
    
    for (const convId of knownIds) {
      try {
        const convRef = doc(db, "conversations", convId);
        const convSnap = await getDoc(convRef);
        
        if (convSnap.exists()) {
          const actualCount = await getActualMessageCount(convId);
          const data = convSnap.data();
          
          candidateConversations.push({
            id: convId,
            messageCount: actualCount,
            storedMessageCount: data.messageCount || 0,
            supporterId: data.supporterId,
            hasMembers: Array.isArray(data.members) && data.members.includes(uid),
            data: data
          });
          
          console.log(`✅ Found conversation ${convId}: ${actualCount} actual messages (stored: ${data.messageCount || 0})`);
        }
      } catch (err) {
        console.warn(`⚠️ Error checking ${convId}:`, err.message);
      }
    }
    
    // Step 2: Query all conversations where user is a member
    try {
      const conversationsQuery = query(
        collection(db, "conversations"),
        where("members", "array-contains", uid)
      );
      
      const conversationsSnapshot = await getDocs(conversationsQuery);
      console.log('📋 Query returned', conversationsSnapshot.docs.length, 'conversations with members array');
      
      for (const docSnap of conversationsSnapshot.docs) {
        const convId = docSnap.id;
        // Skip if we already checked this ID
        if (candidateConversations.find(c => c.id === convId)) {
          continue;
        }
        
        try {
          const actualCount = await getActualMessageCount(convId);
          const data = docSnap.data();
          
          candidateConversations.push({
            id: convId,
            messageCount: actualCount,
            storedMessageCount: data.messageCount || 0,
            supporterId: data.supporterId,
            hasMembers: true,
            data: data
          });
          
          console.log(`✅ Found conversation ${convId} via query: ${actualCount} actual messages`);
        } catch (err) {
          console.warn(`⚠️ Error counting messages for ${convId}:`, err.message);
        }
      }
    } catch (queryError) {
      console.error('❌ Query for conversations failed:', queryError);
      console.error('Error code:', queryError.code);
      // Continue - we may have found conversations via direct ID checks
    }
    
    // Step 3: Filter and sort candidates
    // Only consider conversations that actually have messages
    const conversationsWithMessages = candidateConversations.filter(c => c.messageCount > 0);
    
    if (conversationsWithMessages.length > 0) {
      // Sort by actual message count (descending)
      conversationsWithMessages.sort((a, b) => b.messageCount - a.messageCount);
      
      // Prefer conversations matching the requested supporterId
      if (supporterId === 'ai-friend') {
        const aiFriendConv = conversationsWithMessages.find(c => 
          c.supporterId === 'ai-friend' || c.id.includes('ai-friend')
        );
        if (aiFriendConv) {
          console.log(`✅ Selected conversation with most messages matching ai-friend: ${aiFriendConv.id} (${aiFriendConv.messageCount} messages)`);
          return { id: aiFriendConv.id };
        }
      }
      
      // Otherwise, use the conversation with the most messages
      const bestConv = conversationsWithMessages[0];
      console.log(`✅ Selected conversation with most messages: ${bestConv.id} (${bestConv.messageCount} messages)`);
      
      // If multiple conversations exist, mark others as deprecated (don't delete)
      if (conversationsWithMessages.length > 1) {
        console.log(`⚠️ Found ${conversationsWithMessages.length} conversations with messages. Marking others as deprecated.`);
        for (let i = 1; i < conversationsWithMessages.length; i++) {
          const depConv = conversationsWithMessages[i];
          try {
            const depRef = doc(db, "conversations", depConv.id);
            await updateDoc(depRef, {
              deprecated: true,
              consolidatedInto: bestConv.id,
              consolidatedAt: serverTimestamp()
            });
            console.log(`📋 Marked ${depConv.id} as deprecated`);
          } catch (err) {
            console.warn(`⚠️ Could not mark ${depConv.id} as deprecated:`, err.message);
          }
        }
      }
      
      return { id: bestConv.id };
    }
    
    // Step 4: No conversations with messages found - create new one
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
    // Don't silently create new conversation on error - throw so caller knows something went wrong
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
