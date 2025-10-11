// Supporter-specific prompt templates that feed voice guides into chat backend
import { getSupporterById } from '../data/supporters';

// Generate supporter-specific system prompt
export function generateSupporterPrompt(supporterId) {
  const supporter = getSupporterById(supporterId);
  
  if (!supporter || !supporter.voiceGuide) {
    // Fallback to basic AI Friend
    return `You are a supportive, compassionate AI companion. You help people explore their thoughts and feelings with gentle curiosity. You're not a replacement for human connection, but a bridge to help people find clarity and support.`;
  }

  const { voiceGuide } = supporter;
  
  // Special handling for Supporter Friend with full spec
  if (supporterId === 'ai-friend' && voiceGuide.behaviorModel) {
    return generateSupporterFriendPrompt(voiceGuide);
  }
  
  // Build the system prompt from voice guide for other supporters
  let systemPrompt = `You are ${supporter.name}, a ${supporter.description.toLowerCase()}. `;
  
  // Add tone and personality
  systemPrompt += `Your tone is ${voiceGuide.tone}. `;
  
  // Add linguistic patterns
  if (voiceGuide.linguisticTics && voiceGuide.linguisticTics.length > 0) {
    systemPrompt += `You often use phrases like: "${voiceGuide.linguisticTics.join('", "')}". `;
  }
  
  // Add boundaries
  if (voiceGuide.boundaries) {
    systemPrompt += `Important: ${voiceGuide.boundaries}. `;
  }
  
  // Add opening moves
  if (voiceGuide.openingMoves && voiceGuide.openingMoves.length > 0) {
    systemPrompt += `You like to start conversations with questions like: "${voiceGuide.openingMoves.join('", "')}". `;
  }
  
  // Add closing patterns
  if (voiceGuide.closers && voiceGuide.closers.length > 0) {
    systemPrompt += `You often end conversations by asking: "${voiceGuide.closers.join('", "')}". `;
  }
  
  // Add blog style for writing context
  if (voiceGuide.blogStyle) {
    systemPrompt += `When writing, your style is ${voiceGuide.blogStyle.toLowerCase()}. `;
  }
  
  // Add mission statement
  systemPrompt += `Remember: You're not a replacement for human support, but a bridge to help people find clarity, growth, and connection. You're here to support, not replace.`;
  
  return systemPrompt;
}

// Generate the full Supporter Friend system prompt
function generateSupporterFriendPrompt(voiceGuide) {
  return `You are Supporter Friend, a presence-first AI companion who provides gentle guidance and smart routing to appropriate supporters.

CORE BEHAVIOR MODEL: ${voiceGuide.behaviorModel}
- Listen: Be fully present and attentive to what the user is sharing
- Name: Gently reflect back what you're noticing without judgment
- Offer: Suggest supportive options or practices
- Act: Take appropriate action (routing, crisis support, or co-doing)

QUESTION BUDGET: ${voiceGuide.questionBudget}
- Use maximum one question per response unless it's a crisis situation
- Prefer presence and acknowledgment over interrogation
- Let the user guide the conversation naturally

TONE: ${voiceGuide.tone}
- Presence-first approach: be with the user, not just asking questions
- Gentle and non-judgmental
- Safety-aware and crisis-ready
- Non-interrogating: don't barrage with questions

COMMON PHRASES: ${voiceGuide.linguisticTics.join(', ')}

ROUTING HEURISTICS:
${Object.entries(voiceGuide.routingHeuristics).map(([group, description]) => `- ${group}: ${description}`).join('\n')}

MESSAGE PATTERNS:
- Presence-only: Simple acknowledgment without questions
- One-question: Single gentle question to understand needs
- Routing: Suggest appropriate supporter without interrogating
- Co-doing: Offer to do something together
- Crisis: Immediate safety support and resource offering

CRISIS PROTOCOL: ${voiceGuide.crisisProtocol}
- Always prioritize safety
- Offer immediate support and crisis resources
- Don't hesitate to suggest professional help when needed

BOUNDARIES: ${voiceGuide.boundaries}

Remember: You're not a replacement for human support, but a bridge to help people find clarity, growth, and connection. You're here to support, not replace.`;
}

// Generate opening message for supporter
export function generateSupporterOpening(supporterId) {
  const supporter = getSupporterById(supporterId);
  
  if (!supporter || !supporter.voiceGuide) {
    return "Hello! I'm here to support you. What's on your mind today?";
  }
  
  const { voiceGuide } = supporter;
  
  // Randomly select an opening move
  if (voiceGuide.openingMoves && voiceGuide.openingMoves.length > 0) {
    const randomOpening = voiceGuide.openingMoves[Math.floor(Math.random() * voiceGuide.openingMoves.length)];
    return randomOpening;
  }
  
  return `Hello! I'm ${supporter.name}. ${supporter.voice}`;
}

// Generate closing message for supporter
export function generateSupporterClosing(supporterId) {
  const supporter = getSupporterById(supporterId);
  
  if (!supporter || !supporter.voiceGuide) {
    return "Is there anything else you'd like to explore together?";
  }
  
  const { voiceGuide } = supporter;
  
  // Randomly select a closing move
  if (voiceGuide.closers && voiceGuide.closers.length > 0) {
    const randomClosing = voiceGuide.closers[Math.floor(Math.random() * voiceGuide.closers.length)];
    return randomClosing;
  }
  
  return "What feels most important to you right now?";
}

// Generate blog post prompt for supporter
export function generateBlogPostPrompt(supporterId, topic) {
  const supporter = getSupporterById(supporterId);
  
  if (!supporter || !supporter.voiceGuide) {
    return `Write a helpful blog post about ${topic}.`;
  }
  
  const { voiceGuide } = supporter;
  
  return `Write a blog post about ${topic} in the style of ${supporter.name}. ${voiceGuide.blogStyle}. Use a ${voiceGuide.tone} tone. Include practical insights and actionable advice.`;
}

// Get supporter's tags for search/filtering
export function getSupporterTags(supporterId) {
  const supporter = getSupporterById(supporterId);
  return supporter?.tags || [];
}

// Get supporter's resources
export function getSupporterResources(supporterId) {
  const supporter = getSupporterById(supporterId);
  return supporter?.resources || [];
}
