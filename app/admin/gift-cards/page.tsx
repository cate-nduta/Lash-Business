'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import type { GiftCardData, GiftCard, GiftCardSettings } from '@/lib/gift-card-utils'

type Message = { type: 'success' | 'error'; text: string } | null

export default function AdminGiftCardsPage() {
  const router = useRouter()
  const [giftCards, setGiftCards] = useState<GiftCardData>({
    version: 1,
    updatedAt: null,
    cards: [],
    settings: {
      enabled: true,
      minAmount: 1000,
      maxAmount: 50000,
      defaultAmounts: [2000, 5000, 10000, 20000],
      expirationDays: 365,
      allowCustomAmount: true,
    },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isMounted = true

    const ensureAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', { credentials: 'include' })
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data?.authenticated) {
          router.replace('/admin/login')
          return
        }
        setAuthChecked(true)
        await loadGiftCards()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    ensureAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  const loadGiftCards = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/gift-cards', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load gift cards')
      }
      const data = (await response.json()) as GiftCardData
      setGiftCards(data)
    } catch (error) {
      console.error('Error loading gift cards:', error)
      setMessage({ type: 'error', text: 'Failed to load gift cards' })
    } finally {
      setLoading(false)
    }
  }

  const saveGiftCards = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'update',
          ...giftCards,
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to save gift cards')
      }
      const saved = (await response.json()) as { giftCards: GiftCardData }
      setGiftCards(saved.giftCards)
      setMessage({ type: 'success', text: 'Gift card settings saved successfully!' })
    } catch (error) {
      console.error('Error saving gift cards:', error)
      setMessage({ type: 'error', text: 'Failed to save gift cards' })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (updates: Partial<GiftCardSettings>) => {
    setGiftCards({
      ...giftCards,
      settings: { ...giftCards.settings, ...updates },
    })
  }

  const filteredCards = giftCards.cards.filter((card) => {
    if (filterStatus !== 'all' && card.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        card.code.toLowerCase().includes(query) ||
        card.purchasedBy.name.toLowerCase().includes(query) ||
        card.purchasedBy.email.toLowerCase().includes(query) ||
        (card.recipient?.name?.toLowerCase().includes(query) ?? false) ||
        (card.recipient?.email?.toLowerCase().includes(query) ?? false)
      )
    }
    return true
  })

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8 mb-6">
          <h1 className="text-3xl font-display text-brown-dark mb-2">Gift Card Management</h1>
          <p className="text-brown mb-6">
            Manage gift card settings and view all gift card transactions.
          </p>

          {/* Settings */}
          <div className="border-2 border-brown-light rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-brown-dark mb-4">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={giftCards.settings.enabled}
                  onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  className="w-5 h-5 text-brown-dark focus:ring-brown"
                />
                <label htmlFor="enabled" className="text-brown-dark font-medium">
                  Enable Gift Cards
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Minimum Amount (KES)
                  </label>
                  <input
                    type="number"
                    value={giftCards.settings.minAmount}
                    onChange={(e) => updateSettings({ minAmount: Number(e.target.value) })}
                    min="0"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Maximum Amount (KES)
                  </label>
                  <input
                    type="number"
                    value={giftCards.settings.maxAmount}
                    onChange={(e) => updateSettings({ maxAmount: Number(e.target.value) })}
                    min="0"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Expiration Days
                  </label>
                  <input
                    type="number"
                    value={giftCards.settings.expirationDays}
                    onChange={(e) => updateSettings({ expirationDays: Number(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="allowCustom"
                    checked={giftCards.settings.allowCustomAmount}
                    onChange={(e) => updateSettings({ allowCustomAmount: e.target.checked })}
                    className="w-5 h-5 text-brown-dark focus:ring-brown"
                  />
                  <label htmlFor="allowCustom" className="text-brown-dark font-medium">
                    Allow Custom Amounts
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Default Amounts (KES) - One per line
                </label>
                <textarea
                  value={giftCards.settings.defaultAmounts.join('\n')}
                  onChange={(e) => {
                    const amounts = e.target.value
                      .split('\n')
                      .map((line) => Number(line.trim()))
                      .filter((num) => !isNaN(num) && num > 0)
                    updateSettings({ defaultAmounts: amounts })
                  }}
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg"
                  placeholder="2000&#10;5000&#10;10000&#10;20000"
                />
              </div>
              <button
                onClick={saveGiftCards}
                disabled={saving}
                className="px-6 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Gift Cards List */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold text-brown-dark">
                All Gift Cards ({giftCards.cards.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search by code, name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border-2 border-brown-light rounded-lg"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 border-2 border-brown-light rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="redeemed">Redeemed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {filteredCards.length === 0 ? (
              <div className="text-center py-12 text-brown">
                {giftCards.cards.length === 0
                  ? 'No gift cards have been purchased yet.'
                  : 'No gift cards match your filters.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-brown-light/20">
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Code</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Purchased By</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Recipient</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Purchased</th>
                      <th className="text-left py-3 px-4 text-brown-dark font-semibold">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCards.map((card) => (
                      <tr key={card.id} className="border-b border-brown-light/30 hover:bg-brown-light/10">
                        <td className="py-3 px-4 font-mono font-semibold text-brown-dark">
                          {card.code}
                        </td>
                        <td className="py-3 px-4 text-brown">
                          {card.amount.toLocaleString()} KSH
                          {card.amount < card.originalAmount && (
                            <span className="text-sm text-brown/70 block">
                              (Original: {card.originalAmount.toLocaleString()} KSH)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              card.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : card.status === 'redeemed'
                                ? 'bg-blue-100 text-blue-700'
                                : card.status === 'expired'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-brown">
                          <div className="text-sm">{card.purchasedBy.name}</div>
                          <div className="text-xs text-brown/70">{card.purchasedBy.email}</div>
                        </td>
                        <td className="py-3 px-4 text-brown text-sm">
                          {card.recipient?.name || card.recipient?.email ? (
                            <>
                              {card.recipient.name && <div>{card.recipient.name}</div>}
                              {card.recipient.email && <div className="text-xs text-brown/70">{card.recipient.email}</div>}
                            </>
                          ) : (
                            <span className="text-brown/50">Self</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-brown text-sm">
                          {new Date(card.purchasedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-brown text-sm">
                          {new Date(card.expiresAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}
    </div>
  )
}

