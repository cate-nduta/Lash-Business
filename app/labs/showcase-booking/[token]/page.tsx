'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Type for time slot structure
interface TimeSlot {
  hour: number
  minute: number
  label: string
}

// Simple Calendar Picker Component for Labs Consultations (same as consultation booking)
function LabsCalendarPicker({
  selectedDate,
  onDateSelect,
  availableDates,
  blockedDates,
  loading,
}: {
  selectedDate: string
  onDateSelect: (date: string) => void
  availableDates: string[]
  blockedDates: string[]
  loading: boolean
}) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const { daysInMonth, startingDayOfWeek } = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    return {
      daysInMonth: last.getDate(),
      startingDayOfWeek: first.getDay()
    }
  }, [viewMonth])

  const goToPreviousMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  }

  // Create sets for O(1) lookup instead of O(n) array search - MUCH FASTER
  const availableDatesSet = useMemo(() => new Set(availableDates), [availableDates])
  const blockedDatesSet = useMemo(() => new Set(blockedDates), [blockedDates])

  const isDateAvailable = (dateStr: string): boolean => {
    if (blockedDatesSet.has(dateStr)) return false
    if (availableDatesSet.size === 0) return true // If no availability set, allow all
    return availableDatesSet.has(dateStr)
  }

  const isDateInPast = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Memoize days calculation for performance
  const days = useMemo(() => {
    const result: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      result.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      result.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day))
    }
    return result
  }, [viewMonth, daysInMonth, startingDayOfWeek])

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* UNAVAILABLE DATES - Force grey styling */
        .labs-calendar-day[data-available="false"],
        .labs-calendar-day[data-available="false"]:hover,
        .labs-calendar-day[data-available="false"]:focus,
        .labs-calendar-day[data-available="false"]:active,
        .labs-calendar-day:disabled {
          background-color: #d1d5db !important;
          background: #d1d5db !important;
          color: #6b7280 !important;
          cursor: not-allowed !important;
          opacity: 0.6 !important;
          border-color: #9ca3af !important;
        }
        /* AVAILABLE DATES - White background */
        .labs-calendar-day[data-available="true"]:not([data-selected="true"]):not(:disabled) {
          background-color: #ffffff !important;
          background: #ffffff !important;
          color: #374151 !important;
          cursor: pointer !important;
          opacity: 1 !important;
        }
        /* SELECTED DATE - Primary color */
        .labs-calendar-day[data-selected="true"] {
          background-color: var(--color-primary) !important;
          background: var(--color-primary) !important;
          color: var(--color-on-primary) !important;
          opacity: 1 !important;
        }
      `}} />
      <div className="w-full bg-[var(--color-surface)] rounded-lg border border-[var(--color-primary)]/20 p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </h3>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-[var(--color-text)] py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }
            const dateStr = formatDateKey(date)
            const isAvailable = isDateAvailable(dateStr)
            const isPast = isDateInPast(date)
            const isSelected = selectedDate === dateStr
            const isDisabled = !isAvailable || isPast
            // For styling: a date is "available" only if it's not past AND is in availableDates
            const isActuallyAvailable = isAvailable && !isPast

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  if (!isDisabled) {
                    onDateSelect(dateStr)
                  }
                }}
                disabled={isDisabled}
                data-available={isActuallyAvailable}
                data-selected={isSelected}
                className={`labs-calendar-day aspect-square rounded-lg border transition-colors text-sm font-medium ${
                  isDisabled || !isActuallyAvailable
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                    : isSelected
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'bg-white text-gray-700 hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)]'
                }`}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function ShowcaseBookingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [meetingType, setMeetingType] = useState<'online' | 'physical'>('online')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  
  // Timezone detection and management
  const [clientTimezone, setClientTimezone] = useState<string>('')
  const [clientCountry, setClientCountry] = useState<string>('')
  const [availableTimezones, setAvailableTimezones] = useState<Array<{ value: string; label: string }>>([])
  const [detectingTimezone, setDetectingTimezone] = useState(true)
  
  // Country to timezones mapping
  const countryTimezonesMap: Record<string, Array<{ value: string; label: string }>> = {
    'United States': [
      { value: 'America/New_York', label: 'Eastern Time (New York)' },
      { value: 'America/Chicago', label: 'Central Time (Chicago)' },
      { value: 'America/Denver', label: 'Mountain Time (Denver)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    ],
    'Canada': [
      { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
      { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
      { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
      { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
    ],
    'United Kingdom': [{ value: 'Europe/London', label: 'London' }],
    'Germany': [{ value: 'Europe/Berlin', label: 'Berlin' }],
    'France': [{ value: 'Europe/Paris', label: 'Paris' }],
    'Spain': [{ value: 'Europe/Madrid', label: 'Madrid' }],
    'Italy': [{ value: 'Europe/Rome', label: 'Rome' }],
    'Sweden': [{ value: 'Europe/Stockholm', label: 'Stockholm' }],
    'Norway': [{ value: 'Europe/Oslo', label: 'Oslo' }],
    'Finland': [{ value: 'Europe/Helsinki', label: 'Helsinki' }],
    'Ireland': [{ value: 'Europe/Dublin', label: 'Dublin' }],
    'United Arab Emirates': [{ value: 'Asia/Dubai', label: 'Dubai' }],
    'Singapore': [{ value: 'Asia/Singapore', label: 'Singapore' }],
    'Malaysia': [{ value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur' }],
    'Hong Kong': [{ value: 'Asia/Hong_Kong', label: 'Hong Kong' }],
    'Japan': [{ value: 'Asia/Tokyo', label: 'Tokyo' }],
    'China': [{ value: 'Asia/Shanghai', label: 'Shanghai' }],
    'India': [{ value: 'Asia/Kolkata', label: 'Mumbai/New Delhi' }],
    'Australia': [
      { value: 'Australia/Sydney', label: 'Sydney' },
      { value: 'Australia/Melbourne', label: 'Melbourne' },
      { value: 'Australia/Brisbane', label: 'Brisbane' },
      { value: 'Australia/Perth', label: 'Perth' },
    ],
    'New Zealand': [{ value: 'Pacific/Auckland', label: 'Auckland' }],
    'South Africa': [{ value: 'Africa/Johannesburg', label: 'Johannesburg' }],
    'Nigeria': [{ value: 'Africa/Lagos', label: 'Lagos' }],
    'Kenya': [{ value: 'Africa/Nairobi', label: 'Nairobi' }],
    'Uganda': [{ value: 'Africa/Kampala', label: 'Kampala' }],
    'Tanzania': [{ value: 'Africa/Dar_es_Salaam', label: 'Dar es Salaam' }],
    'Rwanda': [{ value: 'Africa/Kigali', label: 'Kigali' }],
    'Ethiopia': [{ value: 'Africa/Addis_Ababa', label: 'Addis Ababa' }],
    'Ghana': [{ value: 'Africa/Accra', label: 'Accra' }],
    'Egypt': [{ value: 'Africa/Cairo', label: 'Cairo' }],
    'Brazil': [
      { value: 'America/Sao_Paulo', label: 'São Paulo' },
      { value: 'America/Manaus', label: 'Manaus' },
    ],
    'Mexico': [{ value: 'America/Mexico_City', label: 'Mexico City' }],
    'Argentina': [{ value: 'America/Buenos_Aires', label: 'Buenos Aires' }],
  }
  
  const allCountries = Object.keys(countryTimezonesMap).sort()
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<Array<{ date: string; time: string }>>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [projectInfo, setProjectInfo] = useState<any>(null)

  useEffect(() => {
    if (!token) return

    let mounted = true

    // Load project info from token
    const loadProjectInfo = async () => {
      try {
        const response = await fetch(`/api/labs/showcase/project-info/${token}`)
        if (response.ok) {
          const data = await response.json()
          if (mounted) {
            setProjectInfo(data.project)
            // Handle both build projects and orders
            if (data.project?.type === 'web-service-order') {
              setClientName(data.project?.contactName || data.project?.businessName || '')
              setClientEmail(data.project?.email || '')
              setClientPhone(data.project?.phone || '')
            } else {
              setClientName(data.project?.contactName || '')
              setClientEmail(data.project?.email || '')
              setClientPhone(data.project?.phone || '')
            }
          }
        } else {
          if (mounted) {
            setSubmitStatus({
              type: 'error',
              message: 'Invalid or expired booking link. Please contact us for assistance.',
            })
          }
        }
      } catch (error) {
        console.error('Error loading project info:', error)
      }
    }

    // Load availability (same as consultation booking) - load immediately for faster response
    const loadAvailability = async () => {
      try {
        // Use cache for faster initial load
        const response = await fetch('/api/labs/consultation/availability', { 
          cache: 'no-store', // Force fresh data
        })
        if (response.ok) {
          const data = await response.json()
          if (mounted) {
            setBookedSlots(data.bookedSlots || [])
            setAvailableDates(data.availableDates || [])
            // Ensure timeSlots is always an array with proper structure
            // Time slots should have { hour, minute, label } structure
            let slots: TimeSlot[] = []
            if (Array.isArray(data.timeSlots) && data.timeSlots.length > 0) {
              // Validate that slots have the correct structure
              slots = data.timeSlots.filter((slot: any) => 
                slot && 
                typeof slot.hour === 'number' && 
                typeof slot.minute === 'number' && 
                typeof slot.label === 'string'
              )
            }
            setTimeSlots(slots)
            setBlockedDates(data.blockedDates || [])
            
            // Debug logging (remove in production)
            if (slots.length === 0) {
              console.warn('No time slots loaded from API. Response:', data)
            }
          }
        } else {
          console.error('Failed to load availability:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error loading availability:', error)
        // Set empty arrays on error to prevent UI issues
        if (mounted) {
          setBookedSlots([])
          setAvailableDates([])
          setTimeSlots([])
          setBlockedDates([])
        }
      }
    }
    
    // Load both in parallel for faster page load
    loadProjectInfo()
    loadAvailability()
    
    // Refresh in background every 10 seconds to catch new bookings immediately
    const interval = setInterval(() => {
      fetch('/api/labs/consultation/availability', { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (mounted && data) {
            const booked = Array.isArray(data.bookedSlots) ? data.bookedSlots : []
            setBookedSlots(booked)
            setAvailableDates(data.availableDates || [])
            
            let slots: TimeSlot[] = []
            if (Array.isArray(data.timeSlots) && data.timeSlots.length > 0) {
              slots = data.timeSlots.filter((slot: any) => 
                slot && 
                typeof slot.hour === 'number' && 
                typeof slot.minute === 'number' && 
                typeof slot.label === 'string'
              )
            } else {
              // Default time slots
              slots = [
                { hour: 9, minute: 30, label: '9:30 AM' },
                { hour: 12, minute: 0, label: '12:00 PM' },
                { hour: 15, minute: 30, label: '3:30 PM' },
              ]
            }
            setTimeSlots(slots)
            setBlockedDates(data.blockedDates || [])
          }
        })
        .catch(() => {}) // Silent fail for background refresh
    }, 10000) // Refresh every 10 seconds instead of 30
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [token])

  // Timezone detection
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setClientTimezone(detectedTimezone)
      
      // Find country from timezone
      let detectedCountry = 'Unknown'
      for (const [country, timezones] of Object.entries(countryTimezonesMap)) {
        if (timezones.some(tz => tz.value === detectedTimezone)) {
          detectedCountry = country
          break
        }
      }
      
      setClientCountry(detectedCountry)
      
      // Get all timezones for the detected country
      const countryTimezones = countryTimezonesMap[detectedCountry] || [
        { value: detectedTimezone, label: detectedTimezone.replace(/_/g, ' ') }
      ]
      setAvailableTimezones(countryTimezones)
      
      // If detected timezone is not in the country's list, add it
      if (!countryTimezones.some(tz => tz.value === detectedTimezone)) {
        setAvailableTimezones([
          { value: detectedTimezone, label: detectedTimezone.replace(/_/g, ' ') },
          ...countryTimezones
        ])
      }
    } catch (error) {
      console.error('Error detecting timezone:', error)
      // Fallback to Nairobi timezone
      setClientTimezone('Africa/Nairobi')
      setClientCountry('Kenya')
      setAvailableTimezones([{ value: 'Africa/Nairobi', label: 'Africa/Nairobi' }])
    } finally {
      setDetectingTimezone(false)
    }
  }, [])

  // Normalize date for comparison
  const normalizeDateForComparison = (dateStr: string): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return dateStr
    }
  }

  // Normalize time for comparison
  const normalizeTimeForComparison = (timeStr: string): string => {
    if (!timeStr) return ''
    return timeStr.toLowerCase().trim()
  }

  // Refresh availability when date is selected to get latest bookings
  useEffect(() => {
    if (!selectedDate) return
    
    const refreshAvailability = async () => {
      try {
        const response = await fetch('/api/labs/consultation/availability', { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        })
        if (response.ok) {
          const data = await response.json()
          const booked = Array.isArray(data.bookedSlots) ? data.bookedSlots : []
          setBookedSlots(booked)
          
          // Debug: Log booked slots for selected date
          const dateBookedSlots = booked.filter((slot: { date: string; time: string }) => {
            const slotDate = normalizeDateForComparison(slot.date)
            const selectedDateNormalized = normalizeDateForComparison(selectedDate)
            return slotDate === selectedDateNormalized
          })
          console.log('Booked slots for', selectedDate, ':', dateBookedSlots)
        }
      } catch (error) {
        console.error('Error refreshing availability:', error)
      }
    }
    
    refreshAvailability()
  }, [selectedDate])

  const handleDateSelect = (date: string) => {
    if (blockedDates.includes(date)) {
      setSubmitStatus({
        type: 'error',
        message: 'This date is blocked and not available for bookings.',
      })
      return
    }
    if (availableDates.length > 0 && !availableDates.includes(date)) {
      setSubmitStatus({
        type: 'error',
        message: 'This date is not available. Please select an available date.',
      })
      return
    }
    setSelectedDate(date)
    setSelectedTime('') // Always reset time when date changes
    setSubmitStatus({ type: null, message: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedDate || !selectedTime) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill in all required fields',
      })
      return
    }

    setLoading(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      // Validate that the selected time slot is not booked
      const normalizedDate = normalizeDateForComparison(selectedDate)
      const normalizedTime = normalizeTimeForComparison(selectedTime)
      
      const isSlotBooked = bookedSlots.some(slot => {
        const slotDate = normalizeDateForComparison(slot.date)
        const slotTime = normalizeTimeForComparison(slot.time)
        return slotDate === normalizedDate && slotTime === normalizedTime
      })
      
      if (isSlotBooked) {
        throw new Error('This time slot is already booked. Please select another date or time.')
      }

      const response = await fetch('/api/labs/showcase/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          clientName,
          clientEmail,
          clientPhone,
          meetingType,
          date: selectedDate,
          time: selectedTime,
          clientTimezone: clientTimezone || 'Africa/Nairobi',
          clientCountry: clientCountry || 'Unknown',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book showcase meeting')
      }

      setSubmitStatus({
        type: 'success',
        message: 'Showcase meeting booked successfully! You will receive a confirmation email shortly.',
      })

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (error: any) {
      setSubmitStatus({
        type: 'error',
        message: error.message || 'Failed to book showcase meeting. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!projectInfo && !submitStatus.type) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center">
        <div className="text-[#7C4B31]">Loading...</div>
      </div>
    )
  }

  if (submitStatus.type === 'error' && !projectInfo) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-[#7C4B31] mb-4">Invalid Booking Link</h1>
          <p className="text-[#6B4A3B] mb-6">{submitStatus.message}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[#7C4B31] text-white rounded hover:bg-[#6B3E26]"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-[#FDF9F4] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#7C4B31] mb-2">Book Your Showcase Meeting</h1>
          <p className="text-gray-600 mb-6">
            Your project has been launched! Let's schedule a time to walk through your website, workflows, and answer any questions.
          </p>

          {submitStatus.type === 'success' ? (
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-green-800 mb-2">✓ Booking Confirmed!</h2>
              <p className="text-green-700">{submitStatus.message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#7C4B31] mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border-2 border-[#7C4B31]/20 rounded-lg focus:outline-none focus:border-[#7C4B31]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#7C4B31] mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border-2 border-[#7C4B31]/20 rounded-lg focus:outline-none focus:border-[#7C4B31]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#7C4B31] mb-2">Phone</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-[#7C4B31]/20 rounded-lg focus:outline-none focus:border-[#7C4B31]"
                  />
                </div>
              </div>

              {/* Meeting Type */}
              <div>
                <label className="block text-sm font-semibold text-[#7C4B31] mb-2">
                  Meeting Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="online"
                      checked={meetingType === 'online'}
                      onChange={(e) => setMeetingType(e.target.value as 'online' | 'physical')}
                      className="mr-2"
                    />
                    Online Meeting
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="physical"
                      checked={meetingType === 'physical'}
                      onChange={(e) => setMeetingType(e.target.value as 'online' | 'physical')}
                      className="mr-2"
                    />
                    Physical Meeting
                  </label>
                </div>
              </div>

              {/* Timezone Display and Selection */}
              {!detectingTimezone && clientTimezone && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        📍 Your Location
                      </p>
                      <div className="space-y-2">
                        <div>
                          <label htmlFor="countrySelect" className="block text-xs text-blue-800 mb-1">
                            Country *
                          </label>
                          <select
                            id="countrySelect"
                            value={clientCountry}
                            onChange={(e) => {
                              const selectedCountry = e.target.value
                              setClientCountry(selectedCountry)
                              const countryTzs = countryTimezonesMap[selectedCountry] || []
                              if (countryTzs.length > 0) {
                                setClientTimezone(countryTzs[0].value)
                                setAvailableTimezones(countryTzs)
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md bg-white text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Unknown">Select your country...</option>
                            {allCountries.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                        {clientCountry && clientCountry !== 'Unknown' && availableTimezones.length > 0 && (
                          <div>
                            <label htmlFor="timezoneSelect" className="block text-xs text-blue-800 mb-1">
                              Timezone *
                            </label>
                            <select
                              id="timezoneSelect"
                              value={clientTimezone}
                              onChange={(e) => setClientTimezone(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md bg-white text-blue-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {availableTimezones.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                  {tz.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2 italic">
                    All times are shown in your local time
                  </p>
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-semibold text-[#7C4B31] mb-2">
                  Select Date <span className="text-red-500">*</span>
                </label>
                <LabsCalendarPicker
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  availableDates={availableDates}
                  blockedDates={blockedDates}
                  loading={loadingAvailability}
                />
              </div>

              {/* Time Selection */}
              {selectedDate && (() => {
                if (loadingAvailability) {
                  return (
                    <div>
                      <label className="block text-sm font-semibold text-[#7C4B31] mb-2">
                        Select Time <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full px-4 py-2 border-2 border-[#7C4B31]/20 rounded-lg bg-white text-gray-500">
                        Loading time slots...
                      </div>
                    </div>
                  )
                }
                
                const selectedDateNormalized = normalizeDateForComparison(selectedDate)
                
                // Get all booked slots for this specific date
                const dateBookedSlots = bookedSlots.filter(booked => {
                  if (!booked.date || !booked.time) return false
                  const bookedDate = normalizeDateForComparison(booked.date)
                  return bookedDate === selectedDateNormalized
                })
                
                // Filter out booked slots
                const availableSlots = timeSlots.length > 0 ? timeSlots.filter(slot => {
                  const slotTimeLabel = slot.label.toLowerCase().trim()
                  
                  // Check if this slot matches any booked slot for this date
                  const isBooked = dateBookedSlots.some(booked => {
                    const bookedTime = normalizeTimeForComparison(booked.time)
                    
                    // Multiple matching strategies
                    // 1. Exact match (case insensitive)
                    if (bookedTime === slotTimeLabel) return true
                    
                    // 2. Contains match (handles variations)
                    if (bookedTime.includes(slotTimeLabel) || slotTimeLabel.includes(bookedTime)) return true
                    
                    // 3. Match by hour:minute format
                    const slotTimeStr = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
                    const bookedTimeDigits = bookedTime.replace(/[^0-9:]/g, '')
                    if (bookedTimeDigits.includes(slotTimeStr) || slotTimeStr.includes(bookedTimeDigits)) return true
                    
                    // 4. Match the original label (case insensitive)
                    if (bookedTime === slot.label.toLowerCase().trim()) return true
                    
                    return false
                  })
                  
                  return !isBooked
                }) : []
                
                // Check fallback slots (old system)
                const fallbackSlots = []
                if (timeSlots.length === 0) {
                  if (!bookedSlots.some(slot => {
                    const slotDate = normalizeDateForComparison(slot.date)
                    const selectedDateNormalized = normalizeDateForComparison(selectedDate)
                    const slotTime = normalizeTimeForComparison(slot.time)
                    return slotDate === selectedDateNormalized && slotTime === 'morning'
                  })) {
                    fallbackSlots.push({ value: 'morning', label: 'Morning (9 AM - 12 PM)' })
                  }
                  if (!bookedSlots.some(slot => {
                    const slotDate = normalizeDateForComparison(slot.date)
                    const selectedDateNormalized = normalizeDateForComparison(selectedDate)
                    const slotTime = normalizeTimeForComparison(slot.time)
                    return slotDate === selectedDateNormalized && slotTime === 'afternoon'
                  })) {
                    fallbackSlots.push({ value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' })
                  }
                  if (!bookedSlots.some(slot => {
                    const slotDate = normalizeDateForComparison(slot.date)
                    const selectedDateNormalized = normalizeDateForComparison(selectedDate)
                    const slotTime = normalizeTimeForComparison(slot.time)
                    return slotDate === selectedDateNormalized && slotTime === 'evening'
                  })) {
                    fallbackSlots.push({ value: 'evening', label: 'Evening (4 PM - 7 PM)' })
                  }
                }
                
                const allAvailableSlots: Array<TimeSlot | { value: string; label: string }> = availableSlots.length > 0 ? availableSlots : fallbackSlots
                const noSlotsAvailable = allAvailableSlots.length === 0
                
                if (noSlotsAvailable) {
                  return (
                    <div>
                      <label className="block text-sm font-semibold text-[#7C4B31] mb-2">
                        Select Time <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full px-4 py-3 border-2 border-red-300 rounded-lg bg-red-50 text-red-800 font-medium">
                        ⚠️ Slots not available on this day. Check another day.
                      </div>
                    </div>
                  )
                }
                
                return (
                  <div>
                    <label className="block text-sm font-semibold text-[#7C4B31] mb-2">
                      Select Time <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#7C4B31]/20 rounded-lg focus:outline-none focus:border-[#7C4B31]"
                      required
                    >
                      <option value="">Select a time</option>
                      {allAvailableSlots.map((slot, index) => {
                        const value = 'value' in slot ? slot.value : slot.label
                        const label = slot.label
                        return (
                          <option key={`${value}-${index}`} value={value}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                    {dateBookedSlots.length > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        ℹ️ {dateBookedSlots.length} time slot(s) already booked for this date. Only available slots are shown above.
                      </p>
                    )}
                  </div>
                )
              })()}

              {submitStatus.type === 'error' && (
                <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                  <p className="text-red-800">{submitStatus.message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedDate || !selectedTime}
                className="w-full bg-[#7C4B31] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B3E26] transition-colors disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Book Showcase Meeting'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
