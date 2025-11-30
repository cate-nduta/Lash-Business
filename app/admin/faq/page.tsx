'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import type { FAQData, FAQItem } from '@/lib/faq-utils'

type Message = { type: 'success' | 'error'; text: string } | null

function createFAQItem(): FAQItem {
  const id = `faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    question: '',
    answer: '',
  }
}

export default function AdminFAQPage() {
  const router = useRouter()
  const [faq, setFAQ] = useState<FAQData>({ version: 1, updatedAt: null, questions: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message>(null)
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
        await loadFAQ()
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

  const loadFAQ = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/faq', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load FAQ')
      }
      const data = (await response.json()) as FAQData
      setFAQ(data)
    } catch (error) {
      console.error('Error loading FAQ:', error)
      setMessage({ type: 'error', text: 'Failed to load FAQ' })
    } finally {
      setLoading(false)
    }
  }

  const saveFAQ = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(faq),
      })
      if (!response.ok) {
        throw new Error('Failed to save FAQ')
      }
      const saved = (await response.json()) as FAQData
      setFAQ(saved)
      setMessage({ type: 'success', text: 'FAQ saved successfully!' })
    } catch (error) {
      console.error('Error saving FAQ:', error)
      setMessage({ type: 'error', text: 'Failed to save FAQ' })
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = () => {
    setFAQ({
      ...faq,
      questions: [...faq.questions, createFAQItem()],
    })
  }

  const removeQuestion = (index: number) => {
    setFAQ({
      ...faq,
      questions: faq.questions.filter((_, i) => i !== index),
    })
  }

  const updateQuestion = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faq.questions]
    updated[index] = { ...updated[index], [field]: value }
    setFAQ({ ...faq, questions: updated })
  }

  if (!authChecked || loading) {
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
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 md:p-8">
          <h1 className="text-3xl font-display text-brown-dark mb-2">FAQ Management</h1>
          <p className="text-brown mb-6">
            Manage frequently asked questions that appear on the policies page.
          </p>

          <div className="space-y-4 mb-6">
            {faq.questions.map((item, index) => (
              <div
                key={item.id}
                className="border-2 border-brown-light rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-brown-dark">Question {index + 1}</h3>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-1">
                    Question
                  </label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                    placeholder="Enter the question..."
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-1">Answer</label>
                  <textarea
                    value={item.answer}
                    onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                    placeholder="Enter the answer..."
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown resize-y"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={addQuestion}
              className="px-6 py-2 bg-brown-light text-brown-dark rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
            >
              + Add Question
            </button>
            <button
              onClick={saveFAQ}
              disabled={saving}
              className="px-6 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save FAQ'}
            </button>
          </div>

          {faq.updatedAt && (
            <p className="text-xs text-brown/70 mt-4">
              Last updated: {new Date(faq.updatedAt).toLocaleString()}
            </p>
          )}
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

