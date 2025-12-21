'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import AdminBackButton from '@/components/AdminBackButton'

interface TimeSlot {
  hour: number
  minute: number
  label: string
}

interface ConsultationAvailability {
  availableDays: {
    monday?: boolean
    tuesday?: boolean
    wednesday?: boolean
    thursday?: boolean
    friday?: boolean
    saturday?: boolean
    sunday?: boolean
  }
  timeSlots: {
    weekdays?: TimeSlot[]
  }
  blockedDates: string[]
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function LabsConsultationAvailability() {
  const [availability, setAvailability] = useState<ConsultationAvailability>({
    availableDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    timeSlots: {
      weekdays: [],
    },
    blockedDates: [],
  })
  const [originalAvailability, setOriginalAvailability] = useState<ConsultationAvailability>({
    availableDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    timeSlots: {
      weekdays: [],
    },
    blockedDates: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [newBlockedDate, setNewBlockedDate] = useState('')
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
      const response = await authorizedFetch('/api/admin/labs/consultation-availability')
      if (response.ok) {
        const data = await response.json()
        const normalized: ConsultationAvailability = {
          availableDays: data.availableDays || {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
          },
          timeSlots: {
            weekdays: Array.isArray(data.timeSlots?.weekdays) ? data.timeSlots.weekdays : [],
          },
          blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
        }
        setAvailability(normalized)
        setOriginalAvailability(normalized)
      }
    } catch (error) {
      console.error('Error loading consultation availability:', error)
    } finally {
      setLoading(false)
    }
  }

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
      const response = await authorizedFetch('/api/admin/labs/consultation-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(availability),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Consultation availability updated successfully!' })
        setOriginalAvailability(availability)
        setShowDialog(false)
      } else {
        setMessage({ type: 'error', text: 'Failed to save consultation availability' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const updateAvailableDay = (day: string, enabled: boolean) => {
    setAvailability((prev) => ({
      ...prev,
      availableDays: {
        ...prev.availableDays,
        [day]: enabled,
      },
    }))
  }

  const addTimeSlot = () => {
    setAvailability((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        weekdays: [...(prev.timeSlots.weekdays || []), { hour: 9, minute: 0, label: '9:00 AM' }],
      },
    }))
  }

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    setAvailability((prev) => {
      const updated = { ...prev }
      if (!updated.timeSlots.weekdays) {
        updated.timeSlots.weekdays = []
      }
      updated.timeSlots.weekdays = [...updated.timeSlots.weekdays]
      updated.timeSlots.weekdays[index] = { ...updated.timeSlots.weekdays[index], [field]: value }
      // Update label if hour or minute changes
      if (field === 'hour' || field === 'minute') {
        const slot = updated.timeSlots.weekdays[index]
        const hours = field === 'hour' ? (value as number) : slot.hour
        const minutes = field === 'minute' ? (value as number) : slot.minute
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        const displayMinutes = minutes.toString().padStart(2, '0')
        updated.timeSlots.weekdays[index].label = `${displayHours}:${displayMinutes} ${ampm}`
      }
      return updated
    })
  }

  const removeTimeSlot = (index: number) => {
    setAvailability((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        weekdays: (prev.timeSlots.weekdays || []).filter((_, i) => i !== index),
      },
    }))
  }

  const addBlockedDate = () => {
    if (!newBlockedDate) return
    if (availability.blockedDates.includes(newBlockedDate)) {
      setMessage({ type: 'error', text: 'This date is already blocked' })
      return
    }
    setAvailability((prev) => ({
      ...prev,
      blockedDates: [...prev.blockedDates, newBlockedDate].sort(),
    }))
    setNewBlockedDate('')
  }

  const removeBlockedDate = (date: string) => {
    setAvailability((prev) => ({
      ...prev,
      blockedDates: prev.blockedDates.filter((d) => d !== date),
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
        <AdminBackButton />
        <div className="mb-6 flex justify-between items-center">
          {hasUnsavedChanges && (
            <div className="text-sm text-orange-600 font-medium">
              ⚠️ You have unsaved changes
            </div>
          )}
          <Link 
            href="/admin/labs" 
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkClick(e, '/admin/labs')}
          >
            ← Back to Labs
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Labs Consultation Availability</h1>
          <p className="text-sm text-brown-dark/70 mb-6">
            Configure which days of the week are available for LashDiary Labs consultations, set time slots, and block specific dates.
          </p>

          {/* Available Days */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Available Days</h2>
            <p className="text-sm text-brown-dark/70 mb-4">
              Select which days of the week are available for consultations. Only enabled days will show available time slots.
            </p>
            <div className="space-y-3">
              {days.map((day) => (
                <div key={day} className="flex items-center justify-between p-4 bg-pink-light rounded-lg">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availability.availableDays[day as keyof typeof availability.availableDays] ?? false}
                      onChange={(e) => updateAvailableDay(day, e.target.checked)}
                      className="mr-3 w-5 h-5 text-brown-dark focus:ring-brown-dark rounded"
                    />
                    <span className="font-semibold text-brown-dark capitalize text-lg">{day}</span>
                  </label>
                  <div className="text-sm text-brown">
                    {availability.availableDays[day as keyof typeof availability.availableDays]
                      ? 'Available'
                      : 'Not Available'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-brown-dark">Time Slots</h2>
                <p className="text-sm text-brown-dark/70 mt-1">
                  Set the available time slots for consultations. These slots apply to all enabled days.
                </p>
              </div>
              <button
                onClick={addTimeSlot}
                className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
              >
                + Add Slot
              </button>
            </div>
            <div className="space-y-4">
              {(availability.timeSlots.weekdays || []).map((slot, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
                  <input
                    type="number"
                    value={slot.hour}
                    onChange={(e) => updateTimeSlot(index, 'hour', parseInt(e.target.value) || 0)}
                    placeholder="Hour (0-23)"
                    min="0"
                    max="23"
                    className="px-3 py-2 border border-brown-light rounded bg-white"
                  />
                  <input
                    type="number"
                    value={slot.minute}
                    onChange={(e) => updateTimeSlot(index, 'minute', parseInt(e.target.value) || 0)}
                    placeholder="Minute (0-59)"
                    min="0"
                    max="59"
                    className="px-3 py-2 border border-brown-light rounded bg-white"
                  />
                  <input
                    type="text"
                    value={slot.label}
                    onChange={(e) => updateTimeSlot(index, 'label', e.target.value)}
                    placeholder="Label (e.g., 9:00 AM)"
                    className="px-3 py-2 border border-brown-light rounded bg-white"
                  />
                  <button
                    onClick={() => removeTimeSlot(index)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {(!availability.timeSlots.weekdays || availability.timeSlots.weekdays.length === 0) && (
                <p className="text-sm text-gray-500 italic">No time slots configured. Add slots to enable bookings.</p>
              )}
            </div>
          </div>

          {/* Blocked Dates */}
          <div>
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Blocked Dates</h2>
            <p className="text-sm text-brown-dark/70 mb-4">
              Block specific dates so no consultations can be booked on those days (e.g., holidays, personal days off).
            </p>
            <div className="mb-4 flex gap-2">
              <input
                type="date"
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
                className="px-3 py-2 border border-brown-light rounded bg-white"
              />
              <button
                onClick={addBlockedDate}
                className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
              >
                Block Date
              </button>
            </div>
            {availability.blockedDates.length > 0 ? (
              <div className="space-y-2">
                {availability.blockedDates.map((date) => (
                  <div key={date} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="font-medium text-brown-dark">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={() => removeBlockedDate(date)}
                      className="text-red-600 hover:text-red-800 font-semibold"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No blocked dates. All enabled days are available.</p>
            )}
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

