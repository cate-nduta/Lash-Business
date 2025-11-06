'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import CalendarPicker from '@/components/CalendarPicker'

interface TimeSlot {
  value: string
  label: string
}

interface AvailableDate {
  value: string
  label: string
}

// Service price and duration mappings will be loaded from API

export default function Booking() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [servicePrices, setServicePrices] = useState<{ [key: string]: number }>({})
  const [serviceDurations, setServiceDurations] = useState<{ [key: string]: number }>({})
  const [serviceOptions, setServiceOptions] = useState<string[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    timeSlot: '',
    location: '',
  })

  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [availableDateStrings, setAvailableDateStrings] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDates, setLoadingDates] = useState(false) // Start with false - generate dates immediately
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
    details?: string
  }>({ type: null, message: '' })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [bookingDetails, setBookingDetails] = useState<{
    name: string
    date: string
    time: string
    endTime: string
    service: string
    deposit: string
    originalPrice: string
    discount: string
    finalPrice: string
  } | null>(null)

  const [isFirstTimeClient, setIsFirstTimeClient] = useState<boolean | null>(null)
  const [checkingFirstTime, setCheckingFirstTime] = useState(false)
  const [mpesaStatus, setMpesaStatus] = useState<{
    loading: boolean
    success: boolean | null
    message: string
    checkoutRequestID?: string
  }>({
    loading: false,
    success: null,
    message: '',
  })

  // Check if email is a first-time client
  useEffect(() => {
    const checkFirstTimeClient = async () => {
      if (!formData.email || !formData.email.includes('@')) {
        setIsFirstTimeClient(null)
        return
      }

      setCheckingFirstTime(true)
      try {
        const response = await fetch(`/api/booking/check-first-time?email=${encodeURIComponent(formData.email)}`)
        const data = await response.json()
        setIsFirstTimeClient(data.isFirstTime === true)
      } catch (error) {
        console.error('Error checking first-time client:', error)
        // Default to first-time client if check fails
        setIsFirstTimeClient(true)
      } finally {
        setCheckingFirstTime(false)
      }
    }

    // Debounce the check
    const timeoutId = setTimeout(checkFirstTimeClient, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.email])

  // Load discounts from API
  const [discounts, setDiscounts] = useState<{
    firstTimeClientDiscount: { enabled: boolean; percentage: number }
    depositPercentage: number
  }>({
    firstTimeClientDiscount: { enabled: true, percentage: 10 },
    depositPercentage: 35,
  })

  useEffect(() => {
    fetch('/api/discounts')
      .then((res) => res.json())
      .then((data) => {
        setDiscounts(data)
      })
      .catch((error) => {
        console.error('Error loading discounts:', error)
      })
  }, [])

  // Load services data from API
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch('/api/services')
        const data = await response.json()
        
        // Build service prices and durations mappings
        const prices: { [key: string]: number } = {}
        const durations: { [key: string]: number } = {}
        const options: string[] = []
        
        // Combine all services
        const allServices = [
          ...(data.fullSets || []),
          ...(data.lashFills || []),
          ...(data.otherServices || []),
        ]
        
        allServices.forEach((service: { name: string; price: number; duration: number }) => {
          prices[service.name] = service.price
          durations[service.name] = service.duration
          options.push(service.name)
        })
        
        setServicePrices(prices)
        setServiceDurations(durations)
        setServiceOptions(options)
        setLoadingServices(false)
      } catch (error) {
        console.error('Error loading services:', error)
        setLoadingServices(false)
      }
    }
    
    loadServices()
  }, [])

  // Promo code state
  const [promoCode, setPromoCode] = useState('')
  const [promoCodeData, setPromoCodeData] = useState<{
    valid: boolean
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    maxDiscount?: number
    description?: string
  } | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [promoError, setPromoError] = useState('')

  // Validate promo code (only for non-first-time clients)
  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoCodeData(null)
      setPromoError('')
      return
    }

    // Don't allow promo codes for first-time clients
    if (isFirstTimeClient === true) {
      setPromoError('First-time clients cannot use promo codes. You qualify for the first-time client discount instead.')
      setPromoCodeData(null)
      return
    }

    setValidatingPromo(true)
    setPromoError('')

    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await response.json()

      if (data.valid && data.promoCode) {
        setPromoCodeData({
          valid: true,
          code: data.promoCode.code,
          discountType: data.promoCode.discountType,
          discountValue: data.promoCode.discountValue,
          maxDiscount: data.promoCode.maxDiscount,
          description: data.promoCode.description,
        })
        setPromoError('')
      } else {
        setPromoCodeData(null)
        setPromoError(data.error || 'Invalid promo code')
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoError('Error validating promo code. Please try again.')
      setPromoCodeData(null)
    } finally {
      setValidatingPromo(false)
    }
  }

  // Reset promo code when email changes or first-time status changes
  useEffect(() => {
    if (isFirstTimeClient === true) {
      // Clear promo code for first-time clients
      setPromoCode('')
      setPromoCodeData(null)
      setPromoError('')
    }
  }, [isFirstTimeClient])

  // Calculate pricing with discount (first-time OR promo code, not both)
  const calculatePricing = (service: string) => {
    if (!service || !servicePrices[service]) {
      return {
        originalPrice: 0,
        discount: 0,
        finalPrice: 0,
        deposit: 0,
        discountType: null as 'first-time' | 'promo' | null,
      }
    }

    const originalPrice = servicePrices[service]
    let discount = 0
    let discountType: 'first-time' | 'promo' | null = null

    // First-time client discount (takes priority)
    if (isFirstTimeClient === true && discounts.firstTimeClientDiscount.enabled) {
      const discountPercentage = discounts.firstTimeClientDiscount.percentage
      discount = Math.round(originalPrice * (discountPercentage / 100))
      discountType = 'first-time'
    }
    // Promo code discount (only if not first-time client)
    else if (promoCodeData && promoCodeData.valid && isFirstTimeClient === false) {
      if (promoCodeData.discountType === 'percentage') {
        discount = Math.round(originalPrice * (promoCodeData.discountValue / 100))
        // Apply max discount limit if set
        if (promoCodeData.maxDiscount && discount > promoCodeData.maxDiscount) {
          discount = promoCodeData.maxDiscount
        }
      } else {
        // Fixed amount discount
        discount = promoCodeData.discountValue
      }
      discountType = 'promo'
    }

    const finalPrice = Math.max(0, originalPrice - discount)
    const deposit = Math.round(finalPrice * (discounts.depositPercentage / 100))

    return {
      originalPrice,
      discount,
      finalPrice,
      deposit,
      discountType,
    }
  }

  const pricing = calculatePricing(formData.service)
  const depositAmount = pricing.deposit

  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([])
  const [availabilityData, setAvailabilityData] = useState<{
    businessHours: {
      [key: string]: { open: string; close: string; enabled: boolean }
    }
  } | null>(null)

  // Load availability data
  useEffect(() => {
    fetch('/api/availability')
      .then((res) => res.json())
      .then((data) => {
        setAvailabilityData(data)
      })
      .catch((error) => {
        console.error('Error loading availability:', error)
      })
  }, [])

  // Generate available dates immediately on client-side (fast)
  useEffect(() => {
    // Generate dates immediately without waiting for API
    const dates: AvailableDate[] = []
    const dateStrings: string[] = []
    const today = new Date()
    
    // Check if Saturday is enabled from availability data
    const saturdayEnabled = availabilityData?.businessHours?.saturday?.enabled === true
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      const dayOfWeek = date.getDay()
      // Include weekdays (Mon-Fri), Sundays, and Saturdays if enabled
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
      const isSunday = dayOfWeek === 0
      const isSaturday = dayOfWeek === 6
      
      if (isWeekday || isSunday || (isSaturday && saturdayEnabled)) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
        
        dates.push({ value: dateStr, label: formattedDate })
        dateStrings.push(dateStr)
      }
    }
    
    // Set dates immediately (no loading state)
    setAvailableDates(dates)
    setAvailableDateStrings(dateStrings)
    setLoadingDates(false)
    
    // Fetch fully booked dates in the background (non-blocking)
    const fetchFullyBookedDates = async () => {
      try {
        const response = await fetch('/api/calendar/available-slots?fullyBookedOnly=true')
        const data = await response.json()
        if (data.fullyBookedDates) {
          setFullyBookedDates(data.fullyBookedDates)
        }
      } catch (error) {
        // Silently fail - calendar will still work without this data
        console.warn('Could not fetch fully booked dates:', error)
      }
    }
    
    // Fetch in background after a short delay
    setTimeout(fetchFullyBookedDates, 100)
  }, [availabilityData])

  // Fetch time slots when date is selected
  useEffect(() => {
    if (formData.date) {
      fetchTimeSlots(formData.date)
    } else {
      setTimeSlots([])
      setFormData(prev => ({ ...prev, timeSlot: '' }))
    }
  }, [formData.date])

  const fetchTimeSlots = async (date: string) => {
    setLoadingSlots(true)
    setFormData(prev => ({ ...prev, timeSlot: '' })) // Clear selected time slot
    setSubmitStatus({ type: null, message: '' })
    
    try {
      const response = await fetch(`/api/calendar/available-slots?date=${date}`)
      const data = await response.json()
      if (data.slots) {
        setTimeSlots(data.slots)
        if (data.slots.length === 0) {
          setSubmitStatus({
            type: 'error',
            message: 'No available time slots for this date. Please select another date.',
          })
        }
      } else if (data.error) {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'Failed to load time slots.',
        })
        setTimeSlots([])
      }
    } catch (error) {
      console.error('Error fetching time slots:', error)
      setSubmitStatus({
        type: 'error',
        message: 'Failed to load time slots. Please try again.',
      })
      setTimeSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateSelect = (date: string) => {
    setFormData(prev => ({ ...prev, date, timeSlot: '' }))
    setSubmitStatus({ type: null, message: '' })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // Clear error messages when user makes changes
    if (submitStatus.type === 'error') {
      setSubmitStatus({ type: null, message: '' })
    }
  }

  // Initiate M-Pesa payment
  const initiateMpesaPayment = async (phone: string, amount: number, bookingReference: string) => {
    setMpesaStatus({ loading: true, success: null, message: `Initiating M-Pesa payment for KSH ${amount.toLocaleString()}...` })
    
    try {
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          amount,
          accountReference: bookingReference,
          transactionDesc: `LashDiary Deposit - ${formData.service || 'Service'}`,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMpesaStatus({
          loading: false,
          success: true,
          message: `M-Pesa prompt sent! Check your phone - you'll be asked to pay exactly KSH ${amount.toLocaleString()}. Enter your M-Pesa PIN to complete the payment.`,
          checkoutRequestID: data.checkoutRequestID,
        })
        return { success: true, checkoutRequestID: data.checkoutRequestID }
      } else {
        setMpesaStatus({
          loading: false,
          success: false,
          message: data.error || data.details || 'Failed to initiate M-Pesa payment. Please try again or contact us.',
        })
        return { success: false, error: data.error || data.details }
      }
    } catch (error: any) {
      setMpesaStatus({
        loading: false,
        success: false,
        message: 'Failed to initiate M-Pesa payment. Please try again or contact us.',
      })
      return { success: false, error: error.message }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSubmitStatus({ type: null, message: '' })
    setMpesaStatus({ loading: false, success: null, message: '' })

    // Validate promo code if one is entered
    if (promoCode.trim() && !promoCodeData?.valid) {
      // If promo code is entered but not valid, validate it first
      await validatePromoCode(promoCode)
      setLoading(false)
      // Scroll to promo code field to show the error
      const promoCodeInput = document.getElementById('promoCode')
      if (promoCodeInput) {
        promoCodeInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        promoCodeInput.focus()
      }
      return
    }

    try {
      const pricingDetails = calculatePricing(formData.service)
      
      // First, initiate M-Pesa payment
      const bookingReference = `LashDiary-${Date.now()}-${formData.name.substring(0, 3).toUpperCase()}`
      const mpesaResult = await initiateMpesaPayment(
        formData.phone,
        pricingDetails.deposit,
        bookingReference
      )

      // If M-Pesa payment was initiated successfully, proceed with booking
      // Note: The actual payment confirmation comes via callback
      if (mpesaResult.success) {
        // Proceed with booking creation
        const response = await fetch('/api/calendar/book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            isFirstTimeClient: isFirstTimeClient === true,
            originalPrice: pricingDetails.originalPrice,
            discount: pricingDetails.discount,
            finalPrice: pricingDetails.finalPrice,
            deposit: pricingDetails.deposit,
            discountType: pricingDetails.discountType,
            promoCode: promoCodeData?.code || null,
            mpesaCheckoutRequestID: mpesaResult.checkoutRequestID,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
        // Format the date and time for display
        const appointmentDate = new Date(formData.date)
        const appointmentTime = new Date(formData.timeSlot)
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const formattedTime = appointmentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        
        // Calculate end time based on service duration
        const serviceDuration = serviceDurations[formData.service] || 90 // Default to 90 minutes
        const endTime = new Date(appointmentTime)
        endTime.setMinutes(endTime.getMinutes() + serviceDuration)
        const formattedEndTime = endTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        
        // Calculate pricing for display
        const pricingDetails = calculatePricing(formData.service)
        const depositFormatted = pricingDetails.deposit > 0 ? `KSH ${pricingDetails.deposit.toLocaleString()}` : 'N/A'
        const originalPriceFormatted = `KSH ${pricingDetails.originalPrice.toLocaleString()}`
        const discountFormatted = pricingDetails.discount > 0 ? `KSH ${pricingDetails.discount.toLocaleString()}` : 'KSH 0'
        const finalPriceFormatted = `KSH ${pricingDetails.finalPrice.toLocaleString()}`
        
        // Store booking details for modal
        setBookingDetails({
          name: formData.name,
          date: formattedDate,
          time: formattedTime,
          endTime: formattedEndTime,
          service: formData.service || 'Lash Service',
          deposit: depositFormatted,
          originalPrice: originalPriceFormatted,
          discount: discountFormatted,
          finalPrice: finalPriceFormatted,
        })
        
        // Show success modal
        setShowSuccessModal(true)
        
        // Also show status message
        let emailStatus = ''
        if (data.emailSent) {
          emailStatus = 'Confirmation emails have been sent to you and the customer.'
        } else if (data.emailError) {
          emailStatus = `Note: There was an issue sending the confirmation email. Please check your email (${formData.email}) or contact us directly.`
        } else {
          emailStatus = 'Note: Email notifications may not be configured. Please check your email or contact us directly.'
        }
        
        setSubmitStatus({
          type: 'success',
          message: '🎉 Appointment Booked Successfully!',
          details: `${data.message || 'Your appointment has been confirmed.'} ${emailStatus}`,
        })
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          service: '',
          date: '',
          timeSlot: '',
          location: '',
        })
        setTimeSlots([])
        
        // Refresh available dates and time slots after booking
        // This ensures the booked slot disappears and dates update if fully booked
        const refreshResponse = await fetch('/api/calendar/available-slots')
        const refreshData = await refreshResponse.json()
        if (refreshData.dates) {
          setAvailableDates(refreshData.dates)
          const dateStrings = refreshData.dates.map((d: AvailableDate) => d.value)
          setAvailableDateStrings(dateStrings)
        }
        if (refreshData.fullyBookedDates) {
          setFullyBookedDates(refreshData.fullyBookedDates)
        }
        
        // Refresh time slots for the selected date if it still exists
        if (formData.date) {
          fetchTimeSlots(formData.date)
        }
        } else {
          setSubmitStatus({
            type: 'error',
            message: data.error || 'Failed to book appointment. Please try again.',
            details: data.details,
          })
        }
      } else {
        // M-Pesa payment failed, but still allow booking (manual payment option)
        setSubmitStatus({
          type: 'error',
          message: 'M-Pesa payment could not be initiated.',
          details: `${mpesaStatus.message} You can still complete your booking and pay manually. Please contact us for payment instructions.`,
        })
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'An error occurred. Please try again later.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={ref}
          className={`text-center mb-12 ${
            inView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <h1 className="text-5xl md:text-6xl font-display text-brown-dark mb-6">
            Book Your Appointment
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed mb-4">
            Schedule your mobile lash service with ease! We come to you within Nairobi environs. 
            Select a date and time, then fill out the form below. Let's make you gorgeous!
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 max-w-2xl mx-auto mb-6 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-yellow-800">
                  A {discounts.depositPercentage}% deposit is required to secure your booking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Picker */}
        <div className="mb-8">
          <CalendarPicker
            selectedDate={formData.date}
            onDateSelect={handleDateSelect}
            availableDates={availableDateStrings}
            fullyBookedDates={fullyBookedDates}
            loading={loadingDates}
            availabilityData={availabilityData || undefined}
          />
        </div>

        {/* Booking Form */}
        <div className="bg-white border-2 border-brown-light rounded-lg shadow-soft p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Time Slot Field */}
            {formData.date && (
              <div>
                <label
                  htmlFor="timeSlot"
                  className="block text-sm font-semibold text-brown-dark mb-2"
                >
                  Select Time *
                </label>
                {loadingSlots ? (
                  <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                    Loading available time slots...
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                    No available time slots for this date. Please select another date.
                  </div>
                ) : (
                  <select
                    id="timeSlot"
                    name="timeSlot"
                    required
                    value={formData.timeSlot}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all"
                  >
                    <option value="">Select a time</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-brown-dark mb-2"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-brown-dark mb-2"
              >
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-brown-dark mb-2"
              >
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                placeholder="+254 700 000 000"
              />
            </div>

            {/* Location Field */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-semibold text-brown-dark mb-2"
              >
                Location/Address * (For mobile service)
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                placeholder="e.g., Westlands, ABC Apartments, Block 3, Unit 5, Near ABC Mall"
              />
              <p className="mt-2 text-sm text-brown-dark/70">
                Please provide a detailed address including area, building name, apartment/unit number, and nearby landmarks. This helps us locate you easily and avoid any miscommunication.
              </p>
            </div>

            {/* Service Field */}
            <div>
              <label
                htmlFor="service"
                className="block text-sm font-semibold text-brown-dark mb-2"
              >
                Service Type *
              </label>
              {loadingServices ? (
                <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                  Loading services...
                </div>
              ) : serviceOptions.length === 0 ? (
                <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                  <p className="text-sm">No services available. Please contact us directly or refresh the page.</p>
                </div>
              ) : (
                <select
                  id="service"
                  name="service"
                  required
                  value={formData.service}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all"
                >
                  <option value="">Select a service</option>
                  {serviceOptions.map((serviceName) => (
                    <option key={serviceName} value={serviceName}>
                      {serviceName} - KSH {servicePrices[serviceName]?.toLocaleString() || 'N/A'}
                    </option>
                  ))}
                </select>
              )}
              {/* Promo Code Field (only for non-first-time clients) */}
              {formData.service && isFirstTimeClient === false && (
                <div className="mt-4">
                  <label
                    htmlFor="promoCode"
                    className="block text-sm font-semibold text-brown-dark mb-2"
                  >
                    Promo Code (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="promoCode"
                      value={promoCode}
                      onChange={(e) => {
                        const value = e.target.value
                        setPromoCode(value)
                        // Clear previous validation
                        setPromoError('')
                        if (!value.trim()) {
                          setPromoCodeData(null)
                        }
                      }}
                      onBlur={() => {
                        if (promoCode.trim()) {
                          validatePromoCode(promoCode)
                        }
                      }}
                      placeholder="Enter promo code"
                      className="flex-1 px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                    />
                    <button
                      type="button"
                      onClick={() => validatePromoCode(promoCode)}
                      disabled={validatingPromo || !promoCode.trim()}
                      className="bg-brown-dark text-white px-6 py-3 rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validatingPromo ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {promoError && (
                    <div className="mt-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-red-600 text-xl font-bold flex-shrink-0">⚠️</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800 mb-1">Promo Code Not Valid</p>
                          <p className="text-sm text-red-700">{promoError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoError('')
                            setPromoCode('')
                            setPromoCodeData(null)
                          }}
                          className="text-red-600 hover:text-red-800 flex-shrink-0"
                          aria-label="Dismiss error"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  {promoCodeData && promoCodeData.valid && (
                    <div className="mt-3 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                      <p className="text-sm text-green-800 font-semibold">
                        ✓ Promo code "{promoCodeData.code}" applied! {promoCodeData.description && `(${promoCodeData.description})`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {formData.service && depositAmount > 0 && (
                <div className="mt-3 p-4 bg-brown-light/20 border-2 border-brown-light rounded-lg">
                  {checkingFirstTime && formData.email && (
                    <div className="mb-3 text-sm text-brown-dark/70 italic">
                      Checking eligibility for first-time client discount...
                    </div>
                  )}
                  {isFirstTimeClient === true && discounts.firstTimeClientDiscount.enabled && (
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-semibold">
                        🎉 You qualify for our {discounts.firstTimeClientDiscount.percentage}% first-time client discount!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        First-time clients cannot use promo codes.
                      </p>
                    </div>
                  )}
                  {isFirstTimeClient === false && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-semibold">
                        Returning clients can use promo codes for additional discounts!
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-brown-dark font-semibold">Service Price:</span>
                      <span className="text-brown-dark font-bold">KSH {pricing.originalPrice.toLocaleString()}</span>
                    </div>
                    {pricing.discount > 0 && (
                      <>
                        {pricing.discountType === 'first-time' && (
                          <div className="flex justify-between items-center text-green-700">
                            <span className="font-semibold">First-Time Client Discount ({discounts.firstTimeClientDiscount.percentage}%):</span>
                            <span className="font-bold">- KSH {pricing.discount.toLocaleString()}</span>
                          </div>
                        )}
                        {pricing.discountType === 'promo' && promoCodeData && (
                          <div className="flex justify-between items-center text-blue-700">
                            <span className="font-semibold">
                              Promo Code Discount ({promoCodeData.code}): 
                              {promoCodeData.discountType === 'percentage' 
                                ? ` ${promoCodeData.discountValue}%`
                                : ` KSH ${promoCodeData.discountValue}`
                              }
                            </span>
                            <span className="font-bold">- KSH {pricing.discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-brown-light/50">
                          <span className="text-brown-dark font-semibold">Final Price:</span>
                          <span className="text-brown-dark font-bold text-lg">KSH {pricing.finalPrice.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-brown-light/50">
                      <span className="text-brown-dark font-semibold">Required Deposit ({discounts.depositPercentage}%):</span>
                      <span className="text-brown-dark font-bold text-lg">KSH {depositAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-brown-dark/70 mt-3 pt-3 border-t border-brown-light/50">
                    You will receive payment instructions via email after booking. The remaining balance will be paid on the day of your appointment.
                  </p>
                </div>
              )}
            </div>

            {/* Status Message */}
            {submitStatus.type && (
              <div
                data-status-message
                className={`p-6 rounded-lg border-2 ${
                  submitStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border-green-300 shadow-lg'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-2xl ${submitStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {submitStatus.type === 'success' ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg mb-1">{submitStatus.message}</div>
                    {submitStatus.details && (
                      <div className="mt-2 text-sm opacity-90">{submitStatus.details}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* M-Pesa Payment Status */}
            {mpesaStatus.loading && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <p className="text-sm text-blue-800 font-medium">
                    {mpesaStatus.message || 'Sending M-Pesa payment prompt to your phone...'}
                  </p>
                </div>
              </div>
            )}
            {mpesaStatus.success === true && !mpesaStatus.loading && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✅ {mpesaStatus.message}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Please complete the payment on your phone to secure your booking.
                </p>
              </div>
            )}
            {mpesaStatus.success === false && !mpesaStatus.loading && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ {mpesaStatus.message}
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  You can still complete your booking. We'll contact you for payment instructions.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || loadingDates || loadingSlots || !formData.date || !formData.timeSlot || !formData.location || !formData.service || mpesaStatus.loading}
              className="w-full bg-brown-dark hover:bg-brown text-white font-semibold px-8 py-4 rounded-full shadow-soft-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading || mpesaStatus.loading ? 'Processing...' : 'Book Appointment & Pay Deposit'}
            </button>
            {!formData.service && (
              <p className="text-sm text-red-600 text-center mt-2">
                Please select a service to continue
              </p>
            )}
          </form>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-white border-2 border-brown-light rounded-lg shadow-soft p-8 text-center">
          <h3 className="text-2xl font-display text-brown-dark mb-4">
            Need Assistance?
          </h3>
          <p className="text-brown-dark/80 mb-4">
            Our team is here to help you find the perfect appointment time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:catherinenkuria@gmail.com"
              className="inline-block bg-brown-dark text-white font-semibold px-6 py-3 rounded-full hover:bg-brown transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && bookingDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in-up">
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-display text-brown-dark font-bold mb-2">
                Appointment Confirmed!
              </h2>
              <p className="text-gray-600">
                Your booking has been successfully created
              </p>
            </div>

            {/* Booking Details */}
            <div className="bg-brown-lighter/40 border-2 border-brown-light rounded-lg p-6 mb-6">
              <h3 className="font-display text-brown-dark text-xl font-semibold mb-4">Booking Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-brown-dark/70 font-medium">Name:</span>
                  <span className="text-brown-dark font-semibold">{bookingDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-dark/70 font-medium">Date:</span>
                  <span className="text-brown-dark font-semibold">{bookingDetails.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-dark/70 font-medium">Time:</span>
                  <span className="text-brown-dark font-semibold">{bookingDetails.time} - {bookingDetails.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-dark/70 font-medium">Appointment ends:</span>
                  <span className="text-brown-dark font-semibold">{bookingDetails.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-dark/70 font-medium">Service:</span>
                  <span className="text-brown-dark font-semibold">{bookingDetails.service}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-brown-light/50">
                  <span className="text-brown-dark/70 font-medium">Deposit Required:</span>
                  <span className="text-brown-dark font-bold text-lg">{bookingDetails.deposit}</span>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="bg-brown-light/20 border-l-4 border-brown-dark p-4 rounded-lg mb-4">
              <p className="text-brown-dark font-semibold text-sm mb-2">
                Payment Instructions:
              </p>
              <p className="text-brown-dark/80 text-sm">
                You will receive payment instructions via email. Please pay the {bookingDetails.deposit} deposit to secure your appointment. The remaining balance will be paid on the day of your appointment.
              </p>
            </div>

            {/* Message */}
            <div className="bg-brown-light/20 border-l-4 border-brown-dark p-4 rounded-lg mb-6">
              <p className="text-brown-dark/80 text-sm">
                A confirmation email has been sent to your email address. Please check your inbox and follow the important reminders.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-brown-dark hover:bg-brown text-white font-semibold px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
