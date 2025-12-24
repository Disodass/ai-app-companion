/**
 * Cloud-Based Memory Service
 * 
 * Handles all memory operations - summaries, conversation memory, user memory.
 * All memory is stored in Firestore and works across devices.
 * 
 * Architecture:
 * 1. conversations/{convId}/summaries - Detailed summaries (every 50 messages)
 * 2. conversation_memory/{convId} - Fast-access memory for a conversation
 * 3. users/{userId}/memory - User-level aggregated memory across all conversations
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  getDocs,
  orderBy,
  limit
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { 
  generateConversationSummary, 
  saveConversationSummary,
  getConversationSummaries 
} from "./conversationSummaryService";

/**
 * Update conversation_memory document with latest facts
 * This is the fast-access memory for a conversation
 */
export async function updateConversationMemory(conversationId, summaryData) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Extract conversation ID parts
    const parts = conversationId.split('_');
    const supporterId = parts.length >= 3 ? parts.slice(2).join('_') : 'unknown';

    const memoryRef = doc(db, "conversation_memory", conversationId);
    
    // Get existing memory to merge preferences
    const existingMemory = await getDoc(memoryRef);
    const existingData = existingMemory.exists() ? existingMemory.data() : {};

    // Merge preferences (don't lose old ones)
    const existingPrefs = existingData.preferences || [];
    const newPrefs = summaryData.userPreferences || [];
    const mergedPrefs = [...existingPrefs, ...newPrefs]
      .filter((v, i, a) => a.indexOf(v) === i); // Dedupe

    const memoryDoc = {
      userId,
      supporterId,
      conversationId,
      
      // Latest facts from this summary
      keyFacts: summaryData.importantFacts || [],
      preferences: mergedPrefs,
      keyThemes: summaryData.keyThemes || [],
      emotionalTone: summaryData.emotionalTone || 'neutral',
      
      // Metadata
      lastSummaryAt: serverTimestamp(),
      lastSummaryMessageId: summaryData.endMessageId,
      messageCount: summaryData.messageCount || 0,
      
      updatedAt: serverTimestamp()
    };

    await setDoc(memoryRef, memoryDoc, { merge: true });
    console.log(`✅ Updated conversation_memory for ${conversationId}`);
    
    return memoryDoc;
  } catch (error) {
    console.error(`❌ Error updating conversation_memory:`, error);
    throw error;
  }
}

/**
 * Get conversation memory (fast access)
 */
export async function getConversationMemory(conversationId) {
  try {
    const memoryRef = doc(db, "conversation_memory", conversationId);
    const memorySnap = await getDoc(memoryRef);
    
    if (!memorySnap.exists()) {
      return null;
    }
    
    return {
      id: memorySnap.id,
      ...memorySnap.data()
    };
  } catch (error) {
    console.error(`❌ Error getting conversation_memory:`, error);
    return null;
  }
}

/**
 * Update user-level memory (aggregated across all conversations)
 */
export async function updateUserMemory(userId, conversationId, summaryData) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    // Get existing memory or create new
    const existingMemory = userData.memory || {
      globalFacts: [],
      preferences: [],
      conversationSummaries: {}
    };

    // Extract conversation parts
    const parts = conversationId.split('_');
    const supporterId = parts.length >= 3 ? parts.slice(2).join('_') : 'unknown';

    // Update conversation-specific summary
    existingMemory.conversationSummaries = existingMemory.conversationSummaries || {};
    existingMemory.conversationSummaries[conversationId] = {
      supporterId,
      lastSummaryAt: serverTimestamp(),
      keyFacts: summaryData.importantFacts || [],
      preferences: summaryData.userPreferences || [],
      messageCount: summaryData.messageCount || 0
    };

    // Merge global facts (dedupe)
    const newFacts = summaryData.importantFacts || [];
    existingMemory.globalFacts = [
      ...existingMemory.globalFacts,
      ...newFacts
    ].filter((v, i, a) => a.indexOf(v) === i); // Dedupe

    // Merge preferences (dedupe)
    const newPrefs = summaryData.userPreferences || [];
    existingMemory.preferences = [
      ...existingMemory.preferences,
      ...newPrefs
    ].filter((v, i, a) => a.indexOf(v) === i); // Dedupe

    // Update user document
    await updateDoc(userRef, {
      memory: existingMemory,
      memoryUpdatedAt: serverTimestamp()
    });

    console.log(`✅ Updated user memory for ${userId}`);
    return existingMemory;
  } catch (error) {
    console.error(`❌ Error updating user memory:`, error);
    throw error;
  }
}

