'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

export default function TicketDetail() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [replyText, setReplyText] = useState('')

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

        loadTicket()
      } catch (error) {
        router.push('/labs/login')
      }
    }

    checkAuth()
  }, [router, ticketId])

  const loadTicket = async () => {
    try {
      const response = await fetch(`/api/labs/tickets/${ticketId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setTicket(data.ticket)
      } else {
        setMessage({ type: 'error', text: 'Failed to load ticket' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim()) return

    setSending(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/labs/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setReplyText('')
        setMessage({ type: 'success', text: 'Message sent successfully!' })
        loadTicket()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send message' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending message' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-[var(--color-text)]">Loading...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-display text-[var(--color-primary)] mb-4">Ticket Not Found</h1>
          <Link href="/labs/tickets" className="text-[var(--color-primary)] hover:underline">
            Back to Tickets
          </Link>
        </div>
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
        <div className="mb-6">
          <Link href="/labs/tickets" className="text-[var(--color-primary)] hover:underline mb-4 inline-block">
            ← Back to Tickets
          </Link>
          <h1 className="text-4xl font-display text-[var(--color-primary)] mb-2">{ticket.subject}</h1>
          <div className="flex gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              ticket.status === 'open' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'
            }`}>
              {ticket.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              ticket.priority === 'high' ? 'bg-red-100 text-red-800 border-red-300' :
              ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
              'bg-blue-100 text-blue-800 border-blue-300'
            }`}>
              {ticket.priority}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">Initial Request</h2>
            <p className="text-[var(--color-text)]/70 whitespace-pre-wrap">{ticket.description}</p>
            <p className="text-sm text-[var(--color-text)]/60 mt-2">
              Created: {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {ticket.messages && ticket.messages.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Conversation</h2>
            <div className="space-y-4">
              {ticket.messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.sender === 'admin'
                      ? 'bg-blue-50 border-l-4 border-blue-400'
                      : 'bg-gray-50 border-l-4 border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-[var(--color-text)]">
                      {msg.sender === 'admin' ? 'Admin' : 'You'}
                    </span>
                    <span className="text-sm text-[var(--color-text)]/60">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[var(--color-text)] whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {ticket.status === 'open' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Reply to Ticket</h2>
            <form onSubmit={handleSendReply} className="space-y-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                rows={4}
                placeholder="Type your message here..."
                required
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim()}
                className="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}









