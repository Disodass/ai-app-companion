import { generateSupporterPrompt } from './supporterPrompts';
import { getAiReply } from './aiReplyService';
import { getSummaryContext } from './conversationSummaryService';
import { getConversationMemory, getUserMemory } from './memoryService';
import { isCrisisMessage, generateCrisisResponse, analyzeCrisisLevel } from './crisisService';
import { getSupporterById } from '../data/supporters';

let inFlight; // abort previous call if user sends again quickly

export async function generateAndSendAiMessageServer(conversationId, prompt, history, {model='llama-3.1-8b-instant', supporterId='ai-friend', userId} = {}) {
  // CRISIS CHECK FIRST - before any AI generation
  // Check both direct crisis and progressive risk patterns
  const recentUserMessages = (history || [])
    .filter(m => (m.authorId !== 'assistant' && m.meta?.role !== 'ai') || m.sender === 'user')
    .slice(-5); // Last 5 user messages for context
  
  if (isCrisisMessage(prompt)) {
    console.log('🚨 Crisis message detected, providing crisis response');
    const supporter = getSupporterById(supporterId);
    const crisisResponse = await generateCrisisResponse(prompt, supporter, userId, recentUserMessages);
    return crisisResponse;
  }
  
  // Check for progressive risk escalation (e.g., "not feeling well" + "pills")
  const riskLevel = analyzeCrisisLevel(prompt, recentUserMessages);
  if (riskLevel === 'high' || riskLevel === 'escalating') {
    console.log('🚨 Progressive risk escalation detected, providing crisis response');
    const supporter = getSupporterById(supporterId);
    const crisisResponse = await generateCrisisResponse(prompt, supporter, userId, recentUserMessages);
    return crisisResponse;
  }

  // Cancel any in-flight call to prevent overlap / duplicate answers
  if (inFlight) inFlight.abort();
  inFlight = new AbortController();

  // Normalize history -> OpenAI/Groq format WITHOUT duplicating the last user turn
  // First, ensure history is sorted chronologically (oldest to newest) by timestamp
  const sortedHistory = (history || []).slice().sort((a, b) => {
    const timeA = a.timestamp?.getTime?.() || a.createdAt?.toMillis?.() || a.timestamp || 0;
    const timeB = b.timestamp?.getTime?.() || b.createdAt?.toMillis?.() || b.timestamp || 0;
    return timeA - timeB; // Ascending order (oldest first)
  });
  
  console.log(`📚 History: ${history?.length || 0} messages, sorted to ${sortedHistory.length} messages`);
  if (sortedHistory.length > 0) {
    const firstTime = sortedHistory[0].timestamp?.toISOString?.() || sortedHistory[0].createdAt?.toDate?.()?.toISOString() || 'unknown';
    const lastTime = sortedHistory[sortedHistory.length - 1].timestamp?.toISOString?.() || sortedHistory[sortedHistory.length - 1].createdAt?.toDate?.()?.toISOString() || 'unknown';
    console.log(`📅 History time range: ${firstTime} (oldest) to ${lastTime} (newest)`);
  }
  
  const norm = sortedHistory.map(m => ({
    role: (m.authorId === 'assistant' || m.meta?.role === 'ai') ? 'assistant' : 'user',
    content: m.text || ''
  })).filter(m => m.content?.trim());

  // If the last normalized item already equals this prompt as a user message, don't add it again
  const last = norm.at(-1);
  const sameLast = last && last.role === 'user' && last.content.trim() === prompt.trim();
  
  // Load memory (fast access + user memory)
  let memoryContext = '';
  try {
    // Load conversation memory (fast access)
    const conversationMemory = await getConversationMemory(conversationId);
    
    // Load user memory (global facts/preferences)
    const userMemory = userId ? await getUserMemory(userId) : null;
    
    // Build memory context string
    if (conversationMemory) {
      memoryContext += `\n\n## Conversation Memory\n`;
      if (conversationMemory.keyFacts?.length > 0) {
        memoryContext += `Key Facts: ${conversationMemory.keyFacts.join('; ')}\n`;
      }
      if (conversationMemory.preferences?.length > 0) {
        memoryContext += `User Preferences: ${conversationMemory.preferences.join(', ')}\n`;
      }
      if (conversationMemory.keyThemes?.length > 0) {
        memoryContext += `Key Themes: ${conversationMemory.keyThemes.join(', ')}\n`;
      }
    }
    
    if (userMemory) {
      memoryContext += `\n## User Profile Memory\n`;
      if (userMemory.globalFacts?.length > 0) {
        memoryContext += `About User: ${userMemory.globalFacts.slice(0, 5).join('; ')}\n`;
      }
      if (userMemory.preferences?.length > 0) {
        memoryContext += `General Preferences: ${userMemory.preferences.slice(0, 5).join(', ')}\n`;
      }
    }
  } catch (error) {
    console.warn('Failed to load memory context:', error);
    // Continue without memory if it fails to load
  }
  
  // Get summary context for long-term memory (detailed summaries)
  let summaryContext = '';
  try {
    summaryContext = await getSummaryContext(conversationId, 3);
  } catch (error) {
    console.warn('Failed to load summary context:', error);
    // Continue without summaries if they fail to load
  }
  
  // Generate supporter-specific system prompt, enhanced with memory and summary context
  let systemPrompt = generateSupporterPrompt(supporterId);
  
  if (memoryContext) {
    systemPrompt += memoryContext;
  }
  
  if (summaryContext) {
    systemPrompt += `\n\n## Previous Conversation Summaries\n${summaryContext}\n\nUse this context to maintain continuity and remember important details from past conversations.`;
  }
  
  // For Supporter Friend, add identity reminder
  if (supporterId === 'ai-friend') {
    systemPrompt += `\n\n💬 CRITICAL REMINDER: Friend first, Supporter second, Guide third. You are Supporter Friend - a human friend. NEVER mention being an AI, a language model, or that you don't have feelings. Keep responses short (2-3 sentences) unless they explicitly ask for detail.`;
  }
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...norm.slice(-40),           // increased from 20 to 40 messages for better context
    ...(sameLast ? [] : [{ role: 'user', content: prompt }])
  ];

  try {
    // Call Groq API via Cloud Function (server-side)
    // For Supporter Friend, use moderate max_tokens to allow complete responses while prompt encourages brevity
    const maxTokens = supporterId === 'ai-friend' ? 400 : undefined; // Allows complete responses, prompt still encourages 2-3 sentences
    const temperature = supporterId === 'ai-friend' ? 0.2 : 0.6; // Lower temperature (0.2) for better instruction following
    const data = await getAiReply({
      model,
      messages,
      temperature,
      ...(maxTokens && { max_tokens: maxTokens })
    });
    
    const text = data?.choices?.[0]?.message?.content?.trim() || '…';
    inFlight = undefined;
    return text;
  } catch (error) {
    inFlight = undefined;
    throw new Error(`Groq API error: ${error.message}`);
  }
}
