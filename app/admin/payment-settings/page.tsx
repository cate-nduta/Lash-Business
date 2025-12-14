'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import type { PaymentLink, PaymentSettings } from '@/app/api/admin/payment-settings/route'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `payment-${Math.random().toString(36).slice(2, 10)}`
}

const blankPaymentLink = (): PaymentLink => ({
  id: generateId(),
  name: 'New Payment Link',
  type: 'stripe',
  url: '',
  instructions: '',
  enabled: true,
  order: 0,
})

export default function AdminPaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>({
    paymentLinks: [],
    checkoutInstructions: '',
    defaultPaymentMethod: null,
    showPaymentInstructions: true,
    paymentInstructionsTitle: 'Payment Instructions',
  })
  const [originalSettings, setOriginalSettings] = useState<PaymentSettings>({
    paymentLinks: [],
    checkoutInstructions: '',
    defaultPaymentMethod: null,
    showPaymentInstructions: true,
    paymentInstructionsTitle: 'Payment Instructions',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set())
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
      const response = await authorizedFetch('/api/admin/payment-settings')
      if (!response.ok) {
        throw new Error('Failed to load payment settings')
      }
      const data: PaymentSettings = await response.json()
      setSettings(data)
      setOriginalSettings(data)
      // Expand all links by default
      setExpandedLinks(new Set(data.paymentLinks.map(link => link.id)))
    } catch (error) {
      console.error('Error loading payment settings:', error)
      setMessage({ type: 'error', text: 'Failed to load payment settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save payment settings')
      }

      const result = await response.json()
      setOriginalSettings(result.settings || settings)
      setMessage({ type: 'success', text: 'Payment settings saved successfully!' })
    } catch (error: any) {
      console.error('Error saving payment settings:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save payment settings' })
    } finally {
      setSaving(false)
    }
  }

  const toggleLinkExpanded = (linkId: string) => {
    setExpandedLinks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(linkId)) {
        newSet.delete(linkId)
      } else {
        newSet.add(linkId)
      }
      return newSet
    })
  }

  const addPaymentLink = () => {
    const newLink = blankPaymentLink()
    const maxOrder = settings.paymentLinks.length > 0
      ? Math.max(...settings.paymentLinks.map(l => l.order))
      : -1
    newLink.order = maxOrder + 1
    setSettings(prev => ({
      ...prev,
      paymentLinks: [...prev.paymentLinks, newLink],
    }))
    setExpandedLinks(prev => new Set([...Array.from(prev), newLink.id]))
  }

  const removePaymentLink = (linkId: string) => {
    if (!confirm('Are you sure you want to remove this payment link?')) return
    setSettings(prev => ({
      ...prev,
      paymentLinks: prev.paymentLinks.filter(link => link.id !== linkId),
    }))
    setExpandedLinks(prev => {
      const newSet = new Set(prev)
      newSet.delete(linkId)
      return newSet
    })
  }

  const updatePaymentLink = (linkId: string, updates: Partial<PaymentLink>) => {
    setSettings(prev => ({
      ...prev,
      paymentLinks: prev.paymentLinks.map(link =>
        link.id === linkId ? { ...link, ...updates } : link
      ),
    }))
  }

  const moveLink = (linkId: string, direction: 'up' | 'down') => {
    setSettings(prev => {
      const links = [...prev.paymentLinks]
      const index = links.findIndex(link => link.id === linkId)
      if (index === -1) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === links.length - 1) return prev

      const newIndex = direction === 'up' ? index - 1 : index + 1
      ;[links[index], links[newIndex]] = [links[newIndex], links[index]]
      
      // Update orders
      links.forEach((link, idx) => {
        link.order = idx
      })

      return {
        ...prev,
        paymentLinks: links,
      }
    })
  }

  const sortedLinks = [...settings.paymentLinks].sort((a, b) => a.order - b.order)

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading payment settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display text-brown mb-2">Payment & Checkout Settings</h1>
          <p className="text-gray-600">Configure payment links and checkout instructions</p>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        {/* Payment Links */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display text-brown">Payment Links</h2>
            <button
              onClick={addPaymentLink}
              className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              + Add Payment Link
            </button>
          </div>

          {sortedLinks.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No payment links yet. Click "Add Payment Link" to create one.</p>
          ) : (
            <div className="space-y-4">
              {sortedLinks.map((link, index) => {
                const isExpanded = expandedLinks.has(link.id)
                return (
                  <div
                    key={link.id}
                    className="border-2 border-brown-light rounded-lg overflow-hidden"
                  >
                    <div
                      className="bg-brown-light/20 p-4 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleLinkExpanded(link.id)}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLink(link.id, 'up')
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
                            moveLink(link.id, 'down')
                          }}
                          disabled={index === sortedLinks.length - 1}
                          className="text-brown hover:text-brown-dark disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <h3 className="text-xl font-semibold text-brown">{link.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          link.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {link.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-brown-dark/10 text-brown-dark">
                          {link.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removePaymentLink(link.id)
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
                          <label className="block font-semibold text-gray-700 mb-2">Link Name:</label>
                          <input
                            type="text"
                            value={link.name}
                            onChange={(e) => updatePaymentLink(link.id, { name: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                            placeholder="e.g., Stripe Payment, PayPal Checkout"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Payment Type:</label>
                          <select
                            value={link.type}
                            onChange={(e) => updatePaymentLink(link.id, { type: e.target.value as PaymentLink['type'] })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          >
                            <option value="stripe">Stripe</option>
                            <option value="paypal">PayPal</option>
                            <option value="bank-transfer">Bank Transfer</option>
                            <option value="mpesa">M-Pesa</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Payment URL/Link:</label>
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => updatePaymentLink(link.id, { url: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                            placeholder="https://pay.stripe.com/... or https://paypal.me/..."
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the full payment link URL (Stripe payment link, PayPal.me link, bank details, etc.)
                          </p>
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-2">Payment Instructions (Optional):</label>
                          <textarea
                            value={link.instructions || ''}
                            onChange={(e) => updatePaymentLink(link.id, { instructions: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                            rows={3}
                            placeholder="Add any specific instructions for this payment method..."
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`enabled-${link.id}`}
                            checked={link.enabled}
                            onChange={(e) => updatePaymentLink(link.id, { enabled: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <label htmlFor={`enabled-${link.id}`} className="font-semibold text-gray-700">
                            Enable this payment link
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Checkout Instructions */}
        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 mb-6">
          <h2 className="text-2xl font-display text-brown mb-4">Checkout Instructions</h2>
          
          <div className="mb-4">
            <label className="block font-semibold text-gray-700 mb-2">Instructions Title:</label>
            <input
              type="text"
              value={settings.paymentInstructionsTitle}
              onChange={(e) => setSettings(prev => ({ ...prev, paymentInstructionsTitle: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
              placeholder="Payment Instructions"
            />
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-gray-700 mb-2">Checkout Instructions:</label>
            <textarea
              value={settings.checkoutInstructions}
              onChange={(e) => setSettings(prev => ({ ...prev, checkoutInstructions: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
              rows={6}
              placeholder="Enter general payment instructions that will be shown during checkout. This can include payment terms, processing times, refund policies, etc."
            />
            <p className="text-xs text-gray-500 mt-1">
              These instructions will be displayed to customers during checkout
            </p>
          </div>

          <div className="mb-4">
            <label className="block font-semibold text-gray-700 mb-2">Default Payment Method:</label>
            <select
              value={settings.defaultPaymentMethod || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, defaultPaymentMethod: e.target.value as PaymentSettings['defaultPaymentMethod'] || null }))}
              className="w-full px-4 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
            >
              <option value="">None (show all enabled methods)</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="mpesa">M-Pesa</option>
              <option value="manual">Manual Payment</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPaymentInstructions"
              checked={settings.showPaymentInstructions}
              onChange={(e) => setSettings(prev => ({ ...prev, showPaymentInstructions: e.target.checked }))}
              className="w-5 h-5"
            />
            <label htmlFor="showPaymentInstructions" className="font-semibold text-gray-700">
              Show payment instructions during checkout
            </label>
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

