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

interface DiscountsData {
  firstTimeClientDiscount: {
    enabled: boolean
    percentage: number
    bannerEnabled: 'auto' | 'enabled' | 'disabled'
    bannerMessage: string
  }
  returningClientDiscount: {
    enabled: boolean
    tier30Percentage: number
    tier45Percentage: number
  }
  depositPercentage: number
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const createDefaultDiscounts = (): DiscountsData => ({
  firstTimeClientDiscount: { enabled: true, percentage: 0, bannerEnabled: 'auto', bannerMessage: '' },
  returningClientDiscount: { enabled: true, tier30Percentage: 0, tier45Percentage: 0 },
  depositPercentage: 0,
})

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
  const [discounts, setDiscounts] = useState<DiscountsData>(() => createDefaultDiscounts())
  const [originalDiscounts, setOriginalDiscounts] = useState<DiscountsData>(() => createDefaultDiscounts())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges =
    JSON.stringify(homepage) !== JSON.stringify(originalHomepage) ||
    JSON.stringify(discounts) !== JSON.stringify(originalDiscounts)

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
        loadData()
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

  const loadData = async () => {
    try {
      const [homepageResponse, discountsResponse] = await Promise.all([
        authorizedFetch('/api/admin/homepage'),
        authorizedFetch('/api/admin/discounts'),
      ])

      if (homepageResponse.ok) {
        const data = await homepageResponse.json()
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
      } else {
        console.error('Failed to load homepage data')
      }

      if (discountsResponse.ok) {
        const discountData = await discountsResponse.json()
        const normalizedDiscounts: DiscountsData = {
          firstTimeClientDiscount: {
            enabled: Boolean(discountData?.firstTimeClientDiscount?.enabled),
            percentage: Number(discountData?.firstTimeClientDiscount?.percentage ?? 0),
            bannerEnabled:
              discountData?.firstTimeClientDiscount?.bannerEnabled === false
                ? 'disabled'
                : discountData?.firstTimeClientDiscount?.bannerEnabled === true
                ? 'enabled'
                : 'auto',
            bannerMessage:
              typeof discountData?.firstTimeClientDiscount?.bannerMessage === 'string'
                ? discountData.firstTimeClientDiscount.bannerMessage
                : '',
          },
          returningClientDiscount: {
            enabled: Boolean(discountData?.returningClientDiscount?.enabled),
            tier30Percentage: Number(
              discountData?.returningClientDiscount?.tier30Percentage ??
                discountData?.returningClientDiscount?.within30DaysPercentage ??
                discountData?.returningClientDiscount?.percentage ??
                0,
            ),
            tier45Percentage: Number(
              discountData?.returningClientDiscount?.tier45Percentage ??
                discountData?.returningClientDiscount?.within31To45DaysPercentage ??
                discountData?.returningClientDiscount?.percentage ??
                0,
            ),
          },
          depositPercentage: Number(discountData?.depositPercentage ?? 0),
        }
        setDiscounts(normalizedDiscounts)
        setOriginalDiscounts(JSON.parse(JSON.stringify(normalizedDiscounts)) as DiscountsData)
      } else {
        console.error('Failed to load discount data for promo banner')
      }
    } catch (error) {
      console.error('Error loading homepage or promo banner data:', error)
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

    const discountsChanged = JSON.stringify(discounts) !== JSON.stringify(originalDiscounts)

    try {
      const homepageResponse = await authorizedFetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homepage),
      })

      let discountsResponse: Response | null = null

