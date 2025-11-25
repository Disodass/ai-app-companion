import { getPublishedPosts } from './blogService'
import { generateResponse } from '../providers/groq'
import { getSupporterById } from '../data/supporters'

/**
 * Get published posts from the last week (Monday to Friday)
 */
export async function getLastWeekPosts() {
  try {
    const allPosts = await getPublishedPosts()
    
    // Calculate date range for last week (Monday to Friday)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate the Friday of last week
    const lastFriday = new Date(today)
    lastFriday.setDate(today.getDate() - (dayOfWeek === 0 ? 2 : dayOfWeek + 2))
    lastFriday.setHours(23, 59, 59, 999)
    
    // Calculate the Monday of last week
    const lastMonday = new Date(lastFriday)
    lastMonday.setDate(lastFriday.getDate() - 4)
    lastMonday.setHours(0, 0, 0, 0)
    
    // Filter posts from last week
    const lastWeekPosts = allPosts.filter(post => {
      const postDate = post.publishedAt?.toDate()
      return postDate && postDate >= lastMonday && postDate <= lastFriday
    })
    
    return lastWeekPosts.sort((a, b) => a.publishedAt?.toDate() - b.publishedAt?.toDate())
  } catch (error) {
    console.error('Error getting last week posts:', error)
    throw error
  }
}

/**
 * Get published posts from this coming week (Monday to Friday)
 */
export async function getThisWeekPosts() {
  try {
    const allPosts = await getPublishedPosts()
    
    // Calculate date range for this week (Monday to Friday)
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate the Monday of this week
    const thisMonday = new Date(today)
    thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    thisMonday.setHours(0, 0, 0, 0)
    
    // Calculate the Friday of this week
    const thisFriday = new Date(thisMonday)
    thisFriday.setDate(thisMonday.getDate() + 4)
    thisFriday.setHours(23, 59, 59, 999)
    
    // Filter posts from this week
    const thisWeekPosts = allPosts.filter(post => {
      const postDate = post.publishedAt?.toDate()
      return postDate && postDate >= thisMonday && postDate <= thisFriday
    })
    
    return thisWeekPosts.sort((a, b) => a.publishedAt?.toDate() - b.publishedAt?.toDate())
  } catch (error) {
    console.error('Error getting this week posts:', error)
    throw error
  }
}

/**
 * Generate a weekly summary using AI Friend
 */
export async function generateWeeklySummary(posts, summaryType = 'recap') {
  try {
    if (posts.length === 0) {
      throw new Error('No posts to summarize')
    }

    // Get AI Friend supporter
    const aiFriend = getSupporterById('ai-friend')
    if (!aiFriend) {
      throw new Error('AI Friend supporter not found')
    }

    // Build the summary prompt
    const prompt = buildSummaryPrompt(posts, summaryType, aiFriend)
    
    // Generate the summary using Groq AI
    const content = await generateResponse({
      messages: [
        {
          role: 'system',
          content: buildSummarySystemPrompt(aiFriend)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      temperature: 0.7
    })

    // Parse the AI response
    const parsedContent = parseSummaryResponse(content, posts, summaryType)
    
    return parsedContent
  } catch (error) {
    console.error('Error generating weekly summary:', error)
    throw error
  }
}

/**
 * Build the system prompt for AI Friend
 */
function buildSummarySystemPrompt(aiFriend) {
  return `You are ${aiFriend.name}, ${aiFriend.description}. 

${aiFriend.voice}

Your voice guide:
- Tone: ${aiFriend.voiceGuide?.tone || 'Friendly and supportive'}
- Linguistic tics: ${aiFriend.voiceGuide?.linguisticTics?.join(', ') || 'I notice, What I love about this, Let me share'}
- Boundaries: ${aiFriend.voiceGuide?.boundaries || 'Supportive companion focused on connection and reflection'}

For weekly summaries, write in a warm, conversational style that:
- Celebrates the diverse voices and insights shared
- Connects themes across different posts
- Invites readers to reflect on their own experiences
- Maintains an encouraging, supportive tone
- Uses first person ("I", "we") to create connection`
}

/**
 * Build the specific prompt for the summary
 */
function buildSummaryPrompt(posts, summaryType, aiFriend) {
  const postsList = posts.map((post, index) => {
    const supporter = getSupporterById(post.supporterId)
    return `${index + 1}. "${post.title}" by ${supporter?.name || 'Unknown Supporter'}
   ${post.excerpt || 'No excerpt available'}`
  }).join('\n\n')

  if (summaryType === 'recap') {
    return `Write a warm, engaging weekly recap of these blog posts from last week:

${postsList}

As ${aiFriend.name}, create a newsletter-style summary that:
- Celebrates the insights and wisdom shared by our AI Supporters
- Highlights key themes and connections between posts
- Invites readers to reflect on their own experiences
- Maintains a personal, conversational tone
- Keeps readers engaged and looking forward to more content

Make it feel like a friendly letter from a supportive friend who's been following along and wants to share the highlights.`
  } else {
    return `Write an exciting preview of these upcoming blog posts for this week:

${postsList}

As ${aiFriend.name}, create a newsletter-style preview that:
- Builds anticipation for the upcoming content
- Teases the themes and insights coming up
- Connects with readers' interests and needs
- Maintains enthusiasm and encouragement
- Makes readers excited to engage with the content

Make it feel like a friend sharing exciting news about what's coming up.`
  }
}

/**
 * Parse the AI response into structured content
 */
function parseSummaryResponse(content, posts, summaryType) {
  // Extract title from content (look for title patterns)
  const titleMatch = content.match(/^#\s*(.+)$/m) || content.match(/^(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : 
    `${summaryType === 'recap' ? 'Weekly Recap' : 'This Week\'s Preview'}: ${posts.length} Amazing Posts from Our AI Supporters`

  // Clean up the content
  const cleanContent = content
    .replace(/^#\s*.+$/gm, '') // Remove markdown headers
    .replace(/^\*\*(.+?)\*\*/gm, '$1') // Remove bold formatting
    .trim()

  return {
    title,
    content: cleanContent,
    summaryType,
    postCount: posts.length,
    posts: posts.map(post => ({
      id: post.id,
      title: post.title,
      supporterId: post.supporterId,
      excerpt: post.excerpt
    }))
  }
}
