import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getDraftPosts, getPublishedPosts } from '../../services/blogService'
import GeneratePostModal from '../../components/admin/GeneratePostModal'
import DraftsList from '../../components/admin/DraftsList'
import AutomatedContentModal from '../../components/admin/AutomatedContentModal'
import UpcomingSchedule from '../../components/UpcomingSchedule'
import AdminHeader from '../../components/admin/AdminHeader'

export default function BlogAdmin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [drafts, setDrafts] = useState([])
  const [publishedPosts, setPublishedPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showAutomatedModal, setShowAutomatedModal] = useState(false)
  const [activeTab, setActiveTab] = useState('drafts') // drafts | published
  
  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/signin', { 
        state: { from: { pathname: '/admin/blog' } }
      })
    }
  }, [user, navigate])
  
  if (!user) {
    return <div>Redirecting to sign in...</div>
  }

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
      {/* Admin Header */}
      <AdminHeader />
      
      {/* Page Header */}
      <div className="bg-theme-surface border-b border-theme-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-theme-text" style={{ fontFamily: 'Georgia, serif' }}>
                📝 Blog Management
              </h1>
              <p className="text-theme-text-secondary mt-1">Create and manage your blog posts</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAutomatedModal(true)}
                className="px-4 py-2 bg-brand-secondary text-white rounded-lg hover:opacity-90 font-semibold text-sm transition-opacity shadow-sm"
              >
                🤖 Auto Generate
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="bg-brand-accent text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                + Generate New Post
              </button>
            </div>
          </div>
        </div>
      </div>


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
            <div className="text-3xl font-bold text-brand-accent mb-2">
              {publishedPosts.length}
            </div>
            <div className="text-theme-text-secondary">
              Published Posts
            </div>
          </div>
          <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
            <div className="text-3xl font-bold text-brand-secondary mb-2">
              {publishedPosts.filter(p => p.emailSent).length}
            </div>
            <div className="text-theme-text-secondary">
              Emails Sent
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Schedule */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <UpcomingSchedule weeks={4} onPostUpdated={loadPosts} />
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

      {showAutomatedModal && (
        <AutomatedContentModal
          onClose={() => setShowAutomatedModal(false)}
          onContentGenerated={handlePostGenerated}
        />
      )}
    </div>
  )
}

