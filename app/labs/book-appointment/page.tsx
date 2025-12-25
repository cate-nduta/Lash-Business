'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, type Currency, type ExchangeRates } from '@/lib/currency-utils'

interface PricingTier {
  id: string
  name: string
  priceKES: number
}

const PHONE_COUNTRY_CODES = [
  { code: 'KE', dialCode: '+254', label: 'Kenya (+254)' },
  { code: 'US', dialCode: '+1', label: 'United States (+1)' },
  { code: 'CA', dialCode: '+1', label: 'Canada (+1)' },
  { code: 'GB', dialCode: '+44', label: 'United Kingdom (+44)' },
  { code: 'AU', dialCode: '+61', label: 'Australia (+61)' },
  { code: 'ZA', dialCode: '+27', label: 'South Africa (+27)' },
  { code: 'NG', dialCode: '+234', label: 'Nigeria (+234)' },
  { code: 'UG', dialCode: '+256', label: 'Uganda (+256)' },
  { code: 'TZ', dialCode: '+255', label: 'Tanzania (+255)' },
]

// Simple Calendar Picker Component for Labs Consultations
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

  // Don't show loading - render calendar immediately, it will update when data loads

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

export default function LabsBookAppointment() {
  const { currency } = useCurrency()
  const searchParams = useSearchParams()
  const tierIdFromUrl = searchParams.get('tier')
  const rebookConsultationId = searchParams.get('rebook')
  
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(PHONE_COUNTRY_CODES[0]?.dialCode || '+254')
  const [phoneLocalNumber, setPhoneLocalNumber] = useState<string>('')
  const [consultationFeeKES, setConsultationFeeKES] = useState<number>(0)
  const [loadingFee, setLoadingFee] = useState(true)
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null)
  const [loadingTier, setLoadingTier] = useState(true)
  const [isRebooking, setIsRebooking] = useState(false)
  const [loadingRebookData, setLoadingRebookData] = useState(false)
  const [budgetRanges, setBudgetRanges] = useState<Array<{ id: string; label: string; value: string }>>([])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/labs/settings', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setConsultationFeeKES(data.consultationFeeKES ?? 0)
          
          // Load budget ranges
          if (data.budgetRanges && Array.isArray(data.budgetRanges) && data.budgetRanges.length > 0) {
            setBudgetRanges(data.budgetRanges)
          } else {
            // Fallback to defaults if not set
            setBudgetRanges([
              { id: '100k-150k', label: '100K–150K KES', value: '100k-150k' },
              { id: '150k-250k', label: '150K–250K KES', value: '150k-250k' },
              { id: '250k-300k+', label: '250K–300K+ KES', value: '250k-300k+' },
            ])
          }
          
          // Find the tier if tierId is in URL
          if (tierIdFromUrl && data.tiers) {
            const tier = data.tiers.find((t: PricingTier) => t.id === tierIdFromUrl)
            if (tier) {
              setSelectedTier(tier)
            }
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoadingFee(false)
        setLoadingTier(false)
      }
    }
    loadSettings()
  }, [tierIdFromUrl])

  // Load availability immediately on page load (optimized for speed)
  useEffect(() => {
    let mounted = true
    
    // Don't set loading to true - render calendar immediately
    const loadAvailability = async () => {
      try {
        // Force fresh data - no cache to ensure we get latest bookings
        const response = await fetch('/api/labs/consultation/availability', { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        })
        if (response.ok) {
          const data = await response.json()
          if (mounted) {
            const booked = Array.isArray(data.bookedSlots) ? data.bookedSlots : []
            setBookedDates(data.bookedDates || [])
            setBookedSlots(booked)
            setAvailableDates(data.availableDates || [])
            
            // Ensure timeSlots have proper structure
            let slots: Array<{ hour: number; minute: number; label: string }> = []
            if (Array.isArray(data.timeSlots) && data.timeSlots.length > 0) {
              slots = data.timeSlots.filter((slot: any) => 
                slot && 
                typeof slot.hour === 'number' && 
                typeof slot.minute === 'number' && 
                typeof slot.label === 'string'
              )
            } else {
              // Default time slots if none configured
              slots = [
                { hour: 9, minute: 30, label: '9:30 AM' },
                { hour: 12, minute: 0, label: '12:00 PM' },
                { hour: 15, minute: 30, label: '3:30 PM' },
              ]
            }
            setTimeSlots(slots)
            setBlockedDates(data.blockedDates || [])
            
            // Debug logging
            console.log('Loaded availability:', {
              bookedSlotsCount: booked.length,
              bookedSlots: booked,
              timeSlotsCount: slots.length,
            })
          }
        }
      } catch (error) {
        console.error('Error loading availability:', error)
      }
    }
    
    // Load immediately (non-blocking)
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
            setBookedDates(data.bookedDates || [])
            setBookedSlots(booked)
            setAvailableDates(data.availableDates || [])
            
            let slots: Array<{ hour: number; minute: number; label: string }> = []
            if (Array.isArray(data.timeSlots) && data.timeSlots.length > 0) {
              slots = data.timeSlots.filter((slot: any) => 
                slot && 
                typeof slot.hour === 'number' && 
                typeof slot.minute === 'number' && 
                typeof slot.label === 'string'
              )
            } else {
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
  }, [])
  
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    businessType: '',
    isBusinessRegistered: '',
    serviceType: '',
    currentWebsite: '',
    hasWebsite: '',
    monthlyClients: '',
    currentBookingSystem: '',
    currentPaymentSystem: '',
    mainPainPoints: '',
    budgetRange: '',
    timeline: '',
    preferredContact: 'email',
    additionalDetails: '',
    preferredDate: '',
    preferredTime: '',
    meetingType: 'online' as 'online' | 'physical',
    interestedTier: tierIdFromUrl || '',
    // Physical meeting location fields
    meetingCountry: '',
    meetingCity: '',
    meetingBuilding: '',
    meetingStreet: '',
  })
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<Array<{ date: string; time: string }>>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<Array<{ hour: number; minute: number; label: string }>>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  const [loading, setLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  // Payment method will be selected on Paystack page
  const [paymentMethod] = useState<'mpesa' | 'card' | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<{
    loading: boolean
    success: boolean | null
    message: string
    orderTrackingId?: string
  }>({ loading: false, success: null, message: '' })

  const [exchangeRates, setExchangeRates] = useState<{ usdToKes: number } | null>(null)

  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          if (data.exchangeRates) {
            setExchangeRates({
              usdToKes: data.exchangeRates.usdToKes || 130,
            })
          }
        }
      } catch (error) {
        console.error('Error loading exchange rates:', error)
      }
    }
    loadExchangeRates()
  }, [])

  const formatPrice = (priceKES: number) => {
    if (currency === 'USD') {
      if (!exchangeRates) {
        // Fallback to default rate if not loaded yet
        const defaultRate = 130
        const convertedPrice = priceKES / defaultRate
        return `$${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
      const convertedPrice = priceKES / exchangeRates.usdToKes
      return `$${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `${priceKES.toLocaleString('en-US')} KSH`
  }

  // Normalize date for comparison (ensure YYYY-MM-DD format)
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

  // Normalize time for comparison (ensure lowercase)
  const normalizeTimeForComparison = (timeStr: string): string => {
    if (!timeStr) return ''
    return timeStr.toLowerCase().trim()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // If date changed, check if the currently selected time is still available
      if (name === 'preferredDate' && prev.preferredTime && bookedSlots.length > 0) {
        const normalizedDate = normalizeDateForComparison(value)
        const normalizedTime = normalizeTimeForComparison(prev.preferredTime)
        
        const isTimeSlotBooked = bookedSlots.some(slot => {
          const slotDate = normalizeDateForComparison(slot.date)
          const slotTime = normalizeTimeForComparison(slot.time)
          return slotDate === normalizedDate && slotTime === normalizedTime
        })
        
        if (isTimeSlotBooked) {
          // Reset time selection if it's now booked
          updated.preferredTime = ''
        }
      }
      
      return updated
    })
  }

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      setSubmitStatus({ type: 'error', message: 'Business name is required' })
      return false
    }
    if (!formData.contactName.trim()) {
      setSubmitStatus({ type: 'error', message: 'Contact name is required' })
      return false
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setSubmitStatus({ type: 'error', message: 'Valid email is required' })
      return false
    }
    if (!phoneLocalNumber.trim()) {
      setSubmitStatus({ type: 'error', message: 'Phone number is required' })
      return false
    }
    if (!formData.businessType) {
      setSubmitStatus({ type: 'error', message: 'Business type is required' })
      return false
    }
    if (!formData.serviceType.trim()) {
      setSubmitStatus({ type: 'error', message: 'Service type is required' })
      return false
    }
    if (!formData.mainPainPoints.trim()) {
      setSubmitStatus({ type: 'error', message: 'Please describe your main pain points or operational issues' })
      return false
    }
    if (formData.mainPainPoints.trim().length < 50) {
      setSubmitStatus({ type: 'error', message: 'Please provide more details about your pain points (at least 50 characters)' })
      return false
    }
    if (!formData.preferredDate) {
      setSubmitStatus({ type: 'error', message: 'Please select a preferred date for the consultation' })
      return false
    }
    if (!formData.preferredTime) {
      setSubmitStatus({ type: 'error', message: 'Please select a preferred time for the consultation' })
      return false
    }
    // Validate physical meeting location fields
    if (formData.meetingType === 'physical') {
      if (!formData.meetingCountry.trim()) {
        setSubmitStatus({ type: 'error', message: 'Country is required for physical meetings' })
        return false
      }
      if (!formData.meetingCity.trim()) {
        setSubmitStatus({ type: 'error', message: 'City is required for physical meetings' })
        return false
      }
      if (!formData.meetingBuilding.trim()) {
        setSubmitStatus({ type: 'error', message: 'Building name is required for physical meetings' })
        return false
      }
      if (!formData.meetingStreet.trim()) {
        setSubmitStatus({ type: 'error', message: 'Street name is required for physical meetings' })
        return false
      }
    }
    // Check if specific date+time slot is already booked
    const isSlotBooked = bookedSlots.some(
      slot => slot.date === formData.preferredDate && slot.time === formData.preferredTime
    )
    if (isSlotBooked) {
      setSubmitStatus({ type: 'error', message: 'This time slot is already booked. Please select another date or time.' })
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      // If rebooking, use rebook API (no payment required)
      if (isRebooking && rebookConsultationId) {
        const response = await fetch('/api/labs/consultation/rebook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            consultationId: rebookConsultationId,
            preferredDate: formData.preferredDate,
            preferredTime: formData.preferredTime,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to reschedule consultation')
        }

        // Show confirmation modal
        setShowConfirmationModal(true)
        setLoading(false)
        return
      }

      // Regular new consultation submission
      const fullPhone = `${phoneCountryCode}${phoneLocalNumber.replace(/\D/g, '')}`
      
      // Check if consultation is free (price = 0)
      const isFree = consultationFeeKES === 0
      
      // Convert consultation fee to the selected currency
      let consultationPrice = consultationFeeKES
      if (currency === 'USD') {
        if (exchangeRates) {
          consultationPrice = consultationFeeKES / exchangeRates.usdToKes
          // Round to 2 decimal places
          consultationPrice = Math.round(consultationPrice * 100) / 100
        } else {
          // Fallback to default rate
          const defaultRate = 130
          consultationPrice = consultationFeeKES / defaultRate
          consultationPrice = Math.round(consultationPrice * 100) / 100
        }
      }

      // If consultation is free, create it directly without payment
      if (isFree) {
        const consultationData = {
          ...formData,
          phone: fullPhone,
          consultationPrice: 0,
          currency: currency,
          submittedAt: new Date().toISOString(),
          source: 'labs-consultation',
          interestedTier: selectedTier ? selectedTier.name : (formData.interestedTier || ''),
          paymentStatus: 'not_required',
          paymentOrderTrackingId: null,
          paymentMethod: null,
        }

        const consultationResponse = await fetch('/api/labs/consultation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(consultationData),
        })

        const consultationResult = await consultationResponse.json()

        if (!consultationResponse.ok) {
          setSubmitStatus({
            type: 'error',
            message: consultationResult.error || 'Failed to submit consultation request',
          })
          setLoading(false)
          return
        }

        // Free consultation created successfully
        setSubmitStatus({
          type: 'success',
          message: 'Your free consultation has been booked successfully! You will receive a confirmation email shortly.',
        })
        setShowConfirmationModal(true)
        setLoading(false)
        return
      }

      // For paid consultations, require payment
      // Validate payment method
      if (!paymentMethod) {
        setSubmitStatus({
          type: 'error',
          message: 'Please select a payment method to proceed with your consultation booking.',
        })
        setLoading(false)
        // Scroll to payment section
        setTimeout(() => {
          document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
        return
      }
      
      // Validate phone number for M-Pesa
      if (paymentMethod === 'mpesa' && (!phoneLocalNumber || phoneLocalNumber.trim().length < 9)) {
        setSubmitStatus({
          type: 'error',
          message: 'Please enter a valid phone number for M-Pesa payment.',
        })
        setLoading(false)
        return
      }

      // Initiate payment FIRST before creating consultation
      setPaymentStatus({ loading: true, success: null, message: 'Initializing payment...' })
      
      // Create consultation with pending payment status first
      const consultationData = {
        ...formData,
        phone: fullPhone,
        consultationPrice: consultationPrice,
        currency: currency,
        submittedAt: new Date().toISOString(),
        source: 'labs-consultation',
        interestedTier: selectedTier ? selectedTier.name : (formData.interestedTier || ''),
        paymentStatus: 'pending_payment',
        paymentOrderTrackingId: null,
        paymentMethod: null,
      }

      // Create consultation first
      const consultationResponse = await fetch('/api/labs/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consultationData),
      })

      const consultationResult = await consultationResponse.json()

      if (!consultationResponse.ok) {
        setPaymentStatus({
          loading: false,
          success: false,
          message: consultationResult.error || 'Failed to create consultation request',
        })
        setSubmitStatus({
          type: 'error',
          message: consultationResult.error || 'Failed to submit consultation request',
        })
        setLoading(false)
        return
      }

      const consultationId = consultationResult.consultation?.consultationId

      // Initialize Paystack payment
      setPaymentStatus({ loading: true, success: null, message: 'Processing payment...' })

      const paymentResponse = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          amount: consultationPrice,
          currency: currency === 'USD' ? 'USD' : 'KES',
          metadata: {
            payment_type: 'consultation',
            consultation_id: consultationId,
            business_name: formData.businessName,
          },
          customerName: formData.contactName,
          phone: fullPhone,
        }),
      })

      const paymentData = await paymentResponse.json()

      if (!paymentResponse.ok || !paymentData.success || !paymentData.authorizationUrl) {
        setPaymentStatus({
          loading: false,
          success: false,
          message: paymentData.error || 'Failed to initialize payment',
        })
        setSubmitStatus({
          type: 'error',
          message: paymentData.error || 'Payment initialization failed. Please try again.',
        })
        setLoading(false)
        return
      }

      // Update consultation with payment reference
      if (consultationId && paymentData.reference) {
        await fetch(`/api/labs/consultation`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            consultationId,
            paymentOrderTrackingId: paymentData.reference,
            paymentMethod: 'paystack',
          }),
        }).catch(err => console.error('Error updating consultation with payment reference:', err))
      }

      // Payment initialized successfully - redirect to Paystack
      setPaymentStatus({
        loading: false,
        success: true,
        message: 'Redirecting to secure payment page...',
      })
      
      // Redirect to Paystack payment page
      setTimeout(() => {
        window.location.href = paymentData.authorizationUrl
      }, 500)

      // Reset form immediately for better UX
      setFormData({
        businessName: '',
        contactName: '',
        email: '',
        businessType: '',
        isBusinessRegistered: '',
        serviceType: '',
        currentWebsite: '',
        hasWebsite: '',
        monthlyClients: '',
        currentBookingSystem: '',
        currentPaymentSystem: '',
        mainPainPoints: '',
        budgetRange: '',
        timeline: '',
        preferredContact: 'email',
        additionalDetails: '',
        preferredDate: '',
        preferredTime: '',
        interestedTier: '', // Reset to empty - tier will be set from URL if present
        meetingType: 'online' as 'online' | 'physical',
        meetingCountry: '',
        meetingCity: '',
        meetingBuilding: '',
        meetingStreet: '',
      })
      setPhoneLocalNumber('')

      // Refresh booked slots in the background (non-blocking)
      fetch('/api/labs/consultation/availability', { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (data) {
            setBookedDates(data.bookedDates || [])
            setBookedSlots(data.bookedSlots || [])
            setAvailableDates(data.availableDates || [])
            setTimeSlots(data.timeSlots || [])
            setBlockedDates(data.blockedDates || [])
          }
        })
        .catch(error => {
          console.error('Error refreshing availability after submission:', error)
        })
      
    } catch (error: any) {
      console.error('Error submitting consultation request:', error)
      setSubmitStatus({
        type: 'error',
        message: error.message || 'Failed to submit consultation request. Please try again or contact us directly.',
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display text-[var(--color-primary)] mb-4">
            {isRebooking ? 'Reschedule Your Consultation' : 'Book a Consultation'}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--color-text)] mb-6 max-w-2xl mx-auto">
            {isRebooking 
              ? 'Select a new date and time for your consultation. No payment required - you already paid!'
              : "Let's understand your business and create a clear plan to eliminate operational chaos"}
          </p>
          
          {isRebooking && (
            <div className="max-w-md mx-auto mb-6 bg-green-50 border-2 border-green-400 rounded-lg p-4">
              <p className="text-green-800 font-semibold mb-1">
                ✅ No Payment Required
              </p>
              <p className="text-green-700 text-sm">
                Since you already paid for your original consultation, you can reschedule at no additional cost.
              </p>
            </div>
          )}
          
          {!isRebooking && (
            <div className="flex flex-col items-center gap-4 mb-6">
              {/* Selected Tier Display */}
              {selectedTier && (
                <div className="w-full max-w-md mx-auto p-4 bg-[var(--color-accent)]/10 border-2 border-[var(--color-primary)]/30 rounded-lg">
                  <p className="text-sm text-[var(--color-text)]/70 mb-1">Selected Tier:</p>
                  <p className="text-xl font-semibold text-[var(--color-primary)] mb-1">{selectedTier.name}</p>
                  <p className="text-sm text-[var(--color-text)]/70">
                    {formatPrice(selectedTier.priceKES)}
                  </p>
                </div>
              )}
              
              {/* Consultation Fee */}
              <div>
                <div className="inline-block bg-[var(--color-primary)] text-[var(--color-on-primary)] px-6 py-3 rounded-lg font-semibold text-lg mb-2">
                  {loadingFee ? 'Loading...' : formatPrice(consultationFeeKES)}
                </div>
                <p className="text-sm text-[var(--color-text)]/70">One comprehensive session</p>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-soft border border-[var(--color-primary)]/10 p-6 sm:p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Information */}
            <div className="space-y-6">
              <h2 className="text-2xl font-display text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]/20 pb-2">
                Business Information
              </h2>

              <div>
                <label htmlFor="businessName" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="e.g., Lash Studio Nairobi"
                />
              </div>

              <div>
                <label htmlFor="contactName" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="px-3 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  >
                    {PHONE_COUNTRY_CODES.map((code) => (
                      <option key={code.code} value={code.dialCode}>
                        {code.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneLocalNumber}
                    onChange={(e) => setPhoneLocalNumber(e.target.value)}
                    required
                    className="flex-1 px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    placeholder="712345678"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="businessType" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select business type</option>
                  <optgroup label="Beauty & Wellness">
                  <option value="lash-studio">Lash Studio</option>
                  <option value="beauty-salon">Beauty Salon</option>
                  <option value="spa">Spa</option>
                  <option value="nail-salon">Nail Salon</option>
                  <option value="hair-salon">Hair Salon</option>
                  <option value="barbershop">Barbershop</option>
                  <option value="wellness-center">Wellness Center</option>
                  </optgroup>
                  <optgroup label="Health & Wellness">
                    <option value="gym">Gym / Fitness Center</option>
                    <option value="personal-trainer">Personal Trainer</option>
                    <option value="massage-therapist">Massage Therapist</option>
                    <option value="physiotherapist">Physiotherapist</option>
                    <option value="nutritionist">Nutritionist / Dietitian</option>
                  <option value="fitness-studio">Fitness Studio</option>
                  </optgroup>
                  <optgroup label="Education & Coaching">
                    <option value="tutor">Tutor / Private Instructor</option>
                    <option value="language-school">Language School</option>
                    <option value="online-course-provider">Online Course Provider</option>
                    <option value="business-coach">Business Coach</option>
                    <option value="consultant">Consultant</option>
                    <option value="life-coach">Life Coach</option>
                  </optgroup>
                  <optgroup label="Technology & Marketing">
                    <option value="technology-group">Technology Group</option>
                    <option value="marketing-agency">Marketing Agency</option>
                    <option value="digital-marketing">Digital Marketing Professional</option>
                    <option value="social-media-manager">Social Media Manager</option>
                    <option value="seo-specialist">SEO Specialist</option>
                    <option value="content-creator">Content Creator</option>
                    <option value="web-developer">Web Developer / Designer</option>
                    <option value="it-consultant">IT Consultant</option>
                  </optgroup>
                  <optgroup label="Professional Services">
                    <option value="lawyer">Lawyer / Legal Services</option>
                    <option value="accountant">Accountant / Tax Advisor</option>
                    <option value="therapist">Therapist / Counselor</option>
                    <option value="consultant-professional">Professional Consultant</option>
                    <option value="freelancer">Freelancer (with appointments)</option>
                  </optgroup>
                  <optgroup label="Events & Entertainment">
                    <option value="photographer">Photographer</option>
                    <option value="dj">DJ / Music Services</option>
                    <option value="party-planner">Party Planner / Event Coordinator</option>
                    <option value="music-teacher">Music Teacher / Instructor</option>
                    <option value="videographer">Videographer</option>
                  </optgroup>
                  <optgroup label="Home Services">
                    <option value="cleaner">Cleaning Service</option>
                    <option value="interior-designer">Interior Designer</option>
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="repair-service">Repair Service / Handyman</option>
                    <option value="landscaper">Landscaper / Gardener</option>
                  </optgroup>
                  <optgroup label="Other">
                  <option value="other-service">Other Service Business</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label htmlFor="isBusinessRegistered" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Is your business registered? <span className="text-red-500">*</span>
                </label>
                <select
                  id="isBusinessRegistered"
                  name="isBusinessRegistered"
                  value={formData.isBusinessRegistered}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes, my business is registered</option>
                  <option value="no">No, my business is not registered</option>
                  <option value="in-progress">Registration in progress</option>
                </select>
              </div>

              <div>
                <label htmlFor="serviceType" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  What services do you offer? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="serviceType"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="e.g., Classic lashes, Volume lashes, Lash lifts, Brow lamination"
                />
              </div>
            </div>

            {/* Current Operations */}
            <div className="space-y-6 pt-6 border-t-2 border-[var(--color-primary)]/10">
              <h2 className="text-2xl font-display text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]/20 pb-2">
                Current Operations
              </h2>

              <div>
                <label htmlFor="hasWebsite" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Do you currently have a website? <span className="text-red-500">*</span>
                </label>
                <select
                  id="hasWebsite"
                  name="hasWebsite"
                  value={formData.hasWebsite}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="no">No, I don't have a website</option>
                  <option value="yes-basic">Yes, but it's very basic</option>
                  <option value="yes-functional">Yes, it's functional but needs improvement</option>
                  <option value="yes-good">Yes, it's good but missing features</option>
                </select>
              </div>

              {formData.hasWebsite && formData.hasWebsite !== 'no' && (
                <div>
                  <label htmlFor="currentWebsite" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Current Website URL
                  </label>
                  <input
                    type="url"
                    id="currentWebsite"
                    name="currentWebsite"
                    value={formData.currentWebsite}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              )}

              <div>
                <label htmlFor="monthlyClients" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Approximately how many clients do you serve per month?
                </label>
                <select
                  id="monthlyClients"
                  name="monthlyClients"
                  value={formData.monthlyClients}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select range</option>
                  <option value="0-20">0-20 clients</option>
                  <option value="21-50">21-50 clients</option>
                  <option value="51-100">51-100 clients</option>
                  <option value="101-200">101-200 clients</option>
                  <option value="200+">200+ clients</option>
                </select>
              </div>

              <div>
                <label htmlFor="currentBookingSystem" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  How do clients currently book appointments?
                </label>
                <select
                  id="currentBookingSystem"
                  name="currentBookingSystem"
                  value={formData.currentBookingSystem}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select option</option>
                  <option value="phone-call">Phone calls</option>
                  <option value="text-message">Text messages (SMS/WhatsApp)</option>
                  <option value="social-media">Social media DMs</option>
                  <option value="online-booking">Online booking system</option>
                  <option value="walk-in">Walk-ins only</option>
                  <option value="mixed">Mixed methods</option>
                </select>
              </div>

              <div>
                <label htmlFor="currentPaymentSystem" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  How do clients currently pay?
                </label>
                <select
                  id="currentPaymentSystem"
                  name="currentPaymentSystem"
                  value={formData.currentPaymentSystem}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select option</option>
                  <option value="cash-only">Cash only</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card payments</option>
                  <option value="bank-transfer">Bank transfer</option>
                  <option value="multiple">Multiple methods</option>
                </select>
              </div>
            </div>

            {/* Pain Points & Goals */}
            <div className="space-y-6 pt-6 border-t-2 border-[var(--color-primary)]/10">
              <h2 className="text-2xl font-display text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]/20 pb-2">
                What's Not Working?
              </h2>

              <div>
                <label htmlFor="mainPainPoints" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Describe your main pain points or operational issues <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="mainPainPoints"
                  name="mainPainPoints"
                  value={formData.mainPainPoints}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="Tell us about the biggest challenges you face: lost bookings, payment confusion, client communication issues, time management problems, etc. (Minimum 50 characters)"
                />
                <p className="text-xs text-[var(--color-text)]/60 mt-1">
                  min characters: 50
                </p>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-6 pt-6 border-t-2 border-[var(--color-primary)]/10">
              <h2 className="text-2xl font-display text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]/20 pb-2">
                Project Details
              </h2>

              <div>
                <label htmlFor="budgetRange" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Budget Range
                </label>
                <select
                  id="budgetRange"
                  name="budgetRange"
                  value={formData.budgetRange}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select range</option>
                  {budgetRanges.map((range) => (
                    <option key={range.id} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="timeline" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  When do you need this completed?
                </label>
                <select
                  id="timeline"
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Select timeline</option>
                  <option value="asap">As soon as possible</option>
                  <option value="1-month">Within 1 month</option>
                  <option value="2-3-months">2-3 months</option>
                  <option value="3-6-months">3-6 months</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>

            {/* Consultation Preferences */}
            <div className="space-y-6 pt-6 border-t-2 border-[var(--color-primary)]/10">
              <h2 className="text-2xl font-display text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]/20 pb-2">
                Consultation Preferences
              </h2>

              <div>
                <label htmlFor="meetingType" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Meeting Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-[var(--color-primary)]/20 rounded-lg hover:border-[var(--color-primary)]/40 transition-colors flex-1">
                    <input
                      type="radio"
                      name="meetingType"
                      value="online"
                      checked={formData.meetingType === 'online'}
                      onChange={(e) => setFormData(prev => ({ ...prev, meetingType: e.target.value as 'online' | 'physical' }))}
                      className="w-5 h-5 text-[var(--color-primary)]"
                    />
                    <div>
                      <span className="font-semibold text-[var(--color-text)]">Online Meeting</span>
                      <p className="text-xs text-[var(--color-text)]/70">Video call via Zoom/Google Meet</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-[var(--color-primary)]/20 rounded-lg hover:border-[var(--color-primary)]/40 transition-colors flex-1">
                    <input
                      type="radio"
                      name="meetingType"
                      value="physical"
                      checked={formData.meetingType === 'physical'}
                      onChange={(e) => setFormData(prev => ({ ...prev, meetingType: e.target.value as 'online' | 'physical' }))}
                      className="w-5 h-5 text-[var(--color-primary)]"
                    />
                    <div>
                      <span className="font-semibold text-[var(--color-text)]">Physical Meeting</span>
                      <p className="text-xs text-[var(--color-text)]/70">In-person consultation</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Physical Meeting Location Fields */}
              {formData.meetingType === 'physical' && (
                <div className="space-y-4 p-4 bg-[var(--color-accent)]/10 rounded-lg border border-[var(--color-primary)]/20">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">
                    Meeting Location Details
                  </h3>
                  
                  <div>
                    <label htmlFor="meetingCountry" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="meetingCountry"
                      name="meetingCountry"
                      value={formData.meetingCountry}
                      onChange={handleInputChange}
                      required={formData.meetingType === 'physical'}
                      className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="e.g., Kenya"
                    />
                  </div>

                  <div>
                    <label htmlFor="meetingCity" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="meetingCity"
                      name="meetingCity"
                      value={formData.meetingCity}
                      onChange={handleInputChange}
                      required={formData.meetingType === 'physical'}
                      className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="e.g., Nairobi"
                    />
                  </div>

                  <div>
                    <label htmlFor="meetingBuilding" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Building Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="meetingBuilding"
                      name="meetingBuilding"
                      value={formData.meetingBuilding}
                      onChange={handleInputChange}
                      required={formData.meetingType === 'physical'}
                      className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="e.g., ABC Business Center"
                    />
                  </div>

                  <div>
                    <label htmlFor="meetingStreet" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Street Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="meetingStreet"
                      name="meetingStreet"
                      value={formData.meetingStreet}
                      onChange={handleInputChange}
                      required={formData.meetingType === 'physical'}
                      className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="e.g., Moi Avenue"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="preferredDate" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Consultation Date <span className="text-red-500">*</span>
                </label>
                
                {/* Custom Calendar Picker for Labs Consultations */}
                <div className="w-full">
                  <LabsCalendarPicker
                    selectedDate={formData.preferredDate}
                    onDateSelect={(date) => {
                      // Check if date is available and not blocked
                      if (blockedDates.includes(date)) {
                        setSubmitStatus({
                          type: 'error',
                          message: 'This date is blocked and not available for consultations.',
                        })
                        return
                      }
                      if (availableDates.length > 0 && !availableDates.includes(date)) {
                        setSubmitStatus({
                          type: 'error',
                          message: 'This date is not available for consultations. Please select an available date.',
                        })
                        return
                      }
                      setFormData(prev => ({ ...prev, preferredDate: date, preferredTime: '' }))
                      setSubmitStatus({ type: null, message: '' })
                      
                      // Refresh availability when date is selected to get latest bookings
                      fetch('/api/labs/consultation/availability', { 
                        cache: 'no-store',
                        headers: {
                          'Cache-Control': 'no-cache',
                          'Pragma': 'no-cache',
                        },
                      })
                        .then(response => response.ok ? response.json() : null)
                        .then(data => {
                          if (data) {
                            const booked = Array.isArray(data.bookedSlots) ? data.bookedSlots : []
                            setBookedSlots(booked)
                          }
                        })
                        .catch(() => {})
                    }}
                    availableDates={availableDates}
                    blockedDates={blockedDates}
                    loading={loadingAvailability}
                  />
                </div>
                
                {/* Hidden input for form validation */}
                <input
                  type="hidden"
                  id="preferredDate"
                  name="preferredDate"
                  value={formData.preferredDate}
                  required
                />
                {bookedSlots.some(slot => slot.date === formData.preferredDate) && (
                  <p className="text-sm text-[var(--color-text)]/70 mt-1">
                    ℹ️ Some time slots on this date are already booked. Available slots will be shown below.
                  </p>
                )}
                {loadingAvailability && (
                  <p className="text-sm text-[var(--color-text)]/70 mt-1">Checking availability...</p>
                )}
              </div>

              <div>
                <label htmlFor="preferredTime" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Consultation Time <span className="text-red-500">*</span>
                </label>
                {(() => {
                  if (!formData.preferredDate) {
                    return (
                      <div className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg bg-gray-50 text-gray-500">
                        Please select a date first
                      </div>
                    )
                  }
                  
                  if (loadingAvailability) {
                    return (
                      <div className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg bg-white text-[var(--color-text)]">
                        Loading time slots...
                      </div>
                    )
                  }
                  
                  const selectedDateNormalized = normalizeDateForComparison(formData.preferredDate)
                  
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
                      const selectedDate = normalizeDateForComparison(formData.preferredDate)
                      const slotTime = normalizeTimeForComparison(slot.time)
                      return slotDate === selectedDate && slotTime === 'morning'
                    })) {
                      fallbackSlots.push({ value: 'morning', label: 'Morning (9 AM - 12 PM)' })
                    }
                    if (!bookedSlots.some(slot => {
                      const slotDate = normalizeDateForComparison(slot.date)
                      const selectedDate = normalizeDateForComparison(formData.preferredDate)
                      const slotTime = normalizeTimeForComparison(slot.time)
                      return slotDate === selectedDate && slotTime === 'afternoon'
                    })) {
                      fallbackSlots.push({ value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' })
                    }
                    if (!bookedSlots.some(slot => {
                      const slotDate = normalizeDateForComparison(slot.date)
                      const selectedDate = normalizeDateForComparison(formData.preferredDate)
                      const slotTime = normalizeTimeForComparison(slot.time)
                      return slotDate === selectedDate && slotTime === 'evening'
                    })) {
                      fallbackSlots.push({ value: 'evening', label: 'Evening (4 PM - 7 PM)' })
                    }
                  }
                  
                  const allAvailableSlots = availableSlots.length > 0 ? availableSlots : fallbackSlots
                  
                  // Check if all slots are booked or no slots available
                  const noSlotsAvailable = allAvailableSlots.length === 0
                  
                  if (noSlotsAvailable) {
                    return (
                      <div className="w-full px-4 py-3 border-2 border-red-300 rounded-lg bg-red-50 text-red-800 font-medium">
                        ⚠️ Slots not available on this day. Check another day.
                      </div>
                    )
                  }
                  
                  return (
                    <>
                      <select
                        id="preferredTime"
                        name="preferredTime"
                        value={formData.preferredTime}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        required
                      >
                        <option value="">Select time</option>
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
                      {formData.preferredDate && availableSlots.length > 0 && dateBookedSlots.length > 0 && (
                        <p className="text-sm text-[var(--color-text)]/70 mt-2">
                          ℹ️ {dateBookedSlots.length} time slot(s) already booked for this date. Only available slots are shown above.
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>

              <div>
                <label htmlFor="preferredContact" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Preferred Contact Method
                </label>
                <select
                  id="preferredContact"
                  name="preferredContact"
                  value={formData.preferredContact}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone call</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div>
                <label htmlFor="additionalDetails" className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Additional Details or Questions
                </label>
                <textarea
                  id="additionalDetails"
                  name="additionalDetails"
                  value={formData.additionalDetails}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="Anything else you'd like us to know?"
                />
              </div>
            </div>

            {/* Payment Section - Only show for new consultations (not rebooking) and when consultation is not free */}
            {!isRebooking && consultationFeeKES > 0 && (
              <div id="payment-section" className="mt-8 space-y-4">
                <h2 className="text-2xl font-display text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]/20 pb-2">
                  Payment
                </h2>
                
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Payment Required:</strong> Consultation fee must be paid before your appointment is confirmed. 
                    You'll be redirected to Paystack's secure payment page where you can choose your preferred payment method (Card or M-Pesa).
                  </p>
                </div>

                {/* Payment Status */}
                {paymentStatus.loading && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                      <p className="text-sm text-blue-800 font-medium">
                        {paymentStatus.message || 'Processing payment...'}
                      </p>
                    </div>
                  </div>
                )}
                {paymentStatus.success === false && !paymentStatus.loading && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ {paymentStatus.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Status Message */}
            {submitStatus.type && (
              <div
                className={`p-4 rounded-lg ${
                  submitStatus.type === 'success'
                    ? 'bg-green-50 border-2 border-green-500 text-green-800'
                    : 'bg-red-50 border-2 border-red-500 text-red-800'
                }`}
              >
                {submitStatus.message}
              </div>
            )}

            {/* Free Consultation Message */}
            {!isRebooking && consultationFeeKES === 0 && (
              <div className="mt-8 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>✅ Free Consultation:</strong> This consultation is free of charge. No payment is required. 
                  Your consultation will be confirmed immediately upon submission.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={loading || loadingRebookData}
                className="flex-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || loadingRebookData 
                  ? 'Processing...' 
                  : isRebooking 
                    ? 'Reschedule Consultation (No Payment Required)' 
                    : consultationFeeKES === 0
                      ? 'Submit Free Consultation Request'
                      : `Submit Consultation Request - ${formatPrice(consultationFeeKES)}`}
              </button>
              <Link
                href="/labs"
                className="flex-1 sm:flex-initial bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-8 py-4 rounded-lg font-semibold text-lg text-center hover:bg-[var(--color-primary)]/20 transition-all duration-300"
              >
                Back to Labs
              </Link>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-[var(--color-accent)]/10 rounded-2xl p-6 border border-[var(--color-primary)]/20">
          <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
            What happens after you submit?
          </h3>
          <ul className="space-y-2 text-[var(--color-text)]">
            <li className="flex items-start">
              <span className="text-[var(--color-primary)] mr-2">•</span>
              <span>We'll review your information and contact you within 24 hours</span>
            </li>
            <li className="flex items-start">
              <span className="text-[var(--color-primary)] mr-2">•</span>
              <span>We'll schedule your consultation at a time that works for you</span>
            </li>
            <li className="flex items-start">
              <span className="text-[var(--color-primary)] mr-2">•</span>
              <span>During the consultation, we'll diagnose your operations and create a clear plan</span>
            </li>
            <li className="flex items-start">
              <span className="text-[var(--color-primary)] mr-2">•</span>
              <span>You'll receive an honest recommendation on what to build (or not build)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmationModal(false)}>
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display text-[var(--color-primary)] mb-4">
                {isRebooking ? 'Consultation Rescheduled! ✅' : 'Booking Confirmed! ✅'}
              </h2>
              <p className="text-[var(--color-text)] mb-6 text-lg">
                {isRebooking 
                  ? 'Your consultation has been successfully rescheduled!'
                  : 'Your consultation request has been received successfully!'}
              </p>
              {(isRebooking || consultationFeeKES === 0) && (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 mb-6">
                  <p className="text-green-800 font-semibold mb-1">
                    ✅ No Payment Required
                  </p>
                  <p className="text-green-700 text-sm">
                    {isRebooking 
                      ? 'Since you already paid for your original consultation, no additional payment was required.'
                      : 'This consultation is free of charge. No payment was required.'}
                  </p>
                </div>
              )}
              <div className="bg-[var(--color-accent)]/10 rounded-lg p-4 mb-6 border border-[var(--color-primary)]/20">
                <p className="text-[var(--color-text)] text-sm mb-2">
                  <strong>📧 Check your email</strong>
                </p>
                <p className="text-[var(--color-text)]/80 text-sm">
                  We've sent a {isRebooking ? 'rescheduling' : 'confirmation'} email to <strong>{formData.email || 'your email address'}</strong> with all the details{formData.meetingType === 'online' ? ', including your meeting link' : ''}.
                </p>
              </div>
              {!isRebooking && (
                <p className="text-[var(--color-text)] mb-6 text-sm">
                  We'll contact you within 24 hours to finalize your consultation schedule.
                </p>
              )}
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] px-6 py-3 rounded-lg font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

