'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface PreAppointmentGuidelines {
  version: number
  updatedAt: string
  introText: string
  fineAmount: number
  doItems: string[]
  dontItems: string[]
}

export default function AdminPreAppointmentGuidelinesPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [guidelines, setGuidelines] = useState<PreAppointmentGuidelines>({
    version: 1,
    updatedAt: '',
    introText: '',
    fineAmount: 500,
    doItems: [],
    dontItems: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', { credentials: 'include' })
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        setAuthenticated(true)
        await loadGuidelines()
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

  const loadGuidelines = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/pre-appointment-guidelines', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load guidelines')
      }
      const data = await response.json()
      setGuidelines(data)
    } catch (error) {
      console.error('Error loading guidelines:', error)
      setMessage({ type: 'error', text: 'Failed to load guidelines' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const response = await fetch('/api/admin/pre-appointment-guidelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(guidelines),
      })

      if (!response.ok) {
        throw new Error('Failed to save guidelines')
      }

      const data = await response.json()
      setGuidelines(data.guidelines)
      setMessage({ type: 'success', text: 'Pre-appointment guidelines saved successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save guidelines' })
    } finally {
      setSaving(false)
    }
  }

  const addDoItem = () => {
    setGuidelines((prev) => ({
      ...prev,
      doItems: [...prev.doItems, ''],
    }))
  }

  const removeDoItem = (index: number) => {
    setGuidelines((prev) => ({
      ...prev,
      doItems: prev.doItems.filter((_, i) => i !== index),
    }))
  }

  const updateDoItem = (index: number, value: string) => {
    setGuidelines((prev) => ({
      ...prev,
      doItems: prev.doItems.map((item, i) => (i === index ? value : item)),
    }))
  }

  const addDontItem = () => {
    setGuidelines((prev) => ({
      ...prev,
      dontItems: [...prev.dontItems, ''],
    }))
  }

  const removeDontItem = (index: number) => {
    setGuidelines((prev) => ({
      ...prev,
      dontItems: prev.dontItems.filter((_, i) => i !== index),
    }))
  }

  const updateDontItem = (index: number, value: string) => {
    setGuidelines((prev) => ({
      ...prev,
      dontItems: prev.dontItems.map((item, i) => (i === index ? value : item)),
    }))
  }

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark font-semibold">
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-4">Pre-Appointment Guidelines</h1>
          <p className="text-brown mb-6">
            Edit the DO's and DON'Ts that clients see before their appointments. These guidelines help ensure the best results and a smooth experience.
          </p>

          {/* Intro Text */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-brown-dark mb-2">
              Introduction Text
            </label>
            <textarea
              value={guidelines.introText}
              onChange={(e) => setGuidelines((prev) => ({ ...prev, introText: e.target.value }))}
              className="w-full px-4 py-2 border border-brown-light rounded-lg focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              rows={3}
              placeholder="Introduction text that appears at the top of the page..."
            />
          </div>

          {/* Fine Amount */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-brown-dark mb-2">
              Fine Amount (KES)
            </label>
            <p className="text-xs text-gray-600 mb-2">
              The fine amount shown to clients when they agree to the pre-appointment guidelines. This appears in the booking page terms checkbox.
            </p>
            <input
              type="number"
              value={guidelines.fineAmount}
              onChange={(e) => {
                const value = Math.max(0, Number(e.target.value) || 0)
                setGuidelines((prev) => ({ ...prev, fineAmount: value }))
              }}
              min="0"
              step="50"
              className="w-full max-w-xs px-4 py-2 border border-brown-light rounded-lg focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              placeholder="500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current fine: {guidelines.fineAmount.toLocaleString()} KSH
            </p>
          </div>

          {/* DO Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display text-brown-dark">DO THIS Items</h2>
              <button
                onClick={addDoItem}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
              >
                + Add Item
              </button>
            </div>
            <div className="space-y-3">
              {guidelines.doItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-emerald-600 font-bold mt-2 flex-shrink-0">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateDoItem(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-brown-light rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter a DO item..."
                  />
                  <button
                    onClick={() => removeDoItem(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {guidelines.doItems.length === 0 && (
                <p className="text-gray-500 italic">No DO items yet. Click "Add Item" to add one.</p>
              )}
            </div>
          </div>

          {/* DON'T Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display text-brown-dark">DON'T DO THIS Items</h2>
              <button
                onClick={addDontItem}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-semibold"
              >
                + Add Item
              </button>
            </div>
            <div className="space-y-3">
              {guidelines.dontItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-rose-600 font-bold mt-2 flex-shrink-0">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateDontItem(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-brown-light rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    placeholder="Enter a DON'T item..."
                  />
                  <button
                    onClick={() => removeDontItem(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {guidelines.dontItems.length === 0 && (
                <p className="text-gray-500 italic">No DON'T items yet. Click "Add Item" to add one.</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-6 border-t border-brown-light">
            <Link
              href="/before-your-appointment"
              target="_blank"
              className="px-6 py-2 border border-brown-light text-brown-dark rounded-lg hover:bg-brown-light/20 transition-colors"
            >
              Preview Page
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {saving ? 'Saving...' : 'Save Guidelines'}
            </button>
          </div>

          {guidelines.updatedAt && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Last updated: {new Date(guidelines.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

