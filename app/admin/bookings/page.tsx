'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

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
  status: 'confirmed' | 'cancelled' | 'completed'
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
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, { credentials: 'include', ...init })
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [sendingPayment, setSendingPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [refundOption, setRefundOption] = useState<'retain' | 'refund_now' | 'refund_pending'>('retain')
  const [refundAmountInput, setRefundAmountInput] = useState('0')
  const [refundNotes, setRefundNotes] = useState('')
  const [processingCancellation, setProcessingCancellation] = useState(false)
  const [hoursUntilAppointment, setHoursUntilAppointment] = useState<number | null>(null)
  const [recommendedRefundOption, setRecommendedRefundOption] = useState<'retain' | 'refund_now'>('retain')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlots, setRescheduleSlots] = useState<Array<{ value: string; label: string }>>([])
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState('')
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false)
  const [sendRescheduleEmail, setSendRescheduleEmail] = useState(true)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [processingReschedule, setProcessingReschedule] = useState(false)
  const [rescheduleInfo, setRescheduleInfo] = useState<string | null>(null)
  const router = useRouter()

  const normalizeBooking = (booking: any): Booking => {
    const depositValue = Number.isFinite(booking.deposit) ? Number(booking.deposit) : 0
    return {
      ...booking,
      status: booking.status || 'confirmed',
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
    }
  }

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
        loadBookings()
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
    }
  }

  const sendTestimonialRequest = async (booking: Booking) => {
    if (booking.status !== 'confirmed') {
      setMessage({ type: 'error', text: 'Only confirmed bookings can receive testimonial requests.' })
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

  const handleMarkAsPaid = async (booking: Booking, amount: number) => {
    if (booking.status !== 'confirmed') {
      setMessage({ type: 'error', text: 'You can only record payments for active bookings.' })
      return
    }

    setMarkingPaid(true)
    setMessage(null)

    const balance = booking.finalPrice - booking.deposit

    if (amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      setMarkingPaid(false)
      return
    }

    if (amount > balance) {
      setMessage({ type: 'error', text: `Amount cannot exceed balance due (KSH ${balance.toLocaleString()})` })
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
          paymentMethod: 'cash',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `Cash payment of KSH ${amount.toLocaleString()} recorded successfully` })
        loadBookings()
        // Update selected booking
        const updatedBalance = booking.finalPrice - booking.deposit - amount
        setSelectedBooking({
          ...booking,
          deposit: booking.deposit + amount,
        })
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

    const balance = booking.finalPrice - booking.deposit

    if (balance <= 0) {
      setMessage({ type: 'error', text: 'No balance due for this booking' })
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
          amount: balance,
          accountReference: `Balance-${booking.id}`,
          transactionDesc: `LashDiary Balance Payment - ${booking.service}`,
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

        setMessage({ type: 'success', text: `M-Pesa prompt sent to ${phone.trim()} for KSH ${balance.toLocaleString()}` })
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

    const recommended = hours !== null && hours >= 10 ? 'refund_now' : 'retain'
    setRecommendedRefundOption(recommended)

    if ((selectedBooking.deposit || 0) > 0) {
      setRefundOption(recommended)
      setRefundAmountInput(selectedBooking.deposit.toString())
    } else {
      setRefundOption('retain')
      setRefundAmountInput('0')
    }

    setCancellationReason('')
    setRefundNotes('')
    setShowCancelModal(true)
  }

  const closeCancellationModal = () => {
    setShowCancelModal(false)
    setProcessingCancellation(false)
    setHoursUntilAppointment(null)
  }

  const handleCancelBookingConfirm = async () => {
    if (!selectedBooking) return

    const depositAmount = selectedBooking.deposit || 0

    if (depositAmount > 0 && refundOption !== 'retain') {
      const parsedAmount = Number(refundAmountInput)
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        setMessage({ type: 'error', text: 'Please enter a valid refund amount.' })
        return
      }

      if (parsedAmount > depositAmount) {
        setMessage({ type: 'error', text: 'Refund amount cannot exceed the deposit received.' })
        return
      }
    }

    setProcessingCancellation(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          reason: cancellationReason.trim() || undefined,
          refundAction: refundOption,
          refundAmount: refundOption === 'retain' ? 0 : Number(refundAmountInput) || 0,
          refundNotes: refundNotes.trim() || undefined,
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
      const balance = selectedBooking.finalPrice - selectedBooking.deposit
      setCashAmount(balance > 0 ? balance.toString() : '')
    }
  }, [selectedBooking])

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

  const balance = selectedBooking ? Math.max(selectedBooking.finalPrice - selectedBooking.deposit, 0) : 0

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
        </div>

        {/* Toast Notification */}
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Bookings Management</h1>
          
          {bookings.length === 0 ? (
            <div className="text-center text-brown py-8">
              No bookings yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-brown-light">
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Client Name</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Service</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Date & Time</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Final Price</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Deposit</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Balance</th>
                    <th className="text-left py-3 px-4 text-brown-dark font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const balance = booking.finalPrice - booking.deposit
                    return (
                    <tr 
                      key={booking.id} 
                      className={`border-b border-brown-light/30 hover:bg-pink-light/20 cursor-pointer transition-colors ${booking.status === 'cancelled' ? 'opacity-70' : ''}`}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="py-3 px-4 text-brown font-medium">{booking.name}</td>
                      <td className="py-3 px-4 text-brown">{booking.service || 'N/A'}</td>
                      <td className="py-3 px-4 text-brown">
                        <div className="font-medium">{formatDate(booking.date)}</div>
                        <div className="text-sm text-gray-600">{formatTime(booking.timeSlot)}</div>
                      </td>
                      <td className="py-3 px-4 text-brown">
                        <span className="font-semibold">KSH {booking.finalPrice.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-brown">
                        <span className="text-green-600 font-semibold">KSH {booking.deposit.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-brown">
                        <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          KSH {balance.toLocaleString()}
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
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 pt-24 sm:pt-16"
          onClick={() => setSelectedBooking(null)}
        >
          <div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[82vh] overflow-hidden border-2 border-brown-light"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/95 via-white/98 to-white" />
            <div className="relative p-8 pb-24 overflow-y-auto max-h-[78vh]">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-display text-brown-dark">Booking Details</h2>
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
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Original Price:</span>
                    <span className="text-brown-dark font-semibold">KSH {selectedBooking.originalPrice.toLocaleString()}</span>
                  </div>
                  {selectedBooking.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        Discount
                        {selectedBooking.discountType === 'first-time' && <span className="text-xs text-gray-500 ml-1">(First-time)</span>}
                        {selectedBooking.discountType === 'promo' && selectedBooking.promoCode && (
                          <span className="text-xs text-gray-500 ml-1">({selectedBooking.promoCode})</span>
                        )}:
                      </span>
                      <span className="text-green-600 font-semibold">-KSH {selectedBooking.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-brown-light/30">
                    <span className="text-gray-600 font-semibold">Final Price:</span>
                    <span className="text-brown-dark font-bold text-lg">KSH {selectedBooking.finalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Deposit Paid:</span>
                    <span className="text-green-600 font-semibold">KSH {selectedBooking.deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-brown-light">
                    <span className="text-gray-600 font-bold">Balance Due:</span>
                    <span className={`font-bold text-xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      KSH {balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

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
                      <span className="font-semibold text-red-900">KSH {selectedBooking.refundAmount.toLocaleString()}</span>
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

              {/* Payment Section */}
              {balance > 0 && selectedBooking.status === 'confirmed' && (
                <div className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light">
                  <h3 className="text-xl font-semibold text-brown-dark mb-4">Record Payment</h3>
                  
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
                          onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'mpesa')}
                          className="mr-2"
                        />
                        <span className="text-brown-dark">M-Pesa</span>
                      </label>
                    </div>
                  </div>

                  {/* Cash Payment */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-brown-dark mb-2">
                          Amount Paid (KSH)
                        </label>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder={`Balance: KSH ${balance.toLocaleString()}`}
                          min="0"
                          max={balance}
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Balance due: KSH {balance.toLocaleString()}
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
                          placeholder="254712345678"
                          className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Default: {selectedBooking.phone} • You can change this if needed
                        </p>
                      </div>
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Amount:</strong> KSH {balance.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          An M-Pesa STK push will be sent to the phone number above
                        </p>
                      </div>
                      <button
                        onClick={() => sendBalancePayment(selectedBooking, mpesaPhone)}
                        disabled={sendingPayment || !mpesaPhone.trim()}
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingPayment ? 'Sending M-Pesa Prompt...' : `Send M-Pesa Prompt (KSH ${balance.toLocaleString()})`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {balance <= 0 && selectedBooking.status === 'confirmed' && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                  <p className="text-green-700 font-semibold text-lg">✓ Fully Paid</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t-2 border-brown-light space-y-3">
                {selectedBooking.status === 'confirmed' && (
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
                    selectedBooking.status !== 'confirmed'
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

              {selectedBooking.deposit > 0 && (
                <div className="bg-white border-2 border-brown-light/60 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-brown-dark mb-3">Deposit Handling</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Deposit received: <span className="font-semibold text-brown-dark">KSH {selectedBooking.deposit.toLocaleString()}</span>
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="refundOption"
                        value="retain"
                        checked={refundOption === 'retain'}
                        onChange={(e) => setRefundOption(e.target.value as 'retain' | 'refund_now' | 'refund_pending')}
                        className="mt-1"
                      />
                      <span className="text-sm text-brown-dark">
                        Keep deposit ({recommendedRefundOption === 'retain' ? 'Recommended' : 'Allowed for last-minute cancellations'})
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="refundOption"
                        value="refund_now"
                        checked={refundOption === 'refund_now'}
                        onChange={(e) => setRefundOption(e.target.value as 'retain' | 'refund_now' | 'refund_pending')}
                        className="mt-1"
                      />
                      <span className="text-sm text-brown-dark">
                        Refund now ({recommendedRefundOption === 'refund_now' ? 'Recommended for timely cancellations' : 'Optional'})
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="refundOption"
                        value="refund_pending"
                        checked={refundOption === 'refund_pending'}
                        onChange={(e) => setRefundOption(e.target.value as 'retain' | 'refund_now' | 'refund_pending')}
                        className="mt-1"
                      />
                      <span className="text-sm text-brown-dark">
                        Will refund later (remind me to process the refund)
                      </span>
                    </label>
                  </div>

                  {refundOption !== 'retain' && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-brown-dark mb-2" htmlFor="refund-amount">
                        Refund Amount (KSH)
                      </label>
                      <input
                        id="refund-amount"
                        type="number"
                        min="0"
                        max={selectedBooking.deposit}
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum refund: KSH {selectedBooking.deposit.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedBooking.deposit <= 0 && (
                <div className="bg-white border-2 border-brown-light/60 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-brown-dark mb-2">Deposit Handling</h4>
                  <p className="text-sm text-gray-600">
                    No deposit was collected for this booking. You can cancel without tracking a refund.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2" htmlFor="refund-notes">
                  Internal Notes (optional)
                </label>
                <textarea
                  id="refund-notes"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Record refund reference numbers or follow-up reminders"
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
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
    </div>
  )
}
