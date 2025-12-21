'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DashboardData {
  user: {
    id: string
    email: string
    name: string
    phone: string
    birthday?: string
    createdAt: string
  }
  lastAppointmentDate?: string
  recommendedRefillDate?: string
  preferences: any
  allergies: any
  aftercare: any
  lashHistory?: Array<{
    appointmentId: string
    date: string
    service: string
    serviceType: string
    lashTech: string
    notes?: string
    retentionDays?: number
    retentionNotes?: string
    retentionScore?: 1 | 2 | 3
    retentionReason?: string
  }>
  lashHistoryCount: number
  lashMapsCount: number
  show7DayWarning?: boolean
  daysRemaining?: number | null
  retentionStats?: {
    averageScore: number | null
    totalScored: number
    excellentCount: number
    goodCount: number
    poorCount: number
  }
}

export default function LashHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/client/auth/me', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (response.status === 401) {
        router.push('/account/login')
        return
      }
      if (!response.ok) {
        throw new Error('Failed to load history')
      }
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err: any) {
      setError(err.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-dark mx-auto mb-4"></div>
          <p className="text-brown/70">Loading your lash history...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load history'}</p>
          <Link
            href="/account/dashboard"
            className="text-brown-dark hover:underline"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const sortedHistory = data.lashHistory
    ? [...data.lashHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-brown/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display text-brown-dark">Your Lash History</h1>
              <p className="text-sm text-brown/70">Complete appointment history and retention tracking</p>
            </div>
            <Link
              href="/account/dashboard"
              className="px-4 py-2 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Retention Stats Summary */}
        {data.retentionStats && data.retentionStats.totalScored > 0 && (
          <div className="mb-8 bg-gradient-to-br from-pink-50 via-amber-50 to-pink-50 rounded-xl p-6 border-2 border-pink-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏆</span>
              <h2 className="text-2xl font-display text-brown-dark">Your Retention Score</h2>
            </div>
            
            {data.retentionStats.averageScore !== null && (
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className="text-4xl font-bold text-brown-dark">
                    {data.retentionStats.averageScore.toFixed(1)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-white/60 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            data.retentionStats.averageScore >= 2.5
                              ? 'bg-gradient-to-r from-green-400 to-green-600'
                              : data.retentionStats.averageScore >= 1.5
                              ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                              : 'bg-gradient-to-r from-red-400 to-red-600'
                          }`}
                          style={{ width: `${(data.retentionStats.averageScore / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-brown/70">
                      {data.retentionStats.averageScore >= 2.5
                        ? '🌟 Excellent! Keep up the amazing aftercare!'
                        : data.retentionStats.averageScore >= 1.5
                        ? '👍 Good! You\'re on the right track!'
                        : '💪 You can improve! Check tips below.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/80 rounded-lg p-4 text-center border border-green-200">
                <div className="text-2xl mb-1">✨</div>
                <div className="text-xl font-bold text-green-700">{data.retentionStats.excellentCount}</div>
                <div className="text-xs text-brown/70">Excellent</div>
              </div>
              <div className="bg-white/80 rounded-lg p-4 text-center border border-yellow-200">
                <div className="text-2xl mb-1">👍</div>
                <div className="text-xl font-bold text-yellow-700">{data.retentionStats.goodCount}</div>
                <div className="text-xs text-brown/70">Good</div>
              </div>
              <div className="bg-white/80 rounded-lg p-4 text-center border border-red-200">
                <div className="text-2xl mb-1">💪</div>
                <div className="text-xl font-bold text-red-700">{data.retentionStats.poorCount}</div>
                <div className="text-xs text-brown/70">Needs Work</div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {sortedHistory.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 border border-brown/10 shadow-sm text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-display text-brown-dark mb-2">No Appointment History Yet</h3>
            <p className="text-brown/70 mb-6">
              Your lash history will appear here after your appointments.
            </p>
            <Link
              href="/booking"
              className="inline-block px-6 py-3 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors font-medium"
            >
              Book Your First Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedHistory.map((appointment, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-brown-dark">{appointment.service}</h3>
                      <span className="px-3 py-1 bg-brown-light text-brown-dark rounded-full text-xs font-medium capitalize">
                        {appointment.serviceType}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <span className="text-sm text-brown/70">Date:</span>
                        <p className="text-brown-dark font-medium">{formatDate(appointment.date)}</p>
                      </div>
                      {appointment.lashTech && (
                        <div>
                          <span className="text-sm text-brown/70">Technician:</span>
                          <p className="text-brown-dark font-medium">{appointment.lashTech}</p>
                        </div>
                      )}
                      {appointment.retentionDays && (
                        <div>
                          <span className="text-sm text-brown/70">Retention:</span>
                          <p className="text-brown-dark font-medium">
                            {appointment.retentionDays} days
                            {appointment.retentionNotes && (
                              <span className="text-xs text-brown/60 ml-2">
                                ({appointment.retentionNotes})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="mb-4">
                        <span className="text-sm text-brown/70">Notes:</span>
                        <p className="text-brown-dark mt-1">{appointment.notes}</p>
                      </div>
                    )}

                    {/* Retention Score Display */}
                    {appointment.retentionScore && (
                      <div className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-pink-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-medium text-brown-dark">Retention Score:</span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              appointment.retentionScore === 3
                                ? 'bg-green-100 text-green-700'
                                : appointment.retentionScore === 2
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {appointment.retentionScore === 3
                              ? '✨ Excellent'
                              : appointment.retentionScore === 2
                              ? '👍 Good'
                              : '💪 Poor'}
                          </span>
                        </div>
                        {appointment.retentionReason && (
                          <p className="text-sm text-brown/80 mt-2">{appointment.retentionReason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {sortedHistory.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
              <div className="text-sm text-brown/70 mb-1">Total Appointments</div>
              <div className="text-3xl font-display text-brown-dark">
                {data.lashHistoryCount}
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
              <div className="text-sm text-brown/70 mb-1">Last Appointment</div>
              <div className="text-lg font-display text-brown-dark">
                {formatDate(data.lastAppointmentDate)}
              </div>
              {data.lastAppointmentDate && (
                <div className="text-xs text-brown/60 mt-1">
                  {Math.floor(
                    (new Date().getTime() - new Date(data.lastAppointmentDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  days ago
                </div>
              )}
            </div>
            {data.retentionStats && data.retentionStats.totalScored > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
                <div className="text-sm text-brown/70 mb-1">Scored Appointments</div>
                <div className="text-3xl font-display text-brown-dark">
                  {data.retentionStats.totalScored}
                </div>
                <div className="text-xs text-brown/60 mt-1">with retention scores</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}






