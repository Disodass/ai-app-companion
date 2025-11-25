// AI-powered blog post generator using Groq
import { generateResponse } from '../providers/groq'
import { getSupporterById } from '../data/supporters'

/**
 * Generate a blog post using AI based on supporter personality
 */
export async function generateAIBlogPost(supporterId, topic, format = 'random', continueFromPost = null) {
  const supporter = getSupporterById(supporterId)
  
  if (!supporter) {
    throw new Error('Supporter not found')
  }
  
  // Create a default voice guide if missing
  const voiceGuide = supporter.voiceGuide || {
    tone: 'Supportive and helpful',
    linguisticTics: ['I understand', 'Let\'s explore this', 'What I\'m noticing is', 'How does this feel for you?'],
    boundaries: 'Supportive companion focused on your wellbeing',
    openingMoves: ['What\'s on your mind today?', 'How are you feeling about this?', 'What would be most helpful to explore?'],
    closers: ['What feels most important right now?', 'How can I best support you?', 'What\'s one thing you could try?'],
    blogStyle: 'Warm, accessible writing that offers gentle insights and practical support'
  }
  
  // Choose format if random
  const selectedFormat = format === 'random' 
    ? selectRandomFormat() 
    : format

  // Build the prompt based on format
  const prompt = buildPrompt(supporter, topic, selectedFormat, voiceGuide, continueFromPost)
  
  // Generate the blog post using Groq AI
  try {
    const content = await generateResponse({
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(supporter, voiceGuide)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      temperature: 0.8
    })

    // Extract title and content from AI response
    const { title, body } = parseAIResponse(content, topic)
    
    // Count words
    const wordCount = body.split(/\s+/).length

    // Generate excerpt (first 2-3 sentences)
    const excerpt = generateExcerpt(body)
    
    return {
      title,
      content: body,
      excerpt,
      format: selectedFormat,
      wordCount,
      supporterId: supporter.id,
      supporterName: supporter.name,
      tags: generateTags(topic, selectedFormat, supporter),
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error generating AI blog post:', error)
    throw error
  }
}

/**
 * Build system prompt based on supporter personality
 */
function buildSystemPrompt(supporter, voiceGuide) {
  return `You are ${supporter.name}, an AI Supporter on Bestibule. Your role is to write blog posts that help people with ${supporter.description}.

VOICE & TONE:
${voiceGuide.tone}

YOUR LINGUISTIC STYLE:
Use phrases like: ${voiceGuide.linguisticTics.join(', ')}

BLOG WRITING STYLE:
${voiceGuide.blogStyle || 'Write in a warm, accessible way that reflects your personality'}

BOUNDARIES:
${voiceGuide.boundaries}

IMPORTANT:
- Write in first person ("I") as ${supporter.name}
- Be authentic to your personality
- Keep posts between 400-600 words
- Make it practical and grounded
- Always end with a gentle question or invitation for reflection
- Format with clear paragraphs (use \\n\\n for paragraph breaks)
- Start your response with a title on the first line, then a blank line, then the content`
}

/**
 * Build the specific prompt for the blog post
 */
function buildPrompt(supporter, topic, format, voiceGuide, continueFromPost = null) {
  const formatPrompts = {
    reflection: `Write a reflective blog post about "${topic}". Share your thoughts on why this matters, what you've noticed, and invite readers to reflect on their own experience with ${topic}.`,
    
    practical: `Write a practical, action-oriented blog post about "${topic}". Give 3-5 concrete steps or tips that readers can actually use. Make it doable and real.`,
    
    story: `Write a story-based blog post about "${topic}". Share a narrative or example that illustrates an important insight about ${topic}. Make it relatable and human.`,
    
    question: `Write a blog post about "${topic}" that centers around powerful questions. Ask 4-6 thoughtful questions that help readers explore ${topic} in a new way.`,
    
    list: `Write a list-style blog post: "5 Things I've Learned About ${topic}". Make each point specific and meaningful, drawing on your personality as ${supporter.name}.`
  }

  let basePrompt = formatPrompts[format] || formatPrompts.reflection

  // If continuing from a previous post, modify the prompt
  if (continueFromPost) {
    const previousTitle = continueFromPost.title
    const previousExcerpt = continueFromPost.excerpt
    
    basePrompt = `Write a follow-up blog post that continues the conversation from your previous post "${previousTitle}". 

Your previous post was about: ${previousExcerpt}

Now write a new post about "${topic}" that builds on this previous work. You could:
- Expand on a specific aspect you mentioned before
- Share new insights or developments since then  
- Address questions that might have come up
- Take the topic in a new but related direction

Make it feel like a natural continuation of your ongoing conversation with readers, not a completely separate topic.`
  }

  return basePrompt
}

/**
 * Parse AI response to extract title and body
 */
function parseAIResponse(response, fallbackTopic) {
  const lines = response.trim().split('\n')
  
  // First non-empty line is the title
  let title = lines.find(line => line.trim().length > 0)
  
  // Remove markdown headers if present
  if (title) {
    title = title.replace(/^#+\s*/, '').trim()
  }
  
  // Everything after the first paragraph break is the body
  const titleEndIndex = response.indexOf('\n\n')
  const body = titleEndIndex > -1 
    ? response.substring(titleEndIndex).trim() 
    : response.trim()
  
  // Fallback title if needed
  if (!title || title.length < 5) {
    title = `Reflections on ${fallbackTopic}`
  }
  
  return { title, body }
}

/**
 * Generate excerpt from blog post content
 */
function generateExcerpt(content) {
  // Get first 2-3 sentences
  const sentences = content.match(/[^\.!\?]+[\.!\?]+/g) || []
  const excerpt = sentences.slice(0, 2).join(' ').trim()
  
  // Limit to ~150 characters
  if (excerpt.length > 150) {
    return excerpt.substring(0, 147) + '...'
  }
  
  return excerpt
}

/**
 * Generate tags based on topic and format
 */
function generateTags(topic, format, supporter) {
  const tags = [
    topic.toLowerCase().replace(/\s+/g, '-'),
    format,
    supporter.id
  ]
  
  // Add relevant supporter tags if available
  if (supporter.tags) {
    tags.push(...supporter.tags.slice(0, 2))
  }
  
  return [...new Set(tags)] // Remove duplicates
}

/**
 * Select a random format
 */
function selectRandomFormat() {
  const formats = ['reflection', 'practical', 'story', 'question', 'list']
  return formats[Math.floor(Math.random() * formats.length)]
}

/**
 * Generate multiple blog post ideas for a supporter
 */
export async function generateBlogIdeas(supporterId, count = 5) {
  const supporter = getSupporterById(supporterId)
  
  if (!supporter) {
    throw new Error('Supporter not found')
  }

  const prompt = `As ${supporter.name}, suggest ${count} specific blog post topics that would be helpful for people interested in ${supporter.description}. List only the topics, one per line.`

  try {
    const response = await generateResponse({
      messages: [
        {
          role: 'system',
          content: `You are ${supporter.name}. Suggest blog topics in your area of expertise.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 256,
      temperature: 0.9
    })

    // Parse topics from response
    const topics = response
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, count)

    return topics
  } catch (error) {
    console.error('Error generating blog ideas:', error)
    throw error
  }
}

