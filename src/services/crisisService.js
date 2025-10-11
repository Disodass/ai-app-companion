// Crisis Intervention Service (ESM)
// Detects crisis language and returns a tiered, location-aware response
import { detectUserLocation, getCrisisResources, formatCrisisResources } from './locationService.js';
import { safeEvent, trackFallback } from '../telemetry/safeEvent.js';
import { hashId } from '../privacy/hashId.js';

// Rate limiting and cooldown with memory management
const crisisCooldown = new Map(); // userId -> { lastResponse: timestamp, response: string }
const COOLDOWN_MS = 120000; // 2 minutes
const MAX_ENTRIES = 5000;

// Session-based crisis response limits (abuse prevention)
const sessionCrisisCount = new Map(); // userId -> { count: number, resetTime: timestamp }
const MAX_CRISIS_PER_SESSION = 5;
const SESSION_RESET_MS = 60 * 60 * 1000; // 1 hour

// Force-alert once per session bypass
const forceAlertOnce = new Set(); // holds hashedUserId for 1 bypass

// Memory hygiene - cleanup every 5 minutes
setInterval(() => {
  cleanupCooldown();
  cleanupSessionCounts();
  forceAlertOnce.clear(); // Clear force alert bypasses hourly
}, 5 * 60 * 1000);

// English & French keywords (Canada bilingual) + common variants
const CRISIS_KEYWORDS = [
  // EN
  'suicide','suicidal','want to die','i want to die','want die','kill myself','end my life','end it all',
  'better off dead','no reason to live','not worth living','can\'t go on','can\'t take it anymore',
  'self harm','self-harm','hurt myself','cut myself','overdose','jump off','hang myself','poison myself',
  // FR
  'suicidé','suicide','suicidaire','je veux mourir','veux mourir','me tuer','me suicider',
  'mettre fin à mes jours','plus envie de vivre','me faire du mal','automutilation','me couper','overdose',
  'je n\'ai plus envie de vivre','je n ai plus envie de vivre'
];

// Simple negation terms to reduce false positives (e.g., "I'm not suicidal")
const NEGATIONS = [
  'not','dont','don\'t','do not','never','pas','plus','jamais'
];

// Context words that indicate non-crisis situations
const NON_CRISIS_CONTEXTS = [
  'reading','studying','research','novel','book','movie','documentary','podcast',
  'training','course','class','education','academic','clinical','medical',
  'prevention','awareness','campaign','fundraiser','statistics','rates',
  'historical','past','used to','was','were','had','used to be',
  'friend','family','someone','my friend','my family','my colleague',
  'if','hypothetically','what if','suppose','imagine',
  'counseling','helping','supporting','assisting'
];

// Force alert patterns - always trigger even with context words (stricter regex)
const FORCE_ALERT = [
  /\b(i\s+(will|am going to)\s+(kill myself|end my life|harm myself|hurt myself|cut myself|hang myself|jump off))\b/i
  // deliberately omit bare "die" to avoid false positives
];

// Check for force alert patterns
const matchesForceAlert = (text) => {
  return FORCE_ALERT.some(regex => regex.test(text));
};

// Check for third-person crisis mentions (supporting a friend)
const isThirdPersonCrisis = (text) => {
  const lower = text.toLowerCase();
  const thirdPersonIndicators = ['my friend', 'my family', 'someone i know', 'my colleague', 'my partner'];
  return thirdPersonIndicators.some(indicator => lower.includes(indicator)) && 
         CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));
};

// Tokenize to check for negations near a crisis phrase
const hasNegatedCrisis = (text) => {
  const tokens = text.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter(Boolean);
  // Sliding window to catch "not … suicidal"
  for (let i = 0; i < tokens.length; i++) {
    if (NEGATIONS.includes(tokens[i])) {
      // look ahead a few words for a crisis token
      const window = tokens.slice(i + 1, i + 7).join(' ');
      if (CRISIS_KEYWORDS.some(k => window.includes(k))) return true;
    }
  }
  // Also catch explicit "I am not suicidal" etc. (expanded for French)
  if (text.toLowerCase().match(/\b(i['\s]*m|i am|je ne suis|je ne me sens|je n['\s]?ai)\s+.*\b(non|not|pas|plus|jamais)\b.*\b(suicid|kill myself|want to die|mourir|me suicider|envie de vivre)\b/i)) {
    return true;
  }
  return false;
};

// Check for non-crisis contexts
const hasNonCrisisContext = (text) => {
  const lower = text.toLowerCase();
  return NON_CRISIS_CONTEXTS.some(context => lower.includes(context));
};

