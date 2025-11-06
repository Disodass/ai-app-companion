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