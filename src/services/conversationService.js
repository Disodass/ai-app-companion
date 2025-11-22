import { collection, collectionGroup, query, where, orderBy, limit, onSnapshot, addDoc, doc, setDoc, serverTimestamp, updateDoc, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

// Find or create a conversation for a specific supporter
export async function findOrCreateSupporterConversation(uid, supporterId) {
  console.log('🔍 Finding or creating conversation for user:', uid, 'with supporter:', supporterId);
  
  try {
    // For AI Friend, check for legacy conversations first
    if (supporterId === 'ai-friend') {
      // 1) Check for legacy dm_{uid} conversation (single underscore - preferred)
      const legacyId = `dm_${uid}`;
      const legacyRef = doc(db, "conversations", legacyId);
      const legacyExists = await getDoc(legacyRef);
      
      // 2) Also check for double underscore variant (backward compatibility)
      const legacyIdDouble = `dm__${uid}`;
      const legacyRefDouble = doc(db, "conversations", legacyIdDouble);
      const legacyExistsDouble = await getDoc(legacyRefDouble);
      
      // If both exist, prefer single underscore and mark double as deprecated
      if (legacyExists.exists() && legacyExistsDouble.exists()) {
        console.log('⚠️ Both dm_ and dm__ exist, using single underscore and marking double as deprecated');
        // Mark double underscore as deprecated (don't delete, just mark)
        await updateDoc(legacyRefDouble, {
          deprecated: true,
          consolidatedInto: legacyId,
          consolidatedAt: serverTimestamp()
        });
        return { id: legacyId };
      }
      
      if (legacyExists.exists()) {
        const legacyData = legacyExists.data();
        const messageCount = legacyData.messageCount || 0;
        console.log('✅ Found legacy conversation, using:', legacyId, `(${messageCount} messages)`);
        return { id: legacyId };
      }
      
      if (legacyExistsDouble.exists()) {
        const legacyDataDouble = legacyExistsDouble.data();
        const messageCountDouble = legacyDataDouble.messageCount || 0;
        console.log('✅ Found legacy conversation (double underscore), using:', legacyIdDouble, `(${messageCountDouble} messages)`);
        return { id: legacyIdDouble };
      }
      
      // 2) Check for supporter-specific conversation ID first (most reliable)
      const supporterConvId = `supporter__${uid}__ai-friend`;
      const supporterConvRef = doc(db, "conversations", supporterConvId);
      try {
        const supporterConvExists = await getDoc(supporterConvRef);
        if (supporterConvExists.exists()) {
          const supporterData = supporterConvExists.data();
          const messageCount = supporterData.messageCount || 0;
          console.log('✅ Found existing supporter conversation:', supporterConvId, `(${messageCount} messages)`);
          return { id: supporterConvId };
        } else {
          console.log('📋 Supporter conversation does not exist:', supporterConvId);
        }
      } catch (err) {
        console.warn('⚠️ Error checking supporter conversation:', err);
      }
      
      // 3) Check for any existing conversations with messages for this user
      // Try query without orderBy first (no composite index needed)
      // Note: This query requires the 'members' field to exist, so legacy conversations without it won't be found
      try {
        const conversationsQuery = query(
          collection(db, "conversations"),
          where("members", "array-contains", uid)
        );
        
        const conversationsSnapshot = await getDocs(conversationsQuery);
        console.log('📋 Query returned', conversationsSnapshot.docs.length, 'conversations');
        
        if (!conversationsSnapshot.empty) {
          // Find the conversation with the most messages (or supporterId match)
          const conversations = conversationsSnapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));
          
          console.log('📋 Conversations found:', conversations.map(c => ({ id: c.id, supporterId: c.data.supporterId, messageCount: c.data.messageCount })));
          
          // Prefer conversations with supporterId matching 'ai-friend'
          const aiFriendConv = conversations.find(c => c.data.supporterId === 'ai-friend');
          if (aiFriendConv) {
            const msgCount = aiFriendConv.data.messageCount || 0;
            console.log('✅ Found existing ai-friend conversation:', aiFriendConv.id, `(${msgCount} messages)`);
            return { id: aiFriendConv.id };
          }
          
          // Otherwise, prefer conversation with highest messageCount
          const sortedByMessages = conversations.sort((a, b) => 
            (b.data.messageCount || 0) - (a.data.messageCount || 0)
          );
          
          if (sortedByMessages.length > 0) {
            const topConv = sortedByMessages[0];
            const msgCount = topConv.data.messageCount || 0;
            console.log('✅ Found existing conversation with messages:', topConv.id, `(${msgCount} messages)`);
            return { id: topConv.id };
          }
        } else {
          console.log('📋 No conversations found with members array containing user');
        }
      } catch (queryError) {
        console.error('❌ Query for existing conversations failed:', queryError);
        console.error('Error code:', queryError.code);
        console.error('Error message:', queryError.message);
        // If it's a permission error, that's expected - continue to create new conversation
        // If it's a 400 error, it might be an index issue or invalid query
        if (queryError.code === 'failed-precondition') {
          console.warn('⚠️ Query requires an index. Check Firebase console for index creation link.');
        }
        // Continue to create new conversation
      }
    }
    
    // Create supporter-specific conversation ID
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
      
      // Add welcome message only if no messages exist
      const seedCheck = await getDocs(
        query(collection(db, "conversations", convId, "messages"), limit(1))
      );
      
      if (seedCheck.empty) {
        await addDoc(collection(db, "conversations", convId, "messages"), {
          text: "Welcome to Bestibule 👋",
          authorId: 'assistant',
          createdAt: serverTimestamp(),
          status: "sent",
          meta: { role: "ai" }
        });
        
        // Update message count
        await updateDoc(convRef, { messageCount: 1 });
      }
    } else {
      const existingData = existing.data();
      const messageCount = existingData.messageCount || 0;
      console.log('✅ Using existing supporter conversation:', convId, `(${messageCount} messages)`);
    }
    
    console.log('🎯 Final conversation ID selected:', convId);
    return { id: convId };
    
  } catch (error) {
    console.error('❌ Error creating supporter conversation:', error);
    // Fallback to simple creation
    const convId = `supporter__${uid}__${supporterId}`;
    return { id: convId };
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
