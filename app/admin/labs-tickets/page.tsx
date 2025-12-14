'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

export default function AdminLabsTickets() {
  const router = useRouter()
  const [tickets, setTickets] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [cleaningUp, setCleaningUp] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })

        if (!response.ok || !(await response.json()).authenticated) {
          router.replace('/admin/login')
          return
        }

        loadTickets()
      } catch (error) {
        router.replace('/admin/login')
      }
    }

    checkAuth()

    // Refresh tickets every 30 seconds
    const interval = setInterval(loadTickets, 30000)
    return () => clearInterval(interval)
  }, [router])

  const loadTickets = async () => {
    try {
      const response = await fetch('/api/admin/labs-tickets', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTicketDetail = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/admin/labs-tickets/${ticketId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedTicket(data.ticket)
      }
    } catch (error) {
      console.error('Error loading ticket:', error)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket) return

    setSending(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/labs-tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setReplyText('')
        setMessage({ type: 'success', text: 'Message sent successfully!' })
        loadTicketDetail(selectedTicket.id)
        loadTickets()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send message' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending message' })
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (ticketId: string, newStatus: 'open' | 'closed') => {
    try {
      const response = await fetch(`/api/admin/labs-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      })

      if (response.ok) {
        if (selectedTicket && selectedTicket.id === ticketId) {
          loadTicketDetail(ticketId)
        }
        loadTickets()
        setMessage({ type: 'success', text: `Ticket ${newStatus === 'closed' ? 'closed' : 'reopened'} successfully` })
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
      setMessage({ type: 'error', text: 'Failed to update ticket status' })
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to delete all closed tickets older than 30 days? This action cannot be undone.')) {
      return
    }

    setCleaningUp(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/labs-tickets/cleanup', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Cleanup completed. ${data.deletedCount || 0} old ticket(s) deleted.` 
        })
        loadTickets()
        if (selectedTicket && data.deletedTickets?.some((t: any) => t.id === selectedTicket.id)) {
          setSelectedTicket(null)
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to cleanup tickets' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred during cleanup' })
    } finally {
      setCleaningUp(false)
    }
  }

  const getDaysUntilDeletion = (ticket: any) => {
    if (ticket.status !== 'closed') return null
    const ticketDate = new Date(ticket.updatedAt || ticket.createdAt)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - ticketDate.getTime()) / (24 * 60 * 60 * 1000))
    const daysRemaining = 30 - daysSince
    return daysRemaining > 0 ? daysRemaining : 0
  }

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true
    return t.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
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

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-[var(--color-primary)] hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-display text-[var(--color-primary)] mb-4">Labs Support Tickets</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-[var(--color-text)]/70">Total Tickets</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{stats.total || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-[var(--color-text)]/70">Open</div>
              <div className="text-2xl font-bold text-green-600">{stats.open || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-[var(--color-text)]/70">Closed</div>
              <div className="text-2xl font-bold text-gray-600">{stats.closed || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-[var(--color-text)]/70">Unread</div>
              <div className="text-2xl font-bold text-red-600">{stats.unread || 0}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('open')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'open'
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setFilter('closed')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'closed'
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'bg-white text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                }`}
              >
                Closed
              </button>
            </div>
            <button
              onClick={handleCleanup}
              disabled={cleaningUp}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete closed tickets older than 30 days"
            >
              {cleaningUp ? 'Cleaning...' : 'Cleanup Old Tickets'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <p className="text-[var(--color-text)]/70">No tickets found</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const unreadCount = ticket.messages?.filter((m: any) => m.sender === 'client' && !m.read).length || 0
                return (
                  <div
                    key={ticket.id}
                    onClick={() => loadTicketDetail(ticket.id)}
                    className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow ${
                      selectedTicket?.id === ticket.id ? 'ring-2 ring-[var(--color-primary)]' : ''
                    } ${unreadCount > 0 ? 'border-l-4 border-red-500' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[var(--color-text)] flex-1">{ticket.subject}</h3>
                      {unreadCount > 0 && (
                        <span className="ml-2 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text)]/70 mb-3 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center justify-between text-xs text-[var(--color-text)]/60">
                      <span>{ticket.userName || ticket.userEmail}</span>
                      <div className="flex items-center gap-2">
                        {ticket.status === 'closed' && (() => {
                          const daysRemaining = getDaysUntilDeletion(ticket)
                          if (daysRemaining !== null && daysRemaining <= 5) {
                            return (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                Deletes in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                              </span>
                            )
                          }
                          return null
                        })()}
                        <span className={`px-2 py-1 rounded ${
                          ticket.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Ticket Detail */}
          {selectedTicket && (
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-display text-[var(--color-primary)] mb-2">
                      {selectedTicket.subject}
                    </h2>
                    <p className="text-sm text-[var(--color-text)]/70">
                      From: {selectedTicket.userName || selectedTicket.userEmail}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(selectedTicket.id, selectedTicket.status === 'open' ? 'closed' : 'open')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        selectedTicket.status === 'open'
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {selectedTicket.status === 'open' ? 'Close Ticket' : 'Reopen Ticket'}
                    </button>
                  </div>
                </div>

                {selectedTicket.status === 'closed' && (() => {
                  const daysRemaining = getDaysUntilDeletion(selectedTicket)
                  if (daysRemaining !== null) {
                    return (
                      <div className={`mb-4 p-3 rounded-lg ${
                        daysRemaining <= 5 
                          ? 'bg-orange-50 border-2 border-orange-200' 
                          : 'bg-blue-50 border-2 border-blue-200'
                      }`}>
                        <p className="text-sm text-[var(--color-text)]">
                          {daysRemaining > 0 ? (
                            <>This closed ticket will be automatically deleted in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> (30 days after closure).</>
                          ) : (
                            <>This ticket is eligible for deletion (closed more than 30 days ago).</>
                          )}
                        </p>
                      </div>
                    )
                  }
                  return null
                })()}

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-[var(--color-text)] mb-2">Initial Request</h3>
                  <p className="text-[var(--color-text)]/70 whitespace-pre-wrap">{selectedTicket.description}</p>
                  <p className="text-xs text-[var(--color-text)]/60 mt-2">
                    Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                    {selectedTicket.updatedAt && selectedTicket.updatedAt !== selectedTicket.createdAt && (
                      <> • Last updated: {new Date(selectedTicket.updatedAt).toLocaleString()}</>
                    )}
                  </p>
                </div>

                {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-[var(--color-text)] mb-4">Conversation</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedTicket.messages.map((msg: any) => (
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
                              {msg.sender === 'admin' ? 'You (Admin)' : selectedTicket.userName || selectedTicket.userEmail}
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

                {selectedTicket.status === 'open' && (
                  <form onSubmit={handleSendReply} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Reply to Ticket
                      </label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[var(--color-primary)]/20 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                        rows={4}
                        placeholder="Type your response here..."
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {!selectedTicket && (
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-12 text-center">
              <p className="text-[var(--color-text)]/70">Select a ticket to view details and respond</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

