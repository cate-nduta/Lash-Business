'use client'

import { useState, useEffect } from 'react'

interface CalendarPickerProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  availableDates: string[] // Array of YYYY-MM-DD strings
  fullyBookedDates?: string[] // Array of YYYY-MM-DD strings that are fully booked
  loading?: boolean
  availabilityData?: {
    businessHours: {
      [key: string]: { open: string; close: string; enabled: boolean }
    }
  }
}

export default function CalendarPicker({ selectedDate, onDateSelect, availableDates, fullyBookedDates = [], loading = false, availabilityData }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(new Date())
  
  // Check if Saturday is enabled
  const saturdayEnabled = availabilityData?.businessHours?.saturday?.enabled === true

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const lastDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Navigate months
  const goToPreviousMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }

  // Check if date is available
  const isDateAvailable = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()
    const isSunday = dayOfWeek === 0
    const isSaturday = dayOfWeek === 6
    
    // Saturdays: available if enabled and not past/fully booked
    if (isSaturday) {
      return saturdayEnabled && !fullyBookedDates.includes(dateStr)
    }
    
    // Sundays: always available (if not past and not fully booked)
    if (isSunday) {
      return !fullyBookedDates.includes(dateStr)
    }
    
    // Other dates: available if they're in availableDates and not in fullyBookedDates
    return availableDates.includes(dateStr) && !fullyBookedDates.includes(dateStr)
  }
  
  // Check if date is fully booked
  const isFullyBooked = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0]
    return fullyBookedDates.includes(dateStr)
  }

  // Check if date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Check if date is Saturday (closed) or Sunday (available)
  const isSaturday = (date: Date): boolean => {
    return date.getDay() === 6
  }
  
  const isSunday = (date: Date): boolean => {
    return date.getDay() === 0
  }

  // Handle date click
  const handleDateClick = (day: number) => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth() + 1 // getMonth() returns 0-11, we need 1-12
    // Create date string directly to avoid timezone issues with toISOString()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Create date object for day-of-week and date comparison checks
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    const isSundayDay = isSunday(date)
    const isFullyBookedDate = fullyBookedDates.includes(dateStr)
    
    // Block past dates
    // Allow Saturdays if enabled and not past/fully booked
    // Allow Sundays if not past and not fully booked
    // Allow other dates if they're available
    const isSaturdayAvailable = isSaturday(date) && saturdayEnabled && !isPastDate(date) && !isFullyBookedDate
    const isSundayAvailable = isSundayDay && !isPastDate(date) && !isFullyBookedDate
    const isOtherDateAvailable = !isSundayDay && !isSaturday(date) && !isPastDate(date) && isDateAvailable(date)
    
    if (!isPastDate(date) && (isSaturdayAvailable || isSundayAvailable || isOtherDateAvailable)) {
      onDateSelect(dateStr)
    }
  }

  // Generate calendar days
  const calendarDays = []
  
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    calendarDays.push(day)
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-soft p-6">
        <div className="text-center text-gray-500">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-soft p-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-pink-light rounded-lg transition-all transform hover:scale-110 hover:-rotate-12"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-display text-brown font-semibold">
          {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-pink-light rounded-lg transition-all transform hover:scale-110 hover:rotate-12"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const year = viewMonth.getFullYear()
          const month = viewMonth.getMonth() + 1 // getMonth() returns 0-11, we need 1-12
          // Create date string directly to avoid timezone issues with toISOString()
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const isSelected = selectedDate === dateStr
          const isPast = isPastDate(date)
          const isSaturdayDay = isSaturday(date)
          const isSundayDay = isSunday(date)
          const isFullyBookedDate = isFullyBooked(date)
          const isToday = date.toDateString() === new Date().toDateString()
          
          // For Sundays, they're available if not past and not fully booked
          // For other days, check if they're in the availableDates array
          const isSundayAvailable = isSundayDay && !isPast && !isFullyBookedDate
          const isAvailable = isDateAvailable(date)
          const isActuallyAvailable = isSundayAvailable || (isAvailable && !isSundayDay)

          let cellClasses = 'aspect-square flex items-center justify-center rounded-lg transition-all cursor-pointer font-medium '
          
          // Block past dates and unavailable dates
          // Saturdays are only blocked if they're disabled
          if (isPast || !isActuallyAvailable || isFullyBookedDate) {
            if (isSaturdayDay && !saturdayEnabled) {
              // Saturdays are closed (disabled) - dark brown
              cellClasses += 'text-brown-dark cursor-not-allowed bg-brown-dark/20 opacity-70'
            } else if (isFullyBookedDate) {
              // Fully booked dates are dark brown and faded
              cellClasses += 'text-brown-dark cursor-not-allowed bg-brown-dark/20 opacity-60 line-through'
            } else if (isPast) {
              // Past dates - dark brown
              cellClasses += 'text-brown-dark cursor-not-allowed bg-brown-dark/20 opacity-60'
            } else {
              // Other unavailable dates - dark brown
              cellClasses += 'text-brown-dark cursor-not-allowed bg-brown-dark/20 opacity-60'
            }
          } else if (isSelected) {
            cellClasses += 'bg-pink text-white shadow-lg transform scale-110 animate-pulse border-2 border-brown'
          } else if (isToday) {
            cellClasses += 'bg-pink-light text-brown border-2 border-brown-light hover:bg-pink hover:text-white hover:scale-110 hover:rotate-2 transform'
          } else {
            cellClasses += 'bg-white text-gray-700 border border-gray-200 hover:bg-pink-light hover:border-brown-light hover:text-brown hover:scale-110 hover:-rotate-1 transform'
          }

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isPast || !isActuallyAvailable || isFullyBookedDate}
              className={cellClasses}
              type="button"
              title={isSaturdayDay && !saturdayEnabled ? 'Closed on Saturdays' : isFullyBookedDate ? 'All time slots booked for this date' : isPast ? 'Past dates are unavailable' : undefined}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 mb-4">
        <div className="flex flex-wrap gap-4 text-xs text-gray-700 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink rounded border-2 border-brown"></div>
            <span className="font-semibold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-light border-2 border-brown-light rounded"></div>
            <span className="font-semibold">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
            <span className="font-semibold">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-brown-dark/20 rounded border border-brown-dark/40">
              <div className="w-full h-0.5 bg-brown-dark mt-1.5"></div>
            </div>
            <span className="font-semibold">Fully Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-brown-dark/20 rounded border border-brown-dark/40"></div>
            <span className="font-semibold text-brown-dark">Unavailable</span>
          </div>
        </div>
        <div className="bg-brown-light/20 border-l-4 border-brown-dark p-3 rounded-r-lg">
          <p className="text-sm text-brown-dark">
            <strong>Note:</strong> Available dates can be selected for booking. Fully booked dates have all time slots taken. 
            Unavailable dates include past dates and closed days (if Saturday is disabled in business hours). 
            <strong> Weekdays (Mon-Fri):</strong> 9:30 AM, 12:00 PM, 2:30 PM, 4:30 PM. 
            <strong> Sundays:</strong> 12:30 PM, 3:00 PM.
          </p>
        </div>
      </div>
    </div>
  )
}

