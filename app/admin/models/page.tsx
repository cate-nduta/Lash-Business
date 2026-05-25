'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface ModelApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  instagram: string
  availability: string
  hasLashExtensions: string
  hasAppointmentBefore: string
  allergies: string
  comfortableLongSessions: string
  submittedAt: string
  status: 'pending' | 'selected' | 'rejected'
  customAnswers?: Record<string, string | string[]>
  modelQuestions?: ModelApplicationQuestion[]
  consentItems?: ModelConsentItem[]
  consentAccepted?: Record<string, boolean>
}

type ModelQuestionType = 'single' | 'multiple' | 'text'

interface ModelApplicationQuestion {
  id: string
  label: string
  type: ModelQuestionType
  required: boolean
  options: string[]
}

interface ModelConsentItem {
  id: string
  label: string
}

interface SlotOption {
  value: string
  label: string
}

interface AvailabilitySlot {
  hour: number
  minute: number
  label?: string
}

interface AvailabilitySettings {
  businessHours?: Record<string, { enabled?: boolean }>
  timeSlots?: Record<string, AvailabilitySlot[]>
}

const defaultModelQuestions: ModelApplicationQuestion[] = [
  { id: 'availability', label: 'Choose one available model slot', type: 'single', required: true, options: [] },
  { id: 'hasLashExtensions', label: 'Have you had lash extensions before?', type: 'single', required: true, options: ['Yes', 'No'] },
  { id: 'hasAppointmentBefore', label: 'Have you been a client at LashDiary before?', type: 'single', required: true, options: ['Yes', 'No'] },
  { id: 'allergies', label: 'Do you have any known allergies, sensitivities or eye conditions?', type: 'text', required: false, options: [] },
  { id: 'comfortableLongSessions', label: 'Are you comfortable with long sessions? (3-4 hours)', type: 'single', required: true, options: ['Yes', 'No'] },
]

const defaultConsentItems: ModelConsentItem[] = [
  { id: 'freeModelSet', label: 'I understand this is a free model set provided for training/content creation.' },
  { id: 'longSessions', label: 'I understand the appointment may take up to 3-4 hours.' },
  { id: 'photosVideos', label: 'I consent to photos/videos of my lashes being used for marketing purposes.' },
  { id: 'noInfills', label: 'I understand infills are not included in this offer.' },
  { id: 'onTime', label: 'I agree to arrive on time; late arrivals may forfeit the appointment.' },
  { id: 'styleChoice', label: 'I understand the lash style will be chosen based on the model call needs.' },
]

const defaultIntroText = `I'm currently building my lash portfolio and practicing new lash mapping techniques as part of my ongoing training. I'm offering a limited number of free lash sets to selected models in exchange for photos and videos of the final look.

Because these sets involve practice and filming, the appointment may take longer than a regular session.

Submitting this form does not guarantee a booking. Models will be selected based on availability and how many spots I have open for each model round.`

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const formatModelSlotLabel = (value?: string) => {
  if (!value) return 'Not specified'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date)
}

const toDateTimeLocalValue = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`
}

const getModelSlotDateValue = (value?: string) => toDateTimeLocalValue(value).split('T')[0] || ''

const getDayKeyForDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00+03:00`)
  if (Number.isNaN(parsed.getTime())) return ''

  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Africa/Nairobi',
  }).format(parsed).toLowerCase()

  return weekday
}

