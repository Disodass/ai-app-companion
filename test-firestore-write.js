// Quick test script to verify Firestore write permissions
// Run this in browser console while logged in

import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const db = getFirestore();
const uid = getAuth().currentUser?.uid;

if (!uid) {
  console.error('❌ Not authenticated! Please sign in first.');
} else {
  const cid = `dm_${uid}`;
  const convRef = doc(db, 'conversations', cid);
  
  console.log('Testing Firestore write permissions...');
  console.log('User UID:', uid);
  console.log('Conversation ID:', cid);
  
  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      console.log('Creating conversation document...');
      await setDoc(convRef, { 
        type: 'dm', 
        ownerUid: uid, 
        members: [uid], 
        createdAt: serverTimestamp() 
      }, { merge: true });
      console.log('✅ Conversation document created');
    } else {
      console.log('✅ Conversation document exists');
    }
    
    console.log('Adding test message...');
    await addDoc(collection(convRef, 'messages'), { 
      uid, 
      text: 'test-from-console-' + Date.now(), 
      createdAt: serverTimestamp() 
    });
    console.log('✅ Test message written to', `conversations/${cid}/messages`);
    console.log('✅ Firestore write permissions are working!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}
