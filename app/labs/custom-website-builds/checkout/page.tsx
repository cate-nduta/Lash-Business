'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useLabsCart } from '../cart-context'
import { convertCurrency, DEFAULT_EXCHANGE_RATES, type ExchangeRates } from '@/lib/currency-utils'
import Link from 'next/link'
import PaystackInlinePayment from '@/components/PaystackInlinePayment'

// Lazy load CalendarPicker for faster initial page load
const CalendarPicker = lazy(() => import('@/components/CalendarPicker'))

interface TimeSlot {
  value: string // ISO string like "2025-01-15T09:30:00+03:00"
  label: string // Display label like "9:30 AM"
}

interface CheckoutData {
  orderId: string
  items: Array<{
    productId: string
    name: string
    price: number
    quantity: number
    billingPeriod?: 'one-time' | 'yearly' | 'monthly'
    setupFee?: number
  }>
  subtotal: number
  setupFeesTotal?: number // Total of all setup fees
  domainPricing?: {
    setupFee: number
    annualPrice: number
    totalFirstPayment: number
  }
  referralDiscount?: number
  appliedReferralCode?: string
  taxAmount?: number // Tax/VAT amount
  taxPercentage?: number // Tax/VAT percentage
  total: number
  initialPayment: number
  remainingPayment: number
  paymentStatus: 'pending' | 'partial' | 'completed'
  email: string
}

function LabsCheckoutContentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, clearCart, restoreCart, getTotalPrice, addToCart, removeFromCart, updateQuantity } = useLabsCart()
  const { currency, formatCurrency } = useCurrency()
  const [orderRestored, setOrderRestored] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [fromGuide, setFromGuide] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [processing, setProcessing] = useState(false)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [paymentData, setPaymentData] = useState<{
    publicKey: string
    email: string
    amount: number
    currency: string
    reference: string
    customerName: string
    phone?: string
    orderId: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [minimumCartValue, setMinimumCartValue] = useState<number>(20000)
  const [enableBusinessInfo, setEnableBusinessInfo] = useState<boolean>(true)
  const [allServices, setAllServices] = useState<any[]>([])
  const [referralDiscountPercentage, setReferralDiscountPercentage] = useState<number>(10) // Default 10%
  const [highValueOrderLimit, setHighValueOrderLimit] = useState<number>(400000) // Default 400,000 KSH
  // Initialize tax percentage from localStorage for instant display, then update from API
  const [taxPercentage, setTaxPercentage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('labs-tax-percentage')
        if (cached) {
          const parsed = parseFloat(cached)
          if (!isNaN(parsed) && parsed >= 0) {
            return parsed
          }
        }
      } catch (error) {
        console.error('Error reading cached tax percentage:', error)
      }
    }
    return 0
  })
  const [domainPricing, setDomainPricing] = useState<{
    setupFee: number
    annualPrice: number
    totalFirstPayment: number
  } | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const [validatingCode, setValidatingCode] = useState(false)
  const [codeValid, setCodeValid] = useState<boolean | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [calculatedDiscount, setCalculatedDiscount] = useState<number>(0) // Calculated discount amount
  const [contactFormSubmitting, setContactFormSubmitting] = useState(false) // For high-value order contact form
  
  // Website type: 'personal' or 'business'
  const [websiteType, setWebsiteType] = useState<'personal' | 'business'>('business')
  
  // Business details
  const [businessName, setBusinessName] = useState('')
  const [domainType, setDomainType] = useState<'new' | 'existing'>('new')
  const [domainExtension, setDomainExtension] = useState('.co.ke')
  const [domainName, setDomainName] = useState('')
  const [existingDomain, setExistingDomain] = useState('')
  
  // Logo options
  const [logoType, setLogoType] = useState<'upload' | 'text' | 'custom'>('text')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [logoText, setLogoText] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showLogoDesignSuggestion, setShowLogoDesignSuggestion] = useState(false)
  
  // Color options
  const [primaryColor, setPrimaryColor] = useState('#7C4B31') // Default brown
  const [secondaryColor, setSecondaryColor] = useState('#F3E6DC') // Default light brown
  
  // Additional business information
  const [businessDescription, setBusinessDescription] = useState('')
  const [personalWebsiteAbout, setPersonalWebsiteAbout] = useState('') // For personal websites
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessCountry, setBusinessCountry] = useState('Kenya')
  const [businessHours, setBusinessHours] = useState<Array<{
    day: string
    open: string
    close: string
    closed: boolean
  }>>([
    { day: 'Monday', open: '09:00', close: '17:00', closed: false },
    { day: 'Tuesday', open: '09:00', close: '17:00', closed: false },
    { day: 'Wednesday', open: '09:00', close: '17:00', closed: false },
    { day: 'Thursday', open: '09:00', close: '17:00', closed: false },
    { day: 'Friday', open: '09:00', close: '17:00', closed: false },
    { day: 'Saturday', open: '09:00', close: '17:00', closed: false },
    { day: 'Sunday', open: '09:00', close: '17:00', closed: true },
  ])
  const [servicesProducts, setServicesProducts] = useState('')
  const [socialMediaLinks, setSocialMediaLinks] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
  })
  
  // Timeline/deadline
  const [timeline, setTimeline] = useState<'10' | '21' | 'urgent' | ''>('')
  const [priorityFee, setPriorityFee] = useState<number>(2000) // Default priority fee

  // Calendar/Time slot selection for consultation call
  const [consultationDate, setConsultationDate] = useState<string>('')
  const [consultationTimeSlot, setConsultationTimeSlot] = useState<string>('')
  const [consultationMeetingType, setConsultationMeetingType] = useState<'online' | 'phone' | ''>('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availabilityData, setAvailabilityData] = useState<any>(null)
  const [minimumBookingDate, setMinimumBookingDate] = useState<string | null>(null)
  const [consultationAvailability, setConsultationAvailability] = useState<{
    bookedSlots: Array<{ date?: string; time?: string }>
    timeSlots: Array<{ hour: number; minute: number; label: string }>
  } | null>(null)

  // Set mounted state after component mounts to prevent hydration errors
  useEffect(() => {
    setMounted(true)
    // Check if user came from a guide page - check both URL parameter and localStorage
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const fromGuideParam = urlParams.get('fromGuide') === 'true'
      const fromGuideStorage = localStorage.getItem('labs-checkout-from-guide') === 'true'
      const fromGuideFlag = fromGuideParam || fromGuideStorage
      
      setFromGuide(fromGuideFlag)
      
      // Clear the flag and URL parameter after reading
      if (fromGuideFlag) {
        localStorage.removeItem('labs-checkout-from-guide')
        // Remove fromGuide parameter from URL without page reload
        if (fromGuideParam) {
          const newUrl = window.location.pathname + (window.location.search.replace(/[?&]fromGuide=true/, '').replace(/^\?/, '') || '')
          window.history.replaceState({}, '', newUrl)
        }
      }

    }
  }, [])

  // Discount amount is now calculated by the API during validation
  // No need to recalculate here - it's set in the validation handler
  useEffect(() => {
    if (codeValid !== true) {
      setCalculatedDiscount(0)
    }
  }, [codeValid, getTotalPrice, timeline, priorityFee, domainType, domainPricing])

  // Load availability data and calendar dates for consultation call scheduling
  // Defer this to load after critical data (settings, tax) to improve initial page load
  useEffect(() => {
    // Small delay to let critical data load first
    const delayTimer = setTimeout(() => {
      loadAvailabilityData()
    }, 200)

    return () => clearTimeout(delayTimer)
  }, [])

  const loadAvailabilityData = () => {
    let isMounted = true
    let controller: AbortController | null = null
    let availabilityTimeout: ReturnType<typeof setTimeout> | null = null
    let calendarTimeout: ReturnType<typeof setTimeout> | null = null

    const loadAvailability = async () => {
      setLoadingDates(true)
      
      try {
        // Fetch availability settings and calendar dates in parallel
        controller = new AbortController()
        
        // Safe abort with reason to prevent "aborted without reason" error
        // Reduced timeout to 5 seconds for faster loading
        availabilityTimeout = setTimeout(() => {
          if (controller && !controller.signal.aborted) {
            try {
              controller.abort('Request timeout after 5 seconds')
            } catch (e: any) {
              // Silently handle abort errors - they're expected
              const isAbortError = 
                e?.name === 'AbortError' || 
                e?.name === 'TimeoutError' ||
                e?.message?.toLowerCase().includes('abort')
              if (!isAbortError && process.env.NODE_ENV === 'development') {
                console.warn('Unexpected error during abort:', e)
              }
            }
          }
        }, 5000)
        
        const availabilityOptions = {
          cache: 'no-store' as RequestCache,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          signal: controller.signal,
        }

        const timestamp = Date.now()
        
        const [availabilityRes, calendarRes] = await Promise.allSettled([
          fetch(`/api/availability?t=${timestamp}`, availabilityOptions).then((res) => {
            if (availabilityTimeout) clearTimeout(availabilityTimeout)
            if (!res.ok) return null
            return res.json()
          }).catch((error: any) => {
            if (availabilityTimeout) clearTimeout(availabilityTimeout)
            if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
              return null
            }
            throw error
          }),
          fetch(`/api/labs/consultation/availability?t=${timestamp}`, availabilityOptions).then((res) => {
            if (calendarTimeout) clearTimeout(calendarTimeout)
            if (!res.ok) return null
            return res.json()
          }).catch((error: any) => {
            if (calendarTimeout) clearTimeout(calendarTimeout)
            if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
              return null
            }
            throw error
          }),
        ])

        if (!isMounted) return

        // Process availability data
        if (availabilityRes.status === 'fulfilled' && availabilityRes.value) {
          const availability = availabilityRes.value
          setAvailabilityData({
            businessHours: availability?.businessHours || {},
            timeSlots: availability?.timeSlots || {},
            bookingWindow: availability?.bookingWindow || {},
          })
          if (availability?.minimumBookingDate) {
            setMinimumBookingDate(availability.minimumBookingDate)
          }
        } else {
          setAvailabilityData({
            businessHours: {},
            timeSlots: {},
            bookingWindow: {},
          })
        }

        // Process calendar dates from consultation availability API
        if (calendarRes.status === 'fulfilled' && calendarRes.value) {
          const calendarData = calendarRes.value
          // Consultation availability API returns availableDates as array of strings
          const dates: string[] = Array.isArray(calendarData?.availableDates) 
            ? calendarData.availableDates
            : []
          setAvailableDates(dates)
          
          // Also set blocked dates if available
          if (Array.isArray(calendarData?.blockedDates)) {
            setFullyBookedDates(calendarData.blockedDates)
          }
          
          // Set minimum booking date if available
          if (calendarData?.minimumBookingDate) {
            setMinimumBookingDate(calendarData.minimumBookingDate)
          }
          
          // Store consultation availability data for time slot filtering
          setConsultationAvailability({
            bookedSlots: Array.isArray(calendarData?.bookedSlots) ? calendarData.bookedSlots : [],
            timeSlots: Array.isArray(calendarData?.timeSlots) ? calendarData.timeSlots : [],
          })
        }

        setLoadingDates(false)
      } catch (error: any) {
        if (availabilityTimeout) clearTimeout(availabilityTimeout)
        if (calendarTimeout) clearTimeout(calendarTimeout)
        
        if (!isMounted) return
        
        if (error?.name !== 'AbortError' && error?.name !== 'TimeoutError') {
          console.error('Error loading availability:', error)
        }
        setLoadingDates(false)
      }
    }

    loadAvailability()

    // Return cleanup function
    return () => {
      isMounted = false
      if (controller && !controller.signal.aborted) {
        try {
          controller.abort('Component unmounted')
        } catch (e: any) {
          // Silently handle abort errors during cleanup
          const isAbortError = 
            e?.name === 'AbortError' || 
            e?.name === 'TimeoutError' ||
            e?.message?.toLowerCase().includes('abort')
          if (!isAbortError && process.env.NODE_ENV === 'development') {
            console.warn('Unexpected error during abort cleanup:', e)
          }
        }
      }
      if (availabilityTimeout) clearTimeout(availabilityTimeout)
      if (calendarTimeout) clearTimeout(calendarTimeout)
    }
  }

  // Filter and format time slots when consultation date is selected
  useEffect(() => {
    if (!consultationDate || !consultationAvailability) {
      setTimeSlots([])
      if (!consultationDate) {
        setConsultationTimeSlot('')
      }
      return
    }

    setLoadingSlots(true)
    setConsultationTimeSlot('') // Clear selected time slot when date changes
    setConsultationMeetingType('') // Clear meeting type when date changes
    
    try {
      // Get booked slots for the selected date
      const bookedForDate = consultationAvailability.bookedSlots
        .filter((slot: { date?: string; time?: string }) => {
          if (!slot.date || !slot.time) return false
          // Normalize date comparison (YYYY-MM-DD)
          const slotDate = slot.date.split('T')[0] || slot.date
          const selectedDate = consultationDate.split('T')[0] || consultationDate
          return slotDate === selectedDate
        })
        .map((slot: { time?: string }) => {
          // Normalize time for comparison - booked time is normalized to lowercase (e.g., "9:30 am")
          const time = slot.time?.toLowerCase().trim() || ''
          // Extract hour, minute, and AM/PM if possible - handle various formats
          const match = time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/)
          if (match) {
            let hour = parseInt(match[1], 10)
            const minute = parseInt(match[2], 10)
            const ampm = match[3]?.toLowerCase() || ''
            
            // Convert 12-hour to 24-hour format for comparison
            if (ampm === 'pm' && hour !== 12) {
              hour += 12
            } else if (ampm === 'am' && hour === 12) {
              hour = 0
            }
            // If no AM/PM, check if hour > 12 to determine format
            // If hour > 12, assume 24-hour format; otherwise, assume 12-hour format (AM)
            if (!ampm && hour <= 12) {
              // Could be either format, but since it's normalized from a label, it's likely 12-hour
              // We'll compare both possibilities in the filter below
            }
            
            return { hour, minute, label: time, originalTime: time }
          }
          return null
        })
        .filter((slot): slot is { hour: number; minute: number; label: string; originalTime: string } => slot !== null)
      
      // Filter out booked slots and convert to TimeSlot format
      const formattedSlots: TimeSlot[] = consultationAvailability.timeSlots
        .filter((slot: { hour: number; minute: number; label: string }) => {
          // Check if this slot is booked using multiple matching strategies
          return !bookedForDate.some((booked) => {
            // Strategy 1: Direct hour and minute comparison (most accurate)
            if (booked.hour === slot.hour && booked.minute === slot.minute) {
              return true
            }
            
            // Strategy 2: Compare hour:minute format (handles edge cases)
            const slotTimeStr = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`
            const bookedTimeStr = `${String(booked.hour).padStart(2, '0')}:${String(booked.minute).padStart(2, '0')}`
            if (slotTimeStr === bookedTimeStr) {
              return true
            }
            
            // Strategy 3: Label comparison (case-insensitive, handles variations)
            const slotLabel = slot.label.toLowerCase().trim()
            const bookedLabel = booked.originalTime || booked.label || ''
            if (slotLabel === bookedLabel || slotLabel.includes(bookedLabel) || bookedLabel.includes(slotLabel)) {
              return true
            }
            
            // Strategy 4: Extract hour:minute from labels and compare
            const slotLabelMatch = slotLabel.match(/(\d{1,2}):(\d{2})/)
            const bookedLabelMatch = bookedLabel.match(/(\d{1,2}):(\d{2})/)
            if (slotLabelMatch && bookedLabelMatch) {
              const slotH = parseInt(slotLabelMatch[1], 10)
              const slotM = parseInt(slotLabelMatch[2], 10)
              const bookedH = parseInt(bookedLabelMatch[1], 10)
              const bookedM = parseInt(bookedLabelMatch[2], 10)
              
              // Handle AM/PM in labels
              let slotHour24 = slotH
              let bookedHour24 = bookedH
              if (slotLabel.includes('pm') && slotH !== 12) slotHour24 = slotH + 12
              if (slotLabel.includes('am') && slotH === 12) slotHour24 = 0
              if (bookedLabel.includes('pm') && bookedH !== 12) bookedHour24 = bookedH + 12
              if (bookedLabel.includes('am') && bookedH === 12) bookedHour24 = 0
              
              if (slotHour24 === bookedHour24 && slotM === bookedM) {
                return true
              }
            }
            
            return false
          })
        })
        .map((slot: { hour: number; minute: number; label: string }) => {
          // Create ISO string for the time slot in Nairobi timezone (UTC+3)
          const slotDateTime = `${consultationDate}T${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}:00+03:00`
          return {
            value: slotDateTime,
            label: slot.label,
          }
        })
      
      setTimeSlots(formattedSlots)
      
      if (formattedSlots.length === 0) {
        setFullyBookedDates((prev) =>
          prev.includes(consultationDate) ? prev : [...prev, consultationDate]
        )
      } else {
        setFullyBookedDates((prev) =>
          prev.filter((d) => d !== consultationDate)
        )
      }
    } catch (error) {
      console.error('Error processing time slots:', error)
      setTimeSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [consultationDate, consultationAvailability])

  // Clear time slot and meeting type if date becomes unavailable
  useEffect(() => {
    if (consultationDate && availableDates.length > 0 && !availableDates.includes(consultationDate)) {
      setConsultationDate('')
      setConsultationTimeSlot('')
      setConsultationMeetingType('')
    }
  }, [availableDates, consultationDate])

  // Clear meeting type when time slot changes
  useEffect(() => {
    if (!consultationTimeSlot) {
      setConsultationMeetingType('')
    }
  }, [consultationTimeSlot])

  // Load settings and exchange rates in parallel for faster loading
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load both in parallel, but prioritize settings for tax display
        const settingsPromise = fetch('/api/labs/web-services', { 
          cache: 'no-store',
          next: { revalidate: 0 }
        })
        const exchangePromise = fetch('/api/exchange-rates', { 
          cache: 'no-store',
          next: { revalidate: 0 }
        })

        // Process settings first (for tax percentage)
        const settingsRes = await settingsPromise
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setMinimumCartValue(data.cartRules?.minimumCartValue || 20000)
          setEnableBusinessInfo(data.enableBusinessInfo !== false)
          setPriorityFee(data.priorityFee || 2000)
          setReferralDiscountPercentage(data.referralDiscountPercentage || 10)
          setHighValueOrderLimit(data.highValueOrderLimit || 400000)
          const newTaxPercentage = data.taxPercentage || 0
          setTaxPercentage(newTaxPercentage)
          // Cache tax percentage for instant display on next load
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('labs-tax-percentage', String(newTaxPercentage))
            } catch (error) {
              console.error('Error caching tax percentage:', error)
            }
          }
          setAllServices(data.services || [])
          if (data.domainPricing) {
            setDomainPricing(data.domainPricing)
          } else {
            setDomainPricing({
              setupFee: 4000,
              annualPrice: 2000,
              totalFirstPayment: 6000,
            })
          }
        } else {
          // Set defaults on error
          setDomainPricing({
            setupFee: 4000,
            annualPrice: 2000,
            totalFirstPayment: 6000,
          })
        }

        // Process exchange rates (can load in background)
        exchangePromise.then(async (exchangeRes) => {
          if (exchangeRes.ok) {
            const data = await exchangeRes.json()
            setExchangeRates(data)
          }
        }).catch(() => {
          // Silently fail for exchange rates - not critical
        })
      } catch (error) {
        console.error('Error loading data:', error)
        // Set defaults on error
        setDomainPricing({
          setupFee: 4000,
          annualPrice: 2000,
          totalFirstPayment: 6000,
        })
      }
    }
    loadData()
  }, [])

  // Restore order from orderId in URL
  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (orderId && !orderRestored) {
      const restoreOrder = async () => {
        try {
          const response = await fetch(`/api/labs/web-services/orders/restore?orderId=${orderId}`, {
            cache: 'no-store',
          })
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.order) {
              const order = data.order
              
              // Restore cart items
              restoreCart(order.items || [])
              
              // Restore form fields (only restore basic contact info, not business/domain/logo fields)
              if (order.name) setName(order.name)
              if (order.email) setEmail(order.email)
              if (order.phoneNumber) setPhoneNumber(order.phoneNumber)
              // Don't auto-fill business/domain/logo fields - user must enter manually
              // if (order.businessName) setBusinessName(order.businessName)
              // if (order.domainType) setDomainType(order.domainType)
              // if (order.domainExtension) setDomainExtension(order.domainExtension)
              // if (order.domainName) setDomainName(order.domainName)
              // if (order.existingDomain) setExistingDomain(order.existingDomain)
              // if (order.logoType) setLogoType(order.logoType)
              // if (order.logoUrl) setLogoUrl(order.logoUrl)
              // if (order.logoText) setLogoText(order.logoText)
              if (order.primaryColor) setPrimaryColor(order.primaryColor)
              if (order.secondaryColor) setSecondaryColor(order.secondaryColor)
              if (order.businessDescription) setBusinessDescription(order.businessDescription)
              if (order.businessAddress) setBusinessAddress(order.businessAddress)
              if (order.businessCity) setBusinessCity(order.businessCity)
              if (order.businessCountry) setBusinessCountry(order.businessCountry)
              if (order.businessHours) setBusinessHours(order.businessHours)
              if (order.servicesProducts) setServicesProducts(order.servicesProducts)
              if (order.socialMediaLinks) setSocialMediaLinks(order.socialMediaLinks)
              if (order.timeline) setTimeline(order.timeline)
              if (order.consultationDate) setConsultationDate(order.consultationDate)
              if (order.consultationTimeSlot) setConsultationTimeSlot(order.consultationTimeSlot)
              if (order.consultationMeetingType) setConsultationMeetingType(order.consultationMeetingType)
              
              setOrderRestored(true)
            }
          }
        } catch (error) {
          console.error('Error restoring order:', error)
        }
      }
      restoreOrder()
    }
  }, [searchParams, orderRestored, restoreCart])

  // No auto-fill - user must enter all fields manually

  // Update logo design suggestion when cart changes and auto-add/remove logo design service
  useEffect(() => {
    if (logoType === 'custom') {
      const hasLogoDesign = items.some(item => 
        item.name.toLowerCase().includes('logo') && 
        item.name.toLowerCase().includes('design')
      )
      setShowLogoDesignSuggestion(!hasLogoDesign)
      
      // Auto-add Logo Design service if not in cart
      if (!hasLogoDesign && allServices.length > 0) {
        const logoDesignService = allServices.find(s => 
          s.name.toLowerCase().includes('logo') && 
          s.name.toLowerCase().includes('design')
        )
        if (logoDesignService) {
          addToCart({
            productId: logoDesignService.id,
            name: logoDesignService.name,
            price: logoDesignService.price,
            category: logoDesignService.category,
            billingPeriod: logoDesignService.billingPeriod,
            setupFee: logoDesignService.setupFee,
          })
        }
      }
    } else if (logoType === 'upload' || logoType === 'text') {
      // Remove Logo Design service from cart when Text Logo or Own Logo is selected
      const logoDesignItem = items.find(item => 
        item.name.toLowerCase().includes('logo') && 
        item.name.toLowerCase().includes('design')
      )
      if (logoDesignItem) {
        removeFromCart(logoDesignItem.productId)
      }
      setShowLogoDesignSuggestion(false)
    }
  }, [logoType, items, allServices, addToCart, removeFromCart])

  // Calculate total amount for high-value order check
  const getTotalAmount = () => {
    const subtotalBeforeDiscount = getTotalPrice() + 
      (timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0) +
      (domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0)
    const subtotalAfterDiscount = subtotalBeforeDiscount - (calculatedDiscount || 0)
    const taxAmount = taxPercentage > 0 ? Math.round(subtotalAfterDiscount * (taxPercentage / 100)) : 0
    return subtotalAfterDiscount + taxAmount
  }

  const isHighValueOrder = () => {
    return getTotalAmount() > highValueOrderLimit
  }

  // Handle high-value order contact form submission
  const handleHighValueContact = async () => {
    if (!name.trim() || !email.trim() || !phoneNumber.trim()) {
      setError('Please fill in all required fields (Name, Email, Phone Number)')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setContactFormSubmitting(true)
    setError(null)

    try {
      const orderDetails = {
        items: items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          setupFee: item.setupFee,
          billingPeriod: item.billingPeriod,
        })),
      }

      const response = await fetch('/api/labs/web-services/high-value-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          orderDetails,
          totalAmount: getTotalAmount(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send contact request')
      }

      // Show success message in modal
      setError(null)
      setSuccessMessage('Thank you! Your request has been sent successfully. We will contact you shortly at ' + email.trim() + ' to discuss your order.')
      setShowSuccessModal(true)
      
      // Optionally clear the cart
      // clearCart()
    } catch (error: any) {
      console.error('Error sending contact request:', error)
      setError(error.message || 'Failed to send contact request. Please try again or contact us directly at hello@lashdiary.co.ke')
    } finally {
      setContactFormSubmitting(false)
    }
  }

  const getDisplayPrice = (price: number) => {
    if (currency === 'USD') {
      const usdPrice = convertCurrency(price, 'KES', 'USD', exchangeRates)
      return formatCurrency(usdPrice)
    }
    return formatCurrency(price)
  }

  const handleLogoTypeChange = (type: 'upload' | 'text' | 'custom') => {
    setLogoType(type)
    setError(null)
  }

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/labs/web-services/upload-logo', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (response.ok && data.url) {
        setLogoUrl(data.url)
        setError(null)
      } else {
        setError(data.error || 'Failed to upload logo. Please try again.')
        setLogoFile(null)
        setLogoUrl('')
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      setError('Failed to upload logo. Please try again.')
      setLogoFile(null)
      setLogoUrl('')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Helper function to check for missing required services
  const checkMissingRequiredServices = (): Array<{ id: string; name: string; price: number; setupFee?: number; category: string; billingPeriod?: 'one-time' | 'yearly' | 'monthly' }> => {
    if (items.length === 0 || allServices.length === 0) return []
    
    const cartItemIds = items.map(item => item.productId)
    const missingRequiredServices: Array<{ id: string; name: string; price: number; setupFee?: number; category: string; billingPeriod?: 'one-time' | 'yearly' | 'monthly' }> = []
    const seenServiceIds = new Set<string>()
    
    // Recursive function to check all required services (including nested requirements)
    const checkRequiredServices = (serviceId: string, visited: Set<string>) => {
      if (visited.has(serviceId)) return // Prevent infinite loops
      visited.add(serviceId)
      
      const service = allServices.find(s => s.id === serviceId)
      if (!service || !service.requiredServices) return
      
      for (const requiredId of service.requiredServices) {
        if (!cartItemIds.includes(requiredId)) {
          const requiredService = allServices.find(s => s.id === requiredId)
          if (requiredService && !seenServiceIds.has(requiredService.id)) {
            seenServiceIds.add(requiredService.id)
            missingRequiredServices.push({
              id: requiredService.id,
              name: requiredService.name,
              price: requiredService.price || 0,
              setupFee: requiredService.setupFee,
              category: requiredService.category,
              billingPeriod: requiredService.billingPeriod || 'one-time',
            })
          }
          // Recursively check if this required service itself has required services
          checkRequiredServices(requiredId, visited)
        } else {
          // If the required service is in cart, check if it has its own required services
          const requiredService = allServices.find(s => s.id === requiredId)
          if (requiredService) {
            checkRequiredServices(requiredId, visited)
          }
        }
      }
    }
    
    // Check all items in cart for required services
    for (const item of items) {
      const itemVisited = new Set<string>() // Separate visited set for each top-level item
      checkRequiredServices(item.productId, itemVisited)
    }
    
    return missingRequiredServices
  }

  const handleCheckout = async () => {
    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    // Check for required services first (before other validations)
    // Skip this check if user came from a guide page (must-haves and recommended are already added)
    if (!fromGuide) {
      const missingRequiredServices = checkMissingRequiredServices()
      if (missingRequiredServices.length > 0) {
        setError(`The following required services must be added to your cart before checkout: ${missingRequiredServices.map(s => s.name).join(', ')}. These services are required and cannot be purchased separately. If you'd like to discuss your options, please book a consultation at lashdiary.co.ke/labs/book-appointment.`)
        return
      }
    }

    // Calculate original cart total (before discount, includes setup fees for yearly services, priority fee, and domain pricing)
    // This is what must meet the minimum cart value requirement
    const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
    const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
    const originalCartTotal = getTotalPrice() + urgentPriorityFee + domainFee
    
    // Check minimum cart value using ORIGINAL total (before discount)
    // Discounts can bring it below minimum, but original must meet minimum
    if (originalCartTotal < minimumCartValue) {
      setError(`Minimum order value is ${formatCurrency(minimumCartValue)}. Your cart total is ${formatCurrency(originalCartTotal)}. Please add more items to your cart.`)
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }

    // Validate website info only if enabled
    if (enableBusinessInfo) {
      // Validate business name (only for business websites)
      if (websiteType === 'business' && !businessName.trim()) {
        setError('Please enter your business name')
        return
      }

      // Validate domain (for both types)
      if (domainType === 'new' && !domainName.trim()) {
        setError('Please enter your desired domain name')
        return
      }

      if (domainType === 'existing' && !existingDomain.trim()) {
        setError('Please enter your existing domain')
        return
      }

      // Validate logo (for both types)
      if (logoType === 'upload' && !logoUrl && !logoFile) {
        setError('Please upload your logo or select a different logo option')
        return
      }

      if (logoType === 'text' && !logoText.trim()) {
        setError('Please enter text for your logo')
        return
      }

      if (logoType === 'custom') {
        // Check if logo design service is in cart
        const hasLogoDesign = items.some(item => 
          item.name.toLowerCase().includes('logo') && 
          item.name.toLowerCase().includes('design')
        )
        if (!hasLogoDesign) {
          setError('Please add the Logo Design service to your cart if you want a custom logo')
          return
        }
      }

      // Validate colors (for both types)
      if (!primaryColor || !primaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        setError('Please select a valid primary color')
        return
      }
      if (!secondaryColor || !secondaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        setError('Please select a valid secondary color')
        return
      }

      // Validate business-specific information
      if (websiteType === 'business') {
        if (!businessDescription.trim() || businessDescription.trim().length < 50) {
          setError('Please provide a business description (at least 50 characters)')
          return
        }
        if (!businessAddress.trim()) {
          setError('Please enter your business address')
          return
        }
        if (!businessCity.trim()) {
          setError('Please enter your city')
          return
        }
        if (!businessCountry.trim()) {
          setError('Please enter your country')
          return
        }
        if (!servicesProducts.trim()) {
          setError('Please list your services or products')
          return
        }
      } else {
        // Validate personal website information
        if (!personalWebsiteAbout.trim() || personalWebsiteAbout.trim().length < 50) {
          setError('Please provide information about what your website is about (at least 50 characters)')
          return
        }
      }

      // Timeline is required for both types
      if (!timeline) {
        setError('Please select a timeline/deadline')
        return
      }
    }

    // Consultation date and time slot are required
    if (!consultationDate) {
      setError('Please select a date for your consultation call')
      return
    }

    if (!consultationTimeSlot) {
      setError('Please select a time for your consultation call')
      return
    }

    if (!consultationMeetingType) {
      setError('Please select a meeting type (Google Meet or Phone/WhatsApp Call)')
      return
    }

    setProcessing(true)
    setError(null)

    // Upload logo if needed and not already uploaded
    if (logoType === 'upload' && logoFile && !logoUrl) {
      await handleLogoUpload(logoFile)
      if (!logoUrl) {
        setProcessing(false)
        return // Error already set by handleLogoUpload
      }
    }

    try {
      const response = await fetch('/api/labs/web-services/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            billingPeriod: item.billingPeriod,
            setupFee: item.setupFee,
          })),
          websiteType: enableBusinessInfo ? websiteType : 'business', // Default to business if disabled
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          businessName: enableBusinessInfo && websiteType === 'business' ? businessName.trim() : undefined,
          domainType: enableBusinessInfo ? domainType : undefined,
          domainExtension: enableBusinessInfo && domainType === 'new' ? domainExtension : undefined,
          domainName: enableBusinessInfo && domainType === 'new' ? domainName.trim() : undefined,
          existingDomain: enableBusinessInfo && domainType === 'existing' ? existingDomain.trim() : undefined,
          logoType: enableBusinessInfo ? logoType : undefined,
          logoUrl: enableBusinessInfo && logoType === 'upload' ? logoUrl : undefined,
          logoText: enableBusinessInfo && logoType === 'text' ? logoText.trim() : undefined,
          primaryColor: enableBusinessInfo ? primaryColor : undefined,
          secondaryColor: enableBusinessInfo ? secondaryColor : undefined,
          businessDescription: enableBusinessInfo && websiteType === 'business' ? businessDescription.trim() : undefined,
          personalWebsiteAbout: enableBusinessInfo && websiteType === 'personal' ? personalWebsiteAbout.trim() : undefined,
          businessAddress: enableBusinessInfo && websiteType === 'business' ? businessAddress.trim() : undefined,
          businessCity: enableBusinessInfo && websiteType === 'business' ? businessCity.trim() : undefined,
          businessCountry: enableBusinessInfo && websiteType === 'business' ? businessCountry.trim() : undefined,
          businessHours: enableBusinessInfo && websiteType === 'business' ? businessHours : undefined,
          servicesProducts: enableBusinessInfo && websiteType === 'business' ? servicesProducts.trim() : undefined,
          socialMediaLinks: enableBusinessInfo ? socialMediaLinks : undefined,
          timeline: timeline || undefined,
          priorityFee: timeline === 'urgent' ? priorityFee : 0,
          referralCode: referralCode.trim() || undefined,
          consultationDate: consultationDate || undefined,
          consultationTimeSlot: consultationTimeSlot || undefined,
          consultationMeetingType: consultationMeetingType || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if error is related to referral code
        if (data.error && (data.error.toLowerCase().includes('referral') || data.error.toLowerCase().includes('code'))) {
          setCodeError(data.error)
          setCodeValid(false)
          setError(null) // Don't show general error for referral code issues
        } else {
          setError(data.error || 'Failed to process checkout')
        }
        setProcessing(false)
        return
      }

      setCheckoutData(data)

      // Convert payment amount based on selected currency
      const paymentAmount = currency === 'USD' 
        ? convertCurrency(data.initialPayment, 'KES', 'USD', exchangeRates)
        : data.initialPayment
      
      // Initialize Paystack payment
      const paymentResponse = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          amount: Math.round(paymentAmount * 100) / 100, // Round to 2 decimals for USD
          currency: currency,
          metadata: {
            payment_type: 'labs_web_services',
            order_id: data.orderId,
            items: data.items?.map((item: any) => item.name).join(', ') || 'Web services',
            original_amount_kes: data.initialPayment, // Store original KES amount
            payment_currency: currency,
          },
          customerName: name.trim() || email.split('@')[0],
          phone: phoneNumber || undefined,
        }),
      })

      const paymentData = await paymentResponse.json()

      if (paymentResponse.ok && paymentData.success && paymentData.reference) {
        let paystackPublicKey = ''
        try {
          const publicKeyResponse = await fetch('/api/paystack/public-key')
          const publicKeyData = await publicKeyResponse.json()
          if (publicKeyResponse.ok && publicKeyData.success && publicKeyData.publicKey) {
            paystackPublicKey = publicKeyData.publicKey
          } else {
            paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
          }
        } catch (error) {
          console.error('Error fetching public key:', error)
          paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
        }

        if (!paystackPublicKey) {
          setError('Payment gateway not configured. Please contact support.')
          setProcessing(false)
          return
        }

        setPaymentData({
          publicKey: paystackPublicKey,
          email: email,
          amount: paymentAmount,
          currency: currency,
          reference: paymentData.reference,
          customerName: email.split('@')[0],
          phone: phoneNumber || undefined,
          orderId: data.orderId,
        })

        setShowPaymentModal(true)
      } else {
        setError(paymentData.error || 'Failed to initialize payment. Please try again.')
        setProcessing(false)
      }
    } catch (error: any) {
      console.error('Error processing checkout:', error)
      setError('Failed to process checkout. Please try again.')
      setProcessing(false)
    }
  }

  // Only show empty cart page after mounting (client-side check of localStorage)
  // This prevents hydration mismatch where server renders empty but client has items
  if (mounted && items.length === 0) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-display text-brown-dark mb-4">Checkout</h1>
          <p className="text-brown-dark/70 text-lg mb-8">Your cart is empty</p>
          <Link
            href="/labs/custom-website-builds"
            className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Browse Services
          </Link>
        </div>
      </div>
    )
  }
  
  // Show loading state on server or before mount to prevent hydration glitch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-brown-dark/70">Loading checkout...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto">
        <Link
          href="/labs/custom-website-builds"
          className="inline-flex items-center mb-6 no-underline back-to-services-link"
          style={{ 
            backgroundColor: 'transparent', 
            padding: 0,
            border: 'none',
            boxShadow: 'none',
            color: 'var(--color-text)',
          }}
        >
          ← Back to Services
        </Link>
        <h1 className="text-4xl font-display text-brown-dark mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Order Summary</h2>
            {mounted && items.length > 0 && items
              .filter((item) => {
                // Hide domain service if user selected "I Have My Own Domain"
                if (domainType === 'existing' && item.category === 'domain') {
                  return false
                }
                return true
              })
              .map((item) => {
              const hasSetupFee = item.billingPeriod === 'yearly' && item.setupFee && item.setupFee > 0
              const totalFirstPayment = hasSetupFee 
                ? (item.setupFee! * item.quantity) + (item.price * item.quantity)
                : item.price * item.quantity
              
              return (
                <div
                  key={item.productId}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-brown-dark">{item.name}</h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeFromCart(item.productId)
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="text-red-600 hover:text-red-700 text-sm font-semibold px-2 py-1 hover:bg-red-50 rounded transition-colors z-10"
                          title="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-brown-dark/70">Quantity:</span>
                        <div className="flex items-center border border-brown-light rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-3 py-1 text-brown-dark hover:bg-brown-light/30 text-sm font-semibold"
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="px-4 py-1 text-brown-dark font-semibold text-sm min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-3 py-1 text-brown-dark hover:bg-brown-light/30 text-sm font-semibold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {hasSetupFee && (
                        <div className="mt-2">
                          <span className="text-sm font-semibold text-brown-dark">Total First Payment:</span>
                          <span className="ml-2 text-lg font-bold text-brown-dark">
                            {getDisplayPrice(totalFirstPayment)}
                          </span>
                        </div>
                      )}
                      {item.billingPeriod === 'yearly' && !hasSetupFee && (
                        <div className="mt-2">
                          <span className="text-sm font-semibold text-brown-dark">Annual Subscription:</span>
                          <span className="ml-2 text-lg font-bold text-brown-dark">
                            {getDisplayPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      )}
                      {item.billingPeriod === 'monthly' && (
                        <div className="mt-2">
                          <span className="text-sm font-semibold text-brown-dark">Monthly Subscription:</span>
                          <span className="ml-2 text-lg font-bold text-brown-dark">
                            {getDisplayPrice(item.price * item.quantity)}/month
                          </span>
                        </div>
                      )}
                    </div>
                    {!hasSetupFee && (
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-brown-dark">
                          {getDisplayPrice(item.price * item.quantity)}
                          {item.billingPeriod === 'monthly' && <span className="text-sm font-normal text-brown-dark/70">/month</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  {hasSetupFee && (
                    <div className="space-y-2 pt-3 border-t border-brown-light">
                      <div className="flex justify-between text-sm">
                        <span className="text-brown-dark/70">Setup Fee (One-time):</span>
                        <span className="font-semibold text-brown-dark">
                          {getDisplayPrice(item.setupFee! * item.quantity)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brown-dark/70">Annual Subscription:</span>
                        <span className="font-semibold text-brown-dark">
                          {getDisplayPrice(item.price * item.quantity)}
                        </span>
                      </div>
                      <p className="text-xs text-brown-dark/60 mt-2 italic">
                        * Annual subscription will be billed yearly by Paystack after the first payment.
                      </p>
                    </div>
                  )}
                  {item.billingPeriod === 'monthly' && (
                    <div className="space-y-2 pt-3 border-t border-brown-light">
                      <p className="text-xs text-brown-dark/60 italic">
                        * Monthly subscription will be billed monthly by Paystack. Payment reminders will be sent each month.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            {!mounted && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <p className="text-brown-dark/70">Loading cart items...</p>
              </div>
            )}
            {mounted && items.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <p className="text-brown-dark/70">Your cart is empty</p>
                <Link
                  href="/labs/custom-website-builds"
                  className="inline-block mt-4 bg-brown-dark hover:bg-brown text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Browse Services
                </Link>
              </div>
            )}
            
            {/* Priority Fee */}
            {mounted && timeline === 'urgent' && priorityFee > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-brown-dark">Priority Delivery</h3>
                    <p className="text-sm text-brown-dark/70">Less than 10 Days (Priority)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brown-dark">
                      {getDisplayPrice(priorityFee)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Add More Services Link */}
            {mounted && (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <Link
                  href="/labs/custom-website-builds"
                  className="inline-flex items-center gap-2 text-brown-dark hover:text-brown font-semibold transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add More Services
                </Link>
              </div>
            )}
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-8 sticky top-24" suppressHydrationWarning>
              <h2 className="text-2xl font-semibold text-brown-dark mb-6">Payment Details</h2>

              {/* Required Services Warning */}
              {/* Skip this warning if user came from a guide page */}
              {mounted && !fromGuide && (() => {
                // Double-check fromGuide status (check URL param and localStorage)
                if (typeof window !== 'undefined') {
                  const urlParams = new URLSearchParams(window.location.search)
                  const fromGuideParam = urlParams.get('fromGuide') === 'true'
                  const fromGuideStorage = localStorage.getItem('labs-checkout-from-guide') === 'true'
                  if (fromGuideParam || fromGuideStorage) {
                    return null
                  }
                }
                
                const missingRequiredServices = checkMissingRequiredServices()
                if (missingRequiredServices.length === 0) return null
                
                const handleAddRequiredService = (service: { id: string; name: string; price: number; setupFee?: number; category: string; billingPeriod?: 'one-time' | 'yearly' | 'monthly' }) => {
                  // Remove if exists first to reset quantity to 1
                  removeFromCart(service.id)
                  // Add fresh with quantity 1
                  addToCart({
                    productId: service.id,
                    name: service.name,
                    price: service.price,
                    setupFee: service.setupFee || 0,
                    category: service.category,
                    billingPeriod: service.billingPeriod || 'one-time',
                  })
                }
                
                return (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg" suppressHydrationWarning>
                    <p className="text-sm font-semibold text-red-800 mb-2">
                      ⚠️ Required Services Missing
                    </p>
                    <p className="text-xs text-red-700 mb-2">
                      The following services must be added to your cart before checkout:
                    </p>
                    <ul className="list-none text-xs text-red-700 mb-2 space-y-2">
                      {missingRequiredServices.map((service) => (
                        <li key={service.id} className="flex items-center justify-between gap-3">
                          <span className="flex-1">{service.name}</span>
                          <button
                            onClick={() => handleAddRequiredService(service)}
                            className="px-3 py-1 bg-red-700 text-white rounded hover:bg-red-800 transition-colors text-xs font-semibold whitespace-nowrap"
                            type="button"
                          >
                            Add to Cart
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-700">
                      These services are required and cannot be purchased separately. If you'd like to discuss your options, please{' '}
                      <span className="text-red-900 underline font-semibold hover:text-red-950 cursor-pointer" onClick={() => window.location.href = '/labs/book-appointment'}>
                        book a consultation
                      </span>
                      {' '}so we can determine the best way forward for your needs.
                    </p>
                  </div>
                )
              })()}

              {/* Minimum Cart Value Warning */}
              {mounted && (() => {
                // Check original cart total (before discount, including priority fee and domain pricing) against minimum
                // Show warning only if original total is below minimum (not if discount brought it below)
                const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
                const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
                const originalCartTotal = getTotalPrice() + urgentPriorityFee + domainFee
                const isBelowMinimum = originalCartTotal < minimumCartValue
                return isBelowMinimum ? (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      ⚠️ Minimum Order Required
                    </p>
                    <p className="text-xs text-red-700">
                      Your cart total is {formatCurrency(originalCartTotal)}. Minimum order value is {formatCurrency(minimumCartValue)}. Please add more items to proceed. Note: After applying a discount code, your final total may be below the minimum, which is allowed.
                    </p>
                  </div>
                ) : null
              })()}

              {checkoutData && (
                <div className="space-y-5 mb-6">
                  {/* Domain Pricing */}
                  {checkoutData.domainPricing && domainType === 'new' && (
                    <div className="bg-white border-2 border-brown-light rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-semibold text-brown-dark mb-3">Your Own Website Domain</h3>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-brown-dark/70">Setup Fee (One-time):</span>
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(checkoutData.domainPricing.setupFee)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-brown-dark/70">Annual Subscription:</span>
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(checkoutData.domainPricing.annualPrice)}
                            <span className="text-xs text-brown-dark/60 ml-1">
                              per year ({getDisplayPrice(Math.round(checkoutData.domainPricing.annualPrice / 12))}/month)
                            </span>
                          </span>
                        </div>
                        <div className="border-t border-brown-light pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-semibold text-brown-dark">Total First Payment:</span>
                            <span className="font-bold text-brown-dark text-lg">
                              {getDisplayPrice(checkoutData.domainPricing.totalFirstPayment)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-brown-dark/60 italic">
                        Your unique web address (e.g. {domainName || 'yourbusiness'}{domainExtension || '.co.ke'}) that people type to find you online.
                      </p>
                    </div>
                  )}
                  
                  {checkoutData.setupFeesTotal && checkoutData.setupFeesTotal > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-brown-dark/70">Setup Fees (One-time)</span>
                        <div className="text-right">
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(checkoutData.setupFeesTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> Annual subscriptions will be billed yearly by Paystack after this first payment.
                        </p>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-brown-dark/70">Subtotal</span>
                    <div className="text-right">
                      <span className="font-semibold text-brown-dark">
                        {getDisplayPrice(checkoutData.subtotal)}
                      </span>
                    </div>
                  </div>

                  {checkoutData.referralDiscount && checkoutData.referralDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="text-sm">
                        Discount {checkoutData.appliedReferralCode && `(${checkoutData.appliedReferralCode})`}
                      </span>
                      <span className="font-semibold text-sm">
                        -{getDisplayPrice(checkoutData.referralDiscount)}
                      </span>
                    </div>
                  )}

                  {checkoutData.taxAmount && checkoutData.taxAmount > 0 && checkoutData.taxPercentage && (
                    <div className="flex justify-between">
                      <span className="text-brown-dark/70">
                        VAT/Tax ({checkoutData.taxPercentage}%)
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-brown-dark">
                          {getDisplayPrice(checkoutData.taxAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {checkoutData.remainingPayment > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Payment Plan:</strong>
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Initial Payment (Now):</span>
                          <div className="text-right">
                            <span className="font-semibold">
                              {getDisplayPrice(checkoutData.initialPayment)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining Balance:</span>
                          <div className="text-right">
                            <span className="font-semibold">
                              {getDisplayPrice(checkoutData.remainingPayment)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-blue-700 mt-2">
                          The remaining balance will be due before we send you your website details.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-brown-light pt-4">
                    <div className="flex justify-between text-lg mb-2">
                      <span className="font-semibold text-brown-dark">
                        {checkoutData.remainingPayment > 0 ? 'Pay Now' : 'Total'}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-brown-dark text-xl">
                          {getDisplayPrice(checkoutData.initialPayment)}
                        </span>
                      </div>
                    </div>
                    {checkoutData.setupFeesTotal && checkoutData.setupFeesTotal > 0 && (
                      <p className="text-xs text-brown-dark/60 italic mt-2">
                        This includes setup fees and first year subscription. Annual renewals will be billed automatically by Paystack.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!checkoutData && mounted && (
                <div className="space-y-5 mb-6">
                  {timeline === 'urgent' && priorityFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-brown-dark/70">Priority Fee</span>
                      <div className="text-right">
                        <span className="font-semibold text-brown-dark">
                          {getDisplayPrice(priorityFee)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-brown-dark/70">Subtotal</span>
                    <div className="text-right">
                      <span className="font-semibold text-brown-dark">
                        {getDisplayPrice(
                          getTotalPrice() + 
                          (timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0) +
                          (domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0)
                        )}
                      </span>
                    </div>
                  </div>
                  {codeValid === true && calculatedDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="text-sm">
                        Discount {referralCode && `(${referralCode})`}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-sm">
                          -{getDisplayPrice(calculatedDiscount)}
                        </span>
                      </div>
                    </div>
                  )}
                  {(() => {
                    // Show tax immediately if taxPercentage is available (from cache or API)
                    const subtotalBeforeDiscount = getTotalPrice() + 
                      (timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0) +
                      (domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0)
                    const subtotalAfterDiscount = subtotalBeforeDiscount - (calculatedDiscount || 0)
                    const taxAmount = taxPercentage > 0 ? Math.round(subtotalAfterDiscount * (taxPercentage / 100)) : 0
                    
                    if (taxPercentage > 0 && taxAmount > 0) {
                      return (
                        <div className="flex justify-between">
                          <span className="text-brown-dark/70">
                            VAT/Tax ({taxPercentage}%)
                          </span>
                          <div className="text-right">
                            <span className="font-semibold text-brown-dark">
                              {getDisplayPrice(taxAmount)}
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                    <div className="flex justify-between text-lg font-semibold border-t border-brown-dark pt-3">
                      <span className="text-brown-dark">Total</span>
                      <div className="text-right">
                        <span className="font-bold text-brown-dark">
                        {(() => {
                          const subtotalBeforeDiscount = getTotalPrice() + 
                            (timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0) +
                            (domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0)
                          const subtotalAfterDiscount = subtotalBeforeDiscount - (calculatedDiscount || 0)
                          const taxAmount = taxPercentage > 0 ? Math.round(subtotalAfterDiscount * (taxPercentage / 100)) : 0
                          return getDisplayPrice(subtotalAfterDiscount + taxAmount)
                        })()}
                        </span>
                      </div>
                    </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* High-Value Order Notice */}
              {isHighValueOrder() && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    💼 High-Value Order Detected
                  </p>
                  <p className="text-sm text-blue-800 mb-3">
                    Your order total is above {getDisplayPrice(highValueOrderLimit)}. For orders of this size, we'd like to provide you with personalized service. Please fill in your details below and we'll contact you directly to discuss your requirements and provide a customized quote.
                  </p>
                  <p className="text-xs text-blue-700">
                    We'll review your order and get back to you within 24 hours via email or phone call.
                  </p>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="254712345678"
                    className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Discount Code Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Discount Code <span className="text-sm text-brown-dark/60">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase())
                      setCodeValid(null)
                      setCodeError(null)
                      setCalculatedDiscount(0)
                    }}
                    placeholder="Enter discount code"
                    disabled={codeValid === true}
                    className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none disabled:bg-brown-light/30 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!referralCode.trim()) {
                        setCodeError('Please enter a referral code')
                        return
                      }
                      
                      // Check minimum cart value BEFORE applying discount
                      // The cart must meet minimum before discount can be applied
                      // Include priority fee and domain pricing if applicable (they're part of original total before discount)
                      const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
                      const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
                      const originalCartTotal = getTotalPrice() + urgentPriorityFee + domainFee
                      if (originalCartTotal < minimumCartValue) {
                        setCodeError(`Your cart total (${formatCurrency(originalCartTotal)}) must meet the minimum order value (${formatCurrency(minimumCartValue)}) before applying a discount code. Please add more items to your cart first.`)
                        setCodeValid(false)
                        return
                      }
                      
                      setValidatingCode(true)
                      setCodeError(null)
                      setCodeValid(null)
                      setCalculatedDiscount(0)
                      try {
                        // Calculate original cart total (including priority fee and domain pricing) for validation
                        const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
                        const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
                        const originalTotal = getTotalPrice() + urgentPriorityFee + domainFee
                        
                        // Validate discount code using new discount code API
                        const validateUrl = new URL('/api/labs/web-services/validate-discount', window.location.origin)
                        validateUrl.searchParams.set('code', referralCode.trim().toUpperCase())
                        validateUrl.searchParams.set('email', email || '')
                        validateUrl.searchParams.set('cartTotal', originalTotal.toString())
                        
                        const response = await fetch(validateUrl.toString())
                        const data = await response.json()
                        
                        if (data.valid) {
                          setCodeValid(true)
                          setCodeError(null)
                          // Use the discount amount calculated by the API
                          setCalculatedDiscount(data.discountAmount || 0)
                        } else {
                          setCodeValid(false)
                          setCodeError(data.error || 'Invalid discount code')
                          setCalculatedDiscount(0)
                        }
                      } catch (error) {
                        setCodeValid(false)
                        setCodeError('Failed to validate code. Please try again.')
                        setCalculatedDiscount(0)
                      } finally {
                        setValidatingCode(false)
                      }
                    }}
                    disabled={validatingCode || !referralCode.trim() || codeValid === true}
                    className="px-4 py-2 bg-brown-light hover:bg-brown text-brown-dark font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {validatingCode ? 'Checking...' : codeValid === true ? 'Applied' : 'Apply'}
                  </button>
                  {codeValid === true && (
                    <button
                      type="button"
                      onClick={() => {
                        setReferralCode('')
                        setCodeValid(null)
                        setCodeError(null)
                        setCalculatedDiscount(0)
                      }}
                      className="px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                      title="Remove code"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {codeValid === true && (
                  <p className="text-sm text-green-600 mt-2">✓ Discount code applied successfully! Your discount will be applied at checkout.</p>
                )}
                {codeError && (
                  <p className="text-sm text-red-600 mt-2">{codeError}</p>
                )}
              </div>

              {/* Website Type Selection - Hidden for high-value orders */}
              {!isHighValueOrder() && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-brown-dark mb-3">
                  Website Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    websiteType === 'business' 
                      ? 'border-brown-dark bg-brown-light/30' 
                      : 'border-brown-light hover:border-brown-dark/50'
                  }`}>
                    <input
                      type="radio"
                      name="websiteType"
                      value="business"
                      checked={websiteType === 'business'}
                      onChange={(e) => setWebsiteType('business')}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-brown-dark mb-1">Business</span>
                    <span className="text-xs text-brown-dark/70 text-center">For businesses and organizations</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    websiteType === 'personal' 
                      ? 'border-brown-dark bg-brown-light/30' 
                      : 'border-brown-light hover:border-brown-dark/50'
                  }`}>
                    <input
                      type="radio"
                      name="websiteType"
                      value="personal"
                      checked={websiteType === 'personal'}
                      onChange={(e) => setWebsiteType('personal')}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-brown-dark mb-1">Personal</span>
                    <span className="text-xs text-brown-dark/70 text-center">For personal use or portfolios</span>
                  </label>
                </div>
              </div>
              )}

              {/* Business Details Section - Hidden for high-value orders */}
              {!isHighValueOrder() && enableBusinessInfo && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-brown-dark mb-4">
                  {websiteType === 'business' ? 'Business Information' : 'Website Information'}
                </h3>
                
                <div className="space-y-4 mb-6">
                  {/* Business Name - Only for business websites */}
                  {websiteType === 'business' && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your Business Name"
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    />
                  </div>
                  )}

                  {/* Domain Selection */}
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Domain <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="domainType"
                            value="new"
                            checked={domainType === 'new'}
                            onChange={(e) => setDomainType('new')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">New Domain</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="domainType"
                            value="existing"
                            checked={domainType === 'existing'}
                            onChange={(e) => setDomainType('existing')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">I Have My Own Domain</span>
                        </label>
                      </div>

                      {domainType === 'new' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={domainName}
                            onChange={(e) => setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="yourbusiness"
                            className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                          />
                          <select
                            value={domainExtension}
                            onChange={(e) => setDomainExtension(e.target.value)}
                            className="rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                          >
                            <option value=".co.ke">.co.ke</option>
                            <option value=".com">.com</option>
                            <option value=".org">.org</option>
                            <option value=".net">.net</option>
                            <option value=".info">.info</option>
                            <option value=".ke">.ke</option>
                          </select>
                          <div className="flex items-center px-3 text-sm text-brown-dark/70">
                            {domainName && domainExtension && (
                              <span>{domainName}{domainExtension}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={existingDomain}
                          onChange={(e) => setExistingDomain(e.target.value)}
                          placeholder="example.com"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Logo Options */}
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Logo <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="logoType"
                            value="upload"
                            checked={logoType === 'upload'}
                            onChange={(e) => handleLogoTypeChange('upload')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">I Have My Own Logo</span>
                        </label>
                        {logoType === 'upload' && (
                          <div className="ml-6 space-y-2">
                            <input
                              type="file"
                              accept=".png,.pdf,image/png,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  // Validate file type
                                  const validTypes = ['image/png', 'application/pdf']
                                  const validExtensions = ['.png', '.pdf']
                                  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
                                  
                                  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                                    setError('Please upload a PNG or PDF file')
                                    return
                                  }
                                  
                                  setLogoFile(file)
                                  handleLogoUpload(file)
                                }
                              }}
                              className="text-sm text-brown-dark"
                              disabled={uploadingLogo}
                            />
                            <p className="text-xs text-brown-dark/70 mt-1">Accepted formats: PNG or PDF</p>
                            {uploadingLogo && (
                              <p className="text-xs text-brown-dark/70">Uploading...</p>
                            )}
                            {logoUrl && (
                              <div className="mt-2">
                                <img src={logoUrl} alt="Logo preview" className="max-h-20 max-w-32 object-contain" />
                                <p className="text-xs text-green-600 mt-1">✓ Logo uploaded successfully</p>
                              </div>
                            )}
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="logoType"
                            value="text"
                            checked={logoType === 'text'}
                            onChange={(e) => handleLogoTypeChange('text')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">Text Logo (Free)</span>
                        </label>
                        {logoType === 'text' && (
                          <div className="ml-6">
                            <input
                              type="text"
                              value={logoText}
                              onChange={(e) => setLogoText(e.target.value)}
                              placeholder={websiteType === 'business' ? (businessName || "Your Business Name") : (name || "Your Name")}
                              className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                            />
                            <p className="text-xs text-brown-dark/70 mt-1">This will be displayed as text on your website</p>
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="logoType"
                            value="custom"
                            checked={logoType === 'custom'}
                            onChange={(e) => handleLogoTypeChange('custom')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">Custom Logo Design (Extra Fee)</span>
                        </label>
                            {logoType === 'custom' && mounted && (
                          <div className="ml-6">
                            {showLogoDesignSuggestion ? (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800 mb-2">
                                  <strong>Logo Design Service Required</strong>
                                </p>
                                <p className="text-xs text-blue-700 mb-3">
                                  To get a custom logo designed, please add the "Logo Design" service to your cart first.
                                </p>
                                <Link
                                  href="/labs/custom-website-builds"
                                  className="inline-block text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                                >
                                  Add Logo Design Service
                                </Link>
                              </div>
                            ) : (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700">
                                  ✓ Logo Design service has been added to your cart
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Color Options */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Website Colors <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-4">
                      Choose the primary and secondary colors for your website theme
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-brown-dark mb-2">
                          Primary Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-12 w-20 rounded-lg border-2 border-brown-light cursor-pointer"
                          />
                          <input
                            type="text"
                            value={primaryColor}
                            onChange={(e) => {
                              const value = e.target.value
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                setPrimaryColor(value.length === 7 ? value : value.padEnd(7, '0'))
                              }
                            }}
                            placeholder="#7C4B31"
                            className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark mb-2">
                          Secondary Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="h-12 w-20 rounded-lg border-2 border-brown-light cursor-pointer"
                          />
                          <input
                            type="text"
                            value={secondaryColor}
                            onChange={(e) => {
                              const value = e.target.value
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                setSecondaryColor(value.length === 7 ? value : value.padEnd(7, '0'))
                              }
                            }}
                            placeholder="#F3E6DC"
                            className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border-2 border-brown-light"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <span className="text-xs text-brown-dark/70">Primary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border-2 border-brown-light"
                          style={{ backgroundColor: secondaryColor }}
                        />
                        <span className="text-xs text-brown-dark/70">Secondary</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Description - For business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Description <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-2">
                      Tell us about your business. This will be used for your About page and homepage.
                    </p>
                    <textarea
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="Describe your business, what you do, your mission, and what makes you unique..."
                      rows={5}
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none resize-y"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">
                      {businessDescription.length} characters (recommended: 200-500 characters)
                    </p>
                  </div>
                  )}

                  {/* Personal Website About - For personal websites */}
                  {websiteType === 'personal' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      What is the website about? <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-2">
                      Tell us about your website. This will be used for your About page and homepage.
                    </p>
                    <textarea
                      value={personalWebsiteAbout}
                      onChange={(e) => setPersonalWebsiteAbout(e.target.value)}
                      placeholder="Describe what your website is about, your interests, projects, or what you want to share..."
                      rows={5}
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none resize-y"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">
                      {personalWebsiteAbout.length} characters (recommended: 200-500 characters)
                    </p>
                  </div>
                  )}

                  {/* Business Address - Only for business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Address <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="Street Address"
                        required
                        className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={businessCity}
                          onChange={(e) => setBusinessCity(e.target.value)}
                          placeholder="City"
                          required
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                        <input
                          type="text"
                          value={businessCountry}
                          onChange={(e) => setBusinessCountry(e.target.value)}
                          placeholder="Country"
                          required
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Business Hours - Only for business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Hours <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-3">
                      Set your operating hours for each day of the week
                    </p>
                    <div className="space-y-2">
                      {businessHours.map((day, index) => (
                        <div key={day.day} className="flex items-center gap-3 p-2 bg-brown-light/20 rounded-lg">
                          <div className="w-24 text-sm font-medium text-brown-dark">
                            {day.day}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!day.closed}
                              onChange={(e) => {
                                const updated = [...businessHours]
                                updated[index].closed = !e.target.checked
                                setBusinessHours(updated)
                              }}
                              className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                            />
                            <span className="text-xs text-brown-dark/70">Open</span>
                          </label>
                          {!day.closed && (
                            <>
                              <input
                                type="time"
                                value={day.open}
                                onChange={(e) => {
                                  const updated = [...businessHours]
                                  updated[index].open = e.target.value
                                  setBusinessHours(updated)
                                }}
                                className="flex-1 rounded-lg border-2 border-brown-light bg-white px-2 py-1 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                              />
                              <span className="text-brown-dark/70">to</span>
                              <input
                                type="time"
                                value={day.close}
                                onChange={(e) => {
                                  const updated = [...businessHours]
                                  updated[index].close = e.target.value
                                  setBusinessHours(updated)
                                }}
                                className="flex-1 rounded-lg border-2 border-brown-light bg-white px-2 py-1 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                              />
                            </>
                          )}
                          {day.closed && (
                            <span className="text-sm text-brown-dark/60 italic">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Services/Products List - Only for business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Services/Products <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-2">
                      List the services or products you offer. One per line or separated by commas.
                    </p>
                    <textarea
                      value={servicesProducts}
                      onChange={(e) => setServicesProducts(e.target.value)}
                      placeholder="Service 1&#10;Service 2&#10;Service 3&#10;Or: Service 1, Service 2, Service 3"
                      rows={4}
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none resize-y"
                    />
                  </div>
                  )}

                  {/* Social Media Links */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Social Media Links
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-3">
                      Add your social media profiles (optional but recommended)
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          Facebook
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.facebook}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, facebook: e.target.value })}
                          placeholder="https://facebook.com/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          Instagram
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.instagram}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, instagram: e.target.value })}
                          placeholder="https://instagram.com/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          Twitter/X
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.twitter}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, twitter: e.target.value })}
                          placeholder="https://twitter.com/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          LinkedIn
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.linkedin}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/company/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          YouTube
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.youtube}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, youtube: e.target.value })}
                          placeholder="https://youtube.com/@yourchannel"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          TikTok
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.tiktok}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, tiktok: e.target.value })}
                          placeholder="https://tiktok.com/@yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeline/Deadline */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Timeline/Deadline <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-3">
                      When do you need your website completed?
                    </p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border-2 border-brown-light rounded-lg cursor-pointer hover:border-brown-dark transition-colors">
                        <input
                          type="radio"
                          name="timeline"
                          value="21"
                          checked={timeline === '21'}
                          onChange={(e) => setTimeline('21')}
                          className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-brown-dark">21 Days (Standard)</span>
                          <p className="text-xs text-brown-dark/70">Standard delivery time</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border-2 border-brown-light rounded-lg cursor-pointer hover:border-brown-dark transition-colors">
                        <input
                          type="radio"
                          name="timeline"
                          value="10"
                          checked={timeline === '10'}
                          onChange={(e) => setTimeline('10')}
                          className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-brown-dark">10 Days (Fast Track)</span>
                          <p className="text-xs text-brown-dark/70">Faster delivery</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border-2 border-brown-light rounded-lg cursor-pointer hover:border-brown-dark transition-colors">
                        <input
                          type="radio"
                          name="timeline"
                          value="urgent"
                          checked={timeline === 'urgent'}
                          onChange={(e) => setTimeline('urgent')}
                          className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-brown-dark">Less than 10 Days (Priority)</span>
                          <p className="text-xs text-brown-dark/70">Urgent delivery</p>
                        </div>
                      </label>
                      {timeline === 'urgent' && (
                        <div className="ml-7 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Priority Fee:</strong> Highly prioritized websites require an additional fee of{' '}
                            <strong>{formatCurrency(priorityFee)}</strong> to ensure fast delivery.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consultation Call Scheduling */}
                  <div className="mt-6">
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                      Consultation Call <span className="text-red-500">*</span>
                  </label>
                    <p className="text-xs text-brown-dark/70 mb-4">
                      Select a convenient day and time for us to discuss your website requirements and go through everything that may not have been mentioned in the checkout. The meeting can be a scheduled Google Meet call or a normal phone call/WhatsApp call.
                    </p>
                    
                    {/* Calendar Picker */}
                    <div className="mb-4">
                      <Suspense fallback={
                        <div className="w-full bg-white rounded-lg border-2 border-brown-light p-6 text-center">
                          <div className="text-brown-dark">Loading calendar...</div>
                        </div>
                      }>
                        <CalendarPicker
                          selectedDate={consultationDate}
                          onDateSelect={(date) => {
                            setConsultationDate(date)
                            setConsultationTimeSlot('') // Clear time when date changes
                            setConsultationMeetingType('') // Clear meeting type when date changes
                          }}
                          availableDates={availableDates}
                          fullyBookedDates={fullyBookedDates}
                          loading={loadingDates}
                          minimumBookingDate={minimumBookingDate || undefined}
                          availabilityData={availabilityData}
                        />
                      </Suspense>
                </div>

                    {/* Time Slot Selection */}
                    {consultationDate && (
                      <div className="mt-4">
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                          Select Time <span className="text-red-500">*</span>
                  </label>
                        {loadingSlots ? (
                          <div className="w-full bg-white rounded-lg border-2 border-brown-light p-4 text-center">
                            <div className="text-brown-dark text-sm">Loading available times...</div>
                </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="w-full bg-red-50 rounded-lg border-2 border-red-200 p-4">
                            <p className="text-red-800 text-sm font-medium">
                              ⚠️ No time slots available for this date. Please select another date.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {timeSlots.map((slot) => {
                              const isSelected = consultationTimeSlot === slot.value
                              return (
                                <button
                                  key={slot.value}
                                  type="button"
                                  onClick={() => setConsultationTimeSlot(slot.value)}
                                  className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                                    isSelected
                                      ? 'border-brown-dark bg-brown-dark/90 ring-2 ring-brown-dark ring-offset-2'
                                      : 'border-brown-light hover:border-brown-dark hover:bg-brown-light/20 bg-white'
                                  }`}
                                  style={{
                                    backgroundColor: isSelected ? '#733D26' : '#ffffff',
                                    color: isSelected ? '#ffffff' : '#733D26',
                                  }}
                                >
                                  {slot.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {consultationDate && timeSlots.length > 0 && consultationTimeSlot && (
                          <p className="text-xs text-green-600 mt-2 font-medium">
                            ✓ Selected: {new Date(consultationDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {timeSlots.find(s => s.value === consultationTimeSlot)?.label || consultationTimeSlot}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Meeting Type Selection */}
                    {consultationDate && consultationTimeSlot && (
                      <div className="mt-4">
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                          Meeting Type <span className="text-red-500">*</span>
                  </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setConsultationMeetingType('online')}
                            className={`p-4 rounded-lg border-2 font-medium text-sm transition-all text-left ${
                              consultationMeetingType === 'online'
                                ? 'border-brown-dark bg-brown-dark/90 ring-2 ring-brown-dark ring-offset-2 text-white'
                                : 'border-brown-light hover:border-brown-dark hover:bg-brown-light/20 bg-white text-brown-dark'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="font-semibold">Google Meet</span>
                </div>
                            <p className="text-xs opacity-80">
                              Video call via Google Meet
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConsultationMeetingType('phone')}
                            className={`p-4 rounded-lg border-2 font-medium text-sm transition-all text-left ${
                              consultationMeetingType === 'phone'
                                ? 'border-brown-dark bg-brown-dark/90 ring-2 ring-brown-dark ring-offset-2 text-white'
                                : 'border-brown-light hover:border-brown-dark hover:bg-brown-light/20 bg-white text-brown-dark'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="font-semibold">Phone/WhatsApp Call</span>
              </div>
                            <p className="text-xs opacity-80">
                              Audio call via phone or WhatsApp
                            </p>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Submit Button */}
              {isHighValueOrder() ? (
                <button
                  onClick={handleHighValueContact}
                  disabled={contactFormSubmitting || !name.trim() || !email.trim() || !phoneNumber.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {contactFormSubmitting ? 'Sending...' : 'Send Mail'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCheckout}
                    disabled={processing || !name.trim() || !email.trim() || !phoneNumber.trim() || (!fromGuide && checkMissingRequiredServices().length > 0) || !timeline || !consultationDate || !consultationTimeSlot || !consultationMeetingType}
                    className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Processing...' : checkoutData ? 'Proceed to Payment' : 'Calculate Payment'}
                  </button>
                  {!fromGuide && checkMissingRequiredServices().length > 0 && (
                    <p className="text-xs text-red-600 mt-2 text-center">
                      Please add all required services to your cart before proceeding.
                    </p>
                  )}
                </>
              )}

              <Link
                href="/labs/custom-website-builds"
                className="block text-center text-brown-dark/70 hover:text-brown-dark mt-4 text-sm"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center px-4 py-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowSuccessModal(false)
                clearCart()
                router.push('/labs/custom-website-builds')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Sent Successfully</h3>
              <p className="text-sm text-gray-600 mb-6">
                {successMessage}
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  clearCart()
                  router.push('/labs/custom-website-builds')
                }}
                className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paystack Inline Payment Modal */}
      {showPaymentModal && paymentData && (
        <PaystackInlinePayment
          publicKey={paymentData.publicKey}
          email={paymentData.email}
          amount={paymentData.amount}
          currency={paymentData.currency}
          reference={paymentData.reference}
          customerName={paymentData.customerName}
          phone={paymentData.phone}
          metadata={{
            payment_type: 'labs_web_services',
            order_id: paymentData.orderId,
          }}
          onSuccess={async (reference) => {
            setShowPaymentModal(false)
            setProcessing(true)

            try {
              const verifyResponse = await fetch(`/api/paystack/verify?reference=${reference}`)
              const verifyData = await verifyResponse.json()

              if (verifyResponse.ok && verifyData.success) {
                clearCart()
                router.push(`/payment/success?reference=${reference}&payment_type=labs_web_services&amount=${paymentData.amount}&currency=KES`)
              } else {
                setError(verifyData.error || 'Payment verification failed. Please contact support.')
                setProcessing(false)
              }
            } catch (error) {
              console.error('Error verifying payment:', error)
              setError('Error verifying payment. Please contact support.')
              setProcessing(false)
            }
          }}
          onClose={() => {
            setShowPaymentModal(false)
            setPaymentData(null)
            setProcessing(false)
          }}
        />
      )}
    </div>
  )
}

function LabsCheckoutContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown text-xl">Loading checkout...</div>
      </div>
    }>
      <LabsCheckoutContentInner />
    </Suspense>
  )
}

export default function LabsCheckout() {
  return <LabsCheckoutContent />
}



