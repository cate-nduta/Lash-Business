'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

interface BusinessHours {
  [key: string]: {
    open: string
    close: string
    enabled: boolean
  }
}

interface TimeSlot {
  hour: number
  minute: number
  label: string
}

interface BookingWindowSection {
  startDate?: string
  endDate?: string
  label?: string
  opensAt?: string
  emailSubject?: string
}

interface BookingWindowState {
  current: BookingWindowSection
  next: BookingWindowSection
  bookingLink?: string
  note?: string
  bannerMessage?: string
  bannerEnabled?: boolean | null
}

interface AvailabilityData {
  businessHours: BusinessHours
  timeSlots: {
    weekdays?: TimeSlot[] // Monday-Thursday shared time slots
    friday?: TimeSlot[]
    saturday?: TimeSlot[]
    sunday: TimeSlot[]
  }
  bookingWindow: BookingWindowState
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminAvailability() {
  const createDefaultBookingWindow = (): BookingWindowState => ({
    current: {},
    next: {},
    bookingLink: '',
    note: '',
    bannerMessage: '',
  bannerEnabled: null,
  })
  const [availability, setAvailability] = useState<AvailabilityData>({
    businessHours: {},
    timeSlots: { weekdays: [], friday: [], saturday: [], sunday: [] },
    bookingWindow: createDefaultBookingWindow(),
  })
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilityData>({
    businessHours: {},
    timeSlots: { weekdays: [], friday: [], saturday: [], sunday: [] },
    bookingWindow: createDefaultBookingWindow(),
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(availability) !== JSON.stringify(originalAvailability)

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

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
        loadAvailability()
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

  const loadAvailability = async () => {
    try {
      const response = await authorizedFetch('/api/admin/availability')
      if (response.ok) {
        const data = await response.json()
        const businessHours: BusinessHours = data.businessHours || {}
        // Normalize time slots - combine Monday-Thursday into weekdays if they exist separately
        const weekdaysSlots: TimeSlot[] = 
          Array.isArray(data?.timeSlots?.weekdays) ? data.timeSlots.weekdays :
          Array.isArray(data?.timeSlots?.monday) ? data.timeSlots.monday :
          Array.isArray(data?.timeSlots?.tuesday) ? data.timeSlots.tuesday :
          Array.isArray(data?.timeSlots?.wednesday) ? data.timeSlots.wednesday :
          Array.isArray(data?.timeSlots?.thursday) ? data.timeSlots.thursday :
          []
        const timeSlots = {
          weekdays: weekdaysSlots,
          friday: Array.isArray(data?.timeSlots?.friday) ? data.timeSlots.friday : [],
          saturday: Array.isArray(data?.timeSlots?.saturday) ? data.timeSlots.saturday : [],
          sunday: Array.isArray(data?.timeSlots?.sunday) ? data.timeSlots.sunday : [],
        }
        const bookingWindow: BookingWindowState = {
          current: { ...(data?.bookingWindow?.current ?? {}) },
          next: { ...(data?.bookingWindow?.next ?? {}) },
          bookingLink: data?.bookingWindow?.bookingLink ?? '',
          note: data?.bookingWindow?.note ?? '',
          bannerMessage: data?.bookingWindow?.bannerMessage ?? '',
          bannerEnabled:
            typeof data?.bookingWindow?.bannerEnabled === 'boolean'
              ? data.bookingWindow.bannerEnabled
              : null,
        }

        const normalized: AvailabilityData = {
          businessHours,
          timeSlots,
          bookingWindow,
        }

        setAvailability(normalized)
        setOriginalAvailability(normalized)
      }
    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // Intercept Link clicks
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setPendingNavigation(href)
      setShowDialog(true)
    }
  }

  const handleDialogSave = async () => {
    await handleSave()
    if (pendingNavigation) {
      setShowDialog(false)
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const handleDialogLeave = () => {
    setShowDialog(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const handleDialogCancel = () => {
    setShowDialog(false)
    setPendingNavigation(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availability),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Availability updated successfully!' })
        setOriginalAvailability(availability) // Update original to clear unsaved changes flag
        setShowDialog(false) // Close dialog if open
      } else {
        setMessage({ type: 'error', text: 'Failed to save availability' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'enabled', value: string | boolean) => {
    setAvailability((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value },
      },
    }))
  }

  const addTimeSlot = (type: 'weekdays' | 'friday' | 'saturday' | 'sunday') => {
    setAvailability((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [type]: [...(prev.timeSlots[type] || []), { hour: 9, minute: 0, label: '9:00 AM' }],
      },
    }))
  }

  const updateTimeSlot = (type: 'weekdays' | 'friday' | 'saturday' | 'sunday', index: number, field: keyof TimeSlot, value: string | number) => {
    setAvailability((prev) => {
      const updated = { ...prev }
      if (!updated.timeSlots[type]) {
        updated.timeSlots[type] = []
      }
      updated.timeSlots[type] = [...updated.timeSlots[type]]
      updated.timeSlots[type][index] = { ...updated.timeSlots[type][index], [field]: value }
      // Update label if hour or minute changes
      if (field === 'hour' || field === 'minute') {
        const slot = updated.timeSlots[type][index]
        const hours = field === 'hour' ? (value as number) : slot.hour
        const minutes = field === 'minute' ? (value as number) : slot.minute
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        const displayMinutes = minutes.toString().padStart(2, '0')
        updated.timeSlots[type][index].label = `${displayHours}:${displayMinutes} ${ampm}`
      }
      return updated
    })
  }

  const removeTimeSlot = (type: 'weekdays' | 'friday' | 'saturday' | 'sunday', index: number) => {
    setAvailability((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [type]: (prev.timeSlots[type] || []).filter((_, i) => i !== index),
      },
    }))
  }

  const updateBookingWindowField = (
    section: 'current' | 'next',
    field: keyof BookingWindowSection,
    value: string,
  ) => {
    setAvailability((prev) => {
      const windowState: BookingWindowState = {
        current: { ...(prev.bookingWindow?.current ?? {}) },
        next: { ...(prev.bookingWindow?.next ?? {}) },
        bookingLink: prev.bookingWindow?.bookingLink ?? '',
        note: prev.bookingWindow?.note ?? '',
        bannerMessage: prev.bookingWindow?.bannerMessage ?? '',
        bannerEnabled:
          typeof prev.bookingWindow?.bannerEnabled === 'boolean'
            ? prev.bookingWindow.bannerEnabled
            : null,
      }
      if (value && value.trim().length > 0) {
        windowState[section][field] = value
      } else {
        delete windowState[section][field]
      }
      return {
        ...prev,
        bookingWindow: windowState,
      }
    })
  }

  const updateBookingWindowLink = (value: string) => {
    setAvailability((prev) => ({
      ...prev,
      bookingWindow: {
        current: { ...(prev.bookingWindow?.current ?? {}) },
        next: { ...(prev.bookingWindow?.next ?? {}) },
        bookingLink: value,
        note: prev.bookingWindow?.note ?? '',
        bannerMessage: prev.bookingWindow?.bannerMessage ?? '',
        bannerEnabled:
          typeof prev.bookingWindow?.bannerEnabled === 'boolean'
            ? prev.bookingWindow.bannerEnabled
            : null,
      },
    }))
  }

  const updateBookingWindowNote = (value: string) => {
    setAvailability((prev) => ({
      ...prev,
      bookingWindow: {
        current: { ...(prev.bookingWindow?.current ?? {}) },
        next: { ...(prev.bookingWindow?.next ?? {}) },
        bookingLink: prev.bookingWindow?.bookingLink ?? '',
        note: value,
        bannerMessage: prev.bookingWindow?.bannerMessage ?? '',
        bannerEnabled:
          typeof prev.bookingWindow?.bannerEnabled === 'boolean'
            ? prev.bookingWindow.bannerEnabled
            : null,
      },
    }))
  }

  const updateBannerMessage = (value: string) => {
    setAvailability((prev) => ({
      ...prev,
      bookingWindow: {
        current: { ...(prev.bookingWindow?.current ?? {}) },
        next: { ...(prev.bookingWindow?.next ?? {}) },
        bookingLink: prev.bookingWindow?.bookingLink ?? '',
        note: prev.bookingWindow?.note ?? '',
        bannerMessage: value,
        bannerEnabled:
          typeof prev.bookingWindow?.bannerEnabled === 'boolean'
            ? prev.bookingWindow.bannerEnabled
            : null,
      },
    }))
  }

  const updateBannerEnabled = (value: 'enabled' | 'disabled' | 'auto') => {
    setAvailability((prev) => ({
      ...prev,
      bookingWindow: {
        current: { ...(prev.bookingWindow?.current ?? {}) },
        next: { ...(prev.bookingWindow?.next ?? {}) },
        bookingLink: prev.bookingWindow?.bookingLink ?? '',
        note: prev.bookingWindow?.note ?? '',
        bannerMessage: prev.bookingWindow?.bannerMessage ?? '',
        bannerEnabled: value === 'enabled' ? true : value === 'disabled' ? false : null,
      },
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          {hasUnsavedChanges && (
            <div className="text-sm text-orange-600 font-medium">
              ⚠️ You have unsaved changes
            </div>
          )}
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkClick(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Toast Notification */}
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Monthly Booking Window</h1>
          <p className="text-sm text-brown-dark/70 mb-6">
            Control how far in advance clients can book. Set the current month’s open dates, and optionally prepare the
            next release so you can send your announcement email when ready.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-5 bg-pink-light rounded-lg border border-brown-light/60">
              <h3 className="text-lg font-semibold text-brown-dark mb-4">Current window</h3>
              <label className="block text-sm font-medium text-brown-dark mb-2">Booking window label</label>
              <input
                type="text"
                value={availability.bookingWindow.current.label || ''}
                onChange={(e) => updateBookingWindowField('current', 'label', e.target.value)}
                placeholder="e.g., November 3 – November 30"
                className="w-full px-3 py-2 border border-brown-light rounded bg-white mb-4"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Open from</label>
                  <input
                    type="date"
                    value={availability.bookingWindow.current.startDate || ''}
                    onChange={(e) => updateBookingWindowField('current', 'startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Close on</label>
                  <input
                    type="date"
                    value={availability.bookingWindow.current.endDate || ''}
                    onChange={(e) => updateBookingWindowField('current', 'endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                  />
                </div>
              </div>
              <p className="text-xs text-brown-dark/60 mt-3">
                Clients will only see available dates between these two values.
              </p>
            </div>
            <div className="p-5 bg-pink-light rounded-lg border border-brown-light/60">
              <h3 className="text-lg font-semibold text-brown-dark mb-4">Next window (optional)</h3>
              <label className="block text-sm font-medium text-brown-dark mb-2">Next window label</label>
              <input
                type="text"
                value={availability.bookingWindow.next.label || ''}
                onChange={(e) => updateBookingWindowField('next', 'label', e.target.value)}
                placeholder="e.g., December 3 – December 31"
                className="w-full px-3 py-2 border border-brown-light rounded bg-white mb-4"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Opens for booking on</label>
                  <input
                    type="date"
                    value={availability.bookingWindow.next.opensAt || ''}
                    onChange={(e) => updateBookingWindowField('next', 'opensAt', e.target.value)}
                    className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Email subject</label>
                  <input
                    type="text"
                    value={availability.bookingWindow.next.emailSubject || ''}
                    onChange={(e) => updateBookingWindowField('next', 'emailSubject', e.target.value)}
                    placeholder="✨ December Bookings Are Now Open!"
                    className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Next window start</label>
                  <input
                    type="date"
                    value={availability.bookingWindow.next.startDate || ''}
                    onChange={(e) => updateBookingWindowField('next', 'startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Next window end</label>
                  <input
                    type="date"
                    value={availability.bookingWindow.next.endDate || ''}
                    onChange={(e) => updateBookingWindowField('next', 'endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 bg-pink-light/60 rounded-lg border border-brown-light/60">
            <label className="block text-sm font-medium text-brown-dark mb-2">Booking link to include in emails</label>
            <input
              type="text"
              value={availability.bookingWindow.bookingLink || ''}
              onChange={(e) => updateBookingWindowLink(e.target.value)}
              placeholder="https://lashdiary.com/booking"
              className="w-full px-3 py-2 border border-brown-light rounded bg-white"
            />
            <p className="text-xs text-brown-dark/60 mt-3">
              This URL is sent in your “Bookings are open” email. If left blank, we’ll use your default booking page.
            </p>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-brown-dark mb-2">Banner note (optional)</label>
            <textarea
              value={availability.bookingWindow.note || ''}
              onChange={(e) => updateBookingWindowNote(e.target.value)}
              rows={3}
              placeholder='e.g., "VIP waitlist opens November 20th. Clients with referrals get 24-hour early access."'
              className="w-full px-3 py-2 border border-brown-light rounded bg-white"
            />
            <p className="text-xs text-brown-dark/60 mt-2">
              This note appears under the booking banner on the public site so you can add reminders or special launch perks.
            </p>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-brown-dark mb-2">Banner headline</label>
            <textarea
              value={availability.bookingWindow.bannerMessage || ''}
              onChange={(e) => updateBannerMessage(e.target.value)}
              rows={2}
              placeholder='e.g., "Bookings open monthly. Current calendar: November 1 – November 27. November 29 – December 29 opens November 28."'
              className="w-full px-3 py-2 border border-brown-light rounded bg-white"
            />
            <p className="text-xs text-brown-dark/60 mt-2">
              Leave blank to use the automatic message. You can include any copy you’d like clients to see before the deposit reminder.
            </p>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">Banner visibility</label>
              <select
                value={
                  typeof availability.bookingWindow.bannerEnabled === 'boolean'
                    ? availability.bookingWindow.bannerEnabled
                      ? 'enabled'
                      : 'disabled'
                    : 'auto'
                }
                onChange={(event) =>
                  updateBannerEnabled(event.target.value as 'enabled' | 'disabled' | 'auto')
                }
                className="w-full sm:w-72 px-3 py-2 border border-brown-light rounded bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition"
              >
                <option value="auto">Auto (show when message exists)</option>
                <option value="enabled">Always show banner</option>
                <option value="disabled">Hide banner</option>
              </select>
              <p className="text-xs text-brown-dark/60 mt-2">
                Choose “Hide banner” to remove it from the booking page, or force it on even when the message is blank.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Business Hours</h1>
          <div className="space-y-4">
            {days.map((day) => (
              <div key={day} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availability.businessHours[day]?.enabled || false}
                    onChange={(e) => updateBusinessHours(day, 'enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="font-semibold text-brown-dark capitalize">{day}</span>
                </label>
                <input
                  type="time"
                  value={availability.businessHours[day]?.open || '09:00'}
                  onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                  disabled={!availability.businessHours[day]?.enabled}
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <input
                  type="time"
                  value={availability.businessHours[day]?.close || '18:00'}
                  onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                  disabled={!availability.businessHours[day]?.enabled}
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <div className="text-sm text-brown">
                  {availability.businessHours[day]?.enabled
                    ? `${availability.businessHours[day].open} - ${availability.businessHours[day].close}`
                    : 'Closed'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monday-Thursday Time Slots (Shared) */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-brown-dark">Monday-Thursday Time Slots</h2>
              <button
              onClick={() => addTimeSlot('weekdays')}
                className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
              >
                + Add Slot
              </button>
            </div>
            <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl shadow-sm">
              <p className="text-sm text-blue-900">
              <strong>Note:</strong> These time slots are shared across Monday, Tuesday, Wednesday, and Thursday. If no slots are configured, the system will use default slots.
              </p>
            </div>
            <div className="space-y-4">
            {(availability.timeSlots.weekdays || []).map((slot, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
                  <input
                    type="number"
                    value={slot.hour}
                  onChange={(e) => updateTimeSlot('weekdays', index, 'hour', parseInt(e.target.value) || 0)}
                    placeholder="Hour (0-23)"
                    min="0"
                    max="23"
                    className="px-3 py-2 border border-brown-light rounded bg-white"
                  />
                  <input
                    type="number"
                    value={slot.minute}
                  onChange={(e) => updateTimeSlot('weekdays', index, 'minute', parseInt(e.target.value) || 0)}
                    placeholder="Minute (0-59)"
                    min="0"
                    max="59"
                    className="px-3 py-2 border border-brown-light rounded bg-white"
                  />
                  <input
                    type="text"
                    value={slot.label}
                  onChange={(e) => updateTimeSlot('weekdays', index, 'label', e.target.value)}
                    placeholder="Label (e.g., 9:30 AM)"
                    className="px-3 py-2 border border-brown-light rounded bg-white"
                  />
                  <button
                  onClick={() => removeTimeSlot('weekdays', index)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            {(!availability.timeSlots.weekdays || availability.timeSlots.weekdays.length === 0) && (
              <p className="text-sm text-gray-500 italic">No Monday-Thursday time slots configured. Will use default slots as fallback.</p>
              )}
            </div>
        </div>

        {/* Friday Time Slots */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-brown-dark">Friday Time Slots</h2>
            <button
              onClick={() => addTimeSlot('friday')}
              className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
            >
              + Add Slot
            </button>
          </div>
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl shadow-sm">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Friday has its own independent time slots. If no Friday slots are configured, the system will fall back to weekday slots or default slots.
            </p>
          </div>
          <div className="space-y-4">
            {(availability.timeSlots.friday || []).map((slot, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
                <input
                  type="number"
                  value={slot.hour}
                  onChange={(e) => updateTimeSlot('friday', index, 'hour', parseInt(e.target.value) || 0)}
                  placeholder="Hour (0-23)"
                  min="0"
                  max="23"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <input
                  type="number"
                  value={slot.minute}
                  onChange={(e) => updateTimeSlot('friday', index, 'minute', parseInt(e.target.value) || 0)}
                  placeholder="Minute (0-59)"
                  min="0"
                  max="59"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => updateTimeSlot('friday', index, 'label', e.target.value)}
                  placeholder="Label (e.g., 9:30 AM)"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <button
                  onClick={() => removeTimeSlot('friday', index)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
          </div>
        ))}
            {(!availability.timeSlots.friday || availability.timeSlots.friday.length === 0) && (
              <p className="text-sm text-gray-500 italic">No Friday time slots configured. Will use weekday slots or defaults as fallback.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-brown-dark">Saturday Time Slots</h2>
            <button
              onClick={() => addTimeSlot('saturday')}
              className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
            >
              + Add Slot
            </button>
          </div>
          <div className="mb-4 p-4 bg-white border-l-4 border-[var(--color-accent)]/80 rounded-r-xl shadow-sm">
            <p className="text-sm text-black">
              <strong className="text-[var(--color-accent)]">Note:</strong> Saturday time slots will only be used when Saturday is enabled in Business Hours above. 
              If no Saturday slots are configured, weekday slots will be used as a fallback.
            </p>
          </div>
          <div className="space-y-4">
            {(availability.timeSlots.saturday || []).map((slot, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
                <input
                  type="number"
                  value={slot.hour}
                  onChange={(e) => updateTimeSlot('saturday', index, 'hour', parseInt(e.target.value) || 0)}
                  placeholder="Hour (0-23)"
                  min="0"
                  max="23"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <input
                  type="number"
                  value={slot.minute}
                  onChange={(e) => updateTimeSlot('saturday', index, 'minute', parseInt(e.target.value) || 0)}
                  placeholder="Minute (0-59)"
                  min="0"
                  max="59"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => updateTimeSlot('saturday', index, 'label', e.target.value)}
                  placeholder="Label (e.g., 9:30 AM)"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <button
                  onClick={() => removeTimeSlot('saturday', index)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            {(!availability.timeSlots.saturday || availability.timeSlots.saturday.length === 0) && (
              <p className="text-sm text-gray-500 italic">No Saturday time slots configured. Weekday slots will be used as fallback.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-brown-dark">Sunday Time Slots</h2>
            <button
              onClick={() => addTimeSlot('sunday')}
              className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
            >
              + Add Slot
            </button>
          </div>
          <div className="space-y-4">
            {availability.timeSlots.sunday.map((slot, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
                <input
                  type="number"
                  value={slot.hour}
                  onChange={(e) => updateTimeSlot('sunday', index, 'hour', parseInt(e.target.value) || 0)}
                  placeholder="Hour (0-23)"
                  min="0"
                  max="23"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <input
                  type="number"
                  value={slot.minute}
                  onChange={(e) => updateTimeSlot('sunday', index, 'minute', parseInt(e.target.value) || 0)}
                  placeholder="Minute (0-59)"
                  min="0"
                  max="59"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => updateTimeSlot('sunday', index, 'label', e.target.value)}
                  placeholder="Label (e.g., 12:30 PM)"
                  className="px-3 py-2 border border-brown-light rounded bg-white"
                />
                <button
                  onClick={() => removeTimeSlot('sunday', index)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={handleDialogSave}
        onLeave={handleDialogLeave}
        onCancel={handleDialogCancel}
        saving={saving}
      />
    </div>
  )
}

