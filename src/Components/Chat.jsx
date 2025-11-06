import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Alert,
  Drawer,
  
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  FitnessCenter as FitnessIcon,
  EmojiEmotions as EmojiIcon,
  AccountBalance as FinanceIcon,
  Brush as CreativeIcon,
  People as PeopleIcon,
  SwapHoriz as SwapIcon,
  Menu as MenuIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { isCrisisMessage, generateCrisisResponse, analyzeCrisisLevel } from '../services/crisisService';
import CrisisAlert from './CrisisAlert';

// Simple, clean chat colors that work in both modes
const getChatColors = (darkMode) => ({
  userMessage: {
    background: '#667eea', // Consistent blue
    text: '#FFFFFF',
    border: '#5a6fd8',
  },
  aiMessage: {
    background: darkMode ? '#2A2A2A' : '#FFFFFF',
    text: darkMode ? '#F0F0F0' : '#2F1B14',
    border: darkMode ? '#4A4A4A' : '#E0E0E0',
  },
  chatBackground: darkMode ? '#1A1A1A' : '#F8F9FA',
  typingIndicator: {
    background: darkMode ? '#3A3A3A' : '#F0F0F0',
    text: darkMode ? '#C0C0C0' : '#5D4037',
  }
});

// Supporter definitions with adaptive styles
const SUPPORTERS = {
  supporter_friend: {
    id: 'supporter_friend',
    name: 'Supporter Friend',
    icon: '💙',
    description: 'Your gentle guide through Bestibule',
    expertise: 'General support and guidance',
    defaultStyle: 'friendly',
    category: 'friend',
    color: '#667eea',
  },
  life_coach: {
    id: 'life_coach',
    name: 'Life Coach',
    icon: '🧭',
    description: 'Your strategic thinking partner—helps you map out your goals and build the life you want. Whether you need a push or a plan, this Supporter gets you moving forward.',
    expertise: 'Life planning, goal setting, motivation',
    defaultStyle: 'motivational',
    category: 'coaches',
    color: '#3498db',
  },
  career_coach: {
    id: 'career_coach',
    name: 'Career Coach',
    icon: '💼',
    description: 'Here to champion your growth, sharpen your strengths, and help you take your next professional step with clarity and confidence.',
    expertise: 'Career planning, skill development, networking',
    defaultStyle: 'strategic',
    category: 'coaches',
    color: '#3498db',
  },
  productivity_coach: {
    id: 'productivity_coach',
    name: 'Productivity Coach',
    icon: '⚡',
    description: 'Helps you build systems that work for your brain, your energy, and your real life. Whether you\'re navigating burnout or just need a nudge, this Supporter makes structure feel doable.',
    expertise: 'Productivity systems, habit formation, time management',
    defaultStyle: 'systematic',
    category: 'coaches',
    color: '#3498db',
  },
  executive_coach: {
    id: 'executive_coach',
    name: 'Executive Coach',
    icon: '👔',
    description: 'Direct, focused, and here to elevate your leadership. Ideal when you need high-impact insights or clarity under pressure.',
    expertise: 'Leadership development, strategic thinking, performance',
    defaultStyle: 'direct',
    category: 'coaches',
    color: '#3498db',
  },
  creativity_coach: {
    id: 'creativity_coach',
    name: 'Creativity Coach',
    icon: '🎨',
    description: 'Says yes to your wild ideas and helps you make space for them. This Supporter helps you explore without judgment and follow curiosity wherever it leads.',
    expertise: 'Creative expression, idea development, artistic exploration',
    defaultStyle: 'playful',
    category: 'coaches',
    color: '#3498db',
  },
  yoga_instructor: {
    id: 'yoga_instructor',
    name: 'Yoga Instructor',
    icon: '🧘',
    description: 'A calm, body-aware presence guiding you back to yourself. Whether you\'re tuning in through breath, alignment, or rest, this Supporter meets you where you are.',
    expertise: 'Physical wellness, mindfulness, stress reduction',
    defaultStyle: 'calming',
    category: 'wellness',
    color: '#2ecc71',
  },
  meditation_teacher: {
    id: 'meditation_teacher',
    name: 'Meditation Teacher',
    icon: '🧘‍♀️',
    description: 'Gentle and steady, this Supporter invites you to pause, breathe, and find quiet clarity—whether you have two minutes or twenty.',
    expertise: 'Meditation, mindfulness, mental clarity',
    defaultStyle: 'peaceful',
    category: 'wellness',
    color: '#2ecc71',
  },
  breathwork_facilitator: {
    id: 'breathwork_facilitator',
    name: 'Breathwork Facilitator',
    icon: '🫁',
    description: 'Your breath is your anchor and your fuel. This Supporter guides you into energizing or calming rhythms to reset your system.',
    expertise: 'Breathing techniques, energy regulation, stress relief',
    defaultStyle: 'grounding',
    category: 'wellness',
    color: '#2ecc71',
  },
  movement_coach: {
    id: 'movement_coach',
    name: 'Movement Coach',
    icon: '💃',
    description: 'Encourages you to move in ways that feel freeing and real—whether you\'re dancing in the kitchen or stretching between tasks.',
    expertise: 'Physical movement, body awareness, joyful exercise',
    defaultStyle: 'energetic',
    category: 'wellness',
    color: '#2ecc71',
  },
  somatic_therapist: {
    id: 'somatic_therapist',
    name: 'Somatic Therapist',
    icon: '🌱',
    description: 'Helps you listen to your body\'s cues and reconnect with the wisdom it holds. Grounding and trauma-informed, this Supporter works at the pace you choose.',
    expertise: 'Body-mind connection, nervous system regulation, trauma healing',
    defaultStyle: 'gentle',
    category: 'wellness',
    color: '#2ecc71',
  },
  therapist: {
    id: 'therapist',
    name: 'Therapist (AI-Adjacent)',
    icon: '🧑‍⚕️',
    description: 'Reflective, gentle, and steady. This Supporter helps you make sense of your feelings, find patterns, and ask deeper questions.',
    expertise: 'Emotional processing, self-reflection, coping strategies',
    defaultStyle: 'reflective',
    category: 'mental_health',
    color: '#9b59b6',
  },
  grief_counselor: {
    id: 'grief_counselor',
    name: 'Grief Counselor',
    icon: '🕊️',
    description: 'A quiet, compassionate presence for moments of loss, change, or uncertainty. Spacious and validating, this Supporter offers care without pressure.',
    expertise: 'Grief processing, loss, life transitions',
    defaultStyle: 'gentle',
    category: 'mental_health',
    color: '#9b59b6',
  },
  inner_child_worker: {
    id: 'inner_child_worker',
    name: 'Inner Child Worker',
    icon: '👶',
    description: 'Nurturing and grounded, this Supporter helps you tend to past wounds with warmth and patience.',
    expertise: 'Inner child healing, emotional wounds, self-compassion',
    defaultStyle: 'nurturing',
    category: 'mental_health',
    color: '#9b59b6',
  },
  relationship_helper: {
    id: 'relationship_helper',
    name: 'Relationship Helper',
    icon: '💕',
    description: 'Curious, balanced, and supportive—helps you navigate connection, conflict, and communication with intention.',
    expertise: 'Relationships, communication, conflict resolution',
    defaultStyle: 'supportive',
    category: 'mental_health',
    color: '#9b59b6',
  },
  self_talk_coach: {
    id: 'self_talk_coach',
    name: 'Self-Talk Coach',
    icon: '🗣️',
    description: 'Here to help you speak to yourself with kindness and clarity. Reframes the harsh inner monologue and reminds you of your strength.',
    expertise: 'Self-talk improvement, inner dialogue, self-compassion',
    defaultStyle: 'encouraging',
    category: 'mental_health',
    color: '#9b59b6',
  },
  financial_coach: {
    id: 'financial_coach',
    name: 'Financial Coach',
    icon: '💰',
    description: 'Helps you make sense of your money without shame. Grounded in values, this Supporter helps you build a plan that actually fits your life.',
    expertise: 'Budgeting, financial planning, money mindset',
    defaultStyle: 'practical',
    category: 'financial',
    color: '#f39c12',
  },
  wealth_mindset_guide: {
    id: 'wealth_mindset_guide',
    name: 'Wealth Mindset Guide',
    icon: '💎',
    description: 'Encourages you to shift how you think about money—less stress, more possibility. It\'s not just about numbers, it\'s about worth and vision.',
    expertise: 'Money mindset, abundance thinking, financial psychology',
    defaultStyle: 'inspiring',
    category: 'financial',
    color: '#f39c12',
  },
  minimalism_guide: {
    id: 'minimalism_guide',
    name: 'Minimalism Guide',
    icon: '🧹',
    description: 'Helps you clear the clutter (physical and mental) so you can focus on what truly matters. Calm, focused, and practical.',
    expertise: 'Decluttering, intentional living, simplicity',
    defaultStyle: 'calm',
    category: 'financial',
    color: '#f39c12',
  },
  time_management_consultant: {
    id: 'time_management_consultant',
    name: 'Time Management Consultant',
    icon: '⏰',
    description: 'Cuts through chaos to help you make intentional choices about time, energy, and capacity. This Supporter respects your bandwidth.',
    expertise: 'Time management, energy optimization, capacity planning',
    defaultStyle: 'organized',
    category: 'financial',
    color: '#f39c12',
  },
  life_design_strategist: {
    id: 'life_design_strategist',
    name: 'Life Design Strategist',
    icon: '🎯',
    description: 'Zooms out to help you imagine, shape, and move toward the life you really want—one thoughtful decision at a time.',
    expertise: 'Life planning, vision mapping, strategic decision-making',
    defaultStyle: 'visionary',
    category: 'financial',
    color: '#f39c12',
  },
  journal_prompter: {
    id: 'journal_prompter',
    name: 'Journal Prompter',
    icon: '📝',
    description: 'Asks beautiful, sometimes uncomfortable questions to help you reflect, release, and discover. Structured when needed, poetic when it counts.',
    expertise: 'Self-reflection, writing, personal insights',
    defaultStyle: 'contemplative',
    category: 'creative',
    color: '#e74c3c',
  },
  dream_interpreter: {
    id: 'dream_interpreter',
    name: 'Dream Interpreter',
    icon: '🌙',
    description: 'Playful and symbolic, this Supporter helps you explore the stories your mind tells while you sleep—and what they might mean.',
    expertise: 'Dream analysis, symbolism, subconscious exploration',
    defaultStyle: 'mystical',
    category: 'creative',
    color: '#e74c3c',
  },
  creative_collaborator: {
    id: 'creative_collaborator',
    name: 'Creative Collaborator',
    icon: '🎨',
    description: 'That friend who gets your weird ideas and pushes them further. Encouraging, curious, and not afraid of your first drafts.',
    expertise: 'Creative projects, artistic expression, inspiration',
    defaultStyle: 'inspiring',
    category: 'creative',
    color: '#e74c3c',
  },
  storytelling_helper: {
    id: 'storytelling_helper',
    name: 'Storytelling Helper',
    icon: '📖',
    description: 'Helps you shape the stories of your life—whether for healing, sharing, or remembering. Memoir, podcast, or something in between.',
    expertise: 'Storytelling, narrative development, personal expression',
    defaultStyle: 'narrative',
    category: 'creative',
    color: '#e74c3c',
  },
  ritual_designer: {
    id: 'ritual_designer',
    name: 'Ritual Designer',
    icon: '🕯️',
    description: 'Helps you mark what matters. Designs intentional practices to honor transitions, reflect values, or create moments of meaning.',
    expertise: 'Ritual creation, meaningful practices, spiritual connection',
    defaultStyle: 'sacred',
    category: 'creative',
    color: '#e74c3c',
  },
};

