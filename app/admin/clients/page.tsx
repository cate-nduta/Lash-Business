'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Client {
  profile: {
    id: string
    name: string
    email: string
    phone: string
    birthday?: string
    createdAt: string
    lastLoginAt?: string
  }
  lastAppointmentDate?: string
  recommendedRefillDate?: string
  daysSinceLastAppointment?: number
  needsRefill: boolean
}

export default function AdminClientsPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [filter, setFilter] = useState<'all' | 'needsRefill'>('needsRefill')
  const [error, setError] = useState('')
  const [sendingBirthday, setSendingBirthday] = useState(false)
  const [birthdayResult, setBirthdayResult] = useState<{ sent: number; failed: number } | null>(null)

  useEffect(() => {
    loadClients()
  }, [filter])

  const loadClients = async () => {
    try {
      setLoading(true)
      const url = filter === 'needsRefill' 
        ? '/api/admin/clients?needsRefill=true'
        : '/api/admin/clients'
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to load clients')
      }
      const data = await response.json()
      setClients(data.clients || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatPhoneForSMS = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    // If it starts with country code, return as is, otherwise assume local format
    if (digits.startsWith('254')) {
      return digits
    }
    // If starts with 0, replace with 254
    if (digits.startsWith('0')) {
      return '254' + digits.substring(1)
    }
    // Otherwise assume it's already in correct format or add 254
    return digits.length === 9 ? '254' + digits : digits
  }

  const handleSMS = (client: Client) => {
    const phone = formatPhoneForSMS(client.profile.phone)
    const message = encodeURIComponent(
      `Hi ${client.profile.name}, it's been ${client.daysSinceLastAppointment} days since your last lash appointment. Would you like to book a refill or a new full lash set? Reply to this message or book online at lashdiary.co.ke`
    )
    window.open(`sms:${phone}?body=${message}`, '_blank')
  }

  const needsRefillCount = clients.filter(c => c.needsRefill).length

  const handleSendBirthdayEmails = async () => {
    if (!confirm('Send birthday emails to all clients whose birthday is today? This will create 12% discount codes valid for 7 days.')) {
      return
    }

    setSendingBirthday(true)
    setBirthdayResult(null)
    try {
      const response = await fetch('/api/admin/birthday/send', {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send birthday emails')
      }
      setBirthdayResult({ sent: data.sent || 0, failed: data.failed || 0 })
    } catch (err: any) {
      setError(err.message || 'Failed to send birthday emails')
    } finally {
      setSendingBirthday(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display text-brown-dark mb-2">Client Management</h1>
          <p className="text-brown/70">Manage your clients and track refill schedules</p>
        </div>

        {/* Birthday Email Section */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-brown/10 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brown-dark mb-1">Birthday Discounts</h2>
              <p className="text-sm text-brown/70">
                Send birthday emails with 12% discount codes (valid 7 days) to clients whose birthday is today.
              </p>
              {birthdayResult && (
                <p className="text-sm text-green-600 mt-2">
                  Sent: {birthdayResult.sent} | Failed: {birthdayResult.failed}
                </p>
              )}
            </div>
            <button
              onClick={handleSendBirthdayEmails}
              disabled={sendingBirthday}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {sendingBirthday ? 'Sending...' : 'Send Birthday Emails'}
            </button>
          </div>
          <p className="text-xs text-brown/60 mt-3">
            Tip: Set up a daily cron job to call <code className="bg-brown-light px-1 rounded">POST /api/admin/birthday/send</code> to automatically send birthday emails.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-4 border-b border-brown/20">
          <button
            onClick={() => setFilter('needsRefill')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'needsRefill'
                ? 'text-brown-dark border-b-2 border-brown-dark'
                : 'text-brown/70 hover:text-brown-dark'
            }`}
          >
            Needs Refill ({needsRefillCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'all'
                ? 'text-brown-dark border-b-2 border-brown-dark'
                : 'text-brown/70 hover:text-brown-dark'
            }`}
          >
            All Clients ({clients.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-dark mx-auto mb-4"></div>
            <p className="text-brown/70">Loading clients...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 text-center border border-brown/10">
            <p className="text-brown/70">
              {filter === 'needsRefill' 
                ? 'No clients need refills at this time.'
                : 'No clients found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.profile.id}
                className={`bg-white/80 backdrop-blur-sm rounded-xl p-6 border ${
                  client.needsRefill
                    ? 'border-red-200 shadow-lg'
                    : 'border-brown/10 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-display text-brown-dark">
                        {client.profile.name}
                      </h3>
                      {client.needsRefill && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          Needs Refill
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-brown/70">Email:</span>
                        <span className="ml-2 text-brown-dark">{client.profile.email}</span>
                      </div>
                      <div>
                        <span className="text-brown/70">Phone:</span>
                        <span className="ml-2 text-brown-dark">{client.profile.phone}</span>
                      </div>
                      <div>
                        <span className="text-brown/70">Last Appointment:</span>
                        <span className="ml-2 text-brown-dark">
                          {formatDate(client.lastAppointmentDate)}
                        </span>
                        {client.daysSinceLastAppointment !== undefined && (
                          <span className="ml-2 text-brown/60">
                            ({client.daysSinceLastAppointment} days ago)
                          </span>
                        )}
                      </div>
                      {client.recommendedRefillDate && (
                        <div>
                          <span className="text-brown/70">Recommended Refill:</span>
                          <span className="ml-2 text-brown-dark">
                            {formatDate(client.recommendedRefillDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {client.needsRefill && (
                      <button
                        onClick={() => handleSMS(client)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        Send SMS
                      </button>
                    )}
                    <Link
                      href={`/admin/clients/${client.profile.id}`}
                      className="px-4 py-2 bg-brown-dark hover:bg-brown text-white rounded-lg text-sm font-medium transition-colors text-center whitespace-nowrap"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

