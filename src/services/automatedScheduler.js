import { getNextSupporter, peekNextSupporter, getTodayCategory, getWeeklySchedule } from './schedulingService'
import { getLastPostBySupporter } from './blogService'
import { generateAIBlogPost } from './aiBlogGenerator'
import { createBlogPost } from './blogService'

/**
 * Automated content scheduling service
 * Handles generating content weeks ahead and scheduling automatic publishing
 */

/**
 * Get the next supporter that should write based on the schedule
 * Finds the next empty calendar slot and assigns the appropriate supporter
 */
export async function getNextScheduledSupporter() {
  const { getPublishedPosts, getDraftPosts } = await import('./blogService.js')
  
  // Get all existing posts (both draft and published)
  const [publishedPosts, draftPosts] = await Promise.all([
    getPublishedPosts(),
    getDraftPosts()
  ])
  
  const allPosts = [...publishedPosts, ...draftPosts]
  
  // Find the next empty weekday slot
  const nextSlot = await findNextEmptySlot(allPosts)
  
  if (!nextSlot) {
    console.error('No available slots found in the next 4 weeks')
    return null
  }
  
  console.log(`🔍 Looking for supporter in category: ${nextSlot.category}`)
  console.log(`📅 Scheduled date: ${nextSlot.date.toLocaleDateString()}`)
  console.log(`📅 Day of week: ${nextSlot.dayName}`)
  
  const nextSupporter = getNextSupporter(nextSlot.category)
  
  if (!nextSupporter) {
    console.error(`❌ No supporter found for category: ${nextSlot.category}`)
    console.error(`Available categories: coaches, wellness, emotional, financial, creative`)
    
    // Debug: Check what categories actually exist
    const { SUPPORTER_GROUPS } = await import('../data/supporters.js')
    console.error(`Available supporter groups:`, SUPPORTER_GROUPS.map(g => g.id))
    
    return null
  }
  
  console.log(`✅ Found supporter: ${nextSupporter.name} (${nextSupporter.id})`)
  
  return { 
    ...nextSupporter, 
    category: nextSlot.category,
    scheduledDate: nextSlot.date,
    dayName: nextSlot.dayName
  }
}

/**
 * Find the next empty slot in the calendar
 */
async function findNextEmptySlot(existingPosts) {
  const weeklySchedule = {
    1: 'coaches',      // Monday
    2: 'wellness',     // Tuesday
    3: 'emotional',    // Wednesday
    4: 'financial',    // Thursday
    5: 'creative'      // Friday
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  console.log(`🔍 Finding next empty slot starting from: ${today.toLocaleDateString()}`)
  console.log(`📊 Total existing posts: ${existingPosts.length}`)
  
  // Debug: Show first few existing posts
  if (existingPosts.length > 0) {
    console.log(`📝 Existing posts:`)
    existingPosts.slice(0, 3).forEach((post, index) => {
      const postDate = post.scheduledFor?.toDate() || post.publishedAt?.toDate() || post.createdAt?.toDate()
      console.log(`   ${index + 1}. ${post.title} by ${post.supporterName} - ${postDate?.toLocaleDateString()} (${post.status})`)
    })
  }
  
  // Check the next 28 days (4 weeks) for an empty slot
  for (let daysAhead = 0; daysAhead < 28; daysAhead++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() + daysAhead)
    
    const dayOfWeek = checkDate.getDay()
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue
    }
    
    const category = weeklySchedule[dayOfWeek]
    
    // Check if this date already has a post
    const hasPost = existingPosts.some(post => {
      const postDate = post.scheduledFor?.toDate() || post.publishedAt?.toDate() || post.createdAt?.toDate()
      if (!postDate) return false
      
      postDate.setHours(0, 0, 0, 0)
      const isMatch = postDate.getTime() === checkDate.getTime()
      
      // Debug first few posts
      if (daysAhead < 3 && isMatch) {
        console.log(`📅 Post found for ${checkDate.toLocaleDateString()}: ${post.title} by ${post.supporterName}`)
      }
      
      return isMatch
    })
    
    if (!hasPost) {
      console.log(`✅ Found empty slot: ${checkDate.toLocaleDateString()} (${category})`)
      return {
        date: checkDate,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        category,
        dayOfWeek
      }
    }
  }
  
  return null
}

