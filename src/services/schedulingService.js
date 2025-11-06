import { SUPPORTER_GROUPS } from '../data/supporters.js'

// Weekly schedule mapping (Monday-Friday only)
const WEEKLY_SCHEDULE = {
  1: 'coaches',      // Monday - Coaches & Motivators
  2: 'wellness',     // Tuesday - Wellness & Movement
  3: 'emotional',    // Wednesday - Emotional Support
  4: 'financial',    // Thursday - Financial & Business
  5: 'creative'      // Friday - Creative & Expression
  // Saturday & Sunday - Reserved for your other plans
}

// Track which supporter is "next up" in each category
const supporterRotation = new Map()

/**
 * Get the category for today's blog post
 */
export function getTodayCategory() {
  const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // If it's a weekend (Saturday=6, Sunday=0), return null
  if (today === 0 || today === 6) {
    return null
  }
  
  return WEEKLY_SCHEDULE[today] || 'coaches' // Default to coaches if no mapping
}

/**
 * Get the next supporter to write in a given category (without advancing rotation)
 */
export function peekNextSupporter(categoryId = null) {
  const category = categoryId || getTodayCategory()
  const categoryGroup = SUPPORTER_GROUPS.find(group => group.id === category)
  
  if (!categoryGroup) {
    console.warn(`Category ${category} not found`)
    return null
  }

  const activeSupporters = categoryGroup.supporters.filter(s => s.active)
  if (activeSupporters.length === 0) {
    console.warn(`No active supporters in category ${category}`)
    return null
  }

  // Get current rotation index for this category (don't advance)
  const currentIndex = supporterRotation.get(category) || 0
  return activeSupporters[currentIndex]
}

/**
 * Get the next supporter to write in a given category
 * Rotates through supporters in order
 */
export function getNextSupporter(categoryId = null) {
  const category = categoryId || getTodayCategory()
  const categoryGroup = SUPPORTER_GROUPS.find(group => group.id === category)
  
  if (!categoryGroup) {
    console.warn(`Category ${category} not found`)
    return null
  }

  const activeSupporters = categoryGroup.supporters.filter(s => s.active)
  if (activeSupporters.length === 0) {
    console.warn(`No active supporters in category ${category}`)
    return null
  }

  // Get current rotation index for this category
  const currentIndex = supporterRotation.get(category) || 0
  const nextSupporter = activeSupporters[currentIndex]
  
  // Move to next supporter (cycle back to 0 when reaching the end)
  const nextIndex = (currentIndex + 1) % activeSupporters.length
  supporterRotation.set(category, nextIndex)
  
  return nextSupporter
}

/**
 * Get all supporters in a category
 */
export function getSupportersInCategory(categoryId) {
  const categoryGroup = SUPPORTER_GROUPS.find(group => group.id === categoryId)
  return categoryGroup ? categoryGroup.supporters.filter(s => s.active) : []
}

/**
 * Get the weekly schedule for display
 */
export function getWeeklySchedule() {
  return Object.entries(WEEKLY_SCHEDULE).map(([dayNumber, categoryId]) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const categoryGroup = SUPPORTER_GROUPS.find(group => group.id === categoryId)
    
    return {
      dayNumber: parseInt(dayNumber),
      dayName: dayNames[parseInt(dayNumber)],
      category: categoryGroup,
      nextSupporter: getNextSupporter(categoryId)
    }
  })
}

/**
 * Reset rotation for a category (useful for testing or manual override)
 */
export function resetCategoryRotation(categoryId) {
  supporterRotation.set(categoryId, 0)
}

/**
 * Get current rotation index for a category
 */
export function getCategoryRotationIndex(categoryId) {
  return supporterRotation.get(categoryId) || 0
}
