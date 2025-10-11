import { isCrisisMessage } from './crisisService';
// Analyze message for themes and context
const analyzeMessage = (message) => {
  const themes = [];
  const mood = detectMood(message);
  const topics = detectTopics(message);
  
  // Extract key themes
  if (message.toLowerCase().includes('work') || message.toLowerCase().includes('job')) {
    themes.push({ name: 'work', relevance: 0.9, type: 'topic' });
  }
  
  if (message.toLowerCase().includes('stress') || message.toLowerCase().includes('overwhelm')) {
    themes.push({ name: 'stress', relevance: 0.9, type: 'mood' });
  }
  
  if (message.toLowerCase().includes('garden') || message.toLowerCase().includes('plant')) {
    themes.push({ name: 'gardening', relevance: 0.9, type: 'hobby' });
  }
  
  if (message.toLowerCase().includes('meditation') || message.toLowerCase().includes('breathing')) {
    themes.push({ name: 'meditation', relevance: 0.9, type: 'practice' });
  }
  
  if (message.toLowerCase().includes('relationship') || message.toLowerCase().includes('friend')) {
    themes.push({ name: 'relationships', relevance: 0.9, type: 'social' });
  }
  
  if (message.toLowerCase().includes('sleep') || message.toLowerCase().includes('tired')) {
    themes.push({ name: 'sleep', relevance: 0.8, type: 'health' });
  }
  
  if (message.toLowerCase().includes('exercise') || message.toLowerCase().includes('workout')) {
    themes.push({ name: 'exercise', relevance: 0.8, type: 'health' });
  }
  
  if (message.toLowerCase().includes('family') || message.toLowerCase().includes('parent')) {
    themes.push({ name: 'family', relevance: 0.9, type: 'social' });
  }
  
  if (message.toLowerCase().includes('money') || message.toLowerCase().includes('financial')) {
    themes.push({ name: 'finances', relevance: 0.8, type: 'topic' });
  }
  
  if (message.toLowerCase().includes('goal') || message.toLowerCase().includes('dream')) {
    themes.push({ name: 'goals', relevance: 0.8, type: 'motivation' });
  }
  
  return {
    themes,
    mood,
    topics,
    timestamp: new Date()
  };
};

// Detect mood from message
const detectMood = (message) => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('happy') || lowerMessage.includes('excited') || lowerMessage.includes('great')) {
    return 'positive';
  } else if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) {
    return 'negative';
  } else if (lowerMessage.includes('stressed') || lowerMessage.includes('anxious') || lowerMessage.includes('worried')) {
    return 'stressed';
  } else if (lowerMessage.includes('angry') || lowerMessage.includes('frustrated') || lowerMessage.includes('mad')) {
    return 'angry';
  } else if (lowerMessage.includes('confused') || lowerMessage.includes('unsure') || lowerMessage.includes('uncertain')) {
    return 'confused';
  }
  
  return 'neutral';
};

// Detect topics from message
const detectTopics = (message) => {
  const topics = [];
  const lowerMessage = message.toLowerCase();
  
  const topicKeywords = {
    work: ['work', 'job', 'career', 'boss', 'colleague', 'meeting', 'deadline', 'office'],
    health: ['health', 'exercise', 'diet', 'sleep', 'energy', 'tired', 'sick', 'pain'],
    relationships: ['relationship', 'friend', 'family', 'partner', 'marriage', 'dating', 'love'],
    hobbies: ['garden', 'plant', 'reading', 'music', 'art', 'cooking', 'craft', 'sport'],
    spirituality: ['meditation', 'breathing', 'mindfulness', 'prayer', 'yoga', 'spiritual'],
    finances: ['money', 'financial', 'budget', 'saving', 'debt', 'investment'],
    goals: ['goal', 'dream', 'aspiration', 'plan', 'future', 'ambition']
  };
  
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      topics.push(topic);
    }
  });
  
  return topics;
};