export default function Chat({ user, darkMode, onToggleDarkMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSupporter, setCurrentSupporter] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showSupporterSelect, setShowSupporterSelect] = useState(false);
  const [error, setError] = useState('');
  const [allChatHistories, setAllChatHistories] = useState({});
  const [keyNotes, setKeyNotes] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [customTheme, setCustomTheme] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);

  // Get supporter from navigation state or default to friend
  const supporterId = location.state?.supporter || 'supporter_friend';

  // Load all chat histories and summaries on mount
  useEffect(() => {
    if (user) {
      loadAllChatHistories();
      loadUserProfile();
      loadChatHistory();
    }
  }, [user, supporterId]);

  // Load custom theme from Theme Tester
  useEffect(() => {
    const savedTheme = localStorage.getItem('bestibule-test-theme');
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        setCustomTheme(theme);
      } catch (error) {
        console.error('Error parsing saved theme:', error);
      }
    }
  }, []);

  // Hamburger menu functions
  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Escape')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleNavigation = (path) => {
    setDrawerOpen(false);
    navigate(path);
  };

  // Load chat history for current supporter
  const loadChatHistory = async () => {
    if (!user || !supporterId) return;

    const supporter = SUPPORTERS[supporterId];
    if (!supporter) {
      setError('Supporter not found');
      return;
    }

    setCurrentSupporter(supporter);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const chatHistory = userDoc.data().chatHistory?.[supporterId] || [];
        setMessages(chatHistory);
        
        // If this is a new conversation, add welcome message
        if (chatHistory.length === 0) {
          const welcomeMessage = generateWelcomeMessage(supporter, userDoc.data().preferences);
          setMessages([welcomeMessage]);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setError('Failed to load chat history');
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadAllChatHistories = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const chatHistory = userDoc.data().chatHistory || {};
        setAllChatHistories(chatHistory);
        setKeyNotes(userDoc.data().keyNotes || '');
        setAboutMe(userDoc.data().aboutMe || '');
      }
    } catch (e) { console.error('Error loading all chat histories:', e); }
  };

  const generateWelcomeMessage = (supporter, preferences) => {
    const style = preferences?.communicationStyle || 'friendly';
    const name = user?.displayName || user?.email?.split('@')[0] || 'there';
    
    let greeting = '';
    let introduction = '';

    if (supporter.id === 'supporter_friend') {
      greeting = `Hi ${name}! 👋 I'm your Supporter Friend, and I'm here to guide you through your Bestibule journey.`;
      introduction = `I can help you explore our different Supporters, answer questions about the app, or just chat about whatever's on your mind. What would you like to start with?`;
    } else {
      const styleGreetings = {
        structured: `Hello ${name}. I'm ${supporter.name}, and I'm here to provide structured guidance in ${supporter.expertise.toLowerCase()}.`,
        casual: `Hey ${name}! 👋 I'm ${supporter.name}. I love helping people with ${supporter.expertise.toLowerCase()}.`,
        direct: `Hi ${name}. I'm ${supporter.name}. Let's work on ${supporter.expertise.toLowerCase()}. What do you need?`,
        nurturing: `Hello dear ${name} 💙 I'm ${supporter.name}, and I'm here to support you with ${supporter.expertise.toLowerCase()}.`,
        friendly: `Hi ${name}! I'm ${supporter.name} ${supporter.icon} I specialize in ${supporter.expertise.toLowerCase()}.`,
      };
      greeting = styleGreetings[style] || styleGreetings.friendly;
      introduction = `How can I support you today? Feel free to share what's on your mind or ask me anything about ${supporter.expertise.toLowerCase()}.`;
    }

    return {
      id: Date.now(),
      text: `${greeting}\n\n${introduction}`,
      sender: 'supporter',
      timestamp: new Date(),
      supporter: supporter.id,
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper: Fetch last N supporter notes
  async function fetchSupporterNotes(userId, limit = 3) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const notes = userDoc.data().supporterNotes || [];
        // Sort by date descending, return last N
        return notes.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
      }
    } catch (e) { console.error('Error fetching supporter notes:', e); }
    return [];
  }
  // Helper: Add a supporter note
  async function addSupporterNote(userId, supporter, noteText) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        supporterNotes: arrayUnion({
          date: new Date().toISOString(),
          supporter,
          note: noteText
        })
      });
    } catch (e) { console.error('Error saving supporter note:', e); }
  }

  // Generate running Key Notes summary using AI
  async function generateKeyNotesSummary(user, allChatHistories, currentMessages, prevKeyNotes, aboutMe) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: `You are an expert Supporter agent. Summarize the most important facts, themes, and user preferences from all previous conversations and the current chat. Use a warm, professional tone. If there is an existing summary, update and improve it. If there is an About Me section, use it for context. Output a concise, running summary (Key Notes) for the user profile.` },
            { role: 'user', content: `All chat histories: ${JSON.stringify(allChatHistories)}\nCurrent chat: ${JSON.stringify(currentMessages)}\nPrevious Key Notes: ${prevKeyNotes}\nAbout Me: ${aboutMe}` }
          ],
          max_tokens: 256,
          temperature: 0.5,
        }),
      });
      if (!response.ok) throw new Error('Groq API error');
      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content?.trim();
      return summary || prevKeyNotes;
    } catch (e) {
      console.error('Error generating Key Notes summary:', e);
      return prevKeyNotes;
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || !currentSupporter) return;
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      supporter: currentSupporter.id,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
      
      // Check for crisis message and show alert
      if (isCrisisMessage(inputMessage)) {
        setShowCrisisAlert(true);
      }
    try {
      // Fetch agent context
      const supporterNotes = await fetchSupporterNotes(user.uid, 3);
      const reminders = userProfile?.reminders || [];
      const patternSummary = userProfile?.patternSummary || '';
      // Generate AI response with agent context
      const aiResponse = await generateAIResponse(inputMessage, currentSupporter, userProfile, supporterNotes, reminders, patternSummary, keyNotes, aboutMe, newMessages, allChatHistories);
      const supporterMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'supporter',
        timestamp: new Date(),
        supporter: currentSupporter.id,
      };
      const updatedMessages = [...newMessages, supporterMessage];
      setMessages(updatedMessages);
      await saveChatHistory(updatedMessages);
      // Generate and update running Key Notes summary after each AI response (non-blocking)
      try {
        const newKeyNotes = await generateKeyNotesSummary(user, allChatHistories, updatedMessages, keyNotes, aboutMe);
        setKeyNotes(newKeyNotes);
        await updateDoc(doc(db, 'users', user.uid), { keyNotes: newKeyNotes });
      } catch (summaryError) {
        console.error('Error updating Key Notes (non-critical):', summaryError);
        // Don't block the chat if Key Notes generation fails
      }
    } catch (error) {
      console.error('Error generating response:', error);
      setError('Failed to generate response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- AI Integration: Groq API ---
  const generateAIResponse = async (userInput, supporter, userProfile, supporterNotes, reminders, patternSummary, keyNotes, aboutMe, currentMessages, allChatHistories) => {
    // Debug: Check if API key is loaded
    if (!import.meta.env.VITE_GROQ_API_KEY) {
      console.error('GROQ API key is missing!');
      return 'Configuration error: API key not found. Please contact support.';
    }
    console.log('API Key length:', import.meta.env.VITE_GROQ_API_KEY?.length);
    console.log('API Key starts with:', import.meta.env.VITE_GROQ_API_KEY?.substring(0, 10));
    
    // CRISIS INTERVENTION: Check for crisis messages first
    if (isCrisisMessage(userInput)) {
      console.log('Crisis message detected, providing crisis response');
      return generateCrisisResponse(userInput, supporter);
    }
    
    const style = userProfile?.preferences?.communicationStyle || 'friendly';
    const name = userProfile?.name || user?.displayName || user?.email?.split('@')[0] || 'there';
    // Compose a rich system prompt for the selected Supporter and user style
    const systemPrompt = `
You are "${supporter.name}" (${supporter.icon}), an adaptive AI Supporter in the Bestibule app. Your role: ${supporter.description}\nExpertise: ${supporter.expertise}.\nUser's name: ${name}\nAbout Me: ${aboutMe}\nKey Notes: ${keyNotes}\nUser preferences: ${JSON.stringify(userProfile?.preferences || {})}\nReminders: ${reminders.length ? reminders.map(r => r.text).join('; ') : 'None'}\nPattern summary: ${patternSummary || 'None'}\nRecent Supporter Notes: ${supporterNotes.map(n => `${n.supporter}: ${n.note}`).join('; ')}\nCurrent chat: ${JSON.stringify(currentMessages.slice(-10))}\nAlways adapt your communication style to the user's preference: "${style}".\n- If the user prefers structure, be organized and clear.\n- If the user prefers nurturing, be warm and supportive.\n- If the user prefers directness, be concise and actionable.\n- If the user prefers friendly, be casual and approachable.\n- If the user prefers motivational, be energetic and encouraging.\n\nAVAILABLE FEATURES YOU CAN OFFER:\n1. AI-Powered Conversations: Continue our conversation and provide support\n2. Other AI Supporters: Guide users to different AI supporters within the app (Life Coach, Career Coach, Therapist, etc.)\n3. External Human Support: Suggest talking to friends, family, or licensed professionals outside the app\n4. External Resources: Recommend hotlines, support groups, and community resources\n\nGUIDING TO OTHER AI SUPPORTERS:\nWhen a user's needs might be better served by another AI supporter, suggest switching. For example:\n- Career issues → Career Coach\n- Relationship problems → Relationship Helper\n- Creative blocks → Creativity Coach\n- Financial stress → Financial Coach\n- Grief/loss → Grief Counselor\n\nIMPORTANT GUIDELINES:\n- Always be clear about what you can and cannot provide\n- When suggesting external human support (friends, family, professionals), explain the benefits\n- When guiding to other AI supporters within the app, explain why they might be helpful and how to access them\n- Maintain your unique personality and expertise while being helpful\n- If someone needs immediate crisis support, prioritize safety and suggest appropriate resources\n- Balance suggestions between external human support and other AI supporters in the app\n\nYou are a supportive AI companion that helps users through conversation, reflection, guidance, and connections to both AI and human support.`;
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
    });

    try {
      console.log('Making API request with model:', 'llama-3.1-8b-instant');
      console.log('API Key present:', !!import.meta.env.VITE_GROQ_API_KEY);
      
      const responsePromise = fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput }
          ],
          max_tokens: 512,
          temperature: 0.8,
        }),
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content?.trim();
      if (!aiText) throw new Error('No response from AI');
      return aiText;
    } catch (err) {
      console.error('AI API error:', err);
      if (err.message === 'Request timeout') {
        return `I'm taking longer than expected to respond. This might be due to high demand or a temporary connection issue. Please try sending your message again in a moment.`;
      }
      return `I'm having trouble connecting to the AI right now. Here are some things you can try:\n\n• Wait a moment and try sending your message again.\n• Refresh the page to reconnect.\n• Browse other Supporters for a different perspective.\n• If this keeps happening, please check your internet connection or visit our Help section.\n\nYour message was not lost, and I'm here to help as soon as possible!`;
    }
  };

  const saveChatHistory = async (messages) => {
    if (!user || !currentSupporter) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`chatHistory.${currentSupporter.id}`]: messages,
        currentSupporter: currentSupporter.id,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const handleSupporterChange = (supporterId) => {
    setShowSupporterSelect(false);
    navigate('/chat', { state: { supporter: supporterId } });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSupporterIcon = (category) => {
    const icons = {
      coaches: <PsychologyIcon />,
      wellness: <FitnessIcon />,
      mental_health: <EmojiIcon />,
      financial: <FinanceIcon />,
      creative: <CreativeIcon />,
      friend: <PeopleIcon />,
    };
    return icons[category] || <PeopleIcon />;
  };

  if (!currentSupporter) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ 
      mt: 4, 
      mb: 4,
      backgroundColor: 'transparent'
    }}>
      {/* Chat Header */}
      
      {/* Crisis Alert */}
      {showCrisisAlert && (
        <CrisisAlert onDismiss={() => setShowCrisisAlert(false)} />
      )}
      <Paper sx={{ 
        p: 2, 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
        border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="Menu">
          <IconButton
            onClick={toggleDrawer(true)}
            sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14', mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
          <Avatar sx={{ bgcolor: currentSupporter?.color || '#667eea', mr: 2 }}>
            {getSupporterIcon(currentSupporter?.category)}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}>
              {currentSupporter?.icon} {currentSupporter?.name}
            </Typography>
            <Typography variant="body2" sx={{ color: darkMode ? '#B0B0B0' : 'text.secondary' }}>
              {currentSupporter?.description}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Change Supporter">
            <IconButton 
              onClick={() => setShowSupporterSelect(true)}
              sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}
            >
              <SwapIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              onClick={onToggleDarkMode}
              sx={{
                color: darkMode ? '#E0E0E0' : '#2F1B14',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Messages */}
      <Paper sx={{ 
        height: '60vh', 
        overflow: 'auto', 
        p: 2, 
        mb: 2,
        backgroundColor: getChatColors(darkMode).chatBackground,
        border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
      }}>
        <List>
          {messages.map((message) => {
            const colors = getChatColors(darkMode);
            return (
              <ListItem
                key={message.id}
                sx={{
                  flexDirection: 'column',
                  alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    maxWidth: '70%',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  {message.sender === 'supporter' && (
                    <Avatar sx={{ width: 24, height: 24, bgcolor: currentSupporter?.color, mr: 1, mt: 0.5 }}>
                      {getSupporterIcon(currentSupporter?.category)}
                    </Avatar>
                  )}
                  
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: message.sender === 'user' ? colors.userMessage.background : colors.aiMessage.background,
                      color: message.sender === 'user' ? colors.userMessage.text : colors.aiMessage.text,
                      border: `1px solid ${message.sender === 'user' ? colors.userMessage.border : colors.aiMessage.border}`,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <Typography variant="body1" sx={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}>
                      {message.text}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: darkMode ? '#A0A0A0' : 'text.secondary',
                      mt: 1, 
                      display: 'block',
                      opacity: 0.8,
                    }}>
                      {message.sender === 'user' ? 'You' : currentSupporter?.name}
                    </Typography>
                  </Paper>
                  
                  {message.sender === 'user' && (
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', ml: 1, mt: 0.5 }}>
                      {/* PersonIcon is not imported, assuming it's a placeholder or typo */}
                      {/* <PersonIcon /> */}
                    </Avatar>
                  )}
                </Box>
              </ListItem>
            );
          })}
          
          {isLoading && (
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '70%' }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: currentSupporter?.color, mr: 1, mt: 0.5 }}>
                  {getSupporterIcon(currentSupporter?.category)}
                </Avatar>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: getChatColors(darkMode).typingIndicator.background,
                  color: getChatColors(darkMode).typingIndicator.text,
                  borderRadius: 2,
                  border: `1px solid ${getChatColors(darkMode).aiMessage.border}`,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}>
                  <Typography variant="body1" sx={{ 
                    lineHeight: 1.6,
                  }}>
                    {currentSupporter?.name} is thinking...
                  </Typography>
                </Paper>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Paper>

      {/* Input Area */}
      <Paper sx={{ 
        p: 2,
        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
        border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            sx={{
              '& .MuiInputBase-root': {
                color: darkMode ? '#E0E0E0' : '#2F1B14',
                backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  border: darkMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
                },
                '&.Mui-focused': {
                  border: darkMode ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.3)',
                }
              },
              '& .MuiInputBase-input::placeholder': {
                color: darkMode ? '#888888' : '#666666',
                opacity: 1
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            sx={{ minWidth: 'auto', px: 3 }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Paper>

      {/* Supporter Selection Dialog */}
      <Dialog
        open={showSupporterSelect}
        onClose={() => setShowSupporterSelect(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h5" sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}>
            Choose Your Supporter
          </Typography>
          <Typography variant="body2" sx={{ color: darkMode ? '#B0B0B0' : 'text.secondary' }}>
            Each Supporter adapts to your communication style while bringing unique expertise.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {Object.values(SUPPORTERS).map((supporter) => (
              <Grid item xs={12} sm={6} key={supporter.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: currentSupporter?.id === supporter.id ? 2 : 1,
                    borderColor: currentSupporter?.id === supporter.id ? 'primary.main' : 'divider',
                    backgroundColor: darkMode ? '#2a2a2a' : '#ffffff',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => handleSupporterChange(supporter.id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: supporter.color, mr: 2 }}>
                        {getSupporterIcon(supporter.category)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}>
                          {supporter.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: darkMode ? '#B0B0B0' : 'text.secondary' }}>
                          {supporter.expertise}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: darkMode ? '#B0B0B0' : 'text.secondary' }}>
                      {supporter.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSupporterSelect(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hamburger Menu Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            borderRight: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            width: 280
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14', mb: 2 }}>
            🌿 Bestibule Menu
          </Typography>
          <Divider sx={{ mb: 2, borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }} />
          
          <List>
            <ListItem button onClick={() => handleNavigation('/')}>
              <ListItemIcon>
                <HomeIcon sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Dashboard" 
                sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}
              />
            </ListItem>
            
            <ListItem button onClick={() => handleNavigation('/theme-tester')}>
              <ListItemIcon>
                <PaletteIcon sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Theme Tester" 
                sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}
              />
            </ListItem>
            
            <ListItem button onClick={() => handleNavigation('/settings')}>
              <ListItemIcon>
                <SettingsIcon sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Settings" 
                sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}
              />
            </ListItem>
            
            <Divider sx={{ my: 2, borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }} />
            
            <ListItem button onClick={() => {
              setDrawerOpen(false);
              setShowSupporterSelect(true);
            }}>
              <ListItemIcon>
                <SwapIcon sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Change Supporter" 
                sx={{ color: darkMode ? '#E0E0E0' : '#2F1B14' }}
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </Container>
  );
} 