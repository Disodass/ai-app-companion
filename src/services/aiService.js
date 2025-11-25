// Real AI service using OpenAI API
export class AIService {
  static async generateResponse(message, supporterName) {
    try {
      // Get OpenAI API key from environment
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      
      if (!apiKey) {
        throw new Error('OpenAI API key not found')
      }

      // Define supporter personalities for real AI
      const supporterPrompts = {
        'Supporter Friend': "You are a supportive friend who listens with empathy and offers gentle guidance. Be warm, understanding, and encouraging.",
        'Life Coach': "You are a professional life coach who helps people set goals, overcome challenges, and create actionable plans for personal growth.",
        'Career Coach': "You are a career coach who specializes in professional development, job searching, skill building, and career advancement strategies.",
        'Productivity Coach': "You are a productivity coach who helps people optimize their workflow, manage time effectively, and build sustainable systems for success.",
        'Executive Coach': "You are an executive coach who works with leaders on strategic thinking, team management, decision-making, and professional development.",
        'Creativity Coach': "You are a creativity coach who helps people unlock their artistic potential, overcome creative blocks, and develop their creative skills."
      }

      const systemPrompt = supporterPrompts[supporterName] || supporterPrompts['Supporter Friend']

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0].message.content

      return {
        text: aiResponse,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('AI Service Error:', error)
      
      // Fallback responses based on supporter type
      const fallbackResponses = {
        'Supporter Friend': "I'm here to listen and support you. Could you tell me more about what's on your mind?",
        'Life Coach': "Let's work together to create a plan that moves you forward. What's your main goal?",
        'Career Coach': "I can help you navigate your career path. What direction interests you most?",
        'Productivity Coach': "Let's optimize your workflow together. What's your biggest productivity challenge?",
        'Executive Coach': "Let's work on your leadership development. What's your current challenge?",
        'Creativity Coach': "Let's explore your creative process together. What's inspiring you lately?"
      }

      return {
        text: fallbackResponses[supporterName] || fallbackResponses['Supporter Friend'],
        timestamp: new Date()
      }
    }
  }
}
