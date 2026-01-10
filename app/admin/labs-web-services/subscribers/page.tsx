'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface YearlySubscriber {
  id: string
  name: string
  email: string
  phoneNumber?: string
  totalAnnualAmount: number
  yearlyItems: Array<{
    productId: string
    productName: string
    quantity: number
    annualPrice: number
  }>
  orderIds: string[]
  createdAt: string
  lastRenewalDate?: string
  nextRenewalDate?: string
  paymentStatus: 'active' | 'pending' | 'overdue'
}

export default function YearlySubscribersPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [subscribers, setSubscribers] = useState<YearlySubscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const authResponse = await fetch('/api/admin/current-user', { credentials: 'include' })
        if (!authResponse.ok) {
          throw new Error('Unauthorized')
        }
        const authData = await authResponse.json()
        if (!isMounted) return
        if (!authData.authenticated) {
          setAuthenticated(false)
          router.replace('/admin/login')
          return
        }
        setAuthenticated(true)
      } catch (error) {
        if (!isMounted) return
        console.error('Auth error:', error)
        setAuthenticated(false)
        router.replace('/admin/login')
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [router])

  useEffect(() => {
    fetchSubscribers()
  }, [])

  const fetchSubscribers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/labs/web-services/subscribers')
      if (response.ok) {
        const data = await response.json()
        setSubscribers(data.subscribers || [])
      } else {
        setMessage({ type: 'error', text: 'Failed to load subscribers' })
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error)
      setMessage({ type: 'error', text: 'Failed to load subscribers' })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/labs/web-services/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })

      if (response.ok) {
        const data = await response.json()
        setSubscribers(data.subscribers || [])
        setMessage({ type: 'success', text: data.message || 'Subscribers synced successfully' })
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to sync subscribers' })
      }
    } catch (error) {
      console.error('Error syncing subscribers:', error)
      setMessage({ type: 'error', text: 'Failed to sync subscribers' })
    } finally {
      setSyncing(false)
    }
  }

  const handleSendReminder = async (subscriberId: string, method: 'email' | 'whatsapp') => {
    try {
      setSendingReminder(subscriberId)
      const response = await fetch('/api/labs/web-services/subscribers/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId, method }),
      })

      if (response.ok) {
        const data = await response.json()
        if (method === 'email') {
          setMessage({ type: 'success', text: 'Reminder email sent successfully' })
        } else if (method === 'whatsapp') {
          // Open WhatsApp with the message
          if (data.whatsappUrl) {
            window.open(data.whatsappUrl, '_blank')
            setMessage({ type: 'success', text: 'WhatsApp message prepared. Please send it manually.' })
          } else {
            setMessage({ type: 'error', text: 'Phone number not available for WhatsApp' })
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to send reminder' })
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      setMessage({ type: 'error', text: 'Failed to send reminder' })
    } finally {
      setSendingReminder(null)
    }
  }

  const handleGeneratePaymentLink = async (subscriberId: string) => {
    try {
      const response = await fetch('/api/labs/web-services/subscribers/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Copy payment link to clipboard
        await navigator.clipboard.writeText(data.paymentLink)
        setMessage({ type: 'success', text: 'Payment link copied to clipboard!' })
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to generate payment link' })
      }
    } catch (error) {
      console.error('Error generating payment link:', error)
      setMessage({ type: 'error', text: 'Failed to generate payment link' })
    }
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <p className="text-brown-dark/70">Loading...</p>
      </div>
    )
  }

  if (authenticated === false) {
    return null
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/admin/labs-web-services"
            className="text-brown-dark/70 hover:text-brown-dark transition-colors"
          >
            ← Back to Services
          </Link>
          <Link
            href="/admin/labs-web-services/orders"
            className="text-brown-dark/70 hover:text-brown-dark transition-colors"
          >
            Orders
          </Link>
          <span className="text-brown-dark/50">|</span>
          <span className="text-brown-dark font-semibold">Yearly Subscribers</span>
        </div>

        <div className="bg-white/70 rounded-2xl shadow-soft p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display text-brown-dark mb-2">Yearly Subscribers</h1>
              <p className="text-brown-dark/70">
                Manage customers with annual subscription services
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-3 bg-brown-dark text-white rounded-xl font-semibold hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Syncing...' : 'Sync Subscribers'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-brown-dark/70">Loading subscribers...</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-brown-dark/70 mb-4">No yearly subscribers found.</p>
              <p className="text-sm text-brown-dark/60">
                Click "Sync Subscribers" to sync from completed orders.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-brown-light">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-brown-dark">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-brown-dark">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-brown-dark">Phone</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-brown-dark">Annual Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-brown-dark">Services</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-brown-dark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-b border-brown-light/50 hover:bg-brown-light/10">
                      <td className="py-4 px-4">
                        <div className="font-medium text-brown-dark">{subscriber.name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-brown-dark/80">{subscriber.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-brown-dark/80">
                          {subscriber.phoneNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-semibold text-brown-dark">
                          KES {subscriber.totalAnnualAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-brown-dark/70">
                          {subscriber.yearlyItems.length} service{subscriber.yearlyItems.length !== 1 ? 's' : ''}
                        </div>
                        <details className="mt-1">
                          <summary className="text-xs text-brown-dark/60 cursor-pointer hover:text-brown-dark">
                            View details
                          </summary>
                          <div className="mt-2 text-xs text-brown-dark/70 space-y-1">
                            {subscriber.yearlyItems.map((item, idx) => (
                              <div key={idx}>
                                {item.productName} ({item.quantity}x) - KES {item.annualPrice.toLocaleString()}/year
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => handleSendReminder(subscriber.id, 'email')}
                            disabled={sendingReminder === subscriber.id}
                            className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                            title="Send email reminder"
                          >
                            📧 Email
                          </button>
                          <button
                            onClick={() => handleSendReminder(subscriber.id, 'whatsapp')}
                            disabled={sendingReminder === subscriber.id || !subscriber.phoneNumber}
                            className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                            title="Send WhatsApp reminder"
                          >
                            💬 WhatsApp
                          </button>
                          <button
                            onClick={() => handleGeneratePaymentLink(subscriber.id)}
                            className="px-3 py-1.5 bg-brown-dark text-white text-xs rounded-lg hover:bg-brown transition-colors"
                            title="Copy payment link"
                          >
                            🔗 Link
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

