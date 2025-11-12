'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { useInView } from 'react-intersection-observer'
import CalendarPicker from '@/components/CalendarPicker'
import Link from 'next/link'

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
  price: number
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

export default function Booking() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

const [servicePrices, setServicePrices] = useState<Record<string, number>>({})
  const [serviceDurations, setServiceDurations] = useState<Record<string, number>>({})
const [serviceCategoryMap, setServiceCategoryMap] = useState<Record<string, { id: string; name: string }>>({})
  const [serviceOptionGroups, setServiceOptionGroups] = useState<ServiceOptionGroup[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  const STUDIO_LOCATION = process.env.NEXT_PUBLIC_STUDIO_LOCATION || 'LashDiary Studio, Nairobi, Kenya'

  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(PHONE_COUNTRY_CODES[0]?.dialCode || '+254')
  const [phoneLocalNumber, setPhoneLocalNumber] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    timeSlot: '',
    notes: '',
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
  email: string
  returningClientEligible: boolean
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
const [returningDiscountPercent, setReturningDiscountPercent] = useState(0)
const [lastPaymentDate, setLastPaymentDate] = useState<string | null>(null)
const [returningDaysSince, setReturningDaysSince] = useState<number | null>(null)
const [loadingReturningDiscount, setLoadingReturningDiscount] = useState(false)
const [returningInfoError, setReturningInfoError] = useState<string | null>(null)
const [discounts, setDiscounts] = useState<{
  firstTimeClientDiscount: { enabled: boolean; percentage: number }
  returningClientDiscount: { enabled: boolean; tier30Percentage: number; tier45Percentage: number }
  depositPercentage: number
} | null>(null)
const [discountsLoaded, setDiscountsLoaded] = useState(false)
  const [clientPhotoUpload, setClientPhotoUpload] = useState<{
    url: string
    filename?: string | null
    originalName?: string | null
    mimeType?: string | null
    size?: number | null
  } | null>(null)
  const [clientPhotoPreview, setClientPhotoPreview] = useState<string | null>(null)
  const [clientPhotoUploading, setClientPhotoUploading] = useState(false)
  const [clientPhotoError, setClientPhotoError] = useState<string | null>(null)
  const [clientPhotoSuccessMessage, setClientPhotoSuccessMessage] = useState<string | null>(null)
  const [clientPhotoSample, setClientPhotoSample] = useState<{ url: string | null; instructions: string | null }>({
    url: null,
    instructions: null,
  })
  const [photoInputKey, setPhotoInputKey] = useState(0)
const [termsAccepted, setTermsAccepted] = useState(false)
const [termsAcknowledgementError, setTermsAcknowledgementError] = useState(false)

  const defaultPhotoInstructions =
    'Snap a clear, landscape photo of both eyes looking straight ahead in good lighting. It’s optional but helps us pre-map your custom look before you arrive.'
  const displayPhotoInstructions =
    typeof clientPhotoSample.instructions === 'string' && clientPhotoSample.instructions.trim().length > 0
      ? clientPhotoSample.instructions.trim()
      : defaultPhotoInstructions

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 100)
  }

  const handleRemoveClientPhoto = () => {
    setClientPhotoUpload(null)
    setClientPhotoPreview(null)
    setClientPhotoSuccessMessage(null)
    setClientPhotoError(null)
    setPhotoInputKey((prev) => prev + 1)
  }

  const handleClientPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setClientPhotoError('Please upload a JPG, PNG, or WebP image.')
      setClientPhotoSuccessMessage(null)
      setClientPhotoUpload(null)
      setClientPhotoPreview(null)
      setPhotoInputKey((prev) => prev + 1)
      return
    }

    if (file.size > 6 * 1024 * 1024) {
      setClientPhotoError('Please keep your photo under 6MB in size.')
      setClientPhotoSuccessMessage(null)
      setClientPhotoUpload(null)
      setClientPhotoPreview(null)
      setPhotoInputKey((prev) => prev + 1)
      return
    }

    setClientPhotoError(null)
    setClientPhotoSuccessMessage(null)
    setClientPhotoUpload(null)
    setClientPhotoPreview(null)

    setClientPhotoUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    fetch('/api/booking/client-photo/upload', {
      method: 'POST',
      body: formData,
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Could not upload your photo.')
        }
        setClientPhotoUpload({
          url: data.url,
          filename: data.filename || null,
          originalName: data.originalName || file.name,
          mimeType: data.mimeType || file.type,
          size: typeof data.size === 'number' ? data.size : file.size,
        })
        setClientPhotoPreview(data.url)
        setClientPhotoSuccessMessage('Photo uploaded! Thank you—we\'ll map your lashes before you arrive.')
      })
      .catch((error: any) => {
        console.error('Client photo upload failed:', error)
        setClientPhotoError(error?.message || 'We could not upload your photo. Please try again.')
        setPhotoInputKey((prev) => prev + 1)
      })
      .finally(() => {
        setClientPhotoUploading(false)
      })
  }


  // Check if email is a first-time client
  useEffect(() => {
    const checkFirstTimeClient = async () => {
      if (!formData.email || !formData.email.includes('@')) {
        setIsFirstTimeClient(null)
        return
      }

      setCheckingFirstTime(true)
      try {
        const response = await fetch(`/api/booking/check-first-time?email=${encodeURIComponent(formData.email)}`, {
          cache: 'no-store',
        })
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

  useEffect(() => {
    let cancelled = false

    const loadClientPhotoSample = async () => {
      try {
        const response = await fetch('/api/booking/client-photo/settings', { cache: 'no-store' })
        if (!response.ok || cancelled) {
          return
        }
        const data = await response.json()
        if (cancelled) return
        setClientPhotoSample({
          url: typeof data?.sampleImageUrl === 'string' ? data.sampleImageUrl : null,
          instructions: typeof data?.instructions === 'string' ? data.instructions : null,
        })
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load client photo sample:', error)
        }
      }
    }

    loadClientPhotoSample()

    return () => {
      cancelled = true
    }
  }, [])

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

  useEffect(() => {
    const email = formData.email?.trim().toLowerCase()
    const returningEnabled = discounts?.returningClientDiscount?.enabled ?? true
    if (!email || !email.includes('@') || !formData.date) {
      setReturningDiscountPercent(0)
      setLastPaymentDate(null)
      setReturningDaysSince(null)
      setReturningInfoError(null)
      setLoadingReturningDiscount(false)
      return
    }

    if (isFirstTimeClient === null) {
      setLoadingReturningDiscount(false)
      setReturningInfoError(null)
      return
    }

    if (isFirstTimeClient === true) {
      setReturningDiscountPercent(0)
      setLastPaymentDate(null)
      setReturningDaysSince(null)
      setReturningInfoError(null)
      setLoadingReturningDiscount(false)
      return
    }

    const isFill = isFillService(formData.service, serviceCategoryMap)
    if (isFill) {
      setReturningDiscountPercent(0)
      setLastPaymentDate(null)
      setReturningDaysSince(null)
      setReturningInfoError(null)
      setLoadingReturningDiscount(false)
      return
    }

    if (!returningEnabled) {
      setReturningDiscountPercent(0)
      setLastPaymentDate(null)
      setReturningDaysSince(null)
      setReturningInfoError(null)
      setLoadingReturningDiscount(false)
      return
    }

    let cancelled = false
    setLoadingReturningDiscount(true)

    fetch(`/api/booking/returning-discount?email=${encodeURIComponent(email)}&date=${formData.date}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (!response.ok) {
          setReturningDiscountPercent(0)
          setLastPaymentDate(null)
          setReturningDaysSince(null)
          setReturningInfoError(data?.error || 'Unable to load returning discount')
        } else {
          setReturningDiscountPercent(
            typeof data?.discountPercent === 'number' ? data.discountPercent : 0,
          )
          setLastPaymentDate(typeof data?.lastPaidAt === 'string' ? data.lastPaidAt : null)
          setReturningDaysSince(
            typeof data?.daysSince === 'number' ? data.daysSince : null,
          )
          setReturningInfoError(null)
        }
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Error fetching returning discount:', error)
        setReturningDiscountPercent(0)
        setLastPaymentDate(null)
        setReturningDaysSince(null)
        setReturningInfoError('Error fetching returning discount')
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingReturningDiscount(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [formData.email, formData.date, formData.service, isFirstTimeClient, serviceCategoryMap, discounts])

  useEffect(() => {
    fetch('/api/discounts', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const normalized = {
          firstTimeClientDiscount: {
            enabled: Boolean(data?.firstTimeClientDiscount?.enabled),
            percentage: Number(data?.firstTimeClientDiscount?.percentage ?? 0),
          },
          returningClientDiscount: {
            enabled: Boolean(data?.returningClientDiscount?.enabled),
            tier30Percentage: Number(
              data?.returningClientDiscount?.tier30Percentage ??
                data?.returningClientDiscount?.within30DaysPercentage ??
                data?.returningClientDiscount?.percentage ??
                0,
            ),
            tier45Percentage: Number(
              data?.returningClientDiscount?.tier45Percentage ??
                data?.returningClientDiscount?.within31To45DaysPercentage ??
                data?.returningClientDiscount?.percentage ??
                0,
            ),
          },
          depositPercentage: Number(data?.depositPercentage ?? 0),
        }
        setDiscounts(normalized)
      })
      .catch((error) => {
        console.error('Error loading discounts:', error)
      })
      .finally(() => {
        setDiscountsLoaded(true)
      })
  }, [])

  const firstTimeDiscountEnabled = discounts?.firstTimeClientDiscount?.enabled ?? false
  const firstTimeDiscountPercentage = discounts?.firstTimeClientDiscount?.percentage ?? 0
  const depositPercentage = discounts?.depositPercentage ?? 0
  const returningClientDiscountConfig = discounts?.returningClientDiscount
  const returningClientDiscountEnabled = returningClientDiscountConfig?.enabled ?? false
  const returningTier30Percentage = returningClientDiscountConfig?.tier30Percentage ?? 0
  const returningTier45Percentage = returningClientDiscountConfig?.tier45Percentage ?? 0

  const safeReturningDaysSince =
    typeof returningDaysSince === 'number' ? Math.max(0, Math.floor(returningDaysSince)) : null
  const effectiveIsFirstTimeClient = isFirstTimeClient === true
  const effectiveIsReturningClient = isFirstTimeClient === false
  const selectedServiceIsFill = isFillService(formData.service, serviceCategoryMap)
  const rawReturningDiscountPercent = returningClientDiscountEnabled ? returningDiscountPercent : 0
  const appliedReturningDiscountPercent =
    !effectiveIsFirstTimeClient && !selectedServiceIsFill && rawReturningDiscountPercent > 0
      ? rawReturningDiscountPercent
      : 0
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

  // Load services data from API
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch('/api/services', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load services')
        }
        const data = await response.json()

        const groups: ServiceOptionGroup[] = Array.isArray(data?.categories)
          ? data.categories.map((category: any) => {
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
        const durations: Record<string, number> = {}

        const categoryMap: Record<string, { id: string; name: string }> = {}

        groups.forEach((group) => {
          group.options.forEach((option) => {
            prices[option.name] = option.price
            durations[option.name] = option.duration
            categoryMap[option.name] = { id: option.categoryId, name: option.categoryName }
          })
        })

        setServicePrices(prices)
        setServiceDurations(durations)
        setServiceOptionGroups(groups)
        setServiceCategoryMap(categoryMap)
      } catch (error) {
        console.error('Error loading services:', error)
      } finally {
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

  // Validate promo code (allows referral flow for first-time clients)
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
      const response = await fetch('/api/promo-codes/validate', {
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

  // Calculate pricing with discount (first-time OR promo code, not both)
  const calculatePricing = (service: string) => {
    if (!service || !servicePrices[service]) {
      return {
        originalPrice: 0,
        discount: 0,
        finalPrice: 0,
        deposit: 0,
        discountType: null as 'first-time' | 'promo' | 'returning' | null,
      }
    }

    const originalPrice = servicePrices[service]
    const isReferralPromo = Boolean(promoCodeData?.valid && promoCodeData?.isReferral)
    const isSalonReferralPromo = Boolean(promoCodeData?.valid && promoCodeData?.isSalonReferral)
    const referralPromoApplied = isReferralPromo || isSalonReferralPromo
    const isFill = isFillService(service, serviceCategoryMap)

    const firstTimeEligible =
      !isFill &&
      firstTimeDiscountEnabled &&
      effectiveIsFirstTimeClient === true &&
      !referralPromoApplied

    const promoEligible = Boolean(
      promoCodeData?.valid &&
      !isFill &&
      (
        effectiveIsReturningClient === true ||
        (effectiveIsFirstTimeClient === true &&
          (promoCodeData.allowFirstTimeClient === true || isSalonReferralPromo))
      ),
    )

    const returningEligible =
      !isFill &&
      appliedReturningDiscountPercent > 0 &&
      !promoEligible &&
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
    const deposit = Math.round(finalPrice * (depositPercentage / 100))

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
    timeSlots?: {
      weekdays?: Array<{ hour: number; minute: number; label: string }>
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
    let base = `Bookings open monthly. Current calendar: ${currentWindowLabel}.`
    if (nextWindowLabel && nextOpensDisplay) {
      base += ` ${nextWindowLabel} opens ${nextOpensDisplay}.`
    } else if (nextWindowLabel) {
      base += ` Next calendar: ${nextWindowLabel}.`
    } else if (nextOpensDisplay) {
      base += ` Next booking release: ${nextOpensDisplay}.`
    }
    return base
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

  // Load availability data
  useEffect(() => {
    fetch('/api/availability', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const normalized = {
          businessHours: data?.businessHours || {},
          timeSlots: data?.timeSlots || {},
          bookingWindow: {
            current: { ...(data?.bookingWindow?.current ?? {}) },
            next: { ...(data?.bookingWindow?.next ?? {}) },
            bookingLink: data?.bookingWindow?.bookingLink ?? '',
            note: data?.bookingWindow?.note ?? '',
            bannerMessage: data?.bookingWindow?.bannerMessage ?? '',
          },
        }
        setAvailabilityData(normalized)
      })
      .catch((error) => {
        console.error('Error loading availability:', error)
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadAvailableDates = async () => {
      setLoadingDates(true)
      try {
        const response = await fetch('/api/calendar/available-slots', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to load available dates: ${response.status}`)
        }
        const data = await response.json()
        if (cancelled) return
        const dates: AvailableDate[] = Array.isArray(data?.dates) ? data.dates : []
        const dateStrings = dates.map((entry) => entry.value)
        setAvailableDates(dates)
        setAvailableDateStrings(dateStrings)
        setFullyBookedDates(Array.isArray(data?.fullyBookedDates) ? data.fullyBookedDates : [])
        if (data?.bookingWindow) {
          setAvailabilityData((prev) => {
            const previous = prev ?? { businessHours: {}, timeSlots: {}, bookingWindow: {} }
            return {
              ...previous,
              bookingWindow: {
                current: { ...(data.bookingWindow.current ?? previous.bookingWindow?.current ?? {}) },
                next: { ...(data.bookingWindow.next ?? previous.bookingWindow?.next ?? {}) },
                bookingLink: data.bookingWindow.bookingLink ?? previous.bookingWindow?.bookingLink ?? '',
                note: data.bookingWindow.note ?? previous.bookingWindow?.note ?? '',
                bannerMessage: data.bookingWindow.bannerMessage ?? previous.bookingWindow?.bannerMessage ?? '',
              },
            }
          })
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading available dates:', error)
          setAvailableDates([])
          setAvailableDateStrings([])
        }
      } finally {
        if (!cancelled) {
          setLoadingDates(false)
        }
      }
    }

    loadAvailableDates()

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
      const response = await fetch(`/api/calendar/available-slots?date=${date}`, {
        cache: 'no-store',
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
    setSubmitStatus({ type: null, message: '' })
    setMpesaStatus({ loading: false, success: null, message: '' })
    setClientPhotoError(null)
    if (!termsAccepted) {
      setTermsAcknowledgementError(true)
      setSubmitStatus({
        type: 'error',
        message: 'Please confirm that you have read and agree to The Lash Diary Terms & Conditions before continuing.',
      })
      document.getElementById('terms-consent')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setLoading(true)

    if (clientPhotoUploading) {
      setLoading(false)
      setClientPhotoError('We are still uploading your photo. Please wait a moment and try again.')
      document.getElementById('client-photo-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

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

      // Demo override: skip payment requirement so bookings can be captured without M-Pesa
      const mpesaResult = {
        success: true,
        checkoutRequestID: null as string | null,
      }
      setMpesaStatus({
        loading: false,
        success: true,
        message: 'Demo mode: payment step skipped. Booking captured without M-Pesa.',
      })

      if (mpesaResult.success) {
        // Proceed with booking creation
        const response = await fetch('/api/calendar/book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            location: STUDIO_LOCATION,
            isFirstTimeClient: effectiveIsFirstTimeClient === true,
            originalPrice: pricingDetails.originalPrice,
            discount: pricingDetails.discount,
            finalPrice: pricingDetails.finalPrice,
            deposit: pricingDetails.deposit,
            discountType: pricingDetails.discountType,
            promoCode: promoCodeData?.code || null,
            promoCodeType: referralType,
            salonReferral: salonReferralContext,
            mpesaCheckoutRequestID: mpesaResult.checkoutRequestID,
            clientPhoto: clientPhotoUpload,
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
        const summaryPricing = pricingDetails
        const depositFormatted = summaryPricing.deposit > 0 ? `KSH ${summaryPricing.deposit.toLocaleString()}` : 'N/A'
        const originalPriceFormatted = `KSH ${summaryPricing.originalPrice.toLocaleString()}`
        const discountFormatted = summaryPricing.discount > 0 ? `KSH ${summaryPricing.discount.toLocaleString()}` : 'KSH 0'
        const finalPriceFormatted = `KSH ${summaryPricing.finalPrice.toLocaleString()}`
        
        const bookingSummary = {
          name: formData.name,
          email: formData.email,
          date: formattedDate,
          time: formattedTime,
          endTime: formattedEndTime,
          service: formData.service || 'Lash Service',
          deposit: depositFormatted,
          originalPrice: originalPriceFormatted,
          discount: discountFormatted,
          finalPrice: finalPriceFormatted,
          returningClientEligible:
            appliedReturningDiscountPercent > 0 ||
            promoCodeData?.isReferral === true,
        }
        
        // Store booking details for modal
        setBookingDetails(bookingSummary)
        
        if (clientPhotoUpload) {
          handleRemoveClientPhoto()
        }

        if (
          bookingSummary.returningClientEligible &&
          (!referralDetails || referralDetails.code === '')
        ) {
          try {
            const referralResponse = await fetch('/api/promo-codes/create-referral', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referrerEmail: bookingSummary.email,
                referrerName: bookingSummary.name,
              }),
            })
            const referralData = await referralResponse.json()
            if (referralResponse.ok && referralData.success && referralData.promoCode?.code) {
              setReferralDetails({
                code: referralData.promoCode.code,
                friendUsesRemaining:
                  typeof referralData.promoCode.friendUsesRemaining === 'number'
                    ? referralData.promoCode.friendUsesRemaining
                    : null,
              })
              setReferralMessage(
                referralData.reused
                  ? 'We resent your referral code to your email.'
                  : 'A fresh referral code is on its way to your email.',
              )
            }
          } catch (error) {
            console.error('Failed to auto-generate referral code:', error)
          }
        }
        
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
          details: `${data.message || 'Your appointment has been confirmed.'} ${emailStatus} If the email isn't in your inbox within a few minutes, please check your spam or promotions folder and mark it as not spam.`,
        })

        if (promoCodeData?.valid && promoCodeData.code) {
          try {
            const redeemResponse = await fetch('/api/promo-codes/redeem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: promoCodeData.code,
                email: formData.email,
                bookingId: data.bookingId,
                clientName: formData.name,
                service: formData.service,
                appointmentDate: formData.date,
                appointmentTime: formData.timeSlot,
                originalPrice: pricingDetails.originalPrice,
                finalPrice: pricingDetails.finalPrice,
                discount: pricingDetails.discount,
                salonName: promoCodeData.salonName,
                salonEmail: promoCodeData.salonEmail,
                salonCommissionPercent: promoCodeData.salonCommissionPercent,
                clientDiscountPercent: promoCodeData.clientDiscountPercent ?? promoCodeData.discountValue ?? null,
              }),
            })
            if (!redeemResponse.ok) {
              const redeemData = await redeemResponse.json().catch(() => ({}))
              console.error('Failed to mark promo code as redeemed:', redeemData)
            }
          } catch (error) {
            console.error('Failed to mark promo code as redeemed:', error)
          }
        }

        setPromoCode('')
        setPromoCodeData(null)
        setPromoError('')
        setReferralStatus('idle')
        setReferralMessage('')
        setReferralError('')
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          service: '',
          date: '',
          timeSlot: '',
          notes: '',
        })
        setTimeSlots([])
        setTermsAccepted(false)
        setTermsAcknowledgementError(false)
        
        // Refresh available dates and time slots after booking
        // This ensures the booked slot disappears and dates update if fully booked
        const refreshResponse = await fetch('/api/calendar/available-slots', { cache: 'no-store' })
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
        });
      }
      }
    } catch (error) {
      console.error('Failed to book appointment:', error);
      setSubmitStatus({
        type: 'error',
        message: 'An error occurred. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

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
            Schedule your luxury studio appointment with ease. Select a date and time below, share your contact details, and we'll prepare a bespoke lash experience waiting for you at {STUDIO_LOCATION}.
          </p>
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
          {discountsLoaded && depositPercentage > 0 && (
            <div className="bg-white border-l-4 border-[var(--color-accent)]/80 p-5 max-w-2xl mx-auto mb-6 rounded-r-xl shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-[var(--color-accent)]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-base font-semibold text-black">
                    A {depositPercentage}% non-refundable deposit is required to secure your booking.
                  </p>
                </div>
              </div>
            </div>
          )}
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  id="phoneCountryCode"
                  name="phoneCountryCode"
                  value={phoneCountryCode}
                  onChange={(event) => setPhoneCountryCode(event.target.value)}
                  className="w-full sm:w-48 px-3 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all"
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
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                  placeholder="700 000 000"
                  inputMode="tel"
                />
              </div>
              <p className="mt-2 text-sm text-brown-dark/70">
                Choose your country code and enter the rest of your number. International numbers are accepted.
              </p>
            </div>

            {/* Client Photo Upload */}
            <div
              id="client-photo-upload"
              className="rounded-2xl border-2 border-brown-light/60 bg-white px-5 py-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Upload a photo of your eyes (optional)
                  </label>
                  <div className="text-sm text-brown-dark/80 space-y-2">
                    {displayPhotoInstructions.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                  {clientPhotoSample.instructions && (
                    <p className="mt-3 text-xs text-brown-dark/80 bg-brown-light/20 px-3 py-2 rounded-lg">
                      {clientPhotoSample.instructions}
                    </p>
                  )}
                </div>
                {clientPhotoSample.url && (
                  <div className="sm:w-56">
                    <p className="text-xs uppercase tracking-widest text-brown-dark/60 mb-2">Example photo</p>
                    <div className="rounded-xl overflow-hidden border border-brown-light/60 shadow-sm bg-white">
                      <img
                        src={clientPhotoSample.url}
                        alt="Sample eye photo reference"
                        className="w-full h-40 object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  key={photoInputKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleClientPhotoChange}
                  disabled={clientPhotoUploading}
                  className="w-full sm:flex-1 text-sm text-brown-dark file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[color-mix(in_srgb,var(--color-primary) 85%,#000 15%)] focus-visible:file:outline focus-visible:file:outline-2 focus-visible:file:outline-offset-2 focus-visible:file:outline-[color-mix(in_srgb,var(--color-primary) 70%,transparent 30%)] transition"
                />
                {clientPhotoUpload && (
                  <button
                    type="button"
                    onClick={handleRemoveClientPhoto}
                    className="inline-flex items-center px-4 py-2 rounded-full border border-brown-dark text-sm font-semibold text-brown-dark hover:bg-brown-dark hover:text-white transition"
                  >
                    Remove photo
                  </button>
                )}
              </div>

              {clientPhotoUploading && (
                <p className="text-sm text-brown-dark/70">Uploading… hang tight.</p>
              )}
              {clientPhotoError && (
                <p className="text-sm text-red-600 font-medium">{clientPhotoError}</p>
              )}
              {clientPhotoSuccessMessage && (
                <p className="text-sm text-green-600 font-medium">{clientPhotoSuccessMessage}</p>
              )}

              {clientPhotoPreview && (
                <div className="mt-2">
                  <p className="text-xs uppercase tracking-widest text-brown-dark/60 mb-2">Your photo</p>
                  <div className="rounded-xl overflow-hidden border border-brown-light/60 shadow-sm bg-white">
                    <img
                      src={clientPhotoPreview}
                      alt="Uploaded reference photo preview"
                      className="w-full h-40 object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
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
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                placeholder="Any special preferences, sensitivity notes, or other information you'd like us to know..."
              />
              <p className="mt-2 text-sm text-brown-dark/70">
                Share any additional information that will help us provide the best service (e.g., building access codes, where to park, specific preferences, etc.)
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
              ) : serviceOptionGroups.reduce((count, group) => count + group.options.length, 0) === 0 ? (
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
                  {serviceOptionGroups.map((group) => (
                    <optgroup key={group.categoryId} label={group.categoryName}>
                      {group.options.map((option) => (
                        <option key={option.id} value={option.name}>
                          {option.name} — KSH {servicePrices[option.name]?.toLocaleString() || 'N/A'}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {/* Promo Code / Referral Code Field */}
              {formData.service && (isFirstTimeClient === false || isReferralBasedBooking) && (
                <div className="mt-4">
                  <label
                    htmlFor="promoCode"
                    className="block text-sm font-semibold text-brown-dark mb-2"
                  >
                    {isReferralBasedBooking ? 'Referral Code' : 'Promo Code (Optional)'}
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
              disabled={selectedServiceIsFill}
                      placeholder={
                referralMode === 'friend'
                  ? 'Enter friend referral code'
                  : referralMode === 'salon'
                  ? 'Enter salon / beautician / influencer code'
                  : 'Enter promo code'
                      }
                      className="flex-1 px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition-all placeholder:text-brown-light/60"
                    />
                    <button
                      type="button"
                      onClick={() => validatePromoCode(promoCode)}
              disabled={selectedServiceIsFill || validatingPromo || !promoCode.trim()}
                      className="bg-brown-dark text-white px-6 py-3 rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validatingPromo ? 'Checking...' : referralMode === 'none' ? 'Apply' : 'Apply referral'}
                    </button>
                  </div>
                  {referralMode === 'friend' && (
                    <p className="text-xs text-brown-dark/70 mt-1">
                      Enter the referral code your friend shared to unlock 10% off your first visit.
                    </p>
                  )}
                  {referralMode === 'salon' && (
                <p className="text-xs text-brown-dark/70 mt-1">
                  Enter the code printed on the salon / beautician / influencer card you received.
                </p>
                  )}
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
                </div>
              )}

              {formData.service && depositAmount > 0 && (
                <div className="mt-3 p-4 bg-brown-light/20 border-2 border-brown-light rounded-lg">
                  {checkingFirstTime && formData.email && (
                    <div className="mb-3 text-sm text-brown-dark/70 italic">
                      Checking eligibility for first-time client discount...
                    </div>
                  )}
                  {loadingReturningDiscount && effectiveIsReturningClient === true && (
                    <div className="mb-3 text-sm text-brown-dark/70 italic">
                      Checking loyalty rewards…
                    </div>
                  )}

                  {returningInfoError && (
                    <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                      {returningInfoError}
                    </div>
                  )}

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
                    !selectedServiceIsFill && (
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

                  {returningClientDiscountEnabled && appliedReturningDiscountPercent > 0 && (
                    <div className="mb-3 p-3 rounded-lg border border-[#cbd5e1] bg-white/95">
                      <p
                        className="text-base font-semibold leading-snug"
                        style={{ color: '#111827' }}
                      >
                        💎 {safeReturningDaysSince !== null
                          ? `You're ${safeReturningDaysSince} day${safeReturningDaysSince === 1 ? '' : 's'} from your last paid visit`
                          : "You're rebooking within our loyalty window"
                        }, so enjoy {appliedReturningDiscountPercent}% off automatically.
                      </p>
                      {lastPaymentDisplay && (
                        <p className="mt-2 text-sm leading-snug" style={{ color: '#1f2937' }}>
                          Last paid visit: {lastPaymentDisplay}. Loyalty discounts apply to bookings made within 30 days ({returningTier30Percentage}%) and between 31–45 days ({returningTier45Percentage}%), and are calculated once your previous service is marked paid in full.
                        </p>
                      )}
                      <p className="mt-2 text-sm leading-snug" style={{ color: '#1f2937' }}>
                        Have a promo code instead? Apply it above to replace the loyalty discount.
                      </p>
                      <div className="mt-3 bg-slate-100/60 border border-slate-200 rounded-lg p-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="text-sm font-semibold" style={{ color: '#1f2937' }}>
                            Share the glow: send a friend 10% off and unlock a 10% reward for yourself.
                          </div>
                          <button
                            type="button"
                            onClick={() => handleGenerateReferralCode()}
                            disabled={referralStatus === 'loading'}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brown-dark text-white text-sm font-semibold shadow-sm hover:bg-brown transition-colors disabled:opacity-60"
                          >
                            {referralStatus === 'loading' ? 'Preparing code…' : 'Get referral code'}
                          </button>
                        </div>
                        {referralDetails?.code && (
                          <div className="mt-3 text-sm" style={{ color: '#111827' }}>
                            <div className="font-semibold">
                              Your referral code: <span className="text-brown-dark">{referralDetails.code}</span>
                            </div>
                            <p className="mt-1">
                              Share this code with a friend. They get 10% off, and you can use the same code after they book.
                            </p>
                          </div>
                        )}
                        {referralStatus === 'sent' && !referralDetails?.code && (
                          <p className="mt-2 text-sm" style={{ color: '#111827' }}>
                            Your referral email is on the way. Check your inbox for the code and instructions.
                          </p>
                        )}
                        {referralMessage && (
                          <p className="mt-2 text-sm text-green-700">{referralMessage}</p>
                        )}
                        {referralError && (
                          <p className="mt-2 text-sm text-red-600">{referralError}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {returningClientDiscountEnabled &&
                    effectiveIsReturningClient === true &&
                    appliedReturningDiscountPercent === 0 &&
                    lastPaymentDisplay &&
                    !loadingReturningDiscount && (
                      <div className="mb-3 p-3 rounded-lg border border-[#cbd5e1] bg-white/95 text-sm leading-snug" style={{ color: '#1f2937' }}>
                        Last paid visit: {lastPaymentDisplay}. Bookings after 45 days don't include a loyalty discount, but once this service is paid in full we'll restart the clock for your next rebooking reward.
                      </div>
                    )}
                  {returningClientDiscountEnabled &&
                    effectiveIsReturningClient === true &&
                    !lastPaymentDate &&
                    !loadingReturningDiscount && (
                    <div className="mb-3 p-3 rounded-lg border border-[#cbd5e1] bg-white/95 text-sm leading-snug" style={{ color: '#1f2937' }}>
                      We'll unlock returning-client discounts as soon as your previous appointment is marked paid in full on our side.
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-brown-dark font-semibold">Service Price:</span>
                      <span className="text-brown-dark font-bold">KSH {pricing.originalPrice.toLocaleString()}</span>
                    </div>
                    {pricing.discountType === 'first-time' && (
                      <div className="flex justify-between items-center text-green-700">
                        <span className="font-semibold">First-Time Client Discount ({firstTimeDiscountPercentage}%):</span>
                        <span className="font-bold">- KSH {pricing.discount.toLocaleString()}</span>
                      </div>
                    )}
                    {pricing.discountType === 'returning' && (
                      <div className="flex justify-between items-center" style={{ color: 'var(--color-text)' }}>
                        <span className="font-semibold">
                              Returning Client Discount ({activeReturningSummaryLabel}):
                        </span>
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
                    <div className="flex justify-between items-center pt-2 border-t border-brown-light/50">
                      <span className="text-brown-dark font-semibold">Required Deposit ({depositPercentage}%):</span>
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

            {/* Terms Acknowledgement */}
            <div
              id="terms-consent"
              className={`rounded-lg border-2 p-5 transition-all ${
                termsAcknowledgementError ? 'border-red-300 bg-red-50' : 'border-brown-light bg-pink-light/30'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked)
                    if (event.target.checked) {
                      setTermsAcknowledgementError(false)
                    }
                  }}
                  className="mt-1 h-5 w-5 rounded border-2 border-brown-light text-brown-dark focus:ring-brown-dark"
                />
                <span className="text-sm text-brown-dark leading-relaxed">
                  I have read and agree to The Lash Diary{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brown-dark underline font-semibold hover:text-brown"
                  >
                    Terms &amp; Conditions
                  </a>
                  .
                </span>
              </label>
              {termsAcknowledgementError && (
                <p className="mt-2 text-xs text-red-600">
                  Please review and accept the Terms &amp; Conditions before continuing.
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
                !formData.service ||
                mpesaStatus.loading ||
                !termsAccepted
              }
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
              href="mailto:hello@lashdiary.co.ke"
              className="inline-block bg-brown-dark text-white font-semibold px-6 py-3 rounded-full hover:bg-brown transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && bookingDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] px-4 py-6 sm:p-8">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-fade-in-up overflow-hidden">
            {/* Close Button */}
            <button
              onClick={handleCloseSuccessModal}
              className="absolute top-3 right-3 md:top-5 md:right-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brown-dark focus:ring-offset-2 rounded-full bg-white/80 backdrop-blur p-2"
              aria-label="Close confirmation"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
              {/* Success Icon */}
              <div className="text-center mb-6 sm:mb-8">
                <div className="mx-auto w-18 h-18 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display text-brown-dark font-bold mb-2">
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
                  <div className="flex justify-between sm:flex-col sm:items-start">
                    <dt className="text-brown-dark/70 font-medium">Name</dt>
                    <dd className="text-brown-dark font-semibold">{bookingDetails.name}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start">
                    <dt className="text-brown-dark/70 font-medium">Date</dt>
                    <dd className="text-brown-dark font-semibold">{bookingDetails.date}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start">
                    <dt className="text-brown-dark/70 font-medium">Time</dt>
                    <dd className="text-brown-dark font-semibold">{bookingDetails.time} – {bookingDetails.endTime}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start">
                    <dt className="text-brown-dark/70 font-medium">Service</dt>
                    <dd className="text-brown-dark font-semibold">{bookingDetails.service}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start">
                    <dt className="text-brown-dark/70 font-medium">Deposit Required</dt>
                    <dd className="text-brown-dark font-bold">{bookingDetails.deposit}</dd>
                  </div>
                  <div className="flex justify-between sm:flex-col sm:items-start">
                    <dt className="text-brown-dark/70 font-medium">Final Price</dt>
                    <dd className="text-brown-dark font-bold">{bookingDetails.finalPrice}</dd>
                  </div>
                </dl>
              </div>

              {/* Payment Instructions */}
              <div className="bg-brown-light/15 border-l-4 border-brown-dark p-4 rounded-lg mb-4 text-sm sm:text-base">
                <p className="text-brown-dark font-semibold mb-2">
                  Payment Instructions:
                </p>
                <p className="text-brown-dark/80">
                  You will receive payment instructions via email. Please pay the {bookingDetails.deposit} deposit to secure your appointment. The remaining balance will be handled on the day of your appointment.
                </p>
              </div>

              {/* Message */}
              <div className="bg-brown-light/15 border-l-4 border-brown-dark p-4 rounded-lg mb-6 text-sm sm:text-base">
                <p className="text-brown-dark/80">
                  A confirmation email has been sent to your address. If you don't see it within a few minutes, please check your spam or promotions folder and mark it as "Not spam".
                </p>
              </div>

              {bookingDetails.returningClientEligible && (
                <div className="rounded-xl p-5 sm:p-6 mb-6 border border-[var(--color-primary)]/20 bg-white text-[var(--color-text)] shadow-md">
                  <h3 className="font-display text-lg sm:text-xl font-semibold mb-2">
                    Share 10% with a friend ✨
                  </h3>
                  <p className="text-sm sm:text-base mb-4 leading-relaxed">
                    Invite a friend and gift them 10% off their first visit. After they book, the same code unlocks 10% off your next appointment.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateReferralCode(bookingDetails.email, bookingDetails.name)}
                    disabled={referralStatus === 'loading'}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-full font-semibold shadow-sm transition-colors disabled:opacity-60 bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-dark)]"
                  >
                    {referralStatus === 'loading' ? 'Preparing your code…' : 'Send me my referral code'}
                  </button>
                  {referralDetails?.code && (
                    <div className="mt-4 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-background)] px-4 py-3">
                      <p className="text-sm font-semibold">
                        Your code: <span className="text-[var(--color-primary)]">{referralDetails.code}</span>
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
                className="w-full bg-brown-dark hover:bg-brown text-white font-semibold px-5 py-3 rounded-full transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brown-dark focus:ring-offset-2"
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
