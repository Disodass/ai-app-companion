// One-time migration script to add members array to legacy DM conversations
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "AIzaSyDueAy790_hFW6Aye2FYghRge6FOlRryFw",
  authDomain: "ai-app-companion.firebaseapp.com",
  projectId: "ai-app-companion",
  storageBucket: "ai-app-companion.firebasestorage.app",
  messagingSenderId: "506059414782",
  appId: "1:506059414782:web:70977d87fdd280f05b59af"
});

const db = getFirestore(app);

export async function backfillMembers() {
  console.log('Starting backfill of members array...');
  const qs = await getDocs(collection(db, 'conversations'));
  
  let updated = 0;
  let skipped = 0;
  
  for (const d of qs.docs) {
    const data = d.data();
    if (!Array.isArray(data.members)) {
      const id = d.id;
      const uid = id.startsWith('dm__') ? id.slice(4) : id.startsWith('dm_') ? id.slice(3) : null;
      
      if (uid) {
        console.log(`Updating ${id} with members: [${uid}]`);
        await updateDoc(doc(db, 'conversations', id), { members: [uid] });
        updated++;
      } else {
        console.log(`Skipping ${id} - not a DM pattern`);
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`✅ Backfill complete: ${updated} updated, ${skipped} skipped`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillMembers().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