// Find relevant context from conversation history
const findRelevantContext = (currentMessage, conversationHistory) => {
  const currentAnalysis = analyzeMessage(currentMessage);
  const relevantContext = [];
  
  // Look through conversation history for relevant themes
  conversationHistory.forEach(message => {
    if (message.sender === 'user') {
      const messageAnalysis = analyzeMessage(message.content);
      
      // Check for theme overlap
      currentAnalysis.themes.forEach(currentTheme => {
        messageAnalysis.themes.forEach(historyTheme => {
          if (currentTheme.name === historyTheme.name) {
            relevantContext.push({
              theme: currentTheme.name,
              relevance: currentTheme.relevance,
              lastMentioned: message.timestamp,
              context: message.content.substring(0, 100) + '...',
              daysAgo: getDaysAgo(message.timestamp)
            });
          }
        });
      });
    }
  });
  
  // Sort by relevance and recency
  return relevantContext
    .sort((a, b) => {
      // First by relevance, then by recency
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return a.daysAgo - b.daysAgo;
    })
    .slice(0, 3); // Limit to top 3 most relevant
};

// Calculate days ago from timestamp
const getDaysAgo = (timestamp) => {
  if (!timestamp) return 999; // Very old if no timestamp
  
  const now = new Date();
  const messageDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffTime = Math.abs(now - messageDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Generate natural context integration
const generateContextIntegration = (relevantContext) => {
  if (!relevantContext || relevantContext.length === 0) return null;
  
  const contextQuestions = {
    gardening: [
      "How's your garden doing these days?",
      "Are you still working on those plants?",
      "Has gardening been helping you relax?",
      "How are your plants growing?"
    ],
    meditation: [
      "Have you been practicing your breathing exercises?",
      "How's your meditation practice going?",
      "Are you finding time for mindfulness?",
      "How are your meditation sessions going?"
    ],
    work: [
      "How are things at work going?",
      "Has work been any less stressful?",
      "How are you feeling about your job lately?",
      "How's work treating you these days?"
    ],
    relationships: [
      "How are your relationships feeling lately?",
      "Are things better with the people in your life?",
      "How are your connections going?",
      "How are things with your relationships?"
    ],
    stress: [
      "How are you managing stress these days?",
      "What's been helping you feel more grounded?",
      "How are you taking care of yourself?",
      "What's been helping you cope?"
    ],
    sleep: [
      "How have you been sleeping lately?",
      "Are you getting better rest these days?",
      "How's your sleep been going?",
      "Are you finding it easier to sleep?"
    ],
    exercise: [
      "How's your exercise routine going?",
      "Are you still finding time to move your body?",
      "How are your workouts going?",
      "Are you staying active?"
    ],
    family: [
      "How are things with your family lately?",
      "How are your family relationships going?",
      "How's everything at home?",
      "How are things with your family?"
    ],
    finances: [
      "How are your finances looking these days?",
      "Are you feeling better about money?",
      "How's your financial situation going?",
      "Are you managing your finances okay?"
    ],
    goals: [
      "How are your goals coming along?",
      "Are you making progress on your dreams?",
      "How are your plans going?",
      "Are you moving toward what you want?"
    ]
  };
  
  // Pick a random relevant question
  const topContext = relevantContext[0];
  const questions = contextQuestions[topContext.theme] || [];
  
  if (questions.length > 0) {
    return questions[Math.floor(Math.random() * questions.length)];
  }
  
  return null;
};

// Check if context is too old to mention
const isContextTooOld = (relevantContext) => {
  if (!relevantContext || relevantContext.length === 0) return true;
  
  // Don't mention context older than 30 days
  const maxAgeDays = 30;
  return relevantContext[0].daysAgo > maxAgeDays;
};

// Check if context integration is appropriate
const shouldIntegrateContext = (userMessage, relevantContext) => {
  // Don't integrate context if:
  // 1. User is in crisis or needs immediate help
  if (isCrisisMessage(userMessage)) return false;
  
  // 2. Context is too old
  if (isContextTooOld(relevantContext)) return false;
  
  // 3. Context relevance is too low
  if (relevantContext.length === 0 || relevantContext[0].relevance < 0.6) return false;
  
  // 4. User message is very short (might not want elaboration)
  if (userMessage.length < 20) return false;
  
  // 5. User seems to want a quick response
  if (userMessage.toLowerCase().includes('quick') || userMessage.toLowerCase().includes('fast')) return false;
  
  return true;
};

// Check if message indicates crisis

export {
  analyzeMessage,
  findRelevantContext,
  generateContextIntegration,
  shouldIntegrateContext,
  isCrisisMessage
}; 