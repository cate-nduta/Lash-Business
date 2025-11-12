'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

type TermsSection = {
  id: string
  title: string
  body: string
}

type TermsDocument = {
  version: number
  updatedAt: string | null
  sections: TermsSection[]
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const createEmptySection = (): TermsSection => ({
  id: `section-${Date.now()}`,
  title: '',
  body: '',
})

export default function AdminTermsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [terms, setTerms] = useState<TermsDocument>({
    version: 1,
    updatedAt: null,
    sections: [createEmptySection()],
  })
  const [originalTerms, setOriginalTerms] = useState<TermsDocument>(terms)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(terms) !== JSON.stringify(originalTerms),
    [terms, originalTerms],
  )

  useEffect(() => {
    let isMounted = true

    const checkAuthAndLoad = async () => {
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
        await loadTerms()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuthAndLoad()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const loadTerms = async () => {
    try {
      const response = await authorizedFetch('/api/admin/terms')
      if (!response.ok) {
        throw new Error('Failed to load terms')
      }
      const data: TermsDocument = await response.json()
      const sanitized: TermsDocument = {
        version: typeof data?.version === 'number' ? data.version : 1,
        updatedAt: data?.updatedAt ?? null,
        sections:
          Array.isArray(data?.sections) && data.sections.length > 0
            ? data.sections.map((section, index) => ({
                id:
                  typeof section?.id === 'string' && section.id.trim().length > 0
                    ? section.id
                    : `section-${index}`,
                title: section?.title ?? '',
                body: section?.body ?? '',
              }))
            : [createEmptySection()],
      }
      setTerms(sanitized)
      setOriginalTerms(sanitized)
    } catch (error) {
      console.error('Error loading terms:', error)
      setMessage({ type: 'error', text: 'Failed to load terms & conditions' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const updateSection = (index: number, key: 'title' | 'body', value: string) => {
    setTerms((prev) => {
      const sections = [...prev.sections]
      sections[index] = {
        ...sections[index],
        [key]: value,
      }
      return {
        ...prev,
        sections,
      }
    })
  }

  const addSection = () => {
    setTerms((prev) => ({
      ...prev,
      sections: [...prev.sections, createEmptySection()],
    }))
  }

  const removeSection = (index: number) => {
    setTerms((prev) => {
      if (prev.sections.length === 1) {
        return prev
      }
      const sections = prev.sections.filter((_, i) => i !== index)
      return {
        ...prev,
        sections,
      }
    })
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: terms.version + 1,
          sections: terms.sections,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save terms')
      }

      const data = await response.json()
      const saved: TermsDocument = data?.terms ?? terms
      setTerms(saved)
      setOriginalTerms(saved)
      setMessage({ type: 'success', text: 'Terms & Conditions updated successfully.' })
    } catch (error) {
      console.error('Error saving terms:', error)
      setMessage({ type: 'error', text: 'Failed to save Terms & Conditions.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading Terms & Conditions…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-brown-dark">Terms &amp; Conditions</h1>
            <p className="text-sm text-gray-600 mt-1">
              Keep clients informed with the latest booking, deposit, and studio policies. Updates appear
              instantly on the public Terms &amp; Conditions page.
            </p>
            {terms.updatedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {new Date(terms.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-sm transition-all ${
              saving || !hasUnsavedChanges
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-brown-dark text-white hover:bg-brown'
            }`}
          >
            {saving ? 'Saving…' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>

        {message && <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />}

        <div className="space-y-6">
          {terms.sections.map((section, index) => (
            <div
              key={section.id}
              className="bg-white border-2 border-brown-light rounded-xl shadow-soft p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brown-dark mb-1" htmlFor={`title-${section.id}`}>
                    Section Title
                  </label>
                  <input
                    id={`title-${section.id}`}
                    type="text"
                    value={section.title}
                    onChange={(event) => updateSection(index, 'title', event.target.value)}
                    placeholder="e.g. Deposits"
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    terms.sections.length === 1
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                  disabled={terms.sections.length === 1}
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-1" htmlFor={`body-${section.id}`}>
                  Section Content
                </label>
                <textarea
                  id={`body-${section.id}`}
                  value={section.body}
                  onChange={(event) => updateSection(index, 'body', event.target.value)}
                  rows={6}
                  placeholder="Write the policy details clients must accept…"
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark leading-relaxed"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4">
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-brown-dark text-brown-dark font-semibold hover:bg-brown-dark hover:text-white transition-all"
          >
            + Add Section
          </button>
          <span className="text-xs text-gray-500">
            Version {terms.version} • {terms.sections.length} section{terms.sections.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

    </div>
  )
}


