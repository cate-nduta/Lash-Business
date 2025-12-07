'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface SurveyQuestion {
  id: string
  type: 'text' | 'textarea' | 'rating' | 'multiple-choice' | 'yes-no'
  question: string
  required: boolean
  options?: string[]
  order: number
}

interface SurveySettings {
  enabled: boolean
  quarterlySchedule: boolean
  lastSentQuarter: string | null
  emailSubject: string
  emailMessage: string
}

interface Client {
  email: string
  name: string
  lastBookingDate?: string
  totalBookings: number
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminSurveys() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [settings, setSettings] = useState<SurveySettings>({
    enabled: true,
    quarterlySchedule: true,
    lastSentQuarter: null,
    emailSubject: "We'd Love Your Feedback!",
    emailMessage: "Thank you for being a valued client! We'd love to hear about your experience with us.",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [manualEmail, setManualEmail] = useState<string>('')
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
        loadSurvey()
        loadClients()
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

  const loadSurvey = async () => {
    try {
      const response = await authorizedFetch('/api/admin/surveys')
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
        setSettings(data.settings || settings)
      }
    } catch (error) {
      console.error('Error loading survey:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const response = await authorizedFetch('/api/admin/surveys/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, settings }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Survey saved successfully!' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save survey' })
      }
    } catch (error) {
      console.error('Error saving survey:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: `q-${Date.now()}`,
      type: 'text',
      question: '',
      required: false,
      order: questions.length,
    }
    setEditingQuestion(newQuestion)
    setShowAddQuestion(true)
  }

  const handleEditQuestion = (question: SurveyQuestion) => {
    setEditingQuestion({ ...question })
    setShowAddQuestion(true)
  }

  const handleSaveQuestion = () => {
    if (!editingQuestion || !editingQuestion.question.trim()) {
      setMessage({ type: 'error', text: 'Question text is required' })
      return
    }

    if (editingQuestion.type === 'multiple-choice' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      setMessage({ type: 'error', text: 'Multiple choice questions require at least one option' })
      return
    }

    if (editingQuestion.id.startsWith('q-') && questions.find((q) => q.id === editingQuestion!.id)) {
      // Update existing
      setQuestions(questions.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)))
    } else {
      // Add new
      setQuestions([...questions, editingQuestion])
    }

    setShowAddQuestion(false)
    setEditingQuestion(null)
  }

  const handleDeleteQuestion = (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return
    }
    setQuestions(questions.filter((q) => q.id !== id).map((q, idx) => ({ ...q, order: idx })))
  }

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === questions.length - 1) return

    const newQuestions = [...questions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]]
    newQuestions.forEach((q, idx) => {
      q.order = idx
    })
    setQuestions(newQuestions)
  }

  const handleAddManualEmail = () => {
    const email = manualEmail.trim().toLowerCase()
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    if (selectedClients.includes(email)) {
      setMessage({ type: 'error', text: 'This email is already selected' })
      return
    }

    setSelectedClients([...selectedClients, email])
    setManualEmail('')
    setMessage({ type: 'success', text: 'Email added successfully' })
  }

  const handleSendSurvey = async () => {
    if (selectedClients.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one client or enter an email address' })
      return
    }

    setSending(true)
    setMessage(null)

    try {
      const now = new Date()
      const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`
      const year = now.getFullYear().toString()

      const response = await authorizedFetch('/api/admin/surveys/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmails: selectedClients,
          quarter: `${year}-${quarter}`,
          year,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({
          type: 'success',
          text: `Survey sent to ${data.sent} client(s)! ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
        })
        setShowSendDialog(false)
        setSelectedClients([])
        loadSurvey() // Reload to update lastSentQuarter
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to send survey' })
      }
    } catch (error) {
      console.error('Error sending survey:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSending(false)
    }
  }

  const getCurrentQuarter = () => {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    const year = now.getFullYear()
    return `${year}-Q${quarter}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/admin/dashboard"
              className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Survey Management</h1>
            <p className="text-gray-600 mt-1">Create and manage quarterly client surveys</p>
          </div>
          <Link
            href="/admin/surveys/analytics"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            View Analytics
          </Link>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        {/* Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Survey Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="mr-2"
                />
                <span>Enable quarterly surveys</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
              <input
                type="text"
                value={settings.emailSubject}
                onChange={(e) => setSettings({ ...settings, emailSubject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Message</label>
              <textarea
                value={settings.emailMessage}
                onChange={(e) => setSettings({ ...settings, emailMessage: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {settings.lastSentQuarter && (
              <p className="text-sm text-gray-600">
                Last sent: {settings.lastSentQuarter}
              </p>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Survey Questions</h2>
            <button
              onClick={handleAddQuestion}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No questions yet. Add your first question!</p>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-500">#{index + 1}</span>
                        <span className="text-sm px-2 py-1 bg-gray-100 rounded">{question.type}</span>
                        {question.required && (
                          <span className="text-sm px-2 py-1 bg-red-100 text-red-700 rounded">Required</span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">{question.question}</p>
                      {question.type === 'multiple-choice' && question.options && (
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                          {question.options.map((opt, idx) => (
                            <li key={idx}>{opt}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveQuestion(index, 'up')}
                        disabled={index === 0}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveQuestion(index, 'down')}
                        disabled={index === questions.length - 1}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="px-2 py-1 text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="px-2 py-1 text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Survey'}
            </button>
            <button
              onClick={() => setShowSendDialog(true)}
              disabled={questions.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Send Survey to Clients
            </button>
          </div>
        </div>

        {/* Add/Edit Question Dialog */}
        {showAddQuestion && editingQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">
                {editingQuestion.id.startsWith('q-') && questions.find((q) => q.id === editingQuestion.id)
                  ? 'Edit Question'
                  : 'Add Question'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    value={editingQuestion.type}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        type: e.target.value as SurveyQuestion['type'],
                        options: e.target.value === 'multiple-choice' ? ['Option 1'] : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Short Text</option>
                    <option value="textarea">Long Text</option>
                    <option value="rating">Rating (1-5)</option>
                    <option value="yes-no">Yes/No</option>
                    <option value="multiple-choice">Multiple Choice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <input
                    type="text"
                    value={editingQuestion.question}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your question..."
                  />
                </div>

                {editingQuestion.type === 'multiple-choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                    <div className="space-y-2">
                      {(editingQuestion.options || []).map((option, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(editingQuestion.options || [])]
                              newOptions[idx] = e.target.value
                              setEditingQuestion({ ...editingQuestion, options: newOptions })
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Option ${idx + 1}`}
                          />
                          <button
                            onClick={() => {
                              const newOptions = editingQuestion.options?.filter((_, i) => i !== idx) || []
                              setEditingQuestion({ ...editingQuestion, options: newOptions })
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setEditingQuestion({
                            ...editingQuestion,
                            options: [...(editingQuestion.options || []), ''],
                          })
                        }}
                        className="px-3 py-2 text-blue-600 hover:text-blue-800"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingQuestion.required}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                      className="mr-2"
                    />
                    <span>Required question</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveQuestion}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddQuestion(false)
                    setEditingQuestion(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Survey Dialog */}
        {showSendDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Send Survey to Clients</h3>
              <p className="text-gray-600 mb-4">
                Select clients to send the survey to. The survey will be sent for quarter: {getCurrentQuarter()}
              </p>

              {/* Manual Email Input */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Email Manually
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddManualEmail()
                      }
                    }}
                    placeholder="Enter email address (e.g., client@example.com)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddManualEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Press Enter or click Add to include this email in the recipient list
                </p>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {selectedClients.length} client(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedClients(clients.map((c) => c.email))}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedClients([])}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                  {clients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No clients found. Use the manual email input above to add recipients.
                    </div>
                  ) : (
                    clients.map((client) => (
                      <label key={client.email} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.email)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients([...selectedClients, client.email])
                            } else {
                              setSelectedClients(selectedClients.filter((e) => e !== client.email))
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.email}</p>
                          <p className="text-xs text-gray-500">
                            {client.totalBookings} booking(s)
                            {client.lastBookingDate && ` • Last: ${new Date(client.lastBookingDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                
                {/* Show manually added emails that aren't in the client list */}
                {selectedClients.filter(email => !clients.some(c => c.email === email)).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Manually Added Emails:</p>
                    <div className="space-y-2">
                      {selectedClients
                        .filter(email => !clients.some(c => c.email === email))
                        .map((email) => (
                          <div key={email} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                            <span className="text-sm text-gray-900">{email}</span>
                            <button
                              onClick={() => setSelectedClients(selectedClients.filter((e) => e !== email))}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSendSurvey}
                  disabled={sending || selectedClients.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Survey'}
                </button>
                <button
                  onClick={() => {
                    setShowSendDialog(false)
                    setSelectedClients([])
                    setManualEmail('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

