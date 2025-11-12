'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

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

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState<DiscountsData>({
    firstTimeClientDiscount: { enabled: true, percentage: 10, bannerEnabled: 'auto', bannerMessage: '' },
    returningClientDiscount: { enabled: true, tier30Percentage: 12, tier45Percentage: 6 },
    depositPercentage: 35,
  })
  const [originalDiscounts, setOriginalDiscounts] = useState<DiscountsData>({
    firstTimeClientDiscount: { enabled: true, percentage: 10, bannerEnabled: 'auto', bannerMessage: '' },
    returningClientDiscount: { enabled: true, tier30Percentage: 12, tier45Percentage: 6 },
    depositPercentage: 35,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(discounts) !== JSON.stringify(originalDiscounts)

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
        loadDiscounts()
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

  const loadDiscounts = async () => {
    try {
      const response = await authorizedFetch('/api/admin/discounts')
      if (response.ok) {
        const data = await response.json()
        const normalized: DiscountsData = {
          firstTimeClientDiscount: {
            enabled: Boolean(data?.firstTimeClientDiscount?.enabled),
            percentage: Number(data?.firstTimeClientDiscount?.percentage ?? 0),
            bannerEnabled:
              data?.firstTimeClientDiscount?.bannerEnabled === false
                ? 'disabled'
                : data?.firstTimeClientDiscount?.bannerEnabled === true
                ? 'enabled'
                : 'auto',
            bannerMessage:
              typeof data?.firstTimeClientDiscount?.bannerMessage === 'string'
                ? data.firstTimeClientDiscount.bannerMessage
                : '',
          },
          returningClientDiscount: {
            enabled: Boolean(data?.returningClientDiscount?.enabled),
            tier30Percentage: Number(
              data?.returningClientDiscount?.tier30Percentage ??
                data?.returningClientDiscount?.within30DaysPercentage ??
                data?.returningClientDiscount?.percentage ??
                0,
            ),
            tier45Percentage: Number(
              data?.returningClientDiscount?.tier45Percentage ??
                data?.returningClientDiscount?.within31To45DaysPercentage ??
                data?.returningClientDiscount?.percentage ??
                0,
            ),
          },
          depositPercentage: Number(data?.depositPercentage ?? 0),
        }
        setDiscounts(normalized)
        setOriginalDiscounts(normalized)
      }
    } catch (error) {
      console.error('Error loading discounts:', error)
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
      const normalizedPayload = {
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

      const response = await authorizedFetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedPayload),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Discounts updated successfully!' })
        setOriginalDiscounts(discounts) // Update original to clear unsaved changes flag
        setShowDialog(false) // Close dialog if open
      } else {
        setMessage({ type: 'error', text: 'Failed to save discounts' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
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

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Discounts Management</h1>

          <div className="space-y-6">
            <div className="bg-pink-light rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">First-Time Client Discount</h2>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discounts.firstTimeClientDiscount.enabled}
                    onChange={(e) =>
                      setDiscounts((prev) => ({
                        ...prev,
                        firstTimeClientDiscount: {
                          ...prev.firstTimeClientDiscount,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-brown-dark font-medium">Enable first-time client discount</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={discounts.firstTimeClientDiscount.percentage}
                    onChange={(e) =>
                      setDiscounts((prev) => ({
                        ...prev,
                        firstTimeClientDiscount: {
                          ...prev.firstTimeClientDiscount,
                          percentage: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                  <p className="text-sm text-brown mt-2">
                    Applies only to full sets—fills/infills are automatically excluded at checkout.
                  </p>
                </div>
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
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown disabled:opacity-50"
                  >
                    <option value="auto">Auto (show when offer is enabled)</option>
                    <option value="enabled">Always show</option>
                    <option value="disabled">Hide banner</option>
                  </select>
                  <p className="text-xs text-brown mt-2">
                    “Auto” shows the banner whenever the first-time discount is on. Choose “Hide” to remove it entirely, or “Always show” to keep it visible even if the offer is off.
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
                    Use {'{{percentage}}'} to insert the current first-time discount automatically. Leave blank to use the default message.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-pink-light rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Returning Client Loyalty Discount</h2>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={discounts.returningClientDiscount.enabled}
                    onChange={(e) =>
                      setDiscounts((prev) => ({
                        ...prev,
                        returningClientDiscount: {
                          ...prev.returningClientDiscount,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-brown-dark font-medium">Enable returning client loyalty discount</span>
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Discount within 30 days (%)
                    </label>
                    <input
                      type="number"
                      value={discounts.returningClientDiscount.tier30Percentage}
                      onChange={(e) =>
                        setDiscounts((prev) => ({
                          ...prev,
                          returningClientDiscount: {
                            ...prev.returningClientDiscount,
                            tier30Percentage: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                    <p className="text-xs text-brown mt-1">
                      Applies when a returning client rebooks within 30 days of their last completed, paid appointment.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Discount within 31–45 days (%)
                    </label>
                    <input
                      type="number"
                      value={discounts.returningClientDiscount.tier45Percentage}
                      onChange={(e) =>
                        setDiscounts((prev) => ({
                          ...prev,
                          returningClientDiscount: {
                            ...prev.returningClientDiscount,
                            tier45Percentage: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                    <p className="text-xs text-brown mt-1">
                      Applies when a returning client rebooks between 31 and 45 days of their last paid appointment.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-brown">
                  Loyalty discounts never apply to fills/infills and are skipped automatically if a promo code is used.
                </p>
              </div>
            </div>

            <div className="bg-pink-light rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Deposit Settings</h2>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Deposit Percentage (%)
                </label>
                <input
                  type="number"
                  value={discounts.depositPercentage}
                  onChange={(e) =>
                    setDiscounts((prev) => ({
                      ...prev,
                      depositPercentage: parseInt(e.target.value) || 0,
                    }))
                  }
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
                <p className="text-sm text-brown mt-2">
                  Percentage of the final price (after discounts) required as deposit to secure a booking
                </p>
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

