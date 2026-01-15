'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminBackButton from '@/components/AdminBackButton'

interface SpinWheelPrize {
  id: string
  label: string
  type: 'free_consultation' | 'discount_percentage' | 'free_service'
  value?: number
  serviceType?: string // Legacy field
  freeServiceId?: string // The product/service ID that will be free
  discountServiceId?: string // The product/service ID that will be discounted (for discount_percentage type)
  probability: number
  enabled: boolean
  order: number
}

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: string
}

interface SpinWheelSettings {
  enabled: boolean
  noticeText: string
  prizes: SpinWheelPrize[]
}

export default function SpinWheelAdminPage() {
  const [settings, setSettings] = useState<SpinWheelSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [services, setServices] = useState<WebService[]>([])

  useEffect(() => {
    loadSettings()
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      const response = await fetch('/api/labs/web-services', {
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/labs/spin-wheel/prizes', {
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/labs/spin-wheel/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const updatePrize = (id: string, updates: Partial<SpinWheelPrize>) => {
    if (!settings) return
    setSettings({
      ...settings,
      prizes: settings.prizes.map(p => p.id === id ? { ...p, ...updates } : p),
    })
  }

  const addPrize = () => {
    if (!settings) return
    const newPrize: SpinWheelPrize = {
      id: `prize-${Date.now()}`,
      label: 'New Prize',
      type: 'discount_percentage',
      value: 10,
      probability: 10,
      enabled: true,
      order: settings.prizes.length + 1,
    }
    setSettings({
      ...settings,
      prizes: [...settings.prizes, newPrize],
    })
  }

  const removePrize = (id: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      prizes: settings.prizes.filter(p => p.id !== id),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Failed to load settings</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <AdminBackButton />
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-display text-[var(--color-primary)]">
            🎡 Spin the Wheel Management
          </h1>
          <Link
            href="/admin/labs/spin-wheel/winners"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            🎉 View Winners
          </Link>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-6">Settings</h2>
          
          <div className="space-y-6">
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-lg font-semibold text-[var(--color-text)]">
                  Enable Spin the Wheel Feature
                </span>
              </label>
              <p className="text-sm text-[var(--color-text)]/70 mt-1 ml-8">
                When disabled, users cannot access the spin the wheel page and the notice section will be hidden
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Notice Text
              </label>
              <input
                type="text"
                value={settings.noticeText}
                onChange={(e) => setSettings({ ...settings, noticeText: e.target.value })}
                className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                placeholder="🎉 Spin the wheel to see what you can win!"
              />
              <p className="text-sm text-[var(--color-text)]/70 mt-1">
                This text appears in the notice section on the labs page
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-primary)]">Prizes</h2>
            <button
              onClick={addPrize}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              + Add Prize
            </button>
          </div>

          <div className="space-y-4">
            {settings.prizes
              .sort((a, b) => a.order - b.order)
              .map((prize) => (
                <div key={prize.id} className="border-2 border-[var(--color-primary)]/20 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Prize Label
                      </label>
                      <input
                        type="text"
                        value={prize.label}
                        onChange={(e) => updatePrize(prize.id, { label: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Prize Type
                      </label>
                      <select
                        value={prize.type}
                        onChange={(e) => updatePrize(prize.id, { type: e.target.value as any })}
                        className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg"
                      >
                        <option value="free_consultation">Free Consultation</option>
                        <option value="discount_percentage">Discount Percentage</option>
                        <option value="free_service">Free Service</option>
                      </select>
                    </div>

                    {prize.type === 'discount_percentage' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                            Discount Percentage (%)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={prize.value || 10}
                            onChange={(e) => updatePrize(prize.id, { value: parseInt(e.target.value) || 10 })}
                            className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg"
                          />
                          <p className="text-xs text-[var(--color-text)]/70 mt-1">
                            Percentage discount to apply
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                            Apply Discount To (Optional)
                          </label>
                          <select
                            value={prize.discountServiceId || ''}
                            onChange={(e) => updatePrize(prize.id, { discountServiceId: e.target.value || undefined })}
                            className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg"
                          >
                            <option value="">Entire Cart (Default)</option>
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name} - {service.price.toLocaleString()} KES ({service.category})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-[var(--color-text)]/70 mt-1">
                            Leave empty to apply discount to entire cart, or select a specific service to discount only that service.
                          </p>
                        </div>
                      </>
                    )}

                    {prize.type === 'free_service' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                          Free Service (Select which service will be free)
                        </label>
                        <select
                          value={prize.freeServiceId || prize.serviceType || ''}
                          onChange={(e) => updatePrize(prize.id, { freeServiceId: e.target.value, serviceType: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg"
                        >
                          <option value="">Select a service to make free</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} - {service.price.toLocaleString()} KES ({service.category})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-[var(--color-text)]/70 mt-1">
                          When a customer wins this prize and adds the selected service to their cart, it will be free (price = 0).
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={prize.order}
                        onChange={(e) => updatePrize(prize.id, { order: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Probability (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={prize.probability}
                        onChange={(e) => updatePrize(prize.id, { probability: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border-2 border-[var(--color-primary)]/20 rounded-lg"
                      />
                      <p className="text-xs text-[var(--color-text)]/70 mt-1">
                        Chance of winning this prize (0-100)
                      </p>
                    </div>

                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={prize.enabled}
                        onChange={(e) => updatePrize(prize.id, { enabled: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        Enabled
                      </span>
                    </label>
                    <button
                      onClick={() => removePrize(prize.id)}
                      className="text-red-600 hover:text-red-800 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Total probability of enabled prizes should add up to 100% for best results. 
              Current total (enabled only): {settings.prizes.filter(p => p.enabled).reduce((sum, p) => sum + p.probability, 0)}%
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

