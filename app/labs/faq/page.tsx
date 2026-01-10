'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { LabsFAQData } from '@/lib/labs-faq-utils'

export default function LabsFAQPage() {
  const [faq, setFAQ] = useState<LabsFAQData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const loadFAQ = async () => {
      try {
        const response = await fetch('/api/labs/faq', {
          cache: 'no-store',
        })
        if (response.ok) {
          const data = (await response.json()) as LabsFAQData
          // Ensure categories array exists for grouping
          if (!data.categories || data.categories.length === 0) {
            const allCategories = new Set<string>(['General'])
            data.questions.forEach(q => {
              if (q.category) allCategories.add(q.category)
            })
            data.categories = Array.from(allCategories)
          }
          setFAQ(data)
        }
      } catch (error) {
        console.error('Error loading Labs FAQ:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFAQ()
  }, [])

  const toggleQuestion = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-brown-dark">Loading FAQ...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!faq || faq.questions.length === 0) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
            <h1 className="text-3xl font-display text-brown-dark mb-4">LashDiary Labs FAQ</h1>
            <p className="text-brown">No FAQ questions available at the moment. Please check back later.</p>
            <Link
              href="/labs/custom-website-builds"
              className="mt-6 inline-block text-brown-dark hover:text-brown transition-colors"
            >
              Back to Custom Website Builds
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/labs/custom-website-builds"
            className="text-brown-dark hover:text-brown mb-4 inline-block"
          >
            ← Back to Custom Website Builds
          </Link>
          <h1 className="text-4xl font-display text-brown-dark mb-4">LashDiary Labs FAQ</h1>
          <p className="text-brown text-lg">
            Frequently asked questions about our website building services. Click on any question to see the answer.
          </p>
        </div>

        <div className="space-y-8">
          {(faq.categories || ['General']).map((category) => {
            const categoryQuestions = faq.questions.filter(q => (q.category || 'General') === category)
            if (categoryQuestions.length === 0) return null

            return (
              <div key={category}>
                <h2 className="text-2xl font-display text-brown-dark mb-4 pb-2 border-b-2 border-brown-light">
                  {category}
                </h2>
                <div className="space-y-4">
                  {categoryQuestions.map((item) => (
                    <div
                      key={item.id}
                      className="bg-brown-dark rounded-lg shadow-soft overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => toggleQuestion(item.id)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-brown-dark/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brown-dark"
                        aria-expanded={expandedId === item.id}
                      >
                        <span className="text-lg font-semibold text-white pr-4">
                          {item.question}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className={`w-5 h-5 text-white flex-shrink-0 transition-transform ${
                            expandedId === item.id ? 'rotate-180' : ''
                          }`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      {expandedId === item.id && (
                        <div className="px-6 py-4 bg-white">
                          <p className="text-brown-dark leading-relaxed whitespace-pre-line">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 bg-brown-dark rounded-lg p-6 text-white text-center">
          <h2 className="text-2xl font-display mb-3">Still Have Questions?</h2>
          <p className="mb-4 text-white/90">
            Can't find what you're looking for? Get in touch with us and we'll be happy to help!
          </p>
          <Link
            href="/labs/custom-website-builds/checkout"
            className="inline-block px-6 py-3 bg-white text-brown-dark rounded-lg font-semibold hover:bg-brown-light transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}

