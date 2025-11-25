import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebaseConfig'
import { doc, updateDoc, getDoc } from 'firebase/firestore'

export default function Unsubscribe() {
  const { subscriberId } = useParams()
  const navigate = useNavigate()
  const [subscriber, setSubscriber] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unsubscribing, setUnsubscribing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (subscriberId) {
      loadSubscriber()
    }
  }, [subscriberId])

  async function loadSubscriber() {
    try {
      const subscriberRef = doc(db, 'email_preferences', subscriberId)
      const subscriberSnap = await getDoc(subscriberRef)
      
      if (subscriberSnap.exists()) {
        setSubscriber({ id: subscriberSnap.id, ...subscriberSnap.data() })
      } else {
        setError('Subscriber not found')
      }
    } catch (error) {
      console.error('Error loading subscriber:', error)
      setError('Failed to load subscriber information')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsubscribe(type) {
    if (!subscriber) return

    setUnsubscribing(true)
    setError('')

    try {
      const subscriberRef = doc(db, 'email_preferences', subscriber.id)
      
      let updateData = {}
      
      if (type === 'all') {
        updateData = {
          individualBlog: false,
          weeklyRecap: false,
          weeklyPreview: false,
          unsubscribedAt: new Date(),
          unsubscribedReason: 'complete_unsubscribe'
        }
      } else {
        updateData = {
          [type]: false,
          updatedAt: new Date()
        }
      }
      
      await updateDoc(subscriberRef, updateData)
      setSuccess(true)
      
      // Refresh subscriber data
      await loadSubscriber()
      
    } catch (error) {
      console.error('Error unsubscribing:', error)
      setError('Failed to update preferences. Please try again.')
    } finally {
      setUnsubscribing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-theme-text-muted">Loading...</div>
        </div>
      </div>
    )
  }

  if (error && !subscriber) {
    return (
      <div className="min-h-screen bg-theme-background flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-theme-text mb-4">Error</h1>
          <p className="text-theme-text-muted mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent-hover transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-theme-background flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-theme-text mb-4">Unsubscribed Successfully</h1>
          <p className="text-theme-text-muted mb-6">
            You have been unsubscribed from Bestibule emails. You won't receive any more emails from us.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent-hover transition-colors"
            >
              Visit Bestibule
            </button>
            <p className="text-sm text-theme-text-muted">
              You can always resubscribe later if you change your mind.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-background flex items-center justify-center p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-theme-surface border border-theme-border rounded-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📧</div>
            <h1 className="text-2xl font-bold text-theme-text mb-2">Manage Email Preferences</h1>
            <p className="text-theme-text-muted">
              We're sorry to see you go! You can unsubscribe from specific types of emails or all emails.
            </p>
          </div>

          {subscriber && (
            <div className="mb-6">
              <div className="bg-theme-background border border-theme-border rounded-lg p-4 mb-4">
                <p className="text-sm text-theme-text-muted mb-1">Email Address:</p>
                <p className="font-medium text-theme-text">{subscriber.email}</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-theme-text">Current Subscriptions:</h3>
                
                {subscriber.individualBlog && (
                  <div className="flex items-center justify-between p-3 bg-theme-background border border-theme-border rounded-lg">
                    <div>
                      <p className="font-medium text-theme-text">📝 Individual Blog Posts</p>
                      <p className="text-sm text-theme-text-muted">Daily insights from AI Supporters</p>
                    </div>
                    <button
                      onClick={() => handleUnsubscribe('individualBlog')}
                      disabled={unsubscribing}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      Unsubscribe
                    </button>
                  </div>
                )}

                {subscriber.weeklyRecap && (
                  <div className="flex items-center justify-between p-3 bg-theme-background border border-theme-border rounded-lg">
                    <div>
                      <p className="font-medium text-theme-text">📋 Weekly Recap</p>
                      <p className="text-sm text-theme-text-muted">Saturday summary of the week's posts</p>
                    </div>
                    <button
                      onClick={() => handleUnsubscribe('weeklyRecap')}
                      disabled={unsubscribing}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      Unsubscribe
                    </button>
                  </div>
                )}

                {subscriber.weeklyPreview && (
                  <div className="flex items-center justify-between p-3 bg-theme-background border border-theme-border rounded-lg">
                    <div>
                      <p className="font-medium text-theme-text">🔮 Weekly Preview</p>
                      <p className="text-sm text-theme-text-muted">Sunday preview of upcoming posts</p>
                    </div>
                    <button
                      onClick={() => handleUnsubscribe('weeklyPreview')}
                      disabled={unsubscribing}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      Unsubscribe
                    </button>
                  </div>
                )}

                {!subscriber.individualBlog && !subscriber.weeklyRecap && !subscriber.weeklyPreview && (
                  <div className="text-center py-4">
                    <p className="text-theme-text-muted">You're not subscribed to any emails.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-theme-border pt-6">
            <div className="text-center">
              <p className="text-sm text-theme-text-muted mb-4">
                Want to unsubscribe from everything?
              </p>
              <button
                onClick={() => handleUnsubscribe('all')}
                disabled={unsubscribing}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {unsubscribing ? 'Processing...' : 'Unsubscribe from All Emails'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-theme-accent hover:text-theme-accent-hover transition-colors"
            >
              ← Back to Bestibule
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


