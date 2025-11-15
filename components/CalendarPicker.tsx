'use client'

import { useState } from 'react'

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

export default function CalendarPicker({ selectedDate, onDateSelect, availableDates, fullyBookedDates = [], loading = false, minimumBookingDate, availabilityData }: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(new Date())


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
  const formatDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const isDateAvailable = (date: Date): boolean => {
    const dateStr = formatDateKey(date)
    return availableDates.includes(dateStr) && !fullyBookedDates.includes(dateStr)
  }
    
  // Check if date is fully booked
  const isFullyBooked = (date: Date): boolean => {
    const dateStr = formatDateKey(date)
    return fullyBookedDates.includes(dateStr)
  }

  // Check if date is before minimum booking date (dates that cannot be booked)
  const isBeforeMinimumBookingDate = (date: Date): boolean => {
    if (minimumBookingDate) {
      const minDate = new Date(minimumBookingDate + 'T00:00:00')
      minDate.setHours(0, 0, 0, 0)
      const dateOnly = new Date(date)
      dateOnly.setHours(0, 0, 0, 0)
      return dateOnly < minDate
    }
    return false
  }

  // Check if date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    return dateOnly < today
  }


  // Handle date click
  const handleDateClick = (day: number) => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth() + 1 // getMonth() returns 0-11, we need 1-12
    // Create date string directly to avoid timezone issues with toISOString()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Create date object for day-of-week and date comparison checks
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    
    const isFullyBookedDate = fullyBookedDates.includes(dateStr)
    const isBeforeMinDate = isBeforeMinimumBookingDate(date)

    if (!isPastDate(date) && !isBeforeMinDate && !isFullyBookedDate && isDateAvailable(date)) {
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
      <div className="bg-[var(--color-surface)] rounded-3xl shadow-soft p-6 border border-[var(--color-text)]/10">
        <div className="text-center text-gray-500">Loading calendar...</div>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        button[data-not-available="true"] {
          background-color: #e5e7eb !important;
          color: #4b5563 !important;
        }
      `}} />
      <div className="max-w-3xl mx-auto bg-[var(--color-surface)] rounded-2xl shadow-soft p-3 sm:p-4 md:p-5 border border-[var(--color-text)]/10">
        {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-[color-mix(in srgb,var(--color-primary) 18%, var(--color-surface) 82%)] rounded-lg transition-all transform hover:scale-110 hover:-rotate-12"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-base sm:text-lg md:text-xl font-display text-[var(--color-text)] font-semibold px-2">
          {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-[color-mix(in srgb,var(--color-primary) 18%, var(--color-surface) 82%)] rounded-lg transition-all transform hover:scale-110 hover:rotate-12"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs md:text-sm font-semibold text-[var(--color-text)] py-1 sm:py-1.5">
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
          const month = viewMonth.getMonth() + 1 // getMonth() returns 0-11, we need 1-12
          // Create date string directly to avoid timezone issues with toISOString()
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
          const isSelected = selectedDate === dateStr
          const isPast = isPastDate(date)
          const isBeforeMinDate = isBeforeMinimumBookingDate(date)
          const isFullyBookedDate = isFullyBooked(date)
          const isToday = date.toDateString() === new Date().toDateString()
          const isAvailable = isDateAvailable(date)
          const isActuallyAvailable = !isPast && !isBeforeMinDate && isAvailable && !isFullyBookedDate

          // Determine if this is a non-available date (NOT selected, NOT fully booked)
          const isNotAvailable = (isPast || isBeforeMinDate || !isAvailable) && !isSelected && !isFullyBookedDate
          
          let cellClasses = 'relative aspect-square flex items-center justify-center rounded-lg transition-all cursor-pointer font-semibold overflow-hidden text-xs sm:text-sm md:text-base touch-manipulation '
          let cellStyle: React.CSSProperties = {}
          
          // Priority order for styling:
          // 1. Selected date (highest priority - brown/primary color)
          // 2. Fully Booked (orange/yellow)
          // 3. Not Available - dates before Jan 15th or past dates (grey)
          // 4. Available dates (white)
          
          if (isSelected) {
            // Selected - Brown/Primary style (highest priority)
            cellClasses += 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xl transform scale-[1.03] border border-[var(--color-primary-dark)] ring-2 ring-[var(--color-accent)]/40'
          } else if (isFullyBookedDate) {
            // Fully Booked - Orange/Yellow style (matches legend)
            cellClasses += 'cursor-not-allowed bg-yellow-100 text-[#CA8A04] border border-[#FACC15]/70 shadow-inner'
          } else if (isNotAvailable) {
            // Not Available - Grey style (matches legend) - MUST be grey, not brown
            // NO background color class - ONLY use inline style
            cellClasses += 'cursor-not-allowed border border-gray-300 shadow-inner'
            // Force grey background with inline style - explicit hex color
            cellStyle = {
              backgroundColor: '#e5e7eb', // Grey-200 - matches legend
              color: '#4b5563' // Grey-700 for text
            }
          } else if (isToday) {
            // Today (if available)
            cellClasses += 'bg-[color-mix(in srgb,var(--color-accent) 55%, var(--color-surface) 45%)] text-[var(--color-on-primary)] border border-[var(--color-accent)]/70 hover:shadow-lg hover:shadow-[var(--color-accent)]/25 transform hover:scale-[1.03]'
          } else {
            // Available - White style (click to book)
            cellClasses += 'bg-white text-[var(--color-primary-dark)] border border-[color-mix(in srgb,var(--color-primary) 35%, var(--color-surface) 65%)] hover:bg-[color-mix(in srgb,#ffffff 70%, var(--color-primary) 30%)] hover:border-[var(--color-primary)]/70 hover:text-[var(--color-primary-dark)] hover:shadow-[0_10px_18px_rgba(0,0,0,0.08)] transform hover:scale-[1.03]'
          }

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isPast || isBeforeMinDate || !isActuallyAvailable || isFullyBookedDate}
              className={cellClasses}
              style={isNotAvailable ? cellStyle : undefined}
              type="button"
              data-not-available={isNotAvailable ? 'true' : undefined}
              aria-disabled={isPast || isBeforeMinDate || !isActuallyAvailable || isFullyBookedDate}
              title={
                isFullyBookedDate
                  ? 'All time slots booked for this date'
                  : isBeforeMinDate
                  ? minimumBookingDate 
                    ? `Bookings start from ${new Date(minimumBookingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                    : 'This date is not available for booking'
                  : isPast
                  ? 'Past dates are unavailable'
                  : !isAvailable
                  ? 'No booking slots available for this date'
                  : undefined
              }
            >
              {day}
              {isFullyBookedDate && (
                <span className="absolute inset-0 bg-[#FB923C]/70 pointer-events-none rounded-xl"></span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 sm:mt-4 mb-2 sm:mb-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3 text-[10px] sm:text-xs md:text-sm">
          <div className="flex items-center gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-6 h-6 bg-[var(--color-primary)] rounded-md shadow-inner border border-[var(--color-primary-dark)]/30"></div>
            <div>
              <div className="font-bold text-[var(--color-text)] text-xs sm:text-sm">Selected</div>
              <div className="text-xs text-[var(--color-text)]/70">Your chosen date</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-6 h-6 rounded-md border border-[var(--color-text)]/15 bg-white"></div>
            <div>
              <div className="font-bold text-[var(--color-text)] text-xs sm:text-sm">Available</div>
              <div className="text-xs text-[var(--color-text)]/70">Click to book</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-6 h-6 bg-yellow-100 rounded-md border border-[#FACC15]"></div>
            <div>
              <div className="font-bold text-[#EAB308] text-xs sm:text-sm">Fully Booked</div>
              <div className="text-xs text-[#CA8A04]">All slots taken</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div
              className="w-6 h-6 rounded-md border border-[var(--color-text)]/25 bg-gray-200"
            ></div>
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

