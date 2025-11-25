const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const Busboy = require('busboy');
const { Readable } = require('stream');
// Node.js 20 has native fetch, no need for node-fetch

admin.initializeApp();

// Use the secret environment variable
const { defineSecret } = require('firebase-functions/params');
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const groqApiKey = defineSecret('GROQ_API_KEY');

exports.sendEmail = functions.runWith({
  secrets: ['SENDGRID_API_KEY']
}).https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  // Verify Firebase Auth token if provided (optional for public welcome emails)
  const authHeader = req.headers.authorization
  const idToken = authHeader?.split('Bearer ')[1]
  
  let userId = null
  if (idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken)
      userId = decodedToken.uid
      console.log('Authenticated user:', userId)
    } catch (error) {
      console.log('Auth token verification failed (may be public email):', error.message)
      // Allow unauthenticated requests for public signup emails
    }
  }

  try {
    // Initialize SendGrid with API key from secret
    const apiKey = process.env.SENDGRID_API_KEY;
    console.log('SendGrid API Key exists:', !!apiKey);
    console.log('API Key starts with SG:', apiKey ? apiKey.startsWith('SG.') : false);
    
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY secret is not available');
    }
    
    sgMail.setApiKey(apiKey);
    
    const { from, to, subject, html, text } = req.body;

    if (!from || !to || !subject || !html) {
      res.status(400).send('Missing required fields');
      return;
    }

    const msg = {
      to: Array.isArray(to) ? to : [to],
      from: from,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '')
    };

    const result = await sgMail.send(msg);
    
    res.status(200).json({
      success: true,
      messageId: result[0].headers['x-message-id'] || 'sent'
    });

  } catch (error) {
    console.error('SendGrid error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Minimal, robust inbound email handler using Busboy for multipart parsing
exports.receiveEmail = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onRequest((req, res) => {
    // CORS + method guard
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    // Helper to save parsed fields to Firestore
    const saveEmailFields = async (fields) => {
      try {
        console.log('Raw fields received:', Object.keys(fields));
        console.log('From:', fields.from);
        console.log('To:', fields.to);
        console.log('Subject:', fields.subject);
        console.log('Text length:', fields.text?.length || 0);
        console.log('HTML length:', fields.html?.length || 0);
        
        // Safely parse envelope/headers if they're JSON strings
        let envelope = {};
        if (typeof fields.envelope === 'string') {
          try { envelope = JSON.parse(fields.envelope); } catch (e) {
            console.log('Failed to parse envelope:', e.message);
          }
        } else if (fields.envelope) {
          envelope = fields.envelope;
        }

        // Prefer explicit fields; fall back to envelope
        const from = fields.from || envelope.from || '';
        const toList = fields.to
          ? Array.isArray(fields.to) ? fields.to : [fields.to]
          : (Array.isArray(envelope.to) ? envelope.to : (envelope.to ? [envelope.to] : []));
        const to = toList.join(', ');

        const subject = fields.subject || '';
        const text = fields.text || '';
        const html = fields.html || '';

        // If everything is empty, log & ack to avoid retries
        if (!from && !to && !subject && !text && !html) {
          console.log('Empty fields received. All field keys:', Object.keys(fields || {}));
          return { status: 200, message: 'OK' };
        }

        const doc = {
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          from, to, subject,
          text, html,
          // Map to frontend expected field names
          textContent: text,
          htmlContent: html,
          envelope: envelope || null,
          // Optional extras SendGrid may send:
          charsets: fields.charsets || null,
          dkim: fields.dkim || null,
          SPF: fields.SPF || null,
          spam_report: fields.spam_report || null,
          spam_score: fields.spam_score ? Number(fields.spam_score) : null,
          sender_ip: fields.sender_ip || null,
          isRead: false,
          read: false,
          source: 'sendgrid_inbound_parse'
        };

        await admin.firestore().collection('email_inbox').add(doc);
        console.log('✓ Saved email:', { from, to, subject, textLen: text.length, htmlLen: html.length });
        return { status: 200, message: 'OK' };
      } catch (e) {
        console.error('Error saving inbound email:', e);
        return { status: 200, message: 'OK' }; // Still 200 so SendGrid doesn't retry
      }
    };

    const contentType = (req.get('content-type') || '').toLowerCase();
    console.log('Content-Type:', req.get('content-type'));
    console.log('Has req.rawBody:', !!req.rawBody);

    // Handle multipart/form-data with Busboy
    if (contentType.includes('multipart/form-data')) {
      console.log('Parsing multipart with Busboy');
      
      if (!req.rawBody) {
        console.error('No rawBody available for multipart parsing');
        return res.status(200).send('OK');
      }

      const busboy = Busboy({ headers: req.headers });
      const fields = {};

      busboy.on('field', (fieldname, value) => {
        console.log(`Field: ${fieldname} = ${value.substring(0, 100)}...`);
        fields[fieldname] = value;
      });

      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(`File: ${fieldname}, filename: ${filename}`);
        // For now, just drain the file stream (we're not saving attachments)
        file.resume();
      });

      busboy.on('finish', async () => {
        console.log('Busboy finished parsing');
        const result = await saveEmailFields(fields);
        res.status(result.status).send(result.message);
      });

      busboy.on('error', (error) => {
        console.error('Busboy error:', error);
        res.status(200).send('OK');
      });

      // Create a readable stream from rawBody buffer
      const stream = Readable.from(req.rawBody);
      stream.pipe(busboy);
    } 
    // Handle application/x-www-form-urlencoded - Firebase already parsed it
    else if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log('Parsing URL-encoded body');
      saveEmailFields(req.body).then(result => {
        res.status(result.status).send(result.message);
      });
    }
    // Fallback: try to parse as JSON
    else if (contentType.includes('application/json')) {
      console.log('Parsing JSON body');
      saveEmailFields(req.body).then(result => {
        res.status(result.status).send(result.message);
      });
    }
    // Unknown content type - try req.body anyway
    else {
      console.log('Unknown content-type, trying req.body');
      saveEmailFields(req.body || {}).then(result => {
        res.status(result.status).send(result.message);
      });
    }
  });

