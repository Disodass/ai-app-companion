import { collection, collectionGroup, query, where, orderBy, limit, onSnapshot, addDoc, doc, setDoc, serverTimestamp, updateDoc, getDocs, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Find or create a conversation for a specific supporter
export async function findOrCreateSupporterConversation(uid, supporterId) {
  console.log('🔍 Finding or creating conversation for user:', uid, 'with supporter:', supporterId);
  
  try {
    // For AI Friend, check for legacy conversations first
    if (supporterId === 'ai-friend') {
      // 1) Check for legacy dm__{uid} conversation
      const legacyId = `dm__${uid}`;
      const legacyRef = doc(db, "conversations", legacyId);
      const legacyExists = await getDoc(legacyRef);
      
      if (legacyExists.exists()) {
        console.log('✅ Found legacy conversation, using:', legacyId);
        return { id: legacyId };
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
  const messageRef = collection(db, "conversations", conversationId, "messages");
  
  const messageData = {
    text,
    authorId,
    createdAt: serverTimestamp(),
    status: "sending",
    meta
  };
  
  const docRef = await addDoc(messageRef, messageData);
  
  // Update message status to sent
  await updateDoc(docRef, { status: "sent" });
  
  // Update conversation metadata
  const convRef = doc(db, "conversations", conversationId);
  await updateDoc(convRef, {
    lastMessage: text,
    updatedAt: serverTimestamp(),
    messageCount: serverTimestamp() // This will be updated properly by a cloud function
  });
  
  return docRef;
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
