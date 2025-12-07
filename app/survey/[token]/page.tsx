'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Question {
  id: string
  type: 'text' | 'textarea' | 'rating' | 'multiple-choice' | 'yes-no'
  question: string
  required: boolean
  options?: string[]
  order: number
}

export default function SurveyPage() {
  const params = useParams()
  const token = params?.token as string
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    if (!token) return

    const fetchSurvey = async () => {
      try {
        const response = await fetch(`/api/survey/${token}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to load survey (${response.status})`)
        }
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }
        setQuestions(data.questions || [])
        setEmail(data.email || '')
        if (data.alreadySubmitted) {
          setSubmitted(true)
          if (data.existingResponse) {
            setResponses(data.existingResponse.responses || {})
          }
        }
      } catch (err: any) {
        console.error('Error loading survey:', err)
        setError(err.message || 'Failed to load survey')
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [token])

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    for (const question of questions) {
      if (question.required && (!responses[question.id] || responses[question.id] === '')) {
        setError(`Please answer: ${question.question}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/survey/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit survey')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit survey')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4B31] mx-auto mb-4"></div>
          <p className="text-[#6B4A3B]">Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error && !submitted) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/" className="text-[#7C4B31] hover:underline">Return to homepage</a>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🥰</div>
          <h1 className="text-3xl font-bold text-[#7C4B31] mb-4">Thank You!</h1>
          <p className="text-[#6B4A3B] mb-6">
            Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve!
          </p>
          <a href="/" className="inline-block px-6 py-3 bg-[#7C4B31] text-white rounded-full hover:bg-[#6B3D26] transition-colors">
            Return to Homepage
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF9F4] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-wider text-[#6B4A3B] mb-2">🥰 Quarterly Survey</p>
            <h1 className="text-4xl font-bold text-[#7C4B31] mb-4">We'd Love Your Feedback!</h1>
            <p className="text-[#6B4A3B]">
              Thank you for being a valued client! Your feedback helps us serve you better.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <label className="block text-[#3E2A20] font-semibold">
                  {question.question}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {question.type === 'text' && (
                  <input
                    type="text"
                    value={responses[question.id] || ''}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    className="w-full px-4 py-2 border border-[#F3E6DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                    required={question.required}
                  />
                )}

                {question.type === 'textarea' && (
                  <textarea
                    value={responses[question.id] || ''}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-[#F3E6DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                    required={question.required}
                  />
                )}

                {question.type === 'rating' && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleResponseChange(question.id, rating)}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          responses[question.id] === rating
                            ? 'border-[#7C4B31] bg-[#F3E6DC] text-[#7C4B31] font-bold'
                            : 'border-[#F3E6DC] text-[#6B4A3B] hover:border-[#7C4B31]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                )}

                {question.type === 'yes-no' && (
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={question.id}
                        value="yes"
                        checked={responses[question.id] === 'yes'}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        className="mr-2"
                        required={question.required}
                      />
                      <span className="text-[#3E2A20]">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={question.id}
                        value="no"
                        checked={responses[question.id] === 'no'}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        className="mr-2"
                        required={question.required}
                      />
                      <span className="text-[#3E2A20]">No</span>
                    </label>
                  </div>
                )}

                {question.type === 'multiple-choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={responses[question.id] === option}
                          onChange={(e) => handleResponseChange(question.id, e.target.value)}
                          className="mr-2"
                          required={question.required}
                        />
                        <span className="text-[#3E2A20]">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 bg-[#7C4B31] text-white rounded-full font-semibold hover:bg-[#6B3D26] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

