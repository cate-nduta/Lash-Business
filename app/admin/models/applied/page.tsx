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
    () => applications.filter((application) => filter === 'all' || application.status === filter),
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
                      {application.status !== 'selected' && (
                        <Link
                          href="/admin/models"
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                        >
                          Select from model panel
                        </Link>
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
    </div>
  )
}
