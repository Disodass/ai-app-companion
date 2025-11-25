import React, { useState, useEffect } from 'react'
import { getLastWeekPosts, getThisWeekPosts, generateWeeklySummary } from '../../services/weeklySummaryService'
import { createBlogPost } from '../../services/blogService'

export default function WeeklySummaryModal({ onClose, onSummaryGenerated }) {
  const [summaryType, setSummaryType] = useState('recap') // 'recap' or 'preview'
  const [posts, setPosts] = useState([])
  const [generating, setGenerating] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [error, setError] = useState('')
  const [summaryData, setSummaryData] = useState(null)

  // Load posts based on summary type
  useEffect(() => {
    loadPosts()
  }, [summaryType])

  async function loadPosts() {
    setLoadingPosts(true)
    setError('')
    
    try {
      const postsData = summaryType === 'recap' 
        ? await getLastWeekPosts() 
        : await getThisWeekPosts()
      
      setPosts(postsData)
      
      if (postsData.length === 0) {
        setError(summaryType === 'recap' 
          ? 'No posts found from last week to summarize.'
          : 'No posts found for this week to preview.')
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      setError('Failed to load posts. Please try again.')
    } finally {
      setLoadingPosts(false)
    }
  }

  async function handleGenerate() {
    if (posts.length === 0) {
      setError('No posts available to summarize.')
      return
    }

    setGenerating(true)
    setError('')

    try {
      // Generate the weekly summary using AI Friend
      const summary = await generateWeeklySummary(posts, summaryType)
      setSummaryData(summary)
    } catch (error) {
      console.error('Error generating summary:', error)
      setError('Failed to generate summary. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveAsDraft() {
    if (!summaryData) {
      setError('No summary to save.')
      return
    }

    try {
      // Create blog post with the summary
      const postData = {
        title: summaryData.title,
        content: summaryData.content,
        excerpt: summaryData.content.substring(0, 200) + '...',
        supporterId: 'ai-friend', // AI Friend writes the summary
        tags: ['weekly-summary', summaryType, 'newsletter'],
        wordCount: summaryData.content.split(' ').length,
        format: 'newsletter'
      }

      await createBlogPost(postData)
      
      // Notify parent
      onSummaryGenerated()
    } catch (error) {
      console.error('Error saving summary:', error)
      setError('Failed to save summary. Please try again.')
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-surface border border-theme-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-theme-border">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-theme-text">
              📧 Weekly Summary by AI Friend
            </h2>
            <button
              onClick={onClose}
              className="text-theme-text-muted hover:text-theme-text text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-theme-text mb-3">
              Summary Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="summaryType"
                  value="recap"
                  checked={summaryType === 'recap'}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="w-4 h-4 text-brand-primary"
                />
                <span className="text-theme-text">📋 Last Week Recap</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="summaryType"
                  value="preview"
                  checked={summaryType === 'preview'}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="w-4 h-4 text-brand-primary"
                />
                <span className="text-theme-text">🔮 This Week Preview</span>
              </label>
            </div>
          </div>

          {/* Posts List */}
          {loadingPosts ? (
            <div className="text-center py-8">
              <div className="text-theme-text-muted">Loading posts...</div>
            </div>
          ) : posts.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-theme-text mb-3">
                {summaryType === 'recap' ? 'Posts from Last Week:' : 'Posts for This Week:'}
              </h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {posts.map((post, index) => (
                  <div key={post.id} className="p-3 bg-theme-primary border border-theme-border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-theme-text">{post.title}</h4>
                        <p className="text-sm text-theme-text-muted mt-1">
                          {post.excerpt?.substring(0, 100)}...
                        </p>
                        <p className="text-xs text-theme-text-muted mt-2">
                          {formatDate(post.publishedAt?.toDate())}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-theme-primary border border-theme-border rounded-lg">
              <p className="text-theme-text-muted text-center">
                {summaryType === 'recap' 
                  ? 'No posts found from last week to summarize.'
                  : 'No posts found for this week to preview.'}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Generated Summary Preview */}
          {summaryData && (
            <div>
              <h3 className="text-lg font-semibold text-theme-text mb-3">
                Generated Summary Preview:
              </h3>
              <div className="p-4 bg-theme-primary border border-theme-border rounded-lg">
                <h4 className="font-semibold text-theme-text mb-2">{summaryData.title}</h4>
                <div className="text-theme-text-secondary whitespace-pre-wrap">
                  {summaryData.content}
                </div>
                <div className="mt-4 pt-4 border-t border-theme-border">
                  <p className="text-sm text-theme-text-muted">
                    {summaryData.wordCount} words • {summaryData.postCount} posts summarized
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-theme-text-muted hover:text-theme-text"
            >
              Cancel
            </button>
            
            {!summaryData ? (
              <button
                onClick={handleGenerate}
                disabled={generating || posts.length === 0}
                className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate Summary'}
              </button>
            ) : (
              <button
                onClick={handleSaveAsDraft}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save as Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
