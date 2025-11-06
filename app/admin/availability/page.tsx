'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

interface AvailabilityData {
  businessHours: BusinessHours
  timeSlots: {
    weekdays: TimeSlot[]
    saturday?: TimeSlot[]
    sunday: TimeSlot[]
  }
}

export default function AdminAvailability() {
  const [availability, setAvailability] = useState<AvailabilityData>({
    businessHours: {},
    timeSlots: { weekdays: [], saturday: [], sunday: [] },
  })
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilityData>({
    businessHours: {},
    timeSlots: { weekdays: [], saturday: [], sunday: [] },
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
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadAvailability()
        }
      })
  }, [router])

  const loadAvailability = async () => {
    try {
      const response = await fetch('/api/admin/availability')
      if (response.ok) {
        const data = await response.json()
        // Ensure saturday time slots array exists
        if (!data.timeSlots.saturday) {
          data.timeSlots.saturday = []
        }
        setAvailability(data)
        setOriginalAvailability(data)
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
      const response = await fetch('/api/admin/availability', {
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

  const addTimeSlot = (type: 'weekdays' | 'saturday' | 'sunday') => {
    setAvailability((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [type]: [...(prev.timeSlots[type] || []), { hour: 9, minute: 0, label: '9:00 AM' }],
      },
    }))
  }

  const updateTimeSlot = (type: 'weekdays' | 'saturday' | 'sunday', index: number, field: keyof TimeSlot, value: string | number) => {
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

  const removeTimeSlot = (type: 'weekdays' | 'saturday' | 'sunday', index: number) => {
    setAvailability((prev) => ({
      ...prev,
      timeSlots: {
        ...prev.timeSlots,
        [type]: (prev.timeSlots[type] || []).filter((_, i) => i !== index),
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

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

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

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-brown-dark">Weekday Time Slots (Mon-Fri)</h2>
            <button
              onClick={() => addTimeSlot('weekdays')}
              className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
            >
              + Add Slot
            </button>
          </div>
          <div className="space-y-4">
            {availability.timeSlots.weekdays.map((slot, index) => (
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
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Saturday time slots will only be used when Saturday is enabled in Business Hours above. 
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

