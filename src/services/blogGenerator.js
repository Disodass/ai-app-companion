// Blog post generator for supporters with variability engine
import { getSupporterById } from '../data/supporters';

// Generate sample blog post for a supporter
export function generateBlogPost(supporterId, topic, format = 'random') {
  const supporter = getSupporterById(supporterId);
  
  if (!supporter || !supporter.voiceGuide) {
    return generateGenericBlogPost(topic);
  }

  const { voiceGuide } = supporter;
  
  // Different blog post formats for variability
  const formats = {
    'reflection': generateReflectionPost(supporter, topic, voiceGuide),
    'practical': generatePracticalPost(supporter, topic, voiceGuide),
    'story': generateStoryPost(supporter, topic, voiceGuide),
    'question': generateQuestionPost(supporter, topic, voiceGuide),
    'list': generateListPost(supporter, topic, voiceGuide),
    'random': generateRandomFormatPost(supporter, topic, voiceGuide)
  };

  return formats[format] || formats['random'];
}

// Generate reflection-style post
function generateReflectionPost(supporter, topic, voiceGuide) {
  return {
    title: `Reflecting on ${topic}`,
    content: `
I've been thinking about ${topic} lately, and what keeps coming up for me is how often we rush past the moments that matter most.

${voiceGuide.tone.includes('gentle') ? 'There\'s something gentle about taking time to really notice what\'s happening in our lives.' : 'What I\'m noticing is how we can miss the subtle shifts that make all the difference.'}

When we slow down and really pay attention, we start to see patterns we might have missed. ${voiceGuide.linguisticTics[0] || 'I\'m wondering if'} you\'ve noticed this too?

The invitation here isn\'t to fix or change anything immediately, but simply to be present with what is. Sometimes that\'s the most supportive thing we can do for ourselves.

What feels most important to you about ${topic} right now?
`,
    format: 'reflection',
    wordCount: 120,
    tags: [topic, 'reflection', 'mindfulness']
  };
}

// Generate practical-style post
function generatePracticalPost(supporter, topic, voiceGuide) {
  return {
    title: `A Simple Approach to ${topic}`,
    content: `
Let\'s talk about ${topic} in a way that feels doable and real.

Here\'s what I\'ve found helpful:

1. **Start small**: ${voiceGuide.tone.includes('gentle') ? 'Gentle beginnings often lead to the most lasting change.' : 'Small steps create momentum.'}

2. **Notice what works**: Instead of focusing on what\'s not working, pay attention to the moments when things feel easier.

3. **Be curious**: ${voiceGuide.linguisticTics[1] || 'What if we tried'} approaching this with curiosity instead of judgment?

4. **Connect with others**: You don\'t have to figure this out alone.

The key is finding what resonates with you personally. What feels like it might work for your situation?
`,
    format: 'practical',
    wordCount: 140,
    tags: [topic, 'practical', 'tips']
  };
}

// Generate story-style post
function generateStoryPost(supporter, topic, voiceGuide) {
  return {
    title: `A Story About ${topic}`,
    content: `
I want to share something with you about ${topic}.

There was a time when I thought I had to have it all figured out. I believed that if I just tried harder, planned better, or found the right system, everything would fall into place.

But what I\'ve learned is that ${topic} isn\'t about perfection. It\'s about showing up, being present, and allowing ourselves to be human.

${voiceGuide.linguisticTics[2] || 'What I\'m noticing is'} that the most meaningful moments often come when we least expect them. When we\'re not trying so hard to make everything work.

The story isn\'t about getting it right. It\'s about being willing to show up, even when we don\'t know what comes next.

What\'s your story with ${topic}?
`,
    format: 'story',
    wordCount: 130,
    tags: [topic, 'story', 'personal']
  };
}

// Generate question-style post
function generateQuestionPost(supporter, topic, voiceGuide) {
  return {
    title: `Questions About ${topic}`,
    content: `
Sometimes the most helpful thing we can do is ask better questions.

When it comes to ${topic}, here are some that might serve you:

- What would this look like if it were easy?
- What am I not seeing that might be important?
- How do I want to feel about this in a month?
- What would I tell a friend in this situation?
- What\'s one small thing I could try differently?

${voiceGuide.linguisticTics[3] || 'I\'m wondering if'} these questions spark anything for you?

The goal isn\'t to find the "right" answer, but to open up new possibilities and perspectives.

What questions are most alive for you right now?
`,
    format: 'question',
    wordCount: 110,
    tags: [topic, 'questions', 'reflection']
  };
}

// Generate list-style post
function generateListPost(supporter, topic, voiceGuide) {
  return {
    title: `5 Things I\'ve Learned About ${topic}`,
    content: `
Here are five things I\'ve discovered about ${topic}:

**1. Small steps matter more than big plans**
${voiceGuide.tone.includes('gentle') ? 'Gentle progress often leads to lasting change.' : 'Consistency beats intensity every time.'}

**2. You don\'t have to do it alone**
Connection and support make everything easier.

**3. Curiosity is more helpful than judgment**
${voiceGuide.linguisticTics[0] || 'What if we tried'} approaching challenges with curiosity?

**4. What works for others might not work for you**
Your path is uniquely yours.

**5. Progress isn\'t always linear**
Some days will feel easier than others, and that\'s completely normal.

What resonates most with you from this list?
`,
    format: 'list',
    wordCount: 125,
    tags: [topic, 'list', 'lessons']
  };
}

// Generate random format post
function generateRandomFormatPost(supporter, topic, voiceGuide) {
  const formats = ['reflection', 'practical', 'story', 'question', 'list'];
  const randomFormat = formats[Math.floor(Math.random() * formats.length)];
  
  switch (randomFormat) {
    case 'reflection': return generateReflectionPost(supporter, topic, voiceGuide);
    case 'practical': return generatePracticalPost(supporter, topic, voiceGuide);
    case 'story': return generateStoryPost(supporter, topic, voiceGuide);
    case 'question': return generateQuestionPost(supporter, topic, voiceGuide);
    case 'list': return generateListPost(supporter, topic, voiceGuide);
    default: return generateReflectionPost(supporter, topic, voiceGuide);
  }
}

// Generate generic blog post fallback
function generateGenericBlogPost(topic) {
  return {
    title: `Thoughts on ${topic}`,
    content: `
I've been reflecting on ${topic} and wanted to share some thoughts that might be helpful.

Sometimes we get so focused on the big picture that we miss the small moments that actually matter most. What if we slowed down just a little and really paid attention to what's happening right now?

The invitation here isn't to fix or change anything immediately, but simply to be present with what is. Sometimes that's the most supportive thing we can do for ourselves.

What feels most important to you about ${topic} right now?
`,
    format: 'generic',
    wordCount: 100,
    tags: [topic, 'reflection']
  };
}

// Generate multiple blog posts for variability testing
export function generateMultipleBlogPosts(supporterId, topic, count = 3) {
  const posts = [];
  const formats = ['reflection', 'practical', 'story', 'question', 'list'];
  
  for (let i = 0; i < count; i++) {
    const format = formats[i % formats.length];
    posts.push(generateBlogPost(supporterId, topic, format));
  }
  
  return posts;
}

