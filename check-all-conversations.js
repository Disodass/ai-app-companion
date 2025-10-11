// Script to check ALL conversations in the database
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "AIzaSyDueAy790_hFW6Aye2FYghRge6FOlRryFw",
  authDomain: "ai-app-companion.firebaseapp.com",
  projectId: "ai-app-companion",
  storageBucket: "ai-app-companion.firebasestorage.app",
  messagingSenderId: "506059414782",
  appId: "1:506059414782:web:70977d87fdd280f05b59af",
});

const db = getFirestore(app);

async function checkAllConversations() {
  try {
    console.log('🔍 Checking ALL conversations in the database...');
    
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, orderBy('updatedAt', 'desc'), limit(50));
    
    const snapshot = await getDocs(q);
    console.log(`📊 Found ${snapshot.size} total conversations:`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`\n📁 Conversation: ${doc.id}`);
      console.log(`   Members: ${data.members?.join(', ')}`);
      console.log(`   Message Count: ${data.messageCount || 0}`);
      console.log(`   Last Updated: ${data.updatedAt?.toDate?.() || 'Unknown'}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkAllConversations();
