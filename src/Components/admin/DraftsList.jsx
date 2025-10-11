import React from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteBlogPost } from '../../services/blogService'
import { getSupporterById } from '../../data/supporters'

export default function DraftsList({ drafts, onPostDeleted, onPostEdited, isPublished = false }) {
  const navigate = useNavigate()

  async function handleDelete(postId) {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteBlogPost(postId)
        onPostDeleted()
      } catch (error) {
        console.error('Error deleting post:', error)
        alert('Failed to delete post')
      }
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A'
    
    // Handle Firestore timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function getSupporter(supporterId) {
    const supporter = getSupporterById(supporterId)
    return supporter || { name: 'Unknown', icon: '❓' }
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-theme-text mb-2">
          {isPublished ? 'No Published Posts Yet' : 'No Drafts Yet'}
        </h3>
        <p className="text-theme-text-secondary mb-6">
          {isPublished 
            ? 'Publish some drafts to see them here.'
            : 'Click "Generate New Post" to create your first blog post!'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {drafts.map((post) => {
        const supporter = getSupporter(post.supporterId)
        
        return (
          <div
            key={post.id}
            className="bg-theme-surface border border-theme-border rounded-lg p-6 hover:border-brand-primary transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Title */}
                <h3 className="text-xl font-semibold text-theme-text mb-2">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-theme-text-secondary mb-4 line-clamp-2">
                  {post.excerpt}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-theme-text-muted">
                  <span className="flex items-center space-x-1">
                    <span>{supporter.icon}</span>
                    <span>{supporter.name}</span>
                  </span>
                  <span>•</span>
                  <span className="bg-brand-primary/20 text-brand-primary px-2 py-1 rounded text-xs">
                    {post.format}
                  </span>
                  <span>•</span>
                  <span>{post.wordCount} words</span>
                  <span>•</span>
                  <span>
                    {isPublished ? 'Published' : 'Created'}: {formatDate(isPublished ? post.publishedAt : post.createdAt)}
                  </span>
                  {post.emailSent && (
                    <>
                      <span>•</span>
                      <span className="text-green-500">✉️ Email Sent</span>
                    </>
                  )}
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {post.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-theme-primary border border-theme-border px-2 py-1 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => navigate(`/admin/blog/edit/${post.id}`)}
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  {isPublished ? 'View' : 'Edit'}
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