// AI Reply function - server-side Groq API call
exports.aiReply = functions.runWith({
  secrets: ['GROQ_API_KEY'],
  timeoutSeconds: 60
}).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Groq API key not configured');
  }

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new functions.https.HttpsError('internal', `Groq error: ${resp.status} - ${errorText}`);
    }

    return await resp.json();
  } catch (error) {
    console.error('Groq API error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Groq API error: ${error.message}`);
  }
});

// Debug helper: dump a conversation and its messages as JSON
exports.dumpConversation = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const convId = typeof req.query.id === 'string' ? req.query.id : undefined;
    const memberId = typeof req.query.member === 'string' ? req.query.member : undefined;
    const listFlag = req.query.list === 'true';

    if (!convId && !memberId && !listFlag) {
      return res
        .status(400)
        .json({ error: 'Provide one of ?id=<conversationId>, ?member=<uid>, or ?list=true' });
    }

    if (memberId && !convId) {
      const convSnap = await admin
        .firestore()
        .collection('conversations')
        .where('members', 'array-contains', memberId)
        .get();
      const conversations = convSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json({ member: memberId, conversations });
    }

    if (listFlag && !convId && !memberId) {
      const convSnap = await admin.firestore().collection('conversations').limit(100).get();
      const conversations = convSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.json({ conversations });
    }

    try {
      const convRef = admin.firestore().collection('conversations').doc(convId);
      const convSnap = await convRef.get();
      if (!convSnap.exists) {
        return res.status(404).json({ error: `Conversation ${convId} not found` });
      }
      const convData = convSnap.data();
      const messagesSnap = await convRef.collection('messages').orderBy('createdAt').get();
      const messages = messagesSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt:
            data.createdAt && data.createdAt.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || null,
          updatedAt:
            data.updatedAt && data.updatedAt.toDate
              ? data.updatedAt.toDate().toISOString()
              : data.updatedAt || null,
        };
      });

      res.json({
        id: convId,
        conversation: {
          ...convData,
          createdAt:
            convData.createdAt && convData.createdAt.toDate
              ? convData.createdAt.toDate().toISOString()
              : convData.createdAt || null,
          updatedAt:
            convData.updatedAt && convData.updatedAt.toDate
              ? convData.updatedAt.toDate().toISOString()
              : convData.updatedAt || null,
        },
        messages,
      });
    } catch (err) {
      console.error('dumpConversation error:', err);
      res.status(500).json({ error: err.message || 'Unknown error' });
    }
  });

