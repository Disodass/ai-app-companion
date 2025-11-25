import React, { useState, useEffect } from 'react'
import { getUpcomingSchedule } from '../services/automatedScheduler.js'
import DayDetailModal from './admin/DayDetailModal.jsx'

export default function UpcomingSchedule({ weeks = 2, showHeader = true, onPostUpdated }) {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)

  useEffect(() => {
    loadSchedule()
  }, [weeks])

  const loadSchedule = async () => {
    try {
      setLoading(true)
      const upcomingSchedule = await getUpcomingSchedule(weeks)
      setSchedule(upcomingSchedule)
    } catch (err) {
      console.error('Error loading schedule:', err)
      setError('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = (day) => {
    console.log('Day clicked:', day)
    setSelectedDay(day)
    setShowDayModal(true)
    console.log('Modal should be open now')
  }

  const handleCloseModal = () => {
    setShowDayModal(false)
    setSelectedDay(null)
  }

  const handlePostUpdated = () => {
    loadSchedule() // Reload the schedule
    if (onPostUpdated) {
      onPostUpdated() // Notify parent component
    }
  }

  const handleGeneratePost = (dayInfo) => {
    // This will be handled by the parent component
    if (onPostUpdated && onPostUpdated.generatePost) {
      onPostUpdated.generatePost(dayInfo)
    }
  }

  const handleEditPost = (postId) => {
    // Open edit page in new tab to avoid navigation issues
    console.log('Opening edit post in new tab:', postId)
    window.open(`/admin/blog/edit/${postId}`, '_blank')
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return '🟢'
      case 'draft':
        return '🔵'
      case 'weekly-recap':
        return '📧'
      case 'weekly-preview':
        return '📅'
      default:
        return '⚪'
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

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(weeks)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
        <p className="text-red-600">Error loading schedule: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-theme-surface border border-theme-border rounded-lg p-6">
      {showHeader && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-theme-text mb-2">
            Upcoming Schedule
          </h3>
          <p className="text-theme-text-secondary text-sm">
            Our supporters' upcoming blog posts and newsletters
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-theme-text-secondary">Published</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span className="text-theme-text-secondary">Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
          <span className="text-theme-text-secondary">Newsletter</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
          <span className="text-theme-text-secondary">Empty</span>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        {schedule && schedule.length > 0 ? schedule.map((week, weekIndex) => (
          <div key={weekIndex} className="border border-theme-border rounded-lg p-4">
            <h4 className="font-semibold text-theme-text mb-3">
              Week {weekIndex + 1} - {week.days?.[0]?.date?.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </h4>
            
            <div className="grid grid-cols-7 gap-2">
              {week.days && week.days.length > 0 ? week.days.map((day, dayIndex) => {
                const isWeekend = day.day === 0 || day.day === 6
                const isSpecial = day.category === 'weekly-recap' || day.category === 'weekly-preview'
                
                return (
                  <div 
                    key={dayIndex} 
                    className={`p-2 rounded-lg border text-center cursor-pointer hover:shadow-md transition-shadow ${
                      isWeekend 
                        ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
                        : 'bg-white border-gray-200 hover:bg-blue-50'
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {day.dayName.slice(0, 3)}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {day.date?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    </div>
                    
                    {day.filled ? (
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getStatusColor(day.status)}`}>
                        <span className="mr-1">{getStatusIcon(day.status)}</span>
                        <span className="truncate">
                          {isSpecial ? day.category.replace('weekly-', '').replace('recap', 'Recap').replace('preview', 'Preview') : day.supporter?.name}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto"></div>
                    )}
                  </div>
                )
              }) : (
                <div className="col-span-7 text-center py-4 text-theme-text-secondary">
                  No days data available
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-8">
            <p className="text-theme-text-secondary">No schedule data available</p>
          </div>
        )}
      </div>

      {/* Day Detail Modal */}
      <DayDetailModal
        day={selectedDay}
        isOpen={showDayModal}
        onClose={handleCloseModal}
        onPostUpdated={handlePostUpdated}
        onGeneratePost={handleGeneratePost}
        onEditPost={handleEditPost}
      />
    </div>
  )
}
