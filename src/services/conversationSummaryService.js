import { collection, query, where, orderBy, limit, getDocs, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAiReply } from "./aiReplyService";

/**
 * Generate a summary for a conversation segment
 * @param {string} conversationId - The conversation ID
 * @param {Array} messages - Array of message objects with text, authorId, createdAt
 * @param {string} startMessageId - First message ID in this segment
 * @param {string} endMessageId - Last message ID in this segment
 * @returns {Promise<Object>} Summary object with keyThemes, importantFacts, summaryText
 */
export async function generateConversationSummary(conversationId, messages, startMessageId, endMessageId) {
  if (!messages || messages.length === 0) {
    throw new Error('No messages provided for summary');
  }

  // Format messages for AI
  const conversationText = messages.map((msg, idx) => {
    const role = msg.authorId === 'assistant' ? 'AI' : 'User';
    const text = msg.text || '';
    return `${idx + 1}. [${role}]: ${text}`;
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

  try {
    const data = await getAiReply({
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
    });

    const responseText = data?.choices?.[0]?.message?.content?.trim() || '{}';
    
    // Try to parse JSON (handle cases where AI wraps it in markdown)
    let summaryData;
    try {
      // Remove markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      summaryData = JSON.parse(cleaned);
    } catch (e) {
      // Fallback: extract structured data from text
      console.warn('Failed to parse JSON summary, using fallback parsing');
      summaryData = {
        keyThemes: extractArray(responseText, 'keyThemes', 'themes'),
        importantFacts: extractArray(responseText, 'importantFacts', 'facts'),
        userPreferences: extractArray(responseText, 'userPreferences', 'preferences'),
        summaryText: extractText(responseText, 'summaryText', 'summary'),
        emotionalTone: extractText(responseText, 'emotionalTone', 'tone') || 'neutral'
      };
    }

    // Ensure arrays are arrays
    const keyThemes = Array.isArray(summaryData.keyThemes) ? summaryData.keyThemes : [];
    const importantFacts = Array.isArray(summaryData.importantFacts) ? summaryData.importantFacts : [];
    const userPreferences = Array.isArray(summaryData.userPreferences) ? summaryData.userPreferences : [];
    const summaryText = summaryData.summaryText || 'No summary available';
    const emotionalTone = summaryData.emotionalTone || 'neutral';

    return {
      startMessageId,
      endMessageId,
      messageCount: messages.length,
      keyThemes: keyThemes.slice(0, 5), // Limit to 5
      importantFacts: importantFacts.slice(0, 7), // Limit to 7
      userPreferences: userPreferences.slice(0, 5), // Limit to 5
      summaryText,
      emotionalTone,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    // Return a basic fallback summary
    return {
      startMessageId,
      endMessageId,
      messageCount: messages.length,
      keyThemes: [],
      importantFacts: [],
      userPreferences: [],
      summaryText: `Conversation segment with ${messages.length} messages`,
      emotionalTone: 'neutral',
      createdAt: new Date()
    };
  }
}

/**
 * Save a summary to Firestore
 * @param {string} conversationId - The conversation ID
 * @param {Object} summaryData - Summary data from generateConversationSummary
 * @returns {Promise<string>} Summary document ID
 */
export async function saveConversationSummary(conversationId, summaryData) {
  const summariesRef = collection(db, "conversations", conversationId, "summaries");
  
  const summaryDoc = {
    ...summaryData,
    createdAt: serverTimestamp(),
    dateRange: {
      start: summaryData.dateRange?.start || serverTimestamp(),
      end: summaryData.dateRange?.end || serverTimestamp()
    }
  };

  const docRef = await addDoc(summariesRef, summaryDoc);
  return docRef.id;
}

/**
 * Get all summaries for a conversation, ordered by creation date (newest first)
 * @param {string} conversationId - The conversation ID
 * @param {number} limitCount - Maximum number of summaries to return
 * @returns {Promise<Array>} Array of summary documents
 */
export async function getConversationSummaries(conversationId, limitCount = 10) {
  try {
    const summariesRef = collection(db, "conversations", conversationId, "summaries");
    const q = query(summariesRef, orderBy("createdAt", "desc"), limit(limitCount));
    
    const snapshot = await getDocs(q);
    console.log(`📊 Found ${snapshot.size} summaries for conversation ${conversationId}`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`❌ Error loading summaries for ${conversationId}:`, error);
    // Return empty array instead of throwing - allows chat to continue
    return [];
  }
}

/**
 * Get summary context for AI - returns formatted summaries for inclusion in prompts
 * @param {string} conversationId - The conversation ID
 * @param {number} maxSummaries - Maximum number of summaries to include (default: 3)
 * @returns {Promise<string>} Formatted summary text for AI context
 */
export async function getSummaryContext(conversationId, maxSummaries = 3) {
  try {
    const summaries = await getConversationSummaries(conversationId, maxSummaries);
    
    if (summaries.length === 0) {
      console.log(`⚠️ No summaries found for conversation ${conversationId}`);
      return '';
    }

    console.log(`✅ Loaded ${summaries.length} summaries for context`);
    
    return summaries.map((summary, idx) => {
      const themes = summary.keyThemes?.length > 0 ? `Themes: ${summary.keyThemes.join(', ')}` : '';
      const facts = summary.importantFacts?.length > 0 ? `Facts: ${summary.importantFacts.join('; ')}` : '';
      const prefs = summary.userPreferences?.length > 0 ? `Preferences: ${summary.userPreferences.join(', ')}` : '';
      
      return `[Previous Conversation Summary ${idx + 1}]
${summary.summaryText || 'No summary text'}
${themes ? themes + '\n' : ''}${facts ? facts + '\n' : ''}${prefs ? prefs + '\n' : ''}`;
    }).join('\n\n');
  } catch (error) {
    console.error(`❌ Error getting summary context:`, error);
    return '';
  }
}

// Helper functions for fallback parsing
function extractArray(text, fieldName, alternativeName) {
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*\\[([^\\]]+)\\]`, 'i');
  const match = text.match(regex);
  if (match) {
    try {
      return JSON.parse(`[${match[1]}]`);
    } catch (e) {
      return match[1].split(',').map(s => s.trim().replace(/["']/g, ''));
    }
  }
  return [];
}

function extractText(text, fieldName, alternativeName) {
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]+)"`, 'i');
  const match = text.match(regex);
  if (match) {
    return match[1];
  }
  // Try alternative format
  const altRegex = new RegExp(`${alternativeName}[\\s:]+([^\\n]+)`, 'i');
  const altMatch = text.match(altRegex);
  return altMatch ? altMatch[1].trim() : '';
}

