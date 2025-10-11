import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../contexts/DarkModeContext'

export default function Blog() {
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode } = useDarkMode()

  // Placeholder blog posts - you'll add real ones later
  const blogPosts = [
    {
      id: 1,
      title: "Welcome to Bestibule",
      excerpt: "We're building something special - a space for gentle guidance and thoughtful support.",
      date: "October 9, 2025",
      author: "Supporter Friend",
      category: "Updates"
    }
  ]

  return (
    <div className="min-h-screen bg-theme-primary flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-theme-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/landing')}>
            <span className="text-3xl">🌿</span>
            <h1 className="text-2xl font-bold text-theme-text">Bestibule</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-theme-surface transition-colors text-2xl"
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate('/landing')}
              className="px-4 py-2 text-theme-text hover:text-brand-primary transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-theme-text mb-4">
            Blog
          </h1>
          <p className="text-xl text-theme-text-secondary mb-12">
            Thoughts, guidance, and reflections from our supporters
          </p>

          {/* Blog Posts */}
          <div className="space-y-8">
            {blogPosts.map(post => (
              <article 
                key={post.id} 
                className="bg-theme-surface border border-theme-border rounded-lg p-6 hover:border-brand-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-sm text-theme-text-muted mb-3">
                  <span className="bg-brand-primary/20 text-brand-primary px-2 py-1 rounded">
                    {post.category}
                  </span>
                  <span>•</span>
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.author}</span>
                </div>
                <h2 className="text-2xl font-bold text-theme-text mb-3">
                  {post.title}
                </h2>
                <p className="text-theme-text-secondary">
                  {post.excerpt}
                </p>
              </article>
            ))}
          </div>

          {/* Coming Soon Message */}
          <div className="mt-12 text-center bg-theme-surface border border-theme-border rounded-lg p-8">
            <span className="text-4xl mb-4 block">✨</span>
            <h3 className="text-2xl font-bold text-theme-text mb-3">
              More Coming Soon
            </h3>
            <p className="text-theme-text-secondary mb-6">
              We're preparing thoughtful content from our supporters. Join our newsletter to be notified when new posts arrive.
            </p>
            <button
              onClick={() => navigate('/landing')}
              className="bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Join Newsletter
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-theme-border mt-12">
        <div className="max-w-4xl mx-auto text-center text-theme-text-muted">
          © 2025 Bestibule. Supportive AI companions for your journey.
        </div>
      </footer>
    </div>
  )
}

