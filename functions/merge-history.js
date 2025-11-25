#!/usr/bin/env node
/**
 * Merge migrated conversation history into live DM conversation
 * Usage: node scripts/merge-history.js <userId> [targetConvId]
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ai-app-companion',
  });
}

const db = admin.firestore();

async function mergeHistory(userId, targetConvId) {
  console.log(`Merging history for user ${userId} into conversation ${targetConvId}`);

  const targetConvRef = db.collection('conversations').doc(targetConvId);
  
  // Ensure target conversation exists
  const targetSnap = await targetConvRef.get();
  if (!targetSnap.exists) {
    await targetConvRef.set({
      members: [userId],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      messageCount: 0,
    }, { merge: true });
    console.log('Created target conversation');
  }

  // Find all migrated conversations for this user
  const migratedSnap = await db
    .collection('conversations')
    .where('migratedFrom', 'in', [userId, `dm_${userId}`, `dm__${userId}`])
    .get();

  console.log(`Found ${migratedSnap.size} migrated conversations`);

  // Collect all messages with timestamps
  const allMessages = [];
  const seenIds = new Set();

  // Also check existing messages in target to avoid duplicates
  const existingSnap = await targetConvRef.collection('messages').get();
  console.log(`Found ${existingSnap.size} existing messages in target`);
  existingSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.createdAt) {
      const ts = data.createdAt.toMillis ? data.createdAt.toMillis() : 
                 (data.createdAt._seconds * 1000 + (data.createdAt._nanoseconds || 0) / 1000000);
      seenIds.add(`${ts}_${(data.text || '').slice(0, 50)}`);
    }
  });

  for (const migratedDoc of migratedSnap.docs) {
    const migratedData = migratedDoc.data();
    const messages = migratedData.messages || [];
    
    console.log(`Processing migrated conversation ${migratedDoc.id} with ${messages.length} messages`);

    for (const msg of messages) {
      // Normalize timestamp
      let timestamp;
      if (msg.timestamp) {
        if (msg.timestamp._seconds !== undefined) {
          timestamp = admin.firestore.Timestamp.fromMillis(
            msg.timestamp._seconds * 1000 + (msg.timestamp._nanoseconds || 0) / 1000000
          );
        } else if (typeof msg.timestamp === 'string') {
          timestamp = admin.firestore.Timestamp.fromDate(new Date(msg.timestamp));
        } else if (msg.timestamp.toDate) {
          timestamp = admin.firestore.Timestamp.fromDate(msg.timestamp.toDate());
        } else {
          timestamp = admin.firestore.Timestamp.fromDate(new Date(msg.timestamp));
        }
      } else {
        continue; // Skip messages without timestamps
      }

      // Create dedupe key
      const dedupeKey = `${timestamp.toMillis()}_${(msg.text || '').slice(0, 50)}`;
      if (seenIds.has(dedupeKey)) {
        continue; // Skip duplicates
      }
      seenIds.add(dedupeKey);

      // Map sender to authorId
      let authorId = userId;
      if (msg.sender === 'supporter' || msg.sender === 'ai' || msg.sender === 'assistant') {
        authorId = 'assistant';
      } else if (msg.sender === 'user') {
        authorId = userId;
      } else if (msg.authorId) {
        authorId = msg.authorId;
      }

      allMessages.push({
        text: msg.text || '',
        authorId: authorId,
        uid: userId,
        createdAt: timestamp,
        status: 'sent',
        meta: {
          role: authorId === 'assistant' ? 'ai' : 'user',
          migratedFrom: migratedDoc.id,
        },
      });
    }
  }

  // Sort by timestamp
  allMessages.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

  console.log(`Merging ${allMessages.length} new messages into ${targetConvId}`);

  if (allMessages.length === 0) {
    console.log('No new messages to merge');
    return { merged: 0, total: existingSnap.size };
  }

  // Batch write messages (Firestore limit is 500 per batch)
  const batches = [];
  let currentBatch = db.batch();
  let count = 0;

  for (const msg of allMessages) {
    const msgRef = targetConvRef.collection('messages').doc();
    currentBatch.set(msgRef, msg);
    count++;

    if (count >= 500) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    batches.push(currentBatch);
  }

  // Execute batches
  console.log(`Writing ${batches.length} batch(es)...`);
  for (let i = 0; i < batches.length; i++) {
    await batches[i].commit();
    console.log(`Committed batch ${i + 1}/${batches.length}`);
  }

  // Update conversation metadata
  const lastMessage = allMessages[allMessages.length - 1];
  const totalCount = existingSnap.size + allMessages.length;

  await targetConvRef.update({
    messageCount: totalCount,
    lastMessage: lastMessage?.text || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    [`memberMeta.${userId}.lastReadAt`]: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Merge complete! Merged ${allMessages.length} messages, total: ${totalCount}`);
  return {
    success: true,
    merged: allMessages.length,
    total: totalCount,
    conversationId: targetConvId,
  };
}

// Run if called directly
if (require.main === module) {
  const userId = process.argv[2] || 'E7USlxuqx1dZdJOpd9uT5ufnQsy1';
  const targetConvId = process.argv[3] || `dm__${userId}`;
  
  mergeHistory(userId, targetConvId)
    .then(result => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { mergeHistory };

