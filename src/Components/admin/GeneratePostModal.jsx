import React, { useState, useEffect } from 'react'
import { getAllActiveSupporters, AI_FRIEND } from '../../data/supporters'
import { generateAIBlogPost, generateBlogIdeas } from '../../services/aiBlogGenerator'
import { createBlogPost, getLastPostBySupporter } from '../../services/blogService'
import { getTodayCategory, getNextSupporter, getSupportersInCategory } from '../../services/schedulingService'
import WeeklySummaryModal from './WeeklySummaryModal'

export default function GeneratePostModal({ onClose, onPostGenerated }) {
  const [selectedSupporter, setSelectedSupporter] = useState('')
  const [topic, setTopic] = useState('')
  const [format, setFormat] = useState('random')
  const [generating, setGenerating] = useState(false)
  const [generatingIdeas, setGeneratingIdeas] = useState(false)
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [continueFromLast, setContinueFromLast] = useState(false)
  const [lastPost, setLastPost] = useState(null)
  const [useScheduling, setUseScheduling] = useState(true)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [suggestedContinuationTopic, setSuggestedContinuationTopic] = useState('')

  const allSupporters = [AI_FRIEND, ...getAllActiveSupporters()]

  // Auto-select today's scheduled supporter
  useEffect(() => {
    if (useScheduling) {
      const todayCategory = getTodayCategory()
      if (todayCategory) {
        const nextSupporter = getNextSupporter(todayCategory)
        if (nextSupporter) {
          setSelectedSupporter(nextSupporter.id)
          loadLastPost(nextSupporter.id)
        }
      } else {
        // It's a weekend - disable scheduling
        setUseScheduling(false)
      }
    }
  }, [useScheduling])

  // Load last post when supporter changes or continue checkbox is toggled
  useEffect(() => {
    if (selectedSupporter && continueFromLast) {
      loadLastPost(selectedSupporter)
    } else if (!continueFromLast) {
      // Clear continuation data when unchecked
      setLastPost(null)
      setSuggestedContinuationTopic('')
      if (!topic) { // Only clear topic if it's empty
        setTopic('')
      }
    }
  }, [selectedSupporter, continueFromLast])

  async function loadLastPost(supporterId) {
    try {
      const lastPostData = await getLastPostBySupporter(supporterId)
      setLastPost(lastPostData)
      
      // If we have a last post and we're continuing, generate a smart continuation topic
      if (lastPostData && continueFromLast) {
        const continuationTopic = generateContinuationTopic(lastPostData)
        setSuggestedContinuationTopic(continuationTopic)
        setTopic(continuationTopic) // Auto-fill the topic field
      }
    } catch (error) {
      console.error('Error loading last post:', error)
      setLastPost(null)
    }
  }

  function generateContinuationTopic(previousPost) {
    const title = previousPost.title
    const excerpt = previousPost.excerpt || ''
    
    // Smart continuation logic based on the previous post
    if (title.includes('Building') || title.includes('Developing')) {
      return `${title}: Taking It Further`
    } else if (title.includes('How to') || title.includes('Ways to')) {
      return `${title}: Advanced Strategies`
    } else if (title.includes('Understanding') || title.includes('Exploring')) {
      return `${title}: Practical Applications`
    } else if (title.includes('Managing') || title.includes('Coping')) {
      return `${title}: Next Steps`
    } else if (title.includes('Guide') || title.includes('Tips')) {
      return `${title}: Part 2`
    } else if (excerpt.includes('first') || excerpt.includes('beginning')) {
      return `${title}: Going Deeper`
    } else if (excerpt.includes('foundation') || excerpt.includes('basics')) {
      return `${title}: Advanced Techniques`
    } else {
      // Generic continuation
      return `${title}: Continuing the Journey`
    }
  }

  function selectPreviousPost(previousPost) {
    // Generate and set the continuation topic
    const continuationTopic = generateContinuationTopic(previousPost)
    setSuggestedContinuationTopic(continuationTopic)
    setTopic(continuationTopic)
    
    // Show success feedback
    setError('')
    setSuccess(`✅ Selected "${previousPost.title}" for continuation. Topic set to: "${continuationTopic}"`)
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleGenerate() {
    if (!selectedSupporter) {
      setError('Please select a supporter')
      return
    }

    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setGenerating(true)
    setError('')

    try {
      // Generate the blog post using AI
      const continuePost = continueFromLast ? lastPost : null
      const postData = await generateAIBlogPost(selectedSupporter, topic, format, continuePost)
      
      // Save to Firestore as draft
      await createBlogPost(postData)
      
      // Notify parent
      onPostGenerated()
    } catch (error) {
      console.error('Error generating post:', error)
      setError('Failed to generate post. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateIdeas() {
    if (!selectedSupporter) {
      setError('Please select a supporter first')
      return
    }

    setGeneratingIdeas(true)
    setError('')

    try {
      const ideas = await generateBlogIdeas(selectedSupporter, 5)
      setSuggestedTopics(ideas)
    } catch (error) {
      console.error('Error generating ideas:', error)
      setError('Failed to generate topic ideas. Please try again.')
    } finally {
      setGeneratingIdeas(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-surface border border-theme-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-theme-border">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-theme-text">
              Generate New Blog Post
            </h2>
            <button
              onClick={onClose}
              className="text-theme-text-secondary hover:text-theme-text transition-colors text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Supporter Selection */}
          <div>
            <label className="block text-sm font-semibold text-theme-text mb-2">
              Select AI Supporter
            </label>
            <select
              value={selectedSupporter}
              onChange={(e) => {
                setSelectedSupporter(e.target.value)
                setSuggestedTopics([]) // Clear suggestions when supporter changes
              }}
              className="w-full px-4 py-2 bg-theme-primary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Choose a supporter...</option>
              {allSupporters.map((supporter) => (
                <option key={supporter.id} value={supporter.id}>
                  {supporter.icon} {supporter.name}
                </option>
              ))}
            </select>
            {selectedSupporter && (
              <div className="mt-2 p-3 bg-theme-primary rounded-lg">
                <p className="text-sm text-theme-text-secondary">
                  {allSupporters.find(s => s.id === selectedSupporter)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Scheduling Options */}
          <div className="space-y-3">
            {getTodayCategory() ? (
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="useScheduling"
                  checked={useScheduling}
                  onChange={(e) => setUseScheduling(e.target.checked)}
                  className="w-4 h-4 text-brand-primary bg-theme-primary border-theme-border rounded focus:ring-brand-primary"
                />
                <label htmlFor="useScheduling" className="text-sm font-medium text-theme-text">
                  Use weekly schedule (auto-selects today's category)
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-theme-primary border border-theme-border rounded-lg">
                  <p className="text-sm text-theme-text-secondary mb-3">
                    📅 Weekend - Perfect time for special content!
                  </p>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => setShowSummaryModal(true)}
                      className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark text-sm"
                    >
                      📧 Generate Weekly Summary (AI Friend)
                    </button>
                    <p className="text-xs text-theme-text-muted">
                      Or choose any supporter below for regular content
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {selectedSupporter && (
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="continueFromLast"
                  checked={continueFromLast}
                  onChange={(e) => setContinueFromLast(e.target.checked)}
                  className="w-4 h-4 text-brand-primary bg-theme-primary border-theme-border rounded focus:ring-brand-primary"
                />
                <label htmlFor="continueFromLast" className="text-sm font-medium text-theme-text">
                  Continue from last post by this supporter
                </label>
              </div>
            )}

            {continueFromLast && lastPost && (
              <div className="space-y-3">
                <div 
                  className="p-3 bg-theme-primary border border-theme-border rounded-lg cursor-pointer hover:border-brand-primary transition-colors"
                  onClick={() => selectPreviousPost(lastPost)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-theme-text mb-1">📄 Previous post:</p>
                      <p className="text-sm text-theme-text-secondary font-semibold">"{lastPost.title}"</p>
                      <p className="text-xs text-theme-text-muted mt-1 line-clamp-2">{lastPost.excerpt}</p>
                    </div>
                    <div className="ml-3">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Click to continue
                      </span>
                    </div>
                  </div>
                </div>
                
                {suggestedContinuationTopic && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-1">💡 Smart continuation suggested:</p>
                    <p className="text-sm text-green-800 font-semibold">"{suggestedContinuationTopic}"</p>
                    <p className="text-xs text-green-600 mt-1">
                      Click the post above to use this continuation topic.
                    </p>
                  </div>
                )}
              </div>
            )}

            {continueFromLast && !lastPost && (
              <div className="p-3 bg-theme-primary border border-theme-border rounded-lg">
                <p className="text-sm text-theme-text-secondary">No previous posts found for this supporter.</p>
              </div>
            )}
          </div>

          {/* Topic Ideas */}
          {selectedSupporter && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-theme-text">
                  Need topic ideas?
                </label>
                <button
                  onClick={handleGenerateIdeas}
                  disabled={generatingIdeas}
                  className="text-sm text-brand-primary hover:underline disabled:opacity-50"
                >
                  {generatingIdeas ? 'Generating...' : 'Generate Ideas'}
                </button>
              </div>
              {suggestedTopics.length > 0 && (
                <div className="space-y-2">
                  {suggestedTopics.map((idea, index) => (
                    <button
                      key={index}
                      onClick={() => setTopic(idea)}
                      className="w-full text-left px-3 py-2 bg-theme-primary border border-theme-border rounded-lg text-sm text-theme-text hover:border-brand-primary transition-colors"
                    >
                      💡 {idea}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Topic Input */}
          <div>
            <label className="block text-sm font-semibold text-theme-text mb-2">
              Blog Post Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Managing anxiety, Building better habits, etc."
              className="w-full px-4 py-2 bg-theme-primary border border-theme-border rounded-lg text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-theme-text mb-2">
              Post Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-4 py-2 bg-theme-primary border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="random">🎲 Random (Surprise me!)</option>
              <option value="reflection">💭 Reflection</option>
              <option value="practical">✅ Practical Guide</option>
              <option value="story">📖 Story</option>
              <option value="question">❓ Questions to Explore</option>
              <option value="list">📋 List (5 Things)</option>
            </select>
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg">
              <p className="text-green-500 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme-border flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-6 py-2 text-theme-text hover:bg-theme-primary rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedSupporter || !topic.trim()}
            className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin">⚙️</span>
                <span>Generating...</span>
              </span>
            ) : (
              'Generate Post'
            )}
          </button>
        </div>
      </div>

      {/* Weekly Summary Modal */}
      {showSummaryModal && (
        <WeeklySummaryModal
          onClose={() => setShowSummaryModal(false)}
          onSummaryGenerated={() => {
            setShowSummaryModal(false)
            onPostGenerated()
          }}
        />
      )}
    </div>
  )
}

