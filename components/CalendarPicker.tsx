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
    timeSlots?: {
      weekdays?: Array<{ hour: number; minute: number; label: string }>
      saturday?: Array<{ hour: number; minute: number; label: string }>
      sunday?: Array<{ hour: number; minute: number; label: string }>
    }
  }
}

export default function CalendarPicker({ selectedDate, onDateSelect, availableDates, fullyBookedDates = [], loading = false, availabilityData }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(new Date())

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const defaultEnabled: Record<typeof dayKeys[number], boolean> = {
    sunday: true,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
  }

  const formatSlotList = (slots?: Array<{ label: string }> | null, fallback?: string[]) => {
    const labels =
      slots && slots.length > 0
        ? slots.map((slot) => slot.label?.trim()).filter(Boolean)
        : fallback ?? []
    return labels.join(' • ')
  }

  const weekdaySlotSummary = formatSlotList(
    availabilityData?.timeSlots?.weekdays ?? null,
    ['9:30 AM', '12:00 PM', '2:30 PM', '4:30 PM']
  )
  const sundaySlotSummary = formatSlotList(
    availabilityData?.timeSlots?.sunday ?? null,
    ['12:30 PM', '3:00 PM']
  )
  const saturdaySlotSummary = formatSlotList(
    availabilityData?.timeSlots?.saturday ?? null,
    ['9:30 AM', '12:00 PM', '2:30 PM', '4:30 PM']
  )
  const sundayEnabled =
    availabilityData?.businessHours?.sunday?.enabled ??
    defaultEnabled.sunday
  const saturdayEnabled =
    availabilityData?.businessHours?.saturday?.enabled ??
    defaultEnabled.saturday

  const isDayEnabled = (date: Date) => {
    const key = dayKeys[date.getDay()]
    const configured = availabilityData?.businessHours?.[key]?.enabled
    if (typeof configured === 'boolean') {
      return configured
    }
    return defaultEnabled[key]
  }

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
    
    const isFullyBookedDate = fullyBookedDates.includes(dateStr)

    if (!isPastDate(date) && !isFullyBookedDate && isDateAvailable(date)) {
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
    <div className="bg-[var(--color-surface)] rounded-3xl shadow-soft p-6 border border-[var(--color-text)]/10">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-[color-mix(in srgb,var(--color-primary) 18%, var(--color-surface) 82%)] rounded-lg transition-all transform hover:scale-110 hover:-rotate-12"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-display text-[var(--color-text)] font-semibold">
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
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-[var(--color-text)] py-2">
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
          const isFullyBookedDate = isFullyBooked(date)
          const isToday = date.toDateString() === new Date().toDateString()
          const isAvailable = isDateAvailable(date)
          const isDisabledSaturday = isSaturdayDay && (!saturdayEnabled || !isAvailable)
          const isActuallyAvailable = !isPast && isAvailable && !isFullyBookedDate
          const shouldFadeUnavailable = (isPast || !isAvailable) && !isFullyBookedDate

          let cellClasses = 'aspect-square flex items-center justify-center rounded-xl transition-all cursor-pointer font-semibold text-[var(--color-text)] '
          
          // Block past dates and unavailable dates
          // Saturdays are only blocked if they're disabled
          if (isPast || !isActuallyAvailable || isFullyBookedDate) {
            if (isFullyBookedDate) {
              cellClasses += 'cursor-not-allowed bg-yellow-100 text-[#CA8A04] border border-[#FACC15]/70 line-through shadow-inner'
            } else {
              cellClasses += 'cursor-not-allowed border border-[var(--color-text)]/20 shadow-inner'

              if (shouldFadeUnavailable) {
                cellClasses += ' opacity-40 text-[var(--color-text)]/35 bg-[color-mix(in srgb,var(--color-surface) 90%, var(--color-background) 10%)]'
              }

              if (isDisabledSaturday && !isPast) {
                cellClasses += ' ring-1 ring-inset ring-[var(--color-text)] ring-opacity-[0.15] backdrop-brightness-[0.95]'
              }
              
              if (isPast) {
                cellClasses += ' backdrop-brightness-[0.9]'
              }
            }
          } else if (isSelected) {
            cellClasses += 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xl transform scale-105 border-2 border-[var(--color-primary-dark)] ring-2 ring-[var(--color-accent)]/40'
          } else if (isToday) {
            cellClasses += 'bg-[color-mix(in srgb,var(--color-accent) 55%, var(--color-surface) 45%)] text-[var(--color-on-primary)] border border-[var(--color-accent)]/70 hover:shadow-lg hover:shadow-[var(--color-accent)]/25 transform hover:scale-105'
          } else {
            cellClasses += 'bg-[color-mix(in srgb,var(--color-accent) 40%, var(--color-surface) 60%)] text-[var(--color-primary-dark)] border border-[var(--color-accent)]/55 hover:bg-[color-mix(in srgb,var(--color-accent) 55%, var(--color-surface) 45%)] hover:border-[var(--color-accent)]/75 hover:shadow-[0_10px_18px_rgba(0,0,0,0.08)] transform hover:scale-[1.04]'
          }

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isPast || !isActuallyAvailable || isFullyBookedDate}
              className={cellClasses}
              type="button"
              aria-disabled={isPast || !isActuallyAvailable || isFullyBookedDate}
              title={
                isFullyBookedDate
                  ? 'All time slots booked for this date'
                  : !isAvailable
                  ? 'No booking slots available for this date'
                  : isPast
                  ? 'Past dates are unavailable'
                  : undefined
              }
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg shadow-inner border border-[var(--color-primary-dark)]/30"></div>
            <div>
              <div className="font-bold text-[var(--color-text)] text-sm">Selected</div>
              <div className="text-xs text-[var(--color-text)]/70">Your chosen date</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-8 h-8 rounded-lg border border-[var(--color-text)]/15 bg-white"></div>
            <div>
              <div className="font-bold text-[var(--color-text)] text-sm">Available</div>
              <div className="text-xs text-[var(--color-text)]/70">Click to book</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg border-2 border-[#FACC15]"></div>
            <div>
              <div className="font-bold text-[#EAB308] text-sm">Fully Booked</div>
              <div className="text-xs text-[#CA8A04]">All slots taken</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-text)]/20 shadow-soft">
            <div
              className="w-8 h-8 rounded-lg border border-[var(--color-text)]/25"
              style={{ background: 'color-mix(in srgb,var(--color-text) 28%, var(--color-surface) 72%)' }}
            ></div>
            <div>
              <div className="font-bold text-[var(--color-text)]/80 text-sm">Not Available</div>
              <div className="text-xs text-[var(--color-text)]/65">Cannot book</div>
            </div>
          </div>
        </div>
        
        <div className="bg-[color-mix(in srgb,var(--color-background) 70%, var(--color-surface) 30%)]/60 border-l-4 border-[var(--color-primary)]/40 p-4 rounded-r-lg shadow-inner">
          <p className="text-sm text-[var(--color-text)] font-semibold mb-3">
            📅 Available Booking Times:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[var(--color-text)]/85">
            <div>
              <strong>Weekdays (Mon-Fri):</strong> {weekdaySlotSummary || 'No slots configured'}
            </div>
            {sundayEnabled ? (
              <div>
                <strong>Sundays:</strong> {sundaySlotSummary || 'No slots configured'}
              </div>
            ) : (
              <div className="text-[var(--color-text)]/70">
                <strong>Sundays:</strong> Closed
              </div>
            )}
            {saturdayEnabled ? (
              <div className="md:col-span-2">
                <strong>Saturdays:</strong> {saturdaySlotSummary || 'No slots configured'}
              </div>
            ) : (
              <div className="md:col-span-2 text-[var(--color-text)]/70">
                <strong>Saturdays:</strong> Closed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

