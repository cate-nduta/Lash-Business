'use client'

import { useState, memo, useMemo, useEffect } from 'react'

interface CalendarPickerProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  availableDates: string[] // Array of YYYY-MM-DD strings
  fullyBookedDates?: string[] // Array of YYYY-MM-DD strings that are fully booked
  loading?: boolean
  minimumBookingDate?: string // Minimum date for bookings (YYYY-MM-DD format)
  availabilityData?: {
    businessHours?: {
      [key: string]: { open: string; close: string; enabled: boolean }
    }
    timeSlots?: {
      weekdays?: Array<{ hour: number; minute: number; label: string }>
      friday?: Array<{ hour: number; minute: number; label: string }>
      saturday?: Array<{ hour: number; minute: number; label: string }>
      sunday?: Array<{ hour: number; minute: number; label: string }>
    }
  }
}

function CalendarPicker({ 
  selectedDate, 
  onDateSelect, 
  availableDates, 
  fullyBookedDates = [], 
  loading = false, 
  minimumBookingDate, 
  availabilityData 
}: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const [hasNavigatedToAvailableMonth, setHasNavigatedToAvailableMonth] = useState(false)
  
  // Navigate to the month with the earliest available date when dates are first loaded
  useEffect(() => {
    // Only navigate once when dates first load (not on every re-render)
    if (hasNavigatedToAvailableMonth || loading || !availableDates || availableDates.length === 0) {
      return
    }

    // Find the earliest available date
    const sortedDates = [...availableDates].sort()
    const earliestDate = sortedDates[0]
    
    if (earliestDate) {
      try {
        // Parse the date string (YYYY-MM-DD)
        const [year, month] = earliestDate.split('-').map(Number)
        if (year && month && month >= 1 && month <= 12) {
          const earliestDateObj = new Date(year, month - 1, 1)
          const currentViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
          
          // Update to the month with the earliest available date
          if (earliestDateObj.getTime() !== currentViewMonth.getTime()) {
            setViewMonth(earliestDateObj)
          }
          setHasNavigatedToAvailableMonth(true)
        }
      } catch (error) {
        console.error('Error parsing earliest available date:', error)
        setHasNavigatedToAvailableMonth(true) // Mark as done even on error to prevent retries
      }
    }
  }, [availableDates, loading, hasNavigatedToAvailableMonth, viewMonth])

  // Normalize selectedDate to ensure it's a valid YYYY-MM-DD string or empty
  // This ensures only ONE date can be selected at a time
  const normalizedSelectedDate = useMemo(() => {
    // Explicitly check for null, undefined, or empty string
    if (!selectedDate) {
      return ''
    }
    if (typeof selectedDate !== 'string') {
      return ''
    }
    const trimmed = selectedDate.trim()
    // Validate format is exactly YYYY-MM-DD (10 characters)
    if (trimmed.length !== 10) {
      return ''
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return ''
    }
    return trimmed
  }, [selectedDate])

  // Debug: Log selectedDate to console (remove after fixing)
  useEffect(() => {
    if (selectedDate) {
      console.log('📌 CalendarPicker selectedDate:', selectedDate, 'normalized:', normalizedSelectedDate)
    }
  }, [selectedDate, normalizedSelectedDate])

  // Helper function to format date as YYYY-MM-DD
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Memoize calendar month calculations
  const { daysInMonth, startingDayOfWeek } = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    return {
      daysInMonth: last.getDate(),
      startingDayOfWeek: first.getDay()
    }
  }, [viewMonth])

  // Navigate months
  const goToPreviousMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }

  // Check if a date is available for booking
  // ONLY use API response from admin panel - NO hard-coded fallbacks
  const isDateAvailable = (dateStr: string): boolean => {
    // Check if fully booked first
    if (fullyBookedDates?.includes(dateStr)) {
      return false
    }

    // ONLY use API dates from admin panel - no fallback, no client-side generation
    if (availableDates && availableDates.length > 0) {
      return availableDates.includes(dateStr)
    }

    // If API hasn't loaded yet or returned no dates, date is not available
    // This ensures availability is ONLY determined by the admin panel
    return false
  }

  // Check if date is in the past
  const isPastDate = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return date < today
  }

  // Check if date is before minimum booking date
  const isBeforeMinimumBookingDate = (dateStr: string): boolean => {
    if (!minimumBookingDate) return false
    const date = new Date(dateStr + 'T00:00:00')
    const minDate = new Date(minimumBookingDate + 'T00:00:00')
    date.setHours(0, 0, 0, 0)
    minDate.setHours(0, 0, 0, 0)
    return date < minDate
  }

  // Check if date is fully booked
  const isFullyBookedDate = (dateStr: string): boolean => {
    return fullyBookedDates?.includes(dateStr) ?? false
  }

  // Handle date click
  const handleDateClick = (day: number) => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth() + 1
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    if (isPastDate(dateStr)) return
    if (isBeforeMinimumBookingDate(dateStr)) return
    if (isFullyBookedDate(dateStr)) return
    if (!isDateAvailable(dateStr)) return

    onDateSelect(dateStr)
  }

  // Generate calendar days array
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    return days
  }, [startingDayOfWeek, daysInMonth])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-3xl shadow-soft p-6 border border-[var(--color-text)]/10">
        <div className="text-center text-gray-500">Loading calendar...</div>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* SELECTED DATE - Use theme primary color */
        div.grid button[data-selected="true"]:not([data-not-available="true"]),
        div.grid button[data-selected="true"]:not([data-not-available="true"]):hover {
          background-color: var(--color-primary) !important;
          color: var(--color-on-primary) !important;
        }
        /* FORCE ALL UNAVAILABLE DATES TO GREY - MAXIMUM SPECIFICITY - NO BLUE! */
        div.grid button[data-not-available="true"],
        div.grid button[data-not-available="true"]:hover,
        div.grid button[data-not-available="true"]:focus,
        div.grid button[data-not-available="true"]:active,
        div.grid button[data-not-available="true"]:visited,
        .calendar-day-button[data-not-available="true"],
        .calendar-day-button[data-not-available="true"]:hover,
        .calendar-day-button[data-not-available="true"]:focus,
        button[data-not-available="true"],
        button[data-not-available="true"]:hover,
        button[data-not-available="true"]:focus,
        button[data-not-available="true"]:active,
        button[data-not-available="true"]:visited,
        button:disabled[data-not-available="true"],
        button[aria-disabled="true"][data-not-available="true"],
        button[aria-disabled="true"][data-not-available="true"]:hover {
          background-color: #d1d5db !important;
          background: #d1d5db !important;
          background-image: none !important;
          color: #6b7280 !important;
          border-color: #9ca3af !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          opacity: 1 !important;
        }
        /* REMOVE ANY BLUE/PRIMARY COLORS - Force white for available dates */
        div.grid button[data-not-available="false"]:not(:disabled),
        div.grid button[data-not-available="false"]:not(:disabled):hover,
        div.grid button[data-not-available="false"]:not(:disabled):focus,
        div.grid button[data-not-available="false"]:not(:disabled):active,
        .calendar-day-button[data-not-available="false"]:not(:disabled),
        .calendar-day-button[data-not-available="false"]:not(:disabled):hover,
        .calendar-day-button[data-not-available="false"]:not(:disabled):focus,
        button[data-not-available="false"]:not(:disabled),
        button[data-not-available="false"]:not(:disabled):hover,
        button[data-not-available="false"]:not(:disabled):focus {
          background-color: #ffffff !important;
          background: #ffffff !important;
          background-image: none !important;
          color: #374151 !important;
          border-color: #e5e7eb !important;
        }
        /* Override ALL possible blue/primary color classes */
        div.grid button,
        div.grid button:hover,
        div.grid button:focus {
          background-color: #ffffff !important;
          background: #ffffff !important;
        }
        div.grid button[data-not-available="true"],
        div.grid button[data-not-available="true"]:hover {
          background-color: #d1d5db !important;
          background: #d1d5db !important;
        }
      `}} />
      <div className="w-full max-w-3xl mx-auto bg-[var(--color-surface)] rounded-2xl shadow-soft p-3 sm:p-4 md:p-5 border border-[var(--color-text)]/10">
        {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2.5 sm:p-2 hover:bg-[color-mix(in srgb,var(--color-primary) 18%, var(--color-surface) 82%)] rounded-lg transition-all transform hover:scale-110 hover:-rotate-12 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 sm:w-5 sm:h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-display text-[var(--color-text)] font-semibold px-2 text-center flex-1">
          {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2.5 sm:p-2 hover:bg-[color-mix(in srgb,var(--color-primary) 18%, var(--color-surface) 82%)] rounded-lg transition-all transform hover:scale-110 hover:rotate-12 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 sm:w-5 sm:h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 sm:mb-1.5">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-[10px] sm:text-xs md:text-sm font-semibold text-[var(--color-text)] py-2 sm:py-1.5">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const year = viewMonth.getFullYear()
            const month = viewMonth.getMonth() + 1
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            
            // Check date states - STRICT comparison for selected date
            // Only mark as selected if normalizedSelectedDate EXACTLY matches this dateStr
            // CRITICAL: Only ONE date should match - normalizedSelectedDate must be non-empty and match exactly
            const hasValidSelection = normalizedSelectedDate && normalizedSelectedDate.length === 10
            const isSelected = hasValidSelection && normalizedSelectedDate === dateStr
            const isPast = isPastDate(dateStr)
            const isBeforeMin = isBeforeMinimumBookingDate(dateStr)
            const isFullyBooked = isFullyBookedDate(dateStr)
            const isAvailable = isDateAvailable(dateStr)
            const isToday = dateStr === formatDateKey(new Date())
            
            // Determine if date is clickable
            const isClickable = !isPast && !isBeforeMin && !isFullyBooked && isAvailable
            const isNotAvailable = !isClickable

            // Apply styles based on state - SELECTED (theme color), UNAVAILABLE (grey), AVAILABLE (white)
            let cellClasses = 'calendar-day-button relative aspect-square flex items-center justify-center rounded-lg transition-all font-semibold overflow-hidden text-xs sm:text-sm md:text-base touch-manipulation min-h-[44px] min-w-[44px] '
            let cellStyle: React.CSSProperties = {}

            // SELECTED date - USE THEME PRIMARY COLOR
            if (isSelected && hasValidSelection && normalizedSelectedDate === dateStr) {
              // SELECTED: Use theme primary color - adapts to different themes
              cellClasses += 'shadow-xl transform scale-[1.03] border border-[var(--color-primary-dark)] ring-2 ring-[var(--color-accent)]/40 cursor-pointer'
              cellStyle = {
                backgroundColor: 'var(--color-primary)', // Theme primary color
                color: 'var(--color-on-primary)', // Theme on-primary color (usually white)
                backgroundImage: 'none'
              } as React.CSSProperties
            }
            // NOT AVAILABLE dates - FORCE GREY (past, fully booked, before min date, not in calendar)
            else if (isNotAvailable === true) {
              // NOT AVAILABLE: FORCE GREY GREY GREY - NO BLUE ALLOWED!
              cellClasses += 'cursor-not-allowed border border-gray-300 shadow-inner'
              cellStyle = {
                backgroundColor: '#d1d5db', // Grey-300 - FORCE GREY
                background: '#d1d5db', // Force with background property too
                backgroundImage: 'none', // Remove any gradients
                color: '#6b7280', // Grey-500 for text
                borderColor: '#9ca3af' // Grey border
              } as React.CSSProperties
            } 
            // AVAILABLE dates - WHITE (FORCE WHITE, no exceptions)
            else {
              // AVAILABLE: White background - FORCE WHITE
              cellClasses += 'hover:bg-gray-50 hover:border-gray-300 hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] transform hover:scale-[1.02] cursor-pointer'
              if (isToday) {
                cellClasses += 'border-2 border-gray-400'
              } else {
                cellClasses += 'border border-gray-200'
              }
              cellStyle = {
                backgroundColor: '#ffffff', // Pure white - NO BLUE, NO BROWN
                color: '#374151' // Dark grey text
              } as React.CSSProperties & { backgroundColor: string; color: string }
            }

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={!isClickable}
                className={cellClasses}
                style={cellStyle}
                type="button"
                data-selected={isSelected ? 'true' : 'false'}
                data-not-available={isNotAvailable ? 'true' : 'false'}
                aria-disabled={!isClickable}
                aria-selected={isSelected ? true : undefined}
                onMouseEnter={(e) => {
                  // Maintain theme color if selected, grey if unavailable, light grey if available
                  if (isSelected) {
                    // Keep theme primary color on hover for selected date
                    e.currentTarget.style.setProperty('background-color', 'var(--color-primary)', 'important')
                    e.currentTarget.style.color = 'var(--color-on-primary)'
                  } else if (isNotAvailable) {
                    // FORCE GREY on hover if unavailable - NO BLUE!
                    e.currentTarget.style.setProperty('background-color', '#d1d5db', 'important')
                    e.currentTarget.style.setProperty('background', '#d1d5db', 'important')
                    e.currentTarget.style.backgroundImage = 'none'
                    e.currentTarget.style.color = '#6b7280'
                  } else {
                    // Light grey hover for available dates
                    e.currentTarget.style.setProperty('background-color', '#f9fafb', 'important')
                    e.currentTarget.style.setProperty('background', '#f9fafb', 'important')
                  }
                }}
                onMouseLeave={(e) => {
                  // Restore original color based on state
                  if (isSelected) {
                    // Keep theme primary color for selected date
                    e.currentTarget.style.setProperty('background-color', 'var(--color-primary)', 'important')
                    e.currentTarget.style.color = 'var(--color-on-primary)'
                  } else if (isNotAvailable) {
                    // FORCE GREY on leave if unavailable - NO BLUE!
                    e.currentTarget.style.setProperty('background-color', '#d1d5db', 'important')
                    e.currentTarget.style.setProperty('background', '#d1d5db', 'important')
                    e.currentTarget.style.backgroundImage = 'none'
                    e.currentTarget.style.color = '#6b7280'
                  } else {
                    // White for available dates
                    e.currentTarget.style.setProperty('background-color', '#ffffff', 'important')
                    e.currentTarget.style.setProperty('background', '#ffffff', 'important')
                  }
                }}
                ref={(el) => {
                  // Force correct colors on render
                  if (el) {
                    setTimeout(() => {
                      if (isSelected) {
                        // Apply theme primary color for selected date
                        el.style.setProperty('background-color', 'var(--color-primary)', 'important')
                        el.style.color = 'var(--color-on-primary)'
                      } else if (isNotAvailable) {
                        // Force grey for unavailable dates - NO BLUE!
                        el.style.setProperty('background-color', '#d1d5db', 'important')
                        el.style.setProperty('background', '#d1d5db', 'important')
                        el.style.backgroundImage = 'none'
                        el.style.color = '#6b7280'
                        el.style.borderColor = '#9ca3af'
                      }
                    }, 0)
                  }
                }}
                title={
                  isBeforeMin
                    ? minimumBookingDate 
                      ? `Bookings start from ${new Date(minimumBookingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      : 'This date is not available for booking'
                    : isPast
                    ? 'Past dates are unavailable'
                    : !isAvailable || isFullyBooked
                    ? 'No booking slots available for this date'
                    : undefined
                }
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 sm:mt-4 mb-2 sm:mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3 mb-2 sm:mb-3 text-[11px] sm:text-xs md:text-sm">
          <div className="flex items-center gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-6 h-6 rounded-md shadow-inner border border-[var(--color-primary-dark)]/30" style={{ backgroundColor: 'var(--color-primary)' }}></div>
            <div>
              <div className="font-bold text-[var(--color-text)] text-xs sm:text-sm">Selected</div>
              <div className="text-xs text-[var(--color-text)]/70">Your chosen date</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: '#ffffff' }}></div>
            <div>
              <div className="font-bold text-[var(--color-text)] text-xs sm:text-sm">Available</div>
              <div className="text-xs text-[var(--color-text)]/70">Click to book</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-6 h-6 rounded-md border border-gray-300" style={{ backgroundColor: '#d1d5db' }}></div>
            <div>
              <div className="font-bold text-[var(--color-text)]/80 text-xs sm:text-sm">Not Available</div>
              <div className="text-xs text-[var(--color-text)]/65">Cannot book</div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default memo(CalendarPicker)
