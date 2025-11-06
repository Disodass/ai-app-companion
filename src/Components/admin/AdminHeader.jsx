import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function AdminHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const isActive = (path) => {
    return location.pathname.startsWith(path)
  }
  
  const navLinkClass = (path) => {
    const base = "px-4 py-2 rounded-lg font-medium transition-all"
    return isActive(path)
      ? `${base} bg-brand-accent text-white`
      : `${base} text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface`
  }

  return (
    <header className="border-b border-theme-border bg-theme-surface sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Brand + Navigation */}
          <div className="flex items-center space-x-6">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <Link to="/landing" className="flex items-center space-x-2 group">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <span className="text-white font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>B</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-theme-text" style={{ fontFamily: 'Georgia, serif' }}>
                    Bestibule
                  </h1>
                  <p className="text-xs text-brand-accent font-semibold -mt-1">Admin Dashboard</p>
                </div>
              </Link>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-2 ml-8">
              <Link to="/admin/blog" className={navLinkClass('/admin/blog')}>
                📝 Blog
              </Link>
              <Link to="/admin/email" className={navLinkClass('/admin/email')}>
                📧 Email
              </Link>
              <Link to="/admin/email/inbox" className={navLinkClass('/admin/email/inbox')}>
                📬 Inbox
              </Link>
              <Link to="/admin/email/templates" className={navLinkClass('/admin/email/templates')}>
                📄 Templates
              </Link>
            </nav>
          </div>

          {/* Right: Back to Site */}
          <button
            onClick={() => navigate('/landing')}
            className="px-4 py-2 text-theme-text-secondary hover:text-theme-text transition-colors text-sm font-medium"
          >
            ← Back to Site
          </button>
        </div>
      </div>
    </header>
  )
}

