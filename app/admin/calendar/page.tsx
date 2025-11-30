'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { credentials: 'include', ...init })
}

export default function AdminCalendar() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(1)
    return today
  })
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const [sending26thReminder, setSending26thReminder] = useState(false)
  const [sending1stAnnouncement, setSending1stAnnouncement] = useState(false)
  const [sending8thReminder, setSending8thReminder] = useState(false)
  const [sending15thReminder, setSending15thReminder] = useState(false)
  const [sending5thReminder, setSending5thReminder] = useState(false)
  const [sending12thReminder, setSending12thReminder] = useState(false)
  const [sending19thReminder, setSending19thReminder] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        setAuthenticated(true)
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(1)
    setCurrentMonth(today)
  }

  // Get next month label
  const getNextMonthLabel = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    return nextMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }

  // Get current month label
  const getCurrentMonthLabel = () => {
    return currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }

  // Handle 26th reminder
  const handleSend26thReminder = async () => {
    try {
      setSending26thReminder(true)
      setMessage(null)

      const response = await authorizedFetch('/api/admin/calendar/reminder-26th', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextMonthLabel: getNextMonthLabel(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder email')
      }

      setMessage({
        type: 'success',
        text: `Sent reminder email to ${data.sent} contact${data.sent === 1 ? '' : 's'}. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reminder email' })
    } finally {
      setSending26thReminder(false)
    }
  }

  // Handle 1st announcement
  const handleSend1stAnnouncement = async () => {
    try {
      setSending1stAnnouncement(true)
      setMessage(null)

      const response = await authorizedFetch('/api/admin/calendar/announce-1st', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthLabel: getCurrentMonthLabel(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send announcement email')
      }

      setMessage({
        type: 'success',
        text: `Sent announcement email to ${data.sent} contact${data.sent === 1 ? '' : 's'}. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send announcement email' })
    } finally {
      setSending1stAnnouncement(false)
    }
  }

  // Handle 8th reminder
  const handleSend8thReminder = async () => {
    try {
      setSending8thReminder(true)
      setMessage(null)

      const response = await authorizedFetch('/api/admin/calendar/reminder-8th', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder email')
      }

      setMessage({
        type: 'success',
        text: `Sent reminder email to ${data.sent} contact${data.sent === 1 ? '' : 's'}. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reminder email' })
    } finally {
      setSending8thReminder(false)
    }
  }

  // Handle 15th reminder
  const handleSend15thReminder = async () => {
    try {
      setSending15thReminder(true)
      setMessage(null)

      const response = await authorizedFetch('/api/admin/calendar/reminder-15th', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder email')
      }

      setMessage({
        type: 'success',
        text: `Sent reminder email to ${data.sent} contact${data.sent === 1 ? '' : 's'}. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reminder email' })
    } finally {
      setSending15thReminder(false)
    }
  }

  // Handle 5th reminder
  const handleSend5thReminder = async () => {
    try {
      setSending5thReminder(true)
      setMessage(null)

      const response = await authorizedFetch('/api/admin/calendar/reminder-5th', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder email')
      }

      setMessage({
        type: 'success',
        text: `Sent reminder email to ${data.sent} contact${data.sent === 1 ? '' : 's'}. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reminder email' })
    } finally {
      setSending5thReminder(false)
    }
  }

  // Handle 12th reminder
  const handleSend12thReminder = async () => {
    try {
      setSending12thReminder(true)
      setMessage(null)

      const response = await authorizedFetch('/api/admin/calendar/reminder-12th', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder email')
      }

      setMessage({
        type: 'success',
        text: `Sent reminder email to ${data.sent} contact${data.sent === 1 ? '' : 's'}. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reminder email' })
    } finally {
      setSending12thReminder(false)
    }
  }

  // Handle 19th reminder
  const handleSend19thReminder = async () => {
    try {
      setSending19thReminder(true)
      setMessage(null)

      const response = await authorizedFetch('/api/admin/calendar/reminder-19th', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder email')
      }

      setMessage({
        type: 'success',
        text: `Sent reminder email to ${data.sent} contact${data.sent === 1 ? '' : 's'}. ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reminder email' })
    } finally {
      setSending19thReminder(false)
    }
  }

  // Render calendar
  const renderCalendar = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const startingDay = monthStart.getDay()
    const calendarDays: Array<Date | null> = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDay; i++) {
      calendarDays.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="px-4 py-2 rounded-lg border border-brown-light text-brown-dark text-sm font-semibold hover:bg-brown-light/20 transition-colors"
            aria-label="Previous month"
          >
            ← Previous
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-display text-brown-dark">
              {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              onClick={goToToday}
              className="mt-1 text-sm text-brown hover:text-brown-dark underline"
            >
              Jump to today
            </button>
          </div>
          <button
            type="button"
            onClick={goToNextMonth}
            className="px-4 py-2 rounded-lg border border-brown-light text-brown-dark text-sm font-semibold hover:bg-brown-light/20 transition-colors"
            aria-label="Next month"
          >
            Next →
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-brown-dark uppercase tracking-wide py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dayDate, index) => {
            if (!dayDate) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const day = dayDate.getDate()
            const is26th = day === 26
            const is1st = day === 1
            const is8th = day === 8
            const is15th = day === 15
            const is5th = day === 5
            const is12th = day === 12
            const is19th = day === 19
            const isSelected = selectedDate === day
            const isToday = dayDate.toDateString() === today.toDateString()
            const isPast = dayDate < today && !isToday

            let cellClasses =
              'relative aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brown-dark'

            if (isSelected) {
              cellClasses += ' bg-brown-600 text-white border-brown-700 shadow-lg scale-105'
            } else if (is26th || is1st || is8th || is15th || is5th || is12th || is19th) {
              if (is26th) {
                cellClasses += ' bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200 shadow-md'
              } else if (is1st) {
                cellClasses += ' bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200 shadow-md'
              } else if (is8th) {
                cellClasses += ' bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200 shadow-md'
              } else if (is15th) {
                cellClasses += ' bg-pink-100 text-pink-900 border-pink-300 hover:bg-pink-200 shadow-md'
              } else if (is5th) {
                cellClasses += ' bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-md'
              } else if (is12th) {
                cellClasses += ' bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200 shadow-md'
              } else if (is19th) {
                cellClasses += ' bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200 shadow-md'
              }
            } else if (isPast) {
              cellClasses += ' bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            } else {
              cellClasses += ' bg-white text-brown-900 border-brown-light hover:bg-brown-light/20 hover:border-brown-dark'
            }

            if (isToday && !isSelected) {
              cellClasses += ' ring-2 ring-brown-dark/40'
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => !isPast && setSelectedDate(isSelected ? null : day)}
                disabled={isPast}
                className={cellClasses}
                aria-pressed={isSelected}
              >
                <span className="text-lg font-semibold leading-none">{day}</span>
                {is26th && (
                  <span className="text-xs font-medium bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                    Reminder
                  </span>
                )}
                {is1st && (
                  <span className="text-xs font-medium bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                    Open
                  </span>
                )}
                {is8th && (
                  <span className="text-xs font-medium bg-purple-500 text-white px-1.5 py-0.5 rounded-full">
                    Check-in
                  </span>
                )}
                {is15th && (
                  <span className="text-xs font-medium bg-pink-500 text-white px-1.5 py-0.5 rounded-full">
                    Nudge
                  </span>
                )}
                {is5th && (
                  <span className="text-xs font-medium bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                    Check-in
                  </span>
                )}
                {is12th && (
                  <span className="text-xs font-medium bg-teal-500 text-white px-1.5 py-0.5 rounded-full">
                    Tips
                  </span>
                )}
                {is19th && (
                  <span className="text-xs font-medium bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                    Self-care
                  </span>
                )}
                {isToday && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-brown-dark rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded bg-blue-100 border-2 border-blue-300" />
            <span>26th - Reminder</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded bg-emerald-100 border-2 border-emerald-300" />
            <span>1st - Open</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded bg-purple-100 border-2 border-purple-300" />
            <span>8th - Check-in</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded bg-pink-100 border-2 border-pink-300" />
            <span>15th - Nudge</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded bg-amber-100 border-2 border-amber-300" />
            <span>5th - Check-in</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded bg-teal-100 border-2 border-teal-300" />
            <span>12th - Tips</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded bg-rose-100 border-2 border-rose-300" />
            <span>19th - Self-care</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-6 h-6 rounded border-2 border-brown-dark ring-2 ring-offset-2 ring-brown-dark bg-brown-500" />
            <span>Selected day</span>
          </div>
        </div>
      </div>
    )
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown text-lg">Loading calendar...</div>
      </div>
    )
  }

  const is26thSelected = selectedDate === 26
  const is1stSelected = selectedDate === 1
  const is8thSelected = selectedDate === 8
  const is15thSelected = selectedDate === 15
  const is5thSelected = selectedDate === 5
  const is12thSelected = selectedDate === 12
  const is19thSelected = selectedDate === 19
  const today = new Date()
  const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()
  const currentDay = today.getDate()

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/admin/dashboard"
            className="text-brown hover:text-brown-dark font-semibold"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Toast Notification */}
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-display text-brown-dark mb-2">Calendar Email Reminders</h1>
          <p className="text-brown text-sm">
            Manage your monthly booking email workflow. Send reminders on the 5th, 8th, 12th, 15th, 19th, and 26th, plus announcements on the 1st.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            {renderCalendar()}
          </div>

          {/* Email Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 space-y-6">
              {/* 26th Reminder Section */}
              <div className="border-2 border-blue-200 rounded-lg p-5 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📅</span>
                  <h3 className="text-lg font-semibold text-blue-900">26th Reminder</h3>
                </div>
                <p className="text-sm text-blue-800 mb-4">
                  Send a reminder that bookings for <strong>{getNextMonthLabel()}</strong> will open on the 1st.
                </p>
                {is26thSelected && (
                  <button
                    type="button"
                    onClick={handleSend26thReminder}
                    disabled={sending26thReminder}
                    className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending26thReminder ? 'Sending...' : `Send Reminder for ${getNextMonthLabel()}`}
                  </button>
                )}
                {!is26thSelected && (
                  <p className="text-xs text-blue-700 italic">
                    Click on the 26th in the calendar to send the reminder
                  </p>
                )}
              </div>

              {/* 8th Reminder Section */}
              <div className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">💁‍♀️</span>
                  <h3 className="text-lg font-semibold text-purple-900">8th Check-in</h3>
                </div>
                <p className="text-sm text-purple-800 mb-4">
                  Send a mid-week check-in to remind clients to book their lash appointment.
                </p>
                {is8thSelected && (
                  <button
                    type="button"
                    onClick={handleSend8thReminder}
                    disabled={sending8thReminder}
                    className="w-full px-4 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending8thReminder ? 'Sending...' : 'Send 8th Check-in Email'}
                  </button>
                )}
                {!is8thSelected && (
                  <p className="text-xs text-purple-700 italic">
                    Click on the 8th in the calendar to send the check-in
                  </p>
                )}
              </div>

              {/* 15th Reminder Section */}
              <div className="border-2 border-pink-200 rounded-lg p-5 bg-pink-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">💫</span>
                  <h3 className="text-lg font-semibold text-pink-900">15th Nudge</h3>
                </div>
                <p className="text-sm text-pink-800 mb-4">
                  Send a gentle mid-month nudge to encourage clients to refresh their lashes.
                </p>
                {is15thSelected && (
                  <button
                    type="button"
                    onClick={handleSend15thReminder}
                    disabled={sending15thReminder}
                    className="w-full px-4 py-3 rounded-lg bg-pink-600 text-white font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending15thReminder ? 'Sending...' : 'Send 15th Nudge Email'}
                  </button>
                )}
                {!is15thSelected && (
                  <p className="text-xs text-pink-700 italic">
                    Click on the 15th in the calendar to send the nudge
                  </p>
                )}
              </div>

              {/* 1st Announcement Section */}
              <div className="border-2 border-emerald-200 rounded-lg p-5 bg-emerald-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">✨</span>
                  <h3 className="text-lg font-semibold text-emerald-900">1st Announcement</h3>
                </div>
                <p className="text-sm text-emerald-800 mb-4">
                  Send an announcement that bookings for <strong>{getCurrentMonthLabel()}</strong> are now open.
                </p>
                {is1stSelected && (
                  <button
                    type="button"
                    onClick={handleSend1stAnnouncement}
                    disabled={sending1stAnnouncement}
                    className="w-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending1stAnnouncement ? 'Sending...' : `Send Announcement for ${getCurrentMonthLabel()}`}
                  </button>
                )}
                {!is1stSelected && (
                  <p className="text-xs text-emerald-700 italic">
                    Click on the 1st in the calendar to send the announcement
                  </p>
                )}
              </div>

              {/* 5th Reminder Section */}
              <div className="border-2 border-amber-200 rounded-lg p-5 bg-amber-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🤎</span>
                  <h3 className="text-lg font-semibold text-amber-900">5th Check-in</h3>
                </div>
                <p className="text-sm text-amber-800 mb-4">
                  Send a friendly bestie check-in to see how clients are doing and remind them you're here.
                </p>
                {is5thSelected && (
                  <button
                    type="button"
                    onClick={handleSend5thReminder}
                    disabled={sending5thReminder}
                    className="w-full px-4 py-3 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending5thReminder ? 'Sending...' : 'Send 5th Check-in Email'}
                  </button>
                )}
                {!is5thSelected && (
                  <p className="text-xs text-amber-700 italic">
                    Click on the 5th in the calendar to send the check-in
                  </p>
                )}
              </div>

              {/* 12th Reminder Section */}
              <div className="border-2 border-teal-200 rounded-lg p-5 bg-teal-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-lg font-semibold text-teal-900">12th Tips</h3>
                </div>
                <p className="text-sm text-teal-800 mb-4">
                  Share lash care tips and friendly advice to help clients maintain their lashes between appointments.
                </p>
                {is12thSelected && (
                  <button
                    type="button"
                    onClick={handleSend12thReminder}
                    disabled={sending12thReminder}
                    className="w-full px-4 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending12thReminder ? 'Sending...' : 'Send 12th Tips Email'}
                  </button>
                )}
                {!is12thSelected && (
                  <p className="text-xs text-teal-700 italic">
                    Click on the 12th in the calendar to send the tips email
                  </p>
                )}
              </div>

              {/* 19th Reminder Section */}
              <div className="border-2 border-rose-200 rounded-lg p-5 bg-rose-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">💝</span>
                  <h3 className="text-lg font-semibold text-rose-900">19th Self-care</h3>
                </div>
                <p className="text-sm text-rose-800 mb-4">
                  Send a gentle reminder about self-care and treating yourself—because they deserve it.
                </p>
                {is19thSelected && (
                  <button
                    type="button"
                    onClick={handleSend19thReminder}
                    disabled={sending19thReminder}
                    className="w-full px-4 py-3 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending19thReminder ? 'Sending...' : 'Send 19th Self-care Email'}
                  </button>
                )}
                {!is19thSelected && (
                  <p className="text-xs text-rose-700 italic">
                    Click on the 19th in the calendar to send the self-care email
                  </p>
                )}
              </div>

              {/* Workflow Info */}
              <div className="border-2 border-brown-light rounded-lg p-5 bg-pink-light/30">
                <h3 className="text-lg font-semibold text-brown-dark mb-3">Email Workflow</h3>
                <div className="space-y-3 text-sm text-brown-dark">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-600">8th:</span>
                    <p>Mid-week check-in to remind clients to book their lash appointment</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-pink-600">15th:</span>
                    <p>Gentle mid-month nudge to encourage lash refresh</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600">26th:</span>
                    <p>Send reminder that bookings will open on the 1st of next month</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-emerald-600">1st:</span>
                    <p>Send announcement that bookings are now open for the current month</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-amber-600">5th:</span>
                    <p>Friendly bestie check-in to see how clients are doing</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-teal-600">12th:</span>
                    <p>Share lash care tips and friendly advice</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-rose-600">19th:</span>
                    <p>Gentle reminder about self-care and treating yourself</p>
                  </div>
                  <div className="pt-3 border-t border-brown-light/30">
                    <p className="text-xs text-gray-600">
                      Emails are sent to everyone in your system (past clients + subscribers)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {isCurrentMonth && (
                <div className="border-2 border-brown-light rounded-lg p-5 bg-white">
                  <h3 className="text-lg font-semibold text-brown-dark mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    {currentDay >= 8 && (
                      <button
                        type="button"
                        onClick={handleSend8thReminder}
                        disabled={sending8thReminder}
                        className="w-full px-4 py-2 rounded-lg bg-purple-100 text-purple-900 font-semibold hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {sending8thReminder ? 'Sending...' : 'Send 8th Check-in Now'}
                      </button>
                    )}
                    {currentDay >= 15 && (
                      <button
                        type="button"
                        onClick={handleSend15thReminder}
                        disabled={sending15thReminder}
                        className="w-full px-4 py-2 rounded-lg bg-pink-100 text-pink-900 font-semibold hover:bg-pink-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {sending15thReminder ? 'Sending...' : 'Send 15th Nudge Now'}
                      </button>
                    )}
                    {currentDay >= 26 && (
                      <button
                        type="button"
                        onClick={handleSend26thReminder}
                        disabled={sending26thReminder}
                        className="w-full px-4 py-2 rounded-lg bg-blue-100 text-blue-900 font-semibold hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {sending26thReminder ? 'Sending...' : 'Send 26th Reminder Now'}
                      </button>
                    )}
                    {currentDay === 1 && (
                      <button
                        type="button"
                        onClick={handleSend1stAnnouncement}
                        disabled={sending1stAnnouncement}
                        className="w-full px-4 py-2 rounded-lg bg-emerald-100 text-emerald-900 font-semibold hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {sending1stAnnouncement ? 'Sending...' : 'Send 1st Announcement Now'}
                      </button>
                    )}
                    {currentDay >= 5 && (
                      <button
                        type="button"
                        onClick={handleSend5thReminder}
                        disabled={sending5thReminder}
                        className="w-full px-4 py-2 rounded-lg bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {sending5thReminder ? 'Sending...' : 'Send 5th Check-in Now'}
                      </button>
                    )}
                    {currentDay >= 12 && (
                      <button
                        type="button"
                        onClick={handleSend12thReminder}
                        disabled={sending12thReminder}
                        className="w-full px-4 py-2 rounded-lg bg-teal-100 text-teal-900 font-semibold hover:bg-teal-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {sending12thReminder ? 'Sending...' : 'Send 12th Tips Now'}
                      </button>
                    )}
                    {currentDay >= 19 && (
                      <button
                        type="button"
                        onClick={handleSend19thReminder}
                        disabled={sending19thReminder}
                        className="w-full px-4 py-2 rounded-lg bg-rose-100 text-rose-900 font-semibold hover:bg-rose-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {sending19thReminder ? 'Sending...' : 'Send 19th Self-care Now'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
