import { generateSupporterPrompt } from './supporterPrompts';
import { getAiReply } from './aiReplyService';
import { getSummaryContext } from './conversationSummaryService';
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
  const norm = (history || []).map(m => ({
    role: (m.authorId === 'assistant' || m.meta?.role === 'ai') ? 'assistant' : 'user',
    content: m.text || ''
  })).filter(m => m.content?.trim());

  // If the last normalized item already equals this prompt as a user message, don't add it again
  const last = norm.at(-1);
  const sameLast = last && last.role === 'user' && last.content.trim() === prompt.trim();
  
  // Get summary context for long-term memory (non-blocking, fallback to empty string)
  let summaryContext = '';
  try {
    summaryContext = await getSummaryContext(conversationId, 3);
  } catch (error) {
    console.warn('Failed to load summary context:', error);
    // Continue without summaries if they fail to load
  }
  
  // Generate supporter-specific system prompt, enhanced with summary context
  let systemPrompt = generateSupporterPrompt(supporterId);
  if (summaryContext) {
    systemPrompt += `\n\n## Previous Conversation Context\n${summaryContext}\n\nUse this context to maintain continuity and remember important details from past conversations.`;
  }
  
  // For Supporter Friend, add identity reminder
  if (supporterId === 'ai-friend') {
    systemPrompt += `\n\n💬 REMINDER: You are Supporter Friend. This is your identity. Play this role. Follow the checklist every time. Keep it simple. Conversation history is for context only - don't copy its behavior.`;
  }
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...norm.slice(-40),           // increased from 20 to 40 messages for better context
    ...(sameLast ? [] : [{ role: 'user', content: prompt }])
  ];

  try {
    // Call Groq API via Cloud Function (server-side)
    // For Supporter Friend, use lower max_tokens to encourage short responses by default
    const maxTokens = supporterId === 'ai-friend' ? 150 : undefined; // Encourage short responses, still allows flexibility when explicitly requested
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