/**
 * Generate content for the next scheduled supporter
 */
export async function generateNextScheduledContent() {
  try {
    const nextSupporter = await getNextScheduledSupporter()
    if (!nextSupporter) {
      throw new Error('No next supporter found')
    }

    console.log('Generating content for supporter:', nextSupporter.id, nextSupporter.name, 'scheduled for:', nextSupporter.scheduledDate?.toLocaleDateString())

    // Check if this supporter has previous posts for continuation
    const lastPost = await getLastPostBySupporter(nextSupporter.id)
    
    let topic
    let continueFromPost = null
    
    if (lastPost) {
      // Generate smart continuation topic
      topic = generateContinuationTopic(lastPost)
      continueFromPost = lastPost
      console.log('Continuing from previous post:', lastPost.title)
    } else {
      // Generate fresh topic based on supporter's expertise
      topic = generateFreshTopic(nextSupporter)
      console.log('Generating fresh topic:', topic)
    }

    // Check if supporter has required properties for AI generation
    if (!nextSupporter.voiceGuide && !nextSupporter.description) {
      console.warn(`Supporter ${nextSupporter.id} missing voiceGuide, using fallback`)
    }

    // Generate the blog post
    const postData = await generateAIBlogPost(
      nextSupporter.id, 
      topic, 
      'random', 
      continueFromPost
    )

    // Validate that we're not scheduling on weekends
    const scheduledDate = nextSupporter.scheduledDate || new Date()
    const dayOfWeek = scheduledDate.getDay()
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new Error(`Cannot schedule regular supporter posts on weekends. Date: ${scheduledDate.toLocaleDateString()}`)
    }
    
    // Add scheduling metadata
    const scheduledPostData = {
      ...postData,
      scheduledFor: scheduledDate,
      autoGenerated: true,
      supporterCategory: nextSupporter.category,
      isContinuation: !!continueFromPost,
      previousPostId: continueFromPost?.id || null
    }

    // Save as draft (ready for review)
    const savedPost = await createBlogPost(scheduledPostData)
    
    return {
      success: true,
      post: savedPost,
      supporter: nextSupporter,
      isContinuation: !!continueFromPost,
      previousPost: continueFromPost
    }
  } catch (error) {
    console.error('Error generating next scheduled content:', error)
    throw error
  }
}

/**
 * Generate continuation topic based on previous post
 */
function generateContinuationTopic(previousPost) {
  const title = previousPost.title
  const excerpt = previousPost.excerpt || ''
  
  if (title.includes('Building') || title.includes('Developing')) {
    return `${title}: Taking It Further`
  } else if (title.includes('How to') || title.includes('Ways to')) {
    return `${title}: Advanced Strategies`
  } else if (title.includes('Understanding') || title.includes('Exploring')) {
    return `${title}: Practical Applications`
  } else if (title.includes('Managing') || title.includes('Coping')) {
    return `${title}: Next Steps`
  } else if (title.includes('Guide') || title.includes('Tips')) {
    return `${title}: Part 2`
  } else if (excerpt.includes('first') || excerpt.includes('beginning')) {
    return `${title}: Going Deeper`
  } else if (excerpt.includes('foundation') || excerpt.includes('basics')) {
    return `${title}: Advanced Techniques`
  } else {
    return `${title}: Continuing the Journey`
  }
}

/**
 * Generate fresh topic based on supporter expertise
 */
