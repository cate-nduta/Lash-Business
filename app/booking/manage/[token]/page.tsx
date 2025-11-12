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
    canTransfer?: boolean
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
  const [transferMode, setTransferMode] = useState(false)
  const [transferName, setTransferName] = useState('')
  const [transferEmail, setTransferEmail] = useState('')
  const [transferPhone, setTransferPhone] = useState('')
  const [transferDate, setTransferDate] = useState<string>('')
  const [transferSlots, setTransferSlots] = useState<AvailableSlot[]>([])
  const [transferSlot, setTransferSlot] = useState<string>('')
  const [transferLoadingSlots, setTransferLoadingSlots] = useState(false)

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
          setTransferMode(false)
          setTransferName('')
          setTransferEmail('')
          setTransferPhone('')
          setTransferDate('')
          setTransferSlots([])
          setTransferSlot('')
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
      setFeedback({ type: 'success', message: 'Your appointment has been rescheduled successfully.' })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'We could not reschedule your appointment. Please contact the studio.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTransfer = async () => {
    if (!booking || !token) return
    if (!transferName.trim()) {
      setFeedback({ type: 'error', message: 'Add the guest’s full name.' })
      return
    }
    if (!transferEmail.trim() || !transferEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Add a valid email for the new guest.' })
      return
    }
    if (!transferPhone.trim() || transferPhone.trim().length < 7) {
      setFeedback({ type: 'error', message: 'Add a contact phone number for the new guest.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const payload: Record<string, string> = {
        action: 'transfer',
        newName: transferName.trim(),
        newEmail: transferEmail.trim(),
        newPhone: transferPhone.trim(),
      }
      if (transferDate) {
        payload.newDate = transferDate
      }
      if (transferSlot) {
        payload.newTimeSlot = transferSlot
      }

      const response = await fetch(`/api/booking/manage/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'We could not transfer this appointment.')
      }
      const guestName = transferName.trim() || 'The new guest'
      setBooking(data.booking)
      setTransferMode(false)
      setTransferName('')
      setTransferEmail('')
      setTransferPhone('')
      setTransferDate('')
      setTransferSlots([])
      setTransferSlot('')
      const emailSent = data?.emailSent === true
      setFeedback({
        type: emailSent ? 'success' : 'error',
        message: emailSent
          ? `${guestName} now has the confirmation email with all the appointment details.`
          : `The booking was transferred, but the confirmation email did not send. Please forward the details manually.${
              data?.emailError ? ` (${data.emailError})` : ''
            }`,
      })
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'We could not transfer this appointment. Please contact the studio.',
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
            Deposits are non-refundable. Reschedule or transfer your appointment up to 24 hours before your start time,
            or invite a friend to enjoy the slot for you.
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
                Deposits secure your spot and stay on file even if you cancel—reschedule or transfer your booking instead.
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
              You’re inside the 24-hour window. Online transfers or reschedules are paused so we can keep the studio
              running smoothly. Please call or text LashDiary and we’ll help you personally.
            </div>
          ) : isWithinWindow ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              You’re inside the {booking.cancellationPolicyHours}-hour policy window. Deposits stay on file, and you can
              reschedule or transfer this appointment up until 24 hours before your start time.
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
                setTransferMode(false)
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
              disabled={!(booking.canTransfer ?? booking.canReschedule) || saving}
              onClick={() => {
                setTransferMode((prev) => !prev)
                setRescheduleMode(false)
              }}
              className={`inline-flex justify-center items-center px-5 py-3 rounded-full text-sm font-semibold border transition-colors ${
                booking.canTransfer ?? booking.canReschedule
                  ? 'border-brown-dark text-brown-dark hover:bg-brown-dark hover:text-white'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
            >
              {transferMode ? 'Close transfer form' : 'Transfer to a friend'}
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

          {transferMode && (booking.canTransfer ?? booking.canReschedule) && (
            <div className="rounded-3xl border border-brown-light/40 bg-white/80 px-5 py-6 space-y-4 shadow-inner">
              <h2 className="text-xl font-display text-brown-dark">Transfer to another guest</h2>
              <p className="text-sm text-brown">
                We’ll update the booking, send the new guest their confirmation, and keep your deposit on file under
                their name.
              </p>
              <p className="text-xs text-brown-dark/70">
                Keeping the same slot? Leave the date and time empty and we’ll keep your current appointment on{' '}
                <span className="font-semibold text-brown-dark">{formattedDate || 'the scheduled date'}</span>.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 sm:col-span-1">
                  <span className="text-sm font-medium text-brown-dark">Guest name</span>
                  <input
                    type="text"
                    value={transferName}
                    onChange={(event) => setTransferName(event.target.value)}
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                    placeholder="Full name"
                    disabled={saving}
                  />
                </label>
                <label className="flex flex-col gap-2 sm:col-span-1">
                  <span className="text-sm font-medium text-brown-dark">Guest email</span>
                  <input
                    type="email"
                    value={transferEmail}
                    onChange={(event) => setTransferEmail(event.target.value)}
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                    placeholder="guest@email.com"
                    disabled={saving}
                  />
                </label>
                <label className="flex flex-col gap-2 sm:col-span-1">
                  <span className="text-sm font-medium text-brown-dark">Guest phone</span>
                  <input
                    type="tel"
                    value={transferPhone}
                    onChange={(event) => setTransferPhone(event.target.value)}
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                    placeholder="e.g. +254..."
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-brown-dark">New date</span>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(event) => {
                      const value = event.target.value
                      setTransferDate(value)
                      if (value) {
                        loadSlotsFor(value, setTransferSlots, setTransferSlot, setTransferLoadingSlots)
                      } else {
                        setTransferSlots([])
                        setTransferSlot('')
                      }
                    }}
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                    min={new Date().toISOString().split('T')[0]}
                    disabled={transferLoadingSlots || saving}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-brown-dark">Available time</span>
                  <select
                    value={transferSlot}
                    onChange={(event) => setTransferSlot(event.target.value)}
                    disabled={transferLoadingSlots || transferSlots.length === 0 || saving}
                    className="rounded-xl border border-brown-light px-3 py-2 text-brown-dark focus:outline-none focus:ring-2 focus:ring-brown-dark/40"
                  >
                    <option value="">{transferLoadingSlots ? 'Loading slots…' : 'Select a time'}</option>
                    {transferSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  {transferDate && !transferLoadingSlots && transferSlots.length === 0 && (
                    <p className="text-xs text-brown">No open times for that day. Try another date.</p>
                  )}
                </label>
              </div>

              <button
                onClick={handleTransfer}
                disabled={saving}
                className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-brown-dark text-white font-semibold shadow-soft hover:shadow-lg transition"
              >
                {saving ? 'Transferring…' : 'Confirm transfer'}
              </button>

              <p className="text-xs text-brown mt-2">
                We’ll email {transferEmail || 'your guest'} the full booking details and a link to manage the appointment if they need to adjust anything.
              </p>
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