const formatSlotTime = (slot: AvailabilitySlot) => {
  if (slot.label) return slot.label
  const hour = slot.hour || 0
  const minute = slot.minute || 0
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`
}

const getConfiguredSlotsForDate = (date: string, availabilitySettings: AvailabilitySettings | null): SlotOption[] => {
  if (!date || !availabilitySettings) return []

  const dayKey = getDayKeyForDate(date)
  if (!dayKey) return []

  const dayEnabled = availabilitySettings.businessHours?.[dayKey]?.enabled === true
  if (!dayEnabled) return []

  const daySlots = availabilitySettings.timeSlots?.[dayKey]
  const weekdaySlots = availabilitySettings.timeSlots?.weekdays
  const slots =
    Array.isArray(daySlots) && daySlots.length > 0
      ? daySlots
      : dayKey !== 'saturday' && dayKey !== 'sunday' && Array.isArray(weekdaySlots)
      ? weekdaySlots
      : []

  return slots
    .filter((slot) => typeof slot.hour === 'number' && typeof slot.minute === 'number')
    .map((slot) => {
      const value = `${date}T${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}:00+03:00`
      return {
        value,
        label: formatSlotTime(slot),
      }
    })
}

export default function AdminModels() {
  const router = useRouter()
  const [applications, setApplications] = useState<ModelApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<ModelApplication | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  const [rejectionMessage, setRejectionMessage] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState({ hours: '10', minutes: '00', ampm: 'AM' })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingRejection, setSendingRejection] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'selected' | 'rejected'>('all')
  const [introText, setIntroText] = useState(defaultIntroText)
  const [modelQuestions, setModelQuestions] = useState<ModelApplicationQuestion[]>(defaultModelQuestions)
  const [consentItems, setConsentItems] = useState<ModelConsentItem[]>(defaultConsentItems)
  const [savingQuestions, setSavingQuestions] = useState(false)
  const [modelSlotOptionsByDate, setModelSlotOptionsByDate] = useState<Record<string, SlotOption[]>>({})
  const [modelSlotDraftDates, setModelSlotDraftDates] = useState<Record<string, string>>({})
  const [availabilitySettings, setAvailabilitySettings] = useState<AvailabilitySettings | null>(null)

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
          setAuthenticated(false)
          router.replace('/admin/login')
          return
        }
        setAuthenticated(true)
        loadApplications()
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

  const loadApplications = async () => {
    try {
      const [response, availabilityResponse] = await Promise.all([
        authorizedFetch('/api/admin/models'),
        authorizedFetch('/api/admin/availability'),
      ])

      if (availabilityResponse.ok) {
        setAvailabilitySettings(await availabilityResponse.json())
      }

      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
        if (typeof data.settings?.introText === 'string') {
          setIntroText(data.settings.introText)
        }
        if (Array.isArray(data.settings?.questions) && data.settings.questions.length > 0) {
          setModelQuestions(data.settings.questions)
        }
        if (Array.isArray(data.settings?.consentItems) && data.settings.consentItems.length > 0) {
          setConsentItems(data.settings.consentItems)
        }
      }
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadModelSlotOptionsForDate = async (date: string) => {
    if (!date || modelSlotOptionsByDate[date]) return

    const configuredSlots = getConfiguredSlotsForDate(date, availabilitySettings)
    if (configuredSlots.length > 0) {
      setModelSlotOptionsByDate((prev) => ({ ...prev, [date]: configuredSlots }))
      return
    }

    try {
      const response = await authorizedFetch(`/api/calendar/available-slots?date=${encodeURIComponent(date)}`)
      if (!response.ok) {
        setModelSlotOptionsByDate((prev) => ({ ...prev, [date]: [] }))
        return
      }

      const data = await response.json()
      const slots = Array.isArray(data.slots) ? data.slots : []
      setModelSlotOptionsByDate((prev) => ({
        ...prev,
        [date]: slots.map((slot: any) => ({
          value: String(slot.value || ''),
          label: String(slot.label || slot.value || ''),
        })).filter((slot: SlotOption) => slot.value),
      }))
    } catch (error) {
      console.error('Error loading model slot options:', error)
      setModelSlotOptionsByDate((prev) => ({ ...prev, [date]: [] }))
    }
  }

  const getModelSlotOptionsForDate = (date: string, currentValue: string): SlotOption[] => {
    const options = modelSlotOptionsByDate[date] || getConfiguredSlotsForDate(date, availabilitySettings)
    if (!currentValue || options.some((option) => option.value === currentValue)) {
      return options
    }

    return [{ value: currentValue, label: `${formatModelSlotLabel(currentValue)} (currently selected)` }, ...options]
  }

  const updateQuestion = (id: string, updates: Partial<ModelApplicationQuestion>) => {
    setModelQuestions((questions) =>
      questions.map((question) => {
        if (question.id !== id) return question
        const next = { ...question, ...updates }
        return next.type === 'text' ? { ...next, options: [] } : next
      })
    )
  }

  const addQuestion = () => {
    setModelQuestions((questions) => [
      ...questions,
      {
        id: `question-${Date.now()}`,
        label: 'New question',
        type: 'single',
        required: true,
        options: ['Option 1', 'Option 2'],
      },
    ])
  }

  const removeQuestion = (id: string) => {
    setModelQuestions((questions) => questions.filter((question) => question.id !== id))
  }

  const updateConsentItem = (id: string, label: string) => {
    setConsentItems((items) => items.map((item) => (item.id === id ? { ...item, label } : item)))
  }

  const addConsentItem = () => {
    setConsentItems((items) => [
      ...items,
      {
        id: `consent-${Date.now()}`,
        label: 'New consent statement',
      },
    ])
  }

  const removeConsentItem = (id: string) => {
    setConsentItems((items) => items.filter((item) => item.id !== id))
  }

  const saveQuestionSettings = async () => {
    setSavingQuestions(true)
    try {
      const response = await authorizedFetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateSettings', introText, questions: modelQuestions, consentItems }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save model questions')
      }
      if (Array.isArray(data.settings?.questions)) {
        setModelQuestions(data.settings.questions)
      }
      if (typeof data.settings?.introText === 'string') {
        setIntroText(data.settings.introText)
      }
      if (Array.isArray(data.settings?.consentItems)) {
        setConsentItems(data.settings.consentItems)
      }
      setMessage({ type: 'success', text: 'Model application settings saved.' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save model questions' })
    } finally {
      setSavingQuestions(false)
    }
  }

  const formatAnswer = (answer?: string | string[]) => {
    if (Array.isArray(answer)) return answer.join(', ') || 'Not specified'
    return formatModelSlotLabel(answer)
  }

  const updateStatus = async (applicationId: string, status: 'pending' | 'selected' | 'rejected', personalNote?: string) => {
    try {
      const response = await authorizedFetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', applicationId, status, personalNote }),
      })

      if (response.ok) {
        const data = await response.json()
        if (status === 'rejected' && data.emailSent) {
          setMessage({ type: 'success', text: 'Status updated and rejection email sent successfully!' })
        } else if (status === 'rejected' && !data.emailSent) {
          setMessage({ 
            type: 'error', 
            text: `Status updated, but failed to send rejection email. ${data.emailError || 'Please check email configuration.'}` 
          })
        } else {
          setMessage({ type: 'success', text: 'Status updated successfully' })
        }
        loadApplications()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to update status' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const sendRejectionEmail = async () => {
    if (!selectedApplication) return

    setSendingRejection(true)
    try {
      await updateStatus(selectedApplication.id, 'rejected', rejectionMessage)
      setShowRejectionModal(false)
      setRejectionMessage('')
      setSelectedApplication(null)
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending rejection email' })
    } finally {
      setSendingRejection(false)
    }
  }

  const formatAppointmentDateTime = () => {
    if (!appointmentDate) return ''
    
    const date = new Date(appointmentDate)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    const dayName = dayNames[date.getDay()]
    const month = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    
    const hours = parseInt(appointmentTime.hours)
    const minutes = appointmentTime.minutes
    const ampm = appointmentTime.ampm
    
    const timeStr = `${hours}:${minutes} ${ampm}`
    
    // Get ordinal suffix for day
    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return n + 'th'
      switch (n % 10) {
        case 1: return n + 'st'
        case 2: return n + 'nd'
        case 3: return n + 'rd'
        default: return n + 'th'
      }
    }
    
    return `${dayName}, ${month} ${getOrdinal(day)}, ${year} at ${timeStr}`
  }

  const sendSelectionEmail = async () => {
    if (!selectedApplication) return

    setSendingEmail(true)
    try {
      const formattedDateTime = formatAppointmentDateTime()
      const response = await authorizedFetch('/api/admin/models/send-selection-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          message: emailMessage,
          appointmentDateTime: formattedDateTime,
          appointmentDate: appointmentDate,
          appointmentTime: appointmentTime,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Selection email sent successfully!' })
        setShowEmailModal(false)
        setEmailMessage('')
        setAppointmentDate('')
        setAppointmentTime({ hours: '10', minutes: '00', ampm: 'AM' })
        updateStatus(selectedApplication.id, 'selected')
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to send email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending email' })
    } finally {
      setSendingEmail(false)
    }
  }

  const filteredApplications = applications.filter((app) => {
    if (filter === 'all') return true
    return app.status === filter
  })

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-6">Model Applications Management</h1>

          <div className="mb-8 rounded-lg border-2 border-brown-light bg-pink-light/30 p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-brown-dark">Application Questions</h2>
                <p className="text-sm text-brown/70">Edit the questions clients answer on the model signup page. The availability question is one answer only, and taken slots are hidden automatically.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 border-2 border-brown-light rounded-lg text-brown-dark font-semibold hover:bg-white transition-colors"
                >
                  Add Question
                </button>
                <button
                  type="button"
                  onClick={saveQuestionSettings}
                  disabled={savingQuestions}
                  className="px-4 py-2 bg-brown-dark hover:bg-brown text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {savingQuestions ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-brown-light bg-white p-4">
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Model Application Page Intro
              </label>
              <textarea
                value={introText}
                onChange={(event) => setIntroText(event.target.value)}
                rows={7}
                className="w-full px-3 py-2 border-2 border-brown-light rounded-lg"
                placeholder="Write the introduction text shown above the model application form."
              />
              <p className="mt-2 text-xs text-brown/70">
                This text appears on the public model application page. Use blank lines to separate paragraphs.
              </p>
            </div>

            <div className="space-y-4">
              {modelQuestions.map((question, index) => (
                <div key={question.id} className="bg-white rounded-lg border border-brown-light p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-brown-dark">Question {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      disabled={question.id === 'availability'}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    >
                      {question.id === 'availability' ? 'Required Question' : 'Remove'}
                    </button>
                  </div>
                  <input
                    value={question.label}
                    onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg"
                    placeholder="Question text"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={question.type}
                      onChange={(event) => updateQuestion(question.id, { type: event.target.value as ModelQuestionType })}
                      disabled={question.id === 'availability'}
                      className="px-3 py-2 border-2 border-brown-light rounded-lg"
                    >
                      <option value="single">One answer</option>
                      <option value="multiple">Multiple answers</option>
                      <option value="text">Text answer</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-brown-dark">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                        disabled={question.id === 'availability'}
                        className="w-4 h-4"
                      />
                      Required
                    </label>
                    {question.id === 'availability' ? (
                      <div className="md:col-span-3 rounded-lg border border-brown-light bg-pink-light/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-brown-dark">Model Slots You Want to Offer</p>
                            <p className="text-xs text-brown/70">
                              Choose a date, then pick from the normal availability time slots for that day. Taken or clashing slots will be hidden from the public form.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateQuestion(question.id, { options: [...question.options, ''] })}
                            className="px-3 py-2 border-2 border-brown-light rounded-lg text-sm font-semibold text-brown-dark hover:bg-white transition-colors"
                          >
                            Add Slot
                          </button>
                        </div>
                        <div className="space-y-2">
                          {question.options.length === 0 ? (
                            <p className="text-sm text-brown/70">No model slots added yet.</p>
                          ) : (
                            question.options.map((option, optionIndex) => (
                              <div key={`${question.id}-${optionIndex}`} className="flex flex-col gap-2 rounded-lg bg-white p-3 md:flex-row md:items-center">
                                {(() => {
                                  const draftKey = `${question.id}-${optionIndex}`
                                  const selectedDate = modelSlotDraftDates[draftKey] || getModelSlotDateValue(option)

                                  return (
                                    <>
                                <input
                                  type="date"
                                  value={selectedDate}
                                  onChange={(event) => {
                                    const selectedDate = event.target.value
                                    const nextOptions = [...question.options]
                                    nextOptions[optionIndex] = ''
                                    updateQuestion(question.id, { options: nextOptions })
                                    setModelSlotDraftDates((prev) => ({ ...prev, [draftKey]: selectedDate }))
                                    loadModelSlotOptionsForDate(selectedDate)
                                  }}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg"
                                />
                                <select
                                  value={option}
                                  onFocus={() => loadModelSlotOptionsForDate(selectedDate)}
                                  onChange={(event) => {
                                    const nextOptions = [...question.options]
                                    nextOptions[optionIndex] = event.target.value
                                    updateQuestion(question.id, { options: nextOptions.filter(Boolean) })
                                    setModelSlotDraftDates((prev) => {
                                      const next = { ...prev }
                                      delete next[draftKey]
                                      return next
                                    })
                                  }}
                                  disabled={!selectedDate}
                                  className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg disabled:opacity-50"
                                >
                                  <option value="">
                                    {selectedDate ? 'Choose time' : 'Choose date first'}
                                  </option>
                                  {getModelSlotOptionsForDate(selectedDate, option).map((slot) => (
                                    <option key={slot.value} value={slot.value}>
                                      {slot.label}
                                    </option>
                                  ))}
                                </select>
                                    </>
                                  )
                                })()}
                                <span className="text-xs text-brown/70 md:w-56">
                                  {option ? formatModelSlotLabel(option) : 'Choose a date, then a time'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(question.id, { options: question.options.filter((_, index) => index !== optionIndex) })}
                                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : question.type !== 'text' && (
                      <textarea
                        value={question.options.join('\n')}
                        onChange={(event) => updateQuestion(question.id, { options: event.target.value.split('\n').map((option) => option.trim()).filter(Boolean) })}
                        rows={3}
                        className="px-3 py-2 border-2 border-brown-light rounded-lg"
                        placeholder="One option per line"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-brown-light pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-brown-dark">Consent & Agreement Checkboxes</h2>
                  <p className="text-sm text-brown/70">
                    Edit the required checkbox statements clients must agree to before submitting the model application.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addConsentItem}
                  className="px-4 py-2 border-2 border-brown-light rounded-lg text-brown-dark font-semibold hover:bg-white transition-colors"
                >
                  Add Consent
                </button>
              </div>

              <div className="space-y-3">
                {consentItems.map((item, index) => (
                  <div key={item.id} className="bg-white rounded-lg border border-brown-light p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-brown-dark">Consent {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeConsentItem(item.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={item.label}
                      onChange={(event) => updateConsentItem(item.id, event.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-brown-light rounded-lg"
                      placeholder="Consent statement"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-4 mb-6 border-b border-brown-light">
            <span
              onClick={() => setFilter('all')}
              className={`pb-2 px-4 font-semibold transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'text-brown-dark border-b-2 border-brown-dark'
                  : 'text-brown/60 hover:text-brown-dark'
              }`}
            >
              All ({applications.length})
            </span>
            <span
              onClick={() => setFilter('pending')}
              className={`pb-2 px-4 font-semibold transition-colors cursor-pointer ${
                filter === 'pending'
                  ? 'text-brown-dark border-b-2 border-brown-dark'
                  : 'text-brown/60 hover:text-brown-dark'
              }`}
            >
              Pending ({applications.filter((a) => a.status === 'pending').length})
            </span>
            <span
              onClick={() => setFilter('selected')}
              className={`pb-2 px-4 font-semibold transition-colors cursor-pointer ${
                filter === 'selected'
                  ? 'text-brown-dark border-b-2 border-brown-dark'
                  : 'text-brown/60 hover:text-brown-dark'
              }`}
            >
              Selected ({applications.filter((a) => a.status === 'selected').length})
            </span>
            <span
              onClick={() => setFilter('rejected')}
              className={`pb-2 px-4 font-semibold transition-colors cursor-pointer ${
                filter === 'rejected'
                  ? 'text-brown-dark border-b-2 border-brown-dark'
                  : 'text-brown/60 hover:text-brown-dark'
              }`}
            >
              Rejected ({applications.filter((a) => a.status === 'rejected').length})
            </span>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 text-brown/60">
              <p>No {filter === 'all' ? '' : filter} applications found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="border-2 border-brown-light rounded-lg p-6 bg-pink-light/30"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-brown-dark mb-2">
                        {app.firstName} {app.lastName}
                      </h3>
                      <div className="space-y-1 text-sm text-brown/80">
                        <p><strong>Email:</strong> {app.email}</p>
                        {app.phone && <p><strong>Phone:</strong> {app.phone}</p>}
                        {app.instagram && <p><strong>Instagram:</strong> {app.instagram}</p>}
                        <p><strong>Submitted:</strong> {new Date(app.submittedAt).toLocaleDateString()}</p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <span
                            className={`font-semibold ${
                              app.status === 'selected'
                                ? 'text-green-600'
                                : app.status === 'rejected'
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setShowEmailModal(true)
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Send Selection Email
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApplication(app)
                              setShowRejectionModal(true)
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {app.status === 'selected' && (
                        <button
                          onClick={() => updateStatus(app.id, 'pending')}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Mark as Pending
                        </button>
                      )}
                      {app.status === 'rejected' && (
                        <button
                          onClick={() => updateStatus(app.id, 'pending')}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Mark as Pending
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-brown-light">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-brown-dark mb-1">Availability:</p>
                        <p className="text-brown/80 whitespace-pre-wrap">{formatModelSlotLabel(app.availability)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-brown-dark mb-1">Lash Experience:</p>
                        <p className="text-brown/80">
                          Has had extensions: {app.hasLashExtensions || 'Not specified'}
                        </p>
                        <p className="text-brown/80">
                          Previous client: {app.hasAppointmentBefore || 'Not specified'}
                        </p>
                        <p className="text-brown/80">
                          Comfortable with long sessions: {app.comfortableLongSessions || 'Not specified'}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="font-semibold text-brown-dark mb-1">Allergies/Sensitivities:</p>
                        <p className="text-brown/80 whitespace-pre-wrap">{app.allergies || 'None specified'}</p>
                      </div>
                      {app.customAnswers && (
                        <div className="md:col-span-2">
                          <p className="font-semibold text-brown-dark mb-1">Application Answers:</p>
                          <div className="space-y-1 text-brown/80">
                            {(app.modelQuestions || modelQuestions).map((question) => (
                              <p key={question.id}>
                                <strong>{question.label}:</strong> {formatAnswer(app.customAnswers?.[question.id])}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {(app.consentItems || consentItems).length > 0 && (
                        <div className="md:col-span-2">
                          <p className="font-semibold text-brown-dark mb-1">Consent & Agreement:</p>
                          <div className="space-y-1 text-brown/80">
                            {(app.consentItems || consentItems).map((item) => (
                              <p key={item.id}>
                                <strong>{app.consentAccepted?.[item.id] ? 'Agreed' : 'Not agreed'}:</strong> {item.label}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-display text-brown-dark mb-4">Send Selection Email</h2>
            <p className="text-brown/80 mb-4">
              Sending selection email to <strong>{selectedApplication.firstName} {selectedApplication.lastName}</strong> ({selectedApplication.email})
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Appointment Date & Time <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              
              {/* Date Picker */}
              <div className="mb-3">
                <label className="block text-xs text-brown-dark/70 mb-1">Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              
              {/* Time Picker */}
              {appointmentDate && (
                <div className="mb-3">
                  <label className="block text-xs text-brown-dark/70 mb-1">Time</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={appointmentTime.hours}
                      onChange={(e) => setAppointmentTime({ ...appointmentTime, hours: e.target.value })}
                      className="px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <option key={hour} value={hour.toString()}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span className="text-brown-dark font-semibold">:</span>
                    <select
                      value={appointmentTime.minutes}
                      onChange={(e) => setAppointmentTime({ ...appointmentTime, minutes: e.target.value })}
                      className="px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((min) => (
                        <option key={min} value={min.toString().padStart(2, '0')}>
                          {min.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={appointmentTime.ampm}
                      onChange={(e) => setAppointmentTime({ ...appointmentTime, ampm: e.target.value })}
                      className="px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              )}
              
              {appointmentDate && (
                <p className="text-xs text-brown/60 mt-1 mb-4">
                  Preview: {formatAppointmentDateTime()}
                </p>
              )}
              
              <p className="text-xs text-brown/60 mt-1 mb-4">
                The date and time of the model's appointment. This will be included in the email.
              </p>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Additional Message (Optional)
              </label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                placeholder="Add any additional information or instructions..."
              />
              <p className="text-xs text-brown/60 mt-1">
                The email will automatically include location and detailed preparation guidelines.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={sendSelectionEmail}
                disabled={sendingEmail}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  setEmailMessage('')
                  setAppointmentDate('')
                  setAppointmentTime({ hours: '10', minutes: '00', ampm: 'AM' })
                }}
                className="px-4 py-2 border-2 border-brown-light rounded-lg text-brown-dark font-semibold hover:bg-brown-light transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setShowRejectionModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-display text-brown-dark mb-4">Send Rejection Email</h2>
            <p className="text-brown/80 mb-4">
              Sending rejection email to <strong>{selectedApplication.firstName} {selectedApplication.lastName}</strong> ({selectedApplication.email})
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Personal Note (Optional)
              </label>
              <textarea
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                placeholder="Add a personal note to the rejection email..."
              />
              <p className="text-xs text-brown/60 mt-1">
                This note will be included in the rejection email. If left empty, the standard rejection message will be sent.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={sendRejectionEmail}
                disabled={sendingRejection}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {sendingRejection ? 'Sending...' : 'Send Rejection Email'}
              </button>
              <button
                onClick={() => {
                  setShowRejectionModal(false)
                  setRejectionMessage('')
                  setSelectedApplication(null)
                }}
                className="px-4 py-2 border-2 border-brown-light rounded-lg text-brown-dark font-semibold hover:bg-brown-light transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

