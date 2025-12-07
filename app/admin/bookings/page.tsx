'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATE } from '@/lib/currency-utils'

interface Booking {
  id: string
  name: string
  email: string
  phone: string
  service: string
  date: string
  timeSlot: string
  location?: string
  notes?: string
  appointmentPreference?: string
  originalPrice: number
  discount: number
  finalPrice: number
  deposit: number
  discountType?: string
  promoCode?: string
  mpesaCheckoutRequestID?: string
  createdAt: string
  testimonialRequested?: boolean
  testimonialRequestedAt?: string
  status: 'confirmed' | 'cancelled' | 'completed' | 'paid'
  calendarEventId?: string | null
  cancelledAt?: string | null
  cancelledBy?: 'admin' | 'client' | null
  cancellationReason?: string | null
  refundStatus?: 'not_required' | 'not_applicable' | 'pending' | 'refunded' | 'retained'
  refundAmount?: number | null
  refundNotes?: string | null
  rescheduledAt?: string | null
  rescheduledBy?: 'admin' | 'client' | null
  rescheduleHistory?: Array<{
    fromDate: string
    fromTimeSlot: string
    toDate: string
    toTimeSlot: string
    rescheduledAt: string
    rescheduledBy: 'admin' | 'client'
    notes?: string | null
  }>
  manageToken?: string | null
  manageTokenGeneratedAt?: string | null
  manageTokenLastUsedAt?: string | null
  cancellationWindowHours?: number
  cancellationCutoffAt?: string | null
  lastClientManageActionAt?: string | null
  clientManageDisabled?: boolean
  paidInFullAt?: string | null
  desiredLook?: string | null
  desiredLookStatus?: 'recommended' | 'custom' | null
  desiredLookStatusMessage?: string | null
  desiredLookMatchesRecommendation?: boolean | null
  additionalServices?: Array<{
    name: string
    price: number
    addedAt: string
  }>
  fine?: {
    amount: number
    reason: string
    addedAt: string
  }
  isWalkIn?: boolean
  walkInFee?: number
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { credentials: 'include', ...init })
}

export default function AdminBookings() {
  const { currency, formatCurrency: formatCurrencyContext } = useCurrency()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  // Helper function to convert booking price to selected currency
  // Note: Bookings are stored in KES, so we convert if USD is selected
  const convertBookingPrice = (amount: number): number => {
    if (currency === 'USD') {
      return convertCurrency(amount, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
    }
    return amount
  }

  // Calculate balance including additional services and fine
  const calculateBalance = (booking: Booking | null): number => {
    if (!booking) return 0
    // For walk-ins, if deposit is 0, balance should be the full finalPrice
    // For regular bookings, balance is finalPrice - deposit
    const deposit = booking.deposit || 0
    const finalPrice = booking.finalPrice || 0
    return Math.max(finalPrice - deposit, 0)
  }

  const [sendingRequest, setSendingRequest] = useState(false)
  const [sendingPayment, setSendingPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [processingCancellation, setProcessingCancellation] = useState(false)
  const [hoursUntilAppointment, setHoursUntilAppointment] = useState<number | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlots, setRescheduleSlots] = useState<Array<{ value: string; label: string }>>([])
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState('')
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false)
  const [sendRescheduleEmail, setSendRescheduleEmail] = useState(true)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [processingReschedule, setProcessingReschedule] = useState(false)
  const [rescheduleInfo, setRescheduleInfo] = useState<string | null>(null)
  const [availabilityData, setAvailabilityData] = useState<any | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [preAppointmentFineAmount, setPreAppointmentFineAmount] = useState<number>(500)
  const [addingService, setAddingService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string; price: number; priceUSD?: number }>>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [addingFine, setAddingFine] = useState(false)
  const [fineReason, setFineReason] = useState('')
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [walkInFee, setWalkInFee] = useState<number>(1000)
  const [creatingWalkIn, setCreatingWalkIn] = useState(false)
  const [walkInForm, setWalkInForm] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    timeSlot: '',
    notes: '',
    originalPrice: 0,
    deposit: 0,
  })
  const [availableSlots, setAvailableSlots] = useState<Array<{ value: string; label: string }>>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableDateStrings, setAvailableDateStrings] = useState<string[]>([])
  const [loadingDates, setLoadingDates] = useState(false)

  // Load available dates when walk-in modal opens (same as booking page)
  useEffect(() => {
    if (!showWalkInModal) return

    let cancelled = false
    const loadAvailableDates = async () => {
      setLoadingDates(true)
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/calendar/available-slots?t=${timestamp}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to load available dates: ${response.status}`)
        }
        const data = await response.json()
        if (cancelled) return
        const dates: Array<{ value: string; label: string }> = Array.isArray(data?.dates) ? data.dates : []
        const dateStrings = dates.map((entry) => entry.value)
        setAvailableDateStrings(dateStrings)
      } catch (error) {
        if (!cancelled) {
          console.error('[Walk-In] Error loading available dates:', error)
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
  }, [showWalkInModal])
  const [fullyBookedDatesAdmin, setFullyBookedDatesAdmin] = useState<string[]>([])
  const [pendingFullyBookedDates, setPendingFullyBookedDates] = useState<string[]>([])
  const [clearingBookings, setClearingBookings] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(1)
    return today
  })
  const [managementMonth, setManagementMonth] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(1)
    return today
  })
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [updatingFullyBooked, setUpdatingFullyBooked] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasFullyBookedChanges = useMemo(() => {
    if (pendingFullyBookedDates.length !== fullyBookedDatesAdmin.length) return true
    const savedSet = new Set(fullyBookedDatesAdmin)
    return pendingFullyBookedDates.some((date) => !savedSet.has(date))
  }, [pendingFullyBookedDates, fullyBookedDatesAdmin])

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>()
    bookings.forEach((booking) => {
      const dateKey = booking.date || booking.timeSlot?.split('T')[0]
      if (!dateKey) return
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(booking)
    })
    return map
  }, [bookings])

  const filteredBookings = useMemo(() => {
    if (!selectedDate) return bookings
    return bookings.filter((booking) => (booking.date || booking.timeSlot?.split('T')[0]) === selectedDate)
  }, [bookings, selectedDate])

  const normalizeBooking = (booking: any): Booking => {
    const depositValue = Number.isFinite(booking.deposit) ? Number(booking.deposit) : 0
    const finalPriceValue = Number.isFinite(booking.finalPrice) ? Number(booking.finalPrice) : 0
    const existingStatus = (booking.status || '').toLowerCase()
    const normalizedStatus =
      existingStatus === 'cancelled'
        ? 'cancelled'
        : existingStatus === 'completed'
          ? 'completed'
          : existingStatus === 'paid'
            ? 'paid'
            : finalPriceValue > 0 && depositValue >= finalPriceValue
              ? 'paid'
              : 'confirmed'

    return {
      ...booking,
      createdAt:
        typeof booking.createdAt === 'string'
          ? booking.createdAt
          : booking.createdAt instanceof Date
            ? booking.createdAt.toISOString()
            : new Date().toISOString(),
      status: normalizedStatus,
      calendarEventId: booking.calendarEventId ?? null,
      cancelledAt: booking.cancelledAt ?? null,
      cancelledBy: booking.cancelledBy ?? null,
      cancellationReason: booking.cancellationReason ?? null,
      refundStatus: booking.refundStatus || (depositValue > 0 ? 'not_applicable' : 'not_required'),
      refundAmount:
        typeof booking.refundAmount === 'number'
          ? booking.refundAmount
          : depositValue > 0
            ? depositValue
            : 0,
      refundNotes: booking.refundNotes ?? null,
      rescheduledAt: booking.rescheduledAt ?? null,
      rescheduledBy: booking.rescheduledBy ?? null,
      rescheduleHistory: Array.isArray(booking.rescheduleHistory)
        ? booking.rescheduleHistory.map((entry: any) => ({
            fromDate: entry.fromDate,
            fromTimeSlot: entry.fromTimeSlot,
            toDate: entry.toDate,
            toTimeSlot: entry.toTimeSlot,
            rescheduledAt: entry.rescheduledAt,
            rescheduledBy: entry.rescheduledBy || 'admin',
            notes: entry.notes ?? null,
          }))
        : [],
      manageToken:
        typeof booking.manageToken === 'string' && booking.manageToken.trim().length > 0
          ? booking.manageToken
          : null,
      manageTokenGeneratedAt:
        typeof booking.manageTokenGeneratedAt === 'string' ? booking.manageTokenGeneratedAt : null,
      manageTokenLastUsedAt:
        typeof booking.manageTokenLastUsedAt === 'string' ? booking.manageTokenLastUsedAt : null,
      cancellationWindowHours:
        typeof booking.cancellationWindowHours === 'number' && !Number.isNaN(booking.cancellationWindowHours)
          ? booking.cancellationWindowHours
          : 72,
      cancellationCutoffAt:
        typeof booking.cancellationCutoffAt === 'string' ? booking.cancellationCutoffAt : null,
      lastClientManageActionAt:
        typeof booking.lastClientManageActionAt === 'string' ? booking.lastClientManageActionAt : null,
      clientManageDisabled: Boolean(booking.clientManageDisabled),
      paidInFullAt:
        typeof booking.paidInFullAt === 'string' ? booking.paidInFullAt : null,
      desiredLook:
        typeof booking.desiredLook === 'string' && booking.desiredLook.trim().length > 0
          ? booking.desiredLook.trim()
          : null,
      desiredLookStatus:
        booking.desiredLookStatus === 'recommended'
          ? 'recommended'
          : booking.desiredLookStatus === 'custom'
          ? 'custom'
          : null,
      desiredLookStatusMessage:
        typeof booking.desiredLookStatusMessage === 'string' && booking.desiredLookStatusMessage.trim().length > 0
          ? booking.desiredLookStatusMessage.trim()
          : null,
      desiredLookMatchesRecommendation: booking.desiredLookMatchesRecommendation === true,
      additionalServices: Array.isArray(booking.additionalServices)
        ? booking.additionalServices.map((s: any) => ({
            name: typeof s.name === 'string' ? s.name : '',
            price: typeof s.price === 'number' && !Number.isNaN(s.price) ? s.price : 0,
            addedAt: typeof s.addedAt === 'string' ? s.addedAt : new Date().toISOString(),
          }))
        : [],
      fine: booking.fine && typeof booking.fine === 'object'
        ? {
            amount: typeof booking.fine.amount === 'number' && !Number.isNaN(booking.fine.amount) ? booking.fine.amount : 0,
            reason: typeof booking.fine.reason === 'string' ? booking.fine.reason : '',
            addedAt: typeof booking.fine.addedAt === 'string' ? booking.fine.addedAt : new Date().toISOString(),
          }
        : undefined,
      isWalkIn: booking.isWalkIn === true,
      walkInFee: typeof booking.walkInFee === 'number' && !Number.isNaN(booking.walkInFee) ? booking.walkInFee : undefined,
    }
  }

  useEffect(() => {
    const requestedBookingId = searchParams?.get('bookingId')
    if (!requestedBookingId || bookings.length === 0) return
    const found = bookings.find((booking) => booking.id === requestedBookingId)
    if (!found) return
    const bookingDate = found.date || found.timeSlot?.split('T')[0] || ''
    if (bookingDate) {
      setSelectedDate(bookingDate)
    }
    setSelectedBooking(found)
  }, [searchParams, bookings])

  // Auto-fill cash amount with final price for walk-in bookings when cash/card payment is selected
  useEffect(() => {
    if (selectedBooking?.isWalkIn && (paymentMethod === 'cash' || paymentMethod === 'card') && selectedBooking.finalPrice) {
      // Convert to current currency if viewing in USD
      const convertedAmount = currency === 'USD' 
        ? convertCurrency(selectedBooking.finalPrice, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
        : selectedBooking.finalPrice
      setCashAmount(convertedAmount.toString())
    } else if (!selectedBooking?.isWalkIn && (paymentMethod === 'cash' || paymentMethod === 'card')) {
      // For regular bookings, set to balance if available
      const currentBalance = calculateBalance(selectedBooking)
      if (currentBalance > 0) {
        // Convert to current currency if viewing in USD
        const convertedBalance = currency === 'USD'
          ? convertCurrency(currentBalance, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
          : currentBalance
        setCashAmount(convertedBalance.toString())
      }
    }
  }, [selectedBooking?.isWalkIn, selectedBooking?.finalPrice, paymentMethod, selectedBooking, currency])

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        await Promise.all([loadBookings(), loadAvailability()])
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  useEffect(() => {
    const fetchFineAmount = async () => {
      try {
        const response = await fetch('/api/pre-appointment-guidelines')
        if (response.ok) {
          const data = await response.json()
          setPreAppointmentFineAmount(data.fineAmount || 500)
        }
      } catch (error) {
        console.error('Error fetching pre-appointment fine amount:', error)
      }
    }
    fetchFineAmount()
  }, [])

  useEffect(() => {
    const loadServices = async () => {
      setLoadingServices(true)
      try {
        const response = await fetch('/api/services')
        if (response.ok) {
          const data = await response.json()
          // Flatten all services from all categories into a single array
          const allServices: Array<{ id: string; name: string; price: number; priceUSD?: number }> = []
          if (data.categories && Array.isArray(data.categories)) {
            data.categories.forEach((category: any) => {
              if (category.services && Array.isArray(category.services)) {
                category.services.forEach((service: any) => {
                  allServices.push({
                    id: service.id,
                    name: service.name,
                    price: service.price || 0,
                    priceUSD: service.priceUSD,
                  })
                })
              }
            })
          }
          setAvailableServices(allServices)
        }
      } catch (error) {
        console.error('Error loading services:', error)
      } finally {
        setLoadingServices(false)
      }
    }
    loadServices()
  }, [])

  useEffect(() => {
    const fetchWalkInFee = async () => {
      try {
        const response = await authorizedFetch('/api/admin/walk-in-settings')
        if (response.ok) {
          const data = await response.json()
          setWalkInFee(data.walkInFee || 1000)
        }
      } catch (error) {
        console.error('Error fetching walk-in fee:', error)
      }
    }
    fetchWalkInFee()
  }, [])

  const loadBookings = async () => {
    try {
      const response = await authorizedFetch('/api/admin/bookings')
      if (response.ok) {
        const data = await response.json()
        const fetchedBookings: Booking[] = (data.bookings || []).map(normalizeBooking)
        setBookings(fetchedBookings)

        if (selectedBooking) {
          const updated = fetchedBookings.find((booking) => booking.id === selectedBooking.id)
          if (updated) {
            setSelectedBooking(updated)
          }
        }
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
      loadAvailability()
    }
  }

  const loadAvailability = async () => {
    setLoadingAvailability(true)
    try {
      const response = await authorizedFetch('/api/admin/availability')
      if (response.ok) {
        const data = await response.json()
        setAvailabilityData(data)
        const fullyBooked = Array.isArray(data?.fullyBookedDates) ? data.fullyBookedDates : []
        setFullyBookedDatesAdmin(fullyBooked)
        setPendingFullyBookedDates(fullyBooked)
      }
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleClearAllBookings = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true)
      return
    }

    setClearingBookings(true)
    try {
      const response = await authorizedFetch('/api/admin/bookings/clear', {
        method: 'POST',
      })
      if (response.ok) {
        setBookings([])
        setFullyBookedDatesAdmin([])
        setPendingFullyBookedDates([])
        setMessage({ type: 'success', text: 'All bookings and fully booked dates have been cleared' })
        setShowClearConfirm(false)
        // Reload availability to refresh fully booked dates
        await loadAvailability()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to clear bookings' })
      }
    } catch (error) {
      console.error('Error clearing bookings:', error)
      setMessage({ type: 'error', text: 'Failed to clear bookings' })
    } finally {
      setClearingBookings(false)
    }
  }

  const goToPreviousMonth = () => {
    const newMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    today.setDate(1)
    if (newMonth < today) return
    setCalendarMonth(newMonth)
  }

  const goToNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
  }

  const goToPreviousManagementMonth = () => {
    const newMonth = new Date(managementMonth.getFullYear(), managementMonth.getMonth() - 1, 1)
    const earliest = new Date()
    earliest.setHours(0, 0, 0, 0)
    earliest.setDate(1)
    if (newMonth < earliest) return
    setManagementMonth(newMonth)
  }

  const goToNextManagementMonth = () => {
    setManagementMonth(new Date(managementMonth.getFullYear(), managementMonth.getMonth() + 1, 1))
  }

  const getBookingsForCurrentMonth = () => {
    const monthStart = new Date(managementMonth.getFullYear(), managementMonth.getMonth(), 1)
    const monthEnd = new Date(managementMonth.getFullYear(), managementMonth.getMonth() + 1, 0)
    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]

    return bookings.filter((booking) => {
      if (booking.status === 'cancelled') return false
      const bookingDate = booking.date || booking.timeSlot?.split('T')[0]
      if (!bookingDate) return false
      return bookingDate >= monthStartStr && bookingDate <= monthEndStr
    })
  }


  const handleToggleFullyBooked = (dateStr: string, nextState: boolean) => {
    setPendingFullyBookedDates((prev) => {
      const currentSet = new Set(prev)
      if (nextState) {
        currentSet.add(dateStr)
      } else {
        currentSet.delete(dateStr)
      }
      return Array.from(currentSet).sort()
    })
    setMessage(null)
  }

  const handleSaveFullyBooked = async () => {
    if (!availabilityData) return
    setUpdatingFullyBooked(true)
    setMessage(null)

    const normalized = Array.from(new Set(pendingFullyBookedDates)).sort()

    const payload = {
      ...availabilityData,
      fullyBookedDates: normalized,
    }

    try {
      const response = await authorizedFetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update availability')
      }

      setAvailabilityData(payload)
      setFullyBookedDatesAdmin(normalized)
      setPendingFullyBookedDates(normalized)
      setMessage({
        type: 'success',
        text: 'Calendar availability updated successfully.',
      })
    } catch (error) {
      console.error('Error saving fully booked dates:', error)
      setMessage({ type: 'error', text: 'Failed to save availability changes.' })
    } finally {
      setUpdatingFullyBooked(false)
    }
  }

  const renderFullyBookedCalendar = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
    const startingDay = monthStart.getDay()
    const calendarDays: Array<Date | null> = []

    for (let i = 0; i < startingDay; i++) {
      calendarDays.push(null)
    }
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      calendarDays.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fullyBookedSet = new Set(pendingFullyBookedDates)
    const businessHours = availabilityData?.businessHours || {}
    const defaultEnabled: Record<string, boolean> = {
      sunday: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
    }

    return (
      <div className="border border-brown-light/40 rounded-2xl p-5 shadow-soft bg-[var(--color-surface,#fff)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-brown-dark">
              Unavailable dates
            </span>
              {hasFullyBookedChanges && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveFullyBooked}
            disabled={!hasFullyBookedChanges || updatingFullyBooked}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-md border border-emerald-700 hover:bg-emerald-700 hover:shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {updatingFullyBooked ? 'Saving…' : 'Save availability'}
          </button>
        </div>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={goToPreviousMonth}
            disabled={
              new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1) <=
              new Date(today.getFullYear(), today.getMonth(), 1)
            }
            className="px-3 py-2 rounded-lg border border-brown-light text-brown-dark text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brown-light/20 transition-colors"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold text-brown-dark">
            {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            type="button"
            onClick={goToNextMonth}
            className="px-3 py-2 rounded-lg border border-brown-light text-brown-dark text-sm font-semibold hover:bg-brown-light/20 transition-colors"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-1.5">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-brown-dark uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((dayDate, index) => {
            if (!dayDate) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const year = dayDate.getFullYear()
            const month = String(dayDate.getMonth() + 1).padStart(2, '0')
            const day = String(dayDate.getDate()).padStart(2, '0')
            const dateStr = `${year}-${month}-${day}`
            const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayDate.getDay()]
            const isBusinessEnabled =
              typeof businessHours?.[dayKey]?.enabled === 'boolean'
                ? businessHours[dayKey].enabled
                : defaultEnabled[dayKey]
            const isFullyBooked = fullyBookedSet.has(dateStr)
            const isPast = dayDate < today
            const isToday = dayDate.toDateString() === today.toDateString()

            let cellClasses =
              'relative aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all border '

            if (!isBusinessEnabled) {
              cellClasses += 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            } else if (isPast) {
              cellClasses += 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            } else if (isFullyBooked) {
              // Fully booked dates show as grey (unavailable) - same as clients see
              cellClasses +=
                'bg-gray-200 text-gray-600 border-gray-300 cursor-not-allowed shadow-inner'
            } else {
              cellClasses +=
                'bg-white text-brown-dark border-brown-light hover:bg-brown-light/20 hover:border-brown-dark cursor-pointer'
            }

            if (isToday && !isFullyBooked) {
              cellClasses += ' ring-2 ring-brown-dark/40'
            }

            const handleClick = () => {
              if (updatingFullyBooked || isPast || !isBusinessEnabled) return
              handleToggleFullyBooked(dateStr, !isFullyBooked)
            }

            return (
              <button
                key={dateStr}
                type="button"
                onClick={handleClick}
                disabled={updatingFullyBooked || isPast || !isBusinessEnabled}
                className={cellClasses}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderBookingsManagementCalendar = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthStart = new Date(managementMonth.getFullYear(), managementMonth.getMonth(), 1)
    const monthEnd = new Date(managementMonth.getFullYear(), managementMonth.getMonth() + 1, 0)
    const startingDay = monthStart.getDay()
    const calendarDays: Array<Date | null> = []

    for (let i = 0; i < startingDay; i++) {
      calendarDays.push(null)
    }
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      calendarDays.push(new Date(managementMonth.getFullYear(), managementMonth.getMonth(), day))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDateObj = selectedDate ? new Date(selectedDate) : null

    return (
      <div className="border border-brown-light/40 rounded-2xl p-4 shadow-soft bg-[var(--color-surface,#fff)] max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={goToPreviousManagementMonth}
            disabled={
              new Date(managementMonth.getFullYear(), managementMonth.getMonth(), 1) <=
              new Date(today.getFullYear(), today.getMonth(), 1)
            }
            className="px-3 py-2 rounded-lg border border-brown-light text-brown-dark text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brown-light/20 transition-colors"
            aria-label="Previous month"
          >
            ←
          </button>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-brown-dark">
              {managementMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <button
            type="button"
            onClick={goToNextManagementMonth}
            className="px-3 py-2 rounded-lg border border-brown-light text-brown-dark text-sm font-semibold hover:bg-brown-light/20 transition-colors"
            aria-label="Next month"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-xs font-semibold text-brown-dark uppercase tracking-wide">
          {dayNames.map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-sm">
          {calendarDays.map((dayDate, index) => {
            if (!dayDate) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const year = dayDate.getFullYear()
            const month = String(dayDate.getMonth() + 1).padStart(2, '0')
            const day = String(dayDate.getDate()).padStart(2, '0')
            const dateStr = `${year}-${month}-${day}`
            const bookingsForDay = bookingsByDate.get(dateStr) || []
            const hasBookings = bookingsForDay.length > 0
            const isSelected = selectedDate === dateStr
            const isToday = dayDate.toDateString() === today.toDateString()

            let cellClasses =
              'relative aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brown-dark'

            if (isSelected) {
              cellClasses += hasBookings
                ? ' bg-brown-600 text-white border-brown-700 shadow-[0_10px_22px_rgba(92,51,34,0.4)]'
                : ' bg-brown-500 text-white border-brown-600 shadow-[0_10px_22px_rgba(92,51,34,0.35)]'
            } else if (hasBookings) {
              cellClasses += ' bg-brown-700 text-white border-brown-800 hover:bg-brown-800 shadow-[0_8px_18px_rgba(88,44,29,0.35)]'
            } else {
              cellClasses += ' bg-white text-brown-900 border-brown-light hover:bg-brown-light/20 hover:border-brown-dark'
            }

            if (isSelected) {
              cellClasses += ' ring-2 ring-brown-dark ring-offset-2'
            } else if (isToday) {
              cellClasses += ' ring-1 ring-brown-dark/30'
            }

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate((prev) => (prev === dateStr ? '' : dateStr))}
                className={cellClasses}
                aria-pressed={isSelected}
                aria-label={`${formatDate(dateStr)} (${bookingsForDay.length} ${bookingsForDay.length === 1 ? 'booking' : 'bookings'})`}
              >
                <span className="text-base font-semibold leading-none">{day}</span>
                <span className={`text-xs font-medium ${hasBookings || isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                  {bookingsForDay.length} {bookingsForDay.length === 1 ? 'booking' : 'bookings'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const sendTestimonialRequest = async (booking: Booking) => {
    if (!['confirmed', 'paid'].includes(booking.status)) {
      setMessage({ type: 'error', text: 'Only active bookings can receive testimonial requests.' })
      return
    }

    setSendingRequest(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/send-testimonial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          email: booking.email,
          name: booking.name,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `Testimonial request sent to ${booking.email}` })
        loadBookings()
        // Update selected booking if it's the same one
        if (selectedBooking?.id === booking.id) {
          setSelectedBooking({ ...booking, testimonialRequested: true, testimonialRequestedAt: new Date().toISOString() })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send testimonial request' })
      }
    } catch (error) {
      console.error('Error sending testimonial request:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSendingRequest(false)
    }
  }

  const handleMarkAsPaid = async (booking: Booking, amount: number, method: 'cash' | 'card' = 'cash') => {
    if (booking.status !== 'confirmed') {
      setMessage({ type: 'error', text: 'You can only record payments for active bookings.' })
      return
    }

    setMarkingPaid(true)
    setMessage(null)

    const balance = calculateBalance(booking)

    if (amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      setMarkingPaid(false)
      return
    }

    // For walk-ins, validate against finalPrice; for regular bookings, validate against balance
    const maxAmount = booking.isWalkIn ? booking.finalPrice : balance
    if (amount > maxAmount) {
      const errorAmount = booking.isWalkIn ? booking.finalPrice : balance
      setMessage({ type: 'error', text: `Amount cannot exceed ${booking.isWalkIn ? 'final price' : 'balance due'} (${formatCurrencyContext(convertBookingPrice(errorAmount))})` })
      setMarkingPaid(false)
      return
    }

    try {
      const response = await authorizedFetch('/api/admin/bookings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: amount,
          paymentMethod: method,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const methodLabel = method === 'card' ? 'Card' : 'Cash'
        let updatedBooking: Booking | null = null
        
        if (data.booking) {
          updatedBooking = normalizeBooking(data.booking)
          setSelectedBooking(updatedBooking)
          setBookings((prev) => prev.map((bk) => (bk.id === updatedBooking!.id ? updatedBooking! : bk)))
        } else {
          const newDeposit = (booking.deposit || 0) + amount
          const isPaidInFull = newDeposit >= booking.finalPrice
          const paidTimestamp = isPaidInFull ? new Date().toISOString() : booking.paidInFullAt ?? null
          const updatedStatus: Booking['status'] = isPaidInFull ? 'paid' : booking.status
          updatedBooking = {
            ...booking,
            deposit: newDeposit,
            status: updatedStatus,
            paidInFullAt: paidTimestamp,
          }
          setSelectedBooking(updatedBooking)
          setBookings((prev) => prev.map((bk) => (bk.id === booking.id ? updatedBooking! : bk)))
        }
        
        // Check if booking is now fully paid and send aftercare email
        const finalBooking = updatedBooking || booking
        const isPaidInFull = (finalBooking.deposit || 0) >= finalBooking.finalPrice
        const wasPaidInFull = (booking.deposit || 0) >= booking.finalPrice
        
        if (isPaidInFull && !wasPaidInFull && finalBooking.email) {
          try {
            const aftercareResponse = await authorizedFetch('/api/booking/aftercare', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookingId: finalBooking.id }),
            })
            const aftercareData = await aftercareResponse.json()
            if (aftercareResponse.ok && aftercareData.success) {
              setMessage({ type: 'success', text: `${methodLabel} payment recorded and aftercare email sent to ${finalBooking.email}` })
            } else {
              setMessage({ type: 'success', text: `${methodLabel} payment of ${formatCurrencyContext(convertBookingPrice(amount))} recorded successfully` })
            }
          } catch (error) {
            console.error('Error sending aftercare email:', error)
            setMessage({ type: 'success', text: `${methodLabel} payment of ${formatCurrencyContext(convertBookingPrice(amount))} recorded successfully` })
          }
        } else {
          setMessage({ type: 'success', text: `${methodLabel} payment of ${formatCurrencyContext(convertBookingPrice(amount))} recorded successfully` })
        }
        
        loadBookings()
        setCashAmount('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to record payment' })
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setMarkingPaid(false)
    }
  }

  const sendBalancePayment = async (booking: Booking, phone: string) => {
    if (booking.status !== 'confirmed') {
      setMessage({ type: 'error', text: 'Only confirmed bookings can receive payment prompts.' })
      return
    }

    setSendingPayment(true)
    setMessage(null)

    // For walk-ins, they pay the full final price after appointment, not just the balance
    const amountToPay = booking.isWalkIn ? (booking.finalPrice || 0) : calculateBalance(booking)

    if (amountToPay <= 0) {
      setMessage({ type: 'error', text: 'No amount due for this booking' })
      setSendingPayment(false)
      return
    }

    if (!phone || phone.trim() === '') {
      setMessage({ type: 'error', text: 'Please enter a phone number' })
      setSendingPayment(false)
      return
    }

    try {
      const response = await authorizedFetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          amount: amountToPay,
          accountReference: booking.isWalkIn ? `WalkIn-${booking.id}` : `Balance-${booking.id}`,
          transactionDesc: booking.isWalkIn 
            ? `LashDiary Walk-In Full Payment - ${booking.service}`
            : `LashDiary Balance Payment - ${booking.service}`,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Save the checkout request ID to the booking for tracking
        try {
          await authorizedFetch('/api/admin/bookings/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: booking.id,
              amount: 0, // Will be updated when callback is received
              paymentMethod: 'mpesa',
              mpesaCheckoutRequestID: data.checkoutRequestID,
            }),
          })
        } catch (err) {
          console.error('Error saving checkout request ID:', err)
        }

        setMessage({ type: 'success', text: `M-Pesa prompt sent to ${phone.trim()} for ${formatCurrencyContext(convertBookingPrice(balance))}` })
        setMpesaPhone('')
        // Reload bookings to get updated data
        loadBookings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send M-Pesa prompt' })
      }
    } catch (error) {
      console.error('Error sending balance payment:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSendingPayment(false)
    }
  }

  const loadRescheduleSlots = async (date: string, booking: Booking) => {
    if (!date) {
      setRescheduleSlots([])
      setSelectedRescheduleSlot('')
      return
    }

    setLoadingRescheduleSlots(true)
    setRescheduleError(null)

    try {
      const response = await authorizedFetch(`/api/calendar/available-slots?date=${date}`)

      if (!response.ok) {
        throw new Error('Failed to fetch availability')
      }

      const data = await response.json()

      const slotsMap = new Map<string, { value: string; label: string }>()

      const addSlot = (rawValue: string | undefined, rawLabel?: string) => {
        if (!rawValue) return
        const normalizedValue = normalizeSlotISO(rawValue)
        if (!normalizedValue) return
        const label = rawLabel && rawLabel.trim().length > 0
          ? rawLabel
          : formatSlotLabel(normalizedValue)

        if (!slotsMap.has(normalizedValue)) {
          slotsMap.set(normalizedValue, { value: normalizedValue, label })
        }
      }

      if (Array.isArray(data.slots)) {
        data.slots.forEach((slot: any) => {
          if (typeof slot === 'string') {
            addSlot(slot)
          } else if (slot && typeof slot === 'object') {
            addSlot(slot.value, slot.label)
          }
        })
      }

      const currentSlotISO = normalizeSlotISO(booking.timeSlot)
      if (currentSlotISO && date === booking.date && !slotsMap.has(currentSlotISO)) {
        addSlot(currentSlotISO)
      }

      const uniqueSortedSlots = Array.from(slotsMap.values()).sort(
        (a, b) => new Date(a.value).getTime() - new Date(b.value).getTime()
      )

      setRescheduleSlots(uniqueSortedSlots)

      const initialSelection =
        date === booking.date && currentSlotISO
          ? currentSlotISO
          : uniqueSortedSlots.length > 0
            ? uniqueSortedSlots[0].value
            : ''

      setSelectedRescheduleSlot(initialSelection)

      if (uniqueSortedSlots.length === 0) {
        setRescheduleError('No available time slots for the selected date. Try another day.')
      }
    } catch (error) {
      console.error('Error loading reschedule slots:', error)
      setRescheduleSlots([])
      setSelectedRescheduleSlot('')
      setRescheduleError('Unable to load availability for the selected date.')
    } finally {
      setLoadingRescheduleSlots(false)
    }
  }

  const openRescheduleModal = () => {
    if (!selectedBooking) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const originalDate = new Date(selectedBooking.date + 'T00:00:00')
    originalDate.setHours(0, 0, 0, 0)

    let initialDate = selectedBooking.date
    let infoMessage: string | null = null

    if (originalDate < today) {
      initialDate = todayStr
      infoMessage = 'The original appointment date is already in the past, so we moved the picker to today. Choose any upcoming date to reschedule.'
    }

    setRescheduleDate(initialDate)
    setSendRescheduleEmail(true)
    setRescheduleError(null)
    setRescheduleInfo(infoMessage)
    loadRescheduleSlots(initialDate, selectedBooking)
    setShowRescheduleModal(true)
  }

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false)
    setProcessingReschedule(false)
    setRescheduleSlots([])
    setSelectedRescheduleSlot('')
    setRescheduleDate('')
    setRescheduleInfo(null)
  }

  const openCancellationModal = () => {
    if (!selectedBooking) return

    const hours = getHoursUntilAppointmentValue(selectedBooking)
    setHoursUntilAppointment(hours)

    setCancellationReason('')
    setShowCancelModal(true)
  }

  const closeCancellationModal = () => {
    setShowCancelModal(false)
    setProcessingCancellation(false)
    setHoursUntilAppointment(null)
  }

  const handleCancelBookingConfirm = async () => {
    if (!selectedBooking) return

    setProcessingCancellation(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          reason: cancellationReason.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Booking cancelled successfully.' })
        closeCancellationModal()
        if (data.booking) {
          setSelectedBooking(normalizeBooking(data.booking))
          setBookings((prev) =>
            prev.map((bk) => (bk.id === data.booking.id ? normalizeBooking(data.booking) : bk))
          )
        }
        loadBookings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to cancel booking.' })
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      setMessage({ type: 'error', text: 'An error occurred while cancelling the booking.' })
    } finally {
      setProcessingCancellation(false)
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedBooking) {
      setRescheduleError('No booking selected.')
      return
    }

    if (!rescheduleDate || !selectedRescheduleSlot) {
      setRescheduleError('Select a new date and time before confirming.')
      return
    }

    const newSlotTime = new Date(selectedRescheduleSlot).getTime()
    if (Number.isNaN(newSlotTime)) {
      setRescheduleError('Selected time is invalid. Please choose another slot.')
      return
    }

    const originalSlotTime = new Date(selectedBooking.timeSlot).getTime()
    if (newSlotTime === originalSlotTime) {
      setRescheduleError('The new slot matches the current booking. Please choose a different time.')
      return
    }

    if (newSlotTime < Date.now()) {
      setRescheduleError('The new slot is in the past. Please choose an upcoming time.')
      return
    }

    setProcessingReschedule(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          newDate: rescheduleDate,
          newTimeSlot: selectedRescheduleSlot,
          sendEmail: sendRescheduleEmail,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Booking rescheduled successfully.' })
        closeRescheduleModal()
        if (data.booking) {
          setSelectedBooking(normalizeBooking(data.booking))
          setBookings((prev) =>
            prev.map((bk) => (bk.id === data.booking.id ? normalizeBooking(data.booking) : bk))
          )
        }
        loadBookings()
      } else {
        setRescheduleError(data.error || 'Failed to reschedule booking.')
      }
    } catch (error) {
      console.error('Error rescheduling booking:', error)
      setRescheduleError('An error occurred while rescheduling. Please try again.')
    } finally {
      setProcessingReschedule(false)
    }
  }

  // Update M-Pesa phone when booking changes
  useEffect(() => {
    if (selectedBooking) {
      setMpesaPhone(selectedBooking.phone)
      const additionalServicesTotal = (selectedBooking.additionalServices || []).reduce((sum, s) => sum + s.price, 0)
      const fineAmount = selectedBooking.fine?.amount || 0
      const balance = selectedBooking.finalPrice - selectedBooking.deposit
      setCashAmount(balance > 0 ? balance.toString() : '')
    }
  }, [selectedBooking])

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId)
    const service = availableServices.find((s) => s.id === serviceId)
    if (service) {
      setNewServiceName(service.name)
      // Use price based on selected currency
      const price = currency === 'USD' && service.priceUSD !== undefined 
        ? service.priceUSD 
        : currency === 'USD' && service.price
        ? convertCurrency(service.price, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
        : service.price
      setNewServicePrice(price.toString())
    }
  }

  const handleAddService = async () => {
    if (!selectedBooking || !selectedServiceId || !newServiceName.trim() || !newServicePrice.trim()) {
      setMessage({ type: 'error', text: 'Please select a service' })
      return
    }

    // Check if maximum of 2 additional services has been reached
    const currentAdditionalServices = selectedBooking.additionalServices || []
    if (currentAdditionalServices.length >= 2) {
      setMessage({ type: 'error', text: 'Maximum of 2 additional services allowed per booking' })
      return
    }

    const price = parseFloat(newServicePrice)
    if (isNaN(price) || price <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid price' })
      return
    }

    setAddingService(true)
    try {
      // Convert price back to KES if USD is selected (bookings are stored in KES)
      const priceInKES = currency === 'USD' 
        ? convertCurrency(price, 'USD', 'KES', DEFAULT_EXCHANGE_RATE)
        : price

      const response = await authorizedFetch('/api/admin/bookings/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: 'add-service',
          serviceName: newServiceName.trim(),
          servicePrice: priceInKES,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Service added successfully' })
        setSelectedServiceId('')
        setNewServiceName('')
        setNewServicePrice('')
        setSelectedBooking(normalizeBooking(data.booking))
        loadBookings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add service' })
      }
    } catch (error) {
      console.error('Error adding service:', error)
      setMessage({ type: 'error', text: 'An error occurred while adding service' })
    } finally {
      setAddingService(false)
    }
  }

  const handleAddFine = async () => {
    if (!selectedBooking) {
      setMessage({ type: 'error', text: 'No booking selected' })
      return
    }

    if (selectedBooking.fine) {
      setMessage({ type: 'error', text: 'Fine has already been added to this booking' })
      return
    }

    setAddingFine(true)
    try {
      const response = await authorizedFetch('/api/admin/bookings/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: 'add-fine',
          fineReason: fineReason.trim() || 'Failure to follow pre-appointment guidelines (DO\'s and DON\'ts)',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Fine added successfully' })
        setFineReason('')
        setSelectedBooking(normalizeBooking(data.booking))
        loadBookings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add fine' })
      }
    } catch (error) {
      console.error('Error adding fine:', error)
      setMessage({ type: 'error', text: 'An error occurred while adding fine' })
    } finally {
      setAddingFine(false)
    }
  }

  const handleWalkInDateChange = async (date: string) => {
    setWalkInForm({ ...walkInForm, date, timeSlot: '' })
    if (!date) {
      setAvailableSlots([])
      return
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error('[Walk-In] Invalid date format:', date)
      setAvailableSlots([])
      return
    }

    setLoadingSlots(true)
    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/calendar/available-slots?date=${date}&t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (!response.ok) {
        console.error('[Walk-In] Failed to load slots:', response.status, response.statusText)
        setAvailableSlots([])
        return
      }

      const data = await response.json()
      
      if (data.error) {
        console.error('[Walk-In] API error:', data.error)
        setAvailableSlots([])
        return
      }

      // The API already returns slots in the format { value: string, label: string }[]
      // Just use them directly like the booking page does
      if (data.slots && Array.isArray(data.slots)) {
        setAvailableSlots(data.slots)
        if (data.slots.length === 0) {
          console.warn(`[Walk-In] No available slots for date: ${date}`)
        }
      } else {
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('[Walk-In] Error loading available slots:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleServiceSelectForWalkIn = (serviceId: string) => {
    const service = availableServices.find((s) => s.id === serviceId)
    if (service) {
      const price = currency === 'USD' && service.priceUSD !== undefined 
        ? service.priceUSD 
        : currency === 'USD' && service.price
        ? convertCurrency(service.price, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
        : service.price
      
      const priceWithFee = price + (currency === 'USD' 
        ? convertCurrency(walkInFee, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
        : walkInFee)
      
      // Walk-ins pay after appointment, no deposit required
      const depositAmount = 0
      
      setWalkInForm({
        ...walkInForm,
        service: service.name,
        originalPrice: price,
        deposit: depositAmount,
      })
    }
  }

  const handleCreateWalkIn = async () => {
    if (!walkInForm.name || !walkInForm.email || !walkInForm.phone || !walkInForm.service || !walkInForm.date || !walkInForm.timeSlot) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setCreatingWalkIn(true)
    try {
      // Convert prices to KES for storage
      const originalPriceKES = currency === 'USD' 
        ? convertCurrency(walkInForm.originalPrice, 'USD', 'KES', DEFAULT_EXCHANGE_RATE)
        : walkInForm.originalPrice
      
      const finalPriceKES = originalPriceKES + walkInFee
      // Walk-ins pay after appointment, no deposit required
      const depositKES = 0

      const response = await authorizedFetch('/api/admin/bookings/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: walkInForm.name,
          email: walkInForm.email,
          phone: walkInForm.phone,
          service: walkInForm.service,
          date: walkInForm.date,
          timeSlot: walkInForm.timeSlot,
          notes: walkInForm.notes,
          originalPrice: originalPriceKES,
          walkInFee,
          finalPrice: finalPriceKES,
          deposit: depositKES,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Walk-in booking created successfully. Client will receive an email confirmation.' })
        setShowWalkInModal(false)
        setWalkInForm({
          name: '',
          email: '',
          phone: '',
          service: '',
          date: '',
          timeSlot: '',
          notes: '',
          originalPrice: 0,
          deposit: 0,
        })
        loadBookings()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create walk-in booking' })
      }
    } catch (error) {
      console.error('Error creating walk-in booking:', error)
      setMessage({ type: 'error', text: 'An error occurred while creating walk-in booking' })
    } finally {
      setCreatingWalkIn(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatSlotLabel = (slot: string) => {
    return new Date(slot).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const normalizeSlotISO = (slot: string) => {
    const date = new Date(slot)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }

  const getHoursUntilAppointmentValue = (booking: Booking | null) => {
    if (!booking) return null
    const appointment = new Date(booking.timeSlot)
    if (Number.isNaN(appointment.getTime())) {
      return null
    }
    const diffMs = appointment.getTime() - Date.now()
    return diffMs / (1000 * 60 * 60)
  }

  const formatRefundStatusLabel = (status?: Booking['refundStatus']) => {
    switch (status) {
      case 'retained':
        return 'Deposit Retained'
      case 'refunded':
        return 'Deposit Refunded'
      case 'pending':
        return 'Refund Pending'
      case 'not_applicable':
        return 'Not Applicable'
      case 'not_required':
        return 'Not Required'
      default:
        return 'Unknown'
    }
  }

  const renderStatusBadge = (status: Booking['status']) => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold'
    switch (status) {
      case 'confirmed':
        return <span className={`${baseClasses} bg-green-100 text-green-700`}>Confirmed</span>
      case 'paid':
        return <span className={`${baseClasses} bg-emerald-100 text-emerald-700`}>Paid</span>
      case 'completed':
        return <span className={`${baseClasses} bg-blue-100 text-blue-700`}>Completed</span>
      case 'cancelled':
        return <span className={`${baseClasses} bg-red-100 text-red-700`}>Cancelled</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-700`}>Unknown</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }
  
  const balance = calculateBalance(selectedBooking)

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWalkInModal(true)}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-md"
            >
              + Create Walk-In Booking
            </button>
            {showClearConfirm && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearingBookings}
                className="px-4 py-2 rounded-lg bg-gray-500 text-white text-sm font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAllBookings}
              disabled={clearingBookings}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {clearingBookings ? 'Clearing...' : showClearConfirm ? 'Confirm Clear All' : 'Clear All Bookings'}
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-5 mb-8 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-display text-brown-dark">Unavailable Dates Calendar</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Click a date to mark it as unavailable. Unavailable dates will appear grey to clients and cannot be booked.
              </p>
            </div>
            {updatingFullyBooked && (
              <span className="text-sm text-brown-dark font-semibold">Saving changes…</span>
            )}
          </div>
          {loadingAvailability ? (
            <div className="text-center text-brown py-8">Loading availability calendar…</div>
          ) : (
            <>
              {renderFullyBookedCalendar()}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-4 h-4 rounded bg-gray-200 border border-gray-300" />
                  <span>Unavailable (clients see this day as grey and cannot book)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-block w-4 h-4 rounded bg-gray-200" />
                  <span>Unavailable via business hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-block w-4 h-4 rounded border border-brown-light bg-white" />
                  <span>Available day — click to mark as unavailable</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-5 mb-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl font-display text-brown-dark">Bookings Calendar</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Click a date to view bookings for that day. Dark squares show days with confirmed appointments.
                </p>
              </div>
              <div className="text-sm text-brown flex flex-col sm:items-end">
                <span className="font-semibold">Selected date:</span>
                <span className="text-brown-dark font-medium">
                  {selectedDate ? formatDate(selectedDate) : 'All dates'}
                </span>
                {selectedDate && (
                  <span className="text-xs text-gray-500">
                    {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'} on this day
                  </span>
                )}
              </div>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center text-brown py-8">No bookings yet — the calendar will activate once bookings arrive.</div>
            ) : (
              <>
                {renderBookingsManagementCalendar()}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-4 h-4 rounded bg-brown-700" />
                    <span>Has bookings</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-4 h-4 rounded border border-brown-light bg-white" />
                    <span>No bookings yet</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-block w-4 h-4 rounded border border-brown-dark ring-2 ring-offset-2 ring-brown-dark" />
                    <span>Selected day</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <h1 className="text-4xl font-display text-brown-dark">Bookings Management</h1>
            {bookings.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="self-start lg:self-auto px-4 py-2 rounded-lg border-2 border-brown-light text-sm font-semibold text-brown-dark hover:bg-brown-light/30 transition-colors"
              >
                Jump to today
              </button>
            )}
          </div>
          {bookings.length === 0 ? (
            <div className="text-center text-brown py-8">
              No bookings yet.
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center text-brown py-8">
              No bookings found for {selectedDate ? formatDate(selectedDate) : 'this selection'}.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {filteredBookings.map((booking) => {
                  const balance = calculateBalance(booking)
                  return (
                    <div
                      key={booking.id}
                      className={`bg-white rounded-lg border-2 border-brown-light p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${booking.status === 'cancelled' ? 'opacity-70' : ''}`}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-brown-dark text-base mb-1">{booking.name}</div>
                          <div className="text-sm text-brown-dark/70">{booking.service || 'N/A'}</div>
                        </div>
                        <div className="ml-2">
                          {renderStatusBadge(booking.status)}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date & Time:</span>
                          <span className="font-medium text-brown-dark">
                            {formatDate(booking.date)} {formatTime(booking.timeSlot)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Final Price:</span>
                          <span className="font-semibold">{formatCurrencyContext(convertBookingPrice(booking.finalPrice))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Deposit:</span>
                          <span className="text-green-600 font-semibold">{formatCurrencyContext(convertBookingPrice(booking.deposit))}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-brown-light/30">
                          <span className="text-gray-600 font-semibold">Balance:</span>
                          <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrencyContext(convertBookingPrice(balance))}
                          </span>
                        </div>
                        {booking.createdAt && (
                          <div className="text-xs text-gray-500 mt-2">
                            Booked {formatDateTime(booking.createdAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-brown-light">
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold text-sm">Client Name</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold text-sm">Service</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold text-sm">Date & Time</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold text-sm">Final Price ({currency})</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold text-sm">Deposit</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold text-sm">Balance</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => {
                      const balance = calculateBalance(booking)
                      return (
                      <tr 
                        key={booking.id} 
                        className={`border-b border-brown-light/30 hover:bg-pink-light/20 cursor-pointer transition-colors ${booking.status === 'cancelled' ? 'opacity-70' : ''}`}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <td className="py-3 px-4 text-brown font-medium">
                          <div className="font-semibold text-brown-dark">{booking.name}</div>
                          {booking.createdAt && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              Booked {formatDateTime(booking.createdAt)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-brown">{booking.service || 'N/A'}</td>
                        <td className="py-3 px-4 text-brown">
                          <div className="font-medium">{formatDate(booking.date)}</div>
                          <div className="text-sm text-gray-600">{formatTime(booking.timeSlot)}</div>
                        </td>
                        <td className="py-3 px-4 text-brown">
                          <span className="font-semibold">{formatCurrencyContext(convertBookingPrice(booking.finalPrice))}</span>
                        </td>
                        <td className="py-3 px-4 text-brown">
                          <span className="text-green-600 font-semibold">{formatCurrencyContext(convertBookingPrice(booking.deposit))}</span>
                        </td>
                        <td className="py-3 px-4 text-brown">
                          <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrencyContext(convertBookingPrice(balance))}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {renderStatusBadge(booking.status)}
                            {booking.status === 'cancelled' && booking.refundStatus && (
                              <span className="block text-xs text-gray-600">
                                {formatRefundStatusLabel(booking.refundStatus)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm px-2 sm:px-4 pt-4 sm:pt-8 md:pt-16 pb-4 sm:pb-8 overflow-y-auto"
          onClick={() => setSelectedBooking(null)}
        >
          <div 
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] sm:max-h-[82vh] overflow-y-auto border-2 border-brown-light my-4 sm:my-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/95 via-white/98 to-white" />
            <div className="relative p-4 sm:p-6 md:p-8 pb-20 sm:pb-24 overflow-y-auto max-h-[78vh]">
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display text-brown-dark">Booking Details</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-gray-600 text-3xl font-light transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Client Information */}
              <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                <h3 className="text-xl font-semibold text-brown-dark mb-4">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.phone}</p>
                  </div>
                </div>
                
                {/* Special Notes */}
                {selectedBooking.notes && (
                  <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">Special Notes / Instructions:</p>
                    <p className="text-sm text-yellow-900 whitespace-pre-wrap">{selectedBooking.notes}</p>
                  </div>
                )}

                {/* Appointment Preference */}
                {selectedBooking.appointmentPreference && (
                  <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <p className="text-sm font-semibold text-blue-800 mb-1">Appointment Preference:</p>
                    <p className="text-sm text-blue-900">
                      {selectedBooking.appointmentPreference === 'quiet' 
                        ? 'Quiet Appointment - I prefer minimal conversation' 
                        : selectedBooking.appointmentPreference === 'chat' 
                        ? 'Small Chat Session - I enjoy friendly conversation' 
                        : selectedBooking.appointmentPreference === 'either' 
                        ? 'Either is fine - I\'m flexible' 
                        : selectedBooking.appointmentPreference}
                    </p>
                  </div>
                )}
              </div>

              {/* Appointment Details */}
              <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                <h3 className="text-xl font-semibold text-brown-dark mb-4">Appointment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="text-brown-dark font-semibold">{selectedBooking.service || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderStatusBadge(selectedBooking.status)}
                      {selectedBooking.status === 'cancelled' && selectedBooking.cancelledAt && (
                        <span className="text-xs text-red-600 font-semibold">
                          Cancelled {formatDateTime(selectedBooking.cancelledAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-brown-dark font-semibold">{formatDate(selectedBooking.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="text-brown-dark font-semibold">{formatTime(selectedBooking.timeSlot)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Created</p>
                    <p className="text-brown-dark font-semibold">{formatDateTime(selectedBooking.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Details */}
              <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                <h3 className="text-xl font-semibold text-brown-dark mb-4">Pricing Details</h3>
                {selectedBooking.isWalkIn && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-semibold">Walk-In Booking</p>
                    {selectedBooking.walkInFee && (
                      <p className="text-xs text-yellow-700 mt-1">
                        Walk-In Fee: {formatCurrencyContext(convertBookingPrice(selectedBooking.walkInFee))}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Original Price:</span>
                    <span className="text-brown-dark font-semibold">{formatCurrencyContext(convertBookingPrice(selectedBooking.originalPrice))}</span>
                  </div>
                  {selectedBooking.isWalkIn && selectedBooking.walkInFee && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Walk-In Fee:</span>
                      <span className="text-red-600 font-semibold">+{formatCurrencyContext(convertBookingPrice(selectedBooking.walkInFee))}</span>
                    </div>
                  )}
                  {selectedBooking.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Discount
                        {selectedBooking.discountType === 'first-time' && <span className="text-xs text-gray-500 ml-1">(First-time)</span>}
                        {selectedBooking.discountType === 'promo' && selectedBooking.promoCode && (
                          <span className="text-xs text-gray-500 ml-1">({selectedBooking.promoCode})</span>
                        )}:
                      </span>
                      <span className="text-green-600 font-semibold">-{formatCurrencyContext(convertBookingPrice(selectedBooking.discount))}</span>
                    </div>
                  )}
                  
                  {/* Additional Services */}
                  {selectedBooking.additionalServices && selectedBooking.additionalServices.length > 0 && (
                    <div className="pt-2 border-t border-brown-light/30">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Additional Services:</p>
                      {selectedBooking.additionalServices.map((service, index) => (
                        <div key={index} className="flex justify-between items-center mb-1">
                          <span className="text-gray-600 text-sm">{service.name}:</span>
                          <span className="text-brown-dark font-semibold">{formatCurrencyContext(convertBookingPrice(service.price))}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fine */}
                  {selectedBooking.fine && (
                    <div className="pt-2 border-t border-brown-light/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-600">Fine (Pre-Appointment Violation):</span>
                          <p className="text-xs text-gray-500 mt-0.5">{selectedBooking.fine.reason}</p>
                        </div>
                        <span className="text-red-600 font-semibold">{formatCurrencyContext(convertBookingPrice(selectedBooking.fine.amount))}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-brown-light/30">
                    <span className="text-gray-600 font-semibold">Final Price:</span>
                    <span className="text-brown-dark font-bold text-lg">{formatCurrencyContext(convertBookingPrice(selectedBooking.finalPrice))}</span>
                  </div>
                  {!selectedBooking.isWalkIn && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Deposit Paid:</span>
                      <span className="text-green-600 font-semibold">{formatCurrencyContext(convertBookingPrice(selectedBooking.deposit))}</span>
                    </div>
                  )}
                  {!selectedBooking.isWalkIn && (
                    <div className="flex justify-between items-center pt-2 border-t-2 border-brown-light">
                      <span className="text-gray-600 font-bold">
                        Balance Due:
                      </span>
                      <span className={`font-bold text-xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrencyContext(convertBookingPrice(balance))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Service Section */}
              {(!selectedBooking.additionalServices || selectedBooking.additionalServices.length < 2) ? (
                <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-brown-dark">Add Service</h3>
                    <span className="text-sm text-gray-600">
                      {selectedBooking.additionalServices?.length || 0} / 2 services added
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-brown-dark mb-2">
                        Select Service
                      </label>
                      {loadingServices ? (
                        <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark text-center">
                          Loading services...
                        </div>
                      ) : (
                        <select
                          value={selectedServiceId}
                          onChange={(e) => handleServiceSelect(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        >
                          <option value="">-- Select a service --</option>
                          {availableServices.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {selectedServiceId && (
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Price ({currency})
                        </label>
                        <input
                          type="number"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Price is auto-filled but can be adjusted if needed
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleAddService}
                      disabled={addingService || !selectedServiceId || !newServicePrice.trim()}
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingService ? 'Adding...' : 'Add Service'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-300">
                  <h3 className="text-xl font-semibold text-brown-dark mb-2">Add Service</h3>
                  <p className="text-gray-600">
                    Maximum of 2 additional services has been reached for this booking.
                  </p>
                </div>
              )}

              {/* Add Fine Section */}
              {!selectedBooking.fine && (
                <div className="bg-red-50 rounded-lg p-6 border-2 border-red-200">
                  <h3 className="text-xl font-semibold text-brown-dark mb-4">Add Fine</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-brown-dark mb-2">
                        Fine Amount ({currency})
                      </label>
                      <div className="px-4 py-3 border-2 border-brown-light rounded-lg bg-gray-100 text-brown-dark font-semibold">
                        {formatCurrencyContext(convertBookingPrice(preAppointmentFineAmount))}
                        <span className="text-xs text-gray-500 ml-2">(from pre-appointment guidelines)</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-brown-dark mb-2">
                        Reason (Optional)
                      </label>
                      <input
                        type="text"
                        value={fineReason}
                        onChange={(e) => setFineReason(e.target.value)}
                        placeholder="Failure to follow pre-appointment guidelines (DO's and DON'Ts)"
                        className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                      />
                    </div>
                    <button
                      onClick={handleAddFine}
                      disabled={addingFine}
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingFine ? 'Adding...' : 'Add Fine'}
                    </button>
                  </div>
                </div>
              )}

            {selectedBooking.status === 'cancelled' && (
              <div className="bg-red-50 rounded-lg p-6 border-2 border-red-200">
                <h3 className="text-xl font-semibold text-red-700 mb-4">Cancellation & Refund</h3>
                <div className="space-y-3 text-sm text-red-800">
                  <div className="flex justify-between items-center">
                    <span>Cancelled By:</span>
                    <span className="font-semibold text-red-900 capitalize">{selectedBooking.cancelledBy || 'admin'}</span>
                  </div>
                  {selectedBooking.cancelledAt && (
                    <div className="flex justify-between items-center">
                      <span>Cancelled On:</span>
                      <span className="font-semibold text-red-900">{formatDateTime(selectedBooking.cancelledAt)}</span>
                    </div>
                  )}
                  {selectedBooking.cancellationReason && (
                    <div>
                      <p className="font-semibold text-red-900 mb-1">Reason Provided</p>
                      <p className="text-red-800 whitespace-pre-wrap">{selectedBooking.cancellationReason}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>Refund Status:</span>
                    <span className="font-semibold text-red-900">{formatRefundStatusLabel(selectedBooking.refundStatus)}</span>
                  </div>
                  {typeof selectedBooking.refundAmount === 'number' && (
                    <div className="flex justify-between items-center">
                      <span>Refund Amount:</span>
                      <span className="font-semibold text-red-900">{formatCurrencyContext(convertBookingPrice(selectedBooking.refundAmount))}</span>
                    </div>
                  )}
                  {selectedBooking.refundNotes && (
                    <div>
                      <p className="font-semibold text-red-900 mb-1">Notes</p>
                      <p className="text-red-800 whitespace-pre-wrap">{selectedBooking.refundNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedBooking.rescheduleHistory && selectedBooking.rescheduleHistory.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">Reschedule History</h3>
                <div className="space-y-4">
                  {selectedBooking.rescheduleHistory.map((entry, index) => (
                    <div
                      key={`${entry.rescheduledAt || index}-${selectedBooking.id}`}
                      className="bg-white/70 border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-blue-900">
                          Moved on {formatDateTime(entry.rescheduledAt)}
                        </span>
                        <span className="text-xs uppercase tracking-wide text-blue-700">
                          {entry.rescheduledBy || 'admin'}
                        </span>
                      </div>
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">From:</span> {formatDate(entry.fromDate)} at {formatTime(entry.fromTimeSlot)}
                      </p>
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">To:</span> {formatDate(entry.toDate)} at {formatTime(entry.toTimeSlot)}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-blue-700 mt-2">Notes: {entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Payment Information */}
              {selectedBooking.mpesaCheckoutRequestID && (
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <p className="text-sm text-gray-600">M-Pesa Checkout ID</p>
                  <p className="text-brown-dark font-semibold text-sm">{selectedBooking.mpesaCheckoutRequestID}</p>
                </div>
              )}

              {/* Walk-In Payment Notice */}
              {selectedBooking.isWalkIn && selectedBooking.status === 'confirmed' && (
                <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200 mb-4">
                  <p className="text-sm text-yellow-900 font-semibold mb-1">⚠️ Walk-In Booking</p>
                  <p className="text-xs text-yellow-800">
                    This is a walk-in booking. Payment is due after the appointment. Please record payment below once the client has paid.
                  </p>
                </div>
              )}

              {/* Payment Section - Show for walk-ins even if balance is 0 (to allow payment recording) */}
              {selectedBooking.status === 'confirmed' && (balance > 0 || selectedBooking.isWalkIn) && (
                <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                  <h3 className="text-xl font-semibold text-brown-dark mb-4">
                    {selectedBooking.isWalkIn ? 'Record Payment (Post-Appointment)' : 'Record Payment'}
                  </h3>
                  
                  {/* Payment Method Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-brown-dark mb-2">
                      Payment Method
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={paymentMethod === 'cash'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa')}
                          className="mr-2"
                        />
                        <span className="text-brown-dark">Cash</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="mpesa"
                          checked={paymentMethod === 'mpesa'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa' | 'card')}
                          className="mr-2"
                        />
                        <span className="text-brown-dark">M-Pesa</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa' | 'card')}
                          className="mr-2"
                        />
                        <span className="text-brown-dark">Card</span>
                      </label>
                    </div>
                  </div>

                  {/* Cash Payment */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Amount Paid ({currency})
                        </label>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder={selectedBooking.isWalkIn 
                            ? `Full Price: ${formatCurrencyContext(convertBookingPrice(selectedBooking.finalPrice))}`
                            : `Balance: ${formatCurrencyContext(convertBookingPrice(balance))}`}
                          min="0"
                          max={selectedBooking.isWalkIn ? selectedBooking.finalPrice : balance}
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedBooking.isWalkIn 
                            ? `Full price due: ${formatCurrencyContext(convertBookingPrice(selectedBooking.finalPrice))} (walk-in booking)`
                            : `Balance due: ${formatCurrencyContext(convertBookingPrice(balance))}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkAsPaid(selectedBooking, parseFloat(cashAmount) || 0)}
                        disabled={markingPaid || !cashAmount || parseFloat(cashAmount) <= 0}
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingPaid ? 'Recording...' : 'Mark as Paid'}
                      </button>
                    </div>
                  )}

                  {/* M-Pesa Payment */}
                  {paymentMethod === 'mpesa' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                          placeholder="2547XXXXXXXX"
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Default: {selectedBooking.phone} • You can change this if needed
                        </p>
                      </div>
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Amount:</strong> {formatCurrencyContext(convertBookingPrice(selectedBooking.isWalkIn ? selectedBooking.finalPrice : balance))}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {selectedBooking.isWalkIn 
                            ? 'An M-Pesa STK push will be sent for the full payment amount (walk-in booking)'
                            : 'An M-Pesa STK push will be sent to the phone number above'}
                        </p>
                      </div>
                      <button
                        onClick={() => sendBalancePayment(selectedBooking, mpesaPhone)}
                        disabled={sendingPayment || !mpesaPhone.trim()}
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingPayment ? 'Sending M-Pesa Prompt...' : `Send M-Pesa Prompt (${formatCurrencyContext(convertBookingPrice(selectedBooking.isWalkIn ? selectedBooking.finalPrice : balance))})`}
                      </button>
                    </div>
                  )}

                  {/* Card Payment */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Amount Paid ({currency})
                        </label>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder={selectedBooking.isWalkIn 
                            ? `Full Price: ${formatCurrencyContext(convertBookingPrice(selectedBooking.finalPrice))}`
                            : `Balance: ${formatCurrencyContext(convertBookingPrice(balance))}`}
                          min="0"
                          max={selectedBooking.isWalkIn ? selectedBooking.finalPrice : balance}
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedBooking.isWalkIn 
                            ? `Full price due: ${formatCurrencyContext(convertBookingPrice(selectedBooking.finalPrice))} (walk-in booking)`
                            : `Balance due: ${formatCurrencyContext(convertBookingPrice(balance))}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkAsPaid(selectedBooking, parseFloat(cashAmount) || 0, 'card')}
                        disabled={markingPaid || !cashAmount || parseFloat(cashAmount) <= 0}
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingPaid ? 'Recording...' : 'Paid in Card'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {balance <= 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                  <p className="text-green-700 font-semibold text-lg">✓ Fully Paid</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t-2 border-brown-light space-y-3">
                {['confirmed', 'paid'].includes(selectedBooking.status) && (
                  <>
                    <button
                      onClick={openRescheduleModal}
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      Reschedule Appointment
                    </button>
                    <button
                      onClick={openCancellationModal}
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
                <button
                  onClick={() => sendTestimonialRequest(selectedBooking)}
                  disabled={
                    sendingRequest ||
                    selectedBooking.testimonialRequested ||
                    !['confirmed', 'paid'].includes(selectedBooking.status)
                  }
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                    selectedBooking.testimonialRequested || selectedBooking.status !== 'confirmed'
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-brown-dark text-white hover:bg-brown'
                  } disabled:opacity-50`}
                >
                  {sendingRequest
                    ? 'Sending...'
                    : selectedBooking.testimonialRequested
                    ? '✓ Testimonial Request Sent'
                    : 'Request Testimonial'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 border-2 border-brown-light/60 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-display text-brown-dark">Cancel Booking</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedBooking.name} • {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.timeSlot)}
                </p>
              </div>
              <button
                onClick={closeCancellationModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close cancellation modal"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-pink-light/30 border-2 border-brown-light/60 rounded-lg p-4">
                <p className="text-sm text-brown-dark">
                  Appointments cancelled within <strong>10 hours</strong> keep the deposit. Earlier cancellations qualify for a full refund.
                </p>
                {typeof hoursUntilAppointment === 'number' && (
                  <p className="text-xs text-gray-600 mt-2">
                    Appointment starts in approximately {Math.max(hoursUntilAppointment, 0).toFixed(1)} hours.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2" htmlFor="cancellation-reason">
                  Cancellation Reason (optional)
                </label>
                <textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Why is the appointment being cancelled?"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>

              <div className="bg-white border-2 border-brown-light/60 rounded-lg p-4 space-y-3">
                <h4 className="text-lg font-semibold text-brown-dark">Deposits & Next Steps</h4>
                <p className="text-sm text-gray-600">
                  Deposits are strictly for securing the booking and cannot be refunded under any circumstance. Offer to reschedule the appointment if needed.
                </p>
                {selectedBooking.deposit > 0 && (
                  <p className="text-sm text-gray-600">
                    Deposit on file:{' '}
                    <span className="font-semibold text-brown-dark">
                      {formatCurrencyContext(convertBookingPrice(selectedBooking.deposit))}
                    </span>
                  </p>
                )}
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Suggest the next available date and encourage the client to pick a new slot.</li>
                  <li>If they can't make it, note who will come in their place so the experience stays seamless.</li>
                  <li>Log any follow-up tasks in your own workflow to keep customer service tight.</li>
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleCancelBookingConfirm}
                disabled={processingCancellation}
                className="w-full px-6 py-4 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#9b1c31] via-[#b82c42] to-[#9b1c31] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82c42] shadow-[0_10px_25px_-12px_rgba(155,28,49,0.65)]"
              >
                {processingCancellation ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}


      {showRescheduleModal && selectedBooking && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeRescheduleModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-8 border-2 border-blue-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-display text-blue-900">Reschedule Appointment</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedBooking.name} • currently {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.timeSlot)}
                </p>
              </div>
              <button
                onClick={closeRescheduleModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close reschedule modal"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-4 text-sm text-blue-900">
                <p>
                  Choose a new date and time slot. The system keeps the existing deposit and updates the calendar automatically.
                </p>
                  {rescheduleInfo && (
                    <p className="mt-2 text-xs text-blue-700">{rescheduleInfo}</p>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2" htmlFor="reschedule-date">
                    New Date
                  </label>
                  <input
                    id="reschedule-date"
                    type="date"
                    value={rescheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const value = e.target.value
                      setRescheduleDate(value)
                      setRescheduleError(null)
                      loadRescheduleSlots(value, selectedBooking)
                    }}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2" htmlFor="reschedule-time">
                    New Time Slot
                  </label>
                  {loadingRescheduleSlots ? (
                    <div className="px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                      Loading available times...
                    </div>
                  ) : rescheduleSlots.length > 0 ? (
                    <select
                      id="reschedule-time"
                      value={selectedRescheduleSlot}
                      onChange={(e) => {
                        setSelectedRescheduleSlot(e.target.value)
                        setRescheduleError(null)
                      }}
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                    >
                      <option value="" disabled>
                        Select a new time
                      </option>
                      {rescheduleSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 border-2 border-red-200 rounded-lg bg-red-50 text-red-700 text-sm">
                      No available time slots for the selected date. Try another day.
                    </div>
                  )}
                </div>
              </div>

              {rescheduleError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {rescheduleError}
                </div>
              )}

              <div className="bg-white border-2 border-brown-light/60 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-brown-dark mb-3">Notification</h4>
                <label className="flex items-start gap-3 text-sm text-brown-dark cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendRescheduleEmail}
                    onChange={(e) => setSendRescheduleEmail(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Send updated confirmation email to the client and owner.
                    <span className="block text-xs text-gray-500">Uses the same template as a new booking confirmation.</span>
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-semibold mb-1">Summary</p>
                <p>
                  <span className="font-semibold">Current:</span> {formatDate(selectedBooking.date)} at {formatTime(selectedBooking.timeSlot)}
                </p>
                {selectedRescheduleSlot && rescheduleDate && (
                  <p>
                    <span className="font-semibold">New:</span> {formatDate(rescheduleDate)} at {formatTime(selectedRescheduleSlot)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={closeRescheduleModal}
                className="w-full sm:w-1/2 px-6 py-3 rounded-lg font-semibold border-2 border-brown-light text-brown-dark hover:bg-brown-light/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleSubmit}
                disabled={processingReschedule || !rescheduleDate || !selectedRescheduleSlot}
                className="w-full sm:w-1/2 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingReschedule ? 'Rescheduling...' : 'Confirm New Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-In Booking Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 border-2 border-brown-light/60 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-display text-brown-dark">Create Walk-In Booking</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create a booking for a walk-in client. They will receive an email confirmation.
                </p>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close walk-in modal"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
                <p className="font-semibold mb-1">Walk-In Fee</p>
                <p>Walk-in clients are charged an additional {formatCurrencyContext(convertBookingPrice(walkInFee))} on top of the service price.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={walkInForm.name}
                    onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={walkInForm.email}
                    onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                    placeholder="client@example.com"
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={walkInForm.phone}
                    onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                    placeholder="2547XXXXXXXX"
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Service *
                  </label>
                  {loadingServices ? (
                    <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                      Loading services...
                    </div>
                  ) : (
                    <select
                      value={availableServices.find(s => s.name === walkInForm.service)?.id || ''}
                      onChange={(e) => handleServiceSelectForWalkIn(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                    >
                      <option value="">-- Select a service --</option>
                      {availableServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Date *
                  </label>
                  {loadingDates ? (
                    <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                      Loading available dates...
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={walkInForm.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleWalkInDateChange(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                    />
                  )}
                  {availableDateStrings.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {availableDateStrings.length} available date{availableDateStrings.length !== 1 ? 's' : ''} in booking window
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Time Slot *
                  </label>
                  {loadingSlots ? (
                    <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark">
                      Loading available times...
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <select
                      value={walkInForm.timeSlot}
                      onChange={(e) => setWalkInForm({ ...walkInForm, timeSlot: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                    >
                      <option value="">-- Select a time --</option>
                      {availableSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  ) : walkInForm.date ? (
                    <div className="w-full px-4 py-3 border-2 border-red-200 rounded-lg bg-red-50 text-red-700 text-sm">
                      No available time slots for this date
                    </div>
                  ) : (
                    <div className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-gray-100 text-gray-500">
                      Select a date first
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={walkInForm.notes}
                  onChange={(e) => setWalkInForm({ ...walkInForm, notes: e.target.value })}
                  placeholder="Any special notes or instructions..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>

              {walkInForm.service && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-brown-dark mb-3">Pricing Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Price:</span>
                      <span className="font-semibold">{formatCurrencyContext(convertBookingPrice(walkInForm.originalPrice))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Walk-In Fee:</span>
                      <span className="font-semibold text-red-600">+{formatCurrencyContext(convertBookingPrice(walkInFee))}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="font-semibold text-brown-dark">Final Price:</span>
                      <span className="font-bold text-lg text-brown-dark">
                        {formatCurrencyContext(convertBookingPrice(walkInForm.originalPrice + (currency === 'USD' ? convertCurrency(walkInFee, 'KES', 'USD', DEFAULT_EXCHANGE_RATE) : walkInFee)))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Deposit:</span>
                      <span className="font-semibold text-gray-500">
                        {formatCurrencyContext(0)} (Pay after appointment)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setShowWalkInModal(false)}
                className="w-full sm:w-1/2 px-6 py-3 rounded-lg font-semibold border-2 border-brown-light text-brown-dark hover:bg-brown-light/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWalkIn}
                disabled={creatingWalkIn || !walkInForm.name || !walkInForm.email || !walkInForm.phone || !walkInForm.service || !walkInForm.date || !walkInForm.timeSlot}
                className="w-full sm:w-1/2 px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingWalkIn ? 'Creating...' : 'Create Walk-In Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
