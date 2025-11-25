// Debug script to check localStorage
console.log('=== CHAT HISTORY DEBUG ===')

// Check what's in localStorage
const keys = Object.keys(localStorage)
console.log('All localStorage keys:', keys)

// Check for chat-related keys
const chatKeys = keys.filter(key => key.startsWith('chat-'))
console.log('Chat keys found:', chatKeys)

// Check each chat key
chatKeys.forEach(key => {
  try {
    const data = JSON.parse(localStorage.getItem(key))
    console.log(`Key: ${key}`, {
      messageCount: data.length,
      firstMessage: data[0],
      lastMessage: data[data.length - 1]
    })
  } catch (error) {
    console.log(`Key: ${key} - Error parsing:`, error.message)
  }
})

console.log('=== END DEBUG ===')