// DEPRECATED: No longer needed - conversation lookup now uses collectionGroup to automatically find best conversation
// Keeping for reference but should not be used
// Merge migrated conversation history into live DM conversation (HTTP endpoint)
exports.mergeHistory = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onRequest(async (req, res) => {
    return res.status(410).json({ 
      error: 'This function is deprecated. Conversation lookup now automatically finds the conversation with most messages.',
      message: 'Use findOrCreateSupporterConversation which uses collectionGroup to find all conversations.'
    });
    
    /* DEPRECATED CODE - Commented out
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const userId = req.query.userId || req.body?.userId;
    const targetConvId = req.query.convId || req.body?.convId || (userId ? `dm__${userId}` : null);

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }

    try {
      const db = admin.firestore();
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
      existingSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const ts = data.createdAt.toMillis ? data.createdAt.toMillis() : 
                     (data.createdAt._seconds * 1000 + (data.createdAt._nanoseconds || 0) / 1000000);
          seenIds.add(`${ts}_${data.text?.slice(0, 50)}`);
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
            if (msg.timestamp._seconds) {
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

      console.log(`Merging ${allMessages.length} messages into ${targetConvId}`);

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
      for (const b of batches) {
        await b.commit();
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

      return res.json({
        success: true,
        merged: allMessages.length,
        total: totalCount,
        conversationId: targetConvId,
      });
    } catch (error) {
      console.error('mergeConversationHistory error:', error);
      return res.status(500).json({ error: `Merge failed: ${error.message}` });
    }
    */
  });

// Generate conversation summary - triggered manually or via scheduled function
exports.generateConversationSummary = functions
  .runWith({ secrets: ['GROQ_API_KEY'], timeoutSeconds: 300 })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { conversationId, messageCount = 50 } = req.body || req.query;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId required' });
    }

    try {
      const db = admin.firestore();
      const convRef = db.collection('conversations').doc(conversationId);
      
      // Check if conversation exists
      const convSnap = await convRef.get();
      if (!convSnap.exists) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Get messages that haven't been summarized yet
      // Check for existing summaries to find the last summarized message
      const summariesRef = convRef.collection('summaries');
      const summariesSnap = await summariesRef.orderBy('createdAt', 'desc').limit(1).get();
      
      let startAfterId = null;
      if (!summariesSnap.empty) {
        const lastSummary = summariesSnap.docs[0].data();
        startAfterId = lastSummary.endMessageId;
      }

      // Get messages to summarize
      let messagesQuery = convRef.collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(messageCount);
      
      if (startAfterId) {
        const startAfterDoc = await convRef.collection('messages').doc(startAfterId).get();
        if (startAfterDoc.exists) {
          messagesQuery = messagesQuery.startAfter(startAfterDoc);
        }
      }

      const messagesSnap = await messagesQuery.get();
      
      if (messagesSnap.empty) {
        return res.json({
          success: true,
          message: 'No new messages to summarize',
          summaryId: null
        });
      }

      const messages = messagesSnap.docs.map(doc => ({
        id: doc.id,
        text: doc.data().text || '',
        authorId: doc.data().authorId || doc.data().uid || 'unknown',
        createdAt: doc.data().createdAt
      }));

      const startMessageId = messages[0].id;
      const endMessageId = messages[messages.length - 1].id;

      // Generate summary using Groq API
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY not configured');
      }

      const conversationText = messages.map((msg, idx) => {
        const role = msg.authorId === 'assistant' ? 'AI' : 'User';
        return `${idx + 1}. [${role}]: ${msg.text}`;
      }).join('\n\n');

      const prompt = `Analyze this conversation segment and create a concise summary. Focus on:
1. Key themes and topics discussed
2. Important facts, preferences, or information shared
3. Emotional tone or concerns expressed
4. Any decisions or commitments made

Conversation:
${conversationText}

Provide your response as JSON with these fields:
- keyThemes: array of 3-5 main themes (strings)
- importantFacts: array of 3-7 important facts or preferences (strings)
- userPreferences: array of user preferences mentioned (strings)
- summaryText: a 2-3 sentence summary of the conversation segment
- emotionalTone: brief description of the emotional tone (e.g., "supportive", "concerned", "excited")`;

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that creates concise, structured summaries of conversations. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 512,
          temperature: 0.3
        })
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
      }

      const groqData = await groqResponse.json();
      const responseText = groqData?.choices?.[0]?.message?.content?.trim() || '{}';
      
      // Parse JSON response
      let summaryData;
      try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        summaryData = JSON.parse(cleaned);
      } catch (e) {
        // Fallback parsing
        summaryData = {
          keyThemes: [],
          importantFacts: [],
          userPreferences: [],
          summaryText: `Conversation segment with ${messages.length} messages`,
          emotionalTone: 'neutral'
        };
      }

      // Ensure arrays
      const summaryDoc = {
        startMessageId,
        endMessageId,
        messageCount: messages.length,
        keyThemes: Array.isArray(summaryData.keyThemes) ? summaryData.keyThemes.slice(0, 5) : [],
        importantFacts: Array.isArray(summaryData.importantFacts) ? summaryData.importantFacts.slice(0, 7) : [],
        userPreferences: Array.isArray(summaryData.userPreferences) ? summaryData.userPreferences.slice(0, 5) : [],
        summaryText: summaryData.summaryText || `Conversation segment with ${messages.length} messages`,
        emotionalTone: summaryData.emotionalTone || 'neutral',
        dateRange: {
          start: messages[0].createdAt,
          end: messages[messages.length - 1].createdAt
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const summaryRef = await summariesRef.add(summaryDoc);

      return res.json({
        success: true,
        summaryId: summaryRef.id,
        messageCount: messages.length,
        summary: summaryDoc
      });
    } catch (error) {
      console.error('generateConversationSummary error:', error);
      return res.status(500).json({ error: `Summary generation failed: ${error.message}` });
    }
  });

