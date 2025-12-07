'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface QuestionStats {
  question: string
  type: string
  total: number
  answers: any[]
  average?: number
  distribution?: Record<string, number>
}

interface AIInsights {
  insights: string[]
  recommendations: string[]
  trends: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  overallScore: number | null
  totalResponses: number
  responseRate: number | null
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function SurveyAnalytics() {
  const [analytics, setAnalytics] = useState<{
    totalResponses: number
    responseRate: number
    questionStats: Record<string, QuestionStats>
    quarters: string[]
    responses: any[]
  } | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
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
        loadAnalytics()
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

  const loadAnalytics = async () => {
    try {
      const url = selectedQuarter
        ? `/api/admin/surveys/analytics?quarter=${selectedQuarter}`
        : '/api/admin/surveys/analytics'
      const response = await authorizedFetch(url)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAIInsights = async () => {
    setLoadingInsights(true)
    try {
      const response = await authorizedFetch('/api/admin/surveys/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarter: selectedQuarter || null }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.error) {
          setMessage({ type: 'error', text: data.error || 'Failed to generate AI insights' })
        } else {
          setAiInsights(data)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || `Failed to generate AI insights (${response.status})` })
      }
    } catch (error: any) {
      console.error('Error loading AI insights:', error)
      setMessage({ type: 'error', text: error.message || 'An error occurred while loading insights' })
    } finally {
      setLoadingInsights(false)
    }
  }

  useEffect(() => {
    if (analytics && !loading) {
      loadAIInsights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuarter, analytics])

  useEffect(() => {
    if (selectedQuarter) {
      loadAnalytics()
    }
  }, [selectedQuarter])

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50'
      case 'negative':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'negative':
        return '😟'
      default:
        return '😐'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin/surveys" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Surveys
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Survey Analytics & AI Insights</h1>
            <p className="text-gray-600 mt-1">Analyze survey responses with AI-powered insights</p>
          </div>
        </div>

        {message && (
          <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
        )}

        {/* Quarter Filter */}
        {analytics && analytics.quarters.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Quarter</label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Quarters</option>
              {analytics.quarters.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Overview Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Responses</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalResponses}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Response Rate</h3>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.responseRate ? `${analytics.responseRate}%` : 'N/A'}
              </p>
            </div>
            {aiInsights && aiInsights.overallScore !== null && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Overall Score</h3>
                <p className="text-3xl font-bold text-gray-900">{aiInsights.overallScore}/5.0</p>
              </div>
            )}
          </div>
        )}

        {/* AI Insights */}
        {aiInsights && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">AI-Powered Insights</h2>
              <button
                onClick={loadAIInsights}
                disabled={loadingInsights}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loadingInsights ? 'Refreshing...' : 'Refresh Insights'}
              </button>
            </div>

            {/* Sentiment */}
            <div className={`mb-6 p-4 rounded-lg ${getSentimentColor(aiInsights.sentiment)}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getSentimentIcon(aiInsights.sentiment)}</span>
                <div>
                  <p className="font-semibold capitalize">{aiInsights.sentiment} Sentiment</p>
                  <p className="text-sm">
                    Based on {aiInsights.totalResponses} response(s)
                    {aiInsights.overallScore !== null && ` with an average score of ${aiInsights.overallScore}/5.0`}
                  </p>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Key Insights</h3>
              <ul className="space-y-2">
                {aiInsights.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">💡</span>
                    <span className="text-gray-700">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {aiInsights.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✅</span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trends */}
            {aiInsights.trends.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Trends</h3>
                <ul className="space-y-2">
                  {aiInsights.trends.map((trend, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-600 mt-1">📈</span>
                      <span className="text-gray-700">{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Question Statistics */}
        {analytics && Object.keys(analytics.questionStats).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">Question Statistics</h2>
            <div className="space-y-6">
              {Object.entries(analytics.questionStats).map(([questionId, stats]) => (
                <div key={questionId} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <h3 className="font-semibold text-gray-900 mb-2">{stats.question}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Type: {stats.type} • Responses: {stats.total}
                  </p>

                  {stats.type === 'rating' && stats.average !== undefined && (
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        Average Rating: {stats.average.toFixed(2)}/5.0
                      </p>
                      <div className="mt-2 flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-2xl ${star <= Math.round(stats.average!) ? 'text-yellow-400' : 'text-gray-300'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.type === 'multiple-choice' && stats.distribution && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Distribution</h4>
                      <div className="space-y-2">
                        {Object.entries(stats.distribution)
                          .sort((a, b) => b[1] - a[1])
                          .map(([option, count]) => {
                            const percentage = (count / stats.total) * 100
                            return (
                              <div key={option}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-700">{option}</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {count} ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {stats.type === 'yes-no' && stats.distribution && (
                    <div className="mt-3">
                      <div className="flex gap-4">
                        {Object.entries(stats.distribution).map(([option, count]) => {
                          const percentage = (count / stats.total) * 100
                          return (
                            <div key={option} className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">{option}</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {count} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full ${option === 'yes' ? 'bg-green-600' : 'bg-red-600'}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {(stats.type === 'text' || stats.type === 'textarea') && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600">
                        {stats.total} text response(s) received. View individual responses below.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Responses */}
        {analytics && analytics.responses.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-semibold mb-4">Individual Responses</h2>
            <div className="space-y-4">
              {analytics.responses.map((response) => (
                <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{response.email}</p>
                      <p className="text-sm text-gray-600">
                        Quarter: {response.quarter} • Submitted: {new Date(response.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(response.responses).map(([questionId, answer]) => {
                      const questionStats = analytics.questionStats[questionId]
                      if (!questionStats) return null
                      return (
                        <div key={questionId} className="text-sm">
                          <span className="font-medium text-gray-700">{questionStats.question}:</span>{' '}
                          <span className="text-gray-900">
                            {typeof answer === 'object' ? JSON.stringify(answer) : String(answer)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analytics && analytics.totalResponses === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No survey responses yet.</p>
            <p className="text-gray-500 mt-2">Send surveys to clients to start collecting feedback.</p>
            <Link
              href="/admin/surveys"
              className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Survey Management
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

