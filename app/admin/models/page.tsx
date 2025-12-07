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
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminModels() {
  const router = useRouter()
  const [applications, setApplications] = useState<ModelApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<ModelApplication | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState({ hours: '10', minutes: '00', ampm: 'AM' })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'selected' | 'rejected'>('all')

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
      const response = await authorizedFetch('/api/admin/models')
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (applicationId: string, status: 'pending' | 'selected' | 'rejected') => {
    try {
      const response = await authorizedFetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', applicationId, status }),
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
                            onClick={() => updateStatus(app.id, 'rejected')}
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
                        <p className="text-brown/80 whitespace-pre-wrap">{app.availability || 'Not specified'}</p>
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
    </div>
  )
}

