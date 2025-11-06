// Groq API provider for AI responses (now using server-side Cloud Function)
import { getAiReply } from '../services/aiReplyService';

export const generateResponse = async ({ messages, model = 'llama-3.1-8b-instant', max_tokens = 512, temperature = 0.8 }) => {
  try {
    const data = await getAiReply({
      model,
      messages,
      max_tokens,
      temperature,
      stream: false
    });
    
    return data.choices[0].message.content;
  } catch (error) {
    throw new Error(`Groq API error: ${error.message}`);
  }
}
