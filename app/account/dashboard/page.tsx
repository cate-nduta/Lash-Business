'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LashMapEditor, { type LashMapDrawingData } from '@/components/LashMapEditor'

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

interface LashMap {
  appointmentId: string
  date: string
  mapData: string
  imageUrl?: string
  notes?: string
}

export default function ClientDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [lashMaps, setLashMaps] = useState<LashMap[]>([])
  const [loadingMaps, setLoadingMaps] = useState(true)
  const [eyepatchImageUrl, setEyepatchImageUrl] = useState<string | undefined>(undefined)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    loadDashboard()
    loadLashMaps()
    
    // Fetch eyepatch image URL from settings
    if (typeof window !== 'undefined') {
      const cachedUrl = sessionStorage.getItem('eyepatchImageUrl')
      const cachedTime = sessionStorage.getItem('eyepatchImageUrlTime')
      const now = Date.now()
      
      if (cachedUrl && cachedTime && (now - parseInt(cachedTime)) < 300000) {
        setEyepatchImageUrl(cachedUrl)
      } else {
        fetch('/api/settings', { cache: 'default' })
          .then((res) => res.json())
          .then((data) => {
            if (data.business?.eyepatchImageUrl) {
              setEyepatchImageUrl(data.business.eyepatchImageUrl)
              sessionStorage.setItem('eyepatchImageUrl', data.business.eyepatchImageUrl)
              sessionStorage.setItem('eyepatchImageUrlTime', Date.now().toString())
            }
          })
          .catch(() => {})
      }
    }
  }, [])

  const loadDashboard = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const response = await fetch(`/api/client/auth/me?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (response.status === 401) {
        router.push('/account/login')
        return
      }
      if (!response.ok) {
        throw new Error('Failed to load dashboard')
      }
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadLashMaps = async () => {
    try {
      const response = await fetch('/api/client/maps')
      if (response.status === 401) {
        setLashMaps([])
        return
      }
      if (!response.ok) {
        throw new Error('Failed to load lash maps')
      }
      const mapsData = await response.json()
      setLashMaps(mapsData.lashMaps || [])
    } catch (err: any) {
      console.error('Error loading lash maps:', err)
      setLashMaps([])
    } finally {
      setLoadingMaps(false)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Memoize sorted and parsed lash maps - must be at top level (not conditional)
  const sortedLashMaps = useMemo(() => {
    return lashMaps
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((map) => {
        let parsedData: LashMapDrawingData | null = null
        try {
          parsedData = JSON.parse(map.mapData || '{}')
        } catch {
          // Invalid JSON, ignore
        }
        return { map, parsedData }
      })
  }, [lashMaps])

  const handleLogout = async () => {
    await fetch('/api/client/auth/logout', { method: 'POST' })
    router.push('/account/login')
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/client/auth/delete', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Redirect to home page after successful deletion
      router.push('/')
    } catch (err: any) {
      alert(err.message || 'Failed to delete account. Please try again.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const calculateDaysUntilRefill = (refillDate?: string): number | null => {
    if (!refillDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const refill = new Date(refillDate)
    refill.setHours(0, 0, 0, 0)
    const diffTime = refill.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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
          <p className="text-brown/70">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={() => router.push('/account/login')}
            className="text-brown-dark hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    )
  }

  const daysUntilRefill = calculateDaysUntilRefill(data.recommendedRefillDate)
  const isRefillDue = daysUntilRefill !== null && daysUntilRefill <= 0
  const isRefillSoon = daysUntilRefill !== null && daysUntilRefill > 0 && daysUntilRefill <= 7

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-brown/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display text-brown-dark">Your LashDiary</h1>
              <p className="text-sm text-brown/70">Welcome back, {data.user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadDashboard}
                disabled={loading}
                className="px-4 py-2 bg-brown-light text-brown-dark rounded-lg hover:bg-brown-light/80 transition-colors text-sm font-medium disabled:opacity-50"
                title="Refresh dashboard data"
              >
                🔄 Refresh
              </button>
              <Link
                href="/booking"
                className="px-4 py-2 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium"
              >
                Book Appointment
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 7-Day Booking Reminder Banner */}
        {data.show7DayWarning && data.daysRemaining !== null && (
          <div className="mb-8 rounded-xl p-6 bg-gradient-to-r from-pink-50 to-amber-50 border-2 border-pink-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">✨</span>
                  <h3 className="text-lg font-semibold text-brown-dark">
                    Ready to Book Your First Appointment?
                  </h3>
                </div>
                <p className="text-brown/80 mb-2">
                  Welcome to LashDiary! We're excited to have you here. Please book your first appointment within the next <strong>{data.daysRemaining} day{data.daysRemaining !== 1 ? 's' : ''}</strong> to keep your account active.
                </p>
                <p className="text-sm text-brown/70">
                  Please note: If you don't book an appointment within 7 days, your account will be automatically deleted.
                </p>
              </div>
              <Link
                href="/booking"
                className="px-6 py-2 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors font-medium whitespace-nowrap shadow-sm"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        )}

        {/* Refill Alert */}
        {data.recommendedRefillDate && (
          <div
            className={`mb-8 rounded-xl p-6 ${
              isRefillDue
                ? 'bg-red-50 border-2 border-red-200'
                : isRefillSoon
                ? 'bg-amber-50 border-2 border-amber-200'
                : 'bg-green-50 border-2 border-green-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-brown-dark mb-2">
                  {isRefillDue
                    ? 'Time for Your Refill'
                    : isRefillSoon
                    ? 'Refill Coming Soon'
                    : 'Next Refill Scheduled'}
                </h3>
                <p className="text-brown/80 mb-1">
                  Recommended refill date: <strong>{formatDate(data.recommendedRefillDate)}</strong>
                </p>
                {daysUntilRefill !== null && (
                  <p className="text-sm text-brown/70">
                    {isRefillDue
                      ? 'Your lashes are ready for a refill to maintain optimal retention.'
                      : isRefillSoon
                      ? `${daysUntilRefill} day${daysUntilRefill !== 1 ? 's' : ''} until recommended refill`
                      : `${daysUntilRefill} day${daysUntilRefill !== 1 ? 's' : ''} until recommended refill`}
                  </p>
                )}
              </div>
              <Link
                href="/booking"
                className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium whitespace-nowrap"
              >
                Book Refill
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <div className="text-sm text-brown/70 mb-1">Last Appointment</div>
            <div className="text-2xl font-display text-brown-dark mb-1">
              {formatDate(data.lastAppointmentDate)}
            </div>
            {data.lastAppointmentDate && (
              <div className="text-xs text-brown/60">
                {Math.floor(
                  (new Date().getTime() - new Date(data.lastAppointmentDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days ago
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <div className="text-sm text-brown/70 mb-1">Total Appointments</div>
            <div className="text-2xl font-display text-brown-dark mb-1">
              {data.lashHistoryCount}
            </div>
            <div className="text-xs text-brown/60">Lash history records</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <div className="text-sm text-brown/70 mb-1">Lash Maps</div>
            <div className="text-2xl font-display text-brown-dark mb-1">
              {data.lashMapsCount}
            </div>
            <div className="text-xs text-brown/60">Saved mapping styles</div>
          </div>
        </div>

        {/* Retention Score Section */}
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

            <div className="grid grid-cols-3 gap-4 mb-6">
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

            {/* Recent Retention Scores */}
            {data.lashHistory && data.lashHistory.filter(h => h.retentionScore).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-brown-dark mb-3">Recent Scores</h3>
                <div className="space-y-2">
                  {data.lashHistory
                    .filter(h => h.retentionScore)
                    .slice(0, 5)
                    .map((history, idx) => (
                      <div
                        key={idx}
                        className="bg-white/80 rounded-lg p-3 border border-brown/10 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-brown-dark">
                              {formatDate(history.date)}
                            </span>
                            <span className="text-sm font-semibold text-brown-dark">
                              • {history.service}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                history.retentionScore === 3
                                  ? 'bg-green-100 text-green-700'
                                  : history.retentionScore === 2
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {history.retentionScore === 3
                                ? '✨ Excellent'
                                : history.retentionScore === 2
                                ? '👍 Good'
                                : '💪 Needs Work'}
                            </span>
                          </div>
                          {history.retentionReason && (
                            <p className="text-xs text-brown/70">{history.retentionReason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lash Preferences */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <h2 className="text-xl font-display text-brown-dark mb-4">Lash Specifics</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-brown/70">Preferred Curl:</span>
                <span className="ml-2 text-brown-dark font-medium">
                  {data.preferences?.preferredCurl || 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-sm text-brown/70">Density Level:</span>
                <span className="ml-2 text-brown-dark font-medium">
                  {data.preferences?.densityLevel
                    ? data.preferences.densityLevel.charAt(0).toUpperCase() +
                      data.preferences.densityLevel.slice(1)
                    : 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-sm text-brown/70">Eye Shape:</span>
                <span className="ml-2 text-brown-dark font-medium">
                  {data.preferences?.eyeShape || 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-sm text-brown/70">Mapping Style:</span>
                <span className="ml-2 text-brown-dark font-medium">
                  {data.preferences?.mappingStyle || 'Not set'}
                </span>
              </div>
              {data.preferences?.signatureLook && (
                <div>
                  <span className="text-sm text-brown/70">Signature Look:</span>
                  <p className="mt-1 text-brown-dark">{data.preferences.signatureLook}</p>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-brown/60">
              The lash specifics are updated by your lash technician during appointments
            </p>
          </div>

          {/* Allergy & Sensitivity Alerts */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <h2 className="text-xl font-display text-brown-dark mb-4">Allergy & Sensitivity</h2>
            {data.allergies?.hasReaction ? (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-red-800 mb-2">Previous Reaction</div>
                  {data.allergies.reactionDetails && (
                    <p className="text-sm text-red-700">{data.allergies.reactionDetails}</p>
                  )}
                  {data.allergies.lastReactionDate && (
                    <p className="text-xs text-red-600 mt-2">
                      Last reaction: {formatDate(data.allergies.lastReactionDate)}
                    </p>
                  )}
                </div>
                {data.allergies.glueSensitivity && (
                  <div>
                    <span className="text-sm text-brown/70">Glue Sensitivity:</span>
                    <span className="ml-2 text-brown-dark">{data.allergies.glueSensitivity}</span>
                  </div>
                )}
                {data.allergies.avoidNextSession && data.allergies.avoidNextSession.length > 0 && (
                  <div>
                    <span className="text-sm text-brown/70">Avoid Next Session:</span>
                    <ul className="mt-1 text-sm text-brown-dark list-disc list-inside">
                      {data.allergies.avoidNextSession.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-brown/70">
                No known allergies or sensitivities recorded
              </div>
            )}
          </div>

          {/* Aftercare Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <h2 className="text-xl font-display text-brown-dark mb-4">Aftercare Profile</h2>
            <p className="text-sm text-brown/70 mb-4 italic">
              This section tracks your aftercare habits and patterns to help us provide personalized recommendations for maintaining your lash extensions and achieving optimal retention.
            </p>
            <div className="space-y-3">
              {data.aftercare?.lashSheddingPattern && (
                <div>
                  <span className="text-sm text-brown/70">Shedding Pattern:</span>
                  <span className="ml-2 text-brown-dark font-medium capitalize">
                    {data.aftercare.lashSheddingPattern}
                  </span>
                </div>
              )}
              {data.aftercare?.sleepPosition && (
                <div>
                  <span className="text-sm text-brown/70">Sleep Position:</span>
                  <span className="ml-2 text-brown-dark font-medium capitalize">
                    {data.aftercare.sleepPosition}
                  </span>
                </div>
              )}
              {data.aftercare?.oilUse && (
                <div>
                  <span className="text-sm text-brown/70">Oil Use:</span>
                  <span className="ml-2 text-brown-dark font-medium capitalize">
                    {data.aftercare.oilUse}
                  </span>
                </div>
              )}
              {data.aftercare?.makeupHabits && (
                <div>
                  <span className="text-sm text-brown/70">Makeup Habits:</span>
                  <span className="ml-2 text-brown-dark font-medium capitalize">
                    {data.aftercare.makeupHabits}
                  </span>
                </div>
              )}
              {data.aftercare?.notes && (
                <div className="mt-3">
                  <span className="text-sm text-brown/70">Notes:</span>
                  <p className="mt-1 text-sm text-brown-dark">{data.aftercare.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <h2 className="text-xl font-display text-brown-dark mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/booking"
                className="block w-full px-4 py-3 bg-brown-dark !text-white rounded-lg hover:bg-brown transition-colors text-center font-medium"
              >
                Book New Appointment
              </Link>
            </div>
          </div>

          {/* Lash Maps */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-display text-brown-dark mb-4">Your Lash Maps</h2>
            {loadingMaps ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-dark mx-auto mb-4"></div>
                <p className="text-brown/70">Loading lash maps...</p>
              </div>
            ) : lashMaps.length === 0 ? (
              <div className="text-center py-8 text-brown/70">
                <div className="text-4xl mb-4">👁️</div>
                <p className="mb-2">No lash maps yet.</p>
                <p className="text-sm">Your lash maps will appear here after your appointments.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedLashMaps.map(({ map, parsedData }, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-brown/10"
                  >
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-display text-brown-dark">
                          {formatDate(map.date)}
                        </h3>
                        {map.appointmentId && (
                          <span className="text-sm text-brown/70">
                            Appointment: {map.appointmentId}
                          </span>
                        )}
                      </div>
                      {map.notes && (
                        <p className="text-sm text-brown/80 mt-2">{map.notes}</p>
                      )}
                    </div>

                    {parsedData ? (
                      <div className="bg-white rounded-lg p-4 border border-brown/10">
                        {isMounted && (
                          <LashMapEditor
                            initialData={parsedData}
                            readOnly={true}
                            showLabels={true}
                            eyepatchImageUrl={eyepatchImageUrl}
                            backgroundImageUrl={parsedData?.backgroundImageUrl || map?.imageUrl || undefined}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-brown/70 text-sm">
                        <p>No drawing data available for this map.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Settings */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
            <h2 className="text-xl font-display text-brown-dark mb-4">Account Settings</h2>
            <div className="space-y-4">
              <div className="pt-4 border-t border-brown/20">
                <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-brown/70 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-700 font-medium">
                      Are you sure you want to delete your account? This action is permanent and cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

