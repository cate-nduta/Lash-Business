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
  fridayNightDepositPercentage: number
  fridayNightEnabled: boolean
  depositNotice: string
  paymentRequirement: 'deposit' | 'full'
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState<DiscountsData>({
    firstTimeClientDiscount: { enabled: true, percentage: 10, bannerEnabled: 'auto', bannerMessage: '' },
    returningClientDiscount: { enabled: true, tier30Percentage: 12, tier45Percentage: 6 },
    depositPercentage: 30,
    fridayNightDepositPercentage: 50,
    fridayNightEnabled: true,
    depositNotice: '',
    paymentRequirement: 'deposit',
  })
  const [originalDiscounts, setOriginalDiscounts] = useState<DiscountsData>({
    firstTimeClientDiscount: { enabled: true, percentage: 10, bannerEnabled: 'auto', bannerMessage: '' },
    returningClientDiscount: { enabled: true, tier30Percentage: 12, tier45Percentage: 6 },
    depositPercentage: 30,
    fridayNightDepositPercentage: 50,
    fridayNightEnabled: true,
    depositNotice: '',
    paymentRequirement: 'deposit',
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
          depositPercentage: Number(data?.depositPercentage ?? 30),
          fridayNightDepositPercentage: Number(data?.fridayNightDepositPercentage ?? 50),
          fridayNightEnabled: data?.fridayNightEnabled !== false,
          depositNotice:
            typeof data?.depositNotice === 'string'
              ? data.depositNotice
              : '',
          paymentRequirement: (data?.paymentRequirement === 'full' ? 'full' : 'deposit') as 'deposit' | 'full',
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
        depositPercentage: Number(discounts.depositPercentage ?? 30),
        fridayNightDepositPercentage: Number(discounts.fridayNightDepositPercentage ?? 50),
        fridayNightEnabled: Boolean(discounts.fridayNightEnabled),
        depositNotice: discounts.depositNotice ?? '',
        paymentRequirement: discounts.paymentRequirement ?? 'deposit',
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Standard Deposit Percentage (%)
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
                    Percentage of the final price (after discounts) required as deposit to secure a regular booking
                  </p>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Friday Night Deposit Percentage (%)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-brown-dark mb-1">
                    <input
                      type="checkbox"
                      checked={discounts.fridayNightEnabled}
                      onChange={(e) =>
                        setDiscounts((prev) => ({
                          ...prev,
                          fridayNightEnabled: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-brown-dark"
                    />
                    <span>Enable special deposit for Friday night slots</span>
                  </label>
                  <input
                    type="number"
                    value={discounts.fridayNightDepositPercentage}
                    onChange={(e) =>
                      setDiscounts((prev) => ({
                        ...prev,
                        fridayNightDepositPercentage: parseInt(e.target.value) || 50,
                      }))
                    }
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    disabled={!discounts.fridayNightEnabled}
                  />
                  <p className="text-sm text-brown mt-2">
                    Percentage of the final price required as deposit for Friday evening time slot bookings. This applies
                    automatically when clients select Friday evening slots, but only when the toggle above is enabled.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Booking Page Deposit Notice
                  </label>
                  <textarea
                    value={discounts.depositNotice}
                    onChange={(e) =>
                      setDiscounts((prev) => ({
                        ...prev,
                        depositNotice: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder='e.g. "A {deposit}% deposit is required to secure your booking. Deposits are strictly for securing your booking and cannot be refunded under any circumstance.{fridayDeposit}"'
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                  <p className="text-xs text-brown mt-2">
                    You can use <code>{'{deposit}'}</code> for the standard deposit percentage and{' '}
                    <code>{'{fridayDeposit}'}</code> for the Friday night percentage. Leave blank to use the default
                    wording.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-pink-light rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Payment Requirement</h2>
              <div className="space-y-4">
                <p className="text-sm text-brown-dark/80 mb-4">
                  Choose whether clients must pay a deposit or full payment to secure their appointment. This setting applies to all bookings.
                </p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all hover:bg-white/50"
                    style={{ borderColor: discounts.paymentRequirement === 'deposit' ? '#7C4B31' : '#E5D5C8' }}>
                    <input
                      type="radio"
                      name="paymentRequirement"
                      value="deposit"
                      checked={discounts.paymentRequirement === 'deposit'}
                      onChange={(e) =>
                        setDiscounts((prev) => ({
                          ...prev,
                          paymentRequirement: 'deposit',
                        }))
                      }
                      className="h-5 w-5 accent-brown-dark mt-1 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-brown-dark">Deposit Only</div>
                      <div className="text-sm text-brown-dark/70 mt-1">
                        Clients pay a {discounts.depositPercentage}% deposit (or {discounts.fridayNightDepositPercentage}% for Friday nights) to secure their appointment. Remaining balance is paid on appointment day.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all hover:bg-white/50"
                    style={{ borderColor: discounts.paymentRequirement === 'full' ? '#7C4B31' : '#E5D5C8' }}>
                    <input
                      type="radio"
                      name="paymentRequirement"
                      value="full"
                      checked={discounts.paymentRequirement === 'full'}
                      onChange={(e) =>
                        setDiscounts((prev) => ({
                          ...prev,
                          paymentRequirement: 'full',
                        }))
                      }
                      className="h-5 w-5 accent-brown-dark mt-1 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-brown-dark">Full Payment Required</div>
                      <div className="text-sm text-brown-dark/70 mt-1">
                        Clients must pay the full amount upfront to book their appointment. No deposit option available.
                      </div>
                    </div>
                  </label>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> When "Full Payment Required" is selected, clients can only complete bookings by paying via M-Pesa. The "Pay Later" option will not be available.
                  </p>
                </div>
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

