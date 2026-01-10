'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import type { LabsFAQData, LabsFAQItem } from '@/lib/labs-faq-utils'

type Message = { type: 'success' | 'error'; text: string } | null

function createLabsFAQItem(category: string = 'General'): LabsFAQItem {
  const id = `labs-faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    question: '',
    answer: '',
    category: category,
    order: 0,
  }
}

export default function AdminLabsFAQPage() {
  const router = useRouter()
  const [faq, setFAQ] = useState<LabsFAQData>({ version: 1, updatedAt: null, questions: [], categories: ['General'] })
  const [newCategoryName, setNewCategoryName] = useState<string>('')
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
      const response = await fetch('/api/admin/labs-faq', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load Labs FAQ')
      }
      const data = (await response.json()) as LabsFAQData
      // Ensure categories array exists
      if (!data.categories || data.categories.length === 0) {
        const allCategories = new Set<string>(['General'])
        data.questions.forEach(q => {
          if (q.category) allCategories.add(q.category)
        })
        data.categories = Array.from(allCategories)
      }
      setFAQ(data)
    } catch (error) {
      console.error('Error loading Labs FAQ:', error)
      setMessage({ type: 'error', text: 'Failed to load Labs FAQ' })
    } finally {
      setLoading(false)
    }
  }

  const saveFAQ = async () => {
    try {
      setSaving(true)
      
      // Ensure categories array exists and is populated
      const allCategories = new Set<string>(faq.categories || [])
      faq.questions.forEach(q => {
        if (q.category) {
          allCategories.add(q.category)
        }
      })
      
      const categoriesList = Array.from(allCategories)
      
      // Recalculate order based on current array position within each category
      const questionsWithOrder = faq.questions.map((q, index) => ({
        ...q,
        category: q.category || 'General',
        order: index + 1,
      }))

      const response = await fetch('/api/admin/labs-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...faq, questions: questionsWithOrder, categories: categoriesList }),
      })
      if (!response.ok) {
        throw new Error('Failed to save Labs FAQ')
      }
      const saved = (await response.json()) as LabsFAQData
      setFAQ(saved)
      setMessage({ type: 'success', text: 'Labs FAQ saved successfully!' })
    } catch (error) {
      console.error('Error saving Labs FAQ:', error)
      setMessage({ type: 'error', text: 'Failed to save Labs FAQ' })
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = (category: string = 'General') => {
    const maxOrder = faq.questions.length > 0 
      ? Math.max(...faq.questions.map(q => q.order || 0))
      : 0
    const newItem = createLabsFAQItem(category)
    newItem.order = maxOrder + 1
    setFAQ({
      ...faq,
      questions: [...faq.questions, newItem],
    })
  }

  const addCategory = () => {
    if (!newCategoryName.trim()) return
    
    const categoryName = newCategoryName.trim()
    if (faq.categories?.includes(categoryName)) {
      setMessage({ type: 'error', text: 'Category already exists' })
      return
    }
    
    setFAQ({
      ...faq,
      categories: [...(faq.categories || []), categoryName],
    })
    setNewCategoryName('')
  }

  const removeCategory = (categoryName: string) => {
    if (categoryName === 'General') {
      setMessage({ type: 'error', text: 'Cannot remove the default "General" category' })
      return
    }
    
    // Move questions from this category to "General"
    const updatedQuestions = faq.questions.map(q => ({
      ...q,
      category: q.category === categoryName ? 'General' : q.category,
    }))
    
    setFAQ({
      ...faq,
      categories: (faq.categories || []).filter(c => c !== categoryName),
      questions: updatedQuestions,
    })
  }

  const reorderCategory = (categoryName: string, direction: 'up' | 'down') => {
    const categories = [...(faq.categories || [])]
    const index = categories.indexOf(categoryName)
    if (index === -1) return
    
    if (direction === 'up' && index > 0) {
      [categories[index - 1], categories[index]] = [categories[index], categories[index - 1]]
    } else if (direction === 'down' && index < categories.length - 1) {
      [categories[index], categories[index + 1]] = [categories[index + 1], categories[index]]
    }
    
    setFAQ({ ...faq, categories })
  }

  const removeQuestion = (index: number) => {
    setFAQ({
      ...faq,
      questions: faq.questions.filter((_, i) => i !== index),
    })
  }

  const updateQuestion = (index: number, field: 'question' | 'answer' | 'category', value: string) => {
    const updated = [...faq.questions]
    updated[index] = { ...updated[index], [field]: value }
    setFAQ({ ...faq, questions: updated })
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const updated = [...faq.questions]
    if (direction === 'up' && index > 0) {
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    } else if (direction === 'down' && index < updated.length - 1) {
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    }
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
          <h1 className="text-3xl font-display text-brown-dark mb-2">LashDiary Labs FAQ Management</h1>
          <p className="text-brown mb-6">
            Manage frequently asked questions grouped by categories. Questions will be displayed grouped by category on the FAQ page.
          </p>

          {/* Categories Management Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-xl font-semibold text-brown-dark mb-4">Categories</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {(faq.categories || ['General']).map((category, catIndex) => (
                <div
                  key={category}
                  className="flex items-center gap-2 bg-brown-light px-3 py-2 rounded-lg"
                >
                  <span className="text-brown-dark font-medium">{category}</span>
                  {category !== 'General' && (
                    <>
                      <button
                        onClick={() => reorderCategory(category, 'up')}
                        disabled={catIndex === 0}
                        className="px-1 py-0.5 text-xs bg-brown-dark text-white rounded hover:bg-brown disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move category up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => reorderCategory(category, 'down')}
                        disabled={catIndex === (faq.categories || []).length - 1}
                        className="px-1 py-0.5 text-xs bg-brown-dark text-white rounded hover:bg-brown disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move category down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeCategory(category)}
                        className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        title="Remove category"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCategory()
                  }
                }}
                placeholder="Enter new category name..."
                className="flex-1 px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
              <button
                onClick={addCategory}
                className="px-4 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors"
              >
                Add Category
              </button>
            </div>
          </div>

          {/* Questions Grouped by Category */}
          {(faq.categories || ['General']).map((category) => {
            const categoryQuestions = faq.questions.filter(q => (q.category || 'General') === category)
            return (
              <div key={category} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-brown-dark">{category}</h2>
                  <button
                    onClick={() => addQuestion(category)}
                    className="px-4 py-2 bg-brown-light text-brown-dark rounded-lg font-semibold hover:bg-brown-light/80 transition-colors text-sm"
                  >
                    + Add Question to {category}
                  </button>
                </div>
                
                {categoryQuestions.length === 0 ? (
                  <div className="text-center py-4 text-brown/70 bg-brown-light/20 rounded-lg border border-brown-light">
                    <p>No questions in this category yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categoryQuestions.map((item, localIndex) => {
                      const globalIndex = faq.questions.findIndex(q => q.id === item.id)
                      return (
                        <div
                          key={item.id}
                          className="border-2 border-brown-light rounded-lg p-4 space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-brown-dark">Question {localIndex + 1}</h3>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => moveQuestion(globalIndex, 'up')}
                                  disabled={globalIndex === 0 || faq.questions[globalIndex - 1]?.category !== category}
                                  className="px-2 py-1 text-xs bg-brown-light text-brown-dark rounded hover:bg-brown-light/80 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move up within category"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => moveQuestion(globalIndex, 'down')}
                                  disabled={globalIndex === faq.questions.length - 1 || faq.questions[globalIndex + 1]?.category !== category}
                                  className="px-2 py-1 text-xs bg-brown-light text-brown-dark rounded hover:bg-brown-light/80 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move down within category"
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => removeQuestion(globalIndex)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brown-dark mb-1">
                              Category
                            </label>
                            <select
                              value={item.category || 'General'}
                              onChange={(e) => updateQuestion(globalIndex, 'category', e.target.value)}
                              className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                            >
                              {(faq.categories || ['General']).map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brown-dark mb-1">
                              Question
                            </label>
                            <input
                              type="text"
                              value={item.question}
                              onChange={(e) => updateQuestion(globalIndex, 'question', e.target.value)}
                              placeholder="Enter the question..."
                              className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-brown-dark mb-1">Answer</label>
                            <textarea
                              value={item.answer}
                              onChange={(e) => updateQuestion(globalIndex, 'answer', e.target.value)}
                              placeholder="Enter the answer..."
                              rows={4}
                              className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown resize-y"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {faq.questions.length === 0 && (
            <div className="text-center py-8 text-brown/70 mb-6">
              <p>No FAQ questions yet. Click "Add Question to [Category]" to get started.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              onClick={saveFAQ}
              disabled={saving || faq.questions.length === 0}
              className="px-6 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Labs FAQ'}
            </button>
          </div>

          {faq.updatedAt && (
            <p className="text-xs text-brown/70 mt-4">
              Last updated: {new Date(faq.updatedAt).toLocaleString()}
            </p>
          )}

          <div className="mt-6 p-4 bg-brown-light/20 border border-brown-light rounded-lg">
            <p className="text-sm text-brown-dark">
              <strong>Preview:</strong> Visit <Link href="/labs/faq" target="_blank" className="text-brown-dark underline hover:text-brown">/labs/faq</Link> to see how your FAQ will appear to clients.
            </p>
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

