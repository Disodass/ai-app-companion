import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useMenu } from '../contexts/MenuContext'
import { useAuth } from "../contexts/AuthContext";
import { generateAndSendAiMessageServer } from '../services/serverMessaging'
import {
  findOrCreateSupporterConversation,
  listenLatestMessages,
  sendMessage,
  markConversationRead
} from "../services/conversationService";
import { getSupporterById, AI_FRIEND } from '../data/supporters';
import { loadConversationMemory, getUserMemory } from '../services/memoryService';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate()
  const location = useLocation()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const { setMenuOpen } = useMenu()
  const unsubRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Get supporter data from location state or default to AI Friend
  const supporterId = location.state?.supporterId || 'ai-friend'
  const supporter = getSupporterById(supporterId) || AI_FRIEND
  const supporterName = supporter.name
  const supporterIcon = supporter.icon
  const supporterVoice = supporter.voice

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Initialize conversation and attach listener
  useEffect(() => {
    if (!user?.uid) { 
      console.log('⚠️ No user UID, skipping conversation setup');
      setLoading(false); 
      return; 
    }

    let isMounted = true;
    let currentConversationId = null; // Track which conversation we're using

    (async () => {
      try {
        // Find or create conversation FIRST (before cleaning up listener)
        // This prevents race conditions where we clean up and then find a different conversation
        console.log('🔍 Finding or creating supporter conversation for user:', user.uid, 'with supporter:', supporterId);
        const { id } = await findOrCreateSupporterConversation(user.uid, supporterId);
        const conversationId = id;
        currentConversationId = conversationId;
        console.log('✅ Using conversation:', conversationId);
        
        // Load user memory (global facts/preferences)
        try {
          const userMemory = await getUserMemory(user.uid);
          console.log('📚 Loaded user memory:', userMemory);
        } catch (error) {
          console.warn('⚠️ Could not load user memory:', error);
        }
        
        // Load conversation memory (fast access + summaries)
        try {
          const conversationMemory = await loadConversationMemory(conversationId);
          console.log('📚 Loaded conversation memory:', conversationMemory);
        } catch (error) {
          console.warn('⚠️ Could not load conversation memory:', error);
        }
        
        if (!isMounted) {
          console.log('⚠️ Component unmounted, aborting');
          return;
        }
        
        // Only clean up if we're switching to a different conversation
        if (unsubRef.current && convId !== conversationId) {
          console.log(`🧹 Cleaning up previous listener (switching from ${convId} to ${conversationId})`);
          unsubRef.current();
          unsubRef.current = null;
        } else if (unsubRef.current && convId === conversationId) {
          console.log(`✅ Already listening to conversation ${conversationId}, skipping setup`);
          return;
        }
        
        setConvId(conversationId);
        setLoading(true);
      
      unsubRef.current = listenLatestMessages(
        conversationId,
        (snap) => {
          if (!isMounted) return;
          
          console.log('📥 Raw snapshot received:', {
            size: snap.size,
            empty: snap.empty,
            docsLength: snap.docs?.length,
            conversationId,
            hasError: !!snap.error
          });
          
          // Check for query errors
          if (snap.error) {
            console.error('❌ Snapshot contains error:', snap.error);
            setError(`Failed to load messages: ${snap.error.message || 'Unknown error'}`);
            setMessages([]);
            setLoading(false);
            return;
          }
          
          if (!snap || !snap.docs) {
            console.warn('⚠️ Snapshot has no docs array');
            setMessages([]);
            setLoading(false);
            return;
          }
          
          const arr = snap.docs.map((d, index) => {
            try {
              const data = d.data();
              console.log(`📄 Message ${index}:`, {
                id: d.id,
                hasText: !!data.text,
                textLength: data.text?.length || 0,
                authorId: data.authorId,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || 'no date',
                encrypted: data.encrypted
              });
              
              return {
                id: d.id,
                text: data.text || '[No text content]',
                authorId: data.authorId,
                meta: data.meta || {},
                timestamp: data.createdAt?.toDate?.() || new Date(0),
                status: data.status
              };
            } catch (error) {
              console.error(`❌ Error processing message ${index}:`, error);
              return {
                id: d.id || `error-${index}`,
                text: '[Error loading message]',
                authorId: 'unknown',
                meta: {},
                timestamp: new Date(0),
                status: 'error'
              };
            }
          }).reverse();
          
          console.log('📥 Processed messages:', arr.length, 'messages');
          if (arr.length > 0) {
            console.log('📥 First message:', arr[0]);
            console.log('📥 Last message:', arr[arr.length - 1]);
          }
          
          setMessages(arr);
          setLoading(false);
          markConversationRead(conversationId, user.uid).catch(err => {
            console.warn('⚠️ Could not mark conversation as read:', err);
          });
        },
        500
      );
      } catch (error) {
        console.error('❌ Error setting up conversation listener:', error);
        setError(`Failed to load conversation: ${error.message}`);
        setLoading(false);
        setMessages([]);
      }
    })();

    return () => {
      isMounted = false;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [user?.uid, supporterId]);


  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || sending || !user || !convId) return

    const messageText = message
    setMessage('')
    setSending(true)

    try {
      // Send user message to Firestore
      await sendMessage(convId, user.uid, messageText, { role: 'user' })

            // Get AI response via server function - pass existing history and supporter ID
            const aiResponse = await generateAndSendAiMessageServer(convId, messageText, messages, { supporterId, userId: user.uid });
      
      // Send AI response to Firestore with authorId "assistant" for proper alignment
      await sendMessage(convId, 'assistant', aiResponse, { role: 'ai' });

    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message to local state
      setMessages(prev => [...prev, {
        id: `error:${Date.now()}`,
        text: "I'm sorry, I'm having trouble responding right now. Could you try again?",
        authorId: 'assistant',
        meta: { role: 'ai' },
        timestamp: new Date(),
        status: 'error'
      }])
    } finally {
      setSending(false)
    }
  }

  const handleBack = () => {
    navigate('/home')
  }

  const handleMenuToggle = () => {
    setMenuOpen(true)
  }

  return (
    <div className="h-screen bg-theme-primary text-theme-text flex flex-col">
      {/* Header - Fixed at top */}
      <div className="bg-theme-card border-b border-theme-border p-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleMenuToggle}
            className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
                 <h1 className="text-xl font-semibold">{supporterIcon} Bestibule - {supporterName}</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
            aria-label="Toggle dark mode"
          >
            <span className="text-2xl">{darkMode ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded m-4">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-theme-text-muted">Loading messages...</div>
            </div>
          ) : (
            <>
                     <div className="text-sm text-theme-text-muted text-center mb-4">
                       <div className="bg-theme-card border border-theme-border rounded-lg p-4 mb-4">
                         <div className="flex items-center justify-center space-x-2 mb-2">
                           <span className="text-2xl">{supporterIcon}</span>
                           <h3 className="text-lg font-semibold text-theme-text">{supporterName}</h3>
                         </div>
                         <p className="text-sm text-theme-text-secondary italic">"{supporterVoice}"</p>
                       </div>
                       <div className="text-xs text-theme-text-muted">
                         {messages.length} {messages.length === 1 ? 'message' : 'messages'} loaded
                         {convId && ` • Conversation: ${convId}`}
                       </div>
                     </div>
              {messages.length === 0 && !loading && (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center">
                    <div className="text-theme-text-muted mb-2">No messages yet</div>
                    <div className="text-sm text-theme-text-secondary">
                      Start a conversation with {supporterName}!
                    </div>
                  </div>
                </div>
              )}
              {messages.map((msg) => {
                // Robust bubble alignment: check both authorId and meta.role
                const isUser = msg.authorId === user?.uid || msg.meta?.role === 'user';
                const isAi = msg.authorId === 'assistant' || msg.meta?.role === 'ai';
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isUser
                          ? 'bg-brand-primary text-white'
                          : 'bg-theme-card border border-theme-border'
                      }`}
                    >
                      <div className="text-sm">{msg.text}</div>
                      <div className={`text-xs mt-1 ${
                        isUser ? 'text-brand-light' : 'text-theme-text-muted'
                      }`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-theme-card border border-theme-border max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="text-sm text-theme-text-muted">Thinking...</div>
                  </div>
                </div>
              )}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>


          {/* Message Input - Fixed at bottom */}
          <div className="border-t border-theme-border p-4 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 input-theme rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!message.trim() || sending}
                className="btn-brand-primary px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
      </div>
    </div>
  )
}
