'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

export default function LabsTickets() {
  const router = useRouter()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Form state
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/labs/auth/check', {
          credentials: 'include',
        })

        if (!response.ok || !(await response.json()).authenticated) {
          router.push('/labs/login')
          return
        }

        loadTickets()
      } catch (error) {
        router.push('/labs/login')
      }
    }

    checkAuth()
  }, [router])

  const loadTickets = async () => {
    try {
      const response = await fetch('/api/labs/tickets', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/labs/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description, priority }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Ticket created successfully!' })
        setSubject('')
        setDescription('')
        setPriority('medium')
        setShowCreateForm(false)
        loadTickets()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create ticket' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while creating ticket' })
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-[var(--color-text)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display text-[var(--color-primary)] mb-2">Support Tickets</h1>
            <p className="text-[var(--color-text)]/70">Raise a ticket when you need help</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/labs"
              className="px-4 py-2 text-[var(--color-primary)] hover:underline"
            >
              Back to Labs
            </Link>
            <Link
              href="/labs/messages"
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              View Messages
            </Link>
          </div>
        </div>

        {!showCreateForm ? (
          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-semibold"
            >
              + Create New Ticket
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-display text-[var(--color-primary)] mb-4">Create New Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  rows={6}
                  placeholder="Please provide details about the issue you're experiencing..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Ticket'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setSubject('')
                    setDescription('')
                    setPriority('medium')
                  }}
                  className="px-6 py-3 border-2 border-[var(--color-primary)]/20 text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-[var(--color-text)]/70">No tickets yet. Create your first ticket to get help!</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/labs/tickets/${ticket.id}`}
                className="block bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-[var(--color-text)]">{ticket.subject}</h3>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
                <p className="text-[var(--color-text)]/70 mb-3 line-clamp-2">{ticket.description}</p>
                <div className="flex items-center justify-between text-sm text-[var(--color-text)]/60">
                  <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  {ticket.messages && ticket.messages.length > 0 && (
                    <span>{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

