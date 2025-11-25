import { getPublishedPosts, getDraftPosts, updateBlogPost } from './blogService'

/**
 * Shift all posts forward by a specified number of days
 */
export async function shiftPostsForward(daysToShift) {
  try {
    console.log(`🔄 Shifting all posts forward by ${daysToShift} days...`)
    
    // Get all posts
    const [publishedPosts, draftPosts] = await Promise.all([
      getPublishedPosts(),
      getDraftPosts()
    ])
    
    const allPosts = [...publishedPosts, ...draftPosts]
    
    if (allPosts.length === 0) {
      console.log('✅ No posts to shift')
      return { success: true, count: 0 }
    }
    
    console.log(`📊 Found ${allPosts.length} posts to shift`)
    
    const results = []
    
    for (const post of allPosts) {
      try {
        // Get the current scheduled date (or fallback to created/published date)
        const currentDate = post.scheduledFor?.toDate() || 
                           post.publishedAt?.toDate() || 
                           post.createdAt?.toDate()
        
        if (!currentDate) {
          console.warn(`⚠️  Skipping post without date: ${post.title}`)
          continue
        }
        
        // Calculate new date (shift forward by specified days)
        const newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() + daysToShift)
        
        console.log(`   "${post.title}" by ${post.supporterName}`)
        console.log(`     From: ${currentDate.toLocaleDateString()} → To: ${newDate.toLocaleDateString()}`)
        
        // Update the post with new scheduled date
        await updateBlogPost(post.id, {
          scheduledFor: newDate
        })
        
        results.push({
          success: true,
          postId: post.id,
          title: post.title,
          oldDate: currentDate,
          newDate: newDate
        })
        
      } catch (error) {
        console.error(`❌ Error shifting post "${post.title}":`, error)
        results.push({
          success: false,
          postId: post.id,
          title: post.title,
          error: error.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`\n✅ Successfully shifted ${successCount} of ${allPosts.length} posts`)
    
    return {
      success: true,
      total: allPosts.length,
      shifted: successCount,
      failed: allPosts.length - successCount,
      results
    }
    
  } catch (error) {
    console.error('❌ Error in shiftPostsForward:', error)
    throw error
  }
}

/**
 * Remove all scheduled dates from posts (unschedule them)
 */
export async function unscheduleAllPosts() {
  try {
    console.log('🧹 Removing all scheduled dates from posts...')
    
    // Get all posts
    const [publishedPosts, draftPosts] = await Promise.all([
      getPublishedPosts(),
      getDraftPosts()
    ])
    
    const allPosts = [...publishedPosts, ...draftPosts]
    
    if (allPosts.length === 0) {
      console.log('✅ No posts to unschedule')
      return { success: true, count: 0 }
    }
    
    console.log(`📊 Found ${allPosts.length} posts to unschedule`)
    
    const results = []
    
    for (const post of allPosts) {
      try {
        console.log(`   Unscheduling: "${post.title}" by ${post.supporterName}`)
        
        // Update the post to remove scheduledFor date
        await updateBlogPost(post.id, {
          scheduledFor: null
        })
        
        results.push({
          success: true,
          postId: post.id,
          title: post.title
        })
        
      } catch (error) {
        console.error(`❌ Error unscheduling post "${post.title}":`, error)
        results.push({
          success: false,
          postId: post.id,
          title: post.title,
          error: error.message
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`\n✅ Successfully unscheduled ${successCount} of ${allPosts.length} posts`)
    
    return {
      success: true,
      total: allPosts.length,
      unscheduled: successCount,
      failed: allPosts.length - successCount,
      results
    }
    
  } catch (error) {
    console.error('❌ Error in unscheduleAllPosts:', error)
    throw error
  }
}

/**
 * Shift posts to start on a specific date
 */
export async function shiftPostsToStartDate(targetStartDate) {
  try {
    // Get all posts
    const [publishedPosts, draftPosts] = await Promise.all([
      getPublishedPosts(),
      getDraftPosts()
    ])
    
    const allPosts = [...publishedPosts, ...draftPosts]
    
    if (allPosts.length === 0) {
      return { success: true, count: 0 }
    }
    
    // Find the earliest post date
    let earliestDate = null
    allPosts.forEach(post => {
      const postDate = post.scheduledFor?.toDate() || 
                       post.publishedAt?.toDate() || 
                       post.createdAt?.toDate()
      
      if (postDate && (!earliestDate || postDate < earliestDate)) {
        earliestDate = postDate
      }
    })
    
    if (!earliestDate) {
      console.log('No valid dates found in posts')
      return { success: false, error: 'No valid dates' }
    }
    
    // Calculate how many days to shift
    const targetDate = new Date(targetStartDate)
    targetDate.setHours(0, 0, 0, 0)
    earliestDate.setHours(0, 0, 0, 0)
    
    const daysToShift = Math.round((targetDate - earliestDate) / (1000 * 60 * 60 * 24))
    
    console.log(`📅 Earliest post: ${earliestDate.toLocaleDateString()}`)
    console.log(`🎯 Target start: ${targetDate.toLocaleDateString()}`)
    console.log(`➡️  Shifting posts by ${daysToShift} days`)
    
    return await shiftPostsForward(daysToShift)
    
  } catch (error) {
    console.error('❌ Error in shiftPostsToStartDate:', error)
    throw error
  }
}
