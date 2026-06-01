'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

type ModelStatus = 'pending' | 'selected' | 'rejected'
type FilterStatus = 'all' | ModelStatus

interface ModelApplicationQuestion {
  id: string
  label: string
}

interface ModelConsentItem {
  id: string
  label: string
}

interface ModelApplicationFeeRecord {
  enabled?: boolean
  amount?: number
  currency?: string
  paymentStatus?: 'pending' | 'paid' | 'waived' | 'not_required'
}

interface ModelApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  instagram?: string
  availability?: string
  hasLashExtensions?: string
  hasAppointmentBefore?: string
  allergies?: string
  comfortableLongSessions?: string
  submittedAt: string
  status: ModelStatus
  customAnswers?: Record<string, string | string[]>
  modelQuestions?: ModelApplicationQuestion[]
  consentItems?: ModelConsentItem[]
  consentAccepted?: Record<string, boolean>
  modelFee?: ModelApplicationFeeRecord
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const formatModelFeeAmount = (amount = 0, currency = 'KES') =>
  `${currency} ${Math.max(Number(amount) || 0, 0).toLocaleString()}`

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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function AppliedModelsPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<ModelApplication[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [updatingId, setUpdatingId] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<ModelApplication | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [requestingReviewId, setRequestingReviewId] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState({ hours: '10', minutes: '00', ampm: 'AM' })
  const [appointmentDurationMinutes, setAppointmentDurationMinutes] = useState(75)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadApplications = async () => {
    setLoading(true)
    try {
      const authResponse = await authorizedFetch('/api/admin/current-user')
      if (!authResponse.ok) throw new Error('Unauthorized')
      const auth = await authResponse.json()
      if (!auth.authenticated) {
        router.replace('/admin/login')
        return
      }
      setAuthenticated(true)

      const response = await authorizedFetch('/api/admin/models')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to load model applications')
      setApplications(Array.isArray(data.applications) ? data.applications : [])
    } catch (error: unknown) {
      if (getErrorMessage(error, '') === 'Unauthorized') {
        router.replace('/admin/login')
      } else {
        setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to load model applications') })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  const counts = useMemo(() => ({
    all: applications.length,
    pending: applications.filter((application) => application.status === 'pending').length,
    selected: applications.filter((application) => application.status === 'selected').length,
    rejected: applications.filter((application) => application.status === 'rejected').length,
  }), [applications])

  const filteredApplications = useMemo(
    () =>
      applications
        .filter((application) => filter === 'all' || application.status === filter)
        .sort((a, b) => {
          const submittedA = new Date(a.submittedAt).getTime()
          const submittedB = new Date(b.submittedAt).getTime()
          return (Number.isNaN(submittedB) ? 0 : submittedB) - (Number.isNaN(submittedA) ? 0 : submittedA)
        }),
    [applications, filter]
  )

  const updateStatus = async (applicationId: string, status: ModelStatus) => {
    setUpdatingId(applicationId)
    try {
      const response = await authorizedFetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', applicationId, status }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to update status')
      setMessage({ type: 'success', text: 'Model status updated.' })
      await loadApplications()
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to update status') })
    } finally {
      setUpdatingId('')
    }
  }

  const openSelectionEmail = (application: ModelApplication) => {
    setSelectedApplication(application)
    setEmailMessage('')
    setAppointmentDate('')
    setAppointmentTime({ hours: '10', minutes: '00', ampm: 'AM' })
    setAppointmentDurationMinutes(75)
    setShowEmailModal(true)
  }

  const closeSelectionEmail = () => {
    setShowEmailModal(false)
    setSelectedApplication(null)
    setEmailMessage('')
    setAppointmentDate('')
    setAppointmentTime({ hours: '10', minutes: '00', ampm: 'AM' })
    setAppointmentDurationMinutes(75)
  }

  const formatAppointmentDateTime = () => {
    if (!appointmentDate) return ''

    const date = new Date(appointmentDate)
    if (Number.isNaN(date.getTime())) return ''

    const day = date.getDate()
    const getOrdinal = (value: number) => {
      if (value > 3 && value < 21) return `${value}th`
      switch (value % 10) {
        case 1:
          return `${value}st`
        case 2:
          return `${value}nd`
        case 3:
          return `${value}rd`
        default:
          return `${value}th`
      }
    }

    const dateLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      year: 'numeric',
    }).format(date)

    return `${dateLabel.replace(String(day), getOrdinal(day))} at ${Number(appointmentTime.hours)}:${appointmentTime.minutes} ${appointmentTime.ampm}`
  }

  const sendSelectionEmail = async () => {
    if (!selectedApplication) return

    setSendingEmail(true)
    try {
      const response = await authorizedFetch('/api/admin/models/send-selection-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApplication.id,
          message: emailMessage,
          appointmentDateTime: formatAppointmentDateTime(),
          appointmentDate,
          appointmentTime,
          appointmentDurationMinutes,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send selection email')
      }

      await updateStatus(selectedApplication.id, 'selected')
      setMessage({
        type: 'success',
        text: data.paymentRequired
          ? 'Selection email sent with model fee payment link.'
          : 'Selection email sent successfully.',
      })
      closeSelectionEmail()
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to send selection email') })
    } finally {
      setSendingEmail(false)
    }
  }

  const sendModelReviewRequest = async (application: ModelApplication) => {
    setRequestingReviewId(application.id)
    try {
      const response = await authorizedFetch('/api/admin/models/send-testimonial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: application.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send model review request')
      }
      setMessage({
        type: data.emailSent === false ? 'error' : 'success',
        text: data.message || 'Model review request sent.',
      })
      await loadApplications()
    } catch (error: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(error, 'Failed to send model review request') })
    } finally {
      setRequestingReviewId('')
    }
  }

  const formatAnswer = (answer?: string | string[]) => {
    if (Array.isArray(answer)) return answer.join(', ') || 'Not specified'
    return formatModelSlotLabel(answer)
  }

  if (authenticated === null && loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/admin/models" className="text-brown hover:text-brown-dark">
            Back to Model Management
          </Link>
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            Back to Dashboard
          </Link>
        </div>

        {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-display text-brown-dark">Applied Models</h1>
              <p className="mt-2 text-brown/70">View model applications by status.</p>
            </div>
            <button
              type="button"
              onClick={loadApplications}
              disabled={loading}
              className="rounded-lg border-2 border-brown-light px-4 py-2 text-sm font-semibold text-brown-dark hover:bg-pink-light/40 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 border-b border-brown-light">
            {[
              ['all', `All (${counts.all})`],
              ['pending', `Pending (${counts.pending})`],
              ['selected', `Selected (${counts.selected})`],
              ['rejected', `Rejected (${counts.rejected})`],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value as FilterStatus)}
                className={`pb-2 px-4 font-semibold transition-colors ${
                  filter === value
                    ? 'text-brown-dark border-b-2 border-brown-dark'
                    : 'text-brown/60 hover:text-brown-dark'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredApplications.length === 0 ? (
            <div className="py-12 text-center text-brown/60">
              <p>No {filter === 'all' ? '' : filter} applications found.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredApplications.map((application) => (
                <div key={application.id} className="rounded-lg border-2 border-brown-light bg-pink-light/30 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="mb-2 text-xl font-semibold text-brown-dark">
                        {application.firstName} {application.lastName}
                      </h2>
                      <div className="space-y-1 text-sm text-brown/80">
                        <p><strong>Email:</strong> {application.email}</p>
                        {application.phone && <p><strong>Phone:</strong> {application.phone}</p>}
                        {application.instagram && <p><strong>Instagram:</strong> {application.instagram}</p>}
                        <p><strong>Submitted:</strong> {new Date(application.submittedAt).toLocaleDateString()}</p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <span className={`font-semibold ${
                            application.status === 'selected'
                              ? 'text-green-600'
                              : application.status === 'rejected'
                                ? 'text-red-600'
                                : 'text-amber-600'
                          }`}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                        </p>
                        {application.modelFee?.enabled && (
                          <p>
                            <strong>Model fee:</strong>{' '}
                            {formatModelFeeAmount(application.modelFee.amount, application.modelFee.currency)} ·{' '}
                            <span className={`font-semibold ${
                              application.modelFee.paymentStatus === 'paid'
                                ? 'text-green-600'
                                : application.modelFee.paymentStatus === 'waived'
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                            }`}>
                              {application.modelFee.paymentStatus === 'paid'
                                ? 'Paid'
                                : application.modelFee.paymentStatus === 'waived'
                                  ? 'Waived'
                                  : 'Pending payment'}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {application.status !== 'pending' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(application.id, 'pending')}
                          disabled={updatingId === application.id}
                          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          Mark pending
                        </button>
                      )}
                      {application.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => openSelectionEmail(application)}
                          disabled={updatingId === application.id}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {application.status === 'selected' ? 'Resend selection email' : 'Send selection email'}
                        </button>
                      )}
                      {application.status === 'selected' && (
                        <button
                          type="button"
                          onClick={() => sendModelReviewRequest(application)}
                          disabled={requestingReviewId === application.id}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {requestingReviewId === application.id ? 'Sending review request...' : 'Send review request'}
                        </button>
                      )}
                      {application.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(application.id, 'rejected')}
                          disabled={updatingId === application.id}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-brown-light pt-4">
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                      <div>
                        <p className="mb-1 font-semibold text-brown-dark">Availability:</p>
                        <p className="whitespace-pre-wrap text-brown/80">{formatModelSlotLabel(application.availability)}</p>
                      </div>
                      <div>
                        <p className="mb-1 font-semibold text-brown-dark">Lash Experience:</p>
                        <p className="text-brown/80">Has had extensions: {application.hasLashExtensions || 'Not specified'}</p>
                        <p className="text-brown/80">Previous client: {application.hasAppointmentBefore || 'Not specified'}</p>
                        <p className="text-brown/80">Comfortable with long sessions: {application.comfortableLongSessions || 'Not specified'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="mb-1 font-semibold text-brown-dark">Allergies/Sensitivities:</p>
                        <p className="whitespace-pre-wrap text-brown/80">{application.allergies || 'None specified'}</p>
                      </div>
                      {application.customAnswers && Array.isArray(application.modelQuestions) && (
                        <div className="md:col-span-2">
                          <p className="mb-1 font-semibold text-brown-dark">Application Answers:</p>
                          <div className="space-y-1 text-brown/80">
                            {application.modelQuestions.map((question) => (
                              <p key={question.id}>
                                <strong>{question.label}:</strong> {formatAnswer(application.customAnswers?.[question.id])}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(application.consentItems) && application.consentItems.length > 0 && (
                        <div className="md:col-span-2">
                          <p className="mb-1 font-semibold text-brown-dark">Consent & Agreement:</p>
                          <div className="space-y-1 text-brown/80">
                            {application.consentItems.map((item) => (
                              <p key={item.id}>
                                <strong>{application.consentAccepted?.[item.id] ? 'Agreed' : 'Not agreed'}:</strong> {item.label}
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

      {showEmailModal && selectedApplication && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={closeSelectionEmail}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-display text-brown-dark">Send Selection Email</h2>
            <p className="mb-4 text-brown/80">
              Sending selection email to{' '}
              <strong>{selectedApplication.firstName} {selectedApplication.lastName}</strong> ({selectedApplication.email})
            </p>

            <div className="mb-4 rounded-lg border border-brown-light bg-pink-light/30 p-3">
              <p className="text-sm font-semibold text-brown-dark">Chosen model slot</p>
              <p className="text-sm text-brown/80">{formatModelSlotLabel(selectedApplication.availability)}</p>
              <p className="mt-1 text-xs text-brown/60">
                This slot is included automatically. Use the override fields only if you need a different appointment time.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-brown-dark">
                  Override Appointment Date <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(event) => setAppointmentDate(event.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-4 py-2 focus:border-brown focus:ring-2 focus:ring-brown"
                />
              </div>

              {appointmentDate && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-brown-dark">Override Time</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={appointmentTime.hours}
                      onChange={(event) => setAppointmentTime({ ...appointmentTime, hours: event.target.value })}
                      className="rounded-lg border-2 border-brown-light bg-white px-3 py-2"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                        <option key={hour} value={hour.toString()}>{hour}</option>
                      ))}
                    </select>
                    <span className="font-semibold text-brown-dark">:</span>
                    <select
                      value={appointmentTime.minutes}
                      onChange={(event) => setAppointmentTime({ ...appointmentTime, minutes: event.target.value })}
                      className="rounded-lg border-2 border-brown-light bg-white px-3 py-2"
                    >
                      {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => (
                        <option key={minute} value={minute.toString().padStart(2, '0')}>
                          {minute.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={appointmentTime.ampm}
                      onChange={(event) => setAppointmentTime({ ...appointmentTime, ampm: event.target.value })}
                      className="rounded-lg border-2 border-brown-light bg-white px-3 py-2"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-brown/60">Preview: {formatAppointmentDateTime()}</p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-brown-dark">Appointment Duration</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={appointmentDurationMinutes}
                    onChange={(event) => setAppointmentDurationMinutes(Math.max(Number(event.target.value) || 75, 15))}
                    className="w-32 rounded-lg border-2 border-brown-light bg-white px-4 py-2"
                  />
                  <span className="text-sm text-brown/80">minutes</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-brown-dark">Additional Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(event) => setEmailMessage(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-4 py-2 focus:border-brown focus:ring-2 focus:ring-brown"
                  placeholder="Add any extra note for this model..."
                />
                <p className="mt-1 text-xs text-brown/60">
                  The email automatically includes location, preparation guidelines, and the model fee payment link if enabled.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={sendSelectionEmail}
                disabled={sendingEmail}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
              <button
                type="button"
                onClick={closeSelectionEmail}
                className="rounded-lg border-2 border-brown-light px-4 py-2 font-semibold text-brown-dark transition-colors hover:bg-brown-light"
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
