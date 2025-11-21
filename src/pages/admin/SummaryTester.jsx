import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getConversationSummaries, getSummaryContext } from '../../services/conversationSummaryService'
import { collection, query, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../../firebaseConfig'
import AdminHeader from '../../components/admin/AdminHeader'

export default function SummaryTester() {
  const { user } = useAuth()
  const [conversationId, setConversationId] = useState(null)
  const [messageCount, setMessageCount] = useState(0)
  const [summaries, setSummaries] = useState([])
  const [aiContext, setAiContext] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('SummaryTester component mounted', { user: user?.email })
  }, [user])

  useEffect(() => {
    if (user?.uid) {
      findConversation()
    }
  }, [user?.uid])

  async function findConversation() {
    if (!user?.uid) return

    setLoading(true)
    setError('')

    try {
      // Try both conversation ID formats
      const convId1 = `dm_${user.uid}`
      const convId2 = `dm__${user.uid}`

      for (const convId of [convId1, convId2]) {
        const convRef = doc(db, 'conversations', convId)
        const convSnap = await getDoc(convRef)

        if (convSnap.exists()) {
          // Check if it has messages
          const messagesRef = collection(db, 'conversations', convId, 'messages')
          const messagesQuery = query(messagesRef, limit(1))
          const messagesSnap = await getDocs(messagesQuery)

          if (!messagesSnap.empty) {
            // Get total message count
            const allMessages = await getDocs(messagesRef)
            setConversationId(convId)
            setMessageCount(allMessages.size)
            await loadSummaries(convId)
            setLoading(false)
            return
          }
        }
      }

      setError('No conversation with messages found. Try chatting first!')
      setLoading(false)
    } catch (err) {
      console.error('Error finding conversation:', err)
      setError(`Error: ${err.message}`)
      setLoading(false)
    }
  }

  async function loadSummaries(convId) {
    try {
      const summariesList = await getConversationSummaries(convId, 20)
      setSummaries(summariesList)

      // Load AI context preview
      const context = await getSummaryContext(convId, 3)
      setAiContext(context)
    } catch (err) {
      console.error('Error loading summaries:', err)
      setError(`Error loading summaries: ${err.message}`)
    }
  }

  async function generateSummaries() {
    if (!conversationId) {
      setError('No conversation found')
      return
    }

    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      // Call the HTTP Cloud Function endpoint
      const region = 'us-central1'
      const projectId = 'ai-app-companion'
      const url = `https://${region}-${projectId}.cloudfunctions.net/generateAllSummaries`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          batchSize: 15
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('Generation result:', result)
      setSuccess(`Successfully generated summaries! Created ${result.summariesCreated || 0} summaries from ${result.totalMessages || 0} messages.`)

      // Reload summaries after a short delay
      setTimeout(() => {
        loadSummaries(conversationId)
      }, 2000)
    } catch (err) {
      console.error('Error generating summaries:', err)
      setError(`Error generating summaries: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  // Debug: Always show something to verify component is rendering
  console.log('SummaryTester rendering', { user: user?.email, loading, conversationId })

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <AdminHeader />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center text-theme-text">
            <div className="text-2xl mb-4">Summary Tester</div>
            <div>Loading conversation data...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-text mb-2">Summary Tester</h1>
          <p className="text-theme-text-secondary">Test conversation summary generation and view AI context</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {conversationId && (
          <>
            {/* Conversation Info */}
            <div className="mb-8 p-6 bg-theme-surface rounded-lg border border-theme-border">
              <h2 className="text-xl font-semibold text-theme-text mb-4">Conversation Info</h2>
              <div className="space-y-2 text-theme-text-secondary">
                <div><strong>Conversation ID:</strong> <code className="bg-theme-primary px-2 py-1 rounded">{conversationId}</code></div>
                <div><strong>Total Messages:</strong> {messageCount}</div>
                <div><strong>Existing Summaries:</strong> {summaries.length}</div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="mb-8">
              <button
                onClick={generateSummaries}
                disabled={generating}
                className="px-6 py-3 bg-brand-accent text-white rounded-lg font-medium hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? 'Generating Summaries...' : 'Generate Summaries'}
              </button>
              <p className="mt-2 text-sm text-theme-text-secondary">
                This will process messages in batches of 15 with 3-second delays between batches.
              </p>
            </div>

            {/* AI Context Preview */}
            {aiContext && (
              <div className="mb-8 p-6 bg-theme-surface rounded-lg border border-theme-border">
                <h2 className="text-xl font-semibold text-theme-text mb-4">AI Context Preview</h2>
                <p className="text-sm text-theme-text-secondary mb-3">
                  This is what gets added to the AI's system prompt (last 3 summaries):
                </p>
                <pre className="bg-theme-primary p-4 rounded border border-theme-border text-sm text-theme-text overflow-x-auto whitespace-pre-wrap">
                  {aiContext || '(No summaries yet)'}
                </pre>
              </div>
            )}

            {/* Summaries List */}
            <div className="p-6 bg-theme-surface rounded-lg border border-theme-border">
              <h2 className="text-xl font-semibold text-theme-text mb-4">
                Summaries ({summaries.length})
              </h2>

              {summaries.length === 0 ? (
                <div className="text-theme-text-secondary text-center py-8">
                  No summaries yet. Click "Generate Summaries" to create them.
                </div>
              ) : (
                <div className="space-y-6">
                  {summaries.map((summary, idx) => (
                    <div key={summary.id || idx} className="p-4 bg-theme-primary rounded border border-theme-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-theme-text">
                            Summary {idx + 1}
                          </div>
                          <div className="text-sm text-theme-text-secondary">
                            {summary.messageCount} messages • {summary.emotionalTone || 'neutral'} tone
                          </div>
                        </div>
                        {summary.createdAt && (
                          <div className="text-xs text-theme-text-secondary">
                            {summary.createdAt.toDate ? summary.createdAt.toDate().toLocaleString() : 'Unknown date'}
                          </div>
                        )}
                      </div>

                      {summary.summaryText && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-theme-text-secondary mb-1">Summary:</div>
                          <div className="text-theme-text">{summary.summaryText}</div>
                        </div>
                      )}

                      {summary.keyThemes && summary.keyThemes.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-theme-text-secondary mb-1">Themes:</div>
                          <div className="text-theme-text">{summary.keyThemes.join(', ')}</div>
                        </div>
                      )}

                      {summary.importantFacts && summary.importantFacts.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-theme-text-secondary mb-1">Important Facts:</div>
                          <div className="text-theme-text text-sm">{summary.importantFacts.slice(0, 5).join('; ')}</div>
                        </div>
                      )}

                      {summary.userPreferences && summary.userPreferences.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-theme-text-secondary mb-1">Preferences:</div>
                          <div className="text-theme-text text-sm">{summary.userPreferences.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

