import React, { useState, useEffect } from 'react'
import { generateNextScheduledContent, generateBatchContent, getUpcomingSchedule, generateWeekendNewsletters } from '../../services/automatedScheduler'

export default function AutomatedContentModal({ onClose, onContentGenerated }) {
  const [generating, setGenerating] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [batchCount, setBatchCount] = useState(5)
  const [results, setResults] = useState([])
  const [upcomingSchedule, setUpcomingSchedule] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [weekendGenerating, setWeekendGenerating] = useState(false)

  useEffect(() => {
    loadUpcomingSchedule()
  }, [])

  async function loadUpcomingSchedule() {
    setScheduleLoading(true)
    try {
      console.log('🔄 Loading upcoming schedule...')
      const schedule = await getUpcomingSchedule(4) // Next 4 weeks
      console.log('📅 Schedule loaded:', schedule)
      setUpcomingSchedule(schedule)
    } catch (error) {
      console.error('Error loading schedule:', error)
      setUpcomingSchedule([]) // Set empty array as fallback
    } finally {
      setScheduleLoading(false)
    }
  }

  async function handleGenerateNext() {
    setGenerating(true)
    setError('')
    setSuccess('')
    
    try {
      console.log('Starting single content generation...')
      const result = await generateNextScheduledContent()
      console.log('Generation result:', result)
      setSuccess(`✅ Generated "${result.post.title}" by ${result.supporter.name}${result.isContinuation ? ' (continuation)' : ''}`)
      
      // Refresh schedule and notify parent
      await loadUpcomingSchedule()
      onContentGenerated()
    } catch (error) {
      console.error('Error generating content:', error)
      setError(`Failed to generate content: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  async function handleBatchGenerate() {
    setBatchGenerating(true)
    setError('')
    setSuccess('')
    setResults([])
    
    try {
      const batchResults = await generateBatchContent(batchCount)
      setResults(batchResults)
      
      const successCount = batchResults.filter(r => r.success).length
      const failureCount = batchResults.length - successCount
      
      setSuccess(`✅ Batch generation complete! ${successCount} successful, ${failureCount} failed.`)
      
      // Refresh schedule and notify parent
      await loadUpcomingSchedule()
      onContentGenerated()
    } catch (error) {
      console.error('Error in batch generation:', error)
      setError(`Batch generation failed: ${error.message}`)
    } finally {
      setBatchGenerating(false)
    }
  }

  async function handleGenerateWeekendNewsletters() {
    setWeekendGenerating(true)
    setError('')
    setSuccess('')
    
    try {
      // Generate newsletters for this week (Monday as start)
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1) // Monday of current week
      
      console.log('📅 Generating weekend newsletters for week starting:', weekStart.toLocaleDateString())
      const results = await generateWeekendNewsletters(weekStart)
      
      const successCount = results.filter(r => r.success).length
      setSuccess(`✅ Generated ${successCount} weekend newsletters (Saturday recap + Sunday preview)`)
      
      // Refresh schedule and notify parent
      await loadUpcomingSchedule()
      onContentGenerated()
    } catch (error) {
      console.error('Error generating weekend newsletters:', error)
      setError(`Failed to generate weekend newsletters: ${error.message}`)
    } finally {
      setWeekendGenerating(false)
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-surface border border-theme-border rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-theme-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-theme-text">
                🤖 Automated Content Generation
              </h2>
              <p className="text-theme-text-muted mt-2">
                Generate content weeks ahead based on your schedule
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-theme-text-muted hover:text-theme-text text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Single Generation */}
            <div className="bg-theme-primary border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-text mb-3">⚡ Generate Next Post</h3>
              <p className="text-theme-text-muted text-sm mb-4">
                Fills the next empty slot in your calendar
              </p>
              <button
                onClick={handleGenerateNext}
                disabled={generating || batchGenerating || weekendGenerating}
                className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating...' : 'Generate Next Post'}
              </button>
            </div>

            {/* Batch Generation */}
            <div className="bg-theme-primary border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-text mb-3">📦 Batch Generation</h3>
              <p className="text-theme-text-muted text-sm mb-3">
                Generate multiple posts to build up your content queue
              </p>
              <div className="flex items-center space-x-3 mb-4">
                <label className="text-theme-text text-sm">Count:</label>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value))}
                  className="px-3 py-1 bg-theme-surface border border-theme-border rounded text-theme-text text-sm"
                >
                  <option value={3}>3 posts</option>
                  <option value={5}>5 posts</option>
                  <option value={10}>10 posts</option>
                  <option value={15}>15 posts</option>
                </select>
              </div>
              <button
                onClick={handleBatchGenerate}
                disabled={generating || batchGenerating || weekendGenerating}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchGenerating ? 'Generating...' : `Generate ${batchCount} Posts`}
              </button>
            </div>

            {/* Weekend Newsletters */}
            <div className="bg-theme-primary border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-text mb-3">📧 Weekend Newsletters</h3>
              <p className="text-theme-text-muted text-sm mb-4">
                Generate Saturday recap + Sunday preview for this week
              </p>
              <button
                onClick={handleGenerateWeekendNewsletters}
                disabled={generating || batchGenerating || weekendGenerating}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {weekendGenerating ? 'Generating...' : 'Generate Weekend Newsletters'}
              </button>
            </div>
          </div>

          {/* Messages */}
          {success && (
            <div className="p-4 bg-green-900 border border-green-700 rounded-lg">
              <p className="text-green-200">{success}</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Batch Results */}
          {results.length > 0 && (
            <div className="bg-theme-primary border border-theme-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-text mb-4">📊 Batch Results</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-theme-surface rounded">
                    {result.success ? (
                      <>
                        <div>
                          <span className="text-green-600">✅</span>
                          <span className="text-theme-text ml-2">{result.post.title}</span>
                          <span className="text-theme-text-muted text-sm ml-2">by {result.supporter.name}</span>
                          {result.isContinuation && (
                            <span className="text-blue-600 text-xs ml-2">(continuation)</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div>
                        <span className="text-red-600">❌</span>
                        <span className="text-theme-text-muted ml-2">Failed: {result.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Schedule */}
          <div className="bg-theme-primary border border-theme-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-text">📅 Upcoming Schedule (Next 4 Weeks)</h3>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-900 border-2 border-green-600 rounded"></div>
                  <span className="text-theme-text-muted">Published</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-900 border-2 border-blue-600 rounded"></div>
                  <span className="text-theme-text-muted">Draft</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-theme-surface border-2 border-theme-border border-dashed rounded"></div>
                  <span className="text-theme-text-muted">Empty</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {scheduleLoading ? (
                <div className="text-center py-8 text-theme-text-muted">
                  Loading schedule...
                </div>
              ) : upcomingSchedule.length === 0 ? (
                <div className="text-center py-8 text-theme-text-muted">
                  No schedule data available
                </div>
              ) : (
                upcomingSchedule.map((week, weekIndex) => (
                <div key={weekIndex} className="bg-theme-surface rounded-lg p-4">
                  <h4 className="font-semibold text-theme-text mb-3">
                    Week {week.weekNumber} - {formatDate(week.startDate)}
                  </h4>
                  <div className="grid grid-cols-7 gap-2">
                    {week.days.map((day, dayIndex) => (
                      <div 
                        key={dayIndex} 
                        className={`text-center p-2 rounded-lg border-2 ${
                          day.filled 
                            ? day.status === 'published' 
                              ? 'bg-green-900 border-green-600' 
                              : 'bg-blue-900 border-blue-600'
                            : 'bg-theme-surface border-theme-border border-dashed'
                        }`}
                      >
                        <div className="text-xs text-theme-text-muted mb-1">
                          {day.dayName.slice(0, 3)}
                        </div>
                        <div className="text-xs font-medium text-theme-text">
                          {day.filled ? (
                            <>
                              {day.status === 'published' ? '✅' : '📝'} {day.supporter?.name || '-'}
                            </>
                          ) : (
                            <>
                              ⭕ {day.category === 'weekly-recap' ? 'Recap' :
                                  day.category === 'weekly-preview' ? 'Preview' :
                                  day.category}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-theme-text-muted mt-1">
                          {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-200 mb-2">💡 How This Works</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• <strong>Next Empty Slot:</strong> Finds the next empty calendar day and fills it</li>
              <li>• <strong>Smart Scheduling:</strong> Skips filled days and moves to the next available slot</li>
              <li>• <strong>Batch Generation:</strong> Builds up weeks of content ahead of time</li>
              <li>• <strong>Visual Calendar:</strong> ✅ Published | 📝 Draft | ⭕ Empty</li>
              <li>• <strong>Review Ready:</strong> All posts saved as drafts for your review before publishing</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-theme-border flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-theme-primary text-theme-text rounded-lg hover:bg-theme-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