function generateFreshTopic(supporter) {
  const supporterTopics = {
    'life-coach': ['Goal Setting Strategies', 'Building Confidence', 'Creating Life Balance', 'Overcoming Obstacles'],
    'career-coach': ['Career Advancement Tips', 'Networking Strategies', 'Work-Life Integration', 'Professional Development'],
    'productivity-coach': ['Time Management Systems', 'Productivity Hacks', 'Focus Techniques', 'Workflow Optimization'],
    'therapist': ['Emotional Resilience', 'Stress Management', 'Self-Care Practices', 'Mental Health Awareness'],
    'yoga-instructor': ['Mindfulness Practices', 'Stress Relief Techniques', 'Body Awareness', 'Breathing Exercises'],
    'financial-coach': ['Money Mindset', 'Budgeting Strategies', 'Investment Basics', 'Financial Planning'],
    'creative-collaborator': ['Creative Inspiration', 'Artistic Expression', 'Creative Blocks', 'Imagination Techniques'],
    'journal-prompter': ['Self-Reflection Practices', 'Journaling Techniques', 'Personal Growth', 'Inner Dialogue']
  }

  const topics = supporterTopics[supporter.id] || ['Personal Growth', 'Life Strategies', 'Wellness Tips', 'Self-Improvement']
  const randomTopic = topics[Math.floor(Math.random() * topics.length)]
  
  return randomTopic
}

/**
 * Get the schedule for the next N weeks with filled/empty status
 */
export async function getUpcomingSchedule(weeks = 4) {
  const { getPublishedPosts, getDraftPosts } = await import('./blogService.js')
  
  // Get all existing posts
  const [publishedPosts, draftPosts] = await Promise.all([
    getPublishedPosts(),
    getDraftPosts()
  ])
  
  const allPosts = [...publishedPosts, ...draftPosts]
  
  const schedule = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  console.log(`📅 Loading schedule for ${weeks} weeks starting from: ${today.toLocaleDateString()}`)
  
  for (let week = 0; week < weeks; week++) {
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() + (week * 7))
    
    console.log(`📅 Week ${week + 1}: ${weekStart.toLocaleDateString()}`)
    
    const weekSchedule = []
    
    // Monday to Friday
    const weekdayCategories = ['coaches', 'wellness', 'emotional', 'financial', 'creative']
    for (let day = 1; day <= 5; day++) {
      const dayDate = new Date(weekStart)
      dayDate.setDate(weekStart.getDate() - weekStart.getDay() + day)
      dayDate.setHours(0, 0, 0, 0)
      
      const category = weekdayCategories[day - 1]
      
      // Check if this date has a post
      const postForDate = allPosts.find(post => {
        const postDate = post.scheduledFor?.toDate() || post.publishedAt?.toDate() || post.createdAt?.toDate()
        if (!postDate) return false
        
        postDate.setHours(0, 0, 0, 0)
        return postDate.getTime() === dayDate.getTime()
      })
      
      // Debug logging for first few days
      if (week === 0 && day <= 3) {
        console.log(`📅 ${dayDate.toLocaleDateString()}: ${postForDate ? `${postForDate.supporterName} (${postForDate.status})` : 'Empty'}`)
      }
      
      weekSchedule.push({
        day: dayDate.getDay(),
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayDate.getDay()],
        date: dayDate,
        category,
        supporter: postForDate ? { 
          id: postForDate.supporterId, 
          name: postForDate.supporterName 
        } : null,
        filled: !!postForDate,
        post: postForDate || null,
        status: postForDate ? postForDate.status : 'empty'
      })
    }
    
    // Weekend summaries
    const saturdayDate = new Date(weekStart)
    saturdayDate.setDate(weekStart.getDate() + 5) // Saturday (Monday + 5 days)
    saturdayDate.setHours(0, 0, 0, 0)
    
    const sundayDate = new Date(weekStart)
    sundayDate.setDate(weekStart.getDate() + 6) // Sunday (Monday + 6 days)
    sundayDate.setHours(0, 0, 0, 0)
    
    // Debug weekend dates for first week
    if (week === 0) {
      console.log(`📅 Weekend dates: Sat ${saturdayDate.toLocaleDateString()}, Sun ${sundayDate.toLocaleDateString()}`)
    }
    
    // Check for weekend posts
    const saturdayPost = allPosts.find(post => {
      const postDate = post.scheduledFor?.toDate() || post.publishedAt?.toDate() || post.createdAt?.toDate()
      if (!postDate) return false
      postDate.setHours(0, 0, 0, 0)
      return postDate.getTime() === saturdayDate.getTime()
    })
    
    const sundayPost = allPosts.find(post => {
      const postDate = post.scheduledFor?.toDate() || post.publishedAt?.toDate() || post.createdAt?.toDate()
      if (!postDate) return false
      postDate.setHours(0, 0, 0, 0)
      return postDate.getTime() === sundayDate.getTime()
    })
    
    weekSchedule.push(
      {
        day: 6,
        dayName: 'Saturday',
        date: saturdayDate,
        category: 'weekly-recap',
        supporter: saturdayPost ? {
          id: saturdayPost.supporterId,
          name: saturdayPost.supporterName
        } : { id: 'ai-friend', name: 'AI Friend' },
        filled: !!saturdayPost,
        post: saturdayPost || null,
        status: saturdayPost ? saturdayPost.status : 'empty'
      },
      {
        day: 0,
        dayName: 'Sunday', 
        date: sundayDate,
        category: 'weekly-preview',
        supporter: sundayPost ? {
          id: sundayPost.supporterId,
          name: sundayPost.supporterName
        } : { id: 'ai-friend', name: 'AI Friend' },
        filled: !!sundayPost,
        post: sundayPost || null,
        status: sundayPost ? sundayPost.status : 'empty'
      }
    )
    
    schedule.push({
      weekNumber: week + 1,
      startDate: weekStart,
      days: weekSchedule.sort((a, b) => a.day - b.day)
    })
  }
  
  return schedule
}

