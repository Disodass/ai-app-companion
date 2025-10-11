import React, { useState } from 'react'
import { getAllActiveSupporters, AI_FRIEND } from '../../data/supporters'
import { generateAIBlogPost, generateBlogIdeas } from '../../services/aiBlogGenerator'
import { createBlogPost } from '../../services/blogService'

export default function GeneratePostModal({ onClose, onPostGenerated }) {
  const [selectedSupporter, setSelectedSupporter] = useState('')
  const [topic, setTopic] = useState('')
  const [format, setFormat] = useState('random')
  const [generating, setGenerating] = useState(false)
  const [generatingIdeas, setGeneratingIdeas] = useState(false)
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [error, setError] = useState('')

  const allSupporters = [AI_FRIEND, ...getAllActiveSupporters()]

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
      const postData = await generateAIBlogPost(selectedSupporter, topic, format)
      
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
    </div>
  )
}

