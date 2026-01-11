'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface MonthlySubscriber {
  id: string
  name: string
  email: string
  phoneNumber?: string
  totalMonthlyAmount: number
  monthlyItems: Array<{
    productId: string
    productName: string
    quantity: number
    monthlyPrice: number
  }>
  orderIds: string[]
  createdAt: string
  lastPaymentDate?: string
  nextPaymentDate?: string
  paymentStatus: 'active' | 'pending' | 'overdue' | 'suspended'
  lastReminderSent?: string
  reminderCount?: number
  suspendedAt?: string
}

export default function MonthlySubscribersPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [subscribers, setSubscribers] = useState<MonthlySubscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [suspending, setSuspending] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState<string | null>(null)
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

  // Auto-check for overdue subscribers and suspend after 5 days
  useEffect(() => {
    const checkOverdueSubscribers = async () => {
      const now = new Date()
      const subscribersCopy = [...subscribers]
      let hasChanges = false

      subscribersCopy.forEach((subscriber) => {
        if (subscriber.lastReminderSent && subscriber.paymentStatus !== 'suspended') {
          const reminderDate = new Date(subscriber.lastReminderSent)
          const daysSinceReminder = Math.floor((now.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSinceReminder >= 5) {
            subscriber.paymentStatus = 'suspended'
            subscriber.suspendedAt = now.toISOString()
            hasChanges = true
          } else if (daysSinceReminder >= 1 && subscriber.paymentStatus === 'active') {
            subscriber.paymentStatus = 'pending'
            hasChanges = true
          }
        }

        if (subscriber.nextPaymentDate && subscriber.paymentStatus === 'active') {
          const nextPayment = new Date(subscriber.nextPaymentDate)
          if (nextPayment < now) {
            subscriber.paymentStatus = 'overdue'
            hasChanges = true
          }
        }
      })

      if (hasChanges) {
        setSubscribers(subscribersCopy)
        // Save changes to server (you may want to call an API endpoint here)
      }
    }

    if (subscribers.length > 0) {
      checkOverdueSubscribers()
      const interval = setInterval(checkOverdueSubscribers, 60000) // Check every minute
      return () => clearInterval(interval)
    }
  }, [subscribers])

  const fetchSubscribers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/labs/web-services/monthly-subscribers', {
        credentials: 'include',
      })
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
      const response = await fetch('/api/labs/web-services/monthly-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  const handleSendPaymentEmail = async (subscriberId: string) => {
    try {
      setSendingEmail(subscriberId)
      const response = await fetch('/api/labs/web-services/monthly-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'send-payment-email', subscriberId }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({
          type: 'success',
          text: data.message || 'Payment reminder email sent. Service will be suspended in 5 days if payment is not received.',
        })
        // Refresh subscribers
        fetchSubscribers()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to send payment email' })
      }
    } catch (error) {
      console.error('Error sending payment email:', error)
      setMessage({ type: 'error', text: 'Failed to send payment email' })
    } finally {
      setSendingEmail(null)
    }
  }

  const handleSuspendService = async (subscriberId: string) => {
    if (!confirm('Are you sure you want to suspend this service?')) return

    try {
      setSuspending(subscriberId)
      const response = await fetch('/api/labs/web-services/monthly-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'suspend-service', subscriberId }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: data.message || 'Service suspended successfully' })
        fetchSubscribers()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to suspend service' })
      }
    } catch (error) {
      console.error('Error suspending service:', error)
      setMessage({ type: 'error', text: 'Failed to suspend service' })
    } finally {
      setSuspending(null)
    }
  }

  const handleReactivateService = async (subscriberId: string) => {
    try {
      setReactivating(subscriberId)
      const response = await fetch('/api/labs/web-services/monthly-subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reactivate-service', subscriberId }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: data.message || 'Service reactivated successfully' })
        fetchSubscribers()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ type: 'error', text: errorData.error || 'Failed to reactivate service' })
      }
    } catch (error) {
      console.error('Error reactivating service:', error)
      setMessage({ type: 'error', text: 'Failed to reactivate service' })
    } finally {
      setReactivating(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-orange-100 text-orange-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilSuspension = (lastReminderSent?: string) => {
    if (!lastReminderSent) return null
    const reminderDate = new Date(lastReminderSent)
    const now = new Date()
    const daysSinceReminder = Math.floor((now.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysLeft = 5 - daysSinceReminder
    return daysLeft > 0 ? daysLeft : 0
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
          <span className="text-brown-dark font-semibold">Monthly Subscribers</span>
        </div>

        <div className="bg-white/70 rounded-2xl shadow-soft p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display text-brown-dark mb-2">Monthly Subscribers</h1>
              <p className="text-brown-dark/70">
                Manage customers with monthly maintenance subscription services
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
              <p className="text-brown-dark/70 mb-4">No monthly subscribers found.</p>
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
                    <th className="text-right py-3 px-4 text-sm font-semibold text-brown-dark">Monthly Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-brown-dark">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-brown-dark">Next Payment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-brown-dark">Services</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-brown-dark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => {
                    const daysUntilSuspension = getDaysUntilSuspension(subscriber.lastReminderSent)
                    const isPendingSuspension = subscriber.lastReminderSent && daysUntilSuspension !== null && daysUntilSuspension > 0 && subscriber.paymentStatus !== 'suspended'

                    return (
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
                            KES {subscriber.totalMonthlyAmount.toLocaleString()}/month
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(subscriber.paymentStatus)}`}>
                            {subscriber.paymentStatus.charAt(0).toUpperCase() + subscriber.paymentStatus.slice(1)}
                          </span>
                          {isPendingSuspension && (
                            <div className="text-xs text-orange-600 mt-1">
                              Suspension in {daysUntilSuspension} day{daysUntilSuspension !== 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-brown-dark/70">
                            {subscriber.nextPaymentDate
                              ? new Date(subscriber.nextPaymentDate).toLocaleDateString()
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-brown-dark/70">
                            {subscriber.monthlyItems.length} service{subscriber.monthlyItems.length !== 1 ? 's' : ''}
                          </div>
                          <details className="mt-1">
                            <summary className="text-xs text-brown-dark/60 cursor-pointer hover:text-brown-dark">
                              View details
                            </summary>
                            <div className="mt-2 text-xs text-brown-dark/70 space-y-1">
                              {subscriber.monthlyItems.map((item, idx) => (
                                <div key={idx}>
                                  {item.productName} ({item.quantity}x) - KES {item.monthlyPrice.toLocaleString()}/month
                                </div>
                              ))}
                            </div>
                          </details>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 justify-center flex-wrap">
                            {subscriber.paymentStatus !== 'suspended' && (
                              <button
                                onClick={() => handleSendPaymentEmail(subscriber.id)}
                                disabled={sendingEmail === subscriber.id}
                                className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                                title="Send Paystack payment email"
                              >
                                📧 Email
                              </button>
                            )}
                            {subscriber.paymentStatus === 'suspended' ? (
                              <button
                                onClick={() => handleReactivateService(subscriber.id)}
                                disabled={reactivating === subscriber.id}
                                className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                                title="Reactivate service"
                              >
                                ✅ Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSuspendService(subscriber.id)}
                                disabled={suspending === subscriber.id}
                                className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                title="Suspend service"
                              >
                                ⛔ Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

