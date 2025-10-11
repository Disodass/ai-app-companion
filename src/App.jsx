import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { AuthProvider } from './contexts/AuthContext'
import { MenuProvider } from './contexts/MenuContext'
import HamburgerMenu from './components/HamburgerMenu'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Blog from './pages/Blog'
import Home from './pages/Home'
import LearnMore from './pages/LearnMore'
import Supporters from './pages/Supporters'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import CookiePolicy from './pages/CookiePolicy'
import AccountSettings from './pages/AccountSettings'
import RootRedirect from './components/RootRedirect'
import BlogAdmin from './pages/admin/BlogAdmin'
import BlogEditor from './pages/admin/BlogEditor'

export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <MenuProvider>
          <Router>
            <div className="min-h-screen bg-theme-primary text-theme-text">
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/home" element={<Home />} />
                <Route path="/learn-more" element={<LearnMore />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/account-settings" element={<AccountSettings />} />
                <Route path="/admin/blog" element={<BlogAdmin />} />
                <Route path="/admin/blog/edit/:postId" element={<BlogEditor />} />
                <Route path="/supporters" element={
                  <AppLayout>
                    <Supporters />
                  </AppLayout>
                } />
                <Route path="/conversations" element={
                  <AppLayout>
                    <Chat />
                  </AppLayout>
                } />
                <Route path="/settings" element={
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              
              {/* Hamburger Menu - Renders on all pages */}
              <HamburgerMenu />
            </div>
          </Router>
        </MenuProvider>
      </AuthProvider>
    </DarkModeProvider>
  )
}
