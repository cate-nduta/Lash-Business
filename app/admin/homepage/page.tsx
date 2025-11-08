'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

interface HomepageData {
  hero: {
    title: string
    subtitle: string
    highlight?: string
    badge?: string
    mobileServiceNote?: string
  }
  intro: {
    title: string
    paragraph1: string
    paragraph2: string
    features: string
  }
  features: Array<{
    title: string
    description: string
  }>
  cta: {
    title: string
    description: string
    buttonText: string
  }
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminHomepage() {
  const [homepage, setHomepage] = useState<HomepageData>({
    hero: { title: '', subtitle: '', highlight: '', badge: '' },
    intro: { title: '', paragraph1: '', paragraph2: '', features: '' },
    features: [],
    cta: { title: '', description: '', buttonText: '' },
  })
  const [originalHomepage, setOriginalHomepage] = useState<HomepageData>({
    hero: { title: '', subtitle: '', highlight: '', badge: '' },
    intro: { title: '', paragraph1: '', paragraph2: '', features: '' },
    features: [],
    cta: { title: '', description: '', buttonText: '' },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(homepage) !== JSON.stringify(originalHomepage)

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
        loadHomepage()
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

  const loadHomepage = async () => {
    try {
      const response = await authorizedFetch('/api/admin/homepage')
      if (response.ok) {
        const data = await response.json()
        const normalizedHero = {
          ...data.hero,
          highlight: data.hero?.highlight ?? data.hero?.mobileServiceNote ?? '',
          badge: data.hero?.badge ?? data.hero?.mobileServiceNote ?? '',
        }
        const normalizedHomepage: HomepageData = {
          ...data,
          hero: normalizedHero,
        }
        setHomepage(normalizedHomepage)
        setOriginalHomepage(normalizedHomepage)
      }
    } catch (error) {
      console.error('Error loading homepage:', error)
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
      const response = await authorizedFetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homepage),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Homepage content updated successfully!' })
        setOriginalHomepage(homepage) // Update original to clear unsaved changes flag
        setShowDialog(false) // Close dialog if open
      } else {
        setMessage({ type: 'error', text: 'Failed to save homepage content' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const updateFeature = (index: number, field: 'title' | 'description', value: string) => {
    setHomepage((prev) => {
      const updatedFeatures = [...prev.features]
      updatedFeatures[index] = { ...updatedFeatures[index], [field]: value }
      return { ...prev, features: updatedFeatures }
    })
  }

  const addFeature = () => {
    setHomepage((prev) => ({
      ...prev,
      features: [
        ...prev.features,
        {
          title: '',
          description: '',
        },
      ],
    }))
  }

  const removeFeature = (index: number) => {
    setHomepage((prev) => ({
      ...prev,
      features: prev.features.filter((_, featureIndex) => featureIndex !== index),
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
      <div className="max-w-4xl mx-auto">
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

        {/* Toast Notification */}
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Homepage Content</h1>
          
          {/* Hero Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Hero Section</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                <input
                  type="text"
                  value={homepage.hero.title}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, title: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Subtitle</label>
                <input
                  type="text"
                  value={homepage.hero.subtitle}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, subtitle: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Badge Text</label>
                <input
                  type="text"
                  value={homepage.hero.badge ?? ''}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, badge: e.target.value } })}
                  placeholder="e.g., Nairobi Studio Experience"
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Highlight Text</label>
                <input
                  type="text"
                  value={homepage.hero.highlight ?? ''}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, highlight: e.target.value } })}
                  placeholder="e.g., Visit our Nairobi studio for a bespoke lash experience."
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
            </div>
          </div>

          {/* Intro Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Intro Section</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                <input
                  type="text"
                  value={homepage.intro.title}
                  onChange={(e) => setHomepage({ ...homepage, intro: { ...homepage.intro, title: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Paragraph 1</label>
                <textarea
                  value={homepage.intro.paragraph1}
                  onChange={(e) => setHomepage({ ...homepage, intro: { ...homepage.intro, paragraph1: e.target.value } })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Paragraph 2</label>
                <textarea
                  value={homepage.intro.paragraph2}
                  onChange={(e) => setHomepage({ ...homepage, intro: { ...homepage.intro, paragraph2: e.target.value } })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Features Text</label>
                <input
                  type="text"
                  value={homepage.intro.features}
                  onChange={(e) => setHomepage({ ...homepage, intro: { ...homepage.intro, features: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Features</h2>
            {homepage.features.length === 0 && (
              <div className="mb-4 p-4 bg-pink-light/20 border border-dashed border-brown-light rounded-lg text-sm text-brown-dark/80">
                No features yet. Click “Add Feature” to highlight what makes your studio special.
              </div>
            )}
            {homepage.features.map((feature, index) => (
              <div key={index} className="mb-4 p-4 bg-pink-light/30 rounded-lg border border-brown-light">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-brown-dark mb-2">Feature {index + 1} Title</label>
                      <input
                        type="text"
                        value={feature.title}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brown-dark mb-2">Feature {index + 1} Description</label>
                      <textarea
                        value={feature.description}
                        onChange={(e) => updateFeature(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    aria-label={`Remove feature ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addFeature}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              + Add Feature
            </button>
          </div>

          {/* CTA Section */}
          <div>
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Call to Action Section</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                <input
                  type="text"
                  value={homepage.cta.title}
                  onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, title: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Description</label>
                <textarea
                  value={homepage.cta.description}
                  onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, description: e.target.value } })}
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Button Text</label>
                <input
                  type="text"
                  value={homepage.cta.buttonText}
                  onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, buttonText: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
            </div>
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

