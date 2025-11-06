'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

interface PromoCode {
  code: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase?: number
  maxDiscount?: number | null
  validFrom: string
  validUntil: string
  usageLimit?: number | null
  usedCount: number
  active: boolean
}

export default function AdminPromoCodes() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [originalPromoCodes, setOriginalPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(promoCodes) !== JSON.stringify(originalPromoCodes)

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadPromoCodes()
        }
      })
  }, [router])

  const loadPromoCodes = async () => {
    try {
      const response = await fetch('/api/admin/promo-codes')
      if (response.ok) {
        const data = await response.json()
        setPromoCodes(data.promoCodes || [])
        setOriginalPromoCodes(data.promoCodes || [])
      }
    } catch (error) {
      console.error('Error loading promo codes:', error)
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
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCodes }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Promo codes updated successfully!' })
        setOriginalPromoCodes(promoCodes) // Update original to clear unsaved changes flag
        setShowDialog(false) // Close dialog if open
      } else {
        setMessage({ type: 'error', text: 'Failed to save promo codes' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const addPromoCode = () => {
    setPromoCodes([
      ...promoCodes,
      {
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        minPurchase: 0,
        maxDiscount: null,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: null,
        usedCount: 0,
        active: true,
      },
    ])
  }

  const updatePromoCode = (index: number, field: keyof PromoCode, value: any) => {
    setPromoCodes((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removePromoCode = (index: number) => {
    setPromoCodes((prev) => prev.filter((_, i) => i !== index))
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
      <div className="max-w-6xl mx-auto">
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
          <div className="flex gap-4">
            <button
              onClick={addPromoCode}
              className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors"
            >
              + Add Promo Code
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Promo Codes Management</h1>
          <div className="space-y-6">
            {promoCodes.map((promo, index) => (
              <div key={index} className="bg-pink-light rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Code *</label>
                    <input
                      type="text"
                      value={promo.code}
                      onChange={(e) => updatePromoCode(index, 'code', e.target.value.toUpperCase())}
                      placeholder="REFER10"
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Description</label>
                    <input
                      type="text"
                      value={promo.description}
                      onChange={(e) => updatePromoCode(index, 'description', e.target.value)}
                      placeholder="10% off for referrals"
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Discount Type</label>
                    <select
                      value={promo.discountType}
                      onChange={(e) => updatePromoCode(index, 'discountType', e.target.value)}
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount (KSH)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Discount Value *</label>
                    <input
                      type="number"
                      value={promo.discountValue}
                      onChange={(e) => updatePromoCode(index, 'discountValue', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Min Purchase (KSH)</label>
                    <input
                      type="number"
                      value={promo.minPurchase || 0}
                      onChange={(e) => updatePromoCode(index, 'minPurchase', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Max Discount (KSH, leave empty for no limit)</label>
                    <input
                      type="number"
                      value={promo.maxDiscount || ''}
                      onChange={(e) => updatePromoCode(index, 'maxDiscount', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Valid From *</label>
                    <input
                      type="date"
                      value={promo.validFrom}
                      onChange={(e) => updatePromoCode(index, 'validFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Valid Until *</label>
                    <input
                      type="date"
                      value={promo.validUntil}
                      onChange={(e) => updatePromoCode(index, 'validUntil', e.target.value)}
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-1">Usage Limit (leave empty for unlimited)</label>
                    <input
                      type="number"
                      value={promo.usageLimit || ''}
                      onChange={(e) => updatePromoCode(index, 'usageLimit', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Unlimited"
                      className="w-full px-3 py-2 border border-brown-light rounded bg-white"
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={promo.active}
                        onChange={(e) => updatePromoCode(index, 'active', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-brown-dark">Active</span>
                    </label>
                    <div className="text-sm text-brown">
                      Used: {promo.usedCount} {promo.usageLimit ? `/ ${promo.usageLimit}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removePromoCode(index)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            {promoCodes.length === 0 && (
              <div className="text-center text-brown py-8">
                No promo codes yet. Click "Add Promo Code" to create one.
              </div>
            )}
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

