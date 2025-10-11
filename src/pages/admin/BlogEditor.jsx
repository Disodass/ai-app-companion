import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBlogPost, updateBlogPost, publishBlogPost } from '../../services/blogService'
import { getSupporterById } from '../../data/supporters'

export default function BlogEditor() {
  const { postId } = useParams()
  const navigate = useNavigate()
  
  const [post, setPost] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPost()
  }, [postId])

  async function loadPost() {
    try {
      setLoading(true)
      const postData = await getBlogPost(postId)
      setPost(postData)
      setTitle(postData.title || '')
      setContent(postData.content || '')
      setExcerpt(postData.excerpt || '')
    } catch (error) {
      console.error('Error loading post:', error)
      setError('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      await updateBlogPost(postId, {
        title,
        content,
        excerpt,
        wordCount: content.split(/\s+/).length
      })
      alert('Post saved!')
    } catch (error) {
      console.error('Error saving post:', error)
      setError('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!window.confirm('Are you sure you want to publish this post?')) {
      return
    }

    setPublishing(true)
    setError('')

    try {
      // Save current changes first
      await updateBlogPost(postId, {
        title,
        content,
        excerpt,
        wordCount: content.split(/\s+/).length
      })

      // Publish the post
      await publishBlogPost(postId)
      
      alert('Post published successfully!')
      navigate('/admin/blog')
    } catch (error) {
      console.error('Error publishing post:', error)
      setError('Failed to publish post')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-theme-text">Loading post...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">Post not found</div>
          <button
            onClick={() => navigate('/admin/blog')}
            className="text-brand-primary hover:underline"
          >
            ← Back to Admin
          </button>
        </div>
      </div>
    )
  }

  const supporter = getSupporterById(post.supporterId)
  const isPublished = post.status === 'published'

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <header className="border-b border-theme-border bg-theme-surface sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin/blog')}
                className="text-theme-text-secondary hover:text-theme-text transition-colors"
              >
                ← Back to Admin
              </button>
              <div>
                <h1 className="text-xl font-bold text-theme-text">
                  {isPublished ? 'View Post' : 'Edit Post'}
                </h1>
                <div className="text-sm text-theme-text-secondary">
                  By {supporter?.icon} {supporter?.name}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 text-theme-text hover:bg-theme-primary rounded-lg transition-colors"
              >
                {showPreview ? '✏️ Edit' : '👁️ Preview'}
              </button>
              {!isPublished && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {publishing ? 'Publishing...' : 'Publish'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto px-6 pt-6">
          <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {showPreview ? (
          /* Preview Mode */
          <article className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-theme-text mb-4">{title}</h1>
            <div className="text-theme-text-secondary mb-8">{excerpt}</div>
            <div className="text-theme-text whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          </article>
        ) : (
          /* Edit Mode */
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-theme-text mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPublished}
                className="w-full px-4 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme-text text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-60"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-semibold text-theme-text mb-2">
                Excerpt (shown in lists)
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                disabled={isPublished}
                rows={2}
                className="w-full px-4 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-60 resize-none"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-theme-text mb-2">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isPublished}
                rows={20}
                className="w-full px-4 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-60 font-mono text-sm leading-relaxed"
              />
              <div className="mt-2 text-sm text-theme-text-muted">
                {content.split(/\s+/).length} words
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-theme-surface border border-theme-border rounded-lg p-4">
              <h3 className="font-semibold text-theme-text mb-3">Post Details</h3>
              <div className="space-y-2 text-sm text-theme-text-secondary">
                <div>
                  <strong>Format:</strong> {post.format}
                </div>
                <div>
                  <strong>Tags:</strong> {post.tags?.join(', ') || 'None'}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span className={post.status === 'published' ? 'text-green-500' : 'text-yellow-500'}>
                    {post.status}
                  </span>
                </div>
                {post.publishedAt && (
                  <div>
                    <strong>Published:</strong>{' '}
                    {post.publishedAt.toDate().toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

