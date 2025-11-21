import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { AuthProvider } from './contexts/AuthContext'
import { MenuProvider } from './contexts/MenuContext'
import HamburgerMenu from './Components/HamburgerMenu'
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
import RootRedirect from './Components/RootRedirect'
import ProtectedRoute from './Components/ProtectedRoute'
import BlogAdmin from './pages/admin/BlogAdmin'
import BlogEditor from './pages/admin/BlogEditor'
import EmailManagement from './pages/admin/EmailManagement'
import EmailTemplates from './pages/admin/EmailTemplates'
import EmailInbox from './pages/admin/EmailInbox'
import SummaryTester from './pages/admin/SummaryTester'
import Unsubscribe from './pages/Unsubscribe'

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
            <Route path="/admin/blog" element={<ProtectedRoute><BlogAdmin /></ProtectedRoute>} />
            <Route path="/admin/blog/edit/:postId" element={<ProtectedRoute><BlogEditor /></ProtectedRoute>} />
            <Route path="/admin/email" element={<ProtectedRoute><EmailManagement /></ProtectedRoute>} />
            <Route path="/admin/email/templates" element={<ProtectedRoute><EmailTemplates /></ProtectedRoute>} />
            <Route path="/admin/email/inbox" element={<ProtectedRoute><EmailInbox /></ProtectedRoute>} />
            <Route path="/admin/summaries" element={<ProtectedRoute><SummaryTester /></ProtectedRoute>} />
                <Route path="/unsubscribe/:subscriberId" element={<Unsubscribe />} />
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