// Generate summaries for ALL messages in a conversation (batch processing)
exports.generateAllSummaries = functions
  .runWith({ secrets: ['GROQ_API_KEY'], timeoutSeconds: 540 })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const { conversationId, batchSize = 50 } = req.body || req.query;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId required' });
    }

    try {
      const db = admin.firestore();
      const convRef = db.collection('conversations').doc(conversationId);
      
      // Check if conversation exists
      const convSnap = await convRef.get();
      if (!convSnap.exists) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Get total message count
      const messagesRef = convRef.collection('messages');
      const allMessagesSnap = await messagesRef.orderBy('createdAt', 'asc').get();
      const totalMessages = allMessagesSnap.size;
      
      console.log(`📊 Total messages to summarize: ${totalMessages}`);

      if (totalMessages === 0) {
        return res.json({
          success: true,
          message: 'No messages to summarize',
          totalMessages: 0,
          summariesCreated: 0
        });
      }

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY not configured');
      }

      let summariesCreated = 0;
      let processedMessages = 0;

      // Process in batches until all messages are summarized
      while (processedMessages < totalMessages) {
        // Check for existing summaries to find where we left off
        const summariesRef = convRef.collection('summaries');
        const summariesSnap = await summariesRef.orderBy('createdAt', 'desc').limit(1).get();
        
        let startAfterId = null;
        if (!summariesSnap.empty) {
          const lastSummary = summariesSnap.docs[0].data();
          startAfterId = lastSummary.endMessageId;
        }

        // Get next batch of messages
        let messagesQuery = messagesRef.orderBy('createdAt', 'asc').limit(batchSize);
        if (startAfterId) {
          const startAfterDoc = await messagesRef.doc(startAfterId).get();
          if (startAfterDoc.exists) {
            messagesQuery = messagesQuery.startAfter(startAfterDoc);
          }
        }

        const messagesSnap = await messagesQuery.get();
        
        if (messagesSnap.empty) {
          break; // All messages summarized
        }

        const messages = messagesSnap.docs.map(doc => ({
          id: doc.id,
          text: doc.data().text || '',
          authorId: doc.data().authorId || doc.data().uid || 'unknown',
          createdAt: doc.data().createdAt
        }));

        const startMessageId = messages[0].id;
        const endMessageId = messages[messages.length - 1].id;

        // Generate summary using Groq API
        const conversationText = messages.map((msg, idx) => {
          const role = msg.authorId === 'assistant' ? 'AI' : 'User';
          return `${idx + 1}. [${role}]: ${msg.text}`;
        }).join('\n\n');

        const prompt = `Analyze this conversation segment and create a concise summary. Focus on:
1. Key themes and topics discussed
2. Important facts, preferences, or information shared (especially names, personal details, preferences)
3. Emotional tone or concerns expressed
4. Any decisions or commitments made

Conversation:
${conversationText}

Provide your response as JSON with these fields:
- keyThemes: array of 3-5 main themes (strings)
- importantFacts: array of 3-7 important facts or preferences (strings) - BE THOROUGH with names and personal details
- userPreferences: array of user preferences mentioned (strings)
- summaryText: a 2-3 sentence summary of the conversation segment
- emotionalTone: brief description of the emotional tone (e.g., "supportive", "concerned", "excited")`;

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that creates concise, structured summaries of conversations. Always respond with valid JSON only. Pay special attention to names, personal details, and preferences.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 512,
            temperature: 0.3
          })
        });

        if (!groqResponse.ok) {
          const errorText = await groqResponse.text();
          throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
        }

        const groqData = await groqResponse.json();
        const responseText = groqData?.choices?.[0]?.message?.content?.trim() || '{}';
        
        // Parse JSON response
        let summaryData;
        try {
          const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          summaryData = JSON.parse(cleaned);
        } catch (e) {
          // Fallback parsing
          summaryData = {
            keyThemes: [],
            importantFacts: [],
            userPreferences: [],
            summaryText: `Conversation segment with ${messages.length} messages`,
            emotionalTone: 'neutral'
          };
        }

        // Create summary document
        const summaryDoc = {
          startMessageId,
          endMessageId,
          messageCount: messages.length,
          keyThemes: Array.isArray(summaryData.keyThemes) ? summaryData.keyThemes.slice(0, 5) : [],
          importantFacts: Array.isArray(summaryData.importantFacts) ? summaryData.importantFacts.slice(0, 7) : [],
          userPreferences: Array.isArray(summaryData.userPreferences) ? summaryData.userPreferences.slice(0, 5) : [],
          summaryText: summaryData.summaryText || `Conversation segment with ${messages.length} messages`,
          emotionalTone: summaryData.emotionalTone || 'neutral',
          dateRange: {
            start: messages[0].createdAt,
            end: messages[messages.length - 1].createdAt
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await summariesRef.add(summaryDoc);
        
        summariesCreated++;
        processedMessages += messages.length;
        
        console.log(`✅ Created summary ${summariesCreated}: ${messages.length} messages (${processedMessages}/${totalMessages} total)`);
        
        // Add delay between batches to respect rate limits (wait 3 seconds)
        if (processedMessages < totalMessages) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      return res.json({
        success: true,
        totalMessages,
        summariesCreated,
        processedMessages,
        conversationId
      });
    } catch (error) {
      console.error('generateAllSummaries error:', error);
      return res.status(500).json({ error: `Batch summary failed: ${error.message}` });
    }
  });

