import { isCrisisMessage, generateCrisisResponse } from './crisisService'
import { generateResponse } from '../providers/groq'
import { safeLength, normalizeHistory } from '../utils/normalize'
import { trackFallback, trackResponseTime } from '../utils/telemetry'

// Context limits for token efficiency
const MAX_RECENT_TURNS = 25

// Retry logic for AI calls
const retryWithBackoff = async (fn, maxRetries = 2, baseDelay = 500) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1} in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Generate AI response using Groq API (simplified version)
export const generateAIResponse = async (userMessage, conversationHistory, supporterType, userId, conversationId) => {
  const startTime = Date.now()
  
  try {
    console.log('🤖 Starting AI response...')
    console.log('📊 Input parameters:', {
      userMessage: userMessage.substring(0, 100) + '...',
      conversationLength: conversationHistory.length,
      supporterType,
      userId: userId ? 'provided' : 'none',
      conversationId: conversationId || 'none'
    })

    // Check for crisis message first
    if (isCrisisMessage(userMessage)) {
      console.log('🚨 Crisis message detected, providing crisis response')
      return generateCrisisResponse(userMessage, { id: supporterType })
    }

    // Normalize conversation history
    const normalizedHistory = normalizeHistory(conversationHistory)
    const histLen = safeLength(normalizedHistory)
    console.log('📚 Normalized conversation history length:', histLen)

    // Simple system prompt
    const systemPrompt = `You are a supportive AI friend in the Bestibule app. Be helpful, friendly, and supportive. Keep responses conversational and natural.

Recent conversation:
${normalizedHistory.slice(-10).map((msg, i) => 
  `${i + 1}. ${msg.sender || msg.role}: ${msg.text || msg.content}`
).join('\n')}

Respond helpfully and supportively.`

    console.log('📝 System prompt length:', systemPrompt.length)

    // Build messages array with debug logging
    const messagesArray = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
    
    console.log('🔍 DEBUG messages array:', messagesArray)

    // Generate response with retry logic
    const response = await retryWithBackoff(async () => {
      console.log('🔄 Calling generateResponse with:', {
        messageCount: messagesArray.length,
        max_tokens: 512,
        temperature: 0.8
      })
      
      return await generateResponse({
        messages: messagesArray,
        model: 'llama-3.1-8b-instant',
        max_tokens: 512,
        temperature: 0.8
      })
    })

    const responseTime = Date.now() - startTime
    console.log('✅ AI response received:', {
      length: response.length,
      preview: response.substring(0, 100) + '...'
    })
    console.log('⏱️ Response time:', responseTime + 'ms')

    // Track response time
    trackResponseTime(responseTime, supporterType)

    return response

  } catch (error) {
    console.error('❌ Error in generateAIResponse:', error)
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    // Track fallback usage
    trackFallback('ai_response_error', { supporterType, error: error.message })

    // Return a helpful error message
    return 'I apologize, but I\'m having trouble processing your message right now. Please try again in a moment.'
  }
}
