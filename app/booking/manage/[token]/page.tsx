'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type ManageBookingResponse = {
  booking: {
    id: string
    name: string
    email: string
    phone: string
    service: string
    date: string
    timeSlot: string
    location?: string
    notes?: string
    status: string
    finalPrice?: number
    deposit?: number
    cancellationPolicyHours: number
    cancellationCutoffAt: string
    withinPolicyWindow: boolean
    within24Hours?: boolean
    isPast: boolean
    canCancel: boolean
    canReschedule: boolean
    canManage: boolean
    lastClientManageActionAt?: string | null
  }
}

type AvailableSlot = {
  value: string
  label: string
}

type Feedback = { type: 'success' | 'error'; message: string } | null

export default function ManageBookingPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [booking, setBooking] = useState<ManageBookingResponse['booking'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [rescheduleMode, setRescheduleMode] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState<string>('')
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([])
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('')
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false)
  const [serviceChangeMode, setServiceChangeMode] = useState(false)
  const [availableServices, setAvailableServices] = useState<Array<{ name: string; price: number }>>([])
  const [selectedNewService, setSelectedNewService] = useState<string>('')
  const [loadingServices, setLoadingServices] = useState(false)

  useEffect(() => {
    if (!token) return

    let isMounted = true

    const loadBooking = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/booking/manage/${token}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Unable to load your appointment.')
        }
        const data: ManageBookingResponse = await response.json()
        if (isMounted) {
          setBooking(data.booking)
          setRescheduleDate('')
          setRescheduleSlots([])
          setRescheduleSlot('')
          setRescheduleMode(false)
          setServiceChangeMode(false)
          setSelectedNewService('')
        }
      } catch (err: any) {
        if (!isMounted) return
        const aborted =
          err?.name === 'AbortError' ||
          err?.code === 20 ||
          /abort/i.test(err?.message || '')
        if (aborted) {
          return
        }
        setError(err?.message || 'Unable to load your appointment.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadBooking()

    return () => {
      isMounted = false
    }
  }, [token])

  const formattedDate = useMemo(() => {
    if (!booking) return ''
    try {
      return new Date(booking.timeSlot).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return `${booking.date} at ${booking.timeSlot}`
    }
  }, [booking])

  const loadSlotsFor = async (
    date: string,
    setSlots: (slots: AvailableSlot[]) => void,
    setSelected: (value: string) => void,
    setLoading: (value: boolean) => void,
  ) => {
    setLoading(true)
    setSlots([])
    setSelected('')
    try {
      const response = await fetch(`/api/calendar/available-slots?date=${date}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Could not load available times for that day.')
      }
      const data = await response.json()
      const slots: AvailableSlot[] = Array.isArray(data?.slots) ? data.slots : []
      setSlots(slots)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to load available times for that day.',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableServices = async () => {
    setLoadingServices(true)
    try {
      const response = await fetch('/api/services', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Could not load services.')
      }
      const data = await response.json()
      const services: Array<{ name: string; price: number }> = []
      
      if (Array.isArray(data.categories)) {
        data.categories.forEach((category: any) => {
          if (Array.isArray(category.services)) {
            category.services.forEach((service: any) => {
              if (service.name && service.name !== booking?.service) {
                services.push({
                  name: service.name,
                  price: service.price || 0,
                })
              }
            })
          }
        })
      }
      
      setAvailableServices(services)
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to load available services.',
      })
    } finally {
      setLoadingServices(false)
    }
  }

  const handleReschedule = async () => {
    if (!booking || !token) return
    if (!rescheduleDate) {
      setFeedback({ type: 'error', message: 'Choose a new date first.' })
      return
    }
    if (!rescheduleSlot) {
      setFeedback({ type: 'error', message: 'Pick an available time to continue.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/booking/manage/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          newDate: rescheduleDate,
          newTimeSlot: rescheduleSlot,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'We could not reschedule your appointment.')
      }
      setBooking(data.booking)
      setRescheduleMode(false)
      setRescheduleDate('')
      setRescheduleSlots([])
      setRescheduleSlot('')
      setFeedback({ type: 'success', message: 'Your appointment has been rescheduled successfully. A confirmation email has been sent.' })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'We could not reschedule your appointment. Please contact the studio.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleServiceChange = async () => {
    if (!booking || !token) return
    if (!selectedNewService) {
      setFeedback({ type: 'error', message: 'Please select a new service.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/booking/manage/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-service',
          newService: selectedNewService,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'We could not change your service.')
      }
      setBooking(data.booking)
      setServiceChangeMode(false)
      setSelectedNewService('')
      setFeedback({ 
        type: 'success', 
        message: 'Your service has been changed successfully. A confirmation email has been sent.' 
      })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'We could not change your service. Please contact the studio.',
      })
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-pink-light flex items-center justify-center">
        <div className="text-brown-dark font-medium">Retrieving your appointment…</div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-pink-light flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-soft p-8 text-center space-y-4">
          <h1 className="text-2xl font-display text-brown-dark">We couldn&apos;t find that appointment</h1>
          <p className="text-brown">
            {error ||
              'The link you used may have expired or been disabled. Please reach out to the LashDiary team for help.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-brown-dark text-white font-semibold shadow-soft hover:shadow-lg transition"
          >
            Back to website
          </Link>
        </div>
      </div>
    )
  }

  const isWithinWindow = booking.withinPolicyWindow
  const isWithin24Hours = booking.within24Hours ?? false

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-sm text-brown hover:text-brown-dark font-medium">
            ← Back to LashDiary
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-soft px-6 py-8 sm:px-10 space-y-6 border border-brown-light/40">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-brown">Manage your booking</p>
            <h1 className="text-3xl sm:text-4xl font-display text-brown-dark">{booking.service || 'Lash Appointment'}</h1>
            <p className="text-brown text-lg">{formattedDate}</p>
            {booking.location && <p className="text-sm text-brown">Studio: {booking.location}</p>}
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs sm:text-sm text-orange-900">
            Deposits are strictly for securing your booking and cannot be refunded under any circumstance. Reschedule your appointment up to 24 hours before your start time.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-pink-light/50 border border-pink-light px-4 py-3">
              <p className="text-sm text-brown">Client</p>
              <p className="text-lg font-semibold text-brown-dark">{booking.name}</p>
              <p className="text-sm text-brown mt-1">{booking.email}</p>
            </div>
            <div className="rounded-2xl bg-pink-light/50 border border-pink-light px-4 py-3">
              <p className="text-sm text-brown">Deposit</p>
              <p className="text-lg font-semibold text-brown-dark">
                {booking.deposit ? `KSH ${booking.deposit.toLocaleString()}` : 'No deposit on file'}
              </p>
              <p className="text-xs text-brown mt-1">
                Deposits secure your spot and stay on file even if you cancel—reschedule your booking instead.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                feedback.type === 'success' ? 'bg-green-100 text-green-900 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {isWithin24Hours ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900">
              You're inside the 24-hour window. Online reschedules are paused so we can keep the studio
              running smoothly. Please call or text LashDiary and we'll help you personally.
            </div>
          ) : isWithinWindow ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              You're inside the {booking.cancellationPolicyHours}-hour policy window. Deposits stay on file, and you can
              reschedule this appointment up until 24 hours before your start time.
            </div>
          ) : null}

          {!booking.canManage && (
            <div className="rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-700">
              This booking is no longer active for online changes. If you need help, kindly reach out to LashDiary.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              disabled={!booking.canReschedule || saving}
              onClick={() => {
                setRescheduleMode((prev) => !prev)
                setServiceChangeMode(false)
              }}
              className={`inline-flex justify-center items-center px-5 py-3 rounded-full text-sm font-semibold border transition-colors ${
                booking.canReschedule
                  ? 'border-brown-dark text-brown-dark hover:bg-brown-dark hover:text-white'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
            >
              {rescheduleMode ? 'Close reschedule options' : 'Reschedule appointment'}
            </button>
            <button
              disabled={!booking.canReschedule || saving}
              onClick={() => {
                setServiceChangeMode((prev) => {
                  if (!prev) {
                    loadAvailableServices()
                  }
                  return !prev
                })
                setRescheduleMode(false)
              }}
              className={`inline-flex justify-center items-center px-5 py-3 rounded-full text-sm font-semibold border transition-colors ${
                booking.canReschedule
                  ? 'border-brown-dark text-brown-dark hover:bg-brown-dark hover:text-white'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
            >
              {serviceChangeMode ? 'Close service change' : 'Change service'}
            </button>
          </div>

          {rescheduleMode && booking.canReschedule && (
            <div className="rounded-3xl border border-brown-light/40 bg-baby-pink-light/40 px-5 py-6 space-y-4">
              <h2 className="text-xl font-display text-brown-dark">Pick a new time</h2>
              <p className="text-sm text-brown">
                Choose another day and time that suits you. Only free slots show up below.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-brown-dark">New date</span>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(event) => {
                      const value = event.target.value
                      setRescheduleDate(value)
                      if (value) {
                        loadSlotsFor(value, setRescheduleSlots, setRescheduleSlot, setRescheduleLoadingSlots)
                      } else {
                        setRescheduleSlots([])
                        setRescheduleSlot('')
                      }
                    }}
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                    min={new Date().toISOString().split('T')[0]}
                    disabled={rescheduleLoadingSlots || saving}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-brown-dark">Available time</span>
                  <select
                    value={rescheduleSlot}
                    onChange={(event) => setRescheduleSlot(event.target.value)}
                    disabled={rescheduleLoadingSlots || rescheduleSlots.length === 0 || saving}
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                  >
                    <option value="">{rescheduleLoadingSlots ? 'Loading slots…' : 'Select a time'}</option>
                    {rescheduleSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  {rescheduleDate && !rescheduleLoadingSlots && rescheduleSlots.length === 0 && (
                    <p className="text-xs text-brown">No open times for that day. Try another date.</p>
                  )}
                </label>
              </div>

              <button
                onClick={handleReschedule}
                disabled={saving}
                className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-brown-dark text-white font-semibold shadow-soft hover:shadow-lg transition"
              >
                {saving ? 'Rescheduling…' : 'Confirm new appointment'}
              </button>
            </div>
          )}

          {serviceChangeMode && booking.canReschedule && (
            <div className="rounded-3xl border border-brown-light/40 bg-white/80 px-5 py-6 space-y-4 shadow-inner">
              <h2 className="text-xl font-display text-brown-dark">Change your service</h2>
              <p className="text-sm text-brown">
                You can change your service type (e.g., from Hybrid to Classic) up to 24 hours before your appointment.
              </p>
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                ⚠️ Service changes are only available more than 24 hours before your appointment time.
              </p>

              <div className="space-y-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-brown-dark">Current service</span>
                  <input
                    type="text"
                    value={booking.service || 'Not specified'}
                    disabled
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark bg-gray-50"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-brown-dark">New service</span>
                  {loadingServices ? (
                    <div className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark bg-gray-50">
                      Loading services…
                    </div>
                  ) : (
                    <select
                      value={selectedNewService}
                      onChange={(event) => {
                        setSelectedNewService(event.target.value)
                      }}
                      disabled={saving || availableServices.length === 0}
                      className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                    >
                      <option value="">Select a service</option>
                      {availableServices.map((service) => (
                        <option key={service.name} value={service.name}>
                          {service.name} - KSH {service.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  )}
                  {availableServices.length === 0 && !loadingServices && (
                    <p className="text-xs text-brown">No other services available at this time.</p>
                  )}
                </label>

                {selectedNewService && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <p className="text-sm font-semibold text-blue-900">Service Change Summary</p>
                    <p className="text-xs text-blue-800 mt-1">
                      Your existing deposit and any discounts will be applied to the new service price.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleServiceChange}
                disabled={saving || !selectedNewService}
                className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-brown-dark text-white font-semibold shadow-soft hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Changing service…' : 'Confirm service change'}
              </button>
            </div>
          )}

          <div className="bg-pink-light/30 border border-pink-light rounded-2xl px-5 py-4 text-sm text-brown">
            <p className="font-semibold text-brown-dark mb-1">Need additional help?</p>
            <p className="leading-relaxed">
              Email us at{' '}
              <a className="text-brown-dark font-semibold" href="mailto:hello@lashdiary.co.ke">
                hello@lashdiary.co.ke
              </a>{' '}
              and we’ll get you sorted. Replies are swift during business hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