// Cleanup inactive users - automatically delete user data for accounts inactive 90+ days
exports.cleanupInactiveUsers = functions
  .runWith({ timeoutSeconds: 540 })
  .pubsub.schedule('0 2 * * 0') // Run weekly on Sunday at 2 AM
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.firestore();
    const auth = admin.auth();
    
    // Configuration
    const INACTIVITY_DAYS = parseInt(process.env.CLEANUP_INACTIVITY_DAYS || '90');
    const DRY_RUN = process.env.CLEANUP_DRY_RUN === 'true';
    const MIN_INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - MIN_INACTIVITY_MS);
    
    console.log(`🧹 Starting user cleanup (dry-run: ${DRY_RUN}, inactivity threshold: ${INACTIVITY_DAYS} days)`);
    console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);
    
    const stats = {
      usersChecked: 0,
      usersIdentified: 0,
      usersDeleted: 0,
      conversationsDeleted: 0,
      messagesDeleted: 0,
      errors: []
    };
    
    try {
      // Get all users from Firestore users collection
      const usersSnapshot = await db.collection('users').get();
      stats.usersChecked = usersSnapshot.size;
      console.log(`📊 Found ${stats.usersChecked} users in Firestore`);
      
      const usersToDelete = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Check last activity timestamp
        const lastActivity = userData.lastLoginAt || userData.updatedAt || userData.createdAt;
        let lastActivityDate = null;
        
        if (lastActivity) {
          if (lastActivity.toDate) {
            lastActivityDate = lastActivity.toDate();
          } else if (lastActivity._seconds) {
            lastActivityDate = new Date(lastActivity._seconds * 1000);
          } else if (typeof lastActivity === 'string') {
            lastActivityDate = new Date(lastActivity);
          }
        }
        
        // Also check Firebase Auth for last sign-in
        let authLastSignIn = null;
        try {
          const authUser = await auth.getUser(userId);
          if (authUser.metadata.lastSignInTime) {
            authLastSignIn = new Date(authUser.metadata.lastSignInTime);
          }
        } catch (err) {
          // User might not exist in Auth (deleted already)
          console.log(`⚠️ User ${userId} not found in Auth, will be cleaned up`);
        }
        
        // Use the most recent activity date
        const mostRecentActivity = lastActivityDate && authLastSignIn
          ? (lastActivityDate > authLastSignIn ? lastActivityDate : authLastSignIn)
          : (lastActivityDate || authLastSignIn);
        
        if (!mostRecentActivity) {
          // No activity data - check if account is very old (created > 180 days ago)
          const createdAt = userData.createdAt;
          let createdDate = null;
          if (createdAt) {
            if (createdAt.toDate) {
              createdDate = createdAt.toDate();
            } else if (createdAt._seconds) {
              createdDate = new Date(createdAt._seconds * 1000);
            }
          }
          
          if (createdDate && (Date.now() - createdDate.getTime()) > (180 * 24 * 60 * 60 * 1000)) {
            // Account is 180+ days old with no activity
            usersToDelete.push({ userId, reason: 'no_activity_data_old_account' });
            continue;
          }
          
          // Skip if we can't determine inactivity
          continue;
        }
        
        // Check if user is inactive
        if (mostRecentActivity < cutoffDate) {
          usersToDelete.push({ 
            userId, 
            lastActivity: mostRecentActivity.toISOString(),
            reason: 'inactive'
          });
        }
      }
      
      stats.usersIdentified = usersToDelete.length;
      console.log(`📋 Identified ${stats.usersIdentified} inactive users for cleanup`);
      
      if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE - No deletions will be performed');
        console.log('Users that would be deleted:', usersToDelete.map(u => ({ id: u.userId, reason: u.reason })));
        return { success: true, dryRun: true, stats };
      }
      
      // Delete user data for each inactive user
      for (const { userId, reason } of usersToDelete) {
        try {
          console.log(`🗑️ Deleting data for user ${userId} (reason: ${reason})`);
          
          // 1. Find and delete all conversations where user is a member
          const conversationsQuery = db.collection('conversations')
            .where('members', 'array-contains', userId);
          const conversationsSnapshot = await conversationsQuery.get();
          
          for (const convDoc of conversationsSnapshot.docs) {
            const convId = convDoc.id;
            
            // Delete all messages in the conversation
            const messagesRef = db.collection('conversations').doc(convId).collection('messages');
            const messagesSnapshot = await messagesRef.get();
            
            // Delete messages in batches (Firestore limit is 500 per batch)
            const batches = [];
            let currentBatch = db.batch();
            let count = 0;
            
            for (const msgDoc of messagesSnapshot.docs) {
              currentBatch.delete(msgDoc.ref);
              count++;
              stats.messagesDeleted++;
              
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
            for (const batch of batches) {
              await batch.commit();
            }
            
            // Delete conversation document
            await convDoc.ref.delete();
            stats.conversationsDeleted++;
            console.log(`  ✓ Deleted conversation ${convId} and ${messagesSnapshot.size} messages`);
          }
          
          // 2. Delete user profile document
          await db.collection('users').doc(userId).delete();
          console.log(`  ✓ Deleted user profile for ${userId}`);
          
          // 3. Optionally delete Firebase Auth account
          try {
            await auth.deleteUser(userId);
            console.log(`  ✓ Deleted Firebase Auth account for ${userId}`);
          } catch (authError) {
            // Auth account might already be deleted or not exist
            console.log(`  ⚠️ Could not delete Auth account for ${userId}: ${authError.message}`);
          }
          
          stats.usersDeleted++;
          console.log(`✅ Completed cleanup for user ${userId}`);
          
        } catch (error) {
          console.error(`❌ Error cleaning up user ${userId}:`, error);
          stats.errors.push({ userId, error: error.message });
        }
      }
      
      console.log(`✅ Cleanup completed. Stats:`, stats);
      return { success: true, stats };
      
    } catch (error) {
      console.error('❌ Cleanup function error:', error);
      return { success: false, error: error.message, stats };
    }
  });

