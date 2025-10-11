// Groq API provider for AI responses
export const generateResponse = async ({ messages, model = 'llama-3.1-8b-instant', max_tokens = 512, temperature = 0.8 }) => {
  // Get API key from environment variable
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  
  if (!apiKey) {
    throw new Error('GROQ API key not configured. Please set VITE_GROQ_API_KEY environment variable.')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens,
      temperature,
      stream: false
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
