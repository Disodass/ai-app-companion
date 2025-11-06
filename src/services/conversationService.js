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
      
      if (legacyExists.exists()) {
        console.log('✅ Found legacy conversation, using:', legacyId);
        return { id: legacyId };
      }
      
      // 2) Also check for double underscore variant (backward compatibility)
      const legacyIdDouble = `dm__${uid}`;
      const legacyRefDouble = doc(db, "conversations", legacyIdDouble);
      const legacyExistsDouble = await getDoc(legacyRefDouble);
      
      if (legacyExistsDouble.exists()) {
        console.log('✅ Found legacy conversation (double underscore), using:', legacyIdDouble);
        return { id: legacyIdDouble };
      }
      
      // 2) Check for any existing conversations with messages for this user
      const conversationsQuery = query(
        collection(db, "conversations"),
        where("members", "array-contains", uid),
        orderBy("messageCount", "desc")
      );
      
      const conversationsSnapshot = await getDocs(conversationsQuery);
      if (!conversationsSnapshot.empty) {
        const bestConv = conversationsSnapshot.docs[0];
        console.log('✅ Found existing conversation with messages:', bestConv.id);
        return { id: bestConv.id };
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
      console.log('✅ Using existing supporter conversation:', convId);
    }
    
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
  console.log('👂 Setting up listener for conversation:', conversationId);
  
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "desc"), limit(pageSize));
  
  return onSnapshot(q, (snapshot) => {
    console.log('📥 Snapshot received:', snapshot.docs.length, 'messages');
    callback(snapshot);
  }, (error) => {
    console.error('❌ Messages listener error:', error);
  });
}

export async function sendMessage(conversationId, authorId, text, meta = {}) {
  // Get the current user's UID
  const uid = auth.currentUser?.uid || authorId;
  
  // Normalize conversation ID - standardize on single underscore for DMs
  let cid = conversationId;
  if (conversationId.startsWith('dm__')) {
    cid = 'dm_' + conversationId.slice(4);
  } else if (conversationId.startsWith('dm_')) {
    cid = conversationId; // Already correct
  }
  // For supporter conversations, keep as-is
  
  const convRef = doc(db, 'conversations', cid);
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