// Manual trigger for cleanup (HTTP endpoint for testing)
exports.cleanupInactiveUsersManual = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Require authentication for manual trigger
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      // Check if user is admin (you can add admin check here)
      console.log('Manual cleanup triggered by:', decodedToken.uid);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
    const inactivityDays = parseInt(req.query.days || req.body?.days || '90');
    
    // Set environment variables for this run
    process.env.CLEANUP_DRY_RUN = dryRun ? 'true' : 'false';
    process.env.CLEANUP_INACTIVITY_DAYS = inactivityDays.toString();
    
    // Call the cleanup logic (same as scheduled function)
    const db = admin.firestore();
    const auth = admin.auth();
    
    const MIN_INACTIVITY_MS = inactivityDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - MIN_INACTIVITY_MS);
    
    console.log(`🧹 Manual cleanup (dry-run: ${dryRun}, inactivity threshold: ${inactivityDays} days)`);
    
    const stats = {
      usersChecked: 0,
      usersIdentified: 0,
      usersDeleted: 0,
      conversationsDeleted: 0,
      messagesDeleted: 0,
      errors: []
    };
    
    try {
      const usersSnapshot = await db.collection('users').get();
      stats.usersChecked = usersSnapshot.size;
      
      const usersToDelete = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        const lastActivity = userData.lastLoginAt || userData.updatedAt || userData.createdAt;
        let lastActivityDate = null;
        
        if (lastActivity) {
          if (lastActivity.toDate) {
            lastActivityDate = lastActivity.toDate();
          } else if (lastActivity._seconds) {
            lastActivityDate = new Date(lastActivity._seconds * 1000);
          }
        }
        
        let authLastSignIn = null;
        try {
          const authUser = await auth.getUser(userId);
          if (authUser.metadata.lastSignInTime) {
            authLastSignIn = new Date(authUser.metadata.lastSignInTime);
          }
        } catch (err) {
          // User might not exist in Auth
        }
        
        const mostRecentActivity = lastActivityDate && authLastSignIn
          ? (lastActivityDate > authLastSignIn ? lastActivityDate : authLastSignIn)
          : (lastActivityDate || authLastSignIn);
        
        if (mostRecentActivity && mostRecentActivity < cutoffDate) {
          usersToDelete.push({ userId, lastActivity: mostRecentActivity.toISOString() });
        }
      }
      
      stats.usersIdentified = usersToDelete.length;
      
      if (dryRun) {
        return res.json({ 
          success: true, 
          dryRun: true, 
          stats,
          usersToDelete: usersToDelete.map(u => ({ id: u.userId, lastActivity: u.lastActivity }))
        });
      }
      
      // Perform deletions
      for (const { userId } of usersToDelete) {
        try {
          const conversationsQuery = db.collection('conversations')
            .where('members', 'array-contains', userId);
          const conversationsSnapshot = await conversationsQuery.get();
          
          for (const convDoc of conversationsSnapshot.docs) {
            const messagesRef = db.collection('conversations').doc(convDoc.id).collection('messages');
            const messagesSnapshot = await messagesRef.get();
            
            const batches = [];
            let currentBatch = db.batch();
            let count = 0;
            
            for (const msgDoc of messagesSnapshot.docs) {
              currentBatch.delete(msgDoc.ref);
              count++;
              stats.messagesDeleted++;
              
              if (count >= 500) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                count = 0;
              }
            }
            
            if (count > 0) {
              batches.push(currentBatch);
            }
            
            for (const batch of batches) {
              await batch.commit();
            }
            
            await convDoc.ref.delete();
            stats.conversationsDeleted++;
          }
          
          await db.collection('users').doc(userId).delete();
          
          try {
            await auth.deleteUser(userId);
          } catch (authError) {
            // Ignore auth errors
          }
          
          stats.usersDeleted++;
        } catch (error) {
          stats.errors.push({ userId, error: error.message });
        }
      }
      
      return res.json({ success: true, stats });
      
    } catch (error) {
      console.error('Manual cleanup error:', error);
      return res.status(500).json({ success: false, error: error.message, stats });
    }
  });

