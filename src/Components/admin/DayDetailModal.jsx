import React, { useState } from 'react'
import { deleteBlogPost } from '../../services/blogService.js'

export default function DayDetailModal({ 
  day, 
  isOpen, 
  onClose, 
  onPostUpdated, 
  onGeneratePost,
  onEditPost 
}) {
  const [loading, setLoading] = useState(false)

  console.log('DayDetailModal render:', { isOpen, day: day?.dayName })

  if (!isOpen || !day) {
    console.log('Modal not rendering - isOpen:', isOpen, 'day:', day)
    return null
  }

  const handleDeletePost = async () => {
    if (!day.post?.id) return
    
    if (!confirm(`Are you sure you want to delete "${day.post.title}"?`)) {
      return
    }

    try {
      setLoading(true)
      await deleteBlogPost(day.post.id)
      onPostUpdated()
      onClose()
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePost = () => {
    // Pass the specific date and category to the generate modal
    onGeneratePost({
      scheduledDate: day.date,
      category: day.category,
      supporter: day.supporter
    })
    onClose()
  }

  const handleEditPost = () => {
    if (day.post?.id) {
      console.log('Opening edit for post:', day.post.id)
      onEditPost(day.post.id)
      onClose()
    } else {
      console.error('No post ID available for editing')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'draft':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'weekly-recap':
      case 'weekly-preview':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return '✅'
      case 'draft':
        return '📝'
      case 'weekly-recap':
        return '📧'
      case 'weekly-preview':
        return '📅'
      default:
        return '⚪'
    }
  }

  const isWeekend = day.day === 0 || day.day === 6
  const isSpecial = day.category === 'weekly-recap' || day.category === 'weekly-preview'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {day.dayName}, {day.date?.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </h2>
            <p className="text-gray-600 capitalize">
              {isSpecial ? day.category.replace('weekly-', '').replace('recap', 'Weekly Recap').replace('preview', 'Weekly Preview') : day.category} Category
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getStatusColor(day.status)}`}>
            <span className="mr-2">{getStatusIcon(day.status)}</span>
            <span className="font-medium capitalize">
              {day.status === 'empty' ? 'No Content' : day.status}
            </span>
          </div>
        </div>

        {/* Content */}
        {day.filled && day.post ? (
          <div className="space-y-4">
            {/* Post Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{day.post.title}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Supporter:</strong> {day.post.supporterName}</p>
                <p><strong>Created:</strong> {day.post.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                <p><strong>Word Count:</strong> {day.post.content?.split(' ').length || 'Unknown'}</p>
                {day.post.scheduledFor && (
                  <p><strong>Scheduled:</strong> {day.post.scheduledFor?.toDate?.()?.toLocaleDateString()}</p>
                )}
                {day.post.publishedAt && (
                  <p><strong>Published:</strong> {day.post.publishedAt?.toDate?.()?.toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Excerpt */}
            {day.post.excerpt && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Excerpt:</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {day.post.excerpt}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {day.status === 'draft' && (
                <>
                  <button
                    onClick={handleEditPost}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    ✏️ Edit Post
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to blog editor with publish action
                      window.location.href = `https://bestibule.ca/admin/blog/edit/${day.post.id}?action=publish`
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    📢 Publish
                  </button>
                </>
              )}
              {day.status === 'published' && (
                <button
                  onClick={handleEditPost}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  ✏️ Edit Post
                </button>
              )}
              <button
                onClick={handleDeletePost}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Empty Slot */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="font-semibold text-gray-900 mb-2">Empty Slot</h3>
              <p className="text-gray-600 mb-4">
                {isSpecial 
                  ? `This ${day.dayName} is reserved for ${day.category.replace('weekly-', '').replace('recap', 'weekly recap').replace('preview', 'weekly preview')}.`
                  : `No content scheduled for this ${day.dayName}.`
                }
              </p>
              
              {!isSpecial && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    <strong>Expected Supporter:</strong> {day.supporter?.name || 'Next in rotation'}
                  </p>
                  <button
                    onClick={handleGeneratePost}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 font-medium"
                  >
                    🎯 Generate Post for This Day
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
