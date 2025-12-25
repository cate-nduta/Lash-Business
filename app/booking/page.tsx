'use client'

import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useInView } from 'react-intersection-observer'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { Currency, formatCurrency as formatCurrencyUtil, convertCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency-utils'
import { useServiceCart } from '@/contexts/ServiceCartContext'

// Lazy load CalendarPicker for faster initial page load
const CalendarPicker = lazy(() => import('@/components/CalendarPicker'))

export const dynamic = 'force-dynamic'

interface TimeSlot {
  value: string
  label: string
}

interface AvailableDate {
  value: string
  label: string
}

interface ServiceOption {
  id: string
  name: string
  price: number // KES price
  priceUSD?: number // USD price
  duration: number
  categoryId: string
  categoryName: string
}

interface ServiceOptionGroup {
  categoryId: string
  categoryName: string
  options: ServiceOption[]
}


// Service price and duration mappings will be loaded from API

const PHONE_COUNTRY_CODES = [
  { code: 'KE', dialCode: '+254', label: 'Kenya (+254)' },
  { code: 'US', dialCode: '+1', label: 'United States (+1)' },
  { code: 'CA', dialCode: '+1', label: 'Canada (+1)' },
  { code: 'GB', dialCode: '+44', label: 'United Kingdom (+44)' },
  { code: 'AU', dialCode: '+61', label: 'Australia (+61)' },
  { code: 'NZ', dialCode: '+64', label: 'New Zealand (+64)' },
  { code: 'ZA', dialCode: '+27', label: 'South Africa (+27)' },
  { code: 'NG', dialCode: '+234', label: 'Nigeria (+234)' },
  { code: 'UG', dialCode: '+256', label: 'Uganda (+256)' },
  { code: 'TZ', dialCode: '+255', label: 'Tanzania (+255)' },
  { code: 'RW', dialCode: '+250', label: 'Rwanda (+250)' },
  { code: 'ET', dialCode: '+251', label: 'Ethiopia (+251)' },
  { code: 'IN', dialCode: '+91', label: 'India (+91)' },
  { code: 'CN', dialCode: '+86', label: 'China (+86)' },
  { code: 'JP', dialCode: '+81', label: 'Japan (+81)' },
  { code: 'AE', dialCode: '+971', label: 'United Arab Emirates (+971)' },
  { code: 'DE', dialCode: '+49', label: 'Germany (+49)' },
  { code: 'FR', dialCode: '+33', label: 'France (+33)' },
  { code: 'ES', dialCode: '+34', label: 'Spain (+34)' },
  { code: 'IT', dialCode: '+39', label: 'Italy (+39)' },
  { code: 'SE', dialCode: '+46', label: 'Sweden (+46)' },
  { code: 'NO', dialCode: '+47', label: 'Norway (+47)' },
  { code: 'FI', dialCode: '+358', label: 'Finland (+358)' },
  { code: 'IE', dialCode: '+353', label: 'Ireland (+353)' },
  { code: 'SG', dialCode: '+65', label: 'Singapore (+65)' },
  { code: 'MY', dialCode: '+60', label: 'Malaysia (+60)' },
  { code: 'HK', dialCode: '+852', label: 'Hong Kong (+852)' },
  { code: 'SA', dialCode: '+966', label: 'Saudi Arabia (+966)' },
  { code: 'GH', dialCode: '+233', label: 'Ghana (+233)' },
  { code: 'ZM', dialCode: '+260', label: 'Zambia (+260)' },
  { code: 'ZW', dialCode: '+263', label: 'Zimbabwe (+263)' },
  { code: 'BW', dialCode: '+267', label: 'Botswana (+267)' },
  { code: 'MW', dialCode: '+265', label: 'Malawi (+265)' },
  { code: 'CM', dialCode: '+237', label: 'Cameroon (+237)' },
  { code: 'SN', dialCode: '+221', label: 'Senegal (+221)' },
  { code: 'BR', dialCode: '+55', label: 'Brazil (+55)' },
  { code: 'AR', dialCode: '+54', label: 'Argentina (+54)' },
  { code: 'MX', dialCode: '+52', label: 'Mexico (+52)' },
  { code: 'JM', dialCode: '+1876', label: 'Jamaica (+1 876)' },
  { code: 'BB', dialCode: '+1246', label: 'Barbados (+1 246)' },
  { code: 'TT', dialCode: '+1868', label: 'Trinidad & Tobago (+1 868)' },
]

function isFillService(serviceName: string, categoryMap: Record<string, { id: string; name: string }>) {
  if (!serviceName) return false
  const entry = categoryMap[serviceName]
  if (entry) {
    const normalizedId = entry.id?.toLowerCase() ?? ''
    const normalizedName = entry.name?.toLowerCase() ?? ''
    if (normalizedId.includes('fill') || normalizedName.includes('fill')) {
      return true
    }
  }
  return /fill/i.test(serviceName)
}

const normalizeStyleName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export default function Booking() {
  const searchParams = useSearchParams()
  const { currency, setCurrency, formatCurrency: formatCurrencyContext } = useCurrency()
  const { items: cartItems, removeService, getTotalItems, getTotalPrice, getTotalDuration, clearCart, addService } = useServiceCart()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const [servicePrices, setServicePrices] = useState<Record<string, number>>({})
  const [servicePricesUSD, setServicePricesUSD] = useState<Record<string, number>>({})
  const [serviceDurations, setServiceDurations] = useState<Record<string, number>>({})
  const [serviceCategoryMap, setServiceCategoryMap] = useState<Record<string, { id: string; name: string }>>({})
  const [serviceOptionGroups, setServiceOptionGroups] = useState<ServiceOptionGroup[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  // Payment method will be selected on Paystack page, default to paystack
  const [paymentMethod] = useState<'mpesa' | 'card' | string>('paystack')
  const [paymentSettings, setPaymentSettings] = useState<any>(null)
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(true)

  // Payment method will be selected on Paystack page
  const [clientPhotoError, setClientPhotoError] = useState<string | null>(null)
  const [studioLocation, setStudioLocation] = useState<string>(
    process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'
  )

  const STUDIO_LOCATION = studioLocation

  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(PHONE_COUNTRY_CODES[0]?.dialCode || '+254')
  const [phoneLocalNumber, setPhoneLocalNumber] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    lastFullSetDate: '',
    date: '',
    timeSlot: '',
    notes: '',
    appointmentPreference: '',
  })
  const [clientData, setClientData] = useState<any>(null)
  const [loadingClientData, setLoadingClientData] = useState(true)

  // Get service names from cart or fallback to legacy single-service field
  const selectedServiceNames =
    cartItems.length > 0
      ? cartItems.map((item) => item.name)
      : formData.service
      ? [formData.service]
      : []

  // Check if this is a consultation booking
  const isConsultation = selectedServiceNames.some(name => 
    name && name.toLowerCase().includes('consult')
  )

  // Debug helper to ensure cart + selection stay in sync (only runs in browser)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (cartItems.length > 0) {
      console.log('✅ Cart items loaded:', cartItems)
      console.log('✅ Selected service names:', selectedServiceNames)
    } else {
      const savedCart = window.localStorage.getItem('serviceCart')
      if (savedCart) {
        console.warn('⚠️ Cart appears empty but localStorage has data:', savedCart)
        try {
          const parsed = JSON.parse(savedCart)
          console.warn('⚠️ Parsed cart data:', parsed)
        } catch (error) {
          console.error('❌ Error parsing cart from localStorage:', error)
        }
      } else {
        console.log('ℹ️ Cart is empty and no data in localStorage')
      }
    }
  }, [cartItems, selectedServiceNames])

  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [availableDateStrings, setAvailableDateStrings] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDates, setLoadingDates] = useState(true) // Start with true to show loading state initially
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
    details?: string
  }>({ type: null, message: '' })
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [bookingDetails, setBookingDetails] = useState<{
    name: string
    email: string
    date: string
    time: string
    endTime: string
    service: string
    deposit: string
    originalPrice: string
    discount: string
    finalPrice: string
    paymentType?: 'deposit' | 'full'
    isFullPayment?: boolean
    returningClientEligible: boolean
    isNewUser?: boolean
  } | null>(null)
  const [isFirstTimeClient, setIsFirstTimeClient] = useState<boolean | null>(null)
  const [checkingFirstTime, setCheckingFirstTime] = useState(false)
  const [mpesaStatus, setMpesaStatus] = useState<{
    loading: boolean
    success: boolean | null
    message: string
    checkoutRequestID?: string
    orderTrackingId?: string
  }>({
    loading: false,
    success: null,
    message: '',
  })
const [returningDiscountPercent, setReturningDiscountPercent] = useState(0)
const [lastPaymentDate, setLastPaymentDate] = useState<string | null>(null)
const [returningDaysSince, setReturningDaysSince] = useState<number | null>(null)
const [loadingReturningDiscount, setLoadingReturningDiscount] = useState(false)
const [returningInfoError, setReturningInfoError] = useState<string | null>(null)
  const [discounts, setDiscounts] = useState<{
    firstTimeClientDiscount: { enabled: boolean; percentage: number }
    returningClientDiscount: { enabled: boolean; tier30Percentage: number; tier45Percentage: number }
    depositPercentage: number
    fridayNightDepositPercentage?: number
    fridayNightEnabled?: boolean
    paymentRequirement?: 'deposit' | 'full'
  } | null>(null)
