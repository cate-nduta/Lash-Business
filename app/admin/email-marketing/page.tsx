'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

interface CustomerEmail {
  email: string
  name: string
  lastBookingDate: string
  totalBookings: number
}

interface EmailCampaign {
  id: string
  subject: string
  content: string
  recipientType: 'all' | 'first-time' | 'returning'
  sentAt: string | null
  createdAt: string
  totalRecipients: number
  opened: number
  clicked: number
  notOpened: number
}

export default function AdminEmailMarketing() {
  const [customers, setCustomers] = useState<CustomerEmail[]>([])
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'compose' | 'campaigns' | 'customers'>('compose')
  const [composeData, setComposeData] = useState({
    subject: '',
    content: '',
    recipientType: 'all' as 'all' | 'first-time' | 'returning',
  })
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadData()
        }
      })
  }, [router])

  const loadData = async () => {
    try {
      const [customersRes, campaignsRes] = await Promise.all([
        fetch('/api/admin/email-marketing/customers'),
        fetch('/api/admin/email-marketing/campaigns'),
      ])

      if (customersRes.ok) {
        const customersData = await customersRes.json()
        setCustomers(customersData.customers || [])
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json()
        setCampaigns(campaignsData.campaigns || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setComposeData({ ...composeData, [name]: value })
    setHasUnsavedChanges(true)
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/email-marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ 
          type: 'success', 
          text: `Email sent successfully to ${data.recipientsCount} recipients!` 
        })
        setComposeData({
          subject: '',
          content: '',
          recipientType: 'all',
        })
        setHasUnsavedChanges(false)
        loadData()
        setActiveTab('campaigns')
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email' })
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSending(false)
    }
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setPendingNavigation(href)
      setShowUnsavedDialog(true)
    }
  }

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    setComposeData({
      subject: '',
      content: '',
      recipientType: 'all',
    })
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const handleCancelDialog = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getRecipientCount = () => {
    if (composeData.recipientType === 'all') return customers.length
    if (composeData.recipientType === 'first-time') {
      return customers.filter(c => c.totalBookings === 1).length
    }
    return customers.filter(c => c.totalBookings > 1).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkClick(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-6">Email Marketing</h1>
          
          <div className="flex gap-4 border-b-2 border-brown-light mb-6">
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'compose'
                  ? 'bg-brown-dark text-white border-b-2 border-brown-dark'
                  : 'text-brown hover:text-brown-dark'
              }`}
            >
              Compose Email
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'campaigns'
                  ? 'bg-brown-dark text-white border-b-2 border-brown-dark'
                  : 'text-brown hover:text-brown-dark'
              }`}
            >
              Campaigns ({campaigns.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'customers'
                  ? 'bg-brown-dark text-white border-b-2 border-brown-dark'
                  : 'text-brown hover:text-brown-dark'
              }`}
            >
              Customers ({customers.length})
            </button>
          </div>

          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <form onSubmit={handleSendEmail} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Recipients
                </label>
                <select
                  name="recipientType"
                  value={composeData.recipientType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                >
                  <option value="all">All Customers ({customers.length})</option>
                  <option value="first-time">First-Time Clients ({customers.filter(c => c.totalBookings === 1).length})</option>
                  <option value="returning">Returning Clients ({customers.filter(c => c.totalBookings > 1).length})</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Will be sent to {getRecipientCount()} recipients
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={composeData.subject}
                  onChange={handleInputChange}
                  placeholder="e.g., New Service Launch - Mega Volume Lashes!"
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Email Content *
                </label>
                <textarea
                  name="content"
                  required
                  rows={12}
                  value={composeData.content}
                  onChange={handleInputChange}
                  placeholder="Write your email content here. You can use HTML for formatting..."
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can use HTML tags for formatting. The email will use your brand colors automatically.
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-semibold mb-2">Email Preview:</p>
                <p className="text-xs text-blue-700">
                  • Subject: {composeData.subject || '(No subject)'}
                </p>
                <p className="text-xs text-blue-700">
                  • Recipients: {getRecipientCount()} customers
                </p>
                <p className="text-xs text-blue-700">
                  • Email will be tracked for opens and clicks
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={sending || !composeData.subject || !composeData.content}
                  className="flex-1 px-6 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {sending ? 'Sending...' : `Send Email to ${getRecipientCount()} Recipients`}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setSending(true)
                    setMessage(null)
                    try {
                      const response = await fetch('/api/admin/email-marketing/test-send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          subject: composeData.subject,
                          content: composeData.content,
                        }),
                      })
                      const data = await response.json()
                      if (response.ok && data.success) {
                        setMessage({ type: 'success', text: `Test email sent to your personal email (${data.message || 'catherinenkuria@gmail.com'})!` })
                      } else {
                        setMessage({ type: 'error', text: data.error || 'Failed to send test email' })
                      }
                    } catch (error) {
                      console.error('Error sending test email:', error)
                      setMessage({ type: 'error', text: 'An error occurred' })
                    } finally {
                      setSending(false)
                    }
                  }}
                  disabled={sending || !composeData.subject || !composeData.content}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Send Test Email
                </button>
              </div>
            </form>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div>
              {campaigns.length === 0 ? (
                <div className="text-center text-brown py-8">
                  No email campaigns yet. Compose your first email!
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((campaign) => (
                      <div
                        key={campaign.id}
                        className="bg-pink-light/30 rounded-lg p-6 border-2 border-brown-light"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-brown-dark mb-2">
                              {campaign.subject}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Sent: {campaign.sentAt ? formatDate(campaign.sentAt) : 'Draft'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Recipients: {campaign.totalRecipients} customers
                            </p>
                          </div>
                          {campaign.sentAt && (
                            <div className="text-right">
                              <div className="text-sm font-semibold text-green-700">
                                {campaign.opened} Opened ({((campaign.opened / campaign.totalRecipients) * 100).toFixed(1)}%)
                              </div>
                              <div className="text-sm font-semibold text-blue-700">
                                {campaign.clicked} Clicked ({((campaign.clicked / campaign.totalRecipients) * 100).toFixed(1)}%)
                              </div>
                              <div className="text-sm font-semibold text-gray-600">
                                {campaign.notOpened} Not Opened ({((campaign.notOpened / campaign.totalRecipients) * 100).toFixed(1)}%)
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-white rounded p-4 border border-brown-light">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {campaign.content.substring(0, 200)}
                            {campaign.content.length > 200 ? '...' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div>
              {customers.length === 0 ? (
                <div className="text-center text-brown py-8">
                  No customer emails yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-brown-light">
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Name</th>
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Email</th>
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Total Bookings</th>
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Last Booking</th>
                        <th className="text-left py-3 px-4 text-brown-dark font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer, index) => (
                        <tr key={index} className="border-b border-brown-light/30 hover:bg-pink-light/20">
                          <td className="py-3 px-4 text-brown font-medium">{customer.name}</td>
                          <td className="py-3 px-4 text-brown">{customer.email}</td>
                          <td className="py-3 px-4 text-brown font-semibold">{customer.totalBookings}</td>
                          <td className="py-3 px-4 text-brown">
                            {formatDate(customer.lastBookingDate)}
                          </td>
                          <td className="py-3 px-4">
                            {customer.totalBookings === 1 ? (
                              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                First-Time
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                Returning
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={() => {}}
        onLeave={handleLeaveWithoutSaving}
        onCancel={handleCancelDialog}
        saving={false}
      />
    </div>
  )
}