      if (discountsChanged) {
        const normalizedDiscountPayload = {
          firstTimeClientDiscount: {
            enabled: Boolean(discounts.firstTimeClientDiscount.enabled),
            percentage: Number(discounts.firstTimeClientDiscount.percentage ?? 0),
            bannerEnabled:
              discounts.firstTimeClientDiscount.bannerEnabled === 'enabled'
                ? true
                : discounts.firstTimeClientDiscount.bannerEnabled === 'disabled'
                ? false
                : null,
            bannerMessage: discounts.firstTimeClientDiscount.bannerMessage ?? '',
          },
          returningClientDiscount: {
            enabled: Boolean(discounts.returningClientDiscount.enabled),
            tier30Percentage: Number(discounts.returningClientDiscount.tier30Percentage ?? 0),
            tier45Percentage: Number(discounts.returningClientDiscount.tier45Percentage ?? 0),
          },
          depositPercentage: Number(discounts.depositPercentage ?? 0),
        }

        discountsResponse = await authorizedFetch('/api/admin/discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedDiscountPayload),
        })
      }

      const homepageOk = homepageResponse.ok
      const discountsOk = !discountsChanged || (discountsResponse?.ok ?? false)

      if (homepageOk && discountsOk) {
        setMessage({ type: 'success', text: 'Homepage settings updated successfully!' })
        setOriginalHomepage(homepage)
        if (discountsChanged) {
          setOriginalDiscounts(JSON.parse(JSON.stringify(discounts)) as DiscountsData)
        }
        setShowDialog(false)
      } else {
        if (!homepageOk && !discountsOk) {
          setMessage({
            type: 'error',
            text: 'Failed to save homepage content and promo banner settings',
          })
        } else if (!homepageOk) {
          setMessage({ type: 'error', text: 'Failed to save homepage content' })
        } else {
          setMessage({ type: 'error', text: 'Failed to save promo banner settings' })
        }
      }
    } catch (error) {
      console.error('Error saving homepage or promo banner settings:', error)
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

          {/* Promo Banner */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Promo Banner</h2>
            <p className="text-sm text-brown-dark/80 mb-4">
              Update the sliding banner that appears above the public site header.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Banner visibility</label>
                <select
                  value={discounts.firstTimeClientDiscount.bannerEnabled}
                  onChange={(e) =>
                    setDiscounts((prev) => ({
                      ...prev,
                      firstTimeClientDiscount: {
                        ...prev.firstTimeClientDiscount,
                        bannerEnabled: e.target.value as 'auto' | 'enabled' | 'disabled',
                      },
                    }))
                  }
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                >
                  <option value="auto">Auto (show when offer is enabled)</option>
                  <option value="enabled">Always show</option>
                  <option value="disabled">Hide banner</option>
                </select>
                <p className="text-xs text-brown mt-2">
                  “Auto” shows the banner whenever the first-time client discount is enabled. Choose “Hide”
                  to remove it entirely, or “Always show” to keep it visible even if the offer is off.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Banner message</label>
                <textarea
                  value={discounts.firstTimeClientDiscount.bannerMessage}
                  onChange={(e) =>
                    setDiscounts((prev) => ({
                      ...prev,
                      firstTimeClientDiscount: {
                        ...prev.firstTimeClientDiscount,
                        bannerMessage: e.target.value,
                      },
                    }))
                  }
                  rows={2}
                  placeholder="🎉 Special Offer: {{percentage}}% OFF for first-time clients!"
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
                <p className="text-xs text-brown mt-2">
                  Use {'{{percentage}}'} anywhere in the message to automatically insert the current first-time
                  discount (%). Leave blank to use the default announcement.
                </p>
              </div>
              <div className="p-4 bg-pink-light/30 border border-brown-light rounded-lg text-sm text-brown-dark">
                <span className="font-semibold">Preview:&nbsp;</span>
                {(() => {
                  const percentageValue = discounts.firstTimeClientDiscount.percentage
                  const template = discounts.firstTimeClientDiscount.bannerMessage?.trim()
                  const defaultMessage =
                    Number.isFinite(percentageValue) && percentageValue !== null
                      ? `🎉 Special Offer: ${percentageValue}% OFF for First-Time Clients! Book today and save! 🎉`
                      : ''
                  const rawMessage = template && template.length > 0 ? template : defaultMessage
                  if (!rawMessage) {
                    return 'No banner text will be displayed.'
                  }
                  return rawMessage.replace(/{{\s*percentage\s*}}/gi, `${percentageValue}`)
                })()}
                {discounts.firstTimeClientDiscount.bannerEnabled === 'disabled' && (
                  <span className="block text-xs text-brown-dark/70 mt-2">
                    Banner is currently hidden. Change visibility to show it on the site.
                  </span>
                )}
              </div>
            </div>
          </div>
          
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

