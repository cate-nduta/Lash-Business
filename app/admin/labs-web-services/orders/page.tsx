'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

interface Order {
  id: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
    billingPeriod?: 'one-time' | 'yearly'
    setupFee?: number
  }>
  subtotal: number
  setupFeesTotal?: number
  domainPricing?: {
    setupFee: number
    annualPrice: number
    totalFirstPayment: number
  }
  referralDiscount?: number
  appliedReferralCode?: string
  total: number
  initialPayment: number
  remainingPayment: number
  paymentStatus: 'pending' | 'partial' | 'completed'
  name: string
  email: string
  phoneNumber: string
  websiteType?: 'personal' | 'business'
  businessName?: string
  domainType?: 'new' | 'existing'
  domainExtension?: string
  domainName?: string
  existingDomain?: string
  logoType?: 'upload' | 'text' | 'custom'
  logoUrl?: string
  logoText?: string
  primaryColor?: string
  secondaryColor?: string
  businessDescription?: string
  personalWebsiteAbout?: string
  businessAddress?: string
  businessCity?: string
  businessCountry?: string
  businessHours?: Array<{
    day: string
    open: string
    close: string
    closed: boolean
  }>
  servicesProducts?: string
  socialMediaLinks?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
    youtube?: string
    tiktok?: string
  }
  timeline?: '10' | '21' | 'urgent'
  priorityFee?: number
  consultationDate?: string // Consultation call date (YYYY-MM-DD format)
  consultationTimeSlot?: string // Consultation call time slot (ISO string)
  consultationMeetingType?: 'online' | 'phone' // Meeting type: 'online' for Google Meet, 'phone' for Phone/WhatsApp Call
  createdAt: string
  websiteName?: string
  websiteUrl?: string
  meetingLink?: string
  showcaseBookingToken?: string
  status: 'pending' | 'in_progress' | 'completed' | 'delivered'
  adminNotes?: string
  payments?: Array<{
    amount: number
    method: string
    date: string
    transactionId: string
  }>
}

export default function LabsWebServicesOrders() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [deliveryData, setDeliveryData] = useState({
    websiteName: '',
    websiteUrl: '',
    meetingLink: '',
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingReferralEmail, setSendingReferralEmail] = useState(false)
  const [sendingReminderEmail, setSendingReminderEmail] = useState<string | null>(null)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [onboardingData, setOnboardingData] = useState({
    emailDomain: '',
    emailPassword: '',
    websiteUrl: '',
  })
  const [sendingOnboardingEmail, setSendingOnboardingEmail] = useState(false)

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

        const response = await fetch('/api/admin/labs-web-services/orders', { credentials: 'include' })
        if (!response.ok) {
          throw new Error('Failed to load orders')
        }
        const data = await response.json()
        if (!isMounted) return

        setOrders(Array.isArray(data.orders) ? data.orders : [])
      } catch (error) {
        console.error('Error loading orders:', error)
        if (isMounted) {
          setMessage({ type: 'error', text: 'Failed to load orders. Please refresh the page.' })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleSendWebsiteDetails = async () => {
    if (!selectedOrder) return

    if (!deliveryData.websiteName || !deliveryData.websiteUrl || !deliveryData.meetingLink) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    setSendingEmail(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/labs-web-services/orders/send-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: selectedOrder.id,
          websiteName: deliveryData.websiteName,
          websiteUrl: deliveryData.websiteUrl,
          meetingLink: deliveryData.meetingLink,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send website details')
      }

      // Update order in local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? {
                ...o,
                websiteName: deliveryData.websiteName,
                websiteUrl: deliveryData.websiteUrl,
                meetingLink: deliveryData.meetingLink,
                status: 'delivered',
              }
            : o
        )
      )

      setMessage({ type: 'success', text: 'Website details sent successfully!' })
      setShowDeliveryModal(false)
      setSelectedOrder(null)
      setDeliveryData({ websiteName: '', websiteUrl: '', meetingLink: '' })
    } catch (error: any) {
      console.error('Error sending website details:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to send website details' })
    } finally {
      setSendingEmail(false)
    }
  }

  const openDeliveryModal = (order: Order) => {
    setSelectedOrder(order)
    setDeliveryData({
      websiteName: order.websiteName || '',
      websiteUrl: order.websiteUrl || '',
      meetingLink: order.meetingLink || '',
    })
    setShowDeliveryModal(true)
  }

  const openOnboardingModal = (order: Order) => {
    setSelectedOrder(order)
    // Pre-fill email domain from order if available
    const emailDomain = order.domainName && order.domainExtension 
      ? `${order.domainName}${order.domainExtension}` 
      : (order.domainType === 'existing' && order.existingDomain
        ? order.existingDomain
        : '')
    
    setOnboardingData({
      emailDomain,
      emailPassword: '',
      websiteUrl: order.websiteUrl || '',
    })
    setShowOnboardingModal(true)
  }

  const handleSendOnboardingEmail = async () => {
    if (!selectedOrder) return

    if (!onboardingData.emailDomain || !onboardingData.emailPassword) {
      setMessage({ type: 'error', text: 'Please fill in email domain and password' })
      return
    }

    setSendingOnboardingEmail(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/labs-web-services/orders/send-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: selectedOrder.id,
          emailDomain: onboardingData.emailDomain.trim(),
          emailPassword: onboardingData.emailPassword.trim(),
          websiteUrl: onboardingData.websiteUrl.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send onboarding email')
      }

      setMessage({ type: 'success', text: 'Onboarding email sent successfully!' })
      setShowOnboardingModal(false)
      setOnboardingData({ emailDomain: '', emailPassword: '', websiteUrl: '' })
      setSelectedOrder(null)

      // Reload orders to get updated status
      const loadResponse = await fetch('/api/admin/labs-web-services/orders', {
        credentials: 'include',
      })
      if (loadResponse.ok) {
        const ordersData = await loadResponse.json()
        setOrders(ordersData.orders || [])
      }
    } catch (error: any) {
      console.error('Error sending onboarding email:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to send onboarding email' })
    } finally {
      setSendingOnboardingEmail(false)
    }
  }

  const handleSendReferralEmail = async (order: Order) => {
    setSendingReferralEmail(true)
    setMessage(null)

    try {
      const response = await fetch('/api/labs/referrals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: order.id,
          email: order.email,
          orderTotal: order.total,
          businessName: order.businessName || order.email.split('@')[0],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send referral email')
      }

      setMessage({ type: 'success', text: `Referral email sent successfully! Code: ${data.code}` })
    } catch (error: any) {
      console.error('Error sending referral email:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to send referral email' })
    } finally {
      setSendingReferralEmail(false)
    }
  }

  const handleSendReminderEmail = async (order: Order) => {
    setSendingReminderEmail(order.id)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/labs-web-services/orders/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: order.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reminder email')
      }

      setMessage({ type: 'success', text: 'Reminder email sent successfully!' })
    } catch (error: any) {
      console.error('Error sending reminder email:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to send reminder email' })
    } finally {
      setSendingReminderEmail(null)
    }
  }

  if (loading || authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    delivered: 'bg-purple-100 text-purple-700',
  }

  const paymentStatusColors = {
    pending: 'bg-gray-100 text-gray-700',
    partial: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-display text-brown-dark mb-2">Labs Web Services Orders</h1>
            <p className="text-brown-dark/80">Manage orders and send website details to customers</p>
          </div>
          <button
            onClick={() => router.push('/admin/labs-web-services')}
            className="inline-flex items-center justify-center rounded-full border border-brown-light px-4 py-2 text-sm font-semibold text-brown hover:border-brown-dark hover:text-brown-dark transition-colors"
          >
            ← Back to Web Services
          </button>
        </div>

        {message && (
          <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-brown-dark/70 text-lg">No orders yet</p>
            <p className="text-brown-dark/50 text-sm mt-2">
              Orders will appear here when customers make purchases
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-lg border-2 border-brown-light p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-brown-dark mb-1">
                            Order #{order.id}
                          </h3>
                          <p className="text-sm text-brown-dark/70">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              statusColors[order.status] || statusColors.pending
                            }`}
                          >
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              paymentStatusColors[order.paymentStatus] || paymentStatusColors.pending
                            }`}
                          >
                            {order.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Website Type */}
                      {order.websiteType && (
                        <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm text-brown-dark/70">
                            <strong>Website Type:</strong>{' '}
                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold capitalize">
                              {order.websiteType}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Business/Personal Details */}
                      {(order.businessName || order.websiteType) && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-brown-dark mb-3 text-sm">
                            {order.websiteType === 'personal' ? 'Personal' : 'Business'} Details
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              {order.businessName && (
                              <p className="text-sm text-brown-dark/70 mb-1">
                                  <strong>{order.websiteType === 'personal' ? 'Personal Name' : 'Business Name'}:</strong> {order.businessName}
                              </p>
                              )}
                              {order.domainType === 'new' && order.domainName && (
                                <p className="text-sm text-brown-dark/70">
                                  <strong>Domain:</strong> {order.domainName}{order.domainExtension || '.co.ke'}
                                </p>
                              )}
                              {order.domainType === 'existing' && order.existingDomain && (
                                <p className="text-sm text-brown-dark/70">
                                  <strong>Existing Domain:</strong> {order.existingDomain}
                                </p>
                              )}
                            </div>
                            <div>
                              {order.logoType === 'upload' && order.logoUrl && (
                                <div>
                                  <p className="text-sm text-brown-dark/70 mb-2">
                                    <strong>Logo:</strong> Uploaded
                                  </p>
                                  <img src={order.logoUrl} alt="Logo" className="max-h-16 max-w-32 object-contain" />
                                </div>
                              )}
                              {order.logoType === 'text' && order.logoText && (
                                <p className="text-sm text-brown-dark/70">
                                  <strong>Logo:</strong> Text - "{order.logoText}"
                                </p>
                              )}
                              {order.logoType === 'custom' && (
                                <p className="text-sm text-brown-dark/70">
                                  <strong>Logo:</strong> Custom Design (Service in cart)
                                </p>
                              )}
                            </div>
                            {(order.primaryColor || order.secondaryColor) && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  Website Colors:
                                </p>
                                <div className="flex items-center gap-4">
                                  {order.primaryColor && (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-8 h-8 rounded border-2 border-brown-light"
                                        style={{ backgroundColor: order.primaryColor }}
                                      />
                                      <div>
                                        <p className="text-xs text-brown-dark/70">Primary</p>
                                        <p className="text-xs font-mono text-brown-dark">{order.primaryColor}</p>
                                      </div>
                                    </div>
                                  )}
                                  {order.secondaryColor && (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-8 h-8 rounded border-2 border-brown-light"
                                        style={{ backgroundColor: order.secondaryColor }}
                                      />
                                      <div>
                                        <p className="text-xs text-brown-dark/70">Secondary</p>
                                        <p className="text-xs font-mono text-brown-dark">{order.secondaryColor}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Business/Personal Description */}
                            {(order.businessDescription || order.personalWebsiteAbout) && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  {order.websiteType === 'personal' ? 'About' : 'Business Description'}:
                                </p>
                                <p className="text-sm text-brown-dark/70 whitespace-pre-wrap">
                                  {order.websiteType === 'personal' ? order.personalWebsiteAbout : order.businessDescription}
                                </p>
                              </div>
                            )}

                            {/* Business Address */}
                            {(order.businessAddress || order.businessCity || order.businessCountry) && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  Business Address:
                                </p>
                                <p className="text-sm text-brown-dark/70">
                                  {order.businessAddress && `${order.businessAddress}, `}
                                  {order.businessCity && `${order.businessCity}, `}
                                  {order.businessCountry}
                                </p>
                              </div>
                            )}

                            {/* Business Hours */}
                            {order.businessHours && order.businessHours.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  Business Hours:
                                </p>
                                <div className="space-y-1">
                                  {order.businessHours.map((day, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm text-brown-dark/70">
                                      <span className="w-20 font-medium">{day.day}:</span>
                                      {day.closed ? (
                                        <span className="text-brown-dark/50 italic">Closed</span>
                                      ) : (
                                        <span>{day.open} - {day.close}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Services/Products */}
                            {order.servicesProducts && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  Services/Products:
                                </p>
                                <div className="text-sm text-brown-dark/70 whitespace-pre-wrap">
                                  {order.servicesProducts}
                                </div>
                              </div>
                            )}

                            {/* Social Media Links */}
                            {order.socialMediaLinks && Object.values(order.socialMediaLinks).some(link => link && link.trim()) && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  Social Media Links:
                                </p>
                                <div className="space-y-1">
                                  {order.socialMediaLinks.facebook && (
                                    <div className="text-sm text-brown-dark/70">
                                      <strong>Facebook:</strong>{' '}
                                      <a href={order.socialMediaLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-brown-dark underline hover:text-brown">
                                        {order.socialMediaLinks.facebook}
                                      </a>
                                    </div>
                                  )}
                                  {order.socialMediaLinks.instagram && (
                                    <div className="text-sm text-brown-dark/70">
                                      <strong>Instagram:</strong>{' '}
                                      <a href={order.socialMediaLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-brown-dark underline hover:text-brown">
                                        {order.socialMediaLinks.instagram}
                                      </a>
                                    </div>
                                  )}
                                  {order.socialMediaLinks.twitter && (
                                    <div className="text-sm text-brown-dark/70">
                                      <strong>Twitter/X:</strong>{' '}
                                      <a href={order.socialMediaLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-brown-dark underline hover:text-brown">
                                        {order.socialMediaLinks.twitter}
                                      </a>
                                    </div>
                                  )}
                                  {order.socialMediaLinks.linkedin && (
                                    <div className="text-sm text-brown-dark/70">
                                      <strong>LinkedIn:</strong>{' '}
                                      <a href={order.socialMediaLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-brown-dark underline hover:text-brown">
                                        {order.socialMediaLinks.linkedin}
                                      </a>
                                    </div>
                                  )}
                                  {order.socialMediaLinks.youtube && (
                                    <div className="text-sm text-brown-dark/70">
                                      <strong>YouTube:</strong>{' '}
                                      <a href={order.socialMediaLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-brown-dark underline hover:text-brown">
                                        {order.socialMediaLinks.youtube}
                                      </a>
                                    </div>
                                  )}
                                  {order.socialMediaLinks.tiktok && (
                                    <div className="text-sm text-brown-dark/70">
                                      <strong>TikTok:</strong>{' '}
                                      <a href={order.socialMediaLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-brown-dark underline hover:text-brown">
                                        {order.socialMediaLinks.tiktok}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Timeline/Deadline */}
                            {order.timeline && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  Timeline/Deadline:
                                </p>
                                <div className="flex items-center gap-2">
                                  {order.timeline === '21' && (
                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                      21 Days (Standard)
                                    </span>
                                  )}
                                  {order.timeline === '10' && (
                                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                      10 Days (Fast Track)
                                    </span>
                                  )}
                                  {order.timeline === 'urgent' && (
                                    <>
                                      <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                        Less than 10 Days (Priority)
                                      </span>
                                      {order.priorityFee && (
                                        <span className="text-sm text-brown-dark/70">
                                          (Priority Fee: KES {order.priorityFee.toLocaleString()})
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Consultation Call Scheduling */}
                            {(order.consultationDate || order.consultationTimeSlot) && (
                              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-brown-dark mb-2">
                                  Consultation Call Scheduled:
                                </p>
                                {order.consultationDate && (
                                  <p className="text-sm text-brown-dark/70 mb-1">
                                    <strong>Date:</strong>{' '}
                                    {new Date(order.consultationDate).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </p>
                                )}
                                {order.consultationTimeSlot && (
                                  <p className="text-sm text-brown-dark/70 mb-1">
                                    <strong>Time:</strong>{' '}
                                    {(() => {
                                      try {
                                        const date = new Date(order.consultationTimeSlot)
                                        return date.toLocaleTimeString('en-US', {
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true,
                                        })
                                      } catch {
                                        return order.consultationTimeSlot
                                      }
                                    })()}
                                  </p>
                                )}
                                {order.consultationMeetingType && (
                                  <p className="text-sm text-brown-dark/70">
                                    <strong>Type:</strong> {order.consultationMeetingType === 'phone' ? 'Phone/WhatsApp Call' : 'Google Meet (Online)'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Spin Wheel Information */}
                      {order.appliedReferralCode && order.appliedReferralCode.startsWith('SPIN') && (
                        <div className="mt-4 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                          <h4 className="font-semibold text-purple-900 mb-2 text-sm flex items-center gap-2">
                            🎡 Spin Wheel Prize Used
                          </h4>
                          <p className="text-sm text-purple-900 mb-1">
                            <strong>Spin Wheel Code:</strong> <code className="bg-purple-100 px-2 py-1 rounded font-mono text-xs">{order.appliedReferralCode}</code>
                          </p>
                          {order.referralDiscount !== undefined && order.referralDiscount > 0 && (
                            <p className="text-sm text-purple-900">
                              <strong>Discount Applied:</strong> KES {order.referralDiscount.toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-purple-700 mt-2 italic">
                            This customer won a spin wheel prize and used it during checkout.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-brown-light/20 rounded-lg p-4">
                          <h4 className="font-semibold text-brown-dark mb-2 text-sm">
                            Customer Information
                          </h4>
                          <p className="text-sm text-brown-dark/70 mb-1">
                            <strong>Name:</strong> {order.name}
                          </p>
                          <p className="text-sm text-brown-dark/70 mb-1">
                            <strong>Email:</strong> {order.email}
                          </p>
                            <p className="text-sm text-brown-dark/70">
                              <strong>Phone:</strong> {order.phoneNumber}
                            </p>
                        </div>

                        <div className="bg-brown-light/20 rounded-lg p-4">
                          <h4 className="font-semibold text-brown-dark mb-2 text-sm">
                            Payment Details
                          </h4>
                          <p className="text-sm text-brown-dark/70 mb-1">
                            <strong>Subtotal:</strong> KES {(order.subtotal || 0).toLocaleString()}
                          </p>
                          {order.setupFeesTotal !== undefined && order.setupFeesTotal > 0 && (
                            <p className="text-sm text-brown-dark/70 mb-1">
                              <strong>Setup Fees:</strong> KES {order.setupFeesTotal.toLocaleString()}
                            </p>
                          )}
                          {order.domainPricing && (
                            <div className="mb-1 text-sm text-brown-dark/70">
                              <strong>Domain Pricing:</strong>
                              <div className="ml-2 mt-1 space-y-0.5">
                                <p className="text-xs">Setup: KES {order.domainPricing.setupFee.toLocaleString()}</p>
                                <p className="text-xs">Annual: KES {order.domainPricing.annualPrice.toLocaleString()}</p>
                                <p className="text-xs font-semibold">First Payment: KES {order.domainPricing.totalFirstPayment.toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                          {order.referralDiscount !== undefined && order.referralDiscount > 0 && (
                            <p className="text-sm text-green-600 mb-1">
                              <strong>Discount ({order.appliedReferralCode || 'Code'}):</strong> -KES {order.referralDiscount.toLocaleString()}
                              {order.appliedReferralCode && order.appliedReferralCode.startsWith('SPIN') && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">🎡 Spin Wheel</span>
                              )}
                            </p>
                          )}
                          <p className="text-sm text-brown-dark/70 mb-1 font-semibold border-t border-brown-light pt-1 mt-1">
                            <strong>Total:</strong> KES {order.total.toLocaleString()}
                          </p>
                          <p className="text-sm text-brown-dark/70 mb-1">
                            <strong>Paid:</strong> KES {order.initialPayment.toLocaleString()}
                          </p>
                          {order.remainingPayment > 0 && (
                            <p className="text-sm text-brown-dark/70 font-semibold">
                              <strong>Remaining:</strong> KES {order.remainingPayment.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 bg-brown-light/20 rounded-lg p-4">
                        <h4 className="font-semibold text-brown-dark mb-2 text-sm">Order Items</h4>
                        <ul className="space-y-2">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-brown-dark/70 border-b border-brown-light/30 pb-2 last:border-b-0">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-semibold text-brown-dark">{item.productName} (x{item.quantity})</p>
                                  <div className="mt-1 space-y-0.5">
                                    {item.billingPeriod && (
                                      <p className="text-xs text-brown-dark/60">
                                        Billing: <span className="font-medium capitalize">{item.billingPeriod === 'yearly' ? 'Annual' : 'One-time'}</span>
                                      </p>
                                    )}
                                    {item.setupFee !== undefined && item.setupFee > 0 && (
                                      <p className="text-xs text-brown-dark/60">
                                        Setup Fee: <span className="font-medium">KES {item.setupFee.toLocaleString()}</span>
                                      </p>
                                    )}
                                    <p className="text-xs text-brown-dark/60">
                                      Unit Price: <span className="font-medium">KES {item.price.toLocaleString()}</span>
                                      {item.billingPeriod === 'yearly' && ' per year'}
                                    </p>
                                    {item.setupFee !== undefined && item.setupFee > 0 && item.billingPeriod === 'yearly' && (
                                      <p className="text-xs font-semibold text-brown-dark mt-1">
                                        Total First Payment: KES {((item.price * item.quantity) + (item.setupFee * item.quantity)).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="font-semibold text-brown-dark">
                                    KES {(item.price * item.quantity).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {order.websiteName && order.websiteUrl && (
                        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-2 text-sm">
                            Website Details (Sent)
                          </h4>
                          <p className="text-sm text-green-700 mb-1">
                            <strong>Name:</strong> {order.websiteName}
                          </p>
                          <p className="text-sm text-green-700 mb-1">
                            <strong>URL:</strong>{' '}
                            <a
                              href={order.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 underline"
                            >
                              {order.websiteUrl}
                            </a>
                          </p>
                          {order.meetingLink && (
                            <p className="text-sm text-green-700">
                              <strong>Meeting:</strong>{' '}
                              <a
                                href={order.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 underline"
                              >
                                Join Meeting
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 md:min-w-[200px]">
                      {order.paymentStatus === 'pending' && (
                        <button
                          onClick={() => handleSendReminderEmail(order)}
                          disabled={sendingReminderEmail === order.id}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingReminderEmail === order.id ? 'Sending...' : 'Send Reminder Email'}
                        </button>
                      )}
                      <button
                        onClick={() => handleSendReferralEmail(order)}
                        disabled={sendingReferralEmail}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingReferralEmail ? 'Sending...' : 'Send Referral Email'}
                      </button>
                      <button
                        onClick={() => openOnboardingModal(order)}
                        disabled={sendingOnboardingEmail}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingOnboardingEmail ? 'Sending...' : 'Send Onboarding Email'}
                      </button>
                      {order.paymentStatus === 'completed' &&
                        order.status !== 'delivered' &&
                        !order.websiteName && (
                          <button
                            onClick={() => openDeliveryModal(order)}
                            className="w-full px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-semibold"
                          >
                            Send Website Details
                          </button>
                        )}
                      {order.status === 'pending' && order.paymentStatus !== 'pending' && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/admin/labs-web-services/orders/${order.id}/status`,
                                {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ status: 'in_progress' }),
                                }
                              )
                              if (response.ok) {
                                setOrders((prev) =>
                                  prev.map((o) =>
                                    o.id === order.id ? { ...o, status: 'in_progress' } : o
                                  )
                                )
                                setMessage({ type: 'success', text: 'Order status updated' })
                              }
                            } catch (error) {
                              setMessage({ type: 'error', text: 'Failed to update status' })
                            }
                          }}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                        >
                          Mark as In Progress
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Delivery Modal */}
      {showDeliveryModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">
              Send Website Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Website Name *
                </label>
                <input
                  type="text"
                  value={deliveryData.websiteName}
                  onChange={(e) =>
                    setDeliveryData({ ...deliveryData, websiteName: e.target.value })
                  }
                  placeholder="e.g., My Business Website"
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  value={deliveryData.websiteUrl}
                  onChange={(e) =>
                    setDeliveryData({ ...deliveryData, websiteUrl: e.target.value })
                  }
                  placeholder="https://example.com"
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Meeting Link *
                </label>
                <input
                  type="url"
                  value={deliveryData.meetingLink}
                  onChange={(e) =>
                    setDeliveryData({ ...deliveryData, meetingLink: e.target.value })
                  }
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSendWebsiteDetails}
                disabled={sendingEmail}
                className="flex-1 bg-brown-dark hover:bg-brown text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
              <button
                onClick={() => {
                  setShowDeliveryModal(false)
                  setSelectedOrder(null)
                  setDeliveryData({ websiteName: '', websiteUrl: '', meetingLink: '' })
                }}
                className="flex-1 bg-brown-light hover:bg-brown text-brown-dark font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Email Modal */}
      {showOnboardingModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">
              Send Onboarding Email
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Email Domain *
                </label>
                <input
                  type="text"
                  value={onboardingData.emailDomain}
                  onChange={(e) =>
                    setOnboardingData({ ...onboardingData, emailDomain: e.target.value })
                  }
                  placeholder="e.g., yourbusiness.co.ke"
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
                <p className="text-xs text-brown-dark/60 mt-1">
                  The domain name for their email address (e.g., yourbusiness.co.ke)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Email Password *
                </label>
                <input
                  type="text"
                  value={onboardingData.emailPassword}
                  onChange={(e) =>
                    setOnboardingData({ ...onboardingData, emailPassword: e.target.value })
                  }
                  placeholder="Enter password for their email"
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
                <p className="text-xs text-brown-dark/60 mt-1">
                  The password for their business email account
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Website URL (Optional)
                </label>
                <input
                  type="url"
                  value={onboardingData.websiteUrl}
                  onChange={(e) =>
                    setOnboardingData({ ...onboardingData, websiteUrl: e.target.value })
                  }
                  placeholder="https://example.com"
                  className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
                <p className="text-xs text-brown-dark/60 mt-1">
                  If not already set, enter the website URL here
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSendOnboardingEmail}
                disabled={sendingOnboardingEmail}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {sendingOnboardingEmail ? 'Sending...' : 'Send Onboarding Email'}
              </button>
              <button
                onClick={() => {
                  setShowOnboardingModal(false)
                  setSelectedOrder(null)
                  setOnboardingData({ emailDomain: '', emailPassword: '', websiteUrl: '' })
                }}
                className="flex-1 bg-brown-light hover:bg-brown text-brown-dark font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Management Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
        <h2 className="text-2xl font-semibold text-brown-dark mb-4">Waitlist Management</h2>
        <WaitlistSection />
      </div>
    </div>
  )
}

function WaitlistSection() {
  const [waitlistEntries, setWaitlistEntries] = useState<Array<{ email: string; createdAt: string; notified?: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [sendingNotifications, setSendingNotifications] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const loadWaitlist = async () => {
      try {
        const response = await fetch('/api/labs/web-services/waitlist', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setWaitlistEntries(data.entries || [])
        }
      } catch (error) {
        console.error('Error loading waitlist:', error)
      } finally {
        setLoading(false)
      }
    }
    loadWaitlist()
  }, [])

  const handleSendNotifications = async () => {
    if (!confirm('Send notification emails to all waitlist members? This will notify them that slots are now available.')) {
      return
    }

    setSendingNotifications(true)
    setMessage(null)

    try {
      const response = await fetch('/api/labs/web-services/waitlist/notify', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: `Successfully sent ${data.sent} notification email(s). ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
        })
        // Reload waitlist to update notified status
        const waitlistResponse = await fetch('/api/labs/web-services/waitlist', { credentials: 'include' })
        if (waitlistResponse.ok) {
          const waitlistData = await waitlistResponse.json()
          setWaitlistEntries(waitlistData.entries || [])
        }
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send notifications',
        })
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
      setMessage({
        type: 'error',
        text: 'Failed to send notifications. Please try again.',
      })
    } finally {
      setSendingNotifications(false)
    }
  }

  const unnotifiedCount = waitlistEntries.filter((entry) => !entry.notified).length

  if (loading) {
    return <p className="text-brown-dark/70">Loading waitlist...</p>
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-brown-dark font-semibold">
            Total Waitlist Entries: {waitlistEntries.length}
          </p>
          {unnotifiedCount > 0 && (
            <p className="text-brown-dark/70 text-sm mt-1">
              {unnotifiedCount} {unnotifiedCount === 1 ? 'entry' : 'entries'} not yet notified
            </p>
          )}
        </div>
        {unnotifiedCount > 0 && (
          <button
            onClick={handleSendNotifications}
            disabled={sendingNotifications}
            className="px-6 py-2 bg-brown-dark hover:bg-brown text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingNotifications ? 'Sending...' : `Notify ${unnotifiedCount} ${unnotifiedCount === 1 ? 'Member' : 'Members'}`}
          </button>
        )}
      </div>

      {waitlistEntries.length === 0 ? (
        <p className="text-brown-dark/70 text-center py-8">No entries in waitlist</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-brown-light/30">
                <th className="border border-brown-light px-4 py-2 text-left text-brown-dark font-semibold">
                  Email
                </th>
                <th className="border border-brown-light px-4 py-2 text-left text-brown-dark font-semibold">
                  Added Date
                </th>
                <th className="border border-brown-light px-4 py-2 text-left text-brown-dark font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {waitlistEntries.map((entry, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-brown-light/10'}>
                  <td className="border border-brown-light px-4 py-2 text-brown-dark">
                    {entry.email}
                  </td>
                  <td className="border border-brown-light px-4 py-2 text-brown-dark/70 text-sm">
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="border border-brown-light px-4 py-2">
                    {entry.notified ? (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        Notified
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                        Pending
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
  )
}