// Clean up deprecated conversations (marked as deprecated by findOrCreateSupporterConversation)
exports.cleanupDeprecatedConversations = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const dryRun = req.query.dryRun !== 'false' && req.query.dryRun !== false; // Default to true for safety
    const daysOld = parseInt(req.query.daysOld || '7', 10); // Only delete if deprecated for 7+ days

    try {
      const db = admin.firestore();
      const stats = {
        found: 0,
        deleted: 0,
        messagesDeleted: 0,
        errors: []
      };

      // Find all deprecated conversations
      const deprecatedQuery = db.collection('conversations')
        .where('deprecated', '==', true);
      
      const deprecatedSnapshot = await deprecatedQuery.get();
      stats.found = deprecatedSnapshot.size;

      console.log(`📋 Found ${stats.found} deprecated conversations`);

      if (deprecatedSnapshot.empty) {
        return res.json({
          success: true,
          message: 'No deprecated conversations found',
          stats
        });
      }

      const now = Date.now();
      const cutoffTime = now - (daysOld * 24 * 60 * 60 * 1000);

      for (const convDoc of deprecatedSnapshot.docs) {
        try {
          const convData = convDoc.data();
          const consolidatedAt = convData.consolidatedAt;
          
          // Check if deprecated long enough
          if (consolidatedAt) {
            const consolidatedTime = consolidatedAt.toMillis ? consolidatedAt.toMillis() : 
                                    (consolidatedAt._seconds * 1000 + (consolidatedAt._nanoseconds || 0) / 1000000);
            
            if (consolidatedTime > cutoffTime) {
              console.log(`⏳ Skipping ${convDoc.id} - deprecated ${Math.round((now - consolidatedTime) / (24 * 60 * 60 * 1000))} days ago (need ${daysOld} days)`);
              continue;
            }
          }

          console.log(`🗑️ Processing deprecated conversation: ${convDoc.id}`);

          if (!dryRun) {
            // Delete all messages
            const messagesRef = convDoc.ref.collection('messages');
            const messagesSnapshot = await messagesRef.get();
            
            const batches = [];
            let currentBatch = db.batch();
            let count = 0;
            
            for (const msgDoc of messagesSnapshot.docs) {
              currentBatch.delete(msgDoc.ref);
              count++;
              stats.messagesDeleted++;
              
              if (count >= 500) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                count = 0;
              }
            }
            
            if (count > 0) {
              batches.push(currentBatch);
            }
            
            for (const batch of batches) {
              await batch.commit();
            }
            
            // Delete the conversation document
            await convDoc.ref.delete();
            stats.deleted++;
            
            console.log(`✅ Deleted deprecated conversation ${convDoc.id} (${messagesSnapshot.size} messages)`);
          } else {
            const messagesSnapshot = await convDoc.ref.collection('messages').get();
            console.log(`[DRY RUN] Would delete ${convDoc.id} (${messagesSnapshot.size} messages)`);
            stats.deleted++;
            stats.messagesDeleted += messagesSnapshot.size;
          }
        } catch (error) {
          console.error(`❌ Error processing ${convDoc.id}:`, error);
          stats.errors.push({ conversationId: convDoc.id, error: error.message });
        }
      }

      return res.json({
        success: true,
        dryRun,
        daysOld,
        stats
      });
      
    } catch (error) {
      console.error('Cleanup deprecated conversations error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });