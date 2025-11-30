'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CalendarPicker from '@/components/CalendarPicker'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'

interface TimeSlot {
  value: string
  label: string
}

interface AvailableDate {
  value: string
  label: string
}

export default function GiftCardBooking() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const giftCardCode = searchParams.get('code')
  const { currency, formatCurrency } = useCurrency()
  
  const [giftCard, setGiftCard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [availableDateStrings, setAvailableDateStrings] = useState<string[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingDates, setLoadingDates] = useState(false)
  
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+254')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  // Validate gift card code
  useEffect(() => {
    if (!giftCardCode) {
      setError('Gift card code is required')
      setLoading(false)
      return
    }

    const validateGiftCard = async () => {
      try {
        const response = await fetch(`/api/gift-cards/validate?code=${encodeURIComponent(giftCardCode)}`)
        const data = await response.json()
        
        if (data.valid && data.card) {
          setGiftCard(data.card)
        } else {
          setError(data.error || 'Invalid gift card code')
        }
      } catch (err: any) {
        setError('Failed to validate gift card. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    validateGiftCard()
  }, [giftCardCode])

  // Load available dates - same as normal booking page
  useEffect(() => {
    if (!giftCard) return // Wait for gift card validation
    
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
        const dates: AvailableDate[] = Array.isArray(data?.dates) ? data.dates : []
        const dateStrings = dates.map((entry) => entry.value)
        setAvailableDates(dates)
        setAvailableDateStrings(dateStrings)
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
  }, [giftCard])

  // Load time slots when date is selected - same as normal booking page
  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([])
      return
    }

    const fetchTimeSlots = async () => {
      setLoadingSlots(true)
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/calendar/available-slots?date=${selectedDate}&t=${timestamp}`, {
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
    
    fetchTimeSlots()
  }, [selectedDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get recipient info from gift card
    const recipientName = giftCard?.recipient?.name
    const recipientEmail = giftCard?.recipient?.email
    
    if (!recipientName || !recipientEmail) {
      setSubmitStatus({ type: 'error', message: 'Gift card recipient information is missing. Please contact support.' })
      return
    }
    
    if (!phone || !selectedDate || !selectedTime) {
      setSubmitStatus({ type: 'error', message: 'Please fill in all required fields' })
      return
    }

    setSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      // Get service catalog to find a default service
      const servicesResponse = await fetch('/api/services')
      const servicesData = await servicesResponse.json()
      
      // Use the first available service or a default
      let serviceName = 'Classic Full Set'
      if (servicesData.catalog && servicesData.catalog.categories) {
        const firstCategory = servicesData.catalog.categories[0]
        if (firstCategory && firstCategory.services && firstCategory.services.length > 0) {
          serviceName = firstCategory.services[0].name
        }
      }

      const bookingResponse = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recipientName,
          email: recipientEmail,
          phone: `${countryCode}${phone.replace(/\D/g, '')}`,
          date: selectedDate,
          timeSlot: selectedTime,
          service: serviceName,
          giftCardCode: giftCardCode,
          paymentType: 'full',
          deposit: '0',
          finalPrice: '0',
          notes: notes.trim() || undefined,
        }),
      })

      const bookingData = await bookingResponse.json()

      if (bookingResponse.ok && bookingData.success) {
        setSubmitStatus({ type: 'success', message: 'Booking confirmed! Check your email for details.' })
        // Redirect to success page or show success message
        setTimeout(() => {
          router.push(`/booking/manage/${bookingData.manageToken}`)
        }, 2000)
      } else {
        setSubmitStatus({ type: 'error', message: bookingData.error || 'Failed to create booking. Please try again.' })
      }
    } catch (err: any) {
      setSubmitStatus({ type: 'error', message: err.message || 'An error occurred. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-brown text-lg">Validating gift card...</div>
        </div>
      </div>
    )
  }

  if (error || !giftCard) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-display text-brown-dark mb-4">🎁 Gift Card Booking</h1>
          <p className="text-red-600 mb-6">{error || 'Gift card not found or invalid'}</p>
          <Link href="/" className="text-brown-dark hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-display text-brown-dark mb-4">🎁 Book with Your Gift Card</h1>
          <p className="text-brown text-lg">
            Your gift card balance: <strong className="text-brown-dark">{formatCurrency(giftCard.amount)}</strong>
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-soft border border-brown-light/30 p-6 sm:p-10 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <h2 className="text-2xl font-display text-brown-dark mb-4">Select Date *</h2>
              <CalendarPicker
                selectedDate={selectedDate || ''}
                onDateSelect={setSelectedDate}
                availableDates={availableDateStrings}
                loading={loadingDates}
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <h2 className="text-2xl font-display text-brown-dark mb-4">Select Time *</h2>
                {loadingSlots ? (
                  <div className="text-brown">Loading available times...</div>
                ) : timeSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => setSelectedTime(slot.value)}
                        className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                          selectedTime === slot.value
                            ? 'border-brown-dark bg-brown-dark text-white'
                            : 'border-brown-light text-brown-dark hover:border-brown hover:bg-brown-light/20'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-brown">No available time slots for this date. Please select another date.</p>
                )}
              </div>
            )}

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-display text-brown-dark mb-4">Your Information</h2>
              {giftCard?.recipient && (
                <div className="bg-brown-light/20 rounded-xl p-4 border-2 border-brown-light mb-4">
                  <p className="text-sm text-brown-dark mb-1">
                    <strong>Name:</strong> {giftCard.recipient.name || 'Not provided'}
                  </p>
                  <p className="text-sm text-brown-dark">
                    <strong>Email:</strong> {giftCard.recipient.email || 'Not provided'}
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Phone Number *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                    >
                      <option value="+254">+254</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="712345678"
                      className="flex-1 px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or notes for your appointment..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg focus:ring-2 focus:ring-brown focus:border-brown resize-none"
              />
              <p className="text-xs text-brown/70 mt-1">
                Let us know if you have any special requests or notes for your appointment.
              </p>
            </div>

            {/* Gift Card Info */}
            <div className="bg-brown-light/20 rounded-xl p-4 border-2 border-brown-light">
              <p className="text-sm text-brown-dark mb-2">Gift Card Code: <strong className="font-mono">{giftCard.code}</strong></p>
              <p className="text-sm text-brown-dark">Balance: <strong>{formatCurrency(giftCard.amount)}</strong></p>
            </div>

            {submitStatus.message && (
              <div className={`p-4 rounded-lg ${
                submitStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {submitStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedDate || !selectedTime || !phone || !giftCard?.recipient?.name || !giftCard?.recipient?.email}
              className="w-full px-6 py-4 bg-brown-dark text-white rounded-lg font-semibold text-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

