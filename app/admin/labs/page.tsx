'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import AdminBackButton from '@/components/AdminBackButton'
import type { PricingTier, LabsSettings, WhatYouGetContent, WhoThisIsForContent, BudgetRange } from '@/app/api/admin/labs/route'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tier-${Math.random().toString(36).slice(2, 10)}`
}

const generateBudgetRangeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `budget-${Math.random().toString(36).slice(2, 10)}`
}

const blankTier = (): PricingTier => ({
  id: generateId(),
  name: 'New Tier',
  tagline: 'Enter tagline here',
  priceKES: 0,
  description: 'Enter description here',
  features: {
    included: ['Feature 1'],
    excluded: [],
  },
  cta: 'Get Started',
  popular: false,
})

export default function AdminLabs() {
  const [settings, setSettings] = useState<LabsSettings>({
    consultationFeeKES: 0,
    tiers: [],
    statistics: {
      consultationsCompleted: 0,
      websitesBuilt: 0,
      averageSetupTime: '2-3 weeks',
      clientSatisfactionRate: 0,
      businessesTransformed: 0,
    },
    statisticsEnabled: true,
    budgetRanges: [
      { id: '100k-150k', label: '100K–150K KES', value: '100k-150k' },
      { id: '150k-250k', label: '150K–250K KES', value: '150k-250k' },
      { id: '250k-300k+', label: '250K–300K+ KES', value: '250k-300k+' },
    ],
    whatYouGetEnabled: true,
    courseSectionEnabled: true,
    buildOnYourOwnEnabled: true,
    whatYouGet: {
      title: 'What You Get',
      subtitle: 'Your tier determines the features and support you receive. Choose the system that matches your business needs.',
      whatYouGetTitle: 'What you get when you purchase',
      whatYouGetItems: [],
      whyThisWorksTitle: 'Why this works for service providers',
      whyThisWorksItems: [],
    },
    googleMeetRoom: '',
    googleMeetRoomLastChanged: new Date().toISOString(),
  })
  const [originalSettings, setOriginalSettings] = useState<LabsSettings>({
    consultationFeeKES: 0,
    tiers: [],
    statistics: {
      consultationsCompleted: 0,
      websitesBuilt: 0,
      averageSetupTime: '2-3 weeks',
      clientSatisfactionRate: 0,
      businessesTransformed: 0,
    },
    statisticsEnabled: true,
    budgetRanges: [
      { id: '100k-150k', label: '100K–150K KES', value: '100k-150k' },
      { id: '150k-250k', label: '150K–250K KES', value: '150k-250k' },
      { id: '250k-300k+', label: '250K–300K+ KES', value: '250k-300k+' },
    ],
    whatYouGetEnabled: true,
    courseSectionEnabled: true,
    buildOnYourOwnEnabled: true,
    whatYouGet: {
      title: 'What You Get',
      subtitle: 'Your tier determines the features and support you receive. Choose the system that matches your business needs.',
      whatYouGetTitle: 'What you get when you purchase',
      whatYouGetItems: [],
      whyThisWorksTitle: 'Why this works for service providers',
      whyThisWorksItems: [],
    },
    whoThisIsForEnabled: true,
    whoThisIsFor: {
      title: 'Who This is For',
      subtitle: 'This system is for service providers who:',
      items: [],
    },
    discountSectionEnabled: false,
    discountCodes: [],
    googleMeetRoom: '',
    googleMeetRoomLastChanged: new Date().toISOString(),
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set())
  const router = useRouter()

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings],
  )

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
        loadSettings()
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

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  const loadSettings = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs')
      if (!response.ok) {
        throw new Error('Failed to load labs settings')
      }
      const data: LabsSettings = await response.json()
      // Ensure statistics and whatYouGet are initialized
      const settingsWithDefaults: LabsSettings = {
        ...data,
        statistics: data.statistics || {
          consultationsCompleted: 0,
          websitesBuilt: 0,
          averageSetupTime: '2-3 weeks',
          clientSatisfactionRate: 0,
          businessesTransformed: 0,
        },
        statisticsEnabled: data.statisticsEnabled !== undefined ? data.statisticsEnabled : true,
        budgetRanges: (data.budgetRanges && Array.isArray(data.budgetRanges) && data.budgetRanges.length > 0)
          ? data.budgetRanges
          : [
              { id: '100k-150k', label: '100K–150K KES', value: '100k-150k' },
              { id: '150k-250k', label: '150K–250K KES', value: '150k-250k' },
              { id: '250k-300k+', label: '250K–300K+ KES', value: '250k-300k+' },
            ],
        whatYouGetEnabled: data.whatYouGetEnabled !== undefined ? data.whatYouGetEnabled : true,
        courseSectionEnabled: data.courseSectionEnabled !== undefined ? data.courseSectionEnabled : true,
        buildOnYourOwnEnabled: data.buildOnYourOwnEnabled !== undefined ? data.buildOnYourOwnEnabled : true,
        waitlistPageEnabled: data.waitlistPageEnabled !== undefined ? data.waitlistPageEnabled : false,
        waitlistSectionEnabled: data.waitlistSectionEnabled !== undefined ? data.waitlistSectionEnabled : true,
        discountSectionEnabled: data.discountSectionEnabled !== undefined ? data.discountSectionEnabled : false,
        discountCodes: Array.isArray(data.discountCodes) ? data.discountCodes : [],
        whatYouGet: data.whatYouGet || {
          title: 'What You Get',
          subtitle: 'Your tier determines the features and support you receive. Choose the system that matches your business needs.',
          whatYouGetTitle: 'What you get when you purchase',
          whatYouGetItems: [],
          whyThisWorksTitle: 'Why this works for service providers',
          whyThisWorksItems: [],
        },
        whoThisIsForEnabled: data.whoThisIsForEnabled !== undefined ? data.whoThisIsForEnabled : true,
        whoThisIsFor: data.whoThisIsFor || {
          title: 'Who This is For',
          subtitle: 'This system is for service providers who:',
          items: [],
        },
      }
      setSettings(settingsWithDefaults)
      setOriginalSettings(settingsWithDefaults)
      // Expand all tiers by default
      setExpandedTiers(new Set(data.tiers.map(tier => tier.id)))
    } catch (error) {
      console.error('Error loading labs settings:', error)
      setMessage({ type: 'error', text: 'Failed to load labs settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/labs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save labs settings')
      }

      const result = await response.json()
      setOriginalSettings(result.settings || settings)
      setMessage({ type: 'success', text: 'Labs settings saved successfully!' })
    } catch (error: any) {
      console.error('Error saving labs settings:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save labs settings' })
    } finally {
      setSaving(false)
    }
  }

  const toggleTierExpanded = (tierId: string) => {
    setExpandedTiers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tierId)) {
        newSet.delete(tierId)
      } else {
        newSet.add(tierId)
      }
      return newSet
    })
  }

  const addTier = () => {
    const newTier = blankTier()
    setSettings(prev => ({
      ...prev,
      tiers: [...prev.tiers, newTier],
    }))
    setExpandedTiers(prev => new Set([...Array.from(prev), newTier.id]))
  }

  const removeTier = (tierId: string) => {
    if (!confirm('Are you sure you want to remove this tier?')) return
    setSettings(prev => ({
      ...prev,
      tiers: prev.tiers.filter(tier => tier.id !== tierId),
    }))
    setExpandedTiers(prev => {
      const newSet = new Set(prev)
      newSet.delete(tierId)
      return newSet
    })
  }

  const updateTier = (tierId: string, updates: Partial<PricingTier>) => {
    setSettings(prev => ({
      ...prev,
      tiers: prev.tiers.map(tier =>
        tier.id === tierId ? { ...tier, ...updates } : tier
      ),
    }))
  }

  const moveTier = (tierId: string, direction: 'up' | 'down') => {
    setSettings(prev => {
      const index = prev.tiers.findIndex(tier => tier.id === tierId)
      if (index === -1) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.tiers.length - 1) return prev

      const newTiers = [...prev.tiers]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      ;[newTiers[index], newTiers[newIndex]] = [newTiers[newIndex], newTiers[index]]

      return {
        ...prev,
        tiers: newTiers,
      }
    })
  }

  const addFeature = (tierId: string, type: 'included' | 'excluded') => {
    const tier = settings.tiers.find(t => t.id === tierId)
    const existingFeatures = tier?.features || { included: [], excluded: [] }
    updateTier(tierId, {
      features: {
        included: existingFeatures.included || [],
        excluded: existingFeatures.excluded || [],
        [type]: [
          ...(existingFeatures[type] || []),
          'New feature',
        ],
      },
    })
  }

  const updateFeature = (tierId: string, type: 'included' | 'excluded', index: number, value: string) => {
    const tier = settings.tiers.find(t => t.id === tierId)
    if (!tier) return

    const newFeatures = [...(tier.features[type] || [])]
    newFeatures[index] = value

    updateTier(tierId, {
      features: {
        ...tier.features,
        [type]: newFeatures,
      },
    })
  }

  const removeFeature = (tierId: string, type: 'included' | 'excluded', index: number) => {
    const tier = settings.tiers.find(t => t.id === tierId)
    if (!tier) return

    const newFeatures = [...(tier.features[type] || [])]
    newFeatures.splice(index, 1)

    updateTier(tierId, {
      features: {
        ...tier.features,
        [type]: newFeatures,
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading labs settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminBackButton />
        <div className="mb-8">
          <h1 className="text-3xl font-display text-brown mb-2">LashDiary Labs Management</h1>
          <p className="text-gray-600">Manage consultation fee and pricing tiers</p>
        </div>

        {/* Consultation Availability Link */}
        <div className="mb-6">
          <Link
            href="/admin/labs/consultation-availability"
            className="inline-block bg-brown-dark text-white px-6 py-3 rounded-lg hover:bg-brown transition-colors font-semibold"
          >
            📅 Manage Consultation Availability
          </Link>
          <p className="text-sm text-gray-600 mt-2">
            Set which days are available for consultations and block specific dates
          </p>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        {/* Consultation Fee */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <h2 className="text-2xl font-display text-brown mb-4">Consultation Fee</h2>
          <div className="flex items-center gap-4">
            <label htmlFor="consultationFee" className="font-semibold text-gray-700">
              Fee (KES):
            </label>
            <input
              type="number"
              id="consultationFee"
              value={settings.consultationFeeKES}
              onChange={(e) =>
                setSettings(prev => ({
                  ...prev,
                  consultationFeeKES: Math.max(0, parseInt(e.target.value) || 0),
                }))
              }
              className="px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
              min="0"
              step="100"
            />
            <span className="text-gray-600">KES</span>
          </div>
        </div>

        {/* Google Meet Room Link */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <h2 className="text-2xl font-display text-brown mb-4">Google Meet Room (Security)</h2>
          <p className="text-gray-600 mb-4 text-sm">
            Change this link weekly for security. This is used as a fallback when unique meeting links can't be generated.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="googleMeetRoom" className="block font-semibold text-gray-700 mb-2">
                Google Meet Room Link:
              </label>
              <input
                type="url"
                id="googleMeetRoom"
                value={settings.googleMeetRoom || ''}
                onChange={(e) => {
                  const newLink = e.target.value.trim()
                  setSettings(prev => ({
                    ...prev,
                    googleMeetRoom: newLink,
                    // Update last changed date when link changes
                    googleMeetRoomLastChanged: newLink !== originalSettings.googleMeetRoom 
                      ? new Date().toISOString() 
                      : prev.googleMeetRoomLastChanged,
                  }))
                }}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                To create a new Meet room: Go to <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="text-brown hover:underline">meet.google.com</a>, click "New Meeting" → "Create a meeting for later", then copy the link.
              </p>
            </div>

            {settings.googleMeetRoomLastChanged && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-yellow-600 text-xl">⚠️</div>
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-800 mb-1">Security Reminder</p>
                    <p className="text-sm text-yellow-700 mb-2">
                      Last changed: {new Date(settings.googleMeetRoomLastChanged).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {(() => {
                      const daysSinceChange = Math.floor(
                        (new Date().getTime() - new Date(settings.googleMeetRoomLastChanged).getTime()) / (1000 * 60 * 60 * 24)
                      )
                      if (daysSinceChange >= 7) {
                        return (
                          <p className="text-sm font-semibold text-red-600">
                            ⚠️ It's been {daysSinceChange} days since the last change. Consider updating the link for security.
                          </p>
                        )
                      } else if (daysSinceChange >= 5) {
                        return (
                          <p className="text-sm text-yellow-700">
                            💡 Consider changing this link soon (in {7 - daysSinceChange} day{7 - daysSinceChange !== 1 ? 's' : ''}).
                          </p>
                        )
                      }
                      return (
                        <p className="text-sm text-green-700">
                          ✅ Link was changed recently. Next change recommended in {7 - daysSinceChange} day{7 - daysSinceChange !== 1 ? 's' : ''}.
                        </p>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            {settings.googleMeetRoom && (
              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Current Link:</strong>
                </p>
                <p className="text-xs text-blue-700 font-mono break-all bg-white p-2 rounded border border-blue-200">
                  {settings.googleMeetRoom}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  This link will be used for consultations when unique meeting links can't be generated automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display text-brown">Pricing Tiers</h2>
            <button
              onClick={addTier}
              className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              + Add Tier
            </button>
          </div>

          {settings.tiers.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No tiers yet. Click "Add Tier" to create one.</p>
          ) : (
            <div className="space-y-4">
              {settings.tiers.map((tier, index) => {
                const isExpanded = expandedTiers.has(tier.id)
                return (
                  <div
                    key={tier.id}
                    className="border-2 border-brown-light rounded-lg overflow-hidden"
                  >
                    <div
                      className="bg-brown-light/20 p-4 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleTierExpanded(tier.id)}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            moveTier(tier.id, 'up')
                          }}
                          disabled={index === 0}
                          className="text-brown hover:text-brown-dark disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            moveTier(tier.id, 'down')
                          }}
                          disabled={index === settings.tiers.length - 1}
                          className="text-brown hover:text-brown-dark disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <h3 className="text-xl font-semibold text-brown">{tier.name}</h3>
                        {tier.popular && (
                          <span className="bg-brown-dark text-white px-2 py-1 rounded text-sm font-semibold">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-semibold">
                          {tier.priceKES.toLocaleString()} KES
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTier(tier.id)
                          }}
                          className="text-red-600 hover:text-red-800 font-semibold"
                        >
                          Remove
                        </button>
                        <span className="text-brown">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Tier ID:</label>
                          <input
                            type="text"
                            value={tier.id}
                            onChange={(e) => updateTier(tier.id, { id: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Name:</label>
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Tagline:</label>
                          <input
                            type="text"
                            value={tier.tagline}
                            onChange={(e) => updateTier(tier.id, { tagline: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Description:</label>
                          <textarea
                            value={tier.description}
                            onChange={(e) => updateTier(tier.id, { description: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Price (KES):</label>
                          <input
                            type="number"
                            value={tier.priceKES}
                            onChange={(e) =>
                              updateTier(tier.id, {
                                priceKES: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                            min="0"
                            step="1000"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">CTA Button Text:</label>
                          <input
                            type="text"
                            value={tier.cta}
                            onChange={(e) => updateTier(tier.id, { cta: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`popular-${tier.id}`}
                            checked={tier.popular || false}
                            onChange={(e) => updateTier(tier.id, { popular: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <label htmlFor={`popular-${tier.id}`} className="font-semibold text-gray-700">
                            Mark as Popular
                          </label>
                        </div>

                        {/* Included Features */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block font-semibold text-gray-700">Included Features:</label>
                            <button
                              onClick={() => addFeature(tier.id, 'included')}
                              className="text-brown hover:text-brown-dark font-semibold text-sm"
                            >
                              + Add Feature
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(tier.features.included || []).map((feature, idx) => (
                              <div key={idx} className="flex gap-2">
                                <input
                                  type="text"
                                  value={feature}
                                  onChange={(e) => updateFeature(tier.id, 'included', idx, e.target.value)}
                                  className="flex-1 px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-400"
                                />
                                <button
                                  onClick={() => removeFeature(tier.id, 'included', idx)}
                                  className="text-red-600 hover:text-red-800 font-semibold px-3"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Excluded Features */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block font-semibold text-gray-700">Excluded Features (Optional):</label>
                            <button
                              onClick={() => addFeature(tier.id, 'excluded')}
                              className="text-brown hover:text-brown-dark font-semibold text-sm"
                            >
                              + Add Feature
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(tier.features.excluded || []).map((feature, idx) => (
                              <div key={idx} className="flex gap-2">
                                <input
                                  type="text"
                                  value={feature}
                                  onChange={(e) => updateFeature(tier.id, 'excluded', idx, e.target.value)}
                                  className="flex-1 px-4 py-2 border-2 border-red-200 rounded-lg focus:outline-none focus:border-red-400"
                                />
                                <button
                                  onClick={() => removeFeature(tier.id, 'excluded', idx)}
                                  className="text-red-600 hover:text-red-800 font-semibold px-3"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display text-brown">Statistics</h2>
            <div className="flex items-center gap-3">
              <label htmlFor="statisticsEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Statistics Section:
              </label>
              <input
                type="checkbox"
                id="statisticsEnabled"
                checked={settings.statisticsEnabled !== false}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    statisticsEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown focus:ring-brown rounded cursor-pointer"
              />
            </div>
          </div>
          
          {settings.statisticsEnabled !== false && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Consultations Completed:
              </label>
              <input
                type="number"
                value={settings.statistics?.consultationsCompleted || 0}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    statistics: {
                      ...prev.statistics,
                      consultationsCompleted: Math.max(0, parseInt(e.target.value) || 0),
                      websitesBuilt: prev.statistics?.websitesBuilt || 0,
                      averageSetupTime: prev.statistics?.averageSetupTime || '2-3 weeks',
                      clientSatisfactionRate: prev.statistics?.clientSatisfactionRate || 0,
                      businessesTransformed: prev.statistics?.businessesTransformed || 0,
                    },
                  }))
                }
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                min="0"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Websites Built:
              </label>
              <input
                type="number"
                value={settings.statistics?.websitesBuilt || 0}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    statistics: {
                      ...prev.statistics,
                      consultationsCompleted: prev.statistics?.consultationsCompleted || 0,
                      websitesBuilt: Math.max(0, parseInt(e.target.value) || 0),
                      averageSetupTime: prev.statistics?.averageSetupTime || '2-3 weeks',
                      clientSatisfactionRate: prev.statistics?.clientSatisfactionRate || 0,
                      businessesTransformed: prev.statistics?.businessesTransformed || 0,
                    },
                  }))
                }
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                min="0"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Businesses Transformed (Optional):
              </label>
              <input
                type="number"
                value={settings.statistics?.businessesTransformed || 0}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    statistics: {
                      ...prev.statistics,
                      consultationsCompleted: prev.statistics?.consultationsCompleted || 0,
                      websitesBuilt: prev.statistics?.websitesBuilt || 0,
                      averageSetupTime: prev.statistics?.averageSetupTime || '2-3 weeks',
                      clientSatisfactionRate: prev.statistics?.clientSatisfactionRate || 0,
                      businessesTransformed: Math.max(0, parseInt(e.target.value) || 0),
                    },
                  }))
                }
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                min="0"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Client Satisfaction Rate (%):
              </label>
              <input
                type="number"
                value={settings.statistics?.clientSatisfactionRate || 0}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    statistics: {
                      ...prev.statistics,
                      consultationsCompleted: prev.statistics?.consultationsCompleted || 0,
                      websitesBuilt: prev.statistics?.websitesBuilt || 0,
                      averageSetupTime: prev.statistics?.averageSetupTime || '2-3 weeks',
                      clientSatisfactionRate: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                      businessesTransformed: prev.statistics?.businessesTransformed || 0,
                    },
                  }))
                }
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                min="0"
                max="100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-2">
                Average Setup Time:
              </label>
              <input
                type="text"
                value={settings.statistics?.averageSetupTime || '2-3 weeks'}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    statistics: {
                      ...prev.statistics,
                      consultationsCompleted: prev.statistics?.consultationsCompleted || 0,
                      websitesBuilt: prev.statistics?.websitesBuilt || 0,
                      averageSetupTime: e.target.value,
                      clientSatisfactionRate: prev.statistics?.clientSatisfactionRate || 0,
                      businessesTransformed: prev.statistics?.businessesTransformed || 0,
                    },
                  }))
                }
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                placeholder="e.g., 2-3 weeks"
              />
            </div>
          </div>
          )}
        </div>

        {/* Budget Ranges Section */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display text-brown">Budget Ranges</h2>
            <button
              onClick={() => {
                const newRange: BudgetRange = {
                  id: generateBudgetRangeId(),
                  label: 'New Budget Range',
                  value: 'new-range',
                }
                setSettings(prev => ({
                  ...prev,
                  budgetRanges: [...(prev.budgetRanges || []), newRange],
                }))
              }}
              className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              + Add Range
            </button>
          </div>

          {(!settings.budgetRanges || settings.budgetRanges.length === 0) ? (
            <p className="text-gray-600 text-center py-8">No budget ranges yet. Click "Add Range" to create one.</p>
          ) : (
            <div className="space-y-4">
              {settings.budgetRanges.map((range, index) => (
                <div
                  key={range.id}
                  className="border-2 border-brown-light rounded-lg p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-2">Label (Display Text):</label>
                      <input
                        type="text"
                        value={range.label}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            budgetRanges: (prev.budgetRanges || []).map(r =>
                              r.id === range.id ? { ...r, label: e.target.value } : r
                            ),
                          }))
                        }}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                        placeholder="e.g., 100K–150K KES"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-2">Value (Form Value):</label>
                      <input
                        type="text"
                        value={range.value}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            budgetRanges: (prev.budgetRanges || []).map(r =>
                              r.id === range.id ? { ...r, value: e.target.value } : r
                            ),
                          }))
                        }}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                        placeholder="e.g., 100k-150k"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (index > 0) {
                            setSettings(prev => {
                              const newRanges = [...(prev.budgetRanges || [])]
                              ;[newRanges[index], newRanges[index - 1]] = [newRanges[index - 1], newRanges[index]]
                              return { ...prev, budgetRanges: newRanges }
                            })
                          }
                        }}
                        disabled={index === 0}
                        className="text-brown hover:text-brown-dark disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (index < (settings.budgetRanges?.length || 0) - 1) {
                            setSettings(prev => {
                              const newRanges = [...(prev.budgetRanges || [])]
                              ;[newRanges[index], newRanges[index + 1]] = [newRanges[index + 1], newRanges[index]]
                              return { ...prev, budgetRanges: newRanges }
                            })
                          }
                        }}
                        disabled={index === (settings.budgetRanges?.length || 0) - 1}
                        className="text-brown hover:text-brown-dark disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => {
                          if ((settings.budgetRanges?.length || 0) <= 1) {
                            alert('You must have at least one budget range. Add a new one before removing this.')
                            return
                          }
                          if (confirm('Are you sure you want to remove this budget range?')) {
                            setSettings(prev => ({
                              ...prev,
                              budgetRanges: (prev.budgetRanges || []).filter(r => r.id !== range.id),
                            }))
                          }
                        }}
                        disabled={(settings.budgetRanges?.length || 0) <= 1}
                        className="text-red-600 hover:text-red-800 font-semibold px-3 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What You Get Content Section */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display text-brown">What You Get Content</h2>
            <div className="flex items-center gap-3">
              <label htmlFor="whatYouGetEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable What You Get Section:
              </label>
              <input
                type="checkbox"
                id="whatYouGetEnabled"
                checked={settings.whatYouGetEnabled !== false}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    whatYouGetEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown border-2 border-brown-light rounded focus:ring-2 focus:ring-brown cursor-pointer"
              />
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Main Title and Subtitle */}
            <div>
              <label className="block text-sm font-semibold text-brown mb-2">Section Title</label>
              <input
                type="text"
                value={settings.whatYouGet?.title || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatYouGet: {
                    ...prev.whatYouGet!,
                    title: e.target.value,
                  },
                }))}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                placeholder="What You Get"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown mb-2">Subtitle</label>
              <textarea
                value={settings.whatYouGet?.subtitle || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatYouGet: {
                    ...prev.whatYouGet!,
                    subtitle: e.target.value,
                  },
                }))}
                rows={2}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                placeholder="Your tier determines the features and support you receive..."
              />
            </div>

            {/* What You Get When You Purchase */}
            <div>
              <label className="block text-sm font-semibold text-brown mb-2">"What You Get" Section Title</label>
              <input
                type="text"
                value={settings.whatYouGet?.whatYouGetTitle || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatYouGet: {
                    ...prev.whatYouGet!,
                    whatYouGetTitle: e.target.value,
                  },
                }))}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                placeholder="What you get when you purchase"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown mb-2">
                "What You Get" Items (one per line)
              </label>
              <textarea
                value={settings.whatYouGet?.whatYouGetItems?.join('\n') || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatYouGet: {
                    ...prev.whatYouGet!,
                    whatYouGetItems: e.target.value.split('\n').filter(line => line.trim()),
                  },
                }))}
                rows={8}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown font-mono text-sm"
                placeholder="A complete website with the same structure and features as LashDiary&#10;Your website will be built according to your selected tier&#10;..."
              />
              <p className="text-xs text-gray-500 mt-1">Enter each item on a new line</p>
            </div>

            {/* Why This Works */}
            <div>
              <label className="block text-sm font-semibold text-brown mb-2">"Why This Works" Section Title</label>
              <input
                type="text"
                value={settings.whatYouGet?.whyThisWorksTitle || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatYouGet: {
                    ...prev.whatYouGet!,
                    whyThisWorksTitle: e.target.value,
                  },
                }))}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                placeholder="Why this works for service providers"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown mb-2">
                "Why This Works" Items (one per line)
              </label>
              <textarea
                value={settings.whatYouGet?.whyThisWorksItems?.join('\n') || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatYouGet: {
                    ...prev.whatYouGet!,
                    whyThisWorksItems: e.target.value.split('\n').filter(line => line.trim()),
                  },
                }))}
                rows={6}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown font-mono text-sm"
                placeholder="No more lost bookings - everything is organized in one place&#10;Payment confusion eliminated - clients pay directly to your connected accounts&#10;..."
              />
              <p className="text-xs text-gray-500 mt-1">Enter each item on a new line</p>
            </div>
          </div>
        </div>

        {/* Course Section Toggle */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-display text-brown mb-2">Course Section</h2>
              <p className="text-gray-600 text-sm">
                Control the visibility of the "Learn to Build Your Own Booking Website" section on the labs page.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="courseSectionEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Course Section:
              </label>
              <input
                type="checkbox"
                id="courseSectionEnabled"
                checked={settings.courseSectionEnabled !== false}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    courseSectionEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown border-2 border-brown-light rounded focus:ring-2 focus:ring-brown cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Custom Website Builds Section on Labs Page */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-display text-brown mb-2">Custom Website Builds Section on Labs Page</h2>
              <p className="text-gray-600 text-sm">
                Control the visibility of the "Custom Website Builds" section on the main Labs page. This section directs users to /labs/custom-website-builds.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="buildOnYourOwnEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Custom Website Builds Section:
              </label>
              <input
                type="checkbox"
                id="buildOnYourOwnEnabled"
                checked={settings.buildOnYourOwnEnabled !== false}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    buildOnYourOwnEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown border-2 border-brown-light rounded focus:ring-2 focus:ring-brown cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Waitlist Section on Labs Page */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-display text-brown mb-2">Waitlist Section on Labs Page</h2>
              <p className="text-gray-600 text-sm">
                Control the visibility of the "Join the Waitlist" section on the main Labs page. This section directs users to /labs/waitlist.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="waitlistSectionEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Waitlist Section:
              </label>
              <input
                type="checkbox"
                id="waitlistSectionEnabled"
                checked={settings.waitlistSectionEnabled !== false}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    waitlistSectionEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown border-2 border-brown-light rounded focus:ring-2 focus:ring-brown cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Waitlist Page Section */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-display text-brown mb-2">Waitlist Page</h2>
              <p className="text-gray-600 text-sm">
                Enable or disable the waitlist page at /labs/waitlist. When enabled, users can sign up for the waitlist.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Note: You can manage waitlist settings (open/close dates, discount percentage) from the{' '}
                <Link href="/admin/labs-waitlist" className="text-brown hover:underline font-semibold">
                  Waitlist Management
                </Link>{' '}
                page.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="waitlistPageEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Waitlist Page:
              </label>
              <input
                type="checkbox"
                id="waitlistPageEnabled"
                checked={settings.waitlistPageEnabled === true}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    waitlistPageEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown border-2 border-brown-light rounded focus:ring-2 focus:ring-brown cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Discount Section */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-display text-brown mb-2">Discount Codes</h2>
              <p className="text-gray-600 text-sm mb-2">
                Enable the discount code section on the consultation booking page. When enabled, users can enter the waitlist discount codes they received via email to get discounts on consultation fees.
              </p>
              <p className="text-gray-500 text-xs">
                <strong>Note:</strong> This section uses waitlist discount codes. To manage waitlist discount settings (percentage, code prefix), go to the{' '}
                <Link href="/admin/labs-waitlist" className="text-brown hover:underline font-semibold">
                  Waitlist Management page
                </Link>
                .
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="discountSectionEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Discount Section:
              </label>
              <input
                type="checkbox"
                id="discountSectionEnabled"
                checked={settings.discountSectionEnabled === true}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    discountSectionEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown border-2 border-brown-light rounded focus:ring-2 focus:ring-brown cursor-pointer"
              />
            </div>
          </div>

          {settings.discountSectionEnabled && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>ℹ️ How it works:</strong> When enabled, a discount code input field will appear on the consultation booking page. Users can enter the discount codes they received when signing up for the waitlist. The discount percentage is configured in the Waitlist Management settings.
              </p>
            </div>
          )}
        </div>

        {/* Who This is For Content Section */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display text-brown">Who This is For Content</h2>
            <div className="flex items-center gap-3">
              <label htmlFor="whoThisIsForEnabled" className="font-semibold text-gray-700 cursor-pointer">
                Enable Who This is For Section:
              </label>
              <input
                type="checkbox"
                id="whoThisIsForEnabled"
                checked={settings.whoThisIsForEnabled !== false}
                onChange={(e) =>
                  setSettings(prev => ({
                    ...prev,
                    whoThisIsForEnabled: e.target.checked,
                  }))
                }
                className="w-5 h-5 text-brown border-2 border-brown-light rounded focus:ring-2 focus:ring-brown cursor-pointer"
              />
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Main Title */}
            <div>
              <label className="block text-sm font-semibold text-brown mb-2">Section Title</label>
              <input
                type="text"
                value={settings.whoThisIsFor?.title || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whoThisIsFor: {
                    ...prev.whoThisIsFor!,
                    title: e.target.value,
                  },
                }))}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                placeholder="Who This is For"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-semibold text-brown mb-2">Subtitle</label>
              <textarea
                value={settings.whoThisIsFor?.subtitle || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whoThisIsFor: {
                    ...prev.whoThisIsFor!,
                    subtitle: e.target.value,
                  },
                }))}
                rows={2}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                placeholder="This system is for service providers who:"
              />
            </div>

            {/* Items */}
            <div>
              <label className="block text-sm font-semibold text-brown mb-2">
                Items (one per line)
              </label>
              <textarea
                value={settings.whoThisIsFor?.items?.join('\n') || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whoThisIsFor: {
                    ...prev.whoThisIsFor!,
                    items: e.target.value.split('\n').filter(line => line.trim()),
                  },
                }))}
                rows={10}
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown font-mono text-sm"
                placeholder="Struggle to keep track of client bookings and constantly worry about scheduling mistakes.&#10;Get frustrated trying to chase deposits or payments from clients.&#10;..."
              />
              <p className="text-xs text-gray-500 mt-1">Enter each item on a new line</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4 mb-6">
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="bg-brown-dark text-white px-8 py-3 rounded-lg hover:bg-brown transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={async () => {
          await handleSave()
          setShowDialog(false)
          if (pendingNavigation) {
            router.push(pendingNavigation)
          }
        }}
        onLeave={() => {
          setShowDialog(false)
          if (pendingNavigation) {
            router.push(pendingNavigation)
          }
        }}
        onCancel={() => {
          setShowDialog(false)
          setPendingNavigation(null)
        }}
        saving={saving}
      />
    </div>
  )
}