/**
 * Get user memory (loads on login)
 */
export async function getUserMemory(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return {
        globalFacts: [],
        preferences: [],
        conversationSummaries: {}
      };
    }
    
    const userData = userSnap.data();
    return userData.memory || {
      globalFacts: [],
      preferences: [],
      conversationSummaries: {}
    };
  } catch (error) {
    console.error(`❌ Error getting user memory:`, error);
    return {
      globalFacts: [],
      preferences: [],
      conversationSummaries: {}
    };
  }
}

/**
 * Check if conversation needs summarization
 * Returns true if 50+ messages since last summary
 */
export async function shouldSummarizeConversation(conversationId, currentMessageCount) {
  try {
    // Check last summary
    const summaries = await getConversationSummaries(conversationId, 1);
    
    if (summaries.length === 0) {
      // No summaries yet - summarize if we have 50+ messages
      return currentMessageCount >= 50;
    }
    
    // Get last summary's message count
    const lastSummary = summaries[0];
    const messagesSinceLastSummary = currentMessageCount - (lastSummary.messageCount || 0);
    
    // Summarize if 50+ new messages since last summary
    return messagesSinceLastSummary >= 50;
  } catch (error) {
    console.error(`❌ Error checking if should summarize:`, error);
    return false;
  }
}

/**
 * Auto-summarize conversation (called after messages are sent)
 * This is the main function that orchestrates the memory system
 */
export async function autoSummarizeConversation(conversationId, messages) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.warn('⚠️ Cannot summarize: user not authenticated');
      return;
    }

    // Get message count
    const messageCount = messages.length;
    
    // Check if we should summarize
    const shouldSummarize = await shouldSummarizeConversation(conversationId, messageCount);
    
    if (!shouldSummarize) {
      console.log(`📊 Conversation ${conversationId} has ${messageCount} messages, no summary needed yet`);
      return;
    }

    console.log(`📊 Auto-summarizing conversation ${conversationId} (${messageCount} messages)`);

    // Get last summary to know where to start
    const lastSummaries = await getConversationSummaries(conversationId, 1);
    const lastSummary = lastSummaries[0];
    
    // Get messages since last summary (or all messages if no summary)
    const startIndex = lastSummary ? 
      messages.findIndex(m => m.id === lastSummary.endMessageId) + 1 : 0;
    const messagesToSummarize = messages.slice(startIndex);
    
    if (messagesToSummarize.length === 0) {
      console.log('⚠️ No new messages to summarize');
      return;
    }

    // Generate summary
    const summaryData = await generateConversationSummary(
      conversationId,
      messagesToSummarize,
      messagesToSummarize[0]?.id || 'start',
      messagesToSummarize[messagesToSummarize.length - 1]?.id || 'end'
    );

    // Save detailed summary to subcollection
    await saveConversationSummary(conversationId, summaryData);

    // Update fast-access conversation_memory
    await updateConversationMemory(conversationId, summaryData);

    // Update user-level aggregated memory
    await updateUserMemory(userId, conversationId, summaryData);

    console.log(`✅ Auto-summarization complete for ${conversationId}`);
    
    return summaryData;
  } catch (error) {
    console.error(`❌ Error in auto-summarize:`, error);
    // Don't throw - summarization is non-critical
  }
}

/**
 * Load all memory for a conversation (called on chat open)
 * Returns both detailed summaries and fast-access memory
 */
export async function loadConversationMemory(conversationId) {
  try {
    // Load fast-access memory
    const fastMemory = await getConversationMemory(conversationId);
    
    // Load detailed summaries (for context)
    const summaries = await getConversationSummaries(conversationId, 3);
    
    return {
      fastMemory,
      summaries
    };
  } catch (error) {
    console.error(`❌ Error loading conversation memory:`, error);
    return {
      fastMemory: null,
      summaries: []
    };
  }
}

