// Node 20 runtime (CommonJS)
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { defineSecret } = require("firebase-functions/params");
admin.initializeApp();

const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

// Callable: generate AI text with Groq and write it as authorId "assistant"
exports.generateAndSendGroqMessage = functions
  .region("us-central1")
  .runWith({ secrets: [GROQ_API_KEY] })
  .https.onCall(async (data, context) => {
    const { conversationId, prompt, history = [] } = data || {};
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
    if (!conversationId || !prompt) {
      throw new functions.https.HttpsError("invalid-argument", "conversationId and prompt are required.");
    }

    const db = admin.firestore();
    const convRef = db.collection("conversations").doc(conversationId);
    const snap = await convRef.get();
    if (!snap.exists) throw new functions.https.HttpsError("not-found", "Conversation not found.");
    const members = snap.get("members") || [];
    if (!members.includes(uid)) {
      throw new functions.https.HttpsError("permission-denied", "Not a member of this conversation.");
    }

    // Build OpenAI-compatible messages for Groq
    const messages = [
      { role: "system", content: "You are a supportive, concise coach." },
      ...history.slice(-10).map(m => ({
        role: m.meta?.role === "ai" ? "assistant" : "user",
        content: m.text || ""
      })),
      { role: "user", content: prompt }
    ];

    // Call Groq (OpenAI-compatible endpoint)
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY.value()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",   // Using the faster model
        messages,
        temperature: 0.6
      })
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new functions.https.HttpsError("internal", `Groq error ${resp.status}: ${text}`);
    }
    const json = await resp.json();
    const aiText = json?.choices?.[0]?.message?.content?.trim() || "…";

    // Write AI message as authorId "assistant"
    const msgRef = await convRef.collection("messages").add({
      text: aiText,
      authorId: "assistant",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "sent",
      meta: { role: "ai" }
    });

    await convRef.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: {
        text: aiText,
        authorId: "assistant",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    return { messageId: msgRef.id, text: aiText };
  });
