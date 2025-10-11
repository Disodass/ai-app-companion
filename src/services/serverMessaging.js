// Replace the whole file with this
import { generateSupporterPrompt } from './supporterPrompts';

let inFlight; // abort previous call if user sends again quickly

export async function generateAndSendAiMessageServer(conversationId, prompt, history, {model='llama-3.1-8b-instant', supporterId='ai-friend'} = {}) {
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
  // Generate supporter-specific system prompt
  const systemPrompt = generateSupporterPrompt(supporterId);
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...norm.slice(-20),           // keep context tight
    ...(sameLast ? [] : [{ role: 'user', content: prompt }])
  ];

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ API key not configured. Please set VITE_GROQ_API_KEY environment variable.');
  }

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: inFlight.signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, temperature: 0.6 })
  });

  if (!resp.ok) throw new Error(`Groq API error: ${resp.status}`);
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || '…';
  inFlight = undefined;
  return text;
}
