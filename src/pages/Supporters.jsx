import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'
import { SUPPORTER_GROUPS, AI_FRIEND, BENCHED_SUPPORTERS, getAllActiveSupporters, getAllSupporters } from '../data/supporters'
import { getSupporterTags, getSupporterResources } from '../services/supporterPrompts'

export default function Supporters() {
  const [showLabs, setShowLabs] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useDarkMode()

  const handleSupporterClick = (supporter) => {
    navigate('/conversations', { state: { supporterId: supporter.id, supporterName: supporter.name } })
  }

  const handleAIFriendClick = () => {
    navigate('/conversations', { state: { supporterId: AI_FRIEND.id, supporterName: AI_FRIEND.name } })
  }

  // Get all unique tags for filtering
  const allSupporters = getAllActiveSupporters()
  const allTags = [...new Set(allSupporters.flatMap(s => getSupporterTags(s.id)))]

  // Filter supporters based on search and tag
  const filteredSupporters = allSupporters.filter(supporter => {
    const matchesSearch = searchTerm === '' || 
      supporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supporter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supporter.voice.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTag = selectedTag === '' || getSupporterTags(supporter.id).includes(selectedTag)
    
    return matchesSearch && matchesTag
  })

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header with AI Friend */}
      <header className="bg-theme-card border-b border-theme-border shadow-theme-primary">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/home')}
                className="mr-4 p-2 rounded-md hover:bg-theme-surface transition-colors"
              >
                ← Back
              </button>
              <span className="text-2xl mr-3">🌿</span>
              <h1 className="text-xl font-bold text-theme-text">AI Supporters</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLabs(!showLabs)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showLabs 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-theme-surface text-theme-text hover:bg-theme-card'
                }`}
              >
                Show Labs
              </button>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
                title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* AI Friend Anchor */}
      <div className="bg-theme-card border-b border-theme-border p-4">
        <div className="max-w-7xl mx-auto">
          <div 
            className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border border-brand-primary/20 cursor-pointer hover:from-brand-primary/20 hover:to-brand-secondary/20 transition-all duration-200"
            onClick={handleAIFriendClick}
          >
            <div className="w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center text-3xl">
              {AI_FRIEND.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-theme-text">{AI_FRIEND.name}</h2>
              <p className="text-theme-text-secondary">{AI_FRIEND.description}</p>
              <p className="text-sm text-theme-text-muted italic mt-1">"{AI_FRIEND.voice}"</p>
            </div>
            <div className="text-brand-primary">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filter Controls */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Input */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search supporters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-theme-text placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              
              {/* Tag Filter */}
              <div className="md:w-64">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-theme-border bg-theme-surface text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Results Count */}
            <p className="text-sm text-theme-text-muted">
              Showing {filteredSupporters.length} of {allSupporters.length} supporters
              {searchTerm && ` for "${searchTerm}"`}
              {selectedTag && ` with tag "${selectedTag}"`}
            </p>
          </div>

          {/* Supporter Groups */}
          <div className="space-y-12">
            {SUPPORTER_GROUPS.map((group) => (
              <div key={group.id} className="space-y-6">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{group.icon}</span>
                  <h3 className="text-xl font-bold text-theme-text">{group.name}</h3>
                  <div className="flex-1 h-px bg-theme-border"></div>
                </div>

                {/* 5x5 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {group.supporters.map((supporter) => (
                    <div
                      key={supporter.id}
                      className="bg-theme-card border border-theme-border rounded-xl p-4 hover:shadow-theme-secondary transition-all duration-200 cursor-pointer group"
                      onClick={() => handleSupporterClick(supporter)}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-theme-surface rounded-full flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                          {supporter.icon}
                        </div>
                        <h4 className="text-sm font-semibold text-theme-text mb-2">{supporter.name}</h4>
                        <p className="text-xs text-theme-text-secondary mb-3">{supporter.description}</p>
                        <p className="text-xs text-theme-text-muted italic mb-3">"{supporter.voice}"</p>
                        
                        {/* Tags */}
                        {supporter.tags && supporter.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {supporter.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-brand-primary/10 text-brand-primary text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                            {supporter.tags.length > 3 && (
                              <span className="px-2 py-1 bg-theme-surface text-theme-text-muted text-xs rounded-full">
                                +{supporter.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Resources Footer */}
                        {supporter.resources && supporter.resources.length > 0 && (
                          <div className="text-xs text-theme-text-muted border-t border-theme-border pt-2">
                            <div className="flex items-center space-x-1">
                              <span>🔗</span>
                              <span>Resources available</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Labs Section (Benched Supporters) */}
            {showLabs && BENCHED_SUPPORTERS.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🧪</span>
                  <h3 className="text-xl font-bold text-theme-text">Labs</h3>
                  <div className="flex-1 h-px bg-theme-border"></div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Experimental</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BENCHED_SUPPORTERS.map((supporter) => (
                    <div
                      key={supporter.id}
                      className="bg-theme-card border border-yellow-200 rounded-xl p-4 hover:shadow-theme-secondary transition-all duration-200 cursor-pointer group opacity-75"
                      onClick={() => handleSupporterClick(supporter)}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform duration-200">
                          {supporter.icon}
                        </div>
                        <h4 className="text-sm font-semibold text-theme-text mb-2">{supporter.name}</h4>
                        <p className="text-xs text-theme-text-secondary mb-3">{supporter.description}</p>
                        <p className="text-xs text-theme-text-muted italic">"{supporter.voice}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}