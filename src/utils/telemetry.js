// Telemetry utilities for tracking AI performance

export const trackFallback = (reason, metadata = {}) => {
  console.log('📊 Fallback triggered:', reason, metadata)
  // Add actual telemetry tracking here if needed
}

export const trackResponseTime = (responseTime, supporterType) => {
  console.log('⏱️ Response time:', responseTime + 'ms for', supporterType)
  // Add actual telemetry tracking here if needed
}
