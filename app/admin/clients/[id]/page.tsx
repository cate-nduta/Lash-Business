'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import LashMapEditor, { type LashMapDrawingData } from '@/components/LashMapEditor'

interface ClientData {
  profile: {
    id: string
    email: string
    name: string
    phone: string
    birthday?: string
    createdAt: string
    lastLoginAt?: string
  }
  lashHistory: Array<{
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
  preferences: {
    preferredCurl: string | null
    lengthRange: { min: number; max: number } | null
    densityLevel: string | null
    eyeShape: string | null
    mappingStyle: string | null
    signatureLook: string | null
  }
  allergies: {
    hasReaction: boolean
    reactionDetails?: string
    glueSensitivity?: string
    patchesUsed?: string[]
    avoidNextSession?: string[]
    lastReactionDate?: string
  }
  aftercare: {
    aftercareIssues?: string[]
    lashSheddingPattern?: string
    sleepPosition?: string
    oilUse?: string
    makeupHabits?: string
    notes?: string
  }
  lashMaps: Array<{
    appointmentId: string
    date: string
    mapData: string
    imageUrl?: string
    notes?: string
  }>
  lastAppointmentDate?: string
  recommendedRefillDate?: string
  retentionCycles: Array<{
    appointmentId: string
    startDate: string
    endDate?: string
    retentionDays?: number
    retentionQuality: string
    notes?: string
  }>
}

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'preferences' | 'allergies' | 'aftercare' | 'history' | 'lashMaps'>('overview')

  useEffect(() => {
    if (clientId) {
      loadClientData()
    }
  }, [clientId])

