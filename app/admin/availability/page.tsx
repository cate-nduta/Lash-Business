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
  minimumNoticeHours?: number
  minimumNoticeByDay?: Record<string, number | '' | undefined>
  /** Latest time (hours before appointment) clients can still reschedule online */
  rescheduleCutoffHours?: number
}

interface HomeCallsSettings {
  enabled: boolean
  sectionTitle: string
  sectionDescription: string
  /** Extra charge in KES for home visits (added to service total; waived if services are 100% off) */
  feeKES: number
}

interface AvailabilityData {
  businessHours: BusinessHours
  timeSlots: Record<TimeSlotDay, TimeSlot[]> & { weekdays?: TimeSlot[] }
  bookingWindow: BookingWindowState
  homeCalls: HomeCallsSettings
}

type TimeSlotDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const defaultHomeCalls = (): HomeCallsSettings => ({
  enabled: false,
  sectionTitle: 'Home visit',
  sectionDescription:
    'Choose studio or home visit. For home visits, clients enter their residential area and full address (building, apartment, directions).',
  feeKES: 0,
})

export default function AdminAvailability() {
  const createDefaultBookingWindow = (): BookingWindowState => ({
    current: {},
    next: {},
    bookingLink: '',
    note: '',
    bannerMessage: '',
  bannerEnabled: null,
    minimumNoticeHours: 12,
    minimumNoticeByDay: {},
    rescheduleCutoffHours: 12,
  })
  const [availability, setAvailability] = useState<AvailabilityData>({
    businessHours: {},
    timeSlots: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
    bookingWindow: createDefaultBookingWindow(),
    homeCalls: defaultHomeCalls(),
  })
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilityData>({
    businessHours: {},
    timeSlots: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
    bookingWindow: createDefaultBookingWindow(),
    homeCalls: defaultHomeCalls(),
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(availability) !== JSON.stringify(originalAvailability)

  const days: TimeSlotDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayLabels: Record<TimeSlotDay, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
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
        const legacyWeekdaySlots: TimeSlot[] = Array.isArray(data?.timeSlots?.weekdays)
          ? data.timeSlots.weekdays
          : []
        const getDaySlots = (day: TimeSlotDay): TimeSlot[] => {
          if (Array.isArray(data?.timeSlots?.[day])) {
            return data.timeSlots[day]
          }
          return ['monday', 'tuesday', 'wednesday', 'thursday'].includes(day)
            ? legacyWeekdaySlots
            : []
        }
        const timeSlots = {
          monday: getDaySlots('monday'),
          tuesday: getDaySlots('tuesday'),
          wednesday: getDaySlots('wednesday'),
          thursday: getDaySlots('thursday'),
          friday: getDaySlots('friday'),
          saturday: getDaySlots('saturday'),
          sunday: getDaySlots('sunday'),
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
          minimumNoticeHours: Math.max(
            0,
            Number.isFinite(Number(data?.bookingWindow?.minimumNoticeHours))
              ? Number(data.bookingWindow.minimumNoticeHours)
              : 12,
          ),
          minimumNoticeByDay:
            data?.bookingWindow?.minimumNoticeByDay && typeof data.bookingWindow.minimumNoticeByDay === 'object'
              ? { ...data.bookingWindow.minimumNoticeByDay }
              : {},
          rescheduleCutoffHours: Math.max(
            0,
            Number.isFinite(Number(data?.bookingWindow?.rescheduleCutoffHours))
              ? Number(data.bookingWindow.rescheduleCutoffHours)
              : 12,
          ),
        }

        const normalized: AvailabilityData = {
          businessHours,
          timeSlots,
          bookingWindow,
          homeCalls: {
            enabled: Boolean(data?.homeCalls?.enabled),
            sectionTitle:
              typeof data?.homeCalls?.sectionTitle === 'string' && data.homeCalls.sectionTitle.trim()
                ? data.homeCalls.sectionTitle.trim()
                : defaultHomeCalls().sectionTitle,
            sectionDescription:
              typeof data?.homeCalls?.sectionDescription === 'string' && data.homeCalls.sectionDescription.trim()
                ? data.homeCalls.sectionDescription.trim()
                : defaultHomeCalls().sectionDescription,
            feeKES: Math.max(
              0,
              Math.round(Number.isFinite(Number(data?.homeCalls?.feeKES)) ? Number(data.homeCalls.feeKES) : 0),
            ),
          },
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

  const addTimeSlot = (type: TimeSlotDay) => {
    setAvailability((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [type]: [...(prev.timeSlots[type] || []), { hour: 9, minute: 0, label: '9:00 AM' }],
      },
    }))
  }

  const updateTimeSlot = (type: TimeSlotDay, index: number, field: keyof TimeSlot, value: string | number) => {
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

  const removeTimeSlot = (type: TimeSlotDay, index: number) => {
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
        minimumNoticeHours: prev.bookingWindow?.minimumNoticeHours ?? 12,
        minimumNoticeByDay: { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) },
        rescheduleCutoffHours: prev.bookingWindow?.rescheduleCutoffHours ?? 12,
        bannerEnabled:
          typeof prev.bookingWindow?.bannerEnabled === 'boolean'
            ? prev.bookingWindow.bannerEnabled
            : null,
      }
      // Always set the field value, even if empty, to preserve the structure
      if (value && value.trim().length > 0) {
        windowState[section] = { ...windowState[section], [field]: value }
      } else {
        // Remove the field but keep the section object
        const { [field]: _, ...rest } = windowState[section]
        windowState[section] = rest as BookingWindowSection
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
        minimumNoticeHours: prev.bookingWindow?.minimumNoticeHours ?? 12,
        minimumNoticeByDay: { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) },
        rescheduleCutoffHours: prev.bookingWindow?.rescheduleCutoffHours ?? 12,
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
        minimumNoticeHours: prev.bookingWindow?.minimumNoticeHours ?? 12,
        minimumNoticeByDay: { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) },
        rescheduleCutoffHours: prev.bookingWindow?.rescheduleCutoffHours ?? 12,
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
        minimumNoticeHours: prev.bookingWindow?.minimumNoticeHours ?? 12,
        minimumNoticeByDay: { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) },
        rescheduleCutoffHours: prev.bookingWindow?.rescheduleCutoffHours ?? 12,
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
        minimumNoticeHours: prev.bookingWindow?.minimumNoticeHours ?? 12,
        minimumNoticeByDay: { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) },
        rescheduleCutoffHours: prev.bookingWindow?.rescheduleCutoffHours ?? 12,
        bannerEnabled: value === 'enabled' ? true : value === 'disabled' ? false : null,
      },
    }))
  }

  const updateRescheduleCutoffHours = (value: number) => {
    setAvailability((prev) => ({
      ...prev,
      bookingWindow: {
        current: { ...(prev.bookingWindow?.current ?? {}) },
        next: { ...(prev.bookingWindow?.next ?? {}) },
        bookingLink: prev.bookingWindow?.bookingLink ?? '',
        note: prev.bookingWindow?.note ?? '',
        bannerMessage: prev.bookingWindow?.bannerMessage ?? '',
        bannerEnabled:
          typeof prev.bookingWindow?.bannerEnabled === 'boolean'
            ? prev.bookingWindow.bannerEnabled
            : null,
        minimumNoticeHours: prev.bookingWindow?.minimumNoticeHours ?? 12,
        minimumNoticeByDay: { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) },
        rescheduleCutoffHours: Math.max(0, value),
      },
    }))
  }

  const updateMinimumNoticeHours = (value: number) => {
    setAvailability((prev) => ({
      ...prev,
      bookingWindow: {
        current: { ...(prev.bookingWindow?.current ?? {}) },
        next: { ...(prev.bookingWindow?.next ?? {}) },
        bookingLink: prev.bookingWindow?.bookingLink ?? '',
        note: prev.bookingWindow?.note ?? '',
        bannerMessage: prev.bookingWindow?.bannerMessage ?? '',
        bannerEnabled:
          typeof prev.bookingWindow?.bannerEnabled === 'boolean'
            ? prev.bookingWindow.bannerEnabled
            : null,
        minimumNoticeHours: Math.max(0, value),
        minimumNoticeByDay: { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) },
        rescheduleCutoffHours: prev.bookingWindow?.rescheduleCutoffHours ?? 12,
      },
    }))
  }

  const updateMinimumNoticeForDay = (day: string, value: string) => {
    setAvailability((prev) => {
      const nextByDay = { ...(prev.bookingWindow?.minimumNoticeByDay ?? {}) }
      if (value.trim() === '') {
        delete nextByDay[day]
      } else {
        nextByDay[day] = Math.max(0, Number(value) || 0)
      }

      return {
        ...prev,
        bookingWindow: {
          current: { ...(prev.bookingWindow?.current ?? {}) },
          next: { ...(prev.bookingWindow?.next ?? {}) },
          bookingLink: prev.bookingWindow?.bookingLink ?? '',
          note: prev.bookingWindow?.note ?? '',
          bannerMessage: prev.bookingWindow?.bannerMessage ?? '',
          bannerEnabled:
            typeof prev.bookingWindow?.bannerEnabled === 'boolean'
              ? prev.bookingWindow.bannerEnabled
              : null,
          minimumNoticeHours: prev.bookingWindow?.minimumNoticeHours ?? 12,
          minimumNoticeByDay: nextByDay,
          rescheduleCutoffHours: prev.bookingWindow?.rescheduleCutoffHours ?? 12,
        },
      }
    })
  }

  const renderTimeSlotSection = (day: TimeSlotDay) => {
    const slots = availability.timeSlots[day] || []
    const isEnabled = availability.businessHours[day]?.enabled || false

    return (
      <div key={day} className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-brown-dark">{dayLabels[day]} Time Slots</h2>
            <p className="text-sm text-brown-dark/70 mt-1">
              These slots apply only to {dayLabels[day]}. Turn the day on/off in Business Hours above.
            </p>
          </div>
          <button
            type="button"
            onClick={() => addTimeSlot(day)}
            className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
          >
            + Add Slot
          </button>
        </div>
        {!isEnabled && (
          <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl">
            <p className="text-sm text-amber-900">
              {dayLabels[day]} is currently closed in Business Hours, so clients will not see these slots until the
              day is enabled.
            </p>
          </div>
        )}
        <div className="space-y-4">
          {slots.map((slot, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
              <input
                type="number"
                value={slot.hour}
                onChange={(e) => updateTimeSlot(day, index, 'hour', parseInt(e.target.value, 10) || 0)}
                placeholder="Hour (0-23)"
                min="0"
                max="23"
                className="px-3 py-2 border border-brown-light rounded bg-white"
              />
              <input
                type="number"
                value={slot.minute}
                onChange={(e) => updateTimeSlot(day, index, 'minute', parseInt(e.target.value, 10) || 0)}
                placeholder="Minute (0-59)"
                min="0"
                max="59"
                className="px-3 py-2 border border-brown-light rounded bg-white"
              />
              <input
                type="text"
                value={slot.label}
                onChange={(e) => updateTimeSlot(day, index, 'label', e.target.value)}
                placeholder="Label (e.g., 9:30 AM)"
                className="px-3 py-2 border border-brown-light rounded bg-white"
              />
              <button
                type="button"
                onClick={() => removeTimeSlot(day, index)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          {slots.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No {dayLabels[day]} time slots configured. The booking system will use safe defaults until you add slots.
            </p>
          )}
        </div>
      </div>
    )
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

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 border-2 border-brown-light">
          <h2 className="text-2xl font-display text-brown-dark mb-2">Home visits on booking page</h2>
          <p className="text-sm text-brown-dark/70 mb-4">
            When enabled, clients can choose a home visit and must enter their residential area and full address.
            When disabled, everyone books a normal studio appointment.
          </p>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={availability.homeCalls.enabled}
              onChange={(e) =>
                setAvailability((prev) => ({
                  ...prev,
                  homeCalls: { ...prev.homeCalls, enabled: e.target.checked },
                }))
              }
              className="w-5 h-5 text-brown-dark rounded border-brown-light"
            />
            <span className="font-semibold text-brown-dark">Enable home visit section on the booking page</span>
          </label>
          {availability.homeCalls.enabled && (
            <div className="mb-4 p-4 bg-emerald-50/80 border border-emerald-200 rounded-lg">
              <label className="block text-sm font-medium text-brown-dark mb-1">
                Home visit charge (KES)
              </label>
              <p className="text-xs text-brown-dark/70 mb-2">
                Added on top of the service price when a client books a home visit. If they have a 100% discount on
                services, this charge is not applied.
              </p>
              <input
                type="number"
                min={0}
                step={1}
                value={availability.homeCalls.feeKES}
                onChange={(e) =>
                  setAvailability((prev) => ({
                    ...prev,
                    homeCalls: {
                      ...prev.homeCalls,
                      feeKES: Math.max(0, Math.round(Number(e.target.value) || 0)),
                    },
                  }))
                }
                className="w-full max-w-xs px-3 py-2 border border-brown-light rounded-lg bg-white"
              />
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-1">Section title</label>
              <input
                type="text"
                value={availability.homeCalls.sectionTitle}
                onChange={(e) =>
                  setAvailability((prev) => ({
                    ...prev,
                    homeCalls: { ...prev.homeCalls, sectionTitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 border border-brown-light rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-1">Section description (shown to clients)</label>
              <textarea
                rows={3}
                value={availability.homeCalls.sectionDescription}
                onChange={(e) =>
                  setAvailability((prev) => ({
                    ...prev,
                    homeCalls: { ...prev.homeCalls, sectionDescription: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 border border-brown-light rounded-lg bg-white"
              />
            </div>
          </div>
        </div>

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
          <div className="mt-6 p-5 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-lg font-semibold text-brown-dark mb-2">Minimum notice before booking</h3>
            <p className="text-sm text-brown-dark/70 mb-4">
              Control how many hours ahead clients must book. Use the default for most days, then add day-specific
              overrides when you want shorter notice like 6 hours.
            </p>
            <div className="max-w-xs mb-5">
              <label className="block text-sm font-medium text-brown-dark mb-2">Default minimum notice (hours)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={availability.bookingWindow.minimumNoticeHours ?? 12}
                onChange={(event) => updateMinimumNoticeHours(Number(event.target.value) || 0)}
                className="w-full px-3 py-2 border border-brown-light rounded bg-white"
              />
              <p className="text-xs text-brown-dark/60 mt-2">
                Example: set this to 12 so clients must book at least 12 hours before their appointment.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {days.map((day) => (
                <div key={day}>
                  <label className="block text-xs font-semibold text-brown-dark mb-1 capitalize">{day}</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={availability.bookingWindow.minimumNoticeByDay?.[day] ?? ''}
                    onChange={(event) => updateMinimumNoticeForDay(day, event.target.value)}
                    placeholder={`${availability.bookingWindow.minimumNoticeHours ?? 12} hrs`}
                    className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-brown-dark/60 mt-3">
              Leave a day blank to use the default. Enter 6 for any day where same-day/short-notice bookings can open
              6 hours before the slot.
            </p>
          </div>
          <div className="mt-6 p-5 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-brown-dark mb-2">Reschedule cutoff (existing appointments)</h3>
            <p className="text-sm text-brown-dark/70 mb-4">
              How close to the appointment clients can still reschedule online from their booking link. This is
              separate from minimum notice for picking a new slot (above).
            </p>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Latest reschedule window (hours before appointment)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={availability.bookingWindow.rescheduleCutoffHours ?? 12}
                onChange={(event) => updateRescheduleCutoffHours(Number(event.target.value) || 0)}
                className="w-full px-3 py-2 border border-brown-light rounded bg-white"
              />
              <p className="text-xs text-brown-dark/60 mt-2">
                Example: 12 means clients cannot reschedule online once they are within 12 hours of their appointment.
                Set 24 to require rescheduling at least a day ahead.
              </p>
            </div>
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

        <div className="mb-4">
          <h1 className="text-4xl font-display text-brown-dark mb-2">Time Slots By Day</h1>
          <p className="text-sm text-brown-dark/70">
            Set appointment start times separately for each day. Clients only see slots for the exact day they select.
          </p>
        </div>
        {days.map((day) => renderTimeSlotSection(day))}
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