/**
 * Generate weekend newsletters for a completed week
 */
export async function generateWeekendNewsletters(weekStartDate) {
  const { generateWeeklySummary } = await import('./weeklySummaryService.js')
  const { createBlogPost } = await import('./blogService.js')
  const { AI_FRIEND } = await import('../data/supporters.js')
  
  const saturdayDate = new Date(weekStartDate)
  saturdayDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 6) // Saturday
  
  const sundayDate = new Date(weekStartDate)
  sundayDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 7) // Sunday (next week)
  
  const results = []
  
  try {
    // Generate Saturday recap
    console.log('📋 Generating Saturday recap...')
    const recapData = await generateWeeklySummary('recap')
    const recapPost = await createBlogPost({
      ...recapData,
      status: 'draft',
      scheduledFor: saturdayDate,
      autoGenerated: true,
      type: 'weeklyRecap'
    })
    results.push({ type: 'recap', success: true, post: recapPost })
    
    // Generate Sunday preview
    console.log('🔮 Generating Sunday preview...')
    const previewData = await generateWeeklySummary('preview')
    const previewPost = await createBlogPost({
      ...previewData,
      status: 'draft',
      scheduledFor: sundayDate,
      autoGenerated: true,
      type: 'weeklyPreview'
    })
    results.push({ type: 'preview', success: true, post: previewPost })
    
    console.log('✅ Weekend newsletters generated successfully!')
    return results
  } catch (error) {
    console.error('❌ Error generating weekend newsletters:', error)
    results.push({ type: 'error', success: false, error: error.message })
    return results
  }
}

/**
 * Generate content for multiple upcoming slots
 */
export async function generateBatchContent(count = 5) {
  const results = []
  
  for (let i = 0; i < count; i++) {
    try {
      console.log(`Generating content ${i + 1} of ${count}`)
      const result = await generateNextScheduledContent()
      results.push(result)
      
      // Small delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`Error generating content ${i + 1}:`, error)
      results.push({
        success: false,
        error: error.message,
        index: i
      })
      
      // Continue with next generation even if one fails
    }
  }
  
  return results
}
