'use client'

import { useState, useEffect } from 'react'
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

export default function LabsBookAppointment() {
  const { currency } = useCurrency()
  const searchParams = useSearchParams()
  const tierIdFromUrl = searchParams.get('tier')
  
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(PHONE_COUNTRY_CODES[0]?.dialCode || '+254')
  const [phoneLocalNumber, setPhoneLocalNumber] = useState<string>('')
  const [consultationFeeKES, setConsultationFeeKES] = useState<number>(7000)
  const [loadingFee, setLoadingFee] = useState(true)
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null)
  const [loadingTier, setLoadingTier] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/labs', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setConsultationFeeKES(data.consultationFeeKES || 7000)
          
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

  // Load booked dates and time slots for consultation
  useEffect(() => {
    const loadBookedSlots = async () => {
      setLoadingAvailability(true)
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
          setBookedDates(data.bookedDates || []) // For backward compatibility
          setBookedSlots(data.bookedSlots || []) // New: specific date+time combinations
        }
      } catch (error) {
        console.error('Error loading booked slots:', error)
      } finally {
        setLoadingAvailability(false)
      }
    }
    loadBookedSlots()
    
    // Refresh availability every 30 seconds to catch new bookings
    const interval = setInterval(loadBookedSlots, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    businessType: '',
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
  const [loadingAvailability, setLoadingAvailability] = useState(false)

  const [loading, setLoading] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)

  const [exchangeRates, setExchangeRates] = useState<{ usdToKes: number; eurToKes: number } | null>(null)

  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          if (data.exchangeRates) {
            setExchangeRates({
              usdToKes: data.exchangeRates.usdToKes || 130,
              eurToKes: data.exchangeRates.eurToKes || 140,
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
    if (currency === 'USD' || currency === 'EUR') {
      if (!exchangeRates) {
        // Fallback to default rates if not loaded yet
        const defaultRates = { usdToKes: 130, eurToKes: 140 }
        const convertedPrice = currency === 'USD'
          ? priceKES / defaultRates.usdToKes
          : priceKES / defaultRates.eurToKes
        const symbol = currency === 'USD' ? '$' : '€'
        return `${symbol}${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
      const convertedPrice = currency === 'USD'
        ? priceKES / exchangeRates.usdToKes
        : priceKES / exchangeRates.eurToKes
      const symbol = currency === 'USD' ? '$' : '€'
      return `${symbol}${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
      const fullPhone = `${phoneCountryCode}${phoneLocalNumber.replace(/\D/g, '')}`
      
      // Convert consultation fee to the selected currency
      let consultationPrice = consultationFeeKES
      if (currency === 'USD' || currency === 'EUR') {
        if (exchangeRates) {
          consultationPrice = currency === 'USD'
            ? consultationFeeKES / exchangeRates.usdToKes
            : consultationFeeKES / exchangeRates.eurToKes
          // Round to 2 decimal places
          consultationPrice = Math.round(consultationPrice * 100) / 100
        } else {
          // Fallback to default rates
          const defaultRates = { usdToKes: 130, eurToKes: 140 }
          consultationPrice = currency === 'USD'
            ? consultationFeeKES / defaultRates.usdToKes
            : consultationFeeKES / defaultRates.eurToKes
          consultationPrice = Math.round(consultationPrice * 100) / 100
        }
      }
      
      const submissionData = {
        ...formData,
        phone: fullPhone,
        consultationPrice: consultationPrice,
        currency: currency,
        submittedAt: new Date().toISOString(),
        source: 'labs-consultation',
        // Send tier name if tier was selected, otherwise send empty string
        interestedTier: selectedTier ? selectedTier.name : (formData.interestedTier || ''),
      }

      const response = await fetch('/api/labs/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit consultation request')
      }

      // Show confirmation modal immediately
      setShowConfirmationModal(true)
      setLoading(false)

      // Reset form immediately for better UX
      setFormData({
        businessName: '',
        contactName: '',
        email: '',
        businessType: '',
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
            Book a Consultation
          </h1>
          <p className="text-lg sm:text-xl text-[var(--color-text)] mb-6 max-w-2xl mx-auto">
            Let's understand your business and create a clear plan to eliminate operational chaos
          </p>
          
          {selectedTier && (
            <div className="mb-4 p-4 bg-[var(--color-accent)]/10 border-2 border-[var(--color-primary)]/30 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-[var(--color-text)]/70 mb-1">You're interested in:</p>
              <p className="text-lg font-semibold text-[var(--color-primary)]">{selectedTier.name}</p>
              <p className="text-sm text-[var(--color-text)]/70 mt-1">
                {formatPrice(selectedTier.priceKES)}
              </p>
              <p className="text-xs text-[var(--color-text)]/60 mt-2 italic">
                During the consultation, we'll help determine if this is the right fit for your business
              </p>
            </div>
          )}
          
          <div className="inline-block bg-[var(--color-primary)] text-[var(--color-on-primary)] px-6 py-3 rounded-lg font-semibold text-lg mb-2">
            {loadingFee ? 'Loading...' : formatPrice(consultationFeeKES)}
          </div>
          <p className="text-sm text-[var(--color-text)]/70">One comprehensive session</p>
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
                  {formData.mainPainPoints.length}/50 minimum characters
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
                  <option value="100k-150k">100K–150K KES</option>
                  <option value="150k-250k">150K–250K KES</option>
                  <option value="250k-300k+">250K–300K+ KES</option>
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
                <input
                  type="date"
                  id="preferredDate"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleInputChange}
                  onClick={(e) => {
                    // Open calendar picker when clicking anywhere on the input
                    // Only call showPicker on direct user click (user gesture required)
                    try {
                      if (e.currentTarget.showPicker && typeof e.currentTarget.showPicker === 'function') {
                        e.currentTarget.showPicker()
                      }
                    } catch (error) {
                      // If showPicker fails (e.g., not supported or no user gesture), 
                      // the native date input will still work normally
                      console.debug('showPicker not available:', error)
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
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
                <select
                  id="preferredTime"
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  required
                  disabled={!formData.preferredDate}
                >
                  <option value="">Select time</option>
                  {!bookedSlots.some(slot => {
                    const slotDate = normalizeDateForComparison(slot.date)
                    const selectedDate = normalizeDateForComparison(formData.preferredDate)
                    const slotTime = normalizeTimeForComparison(slot.time)
                    return slotDate === selectedDate && slotTime === 'morning'
                  }) && (
                    <option value="morning">
                      Morning (9 AM - 12 PM)
                    </option>
                  )}
                  {!bookedSlots.some(slot => {
                    const slotDate = normalizeDateForComparison(slot.date)
                    const selectedDate = normalizeDateForComparison(formData.preferredDate)
                    const slotTime = normalizeTimeForComparison(slot.time)
                    return slotDate === selectedDate && slotTime === 'afternoon'
                  }) && (
                    <option value="afternoon">
                      Afternoon (12 PM - 4 PM)
                    </option>
                  )}
                  {!bookedSlots.some(slot => {
                    const slotDate = normalizeDateForComparison(slot.date)
                    const selectedDate = normalizeDateForComparison(formData.preferredDate)
                    const slotTime = normalizeTimeForComparison(slot.time)
                    return slotDate === selectedDate && slotTime === 'evening'
                  }) && (
                    <option value="evening">
                      Evening (4 PM - 7 PM)
                    </option>
                  )}
                  {formData.preferredDate && bookedSlots.filter(slot => slot.date === formData.preferredDate).length === 3 && (
                    <option value="" disabled>
                      All time slots are booked for this date
                    </option>
                  )}
                </select>
                {formData.preferredDate && (() => {
                  const selectedDate = normalizeDateForComparison(formData.preferredDate)
                  const bookedCount = bookedSlots.filter(slot => {
                    const slotDate = normalizeDateForComparison(slot.date)
                    return slotDate === selectedDate
                  }).length
                  
                  if (bookedCount > 0 && bookedCount < 3) {
                    return (
                      <p className="text-sm text-[var(--color-text)]/70 mt-2">
                        ℹ️ {bookedCount} time slot(s) already booked for this date. Only available slots are shown above.
                      </p>
                    )
                  }
                  if (bookedCount === 3) {
                    return (
                      <p className="text-sm text-red-600 mt-2">⚠️ All time slots are booked for this date. Please select another date.</p>
                    )
                  }
                  return null
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

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : `Submit Consultation Request - ${formatPrice(consultationFeeKES)}`}
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
                Booking Confirmed! ✅
              </h2>
              <p className="text-[var(--color-text)] mb-6 text-lg">
                Your consultation request has been received successfully!
              </p>
              <div className="bg-[var(--color-accent)]/10 rounded-lg p-4 mb-6 border border-[var(--color-primary)]/20">
                <p className="text-[var(--color-text)] text-sm mb-2">
                  <strong>📧 Check your email</strong>
                </p>
                <p className="text-[var(--color-text)]/80 text-sm">
                  We've sent a confirmation email to <strong>{formData.email || 'your email address'}</strong> with all the details, including the Google Meet link (for online meetings).
                </p>
              </div>
              <p className="text-[var(--color-text)] mb-6 text-sm">
                We'll contact you within 24 hours to finalize your consultation schedule.
              </p>
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

