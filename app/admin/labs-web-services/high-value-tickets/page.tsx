'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface HighValueTicket {
  id: string
  name: string
  email: string
  phoneNumber: string
  orderDetails: {
    items: Array<{
      name: string
      price: number
      quantity: number
      setupFee?: number
      billingPeriod?: string
    }>
  }
  totalAmount: number
  createdAt: string
}

export default function HighValueTicketsPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [tickets, setTickets] = useState<HighValueTicket[]>([])
  const [loading, setLoading] = useState(true)
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
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/high-value-tickets', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      } else {
        setMessage({ type: 'error', text: 'Failed to load high-value tickets' })
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      setMessage({ type: 'error', text: 'Failed to load high-value tickets' })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `KSH ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/admin/labs-web-services"
            className="inline-flex items-center text-brown-dark hover:text-brown-dark/80 mb-4"
          >
            ← Back to Labs Web Services
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">High Value Tickets</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage high-value order requests
          </p>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No high-value tickets yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ticket.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <a
                          href={`mailto:${ticket.email}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {ticket.email}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <a
                          href={`tel:${ticket.phoneNumber}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {ticket.phoneNumber}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(ticket.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800 font-medium">
                            View Items ({ticket.orderDetails.items.length})
                          </summary>
                          <div className="mt-2 pl-4 border-l-2 border-gray-200">
                            <ul className="space-y-1">
                              {ticket.orderDetails.items.map((item, index) => (
                                <li key={index} className="text-xs">
                                  • {item.name} - {formatCurrency(item.price)} × {item.quantity}
                                  {item.setupFee && ` (Setup: ${formatCurrency(item.setupFee)})`}
                                  {item.billingPeriod && ` • ${item.billingPeriod}`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

