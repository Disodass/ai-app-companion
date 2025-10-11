import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getDraftPosts, getPublishedPosts } from '../../services/blogService'
import GeneratePostModal from '../../components/admin/GeneratePostModal'
import DraftsList from '../../components/admin/DraftsList'

export default function BlogAdmin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [drafts, setDrafts] = useState([])
  const [publishedPosts, setPublishedPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [activeTab, setActiveTab] = useState('drafts') // drafts | published

  // Load posts
  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    try {
      setLoading(true)
      const [draftsData, publishedData] = await Promise.all([
        getDraftPosts(),
        getPublishedPosts(10) // Get recent 10 published posts
      ])
      setDrafts(draftsData)
      setPublishedPosts(publishedData)
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh after generating
  function handlePostGenerated() {
    setShowGenerateModal(false)
    loadPosts()
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <header className="border-b border-theme-border bg-theme-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/landing')}
                className="text-theme-text-secondary hover:text-theme-text transition-colors"
              >
                ← Back to Site
              </button>
              <h1 className="text-2xl font-bold text-theme-text">
                Blog Admin
              </h1>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="bg-brand-primary text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              + Generate New Post
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
            <div className="text-3xl font-bold text-brand-primary mb-2">
              {drafts.length}
            </div>
            <div className="text-theme-text-secondary">
              Draft Posts
            </div>
          </div>
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {publishedPosts.length}
            </div>
            <div className="text-theme-text-secondary">
              Published Posts
            </div>
          </div>
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {publishedPosts.filter(p => p.emailSent).length}
            </div>
            <div className="text-theme-text-secondary">
              Emails Sent
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="border-b border-theme-border">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('drafts')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === 'drafts'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              Drafts ({drafts.length})
            </button>
            <button
              onClick={() => setActiveTab('published')}
              className={`pb-4 px-2 border-b-2 transition-colors ${
                activeTab === 'published'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              Published ({publishedPosts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-theme-text-secondary">Loading posts...</div>
          </div>
        ) : activeTab === 'drafts' ? (
          <DraftsList 
            drafts={drafts} 
            onPostDeleted={loadPosts}
            onPostEdited={() => loadPosts()}
          />
        ) : (
          <DraftsList 
            drafts={publishedPosts} 
            onPostDeleted={loadPosts}
            onPostEdited={() => loadPosts()}
            isPublished={true}
          />
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <GeneratePostModal
          onClose={() => setShowGenerateModal(false)}
          onPostGenerated={handlePostGenerated}
        />
      )}
    </div>
  )
}