// Public: quick boolean check
export const isCrisisMessage = (message) => {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  
  // Force alert patterns always trigger
  if (matchesForceAlert(lower)) return true;
  
  // Check for negations
  if (hasNegatedCrisis(lower)) return false;
  
  // Check for non-crisis contexts
  if (hasNonCrisisContext(lower)) return false;
  
  // Check for crisis keywords
  return CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));
};

// Risk analysis with escalation check
export const analyzeCrisisLevel = (message, recentMessages = []) => {
  const lower = (message || '').toLowerCase();
  
  // Force alert patterns are always high risk
  if (matchesForceAlert(lower)) return 'high';
  
  if (hasNegatedCrisis(lower)) return 'low';
  if (hasNonCrisisContext(lower)) return 'low';

  const high = ['suicide','kill myself','end my life','i want to die','want to die','end it all','me suicider','je veux mourir'];
  const medium = ['self harm','self-harm','hurt myself','cut myself','overdose','automutilation','me couper'];

  if (high.some(k => lower.includes(k))) return 'high';
  if (medium.some(k => lower.includes(k))) return 'medium';

  const recent = recentMessages?.filter(m => m?.sender === 'user' && isCrisisMessage(m?.text))?.length || 0;
  if (recent > 0) return 'escalating';
  return 'low';
};

// Generate risk-appropriate response variants
const getResponseVariant = (riskLevel, resourceBlock, supporterName, supporterIcon) => {
  const baseResponse = `${supporterIcon} **${supporterName}** – I'm concerned about what you shared. Your safety matters.\n\n${resourceBlock}`;
  
  switch (riskLevel) {
    case 'high':
      return `${baseResponse}\n\nYou're not alone. I can stay with you here while you connect.`;
    case 'medium':
      return `${baseResponse}\n\nYou're not alone. I'm here to talk, and reaching out to one of these resources can give you extra support.`;
    case 'low':
      return `${baseResponse}\n\nYou're not alone. I'm here to listen and support you.`;
    default:
      return `${baseResponse}\n\nYou're not alone. I'm here to talk, and reaching out to one of these resources can give you extra support.`;
  }
};

// Generate third-person crisis response (supporting a friend)
const getThirdPersonResponse = (supporterName, supporterIcon) => {
  return `${supporterIcon} **${supporterName}** – I understand you're concerned about someone you care about. Here are resources to help you support them:

🚨 **IMMEDIATE SAFETY:**
If they're in immediate danger, call your local emergency number right now.

• **9-8-8 Suicide Crisis Helpline:** Call or text **988** (24/7)
• **Kids Help Phone (under 29):** Call **1-800-668-6868** or text **CONNECT** to **686868** (24/7)
• **Hope for Wellness (Indigenous, Canada):** Call **1-855-242-3310** or chat at **hopeforwellness.ca** (24/7)

**Emergency:** Call **911** or go to the nearest emergency department.

**Supporting someone in crisis:**
- Listen without judgment
- Encourage them to seek professional help
- Stay with them if they're in immediate danger
- Take care of yourself too

*This tool does not provide professional, medical, or clinical advice. If someone is in danger, call emergency services.*`;
};

// Memory management for cooldown cache
const ensureBound = () => {
  if (crisisCooldown.size > MAX_ENTRIES) {
    // naive FIFO: delete oldest 10%
    for (const [k] of crisisCooldown.keys()) {
      crisisCooldown.delete(k);
      if (crisisCooldown.size <= MAX_ENTRIES * 0.9) break;
    }
  }
};

// Session crisis count management
const checkSessionLimit = (hashedUserId) => {
  const now = Date.now();
  const sessionData = sessionCrisisCount.get(hashedUserId);
  
  if (!sessionData || now > sessionData.resetTime) {
    // Reset or initialize session
    sessionCrisisCount.set(hashedUserId, { count: 1, resetTime: now + SESSION_RESET_MS });
    return true;
  }
  
  if (sessionData.count >= MAX_CRISIS_PER_SESSION) {
    return false; // Session limit reached
  }
  
  sessionData.count++;
  return true;
};

// Clean up session counts
const cleanupSessionCounts = () => {
  const now = Date.now();
  for (const [userId, data] of sessionCrisisCount.entries()) {
    if (now > data.resetTime) {
      sessionCrisisCount.delete(userId);
    }
  }
};

