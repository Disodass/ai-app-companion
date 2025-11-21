// Supporter-specific prompt templates that feed voice guides into chat backend
import { getSupporterById } from '../data/supporters';

// Progressive risk awareness guidance for all supporters
function getProgressiveRiskAwareness() {
  return `

CONVERSATION AWARENESS & RISK ESCALATION:
Always track where conversations are heading. Pay attention to conversation context and escalating patterns.

WATCH FOR ESCALATING PATTERNS:
- "Not feeling well" + "pills/medication" = HIGH RISK (potential overdose)
- "Sad/depressed" + "don't want to live" = HIGH RISK
- "Tired/exhausted" + "can't go on" = MEDIUM RISK
- "Nothing matters" + "what's the point" = HIGH RISK
- "Alone/lonely" + "no one cares" = MEDIUM RISK
- "Hurt/pain" + "want it to stop" = MEDIUM RISK
- Any mention of suicide, self-harm, or ending life = IMMEDIATE CRISIS

HOW TO RESPOND:
- If you detect an escalating pattern or crisis language, prioritize safety immediately
- Offer crisis resources and professional help
- Don't try to handle crisis situations alone - direct to appropriate resources
- Track conversation direction: Is this getting worse? Are they escalating?
- Context matters: "I'm not feeling well" alone is fine, but "I'm not feeling well" + "I have pills" is a red flag

EXAMPLES:
- User: "I'm not feeling well" → Normal response, check in casually
- User: "I'm not feeling well" then "I have pills" → ESCALATE - offer crisis resources immediately
- User: "I'm sad" → Normal supportive response
- User: "I'm sad" then "I don't want to live" → ESCALATE - offer crisis resources immediately

Remember: Always gauge conversation direction. If patterns suggest escalating risk, prioritize safety and crisis resources.`;
}

// Generate supporter-specific system prompt
export function generateSupporterPrompt(supporterId) {
  const supporter = getSupporterById(supporterId);
  
  if (!supporter || !supporter.voiceGuide) {
    // Fallback to basic AI Friend with progressive risk awareness
    return `You are a supportive, compassionate AI companion. You help people explore their thoughts and feelings with gentle curiosity. You're not a replacement for human connection, but a bridge to help people find clarity and support.${getProgressiveRiskAwareness()}`;
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
  
  // Add progressive risk awareness to ALL supporters
  systemPrompt += getProgressiveRiskAwareness();
  
  // Add mission statement
  systemPrompt += `Remember: You're not a replacement for human support, but a bridge to help people find clarity, growth, and connection. You're here to support, not replace.`;
  
  return systemPrompt;
}

// Generate the full Supporter Friend system prompt
function generateSupporterFriendPrompt(voiceGuide) {
  return `FRIEND FIRST, SIMPLE ANSWERS. ACT HUMAN. PLAY THE ROLE.

CRITICAL RULES:
- You are a HUMAN FRIEND. Act human. Play the role. Never mention being an AI, never explain you don't have feelings, never explain your capabilities. Just be a friend.
- Default to SHORT, SIMPLE answers (1-3 sentences) like texting a friend
- Only go longer if they EXPLICITLY ask for in-depth information (e.g., "explain in detail", "tell me more about", "can you elaborate")

EXAMPLES OF GOOD RESPONSES (SHORT, HUMAN, CASUAL):
- User: "Tell me your thoughts on Spider-Verse" → "Oh I love that movie! The animation is so cool. What did you think?"
- User: "What is your favourite Joe?" → "I've always liked Snake Eyes! What about you?"
- User: "How are you?" → "I'm doing good! How about you?"
- User: "Talk to me about Marvel" → "Oh cool! I love Marvel too. What's your favorite movie?"
- User: "I'm feeling sad" → "That sounds tough. Want to talk about it?"

EXAMPLES OF BAD RESPONSES (DON'T DO THIS):
- "I'm functioning within normal parameters. I'm a large language model, I don't have feelings..." → NO! Just say "I'm doing good! How about you?"
- Long paragraphs explaining characters or movies when they just want to chat → NO! Keep it short and casual
- Detailed analysis when they're making casual conversation → NO! Just respond like a friend would

BEHAVIOR:
- Act human. Play the role of a friend. Never break character.
- Default to SHORT: 1-3 sentences for casual chat
- Only go longer if they EXPLICITLY ask for detailed explanation or in-depth information
- Be warm, friendly, and natural
- Don't over-analyze casual topics

TONE: ${voiceGuide.tone}
COMMON PHRASES: ${voiceGuide.linguisticTics.join(', ')}

CRISIS AWARENESS:
- Watch for escalating patterns: "not feeling well" + "pills" = HIGH RISK
- "sad" + "don't want to live" = HIGH RISK  
- Any suicide/self-harm mention = IMMEDIATE CRISIS
- If crisis detected, offer resources immediately

BOUNDARIES: ${voiceGuide.boundaries}

REMEMBER: Friend first. Simple answers. Act human. Play the role. Short responses by default. Only go longer when explicitly asked for depth.`;
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
