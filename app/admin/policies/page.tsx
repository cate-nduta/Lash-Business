'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import type { PolicyData, PolicySection, PolicyVariables } from '@/lib/policies-types'
import { POLICY_VARIABLE_CONFIG } from '@/lib/policies-constants'

type Message = { type: 'success' | 'error'; text: string } | null

const emptyPolicies: PolicyData = {
  version: 1,
  updatedAt: '',
  introText: '',
  variables: {
    cancellationWindowHours: 72,
    depositPercentage: 35,
    referralDiscountPercent: 10,
    referralRewardPercent: 10,
    salonCommissionEarlyPercent: 0.75,
    salonCommissionFinalPercent: 2.25,
    salonCommissionTotalPercent: 3,
  },
  sections: [],
}

const READ_ONLY_VARIABLE_KEYS = new Set(
  POLICY_VARIABLE_CONFIG.filter((config) => config.readOnly).map((config) => config.key),
)

function createSection(): PolicySection {
  const id = `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    title: 'New Section',
    description: '',
    items: [''],
  }
}

export default function AdminPoliciesPage() {
  const router = useRouter()
  const [policies, setPolicies] = useState<PolicyData>(emptyPolicies)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

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
        await loadPolicies()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    ensureAuth()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/policies', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load policies')
      }
      const data = (await response.json()) as PolicyData
      data.introText = data.introText || ''
      data.sections = data.sections.map((section) => ({
        ...section,
        description: section.description ?? '',
        items: Array.isArray(section.items) && section.items.length > 0 ? section.items : [''],
      }))
      setPolicies(data)
    } catch (error) {
      console.error('Error loading policies:', error)
      setMessage({ type: 'error', text: 'Failed to load policies.' })
    } finally {
      setLoading(false)
    }
  }

  const markDirty = () => setHasUnsavedChanges(true)

  const handleVariableChange = (key: keyof PolicyVariables, value: string) => {
    if (READ_ONLY_VARIABLE_KEYS.has(key)) {
      return
    }
    const numeric = Number(value)
    setPolicies((prev) => ({
      ...prev,
      variables: {
        ...prev.variables,
        [key]: Number.isFinite(numeric) ? numeric : prev.variables[key],
      },
    }))
    markDirty()
  }

  const handleSectionChange = (sectionId: string, field: keyof PolicySection, value: string) => {
    setPolicies((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              [field]: value,
            }
          : section,
      ),
    }))
    markDirty()
  }

  const handleItemChange = (sectionId: string, index: number, value: string) => {
    setPolicies((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item, idx) => (idx === index ? value : item)),
            }
          : section,
      ),
    }))
    markDirty()
  }

  const handleAddItem = (sectionId: string) => {
    setPolicies((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: [...section.items, ''] }
          : section,
      ),
    }))
    markDirty()
  }

  const handleRemoveItem = (sectionId: string, index: number) => {
    setPolicies((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.filter((_, idx) => idx !== index),
            }
          : section,
      ),
    }))
    markDirty()
  }

  const handleAddSection = () => {
    setPolicies((prev) => ({
      ...prev,
      sections: [...prev.sections, createSection()],
    }))
    markDirty()
  }

  const handleRemoveSection = (sectionId: string) => {
    setPolicies((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }))
    markDirty()
  }

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    setPolicies((prev) => {
      const index = prev.sections.findIndex((section) => section.id === sectionId)
      if (index === -1) return prev
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.sections.length) return prev
      const updated = [...prev.sections]
      const [moved] = updated.splice(index, 1)
      updated.splice(newIndex, 0, moved)
      return { ...prev, sections: updated }
    })
    markDirty()
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const payload: Partial<PolicyData> = {
        version: policies.version,
        introText: policies.introText?.trim() || '',
        variables: policies.variables,
        sections: policies.sections.map((section) => ({
          ...section,
          items: section.items.map((item) => item.trim()).filter((item) => item.length > 0),
          description: section.description?.trim() ?? '',
        })),
      }

      const response = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save policies')
      }

      const savedPolicies = (data?.policies || payload) as PolicyData
      savedPolicies.introText = savedPolicies.introText || ''
      savedPolicies.sections = savedPolicies.sections.map((section) => ({
        ...section,
        description: section.description ?? '',
        items: Array.isArray(section.items) && section.items.length > 0 ? section.items : [''],
      }))

      setPolicies(savedPolicies)
      setMessage({ type: 'success', text: 'Policies updated successfully.' })
      setHasUnsavedChanges(false)
    } catch (error: any) {
      console.error('Error saving policies:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save policies.' })
    } finally {
      setSaving(false)
    }
  }

  const handleLinkNavigation = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!hasUnsavedChanges) {
      return
    }
    event.preventDefault()
    setPendingNavigation(href)
    setShowUnsavedDialog(true)
  }

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const formattedUpdatedAt =
    policies.updatedAt && new Date(policies.updatedAt).toString() !== 'Invalid Date'
      ? new Date(policies.updatedAt).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      {message && (
        <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
      )}

      {showUnsavedDialog && (
        <UnsavedChangesDialog
          isOpen={showUnsavedDialog}
          onCancel={() => {
            setShowUnsavedDialog(false)
            setPendingNavigation(null)
          }}
          onLeave={handleLeaveWithoutSaving}
          onSave={async () => {
            const destination = pendingNavigation
            await handleSave()
            setShowUnsavedDialog(false)
            if (destination) {
              setPendingNavigation(null)
              router.push(destination)
            }
          }}
          saving={saving}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Link
            href="/admin/dashboard"
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkNavigation(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddSection}
              className="px-4 py-2 rounded-lg border-2 border-brown-light text-brown-dark hover:border-brown-dark hover:text-brown-dark transition"
            >
              + Add Section
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brown-dark text-white hover:bg-brown focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Saving...' : 'Save Policies'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <div>
            <h1 className="text-4xl font-display text-brown-dark mb-2">Policies & Guidelines</h1>
            <p className="text-brown">
              Update the policies that appear on the public "Policies" page. Use the merge tags (for
              example{' '}
              <code className="bg-baby-pink/70 px-1 rounded">
                {'{{cancellationWindowHours}}'}
              </code>
              ) to insert live values anywhere in your copy.
            </p>
            {formattedUpdatedAt && (
              <p className="mt-2 text-sm text-brown/70">
                Last published {formattedUpdatedAt}
              </p>
            )}
          </div>

          <section className="border border-brown-light/60 rounded-xl p-6 space-y-4 bg-baby-pink/30">
            <h2 className="text-2xl font-display text-brown-dark">Introduction Text</h2>
            <p className="text-sm text-brown/80">
              This text appears below the "Our Policies" heading on the public policies page.
            </p>
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Introduction Text
              </label>
              <textarea
                rows={3}
                value={policies.introText || ''}
                onChange={(event) => {
                  setPolicies((prev) => ({ ...prev, introText: event.target.value }))
                  markDirty()
                }}
                placeholder="These guidelines keep appointments running smoothly..."
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition"
              />
            </div>
          </section>

          <section className="border border-brown-light/60 rounded-xl p-6 space-y-4 bg-baby-pink/30">
            <h2 className="text-2xl font-display text-brown-dark">Policy Variables</h2>
            <p className="text-sm text-brown/80">
              These values power the percentages and timeframes referenced throughout your policy
              copy.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              {POLICY_VARIABLE_CONFIG.map(({ key, label, helperText, min, step, readOnly, manageLink }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">{label}</label>
                  <input
                    type="number"
                    min={min}
                    step={step}
                    value={policies.variables[key]}
                    onChange={(event) => handleVariableChange(key, event.target.value)}
                    disabled={readOnly}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition disabled:cursor-not-allowed disabled:bg-baby-pink/30 disabled:border-brown-light/60 disabled:text-brown/70"
                  />
                  <p className="text-xs text-brown/70 mt-1">{helperText}</p>
                  {readOnly && (
                    <p className="text-xs text-emerald-700 font-medium mt-2">
                      Update this from{' '}
                      <Link href={manageLink || '/admin/discounts'} className="underline underline-offset-2">
                        Discounts &amp; Deposits
                      </Link>{' '}
                      so the correct deposit appears everywhere.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-white/80 border border-brown-light/60 px-4 py-3 text-sm text-brown-dark">
              <p className="font-semibold text-brown-dark mb-1">Available merge tags</p>
              <div className="flex flex-wrap gap-2">
                {POLICY_VARIABLE_CONFIG.map(({ key }) => (
                  <span
                    key={key}
                    className="px-2 py-1 bg-baby-pink-light rounded-full border border-brown-light text-xs font-mono text-brown-dark"
                  >
                    &#123;&#123;{key}&#125;&#125;
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {policies.sections.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-brown-light bg-white/60 px-6 py-12 text-center text-brown">
                <p>No policy sections yet. Click “Add Section” to get started.</p>
              </div>
            )}

            {policies.sections.map((section, sectionIndex) => (
              <div
                key={section.id}
                className="border border-brown-light rounded-xl bg-white/90 shadow-sm"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-brown-light/50 bg-baby-pink/30">
                  <div>
                    <h3 className="text-xl font-display text-brown-dark">
                      Section {sectionIndex + 1}
                    </h3>
                    <p className="text-xs text-brown/70">
                      Use merge tags to keep numbers in sync, e.g.{' '}
                      <code className="bg-baby-pink-light px-1 rounded">
                        {'{{depositPercentage}}'}
                      </code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveSection(section.id, 'up')}
                      className="px-3 py-2 border border-brown-light rounded-md text-sm text-brown-dark hover:border-brown-dark disabled:opacity-40"
                      disabled={sectionIndex === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSection(section.id, 'down')}
                      className="px-3 py-2 border border-brown-light rounded-md text-sm text-brown-dark hover:border-brown-dark disabled:opacity-40"
                      disabled={sectionIndex === policies.sections.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(section.id)}
                      className="px-3 py-2 border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-brown-dark mb-2">
                      Section title
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(event) => handleSectionChange(section.id, 'title', event.target.value)}
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brown-dark mb-2">
                      Optional intro
                    </label>
                    <textarea
                      rows={2}
                      value={section.description ?? ''}
                      onChange={(event) =>
                        handleSectionChange(section.id, 'description', event.target.value)
                      }
                      placeholder="Short paragraph before the bullet list (optional)"
                      className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-brown-dark uppercase tracking-[0.08em]">
                        Bullet points
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleAddItem(section.id)}
                        className="text-sm text-brown-dark hover:underline"
                      >
                        + Add bullet
                      </button>
                    </div>

                    {section.items.map((item, itemIndex) => (
                      <div key={`${section.id}-item-${itemIndex}`} className="flex gap-3">
                        <textarea
                          rows={2}
                          value={item}
                          onChange={(event) =>
                            handleItemChange(section.id, itemIndex, event.target.value)
                          }
                          className="flex-1 px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark transition"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(section.id, itemIndex)}
                          className="px-3 py-2 border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50"
                          disabled={section.items.length <= 1}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleAddSection}
              className="px-4 py-2 rounded-lg border-2 border-brown-light text-brown-dark hover:border-brown-dark hover:text-brown-dark transition"
            >
              + Add Section
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brown-dark text-white hover:bg-brown focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Saving...' : 'Save Policies'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