  const loadClientData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/clients/${clientId}`)
      if (!response.ok) {
        throw new Error('Failed to load client data')
      }
      const data = await response.json()
      setClientData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (section: 'preferences' | 'allergies' | 'aftercare', data: any) => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [section]: data }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save')
      }

      setSuccess('Changes saved successfully!')
      await loadClientData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
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
          <p className="text-brown/70">Loading client data...</p>
        </div>
      </div>
    )
  }

  if (error && !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin/clients" className="text-brown-dark hover:underline">
            ← Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  if (!clientData || !clientData.profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Client data not found or incomplete</p>
          <Link href="/admin/clients" className="text-brown-dark hover:underline">
            ← Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
            <Link
              href="/admin/clients"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Clients
            </Link>
          </div>
          <h1 className="text-3xl font-display text-brown-dark mb-2">{clientData.profile?.name || 'Client'}</h1>
          <p className="text-brown/70">Client Profile Management</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-brown/20">
          <div className="flex gap-4 flex-wrap">
            {(['overview', 'preferences', 'allergies', 'aftercare', 'history', 'lashMaps'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-brown-dark border-b-2 border-brown-dark'
                    : 'text-brown/70 hover:text-brown-dark'
                }`}
              >
                {tab === 'lashMaps' ? 'Lash Maps' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
              <h2 className="text-xl font-display text-brown-dark mb-4">Contact Information</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const birthday = formData.get('birthday') as string
                  try {
                    setSaving(true)
                    const response = await fetch(`/api/admin/clients/${clientId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ birthday: birthday || undefined }),
                    })
                    if (!response.ok) throw new Error('Failed to save')
                    setSuccess('Birthday updated successfully!')
                    await loadClientData()
                    setTimeout(() => setSuccess(''), 3000)
                  } catch (err: any) {
                    setError(err.message || 'Failed to save birthday')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-brown/70">Email:</span>
                    <p className="text-brown-dark font-medium">{clientData.profile?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-brown/70">Phone:</span>
                    <p className="text-brown-dark font-medium">{clientData.profile?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Birthday</label>
                    <input
                      type="date"
                      name="birthday"
                      defaultValue={clientData.profile?.birthday || ''}
                      className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                    />
                    <p className="text-xs text-brown/60 mt-1">
                      Set birthday to enable automatic birthday discount emails (12% off, valid 7 days)
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-brown/70">Member Since:</span>
                    <p className="text-brown-dark font-medium">{formatDate(clientData.profile?.createdAt)}</p>
                  </div>
                  {clientData.profile?.lastLoginAt && (
                    <div>
                      <span className="text-sm text-brown/70">Last Login:</span>
                      <p className="text-brown-dark font-medium">{formatDate(clientData.profile.lastLoginAt)}</p>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Birthday'}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
                <div className="text-sm text-brown/70 mb-1">Last Appointment</div>
                <div className="text-2xl font-display text-brown-dark">
                  {formatDate(clientData.lastAppointmentDate)}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
                <div className="text-sm text-brown/70 mb-1">Total Appointments</div>
                <div className="text-2xl font-display text-brown-dark">
                  {clientData.lashHistory.length}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
                <div className="text-sm text-brown/70 mb-1">Lash Maps</div>
                <div className="text-2xl font-display text-brown-dark">
                  {clientData.lashMaps.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <PreferencesEditor
            preferences={clientData.preferences}
            onSave={(data) => handleSave('preferences', data)}
            saving={saving}
          />
        )}

        {/* Allergies Tab */}
        {activeTab === 'allergies' && (
          <AllergiesEditor
            allergies={clientData.allergies}
            onSave={(data) => handleSave('allergies', data)}
            saving={saving}
          />
        )}

        {/* Aftercare Tab */}
        {activeTab === 'aftercare' && (
          <AftercareEditor
            aftercare={clientData.aftercare}
            onSave={(data) => handleSave('aftercare', data)}
            saving={saving}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <HistoryEditor
            clientId={clientId}
            lashHistory={clientData.lashHistory}
            onUpdate={loadClientData}
            saving={saving}
          />
        )}

        {/* Lash Maps Tab */}
        {activeTab === 'lashMaps' && (
          <LashMapsManager
            clientId={clientId}
            lashMaps={clientData.lashMaps}
            onUpdate={loadClientData}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

// Preferences Editor Component
function PreferencesEditor({
  preferences,
  onSave,
  saving,
}: {
  preferences: ClientData['preferences']
  onSave: (data: any) => void
  saving: boolean
}) {
  const [formData, setFormData] = useState(preferences)

  useEffect(() => {
    setFormData(preferences)
  }, [preferences])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
      <h2 className="text-xl font-display text-brown-dark mb-4">Lash Preferences</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Preferred Curl</label>
          <select
            value={formData.preferredCurl || ''}
            onChange={(e) => setFormData({ ...formData, preferredCurl: e.target.value || null })}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          >
            <option value="">Not set</option>
            <option value="J">J</option>
            <option value="C">C</option>
            <option value="CC">CC</option>
            <option value="D">D</option>
            <option value="DD">DD</option>
            <option value="L+">L+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Density Level</label>
          <select
            value={formData.densityLevel || ''}
            onChange={(e) => setFormData({ ...formData, densityLevel: e.target.value || null })}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          >
            <option value="">Not set</option>
            <option value="natural">Natural</option>
            <option value="classic">Classic</option>
            <option value="hybrid">Hybrid</option>
            <option value="volume">Volume</option>
            <option value="mega-volume">Mega Volume</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Eye Shape</label>
          <input
            type="text"
            value={formData.eyeShape || ''}
            onChange={(e) => setFormData({ ...formData, eyeShape: e.target.value || null })}
            placeholder="e.g., Almond, Round, Hooded, Monolid, Deep Set"
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Mapping Style</label>
          <input
            type="text"
            value={formData.mappingStyle || ''}
            onChange={(e) => setFormData({ ...formData, mappingStyle: e.target.value || null })}
            placeholder="e.g., Cat Eye, Doll Eye, Wispy"
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Signature Look</label>
          <textarea
            value={formData.signatureLook || ''}
            onChange={(e) => setFormData({ ...formData, signatureLook: e.target.value || null })}
            placeholder="Describe their signature look..."
            rows={3}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Allergies Editor Component
function AllergiesEditor({
  allergies,
  onSave,
  saving,
}: {
  allergies: ClientData['allergies']
  onSave: (data: any) => void
  saving: boolean
}) {
  const [formData, setFormData] = useState(allergies)

  useEffect(() => {
    setFormData(allergies)
  }, [allergies])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
      <h2 className="text-xl font-display text-brown-dark mb-4">Allergy & Sensitivity Information</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.hasReaction}
              onChange={(e) => setFormData({ ...formData, hasReaction: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-brown-dark">Has had a reaction</span>
          </label>
        </div>

        {formData.hasReaction && (
          <>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">Reaction Details</label>
              <textarea
                value={formData.reactionDetails || ''}
                onChange={(e) => setFormData({ ...formData, reactionDetails: e.target.value })}
                placeholder="Describe the reaction..."
                rows={3}
                className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">Last Reaction Date</label>
              <input
                type="date"
                value={formData.lastReactionDate || ''}
                onChange={(e) => setFormData({ ...formData, lastReactionDate: e.target.value })}
                className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Glue Sensitivity</label>
          <input
            type="text"
            value={formData.glueSensitivity || ''}
            onChange={(e) => setFormData({ ...formData, glueSensitivity: e.target.value })}
            placeholder="e.g., Sensitive to cyanoacrylate"
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">What to Avoid Next Session</label>
          <textarea
            value={formData.avoidNextSession?.join(', ') || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                avoidNextSession: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [],
              })
            }
            placeholder="Comma-separated list of items to avoid"
            rows={2}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Allergy Information'}
        </button>
      </form>
    </div>
  )
}

// Aftercare Editor Component
function AftercareEditor({
  aftercare,
  onSave,
  saving,
}: {
  aftercare: ClientData['aftercare']
  onSave: (data: any) => void
  saving: boolean
}) {
  const [formData, setFormData] = useState(aftercare)

  useEffect(() => {
    setFormData(aftercare)
  }, [aftercare])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
      <h2 className="text-xl font-display text-brown-dark mb-4">Aftercare Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Lash Shedding Pattern</label>
          <select
            value={formData.lashSheddingPattern || ''}
            onChange={(e) => setFormData({ ...formData, lashSheddingPattern: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          >
            <option value="">Not set</option>
            <option value="normal">Normal</option>
            <option value="excessive">Excessive</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Sleep Position</label>
          <select
            value={formData.sleepPosition || ''}
            onChange={(e) => setFormData({ ...formData, sleepPosition: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          >
            <option value="">Not set</option>
            <option value="back">Back</option>
            <option value="side">Side</option>
            <option value="stomach">Stomach</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Oil Use</label>
          <select
            value={formData.oilUse || ''}
            onChange={(e) => setFormData({ ...formData, oilUse: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          >
            <option value="">Not set</option>
            <option value="frequent">Frequent</option>
            <option value="occasional">Occasional</option>
            <option value="rare">Rare</option>
            <option value="none">None</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Makeup Habits</label>
          <select
            value={formData.makeupHabits || ''}
            onChange={(e) => setFormData({ ...formData, makeupHabits: e.target.value || undefined })}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          >
            <option value="">Not set</option>
            <option value="daily">Daily</option>
            <option value="occasional">Occasional</option>
            <option value="rare">Rare</option>
            <option value="none">None</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown-dark mb-2">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional aftercare notes..."
            rows={4}
            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Aftercare Information'}
        </button>
      </form>
    </div>
  )
}

// Lash Maps Manager Component
function LashMapsManager({
  clientId,
  lashMaps,
  onUpdate,
  saving,
}: {
  clientId: string
  lashMaps: Array<{
    id?: string
    appointmentId: string
    date: string
    mapData: string
    imageUrl?: string
    notes?: string
  }>
  onUpdate: () => void
  saving: boolean
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMap, setEditingMap] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    appointmentId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [drawingData, setDrawingData] = useState<LashMapDrawingData | null>(null)
  const [savingMap, setSavingMap] = useState(false)
  const [eyepatchImageUrl, setEyepatchImageUrl] = useState<string | undefined>(undefined)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>(undefined)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    // Fetch eyepatch image URL from settings - cache for 5 minutes
    if (typeof window !== 'undefined') {
      const cachedUrl = sessionStorage.getItem('eyepatchImageUrl')
      const cachedTime = sessionStorage.getItem('eyepatchImageUrlTime')
      const now = Date.now()
      
      if (cachedUrl && cachedTime && (now - parseInt(cachedTime)) < 300000) {
        // Use cached value if less than 5 minutes old
        setEyepatchImageUrl(cachedUrl)
        return
      }
    }
    
    fetch('/api/admin/settings', { cache: 'default' })
      .then((res) => res.json())
      .then((data) => {
        if (data.business?.eyepatchImageUrl) {
          setEyepatchImageUrl(data.business.eyepatchImageUrl)
          // Cache for 5 minutes
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('eyepatchImageUrl', data.business.eyepatchImageUrl)
            sessionStorage.setItem('eyepatchImageUrlTime', Date.now().toString())
          }
        }
      })
      .catch(() => {}) // Silently fail
  }, [])

  const handleSaveMap = async () => {
    try {
      setSavingMap(true)
      
      // Ensure backgroundImageUrl is included in the drawing data
      const finalDrawingData = drawingData ? {
        ...drawingData,
        backgroundImageUrl: backgroundImageUrl || drawingData.backgroundImageUrl,
      } : null
      
      const mapData = finalDrawingData ? JSON.stringify(finalDrawingData) : ''

      // Ensure date is in proper format
      let mapDate = formData.date
      if (mapDate && !mapDate.includes('T')) {
        // Convert YYYY-MM-DD to ISO string
        mapDate = new Date(mapDate + 'T00:00:00').toISOString()
      } else if (!mapDate) {
        mapDate = new Date().toISOString()
      }

      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lashMap: {
            appointmentId: formData.appointmentId || `appt-${Date.now()}`,
            date: mapDate,
            mapData,
            imageUrl: backgroundImageUrl || undefined,
            notes: formData.notes || undefined,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to save lash map')
      }

      setShowAddForm(false)
      setEditingMap(null)
      setFormData({
        appointmentId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      })
      setDrawingData(null)
      setBackgroundImageUrl(undefined)
      onUpdate()
    } catch (err: any) {
      alert(err.message || 'Failed to save lash map')
    } finally {
      setSavingMap(false)
    }
  }

  const handleEdit = (map: typeof lashMaps[0], index: number) => {
    setEditingMap(index)
    setFormData({
      appointmentId: map.appointmentId,
      date: map.date.split('T')[0],
      notes: map.notes || '',
    })
    try {
      const parsed = JSON.parse(map.mapData || '{}')
      setDrawingData(parsed)
      setBackgroundImageUrl(parsed.backgroundImageUrl || map.imageUrl)
    } catch {
      setDrawingData(null)
      setBackgroundImageUrl(map.imageUrl)
    }
    setShowAddForm(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/admin/clients/upload-lash-map-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setBackgroundImageUrl(data.imageUrl)
      if (drawingData) {
        const updatedData = {
          ...drawingData,
          backgroundImageUrl: data.imageUrl,
        }
        setDrawingData(updatedData)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

  const handleDelete = async (map: { id?: string; appointmentId: string }) => {
    if (!confirm('Are you sure you want to delete this lash map? This action cannot be undone.')) {
      return
    }

    try {
      setSavingMap(true)
      // Use id if available (new maps), otherwise fall back to appointmentId (old maps)
      const deleteId = map.id || map.appointmentId
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteLashMap: deleteId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to delete lash map')
      }

      onUpdate()
    } catch (err: any) {
      alert(err.message || 'Failed to delete lash map')
    } finally {
      setSavingMap(false)
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display text-brown-dark">Lash Maps</h2>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true)
            setEditingMap(null)
            setFormData({
              appointmentId: '',
              date: new Date().toISOString().split('T')[0],
              notes: '',
            })
            setDrawingData(null)
            setBackgroundImageUrl(undefined)
          }}
          className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium"
        >
          + Add New Lash Map
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
          <h3 className="text-lg font-display text-brown-dark mb-4">
            {editingMap !== null ? 'Edit Lash Map' : 'Create New Lash Map'}
          </h3>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Appointment ID
              </label>
              <input
                type="text"
                value={formData.appointmentId}
                onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
                placeholder="e.g., appt-123456"
                className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this lash map..."
                rows={3}
                className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Upload Client Eye Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown text-sm"
              />
              {uploadingImage && (
                <p className="text-xs text-brown/70 mt-1">Uploading image...</p>
              )}
              {backgroundImageUrl && (
                <div className="mt-2">
                  <p className="text-xs text-brown/70 mb-1">Current image:</p>
                  <img
                    src={backgroundImageUrl}
                    alt="Client eyes"
                    className="max-w-xs max-h-32 object-contain border border-brown/20 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBackgroundImageUrl(undefined)
                      if (drawingData) {
                        const updatedData = {
                          ...drawingData,
                          backgroundImageUrl: undefined,
                        }
                        setDrawingData(updatedData)
                      }
                    }}
                    className="mt-2 text-xs text-red-600 hover:text-red-800"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <LashMapEditor
              initialData={drawingData}
              onSave={(data) => {
                const updatedData = {
                  ...data,
                  backgroundImageUrl: backgroundImageUrl || data.backgroundImageUrl,
                }
                setDrawingData(updatedData)
              }}
              readOnly={false}
              eyepatchImageUrl={eyepatchImageUrl}
              backgroundImageUrl={backgroundImageUrl}
              onBackgroundImageChange={setBackgroundImageUrl}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveMap}
              disabled={savingMap || saving}
              className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium disabled:opacity-50"
            >
              {savingMap ? 'Saving...' : 'Save Lash Map'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setEditingMap(null)
                setFormData({
                  appointmentId: '',
                  date: new Date().toISOString().split('T')[0],
                  notes: '',
                })
                setDrawingData(null)
                setBackgroundImageUrl(undefined)
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
        {lashMaps.length === 0 ? (
          <p className="text-brown/70">No lash maps created yet.</p>
        ) : (
          <div className="space-y-6">
            {useMemo(() => {
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
            }, [lashMaps]).map(({ map, parsedData }, index) => (
                  <div key={index} className="border-b border-brown/10 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-brown-dark">
                          {formatDate(map.date)}
                        </h3>
                        {map.appointmentId && (
                          <p className="text-sm text-brown/70">Appointment: {map.appointmentId}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(map, index)}
                          className="px-3 py-1.5 bg-brown-light text-brown-dark rounded-lg hover:bg-brown-light/80 transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(map)}
                          disabled={savingMap || saving}
                          className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {map.notes && (
                      <p className="text-sm text-brown/80 mb-4">{map.notes}</p>
                    )}
                    {parsedData ? (
                      <LashMapEditor
                        initialData={parsedData}
                        readOnly={true}
                        showLabels={true}
                        eyepatchImageUrl={eyepatchImageUrl}
                        backgroundImageUrl={parsedData.backgroundImageUrl || map.imageUrl}
                      />
                    ) : (
                      <p className="text-sm text-brown/70 italic">No drawing data available</p>
                    )}
                  </div>
                )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// History Editor Component with Retention Scores
function HistoryEditor({
  clientId,
  lashHistory,
  onUpdate,
  saving,
}: {
  clientId: string
  lashHistory: ClientData['lashHistory']
  onUpdate: () => void
  saving: boolean
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<{
    retentionScore?: 1 | 2 | 3
    retentionReason?: string
  }>({})

  const handleEdit = (appointment: typeof lashHistory[0], index: number) => {
    setEditingIndex(index)
    setFormData({
      retentionScore: appointment.retentionScore,
      retentionReason: appointment.retentionReason || '',
    })
  }

  const handleSaveRetention = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateRetentionScore: {
            appointmentId,
            retentionScore: formData.retentionScore,
            retentionReason: formData.retentionReason || undefined,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to save retention score')
      }

      setEditingIndex(null)
      setFormData({})
      onUpdate()
    } catch (err: any) {
      alert(err.message || 'Failed to save retention score')
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(null)
  const [historyFormData, setHistoryFormData] = useState({
    appointmentId: '',
    date: new Date().toISOString().split('T')[0],
    service: '',
    serviceType: 'full-set' as 'full-set' | 'refill' | 'removal' | 'other',
    lashTech: '',
    notes: '',
    retentionDays: '',
    retentionNotes: '',
    retentionScore: undefined as 1 | 2 | 3 | undefined,
    retentionReason: '',
  })

  const handleAddHistory = async () => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lashHistory: {
            appointmentId: historyFormData.appointmentId || `appt-${Date.now()}`,
            date: new Date(historyFormData.date + 'T00:00:00').toISOString(),
            service: historyFormData.service,
            serviceType: historyFormData.serviceType,
            lashTech: historyFormData.lashTech || 'Lash Technician',
            notes: historyFormData.notes || undefined,
            retentionDays: historyFormData.retentionDays ? parseInt(historyFormData.retentionDays) : undefined,
            retentionNotes: historyFormData.retentionNotes || undefined,
            retentionScore: historyFormData.retentionScore,
            retentionReason: historyFormData.retentionReason || undefined,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to add lash history')
      }

      setShowAddForm(false)
      setHistoryFormData({
        appointmentId: '',
        date: new Date().toISOString().split('T')[0],
        service: '',
        serviceType: 'full-set',
        lashTech: '',
        notes: '',
        retentionDays: '',
        retentionNotes: '',
        retentionScore: undefined,
        retentionReason: '',
      })
      onUpdate()
    } catch (err: any) {
      alert(err.message || 'Failed to add lash history')
    }
  }

  const handleEditHistory = (appointment: typeof lashHistory[0], index: number) => {
    setEditingHistoryIndex(index)
    setHistoryFormData({
      appointmentId: appointment.appointmentId,
      date: appointment.date.split('T')[0],
      service: appointment.service,
      serviceType: appointment.serviceType as 'full-set' | 'refill' | 'removal' | 'other',
      lashTech: appointment.lashTech,
      notes: appointment.notes || '',
      retentionDays: appointment.retentionDays?.toString() || '',
      retentionNotes: appointment.retentionNotes || '',
      retentionScore: appointment.retentionScore,
      retentionReason: appointment.retentionReason || '',
    })
  }

  const handleUpdateHistory = async () => {
    try {
      const appointment = lashHistory[editingHistoryIndex!]
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateLashHistory: {
            appointmentId: appointment.appointmentId,
            date: new Date(historyFormData.date + 'T00:00:00').toISOString(),
            service: historyFormData.service,
            serviceType: historyFormData.serviceType,
            lashTech: historyFormData.lashTech,
            notes: historyFormData.notes || undefined,
            retentionDays: historyFormData.retentionDays ? parseInt(historyFormData.retentionDays) : undefined,
            retentionNotes: historyFormData.retentionNotes || undefined,
            retentionScore: historyFormData.retentionScore,
            retentionReason: historyFormData.retentionReason || undefined,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to update lash history')
      }

      setEditingHistoryIndex(null)
      setHistoryFormData({
        appointmentId: '',
        date: new Date().toISOString().split('T')[0],
        service: '',
        serviceType: 'full-set',
        lashTech: '',
        notes: '',
        retentionDays: '',
        retentionNotes: '',
        retentionScore: undefined,
        retentionReason: '',
      })
      onUpdate()
    } catch (err: any) {
      alert(err.message || 'Failed to update lash history')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display text-brown-dark">Lash History</h2>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true)
              setEditingHistoryIndex(null)
              setHistoryFormData({
                appointmentId: '',
                date: new Date().toISOString().split('T')[0],
                service: '',
                serviceType: 'full-set',
                lashTech: '',
                notes: '',
                retentionDays: '',
                retentionNotes: '',
                retentionScore: undefined,
                retentionReason: '',
              })
            }}
            className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium"
          >
            + Add History Entry
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingHistoryIndex !== null) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-semibold text-brown-dark mb-4">
              {editingHistoryIndex !== null ? 'Edit History Entry' : 'Add New History Entry'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Appointment ID</label>
                <input
                  type="text"
                  value={historyFormData.appointmentId}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, appointmentId: e.target.value })}
                  placeholder="e.g., appt-123456"
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Date</label>
                <input
                  type="date"
                  value={historyFormData.date}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Service</label>
                <input
                  type="text"
                  value={historyFormData.service}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, service: e.target.value })}
                  placeholder="e.g., Classic Lashes"
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Service Type</label>
                <select
                  value={historyFormData.serviceType}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, serviceType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                >
                  <option value="full-set">Full Set</option>
                  <option value="refill">Refill</option>
                  <option value="removal">Removal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Lash Technician</label>
                <input
                  type="text"
                  value={historyFormData.lashTech}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, lashTech: e.target.value })}
                  placeholder="Lash Technician name"
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Retention Days</label>
                <input
                  type="number"
                  value={historyFormData.retentionDays}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, retentionDays: e.target.value })}
                  placeholder="e.g., 21"
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brown-dark mb-2">Notes</label>
                <textarea
                  value={historyFormData.notes}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, notes: e.target.value })}
                  placeholder="Appointment notes..."
                  rows={2}
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brown-dark mb-2">Retention Notes</label>
                <textarea
                  value={historyFormData.retentionNotes}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, retentionNotes: e.target.value })}
                  placeholder="Retention notes..."
                  rows={2}
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Retention Score</label>
                <div className="flex gap-2">
                  {[
                    { value: 3, label: '✨ Excellent', color: 'green' },
                    { value: 2, label: '👍 Good', color: 'yellow' },
                    { value: 1, label: '💪 Poor', color: 'red' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setHistoryFormData({ ...historyFormData, retentionScore: option.value as 1 | 2 | 3 })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        historyFormData.retentionScore === option.value
                          ? option.value === 3
                            ? 'bg-green-600 text-white'
                            : option.value === 2
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                          : `bg-white border-2 ${
                              option.value === 3
                                ? 'border-green-300 text-green-700 hover:bg-green-50'
                                : option.value === 2
                                ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                                : 'border-red-300 text-red-700 hover:bg-red-50'
                            }`
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brown-dark mb-2">Retention Reason</label>
                <textarea
                  value={historyFormData.retentionReason}
                  onChange={(e) => setHistoryFormData({ ...historyFormData, retentionReason: e.target.value })}
                  placeholder="e.g., Excellent retention – maintained lash hygiene. No buildup. No signs of picking."
                  rows={2}
                  className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={editingHistoryIndex !== null ? handleUpdateHistory : handleAddHistory}
                disabled={saving || !historyFormData.service || !historyFormData.date}
                className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium disabled:opacity-50"
              >
                {editingHistoryIndex !== null ? 'Update History' : 'Add History'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingHistoryIndex(null)
                  setHistoryFormData({
                    appointmentId: '',
                    date: new Date().toISOString().split('T')[0],
                    service: '',
                    serviceType: 'full-set',
                    lashTech: '',
                    notes: '',
                    retentionDays: '',
                    retentionNotes: '',
                    retentionScore: undefined,
                    retentionReason: '',
                  })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {lashHistory.length === 0 && !showAddForm ? (
          <p className="text-brown/70">No appointment history yet. Click "Add History Entry" to create one.</p>
        ) : (
          <div className="space-y-4">
            {lashHistory
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((appointment, idx) => (
                <div key={idx} className="border-b border-brown/10 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-brown-dark">{appointment.service}</h3>
                      <p className="text-sm text-brown/70">{formatDate(appointment.date)}</p>
                      {appointment.lashTech && (
                        <p className="text-xs text-brown/60 mt-1">Tech: {appointment.lashTech}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-brown-light text-brown-dark rounded text-xs font-medium capitalize">
                        {appointment.serviceType}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEditHistory(appointment, idx)}
                        className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this history entry?')) return
                          try {
                            const response = await fetch(`/api/admin/clients/${clientId}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                deleteLashHistory: appointment.appointmentId,
                              }),
                            })
                            if (!response.ok) throw new Error('Failed to delete history entry')
                            onUpdate()
                          } catch (err: any) {
                            alert(err.message || 'Failed to delete history entry')
                          }
                        }}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {appointment.notes && (
                    <p className="text-sm text-brown/80 mt-2">{appointment.notes}</p>
                  )}
                  {appointment.retentionDays && (
                    <p className="text-xs text-brown/60 mt-1">
                      Retention: {appointment.retentionDays} days
                      {appointment.retentionNotes && ` - ${appointment.retentionNotes}`}
                    </p>
                  )}
                  
                  {/* Retention Score Display */}
                  {appointment.retentionScore && editingIndex !== idx && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-brown-dark">Retention Score:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
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
                      {appointment.retentionReason && (
                        <span className="text-xs text-brown/70">- {appointment.retentionReason}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(appointment, idx)}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit Score
                      </button>
                    </div>
                  )}
                  
                  {/* Retention Score Edit Section */}
                  {editingIndex === idx ? (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-brown-dark mb-3">Set Retention Score</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-brown-dark mb-2">
                            Score
                          </label>
                          <div className="flex gap-2">
                            {[
                              { value: 3, label: '✨ Excellent', color: 'green' },
                              { value: 2, label: '👍 Good', color: 'yellow' },
                              { value: 1, label: '💪 Poor', color: 'red' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, retentionScore: option.value as 1 | 2 | 3 })}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  formData.retentionScore === option.value
                                    ? option.value === 3
                                      ? 'bg-green-600 text-white'
                                      : option.value === 2
                                      ? 'bg-yellow-600 text-white'
                                      : 'bg-red-600 text-white'
                                    : `bg-white border-2 ${
                                        option.value === 3
                                          ? 'border-green-300 text-green-700 hover:bg-green-50'
                                          : option.value === 2
                                          ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                                          : 'border-red-300 text-red-700 hover:bg-red-50'
                                      }`
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-brown-dark mb-2">
                            Reason / Notes
                          </label>
                          <textarea
                            value={formData.retentionReason || ''}
                            onChange={(e) => setFormData({ ...formData, retentionReason: e.target.value })}
                            placeholder="e.g., Excellent retention – maintained lash hygiene. No buildup. No signs of picking."
                            rows={3}
                            className="w-full px-4 py-2 border border-brown/20 rounded-lg focus:ring-2 focus:ring-brown/30 focus:border-brown"
                          />
                          <p className="text-xs text-brown/60 mt-1">
                            Quick notes: "Excellent retention – maintained lash hygiene" | "Good retention – minor gaps noted" | "Poor retention – heavy loss"
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveRetention(appointment.appointmentId)}
                            disabled={saving || !formData.retentionScore}
                            className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            Save Score
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(null)
                              setFormData({})
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    !appointment.retentionScore && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(appointment, idx)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Add Retention Score
                        </button>
                      </div>
                    )
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