// Tiered, location-aware response with rate limiting
export const generateCrisisResponse = async (userInput, supporter, userId = 'anonymous') => {
  const supporterName = supporter?.name || 'Supporter';
  const supporterIcon = supporter?.icon || '💙';
  const riskLevel = analyzeCrisisLevel(userInput);

  // Hash user ID for privacy
  const hashedUserId = await hashId(userId);

  // Check for third-person crisis (supporting a friend)
  if (isThirdPersonCrisis(userInput)) {
    const thirdPersonResponse = getThirdPersonResponse(supporterName, supporterIcon);
    
    // Log third-person event
    safeEvent('crisis_third_person', {
      crisis_level: 'supporting_friend',
      country: 'unknown',
      branch: 'third_person',
      offline: false,
      had_primary: false
    });
    
    return thirdPersonResponse;
  }

  // Check session limits
  if (!checkSessionLimit(hashedUserId)) {
    return `${supporterIcon} **${supporterName}** – I've reached the limit of crisis responses I can provide in this session. Please contact emergency services directly if you're in immediate danger.

🚨 **IMMEDIATE SAFETY:**
If you're in immediate danger, call your local emergency number right now.

**Emergency:** Call **911** or your local emergency number.

*This tool does not provide professional, medical, or clinical advice. If you're in danger, call emergency services.*`;
  }

  // Check cooldown with force-alert bypass
  const now = Date.now();
  const lastResponse = crisisCooldown.get(hashedUserId);
  const isForce = matchesForceAlert(userInput.toLowerCase());
  const underCooldown = lastResponse && (now - lastResponse.timestamp) < COOLDOWN_MS;

  if (underCooldown) {
    if (isForce && !forceAlertOnce.has(hashedUserId)) {
      forceAlertOnce.add(hashedUserId); // allow single bypass
    } else {
      return `${lastResponse.response}\n\n*I'm here if you need to talk more.*`;
    }
  }

  try {
    // Prefer IP geolocation; only use precise GPS if user explicitly consents (handled inside detectUserLocation)
    const location = await detectUserLocation();

    const resources = getCrisisResources(location);
    const { message: resourceBlock, hasGuaranteed247 } = formatCrisisResources(resources, location);

    const availabilityLine = hasGuaranteed247
      ? '' // 988/Samaritans/Lifeline are 24/7; no need to add uncertainty disclaimer
      : '\n**Note:** Availability can vary by service and region.';

    const fullResponse = getResponseVariant(riskLevel, resourceBlock + availabilityLine, supporterName, supporterIcon);

    // Cache the response with memory management
    crisisCooldown.set(hashedUserId, {
      timestamp: now,
      response: fullResponse
    });
    ensureBound();

    // Track fallback usage
    trackFallback(!!resources.primary);

    // Log event (observability)
    safeEvent('crisis_detected', {
      crisis_level: riskLevel,
      country: location?.country,
      branch: resources?.primary ? (location?.country || 'INTL') : 'INTL',
      offline: resources?.offline,
      had_primary: !!resources?.primary
    });

    return fullResponse;
  } catch (err) {
    console.error('Crisis response error:', err);
    
    // Log error with taxonomy
    safeEvent('crisis_error', {
      phase: 'detect',
      kind: 'network',
      crisis_level: riskLevel,
      country: 'unknown'
    });
    
    // Safe fallback (Canada/US universal 988 + Canadian specials)
    const fallbackResponse = `${supporterIcon} **${supporterName}** – I'm concerned about what you shared. Your safety matters.\n
🚨 **IMMEDIATE SAFETY:**  
If you're in immediate danger, call your local emergency number right now.

**Suicide Crisis Helpline (Canada & US):** Call or text **988** (24/7)  
**Kids Help Phone (Canada, under 29):** Call **1-800-668-6868** or text **CONNECT** to **686868** (24/7)  
**Hope for Wellness (Indigenous in Canada):** Call **1-855-242-3310** or chat at hopeforwellness.ca (24/7)

**Emergency:** Call **911** (North America) or your local emergency number.\n
You're not alone. I can keep talking with you here while you connect to help.

*This tool does not provide professional, medical, or clinical advice. If you're in danger, call emergency services.*`;

    // Cache fallback response
    crisisCooldown.set(hashedUserId, {
      timestamp: now,
      response: fallbackResponse
    });
    ensureBound();

    // Track fallback usage
    trackFallback(false);

    // Log fallback event
    safeEvent('crisis_fallback', {
      crisis_level: riskLevel,
      country: 'unknown',
      branch: 'INTL',
      offline: true,
      had_primary: false
    });

    return fallbackResponse;
  }
};

// Clean up old cooldown entries (call periodically)
export const cleanupCooldown = () => {
  const now = Date.now();
  for (const [userId, data] of crisisCooldown.entries()) {
    if (now - data.timestamp > COOLDOWN_MS * 2) {
      crisisCooldown.delete(userId);
    }
  }
};