const [discountsLoaded, setDiscountsLoaded] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsAcknowledgementError, setTermsAcknowledgementError] = useState(false)
  const [fineAmount, setFineAmount] = useState<number>(500)

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 100)
  }

  // Load client data if logged in (for faster booking with saved preferences)
  // Load client data if authenticated (non-blocking, handles 401 gracefully)
  useEffect(() => {
    const loadClientData = async () => {
      setLoadingClientData(true)
      try {
        const response = await fetch('/api/client/auth/me', {
          credentials: 'include',
          cache: 'default',
        })
        
        // 401 is expected for non-authenticated users - not an error
        if (response.status === 401) {
          setClientData(null)
          setLoadingClientData(false)
          return // User is not logged in, which is fine
        }
        
        if (response.ok) {
          const data = await response.json()
          setClientData(data)
          
          // Pre-fill form with saved client data
          if (data.user) {
            setFormData(prev => ({
              ...prev,
              name: prev.name || data.user.name || '',
              email: prev.email || data.user.email || '',
              phone: prev.phone || data.user.phone || '',
            }))
            
            // Parse phone number if it includes country code
            if (data.user.phone) {
              const phone = data.user.phone
              const countryCode = PHONE_COUNTRY_CODES.find(code => phone.startsWith(code.dialCode))
              if (countryCode) {
                setPhoneCountryCode(countryCode.dialCode)
                setPhoneLocalNumber(phone.replace(countryCode.dialCode, '').trim())
              } else {
                // Default to Kenya if no match
                setPhoneCountryCode('+254')
                setPhoneLocalNumber(phone.replace(/^\+254/, '').trim())
              }
            }
            
            // Pre-fill appointment preference if available
            if (data.preferences?.mappingStyle) {
              setFormData(prev => ({
                ...prev,
                appointmentPreference: prev.appointmentPreference || data.preferences.mappingStyle || '',
              }))
            }
          }
        } else {
          // Other errors - user not logged in or other issue
          setClientData(null)
        }
      } catch (error) {
        // Silently handle errors - user might not be logged in
        console.debug('Client data not available (user may not be logged in)')
        setClientData(null)
      } finally {
        setLoadingClientData(false)
      }
    }
    
    // Don't block page load - load in background
    loadClientData()
  }, [])

  // Check if email is a first-time client - debounced to prevent excessive API calls
  useEffect(() => {
    const checkFirstTimeClient = async () => {
      if (!formData.email || !formData.email.includes('@')) {
        setIsFirstTimeClient(null)
        return
      }

      setCheckingFirstTime(true)
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/booking/check-first-time?email=${encodeURIComponent(formData.email)}&t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        })
        if (!response.ok) {
          throw new Error(`Failed to check first-time client: ${response.status}`)
        }
        const data = await response.json()
        setIsFirstTimeClient(data.isFirstTime === true)
      } catch (error) {
        console.error('Error checking first-time client:', error)
        // Default to first-time client if check fails (safer to give discount)
        setIsFirstTimeClient(true)
      } finally {
        setCheckingFirstTime(false)
      }
    }
    
    // Increased debounce time to 800ms to reduce API calls and prevent lag
    const timeoutId = setTimeout(checkFirstTimeClient, 800)
    return () => clearTimeout(timeoutId)
  }, [formData.email])


  useEffect(() => {
    if (!formData.email) {
      setReferralStatus('idle')
      setReferralDetails(null)
      setReferralError('')
      setReferralMessage('')
      setReferralMode('none')
      setReturningDiscountPercent(0)
      setLastPaymentDate(null)
      setReturningDaysSince(null)
      setReturningInfoError(null)
      setLoadingReturningDiscount(false)
    }
  }, [formData.email])

  // Returning client discount fetching disabled - discounts will be applied manually
  useEffect(() => {
    // Always set returning discount to 0 - discounts will be applied manually
    setReturningDiscountPercent(0)
    setLastPaymentDate(null)
    setReturningDaysSince(null)
    setReturningInfoError(null)
    setLoadingReturningDiscount(false)
  }, [formData.email, formData.date, formData.service, isFirstTimeClient, serviceCategoryMap, discounts])

  // Load blocked dates immediately on page load - CRITICAL for instant blocking
  useEffect(() => {
    const loadBlockedDates = async () => {
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/calendar/available-slots?fullyBookedOnly=true&t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        })
        if (response.ok) {
          const data = await response.json()
          setFullyBookedDates(Array.isArray(data?.fullyBookedDates) ? data.fullyBookedDates : [])
        }
      } catch (error) {
        console.error('Error loading blocked dates:', error)
      }
    }
    loadBlockedDates()
  }, [])

  // Load initial data in parallel - NO CACHING for availability to ensure real-time updates
  useEffect(() => {
    let isMounted = true
    const timestamp = Date.now()
    // NO CACHE for availability-related calls - must be fresh every time
    const availabilityFetchOptions: RequestInit = { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    }
    // Other data can use default cache (discounts, contact don't change as frequently)
    const defaultFetchOptions: RequestInit = { 
      cache: 'no-store', // Changed to no-store for consistency
      signal: AbortSignal.timeout(10000)
    }
    
    // Fetch all initial data in parallel with individual error handling
    // Load calendar dates in parallel too to avoid waterfall loading
    Promise.allSettled([
      fetch(`/api/discounts?t=${timestamp}`, defaultFetchOptions).then((res) => {
        if (!res.ok) throw new Error(`Failed to load discounts: ${res.status}`)
        return res.json()
      }),
      fetch(`/api/contact?t=${timestamp}`, defaultFetchOptions).then((res) => {
        if (!res.ok) return null
        return res.json()
      }),
      fetch(`/api/availability?t=${timestamp}`, availabilityFetchOptions).then((res) => {
        if (!res.ok) return null
        return res.json()
      }),
      // Load calendar dates in parallel - don't wait for other data
      fetch(`/api/calendar/available-slots?t=${timestamp}`, availabilityFetchOptions).then((res) => {
        if (!res.ok) return null
        return res.json()
      }),
    ])
      .then((results) => {
        if (!isMounted) return
        
        // Extract data from settled promises
        const discountsData = results[0].status === 'fulfilled' ? results[0].value : null
        const contactData = results[1].status === 'fulfilled' ? results[1].value : null
        const availabilityData = results[2].status === 'fulfilled' ? results[2].value : null
        const calendarData = results[3].status === 'fulfilled' ? results[3].value : null
        // Process discounts
        if (discountsData) {
          const normalized = {
            firstTimeClientDiscount: {
              enabled: Boolean(discountsData?.firstTimeClientDiscount?.enabled),
              percentage: Number(discountsData?.firstTimeClientDiscount?.percentage ?? 0),
            },
            returningClientDiscount: {
              enabled: Boolean(discountsData?.returningClientDiscount?.enabled),
              tier30Percentage: Number(
                discountsData?.returningClientDiscount?.tier30Percentage ??
                  discountsData?.returningClientDiscount?.within30DaysPercentage ??
                  discountsData?.returningClientDiscount?.percentage ??
                  0,
              ),
              tier45Percentage: Number(
                discountsData?.returningClientDiscount?.tier45Percentage ??
                  discountsData?.returningClientDiscount?.within31To45DaysPercentage ??
                  discountsData?.returningClientDiscount?.percentage ??
                  0,
              ),
            },
            depositPercentage: Number(discountsData?.depositPercentage ?? 40),
            fridayNightDepositPercentage: Number(discountsData?.fridayNightDepositPercentage ?? 50),
            fridayNightEnabled: discountsData?.fridayNightEnabled !== false,
            paymentRequirement: (discountsData?.paymentRequirement === 'full' ? 'full' : 'deposit') as 'deposit' | 'full',
          }
          setDiscounts(normalized)
        } else {
          // Set default discounts on error
          setDiscounts({
            firstTimeClientDiscount: { enabled: false, percentage: 0 },
            returningClientDiscount: { enabled: false, tier30Percentage: 0, tier45Percentage: 0 },
            depositPercentage: 40,
            fridayNightDepositPercentage: 50,
            fridayNightEnabled: false,
          })
        }
        
        // Process contact/location
        if (contactData?.location?.trim()) {
          setStudioLocation(contactData.location.trim())
        }
        
        // Process availability
        if (availabilityData) {
          const normalized = {
            businessHours: availabilityData?.businessHours || {},
            timeSlots: availabilityData?.timeSlots || {},
            bookingWindow: {
              current: { ...(availabilityData?.bookingWindow?.current ?? {}) },
              next: { ...(availabilityData?.bookingWindow?.next ?? {}) },
              bookingLink: availabilityData?.bookingWindow?.bookingLink ?? '',
              note: availabilityData?.bookingWindow?.note ?? '',
              bannerMessage: availabilityData?.bookingWindow?.bannerMessage ?? '',
            },
          }
          setAvailabilityData(normalized)
        } else {
          setAvailabilityData({
            businessHours: {},
            timeSlots: {},
            bookingWindow: {},
          })
        }
        
        // Process calendar data immediately (loaded in parallel)
        if (calendarData) {
          const dates: AvailableDate[] = Array.isArray(calendarData?.dates) ? calendarData.dates : []
          const dateStrings = dates.map((entry: AvailableDate) => entry.value)
          
          setAvailableDates(dates)
          setAvailableDateStrings(dateStrings)
          setLoadingDates(false) // Dates loaded, hide loading state
          
          // Update blocked dates
          if (Array.isArray(calendarData?.fullyBookedDates)) {
            setFullyBookedDates(calendarData.fullyBookedDates)
          }
          
          // Store minimum booking date
          if (calendarData?.minimumBookingDate) {
            setAvailabilityData((prev) => ({
              ...prev,
              minimumBookingDate: calendarData.minimumBookingDate,
            }))
          }
          
          // Update booking window if provided
          if (calendarData?.bookingWindow) {
            setAvailabilityData((prev) => {
              const previous = prev ?? { businessHours: {}, timeSlots: {}, bookingWindow: {} }
              return {
                ...previous,
                bookingWindow: {
                  current: { ...(calendarData.bookingWindow.current ?? previous.bookingWindow?.current ?? {}) },
                  next: { ...(calendarData.bookingWindow.next ?? previous.bookingWindow?.next ?? {}) },
                  bookingLink: calendarData.bookingWindow.bookingLink ?? previous.bookingWindow?.bookingLink ?? '',
                  note: calendarData.bookingWindow.note ?? previous.bookingWindow?.note ?? '',
                  bannerMessage: calendarData.bookingWindow.bannerMessage ?? previous.bookingWindow?.bannerMessage ?? '',
                },
              }
            })
          }
        } else {
          // If no calendar data, still hide loading after a short delay to prevent stuck state
          setTimeout(() => setLoadingDates(false), 500)
        }
        
        setDiscountsLoaded(true)
      })
      .catch((error) => {
        if (!isMounted) return
        console.error('Error loading initial data:', error)
        // Set default discounts on error
        setDiscounts({
          firstTimeClientDiscount: { enabled: false, percentage: 0 },
          returningClientDiscount: { enabled: false, tier30Percentage: 0, tier45Percentage: 0 },
          depositPercentage: 40,
          fridayNightDepositPercentage: 50,
          fridayNightEnabled: false,
        })
        setLoadingDates(false) // Hide loading state even on error
        setDiscountsLoaded(true)
      })
    
    return () => {
      isMounted = false
    }
  }, [])

  const firstTimeDiscountEnabled = discounts?.firstTimeClientDiscount?.enabled ?? false
  const firstTimeDiscountPercentage = discounts?.firstTimeClientDiscount?.percentage ?? 0
  const depositPercentage = discounts?.depositPercentage ?? 40
  const fridayNightDepositPercentage = discounts?.fridayNightDepositPercentage ?? 50
  const fridayNightEnabled = discounts?.fridayNightEnabled === true
  const depositNoticeTemplate = (discounts as any)?.depositNotice as string | undefined
  
  // Get payment requirement from admin settings (default to deposit)
  const requiresFullPayment = discounts?.paymentRequirement === 'full'
  const returningClientDiscountConfig = discounts?.returningClientDiscount
  const returningClientDiscountEnabled = returningClientDiscountConfig?.enabled ?? false
  const returningTier30Percentage = returningClientDiscountConfig?.tier30Percentage ?? 0
  const returningTier45Percentage = returningClientDiscountConfig?.tier45Percentage ?? 0

  const hasFillServiceSelected = selectedServiceNames.some((serviceName) =>
    isFillService(serviceName, serviceCategoryMap),
  )
  const legacySelectedServiceIsFill = isFillService(formData.service, serviceCategoryMap)
  const selectedServiceIsFill = hasFillServiceSelected || legacySelectedServiceIsFill
  const INFILL_MAX_DAYS = 14
  const parseDateOnly = (value?: string | null) => {
    if (!value || typeof value !== 'string') return null
    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const lastFullSetDateObj = hasFillServiceSelected ? parseDateOnly(formData.lastFullSetDate) : null
  const appointmentDateObj = parseDateOnly(formData.date)
  const daysSinceLastFullSet =
    hasFillServiceSelected && lastFullSetDateObj && appointmentDateObj
      ? Math.max(
          0,
          Math.floor((appointmentDateObj.getTime() - lastFullSetDateObj.getTime()) / (1000 * 60 * 60 * 24)),
        )
      : null
  const fillOutsideWindow = typeof daysSinceLastFullSet === 'number' && daysSinceLastFullSet > INFILL_MAX_DAYS
  const fillInfoMissing = hasFillServiceSelected && !formData.lastFullSetDate
  const todayIsoString = new Date().toISOString().split('T')[0]
  const lastFullSetDateMax = formData.date || todayIsoString

  const safeReturningDaysSince =
    typeof returningDaysSince === 'number' ? Math.max(0, Math.floor(returningDaysSince)) : null
  const effectiveIsFirstTimeClient = isFirstTimeClient === true
  const effectiveIsReturningClient = isFirstTimeClient === false
  // Returning client discount disabled - discounts will be applied manually
  const rawReturningDiscountPercent = 0
  const appliedReturningDiscountPercent = 0
  const activeReturningWindow =
    safeReturningDaysSince !== null && safeReturningDaysSince <= 30
      ? 30
      : safeReturningDaysSince !== null && safeReturningDaysSince <= 45
      ? 45
      : null
  const activeReturningSummaryLabel =
    appliedReturningDiscountPercent > 0
      ? activeReturningWindow
        ? `${appliedReturningDiscountPercent}% (within ${activeReturningWindow} days)`
        : `${appliedReturningDiscountPercent}%`
      : `${appliedReturningDiscountPercent}%`

  useEffect(() => {
    if (selectedServiceIsFill) {
      setPromoCode('')
      setPromoCodeData(null)
      setPromoError('')
      setReferralStatus('idle')
      setReferralDetails(null)
      setReferralError('')
      setReferralMessage('')
      setReferralMode('none')
    }
  }, [selectedServiceIsFill])

  const lastPaymentDisplay = lastPaymentDate
    ? new Date(lastPaymentDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Load payment settings
  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const response = await fetch('/api/payment-settings', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setPaymentSettings(data)
          // Payment method is now selected on Paystack page, no need to set default
        }
      } catch (error) {
        console.error('Error loading payment settings:', error)
      } finally {
        setLoadingPaymentSettings(false)
      }
    }
    loadPaymentSettings()
  }, [])

  // Load services and pre-appointment guidelines in parallel - no cache for real-time updates
  useEffect(() => {
    let isMounted = true
    const timestamp = Date.now()
    // NO CACHE - ensure fresh data on every page load
    const fetchOptions: RequestInit = { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      signal: AbortSignal.timeout(8000), // 8 second timeout
    }
    
    Promise.allSettled([
      fetch(`/api/services?t=${timestamp}`, fetchOptions).then((res) => {
        if (!res.ok) throw new Error('Failed to load services')
        return res.json()
      }),
      fetch(`/api/pre-appointment-guidelines?t=${timestamp}`, fetchOptions).then((res) => {
        if (!res.ok) return null
        return res.json()
      }),
    ])
      .then((results) => {
        if (!isMounted) return
        
        const servicesData = results[0].status === 'fulfilled' ? results[0].value : null
        const guidelinesData = results[1].status === 'fulfilled' ? results[1].value : null
        
        // Process services
        if (servicesData) {
          const groups: ServiceOptionGroup[] = Array.isArray(servicesData?.categories)
            ? servicesData.categories.map((category: any) => {
                const categoryId: string =
                  typeof category?.id === 'string' && category.id.trim().length > 0
                    ? category.id
                    : `category-${Math.random().toString(36).slice(2, 10)}`
                const categoryName =
                  typeof category?.name === 'string' && category.name.trim().length > 0
                    ? category.name.trim()
                    : 'Category'

                const options: ServiceOption[] = Array.isArray(category?.services)
                  ? category.services.map((service: any) => ({
                      id:
                        typeof service?.id === 'string' && service.id.trim().length > 0
                          ? service.id
                          : `${categoryId}-${Math.random().toString(36).slice(2, 10)}`,
                      name: typeof service?.name === 'string' ? service.name : 'Service',
                      price: typeof service?.price === 'number' ? service.price : Number(service?.price) || 0,
                      priceUSD: typeof service?.priceUSD === 'number' ? service.priceUSD : undefined,
                      duration:
                        typeof service?.duration === 'number' ? service.duration : Number(service?.duration) || 0,
                      categoryId,
                      categoryName,
                    }))
                  : []

                return {
                  categoryId,
                  categoryName,
                  options,
                }
              })
            : []

          const prices: Record<string, number> = {}
          const pricesUSD: Record<string, number> = {}
          const durations: Record<string, number> = {}

          const categoryMap: Record<string, { id: string; name: string }> = {}

          groups.forEach((group) => {
            group.options.forEach((option) => {
              prices[option.name] = option.price
              if (option.priceUSD !== undefined) {
                pricesUSD[option.name] = option.priceUSD
              }
              durations[option.name] = option.duration
              categoryMap[option.name] = { id: option.categoryId, name: option.categoryName }
            })
          })

          setServicePrices(prices)
          setServicePricesUSD(pricesUSD)
          setServiceDurations(durations)
          setServiceOptionGroups(groups)
          setServiceCategoryMap(categoryMap)
        }
        
        // Process fine amount
        if (guidelinesData?.fineAmount && typeof guidelinesData.fineAmount === 'number' && guidelinesData.fineAmount > 0) {
          setFineAmount(guidelinesData.fineAmount)
        }
      })
      .catch((error) => {
        if (!isMounted) return
        console.error('Error loading services/guidelines:', error)
      })
      .finally(() => {
        if (isMounted) {
          setLoadingServices(false)
        }
      })
    
    return () => {
      isMounted = false
    }
  }, [])

  // Handle URL parameters for pre-selecting consultation service
  useEffect(() => {
    const serviceParam = searchParams.get('service')
    const tierParam = searchParams.get('tier')
    
    // Store tier in localStorage for later reference
    if (tierParam) {
      localStorage.setItem('labsTier', tierParam)
    }
    
    // Pre-select consultation service if specified in URL
    if (serviceParam && serviceParam.toLowerCase().includes('consult')) {
      // Wait for services to load before selecting
      if (!loadingServices && serviceOptionGroups.length > 0) {
        // Find the consultation service in the service groups
        let found = false
        for (const group of serviceOptionGroups) {
          const consultationService = group.options.find(
            option => option.name.toLowerCase().includes('consult')
          )
          if (consultationService) {
            // Add to cart if not already added
            const alreadyInCart = cartItems.some(item => item.name === consultationService.name)
            if (!alreadyInCart) {
              addService({
                serviceId: consultationService.id,
                name: consultationService.name,
                price: consultationService.price,
                priceUSD: consultationService.priceUSD,
                duration: consultationService.duration,
                categoryId: consultationService.categoryId,
                categoryName: consultationService.categoryName,
              })
            }
            found = true
            break
          }
        }
        
        // If consultation service not found in catalog, set it directly in formData
        // This handles the case where consultation might not be in the regular services
        if (!found && !formData.service) {
          setFormData(prev => ({
            ...prev,
            service: serviceParam,
          }))
        }
      } else if (!loadingServices && !formData.service) {
        // If services are loaded but no consultation found, set service name directly
        setFormData(prev => ({
          ...prev,
          service: serviceParam,
        }))
      }
    }
  }, [searchParams, loadingServices, serviceOptionGroups, cartItems, addService, formData.service])


  // Promo code state
  const [promoCode, setPromoCode] = useState('')
  const [giftCardData, setGiftCardData] = useState<{
    valid: boolean
    code: string
    amount: number
    originalAmount: number
    expiresAt: string
  } | null>(null)
  const [validatingGiftCard, setValidatingGiftCard] = useState(false)
  const [giftCardError, setGiftCardError] = useState('')
  const [promoCodeData, setPromoCodeData] = useState<{
    valid: boolean
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    maxDiscount?: number
    description?: string
    allowFirstTimeClient?: boolean
    isReferral?: boolean
    referrerEmail?: string | null
    friendUsesRemaining?: number | null
    referrerRewardAvailable?: boolean
    appliesToReferrer?: boolean
    appliesToFriend?: boolean
    isSalonReferral?: boolean
    salonName?: string | null
    salonEmail?: string | null
    clientDiscountPercent?: number | null
    salonCommissionPercent?: number | null
    salonPartnerType?: 'beautician' | 'influencer' | 'salon' | string | null
  } | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [referralStatus, setReferralStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [referralDetails, setReferralDetails] = useState<{ code: string; friendUsesRemaining: number | null } | null>(null)
  const [referralError, setReferralError] = useState('')
  const [referralMessage, setReferralMessage] = useState('')
  const [referralMode, setReferralMode] = useState<'none' | 'friend' | 'salon'>('none')
  const friendReferralActive = referralMode === 'friend'
  const salonReferralActive = referralMode === 'salon'
  const referralActive = referralMode !== 'none'
  const isReferralBasedBooking = referralActive

  // Consultation questionnaire state
  const [consultationForm, setConsultationForm] = useState({
    businessName: '',
    serviceType: '',
    businessStatus: '',
    currentBookingMethod: '',
    paymentTiming: '',
    hasNoShows: '',
    hasWebsite: '',
    websiteIssues: '',
    investmentWillingness: '',
    consultationGoals: '',
    successCriteria: '',
    whyNow: '',
  })

  // Returning discount promo code clearing removed - discounts will be applied manually

  const toggleReferralMode = (mode: 'friend' | 'salon') => {
    setReferralMode((prev) => (prev === mode ? 'none' : mode))
    setPromoCode('')
    setPromoCodeData(null)
    setPromoError('')
    setReferralStatus('idle')
    setReferralDetails(null)
    setReferralError('')
    setReferralMessage('')
  }

  // Unified validation function that tries both promo codes and gift cards
  const validateUnifiedCode = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) {
      setPromoCodeData(null)
      setGiftCardData(null)
      setPromoError('')
      setGiftCardError('')
      return
    }

    setValidatingPromo(true)
    setPromoError('')
    setGiftCardError('')

    // Try gift card first (they usually have a specific format)
    const giftCardTrimmed = trimmed.replace(/\s+/g, '').replace(/-/g, '')
    try {
      const giftCardResponse = await fetch('/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardTrimmed }),
      })

      const giftCardData = await giftCardResponse.json()

      if (giftCardResponse.ok && giftCardData.valid) {
        setGiftCardData({
          valid: true,
          code: giftCardData.code,
          amount: giftCardData.amount,
          originalAmount: giftCardData.originalAmount,
          expiresAt: giftCardData.expiresAt,
        })
        setPromoCodeData(null)
        setPromoError('')
        setGiftCardError('')
        setValidatingPromo(false)
        return
      }
    } catch (error) {
      // Continue to try promo code
    }

    // Try promo code if gift card didn't work
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/promo-codes/validate?t=${timestamp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          email: formData.email,
          isFirstTimeClient: effectiveIsFirstTimeClient === true,
          referralType: referralMode === 'friend' ? 'friend' : referralMode === 'salon' ? 'salon' : null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid || !data.promoCode) {
        const errorMessage =
          data.error ||
          (data.code === 'REFERRAL_FRIEND_LIMIT'
            ? 'This referral code has already been used by a friend.'
            : data.code === 'REFERRAL_REFERRER_ONLY'
            ? 'This referral code is now reserved for the referrer.'
            : data.code === 'SALON_LIMIT_REACHED'
            ? 'This salon referral card has already been fully used.'
            : data.code === 'SALON_USE_REQUIRED'
            ? 'Please select "Referred by a salon/beautician" before entering this code.'
            : data.code === 'SALON_FIRST_TIME_BLOCKED'
            ? 'This salon referral code can only be used by new clients.'
            : data.code === 'CARD_FIRST_TIME_BLOCKED'
            ? 'This promo code cannot be used by first-time clients. Please book your first appointment to become eligible.'
            : data.code === 'PROMO_ALREADY_USED'
            ? 'You have already used this promo code. Each promo code can only be used once per email address.'
            : 'Code is not valid. Please check and try again.')

        setPromoCodeData(null)
        setGiftCardData(null)
        setPromoError(errorMessage)
        setGiftCardError('')
        return
      }

      if (effectiveIsFirstTimeClient === true && data.promoCode.allowFirstTimeClient !== true && !data.promoCode.isSalonReferral) {
        setPromoCodeData(null)
        setGiftCardData(null)
        setPromoError('This promo code is not available for first-time clients.')
        return
      }

      if (data.promoCode.isSalonReferral) {
        setReferralMode('salon')
      } else if (data.promoCode.isReferral) {
        setReferralMode('friend')
      }

      setPromoCodeData({
        valid: true,
        code: data.promoCode.code,
        discountType: data.promoCode.discountType,
        discountValue: data.promoCode.discountValue,
        maxDiscount: data.promoCode.maxDiscount,
        description: data.promoCode.description,
        allowFirstTimeClient: data.promoCode.allowFirstTimeClient,
        isReferral: data.promoCode.isReferral,
        isSalonReferral: data.promoCode.isSalonReferral,
        referrerEmail: data.promoCode.referrerEmail,
        friendUsesRemaining: data.promoCode.friendUsesRemaining,
        referrerRewardAvailable: data.promoCode.referrerRewardAvailable,
        appliesToReferrer: data.promoCode.appliesToReferrer,
        appliesToFriend: data.promoCode.appliesToFriend,
        salonName: data.promoCode.salonName,
        salonEmail: data.promoCode.salonEmail,
        clientDiscountPercent: data.promoCode.clientDiscountPercent,
        salonCommissionPercent: data.promoCode.salonCommissionPercent,
      })
      setGiftCardData(null)
      setPromoError('')
      setGiftCardError('')
    } catch (error) {
      console.error('Error validating code:', error)
      setPromoError('Error validating code. Please try again.')
      setGiftCardError('Error validating code. Please try again.')
      setPromoCodeData(null)
      setGiftCardData(null)
    } finally {
      setValidatingPromo(false)
    }
  }

  // Legacy validatePromoCode for backward compatibility
  const validatePromoCode = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) {
      setPromoCodeData(null)
      setPromoError('')
      return
    }

    setValidatingPromo(true)
    setPromoError('')

    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/promo-codes/validate?t=${timestamp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          email: formData.email,
          isFirstTimeClient: effectiveIsFirstTimeClient === true,
          referralType: referralMode === 'friend' ? 'friend' : referralMode === 'salon' ? 'salon' : null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.valid || !data.promoCode) {
        const errorMessage =
          data.error ||
          (data.code === 'REFERRAL_FRIEND_LIMIT'
            ? 'This referral code has already been used by a friend.'
            : data.code === 'REFERRAL_REFERRER_ONLY'
            ? 'This referral code is now reserved for the referrer.'
            : data.code === 'SALON_LIMIT_REACHED'
            ? 'This salon referral card has already been fully used.'
            : data.code === 'SALON_USE_REQUIRED'
            ? 'Please select "Referred by a salon/beautician" before entering this code.'
            : data.code === 'SALON_FIRST_TIME_BLOCKED'
            ? 'This salon referral code can only be used by new clients.'
            : data.code === 'CARD_FIRST_TIME_BLOCKED'
            ? 'This promo code cannot be used by first-time clients. Please book your first appointment to become eligible.'
            : data.code === 'PROMO_ALREADY_USED'
            ? 'You have already used this promo code. Each promo code can only be used once per email address.'
            : 'Promo code is not valid at this time.')

        setPromoCodeData(null)
        setPromoError(errorMessage)
        return
      }

      if (effectiveIsFirstTimeClient === true && data.promoCode.allowFirstTimeClient !== true && !data.promoCode.isSalonReferral) {
        setPromoCodeData(null)
        setPromoError('This promo code is not available for first-time clients.')
        return
      }

      if (data.promoCode.isSalonReferral) {
        setReferralMode('salon')
      } else if (data.promoCode.isReferral) {
        setReferralMode('friend')
      }

      setPromoCodeData({
        valid: true,
        code: data.promoCode.code,
        discountType: data.promoCode.discountType,
        discountValue: data.promoCode.discountValue,
        maxDiscount: data.promoCode.maxDiscount,
        description: data.promoCode.description,
        allowFirstTimeClient: data.promoCode.allowFirstTimeClient,
        isReferral: data.promoCode.isReferral,
        isSalonReferral: data.promoCode.isSalonReferral,
        referrerEmail: data.promoCode.referrerEmail,
        friendUsesRemaining: data.promoCode.friendUsesRemaining,
        referrerRewardAvailable: data.promoCode.referrerRewardAvailable,
        appliesToReferrer: data.promoCode.appliesToReferrer,
        appliesToFriend: data.promoCode.appliesToFriend,
        salonName: data.promoCode.salonName,
        salonEmail: data.promoCode.salonEmail,
        clientDiscountPercent: data.promoCode.clientDiscountPercent,
        salonCommissionPercent: data.promoCode.salonCommissionPercent,
      })
      setPromoError('')
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoError('Error validating promo code. Please try again.')
      setPromoCodeData(null)
    } finally {
      setValidatingPromo(false)
    }
  }

  const handleGenerateReferralCode = async (
    overrideEmail?: string,
    overrideName?: string,
  ) => {
    const emailToUse = (overrideEmail ?? formData.email ?? '').trim()
    const nameToUse = (overrideName ?? formData.name ?? '').trim()

    if (!emailToUse || !emailToUse.includes('@')) {
      setReferralError('Please add a valid email so we know where to send the referral instructions.')
      setReferralMessage('')
      return
    }

    setReferralStatus('loading')
    setReferralError('')
    setReferralMessage('')

    try {
      const response = await fetch('/api/promo-codes/create-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerEmail: emailToUse,
          referrerName: nameToUse,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setReferralStatus('error')
        setReferralError(data.error || 'Could not generate a referral code right now.')
        setReferralMessage('')
        return
      }

      setReferralDetails({
        code: data.promoCode?.code,
        friendUsesRemaining:
          typeof data.promoCode?.friendUsesRemaining === 'number'
            ? data.promoCode.friendUsesRemaining
            : null,
      })
      setReferralStatus('sent')
      setReferralError('')
      setReferralMessage(
        data.reused
          ? 'You already have an active referral code. We resent it to your email.'
          : 'Referral code sent! Check your email for sharing instructions.',
      )
    } catch (error) {
      console.error('Error generating referral code:', error)
      setReferralStatus('error')
      setReferralError('Failed to generate a referral code. Please try again.')
      setReferralMessage('')
    }
  }

  // Reset promo code when email changes or first-time status changes
  useEffect(() => {
    if (effectiveIsFirstTimeClient === true && referralMode === 'none') {
      // Clear promo code for first-time clients
      setPromoCode('')
      setPromoCodeData(null)
      setPromoError('')
    }
  }, [effectiveIsFirstTimeClient, referralMode])

  useEffect(() => {
    if (!effectiveIsFirstTimeClient && referralMode === 'friend') {
      setReferralMode('none')
    }
  }, [effectiveIsFirstTimeClient, referralMode])

  useEffect(() => {
    if (!formData.email && referralMode === 'friend') {
      setReferralMode('none')
    }
  }, [formData.email, referralMode])

  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([])
  const [availabilityData, setAvailabilityData] = useState<{
    minimumBookingDate?: string
    businessHours?: {
      [key: string]: { open: string; close: string; enabled: boolean }
    }
    timeSlots?: {
      weekdays?: Array<{ hour: number; minute: number; label: string }>
      friday?: Array<{ hour: number; minute: number; label: string }>
      saturday?: Array<{ hour: number; minute: number; label: string }>
      sunday?: Array<{ hour: number; minute: number; label: string }>
    }
    bookingWindow?: {
      current?: { startDate?: string; endDate?: string; label?: string }
      next?: { startDate?: string; endDate?: string; label?: string; opensAt?: string; emailSubject?: string }
      bookingLink?: string
      note?: string
      bannerMessage?: string
      bannerEnabled?: boolean | null
    }
  } | null>(null)
  const bookingWindow = availabilityData?.bookingWindow

  // Check if booking is a Friday night slot
  const isFridayNightBooking = (): boolean => {
    if (!fridayNightEnabled) return false
    if (!formData.date || !formData.timeSlot) return false
    
    // Check if date is a Friday (day of week = 5)
    const dateObj = new Date(formData.date + 'T12:00:00')
    const dayOfWeek = dateObj.getDay()
    if (dayOfWeek !== 5) return false // Not Friday
    
    // Check if Friday-specific time slots exist (meaning Friday night slots are activated)
    const fridaySlots = availabilityData?.timeSlots?.friday
    if (!Array.isArray(fridaySlots) || fridaySlots.length === 0) return false
    
    // If Friday-specific slots are configured, all Friday bookings are considered "night bookings"
    // This means the business has activated Friday night slots
    return true
  }

  // Calculate pricing with discount (first-time OR promo code, not both)
  const calculatePricing = (services: string[] | string) => {
    // Handle both single service (backward compatibility) and multiple services
    const serviceList = Array.isArray(services) ? services : services ? [services] : []
    
    // Get total price for all services in selected currency
    const getTotalServicePrice = (): number => {
      if (serviceList.length === 0) return 0
      
      return serviceList.reduce((total, serviceName) => {
        // Try to find service in cart items first (more accurate)
        const cartItem = cartItems.find(item => item.name === serviceName)
        if (cartItem) {
          return total + (currency === 'USD' && cartItem.priceUSD !== undefined 
            ? cartItem.priceUSD 
            : cartItem.price)
        }
        
        // Fallback to service prices map
        if (currency === 'USD' && servicePricesUSD[serviceName] !== undefined) {
          return total + servicePricesUSD[serviceName]
        }
        if (currency === 'KES') {
          return total + (servicePrices[serviceName] || 0)
        }
        // Fallback: convert KES to USD if USD price not set
        if (currency === 'USD' && servicePrices[serviceName]) {
          return total + convertCurrency(servicePrices[serviceName], 'KES', 'USD', DEFAULT_EXCHANGE_RATES)
        }
        return total + (servicePrices[serviceName] || 0)
      }, 0)
    }

    const originalPrice = getTotalServicePrice()
    if (serviceList.length === 0 || originalPrice === 0) {
      return {
        originalPrice: 0,
        discount: 0,
        finalPrice: 0,
        deposit: 0,
        discountType: null as 'first-time' | 'promo' | 'returning' | null,
        isFridayNight: false,
        depositPercentage: depositPercentage,
      }
    }
    
    // Check if any service is a fill service (for discount eligibility)
    const hasFillService = serviceList.some(serviceName => isFillService(serviceName, serviceCategoryMap))
    const isReferralPromo = Boolean(promoCodeData?.valid && promoCodeData?.isReferral)
    const isSalonReferralPromo = Boolean(promoCodeData?.valid && promoCodeData?.isSalonReferral)
    const referralPromoApplied = isReferralPromo || isSalonReferralPromo

    const promoOverridesFirstTimeDiscount = allowFirstTimePromoOverride && !hasFillService

    const firstTimeEligible =
      !promoOverridesFirstTimeDiscount &&
      !hasFillService &&
      firstTimeDiscountEnabled &&
      effectiveIsFirstTimeClient === true &&
      !referralPromoApplied

    // Promo codes and automatic discounts are mutually exclusive
    const promoEligible = Boolean(
      promoCodeData?.valid &&
      !hasFillService &&
      appliedReturningDiscountPercent === 0 && // Cannot use promo if returning discount is active
      (!firstTimeEligible || promoOverridesFirstTimeDiscount) && // Allow promo when it overrides first-time discount
      (
        effectiveIsReturningClient === true ||
        (effectiveIsFirstTimeClient === true &&
          (promoCodeData.allowFirstTimeClient === true || isSalonReferralPromo))
      ),
    )

    const returningEligible =
      !hasFillService &&
      appliedReturningDiscountPercent > 0 &&
      !promoEligible && // Cannot use returning discount if promo is active
      !firstTimeEligible

    let discount = 0
    let discountType: 'first-time' | 'promo' | 'returning' | null = null

    if (firstTimeEligible) {
      discount = Math.round(originalPrice * (firstTimeDiscountPercentage / 100))
      discountType = 'first-time'
    } else if (promoEligible && promoCodeData) {
      let discountValue = promoCodeData.discountValue
      if (promoCodeData.isSalonReferral && promoCodeData.clientDiscountPercent !== null && promoCodeData.clientDiscountPercent !== undefined) {
        discountValue = promoCodeData.clientDiscountPercent
      }
      if (promoCodeData.discountType === 'percentage') {
        discount = Math.round(originalPrice * (discountValue / 100))
        if (promoCodeData.maxDiscount && discount > promoCodeData.maxDiscount) {
          discount = promoCodeData.maxDiscount
        }
      } else {
        discount = discountValue
      }
      discountType = 'promo'
    } else if (returningEligible) {
      discount = Math.round(originalPrice * (appliedReturningDiscountPercent / 100))
      discountType = 'returning'
    }

    const finalPrice = Math.max(0, originalPrice - discount)
    
    // Friday night bookings require configurable deposit percentage
    const isFridayNight = isFridayNightBooking()
    const effectiveDepositPercentage = isFridayNight ? fridayNightDepositPercentage : depositPercentage
    let deposit = Math.round(finalPrice * (effectiveDepositPercentage / 100))
    
    // Apply gift card balance to deposit if available
    const giftCardBalance = giftCardData?.valid ? giftCardData.amount : 0
    if (giftCardBalance > 0) {
      deposit = Math.max(0, deposit - giftCardBalance)
    }

    return {
      originalPrice,
      discount,
      finalPrice,
      deposit,
      discountType,
      isFridayNight,
      depositPercentage: effectiveDepositPercentage,
    }
  }
  
  const allowFirstTimePromoOverride =
    effectiveIsFirstTimeClient === true &&
    promoCodeData?.valid &&
    promoCodeData?.allowFirstTimeClient === true

  const pricing = calculatePricing(selectedServiceNames)
  const promoOverridesFirstTimeNotice = allowFirstTimePromoOverride && !selectedServiceIsFill
  const depositAmount = pricing.deposit

  const formatDateDisplay = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
    if (!value || typeof value !== 'string') return null
    const parsed = new Date(`${value}T00:00:00+03:00`)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleDateString('en-US', options ?? { day: 'numeric', month: 'long' })
  }

  const formatRange = (start?: string, end?: string, label?: string | null) => {
    if (label && label.trim().length > 0) return label
    const startDisplay = formatDateDisplay(start)
    const endDisplay = formatDateDisplay(end)
    if (startDisplay && endDisplay) return `${startDisplay} – ${endDisplay}`
    if (startDisplay) return startDisplay
    if (endDisplay) return endDisplay
    return null
  }

  const currentWindowLabel = formatRange(
    bookingWindow?.current?.startDate,
    bookingWindow?.current?.endDate,
    bookingWindow?.current?.label ?? null,
  )
  const nextWindowLabel = formatRange(
    bookingWindow?.next?.startDate,
    bookingWindow?.next?.endDate,
    bookingWindow?.next?.label ?? null,
  )
  const nextOpensDisplay = formatDateDisplay(bookingWindow?.next?.opensAt, {
    day: 'numeric',
    month: 'long',
  })

  const defaultBannerMessage = () => {
    if (!currentWindowLabel) return null
    return `Bookings open monthly. Current calendar: ${currentWindowLabel}.`
  }

  const bannerMessage =
    bookingWindow?.bannerMessage && bookingWindow.bannerMessage.trim().length > 0
      ? bookingWindow.bannerMessage.trim()
      : defaultBannerMessage()
  const bannerEnabled =
    bookingWindow?.bannerEnabled === false
      ? false
      : ((bookingWindow?.bannerEnabled === true || bookingWindow?.bannerEnabled === null || bookingWindow?.bannerEnabled === undefined) &&
         (bannerMessage?.length ?? 0) > 0)

  // Availability data is now loaded in parallel with discounts and contact (see useEffect above)

  // Refresh calendar dates when booking window changes (dates already loaded in parallel above)
  useEffect(() => {
    // Only refresh if booking window actually changed (not on initial load)
    if (!discountsLoaded || !availabilityData?.bookingWindow?.current) return

    let cancelled = false
    const refreshAvailableDates = async () => {
      // Don't show loading state for background refresh - it's already loaded
      // Only show loading if dates are empty
      const shouldShowLoading = availableDates.length === 0
      if (shouldShowLoading) {
        setLoadingDates(true)
      }
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/calendar/available-slots?t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          signal: AbortSignal.timeout(8000) // 8 second timeout
        })
        if (!response.ok) {
          throw new Error(`Failed to refresh available dates: ${response.status}`)
        }
        const data = await response.json()
        if (cancelled) return
        
        const dates: AvailableDate[] = Array.isArray(data?.dates) ? data.dates : []
        const dateStrings = dates.map((entry) => entry.value)
        
        setAvailableDates(dates)
        setAvailableDateStrings(dateStrings)
        
        // Update blocked dates
        if (Array.isArray(data?.fullyBookedDates)) {
          setFullyBookedDates(data.fullyBookedDates)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error refreshing available dates:', error)
        }
      } finally {
        if (!cancelled && shouldShowLoading) {
          setLoadingDates(false)
        }
      }
    }

    refreshAvailableDates()

    return () => {
      cancelled = true
    }
  }, [
    availabilityData?.bookingWindow?.current?.startDate,
    availabilityData?.bookingWindow?.current?.endDate,
  ])

  // Fetch time slots when date is selected
  useEffect(() => {
    if (formData.date) {
      fetchTimeSlots(formData.date)
    } else {
      setTimeSlots([])
      setFormData(prev => ({ ...prev, timeSlot: '' }))
    }
  }, [formData.date])

  useEffect(() => {
    if (!formData.date) return
    if (availableDateStrings.length > 0 && !availableDateStrings.includes(formData.date)) {
      setFormData((prev) => ({ ...prev, date: '', timeSlot: '' }))
    }
  }, [availableDateStrings, formData.date])

  const fetchTimeSlots = async (date: string) => {
    setLoadingSlots(true)
    setFormData(prev => ({ ...prev, timeSlot: '' })) // Clear selected time slot
    setSubmitStatus({ type: null, message: '' })
    
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/calendar/available-slots?date=${date}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      })
      const data = await response.json()
      if (data.slots) {
        setTimeSlots(data.slots)
        if (data.slots.length === 0) {
          setSubmitStatus({
            type: 'error',
            message: 'No available time slots for this date. Please select another date.',
          })
          setFullyBookedDates((prev) =>
            prev.includes(date) ? prev : [...prev, date],
          )
        } else {
          setFullyBookedDates((prev) =>
            prev.includes(date) ? prev.filter((d) => d !== date) : prev,
          )
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


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'phone') {
      return
    }
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (e.target.name === 'service') {
      setTermsAccepted(false)
    }
    if (termsAcknowledgementError) {
      setTermsAcknowledgementError(false)
    }
    // Clear error messages when user makes changes
    if (submitStatus.type === 'error') {
      setSubmitStatus({ type: null, message: '' })
    }
  }

  const handleConsultationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setConsultationForm({
      ...consultationForm,
      [e.target.name]: e.target.value,
    })
  }

  useEffect(() => {
    setFormData((prev) => {
      const combined = phoneLocalNumber
        ? `${phoneCountryCode} ${phoneLocalNumber}`.trim()
        : ''
      if (prev.phone === combined) {
        return prev
      }
      return {
        ...prev,
        phone: combined,
      }
    })
  }, [phoneCountryCode, phoneLocalNumber])

  useEffect(() => {
    if (!formData.phone) return
    const existing = formData.phone.trim()
    const match = PHONE_COUNTRY_CODES.find((option) => existing.startsWith(option.dialCode))
    if (match) {
      const local = existing.replace(match.dialCode, '').trim()
      setPhoneCountryCode(match.dialCode)
      setPhoneLocalNumber(local)
    }
  }, [])

  // Initiate payment via Paystack (for both M-Pesa and Card)
  const initiatePayment = async (amount: number, bookingReference: string, isFullPayment: boolean = false) => {
    const formattedAmount = formatCurrencyContext(amount)
    setMpesaStatus({ loading: true, success: null, message: `Initiating payment...` })
    
    try {
      const fullPhone = `${phoneCountryCode}${phoneLocalNumber}`

      if (!formData.email || !formData.email.includes('@')) {
        return { 
          success: false, 
          error: 'Email is required for payment processing.' 
        }
      }

      // Initialize Paystack payment
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          amount: amount,
          currency: currency === 'USD' ? 'USD' : 'KES',
          metadata: {
            payment_type: 'booking',
            booking_reference: bookingReference,
            service_names: selectedServiceNames.length > 0 ? selectedServiceNames.join(' + ') : 'Service',
            is_full_payment: isFullPayment,
          },
          customerName: formData.name,
          phone: fullPhone,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success && data.authorizationUrl) {
        setMpesaStatus({
          loading: false,
          success: true,
          message: 'Redirecting to secure payment page...',
          orderTrackingId: data.reference,
        })
        // Redirect to Paystack payment page
        setTimeout(() => {
          window.location.href = data.authorizationUrl
        }, 100)
        return { success: true, orderTrackingId: data.reference, reference: data.reference }
      } else {
        const errorMessage = data.error || 'Failed to initiate payment. Please check your details and try again.'
        setMpesaStatus({
          loading: false,
          success: false,
          message: errorMessage,
        })
        console.error('Paystack payment initiation failed:', data)
        return { success: false, error: errorMessage }
      }
    } catch (error: any) {
      console.error('Error initiating payment:', error)
      setMpesaStatus({
        loading: false,
        success: false,
        message: 'Network error. Please check your connection and try again.',
      })
      return { success: false, error: error.message || 'Network error occurred' }
    }
  }

  // Legacy function names for compatibility (both use Paystack now)
  const initiateMpesaPayment = async (phone: string, amount: number, bookingReference: string, isFullPayment: boolean = false) => {
    return initiatePayment(amount, bookingReference, isFullPayment)
  }

  const initiateCardPayment = async (amount: number, bookingReference: string) => {
    return initiatePayment(amount, bookingReference, true) // Card always requires full payment
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitStatus({ type: null, message: '' })
    setMpesaStatus({ loading: false, success: null, message: '' })
    setClientPhotoError(null)
    if (!termsAccepted) {
      setTermsAcknowledgementError(true)
      setSubmitStatus({
        type: 'error',
        message: 'Please confirm that you have read and agree to The Lash Diary Policies and Pre-Appointment Guidelines before continuing.',
      })
      document.getElementById('terms-consent')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setLoading(true)


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
      // Check if cart is empty - if so, show helpful error message
      if (cartItems.length === 0 && !formData.service) {
        setLoading(false)
        setSubmitStatus({
          type: 'error',
          message: 'Please select at least one service to continue. You can add services from the Services page.',
        })
        // Scroll to service selection area
        setTimeout(() => {
          const serviceSection = document.getElementById('service-cart-section')
          if (serviceSection) {
            serviceSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
        return
      }
      
      // Ensure we have at least one service
      if (selectedServiceNames.length === 0) {
        setLoading(false)
        setSubmitStatus({
          type: 'error',
          message: 'Please select at least one service to continue.',
        })
        return
      }

      if (hasFillServiceSelected) {
        if (!formData.lastFullSetDate) {
          setLoading(false)
          setSubmitStatus({
            type: 'error',
            message: 'Please tell us when you last had a full lash set so we can confirm fill eligibility.',
          })
          document.getElementById('lastFullSetDate')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        if (!formData.date) {
          setLoading(false)
          setSubmitStatus({
            type: 'error',
            message: 'Select your appointment date before booking a fill so we can confirm eligibility.',
          })
          return
        }
        const lastFullSetDate = parseDateOnly(formData.lastFullSetDate)
        const appointmentDate = parseDateOnly(formData.date)
        if (!lastFullSetDate || !appointmentDate) {
          setLoading(false)
          setSubmitStatus({
            type: 'error',
            message: 'Please enter a valid date for your last full set.',
          })
          return
        }
        const diffDays = Math.max(
          0,
          Math.floor((appointmentDate.getTime() - lastFullSetDate.getTime()) / (1000 * 60 * 60 * 24)),
        )
        if (diffDays > INFILL_MAX_DAYS) {
          setLoading(false)
          setSubmitStatus({
            type: 'error',
            message: `Fills are only available within ${INFILL_MAX_DAYS} days of your last full set. Please book a new full set instead so we can deliver the best results.`,
          })
          document.getElementById('service-cart-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
      }
      
      const pricingDetails = calculatePricing(selectedServiceNames)
      const referralType = referralMode === 'friend' ? 'friend' : referralMode === 'salon' ? 'salon' : null
      const salonReferralContext = promoCodeData?.isSalonReferral
        ? {
            code: promoCodeData.code,
            salonName: promoCodeData.salonName || '',
            salonEmail: promoCodeData.salonEmail || '',
            clientDiscountPercent: promoCodeData.clientDiscountPercent ?? promoCodeData.discountValue ?? 0,
            salonCommissionPercent: promoCodeData.salonCommissionPercent ?? 0,
            commissionAmount: Math.round(
              pricingDetails.originalPrice * ((promoCodeData.salonCommissionPercent ?? 0) / 100),
            ),
          }
        : null
      
      const bookingReference = `LashDiary-${Date.now()}-${formData.name.substring(0, 3).toUpperCase()}`

      // Initiate payment based on selected method
      let paymentResult: { success: boolean; checkoutRequestID?: string | null; orderTrackingId?: string | null; error?: string } = { success: true }

      // For PesaPal payments (card or M-Pesa), create booking first, then redirect to payment
      // This ensures we have the booking data even if payment fails
      let bookingCreated = false
      let createdBookingId: string | null = null

      // Payment method will be selected on Paystack page
      // Create booking first with pending payment status
      const timestamp = Date.now()
      const bookingResponse = await fetch(`/api/calendar/book?t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          service: selectedServiceNames.length > 0 
            ? selectedServiceNames.join(' + ') 
            : formData.service || 'Lash Service',
          services: selectedServiceNames,
          serviceDetails: cartItems.map(item => ({
            serviceId: item.serviceId,
            name: item.name,
            price: item.price,
            priceUSD: item.priceUSD,
            duration: item.duration,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
          })),
          location: STUDIO_LOCATION,
          isFirstTimeClient: effectiveIsFirstTimeClient === true,
          originalPrice: pricingDetails.originalPrice,
          discount: pricingDetails.discount,
          finalPrice: pricingDetails.finalPrice,
          deposit: pricingDetails.finalPrice, // Full payment (Paystack handles method selection)
          paymentType: 'full',
          discountType: pricingDetails.discountType,
          promoCode: promoCodeData?.code || null,
          promoCodeType: referralType,
          salonReferral: salonReferralContext,
          giftCardCode: giftCardData?.valid ? giftCardData.code : null,
          paymentMethod: 'paystack',
          paymentStatus: 'pending_payment',
          currency: currency,
          desiredLook: 'Custom',
        }),
      })

      const bookingData = await bookingResponse.json()
      if (bookingResponse.ok && bookingData.success && bookingData.bookingId) {
        bookingCreated = true
        createdBookingId = bookingData.bookingId
        
        // Now initiate payment with booking ID (Paystack will handle method selection)
        const cardResult = await initiateCardPayment(pricingDetails.finalPrice, bookingReference)
        paymentResult = { ...cardResult }
        
        if (cardResult.success && cardResult.orderTrackingId) {
          // Update booking with Paystack reference
          try {
            await fetch(`/api/booking/update-payment-tracking`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookingId: createdBookingId,
                paymentOrderTrackingId: cardResult.orderTrackingId || cardResult.reference,
                paymentMethod: 'paystack',
              }),
            })
          } catch (error) {
            console.error('Error updating booking with Paystack reference:', error)
          }
          
          setLoading(false)
          return // User will be redirected to payment page
        } else {
          setSubmitStatus({
            type: 'error',
            message: 'Payment Failed',
            details: cardResult.error || 'Failed to initiate payment. Please try again.',
          })
          setLoading(false)
          return
        }
      } else {
        setSubmitStatus({
          type: 'error',
          message: 'Booking Failed',
          details: bookingData.error || 'Failed to create booking. Please try again.',
        })
        setLoading(false)
        return
      }
      
      // Legacy M-Pesa code removed - Paystack handles all payment methods
      if (false) {
        // Validate phone number first
        const fullPhone = `${phoneCountryCode}${phoneLocalNumber}`
        if (!phoneLocalNumber || phoneLocalNumber.trim().length < 9) {
          setSubmitStatus({
            type: 'error',
            message: 'Phone Number Required',
            details: 'Please enter a valid phone number for M-Pesa payment.',
          })
          setLoading(false)
          // Scroll to phone number field
          setTimeout(() => {
            document.getElementById('payment-method-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 100)
          return
        }

        // M-Pesa payment via PesaPal - allows deposit payment (not full payment required)
        // Initiate payment FIRST, then create booking only if payment initiation succeeds
        const paymentAmount = pricingDetails.deposit // M-Pesa always uses deposit
        const mpesaResult = await initiateMpesaPayment(fullPhone, paymentAmount, bookingReference, false)
        
        // Only create booking if payment initiation was successful
        if (!mpesaResult.success || !mpesaResult.orderTrackingId) {
          setSubmitStatus({
            type: 'error',
            message: 'Payment Initiation Failed',
            details: mpesaResult.error || 'Failed to initiate M-Pesa payment. Please check your phone number and try again, or contact us for assistance.',
          })
          setLoading(false)
          return
        }

        // Payment initiation successful - now create booking
        const timestamp = Date.now()
        const bookingResponse = await fetch(`/api/calendar/book?t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            service: selectedServiceNames.length > 0 
              ? selectedServiceNames.join(' + ') 
              : formData.service || 'Lash Service',
            services: selectedServiceNames,
            serviceDetails: cartItems.map(item => ({
              serviceId: item.serviceId,
              name: item.name,
              price: item.price,
              priceUSD: item.priceUSD,
              duration: item.duration,
              categoryId: item.categoryId,
              categoryName: item.categoryName,
            })),
            location: STUDIO_LOCATION,
            isFirstTimeClient: effectiveIsFirstTimeClient === true,
            originalPrice: pricingDetails.originalPrice,
            discount: pricingDetails.discount,
            finalPrice: pricingDetails.finalPrice,
            deposit: pricingDetails.deposit, // M-Pesa = deposit
            paymentType: 'deposit',
            discountType: pricingDetails.discountType,
            promoCode: promoCodeData?.code || null,
            promoCodeType: referralType,
            salonReferral: salonReferralContext,
            giftCardCode: (giftCardData?.valid && giftCardData?.code) ? giftCardData?.code : null,
            paymentMethod: 'paystack',
            paymentStatus: 'pending_payment',
            paymentOrderTrackingId: mpesaResult.orderTrackingId || mpesaResult.reference, // Store Paystack reference
            currency: 'KES', // M-Pesa only supports KES
            desiredLook: 'Custom',
          }),
        })

        const bookingData = await bookingResponse.json()
        if (bookingResponse.ok && bookingData.success && bookingData.bookingId) {
          // Booking created successfully with PesaPal tracking ID
          // User should already be redirected to PesaPal (redirect happens in initiateMpesaPayment)
          setLoading(false)
          return // User will be redirected to payment page
        } else {
          // Booking creation failed but payment was initiated
          // This is a problem - payment was initiated but booking wasn't created
          console.error('Booking creation failed after payment initiation:', bookingData)
          setSubmitStatus({
            type: 'error',
            message: 'Booking Creation Failed',
            details: 'Payment was initiated but booking creation failed. Please contact us immediately with your payment reference.',
          })
          setLoading(false)
          return
        }
      }
    } catch (error: any) {
      console.error('Failed to book appointment:', error)
      setSubmitStatus({
        type: 'error',
        message: 'An error occurred. Please try again later.',
      })
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-background)] via-[color-mix(in srgb,var(--color-background) 88%,var(--color-surface) 12%)] to-[var(--color-surface)] py-6 sm:py-8 md:py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={ref}
          className={`text-center mb-8 sm:mb-12 ${
            inView ? 'animate-fade-in-up' : 'opacity-0'
          }`}
        >
          <div className="relative inline-block">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-brown-dark mb-4 sm:mb-6 relative z-10">
              Book Your Appointment
            </h1>
            <div className="cartoon-sticker -top-2 -right-8 opacity-40 hidden lg:block">
              <div className="sticker-star animate-float-sticker"></div>
            </div>
            <div className="cartoon-sticker -bottom-2 -left-6 opacity-30 hidden md:block">
              <div className="sticker-sparkle animate-rotate-slow"></div>
            </div>
          </div>
          <div className="mt-6 mb-8" />
          {bannerEnabled && bannerMessage && (
            <div className="max-w-2xl mx-auto mb-6 rounded-xl border border-brown-light bg-white/90 px-5 py-4 text-sm md:text-base text-brown-dark/80 shadow-sm">
              <p>
                {bannerMessage.split('\n').map((line, index, array) => (
                  <span key={index}>
                    {line}
                    {index < array.length - 1 && <br />}
                  </span>
                ))}
              </p>
              {bookingWindow?.note && bookingWindow.note.trim().length > 0 && (
                <p className="mt-3 text-xs md:text-sm text-brown-dark/70">{bookingWindow.note.trim()}</p>
              )}
            </div>
          )}
          {discountsLoaded && (depositPercentage > 0 || pricing.isFridayNight) && (
            <div className="bg-white border-l-4 border-[var(--color-accent)]/80 p-5 max-w-2xl mx-auto mb-6 rounded-r-xl shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-[var(--color-accent)]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-base font-semibold text-black">
                    {depositNoticeTemplate && depositNoticeTemplate.trim().length > 0 ? (
                      (() => {
                        let text = depositNoticeTemplate
                          .replace('{deposit}', `${depositPercentage}`)
                          .replace('{fridayDeposit}', `${fridayNightDepositPercentage}`)
                        if (!fridayNightEnabled) {
                          // If Friday-night deposits are disabled, strip any leftover "{fridayDeposit}" tokens
                          text = text.replace('{fridayDeposit}', '')
                        }
                        return text
                      })()
                    ) : pricing.isFridayNight && fridayNightEnabled ? (
                      <>
                        A <span className="text-brown-dark">{fridayNightDepositPercentage}%</span> deposit
                        is required to secure your Friday night booking. Deposits are strictly for securing your appointment and cannot be refunded under any circumstance.
                      </>
                    ) : (
                      <>
                        A {depositPercentage}% deposit is required to secure your booking. Deposits are strictly for securing your appointment and cannot be refunded under any circumstance.
                        {fridayNightEnabled &&
                          fridayNightDepositPercentage !== depositPercentage && (
                            <>
                              {' '}
                              Friday night bookings require a{' '}
                              <span className="text-brown-dark">{fridayNightDepositPercentage}%</span> deposit.
                            </>
                          )}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Picker */}
        <div className="mb-6 sm:mb-8 interactive-card hover-lift rounded-2xl sm:rounded-3xl bg-white/80 border border-brown-light/70 shadow-soft p-3 sm:p-4 md:p-6 animate-slide-in-up relative overflow-hidden">
          <div className="cartoon-sticker top-2 right-2 opacity-30 hidden sm:block">
            <div className="sticker-heart animate-float-sticker"></div>
          </div>
          <Suspense fallback={
            <div className="bg-[var(--color-surface)] rounded-3xl shadow-soft p-6 border border-[var(--color-text)]/10 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4 w-1/3 mx-auto"></div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          }>
            <CalendarPicker
              selectedDate={formData.date}
              onDateSelect={handleDateSelect}
              availableDates={availableDateStrings}
              fullyBookedDates={fullyBookedDates}
              loading={loadingDates}
              minimumBookingDate={availabilityData?.minimumBookingDate}
              availabilityData={availabilityData || undefined}
            />
          </Suspense>
        </div>

        {/* Booking Form */}
        <div className="bg-white/95 border-2 border-brown-light rounded-2xl sm:rounded-3xl shadow-soft interactive-card hover-lift p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 animate-scale-in relative overflow-hidden">
          <div className="cartoon-sticker top-3 left-3 opacity-20 hidden md:block">
            <div className="sticker-lash animate-float-sticker" style={{ animationDelay: '0.5s' }}></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6" noValidate>
            {/* Time Slot Field */}
                  {formData.date && (
                  <div>
                    <label
                      htmlFor="timeSlot"
                      className="block text-sm sm:text-base font-semibold text-brown-dark mb-2.5"
                    >
                      Select Time *
                    </label>
                {loadingSlots ? (
                  <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                    Loading time slots...
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="w-full px-4 py-3 border-2 border-red-300 rounded-lg bg-red-50 text-red-800 font-medium">
                    ⚠️ Slots not available on this day. Check another day.
                  </div>
                ) : (
                <select
                  id="timeSlot"
                  name="timeSlot"
                  required
                  value={formData.timeSlot}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all touch-manipulation hover:border-[var(--color-primary)]/50 focus:scale-[1.02] relative min-h-[48px]"
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

            {/* Personal Details Section - STEP 3 */}
            <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
              <h2 className="text-lg sm:text-xl font-display text-brown-dark mb-4">Personal Details</h2>

            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm sm:text-base font-semibold text-brown-dark mb-2.5"
              >
                Name *
              </label>
              <div className="relative group">
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 sm:py-3 text-base sm:text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60 touch-manipulation hover:border-[var(--color-primary)]/50 focus:scale-[1.01] min-h-[48px]"
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm sm:text-base font-semibold text-brown-dark mb-2.5"
              >
                Email Address *
              </label>
              <div className="relative group">
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 sm:py-3 text-base sm:text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60 touch-manipulation hover:border-[var(--color-primary)]/50 focus:scale-[1.01] min-h-[48px]"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">💌</span>
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm sm:text-base font-semibold text-brown-dark mb-2.5"
              >
                Phone Number *
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  id="phoneCountryCode"
                  name="phoneCountryCode"
                  value={phoneCountryCode}
                  onChange={(event) => setPhoneCountryCode(event.target.value)}
                  className="w-full sm:w-48 px-3 py-3.5 sm:py-3 text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all touch-manipulation min-h-[48px]"
                >
                  {PHONE_COUNTRY_CODES.map((option) => (
                    <option key={`${option.code}-${option.dialCode}`} value={option.dialCode}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={phoneLocalNumber}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^\d\s\-]/g, '')
                    setPhoneLocalNumber(value)
                  }}
                  className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60 touch-manipulation min-h-[48px]"
                  placeholder="700 000 000"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              <p className="mt-2 text-sm text-brown-dark/70">
                Choose your country code and enter the rest of your number. International numbers are accepted.
              </p>
            </div>

            {/* Appointment Preference Field */}
            <div>
              <label
                htmlFor="appointmentPreference"
                className="block text-sm font-semibold text-brown-dark mb-2"
              >
                Appointment Preference (Optional)
              </label>
              <div className="relative group">
                <select
                  id="appointmentPreference"
                  name="appointmentPreference"
                  value={formData.appointmentPreference}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all touch-manipulation hover:border-[var(--color-primary)]/50 focus:scale-[1.01] min-h-[48px]"
                >
                  <option value="">Select your preference...</option>
                  <option value="quiet">Quiet Appointment - I prefer minimal conversation</option>
                  <option value="chat">Small Chat Session - I enjoy friendly conversation</option>
                  <option value="either">Either is fine - I'm flexible</option>
                </select>
              </div>
              <p className="mt-2 text-sm text-brown-dark/70">
                Let us know your preference for conversation during your appointment.
              </p>
            </div>

            {/* Notes Field */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-semibold text-brown-dark mb-2"
              >
                Special Notes / Instructions (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60 touch-manipulation resize-y min-h-[120px]"
                placeholder="Any special preferences, sensitivity notes, or other information you'd like us to know..."
              />
              <p className="mt-2 text-sm text-brown-dark/70">
                Share any additional information that will help us provide the best service (e.g., building access codes, where to park, specific preferences, etc.)
              </p>
            </div>
            </div>

            {/* Service Calculation & Pricing Summary - STEP 4 */}
            <div className="mt-6 sm:mt-8">
              <h2 className="text-lg sm:text-xl font-display text-brown-dark mb-4">Service Calculation</h2>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-brown-dark">
                  Selected Services *
                </label>
                {cartItems.length > 0 && (
                  <Link
                    href="/services"
                    className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                  >
                    + Add More Services
                  </Link>
                )}
              </div>
              {cartItems.length === 0 ? (
                <div className="w-full px-4 py-6 border-2 border-dashed border-brown-light rounded-lg bg-white/50 text-center">
                  <p className="text-sm text-brown-dark/70 mb-3">No services selected</p>
                  <Link
                    href="/services"
                    className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors text-sm font-semibold"
                  >
                    Browse & Add Services
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const price = currency === 'USD' && item.priceUSD !== undefined 
                      ? item.priceUSD 
                      : item.price
                    return (
                      <div
                        key={item.serviceId}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-2 border-brown-light rounded-lg bg-white"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-brown-dark text-sm sm:text-base break-words">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-brown-dark/70">
                            <span>{formatCurrencyContext(price)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{item.duration} min</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-xs bg-brown-light/30 px-2 py-0.5 rounded whitespace-nowrap">{item.categoryName}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeService(item.serviceId)}
                          className="self-start sm:self-auto px-4 py-2.5 sm:px-3 sm:py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium touch-manipulation min-h-[44px] sm:min-h-0"
                          aria-label={`Remove ${item.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                  <div className="mt-4 p-4 bg-brown-light/20 rounded-lg border border-brown-light">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm sm:text-base">
                      <span className="font-semibold text-brown-dark break-words pr-2">Subtotal ({cartItems.length} {cartItems.length === 1 ? 'service' : 'services'}):</span>
                      <span className="font-semibold text-brown-dark whitespace-nowrap">{formatCurrencyContext(getTotalPrice(currency))}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm text-brown-dark/70 pt-2 border-t border-brown-light/50">
                      <span>Total Duration:</span>
                      <span className="whitespace-nowrap">{getTotalDuration()} minutes</span>
                    </div>
                      {cartItems.length > 1 && (
                        <div className="text-xs text-brown-dark/60 italic pt-1">
                          💡 Deposit will be calculated as {depositPercentage}% of the total
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {hasFillServiceSelected && (
                <div className="mt-4 p-4 border-2 border-amber-300 bg-amber-50/60 rounded-xl">
                  <label htmlFor="lastFullSetDate" className="block text-sm font-semibold text-brown-dark mb-2">
                    When was your last full lash set? *
                  </label>
                  <input
                    type="date"
                    id="lastFullSetDate"
                    name="lastFullSetDate"
                    required
                    value={formData.lastFullSetDate}
                    onChange={handleChange}
                    max={lastFullSetDateMax}
                    className="w-full px-4 py-3.5 sm:py-3 text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all touch-manipulation min-h-[48px]"
                  />
                  <p className="mt-2 text-xs text-brown-dark/80">
                    Fills are only available within {INFILL_MAX_DAYS} days of your last full set so we can maintain your lash health.
                  </p>
                  {!formData.date && (
                    <p className="mt-1 text-xs text-brown-dark/70">
                      Select your appointment date above and we&apos;ll automatically check if you qualify for a fill.
                    </p>
                  )}
                  {typeof daysSinceLastFullSet === 'number' && !fillOutsideWindow && formData.date && (
                    <p className="mt-3 text-sm text-green-800 bg-green-100 border border-green-200 rounded-lg px-3 py-2">
                      Great! It&apos;s been {daysSinceLastFullSet} day{daysSinceLastFullSet === 1 ? '' : 's'} since your last full set, so a fill is perfect.
                    </p>
                  )}
                  {fillOutsideWindow && (
                    <div className="mt-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-3">
                      Looks like it&apos;s been {daysSinceLastFullSet} days since your last full set. Fills are available only within{' '}
                      {INFILL_MAX_DAYS} days. Please{' '}
                      <Link href="/services" className="font-semibold underline">
                        book a new full set
                      </Link>{' '}
                      so we can give you the best retention.
                    </div>
                  )}
                </div>
              )}

              {/* Unified Promo Code / Gift Card Field */}
              {cartItems.length > 0 && (
                <div className="mt-4">
                  <label
                    htmlFor="promoCode"
                    className="block text-sm font-semibold text-brown-dark mb-2"
                  >
                    Promo Code (Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                    <input
                      type="text"
                      id="promoCode"
                      value={promoCode}
                      onChange={(e) => {
                        const value = e.target.value
                        setPromoCode(value)
                        // Clear previous validation
                        setPromoError('')
                        setGiftCardError('')
                        if (!value.trim()) {
                          setPromoCodeData(null)
                          setGiftCardData(null)
                        }
                      }}
                      onBlur={() => {
                        if (promoCode.trim() && appliedReturningDiscountPercent === 0) {
                          validateUnifiedCode(promoCode)
                        }
                      }}
                      disabled={selectedServiceIsFill || appliedReturningDiscountPercent > 0}
                      placeholder="Enter promo code"
                      className="flex-1 px-4 py-3.5 sm:py-3 text-base border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60 touch-manipulation min-h-[48px]"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => validateUnifiedCode(promoCode)}
                      disabled={selectedServiceIsFill || validatingPromo || !promoCode.trim() || appliedReturningDiscountPercent > 0}
                      className="bg-brown-dark text-white px-6 py-3.5 sm:py-3 rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px] sm:min-h-[48px] font-semibold text-base"
                    >
                      {validatingPromo ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  <p className="text-xs text-brown-dark/70 mt-1">
                    Have a promo code from a card? Enter it here to apply your discount. Note: Some promo codes are only available for returning clients.
                  </p>
                  {(promoError || giftCardError) && (
                    <div className="mt-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-red-600 text-xl font-bold flex-shrink-0">⚠️</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800 mb-1">Code Not Valid</p>
                          <p className="text-sm text-red-700">{promoError || giftCardError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoError('')
                            setGiftCardError('')
                            setPromoCode('')
                            setPromoCodeData(null)
                            setGiftCardData(null)
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
                      {promoCodeData.isReferral && !promoCodeData.isSalonReferral && (
                        <p className="text-xs text-green-700 mt-1">
                          {promoCodeData.appliesToFriend === true
                            ? 'This referral gives you 10% off right now. Your stylist will thank your referrer!'
                            : 'Your 10% loyalty reward is ready—enjoy it on this booking using the same referral code you shared.'}
                        </p>
                      )}
                      {promoCodeData.isSalonReferral && (
                        <p className="text-xs text-green-700 mt-1">
                          {(() => {
                            const partnerRole =
                              promoCodeData.salonPartnerType === 'beautician'
                                ? 'beautician'
                                : promoCodeData.salonPartnerType === 'influencer'
                                ? 'influencer'
                                : 'salon partner'
                            const partnerName = promoCodeData.salonName || `your ${partnerRole}`
                            return (
                              <>
                                Enjoy {promoCodeData.clientDiscountPercent ?? promoCodeData.discountValue ?? 0}% off courtesy of {partnerName}. We'll also notify them about your booking so their {promoCodeData.salonCommissionPercent ?? 0}% commission can be processed.
                              </>
                            )
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                  {giftCardData && giftCardData.valid && (
                    <div className="mt-3 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                      <p className="text-sm text-green-800 font-semibold">
                        ✓ Gift card "{giftCardData.code}" applied! Available balance: {formatCurrencyContext(giftCardData.amount)}
                      </p>
                      {giftCardData.amount < depositAmount && (
                        <p className="text-xs text-green-700 mt-1">
                          Your gift card will cover {formatCurrencyContext(giftCardData.amount)}. You'll need to pay the remaining balance.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {cartItems.length > 0 && depositAmount > 0 && (
                <div className="mt-3 p-4 bg-brown-light/20 border-2 border-brown-light rounded-lg">
                  {checkingFirstTime && formData.email && (
                    <div className="mb-3 text-sm text-brown-dark/70 italic">
                      Checking eligibility for first-time client discount...
                    </div>
                  )}
                  {/* Returning discount loading and error messages removed - discounts will be applied manually */}

                  {selectedServiceIsFill && (
                    <div className="mb-3 p-3 rounded-lg border border-[#facc15] bg-[#fef3c7] text-sm leading-snug text-[#713f12]">
                      Fill appointments are not eligible for promo codes or loyalty discounts. Bookings are processed at the standard rate, but you can still earn referral rewards by sharing your code with friends after checkout.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => toggleReferralMode('friend')}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        friendReferralActive
                          ? 'bg-brown-dark text-white border-brown-dark shadow-md'
                          : 'bg-white text-brown-dark border-brown-light hover:bg-brown-light/30'
                      }`}
                      disabled={selectedServiceIsFill || effectiveIsFirstTimeClient !== true}
                      title={
                        selectedServiceIsFill
                          ? 'Fill appointments are not eligible for discounts.'
                          : effectiveIsFirstTimeClient === true
                          ? undefined
                          : 'Friend referrals are available for first-time clients only.'
                      }
                    >
                      {friendReferralActive ? 'Using a friend referral' : 'Referred by a friend?'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleReferralMode('salon')}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                        salonReferralActive
                          ? 'bg-brown-dark text-white border-brown-dark shadow-md'
                          : 'bg-white text-brown-dark border-brown-light hover:bg-brown-light/30'
                      }`}
                      disabled={selectedServiceIsFill}
                      title={selectedServiceIsFill ? 'Fill appointments are not eligible for discounts.' : undefined}
                    >
                    {salonReferralActive ? 'Using a partner referral' : 'Referred by a salon / beautician / influencer?'}
                    </button>
                  </div>

                  {friendReferralActive && (
                    <div className="mb-3 p-3 rounded-lg border border-[#cbd5e1] bg-white/95 text-xs text-brown-dark/70">
                      Use the email your friend shared with LashDiary and enter their referral code above. Friend referrals work for first-time visits only.
                    </div>
                  )}

                  {salonReferralActive && (
                  <div className="mb-3 p-3 rounded-lg border border-[#cbd5e1] bg-white/95 text-xs text-brown-dark/70">
                    Present the promo code from your partner (salon, beautician, or influencer) and enter it above. You'll receive{' '}
                    {promoCodeData?.clientDiscountPercent ?? promoCodeData?.discountValue ?? 8}% off this booking, and your partner earns a commission as a thank-you.
                  </div>
                  )}

                  {discountsLoaded &&
                    effectiveIsFirstTimeClient === true &&
                    firstTimeDiscountEnabled &&
                    !isReferralBasedBooking &&
                    !selectedServiceIsFill &&
                    !promoOverridesFirstTimeNotice && (
                    <div className="mb-3 p-3 rounded-lg border border-[#cbd5e1] bg-white/95">
                      <p
                        className="text-base font-semibold leading-snug"
                        style={{ color: '#111827' }}
                      >
                        🎉 You qualify for our {firstTimeDiscountPercentage}% first-time client discount!
                      </p>
                      <p
                        className="mt-2 text-sm leading-snug"
                        style={{ color: '#1f2937' }}
                      >
                        First-time clients cannot use promo codes.
                      </p>
                    </div>
                  )}

                  {/* Returning client discount UI removed - discounts will be applied manually */}
                  <div className="space-y-2.5 text-xs sm:text-sm md:text-base">
                    {cartItems.length > 1 && (
                      <div className="mb-2 pb-2 border-b border-brown-light/50">
                        <div className="text-xs text-brown-dark/70 mb-1">Services Breakdown:</div>
                        {cartItems.map((item, idx) => {
                          const itemPrice = currency === 'USD' && item.priceUSD !== undefined 
                            ? item.priceUSD 
                            : item.price
                          return (
                            <div key={item.serviceId} className="flex justify-between items-center text-xs text-brown-dark/80 mb-1">
                              <span>{idx + 1}. {item.name}</span>
                              <span>{formatCurrencyContext(itemPrice)}</span>
                            </div>
                          )
                        })}
                        <div className="flex justify-between items-center text-xs font-semibold text-brown-dark mt-2 pt-2 border-t border-brown-light/30">
                          <span>Subtotal:</span>
                          <span>{formatCurrencyContext(pricing.originalPrice)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-start sm:items-center flex-wrap gap-2">
                      <span className="text-brown-dark font-semibold text-sm sm:text-base break-words pr-2">
                        {cartItems.length > 1 ? 'Total Service Price:' : 'Service Price:'}
                      </span>
                      <span className="text-brown-dark font-bold text-sm sm:text-base whitespace-nowrap">{formatCurrencyContext(pricing.originalPrice)}</span>
                    </div>
                    {pricing.discountType === 'first-time' && (
                      <div className="flex justify-between items-start sm:items-center flex-wrap gap-2 text-green-700">
                        <span className="font-semibold text-xs sm:text-sm break-words pr-2">First-Time Client Discount ({firstTimeDiscountPercentage}%):</span>
                        <span className="font-bold text-xs sm:text-sm whitespace-nowrap">- {formatCurrencyContext(pricing.discount)}</span>
                      </div>
                    )}
                    {/* Returning client discount display removed - discounts will be applied manually */}
                    {pricing.discountType === 'promo' && promoCodeData && (
                      <div className="flex justify-between items-start sm:items-center flex-wrap gap-2 text-blue-700">
                        <span className="font-semibold text-xs sm:text-sm break-words pr-2">
                          Promo Code Discount ({promoCodeData.code}): 
                          {promoCodeData.discountType === 'percentage' 
                            ? ` ${promoCodeData.discountValue}%`
                            : ` ${formatCurrencyContext(promoCodeData.discountValue)}`
                          }
                        </span>
                        <span className="font-bold text-xs sm:text-sm whitespace-nowrap">- {formatCurrencyContext(pricing.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start sm:items-center flex-wrap gap-2 pt-2 border-t border-brown-light/50">
                      <span className="text-brown-dark font-semibold text-sm sm:text-base break-words pr-2">Final Price:</span>
                      <span className="text-brown-dark font-bold text-base sm:text-lg whitespace-nowrap">{formatCurrencyContext(pricing.finalPrice)}</span>
                    </div>
                    <div className="flex justify-between items-start sm:items-center flex-wrap gap-2 pt-2 border-t border-brown-light/50">
                      <span className="text-brown-dark font-semibold text-xs sm:text-sm break-words pr-2">
                        Required Deposit ({pricing.depositPercentage}%{pricing.isFridayNight ? ' - Friday Night' : ''}):
                      </span>
                      <span className="text-brown-dark font-bold text-base sm:text-lg whitespace-nowrap">{formatCurrencyContext(depositAmount)}</span>
                    </div>
                    {cartItems.length > 1 && (
                      <div className="text-xs text-brown-dark/60 italic pt-1">
                        💡 Calculation: {pricing.depositPercentage}% of {formatCurrencyContext(pricing.finalPrice)} = {formatCurrencyContext(depositAmount)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-brown-dark/70 mt-3 pt-3 border-t border-brown-light/50">
                    You will receive payment instructions via email after booking. The remaining balance will be paid on the day of your appointment.
                  </p>
                </div>
              )}
            </div>

            {/* Checkout Section - STEP 5 */}
            <div className="mt-6 sm:mt-8">
              <h2 className="text-lg sm:text-xl font-display text-brown-dark mb-4">Checkout</h2>
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

            {/* Payment Info */}
            <div id="payment-method-section" className="rounded-lg border-2 border-brown-light bg-white p-4 sm:p-5">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Secure Payment</p>
                    <p>You'll be redirected to Paystack's secure payment page where you can choose your preferred payment method (Card or M-Pesa). We accept both KES and USD.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Acknowledgement */}
            <div
              id="terms-consent"
              className={`rounded-lg border-2 p-5 transition-all ${
                termsAcknowledgementError ? 'border-red-300 bg-red-50' : 'border-brown-light bg-pink-light/30'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked)
                    if (event.target.checked) {
                      setTermsAcknowledgementError(false)
                    }
                  }}
                  className="mt-1 h-5 w-5 sm:h-6 sm:w-6 rounded border-2 border-brown-light text-brown-dark focus:ring-brown-dark flex-shrink-0 touch-manipulation"
                />
                <span className="text-sm sm:text-base text-brown-dark leading-relaxed">
                  I have read and agree to The Lash Diary{' '}
                  <a
                    href="/policies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brown-dark underline font-semibold hover:text-brown"
                  >
                    Policies
                  </a>
                  {' '}and I have read and agree to follow the{' '}
                  <a
                    href="/before-your-appointment"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brown-dark underline font-semibold hover:text-brown"
                  >
                    Pre-Appointment Guidelines (DO's and DON'Ts)
                  </a>
                </span>
              </label>
              {termsAcknowledgementError && (
                <p className="mt-2 text-xs text-red-600">
                  Please review and accept the Policies and Pre-Appointment Guidelines before continuing.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loading ||
                loadingDates ||
                loadingSlots ||
                !formData.date ||
                !formData.timeSlot ||
                cartItems.length === 0 ||
                fillInfoMissing ||
                fillOutsideWindow ||
                mpesaStatus.loading ||
                !termsAccepted ||
                false // Payment method will be selected on Paystack page
              }
              className="btn-cute hover-lift w-full bg-brown-dark hover:bg-brown text-white font-semibold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-4 rounded-full shadow-soft-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation relative overflow-hidden group min-h-[56px] sm:min-h-[52px]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading || mpesaStatus.loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    Book Appointment & Pay →
                    <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </>
                )}
              </span>
            </button>
            {cartItems.length === 0 && (
              <p className="text-sm text-red-600 text-center mt-2">
                Please add at least one service to continue. <Link href="/services" className="underline">Browse services</Link>
              </p>
            )}
          </form>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-white border-2 border-brown-light rounded-lg shadow-soft p-8 text-center hover-lift animate-slide-in-up relative overflow-hidden">
          <div className="cartoon-sticker top-4 left-4 opacity-25 hidden sm:block">
            <div className="sticker-heart animate-float-sticker"></div>
          </div>
          <h3 className="text-2xl font-display text-brown-dark mb-4">
            Need Assistance?
          </h3>
          <p className="text-brown-dark/80 mb-4">
            Our team is here to help you find the perfect appointment time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@lashdiary.co.ke"
              className="btn-cute hover-lift inline-block bg-brown-dark text-white font-semibold px-6 py-3 rounded-full hover:bg-brown transition-colors relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Email Us
                <span className="text-lg group-hover:scale-110 transition-transform">💌</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && bookingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] px-4 py-4 sm:py-6 sm:p-8 touch-manipulation">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-fade-in-up overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={handleCloseSuccessModal}
              className="absolute top-3 right-3 md:top-5 md:right-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brown-dark focus:ring-offset-2 rounded-full bg-white/80 backdrop-blur p-2.5 sm:p-2 z-10 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close confirmation"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 relative">
              <div className="cartoon-sticker top-8 right-8 opacity-30 hidden sm:block">
                <div className="sticker-star animate-float-sticker"></div>
              </div>
              {/* Success Icon */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="mx-auto w-18 h-18 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-scale-in relative">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="absolute -bottom-1 -left-1 text-xl animate-gentle-bounce">🎉</span>
                  <div className="cartoon-sticker -top-2 -right-2 opacity-50">
                    <div className="sticker-sparkle"></div>
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display text-brown-dark font-bold mb-2 animate-slide-in-up">
                  Appointment Confirmed!
                </h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Your booking has been successfully created.
                </p>
              </div>

              {/* Booking Details */}
              <div className="bg-brown-light/20 border border-brown-light rounded-xl p-4 sm:p-6 mb-6">
                <h3 className="font-display text-brown-dark text-lg sm:text-xl font-semibold mb-4">Booking Details</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
                  <div className="flex justify-between sm:flex-col sm:items-start gap-2">
                    <dt className="text-brown-dark/70 font-medium text-xs sm:text-sm">Name</dt>
                    <dd className="text-brown-dark font-semibold break-words text-right sm:text-left text-sm sm:text-base">{bookingDetails!.name}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start gap-2">
                    <dt className="text-brown-dark/70 font-medium text-xs sm:text-sm">Date</dt>
                    <dd className="text-brown-dark font-semibold break-words text-right sm:text-left text-sm sm:text-base">{bookingDetails!.date}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start gap-2">
                    <dt className="text-brown-dark/70 font-medium text-xs sm:text-sm">Time</dt>
                    <dd className="text-brown-dark font-semibold break-words text-right sm:text-left text-sm sm:text-base">{bookingDetails!.time} – {bookingDetails!.endTime}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start gap-2">
                    <dt className="text-brown-dark/70 font-medium text-xs sm:text-sm">Service</dt>
                    <dd className="text-brown-dark font-semibold break-words text-right sm:text-left text-sm sm:text-base">{bookingDetails!.service}</dd>
                  </div>
                  {bookingDetails!.isFullPayment ? (
                    <div className="flex justify-between sm:flex-col sm:items-start gap-2">
                      <dt className="text-brown-dark/70 font-medium">Full Payment</dt>
                      <dd className="text-brown-dark font-bold break-words text-right sm:text-left">{bookingDetails!.finalPrice}</dd>
                    </div>
                  ) : (
                    <>
                  <div className="flex justify-between sm:flex-col sm:items-start gap-2">
                    <dt className="text-brown-dark/70 font-medium">Deposit Required</dt>
                    <dd className="text-brown-dark font-bold break-words text-right sm:text-left">{bookingDetails!.deposit}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start gap-2">
                    <dt className="text-brown-dark/70 font-medium">Final Price</dt>
                    <dd className="text-brown-dark font-bold break-words text-right sm:text-left">{bookingDetails!.finalPrice}</dd>
                  </div>
                    </>
                  )}
                </dl>
              </div>

              {/* Payment Instructions */}
              <div className="bg-brown-light/15 border-l-4 border-brown-dark p-4 sm:p-5 rounded-lg mb-4 text-xs sm:text-sm md:text-base">
                <p className="text-brown-dark font-semibold mb-2">
                  {bookingDetails!.isFullPayment ? 'Payment Status:' : 'Payment Instructions:'}
                </p>
                <p className="text-brown-dark/80">
                  {bookingDetails!.isFullPayment 
                    ? `Your appointment is fully paid and confirmed! You will receive a confirmation email shortly. No remaining balance is due on the day of your appointment.`
                    : `You will receive payment instructions via email. Please pay the ${bookingDetails!.deposit} deposit to secure your appointment. The remaining balance will be handled on the day of your appointment.`}
                </p>
              </div>

              {/* Message */}
              <div className="bg-brown-light/15 border-l-4 border-brown-dark p-4 rounded-lg mb-6 text-sm sm:text-base">
                <p className="text-brown-dark/80">
                  A confirmation email has been sent to your address. If you don't see it within a few minutes, please check your spam or promotions folder and mark it as "Not spam".
                </p>
              </div>

              {bookingDetails!.returningClientEligible && (
                <div className="rounded-xl p-5 sm:p-6 mb-6 border border-[var(--color-primary)]/20 bg-white text-[var(--color-text)] shadow-md">
                  <h3 className="font-display text-lg sm:text-xl font-semibold mb-2">
                    Share 10% with a friend ✨
                  </h3>
                  <p className="text-sm sm:text-base mb-4 leading-relaxed">
                    Invite a friend and gift them 10% off their first visit. After they book, the same code unlocks 10% off your next appointment.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateReferralCode(bookingDetails!.email, bookingDetails!.name)}
                    disabled={referralStatus === 'loading'}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-full font-semibold shadow-sm transition-colors disabled:opacity-60 bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-dark)]"
                  >
                    {referralStatus === 'loading' ? 'Preparing your code…' : 'Send me my referral code'}
                  </button>
                  {referralDetails && referralDetails?.code && (
                    <div className="mt-4 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-background)] px-4 py-3">
                      <p className="text-sm font-semibold">
                        Your code: <span className="text-[var(--color-primary)]">{referralDetails?.code}</span>
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--color-text)]/70 mt-1">
                        Share this with a friend. Once they book, come back and use it for your loyalty reward.
                      </p>
                    </div>
                  )}
                  {referralMessage && (
                    <p className="mt-3 text-sm text-green-600">{referralMessage}</p>
                  )}
                  {referralError && (
                    <p className="mt-3 text-sm text-red-600">{referralError}</p>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={handleCloseSuccessModal}
                className="btn-cute hover-lift w-full bg-brown-dark hover:bg-brown text-white font-semibold px-5 py-3 rounded-full transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brown-dark focus:ring-offset-2 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  Got it!
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

