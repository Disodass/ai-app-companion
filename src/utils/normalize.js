// Utility functions for normalizing conversation data

export const safeLength = (arr) => {
  return Array.isArray(arr) ? arr.length : 0
}

export const normalizeHistory = (history) => {
  if (!Array.isArray(history)) {
    return []
  }

  return history.map(msg => ({
    sender: msg.sender || msg.role || 'user',
    text: msg.text || msg.content || '',
    timestamp: msg.timestamp || new Date().toISOString()
  }))
}
