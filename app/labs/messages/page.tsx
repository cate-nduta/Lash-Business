'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

export default function LabsMessages() {
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

        loadMessages()
      } catch (error) {
        router.push('/labs/login')
      }
    }

    checkAuth()

    // Refresh messages every 30 seconds
    const interval = setInterval(loadMessages, 30000)
    return () => clearInterval(interval)
  }, [router])

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/labs/messages', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (ticketId: string) => {
    try {
      await fetch('/api/labs/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
        credentials: 'include',
      })
      loadMessages()
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Group messages by ticket
  const messagesByTicket = messages.reduce((acc: any, msg: any) => {
    if (!acc[msg.ticketId]) {
      acc[msg.ticketId] = {
        ticketId: msg.ticketId,
        ticketSubject: msg.ticketSubject,
        ticketStatus: msg.ticketStatus,
        messages: []
      }
    }
    acc[msg.ticketId].messages.push(msg)
    return acc
  }, {})

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
            <h1 className="text-4xl font-display text-[var(--color-primary)] mb-2">
              Messages
              {unreadCount > 0 && (
                <span className="ml-3 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-[var(--color-text)]/70">Messages from support team</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/labs"
              className="px-4 py-2 text-[var(--color-primary)] hover:underline"
            >
              Back to Labs
            </Link>
            <Link
              href="/labs/tickets"
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              View Tickets
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-[var(--color-text)]/70">No messages yet. Create a ticket to start a conversation!</p>
            </div>
          ) : (
            Object.values(messagesByTicket).map((group: any) => {
              const unreadInGroup = group.messages.filter((m: any) => m.sender === 'admin' && !m.read).length
              return (
                <Link
                  key={group.ticketId}
                  href={`/labs/tickets/${group.ticketId}`}
                  onClick={() => markAsRead(group.ticketId)}
                  className="block bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold text-[var(--color-text)]">
                      {group.ticketSubject}
                      {unreadInGroup > 0 && (
                        <span className="ml-2 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                          {unreadInGroup} new
                        </span>
                      )}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      group.ticketStatus === 'open' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}>
                      {group.ticketStatus}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.messages.slice(-2).map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.sender === 'admin'
                            ? 'bg-blue-50 border-l-4 border-blue-400'
                            : 'bg-gray-50 border-l-4 border-gray-400'
                        } ${msg.sender === 'admin' && !msg.read ? 'ring-2 ring-blue-300' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-semibold text-sm text-[var(--color-text)]">
                            {msg.sender === 'admin' ? 'Admin' : 'You'}
                          </span>
                          <span className="text-xs text-[var(--color-text)]/60">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text)] line-clamp-2">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                  {group.messages.length > 2 && (
                    <p className="text-sm text-[var(--color-text)]/60 mt-2">
                      +{group.messages.length - 2} more message{group.messages.length - 2 !== 1 ? 's' : ''}
                    </p>
                  )}
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

