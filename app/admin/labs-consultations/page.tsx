'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminBackButton from '@/components/AdminBackButton'
import type { ConsultationSubmission } from '@/app/api/labs/consultation/route'
import type { InvoiceItem, ConsultationInvoice } from '@/app/api/admin/labs/invoices/route'
import { convertCurrency, type Currency, type ExchangeRates } from '@/lib/currency-utils'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminLabsConsultations() {
  const [consultations, setConsultations] = useState<ConsultationSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'recent' | 'with-tier'>('all')
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationSubmission | null>(null)
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { description: 'Consultation Fee', quantity: 1, unitPrice: 0, total: 0 },
  ])
  const [taxRate, setTaxRate] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [existingInvoices, setExistingInvoices] = useState<ConsultationInvoice[]>([])
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)
  const [showBuildEmailModal, setShowBuildEmailModal] = useState(false)
  const [selectedTierForBuild, setSelectedTierForBuild] = useState<string>('')
  const [availableTiers, setAvailableTiers] = useState<Array<{ id: string; name: string; priceKES: number }>>([])
  const [sendingBuildEmail, setSendingBuildEmail] = useState(false)
  const [selectedInvoiceForBuild, setSelectedInvoiceForBuild] = useState<string>('')
  const [selectedTierForInvoice, setSelectedTierForInvoice] = useState<string>('')
  const [loadingTierForInvoice, setLoadingTierForInvoice] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadConsultations()
        loadTiers()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  const loadExchangeRates = async () => {
    try {
      const response = await authorizedFetch('/api/admin/settings', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        if (data.exchangeRates) {
          setExchangeRates({
            usdToKes: data.exchangeRates.usdToKes || 130,
            eurToKes: data.exchangeRates.eurToKes || 140,
          })
        }
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error)
      // Set default rates on error
      setExchangeRates({ usdToKes: 130, eurToKes: 140 })
    }
  }

  const loadTiers = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setAvailableTiers(data.tiers || [])
      }
    } catch (error) {
      console.error('Error loading tiers:', error)
    }
  }

  const loadConsultations = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs/consultations')
      if (!response.ok) {
        throw new Error('Failed to load consultations')
      }
      const data = await response.json()
      setConsultations(data.consultations || [])
    } catch (error) {
      console.error('Error loading consultations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInvoices = async (consultationId: string) => {
    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices?consultationId=${encodeURIComponent(consultationId)}`)
      if (response.ok) {
        const data = await response.json()
        setExistingInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    }
  }

  const openInvoiceModal = async (consultation: ConsultationSubmission) => {
    setSelectedConsultation(consultation)
    const tierName = consultation.selectedTier || consultation.interestedTier || ''
    setSelectedTierForInvoice(tierName)
    
    // Pre-fill consultation fee
    const initialItems: InvoiceItem[] = [
      {
        description: 'Consultation Fee',
        quantity: 1,
        unitPrice: consultation.consultationPrice || 0,
        total: consultation.consultationPrice || 0,
      },
    ]
    
    // If tier is selected, load tier details and pre-populate services
    if (tierName) {
      await loadTierServicesForInvoice(tierName, initialItems, consultation.currency || 'KES')
    } else {
      setInvoiceItems(initialItems)
    }
    
    setTaxRate(0)
    setNotes('')
    // Set due date to 30 days from now
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    setDueDate(futureDate.toISOString().split('T')[0])
    loadInvoices(consultation.consultationId || consultation.submittedAt)
    setShowInvoiceModal(true)
  }

  const loadTierServicesForInvoice = async (tierName: string, existingItems: InvoiceItem[], currency: string) => {
    setLoadingTierForInvoice(true)
    try {
      const response = await authorizedFetch('/api/admin/labs', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        const tier = data.tiers?.find((t: any) => t.name === tierName)
        
        if (tier) {
          // IMPORTANT: consultationPrice is ALREADY in the consultation's currency
          // If currency is USD, consultationPrice is in USD
          // If currency is KES, consultationPrice is in KES
          const consultationFeeItem = existingItems[0]
          const consultationFee = consultationFeeItem?.total || 0
          
          // Tier price is always stored in KES - convert to consultation currency
          let tierPriceInCurrency = tier.priceKES
          if (currency === 'USD' || currency === 'EUR') {
            if (exchangeRates) {
              tierPriceInCurrency = convertCurrency(tier.priceKES, 'KES', currency as Currency, exchangeRates)
            } else {
              // Fallback to default rates
              const defaultRates = { usdToKes: 130, eurToKes: 140 }
              tierPriceInCurrency = convertCurrency(tier.priceKES, 'KES', currency as Currency, defaultRates)
            }
          }
          
          // Calculate remaining amount in the consultation's currency
          const remainingAmount = tierPriceInCurrency - consultationFee
          const featureCount = tier.features.included.length
          const suggestedPrice = featureCount > 0 ? Math.round(remainingAmount / featureCount) : 0
          
          // Convert tier features into invoice items
          // All prices are in the consultation's currency
          const tierItems: InvoiceItem[] = tier.features?.included?.map((feature: string, index: number) => {
            return {
              description: feature,
              quantity: 1,
              unitPrice: suggestedPrice,
              total: suggestedPrice,
            }
          }) || []
          
          // Consultation fee is already in the correct currency, no conversion needed
          // Combine consultation fee with tier services
          setInvoiceItems([...existingItems, ...tierItems])
        } else {
          setInvoiceItems(existingItems)
        }
      } else {
        setInvoiceItems(existingItems)
      }
    } catch (error) {
      console.error('Error loading tier services:', error)
      setInvoiceItems(existingItems)
    } finally {
      setLoadingTierForInvoice(false)
    }
  }

  const handleTierChangeForInvoice = async (tierName: string) => {
    setSelectedTierForInvoice(tierName)
    if (!selectedConsultation) return
    
    const consultationCurrency = selectedConsultation.currency || 'KES'
    const consultationFee = invoiceItems.find(item => item.description === 'Consultation Fee')
    
    // Consultation price is already in the consultation's currency
    const consultationPrice = selectedConsultation.consultationPrice || 0
    
    const consultationItems: InvoiceItem[] = consultationFee 
      ? [consultationFee]
      : [{
          description: 'Consultation Fee',
          quantity: 1,
          unitPrice: consultationPrice,
          total: consultationPrice,
        }]
    
    if (tierName) {
      await loadTierServicesForInvoice(tierName, consultationItems, consultationCurrency)
    } else {
      setInvoiceItems(consultationItems)
    }
  }

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }])
  }

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = (updated[index].quantity || 1) * (updated[index].unitPrice || 0)
    }
    setInvoiceItems(updated)
  }

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
    const tax = taxRate ? subtotal * (taxRate / 100) : 0
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const handleCreateInvoice = async () => {
    if (!selectedConsultation) return

    // Validate items
    if (invoiceItems.length === 0 || invoiceItems.some(item => !item.description.trim())) {
      alert('Please fill in all invoice items')
      return
    }

    setCreatingInvoice(true)
    try {
      const response = await authorizedFetch('/api/admin/labs/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: selectedConsultation.consultationId || selectedConsultation.submittedAt,
          items: invoiceItems,
          taxRate: taxRate || undefined,
          notes: notes.trim() || undefined,
          dueDate: dueDate || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create invoice')
      }

      const data = await response.json()
      alert('Invoice created successfully!')
      setShowInvoiceModal(false)
      loadInvoices(selectedConsultation.consultationId || selectedConsultation.submittedAt)
    } catch (error: any) {
      alert(error.message || 'Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const formatCurrency = (amount: number, currency: Currency | string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    if (currency === 'EUR') {
      return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `KSH ${Math.round(amount).toLocaleString('en-KE')}`
  }

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingInvoiceId(invoiceId)
    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices/${invoiceId}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invoice')
      }

      const data = await response.json()
      alert('Invoice sent successfully to ' + (selectedConsultation?.email || 'client'))
      
      // Reload invoices to update status
      if (selectedConsultation) {
        loadInvoices(selectedConsultation.consultationId || selectedConsultation.submittedAt)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to send invoice')
    } finally {
      setSendingInvoiceId(null)
    }
  }

  const openBuildEmailModal = (consultation: ConsultationSubmission) => {
    setSelectedConsultation(consultation)
    setSelectedTierForBuild(consultation.selectedTier || consultation.interestedTier || '')
    setSelectedInvoiceForBuild('')
    loadInvoices(consultation.consultationId || consultation.submittedAt)
    setShowBuildEmailModal(true)
  }

  const handleSendBuildEmail = async () => {
    if (!selectedConsultation || !selectedTierForBuild) {
      alert('Please select a tier')
      return
    }

    setSendingBuildEmail(true)
    try {
      const response = await authorizedFetch(
        `/api/admin/labs/consultations/${selectedConsultation.consultationId || selectedConsultation.submittedAt}/build-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tierName: selectedTierForBuild,
            invoiceId: selectedInvoiceForBuild || undefined,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send build email')
      }

      alert('Build email sent successfully!')
      setShowBuildEmailModal(false)
      loadConsultations() // Reload to show updated outcome
    } catch (error: any) {
      alert(error.message || 'Failed to send build email')
    } finally {
      setSendingBuildEmail(false)
    }
  }

  const handleDeleteAll = async () => {
    setDeletingAll(true)
    try {
      const response = await authorizedFetch('/api/admin/labs/consultations', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete consultations')
      }

      alert('All consultations deleted successfully!')
      setShowDeleteConfirm(false)
      loadConsultations() // Reload to show empty list
    } catch (error: any) {
      alert(error.message || 'Failed to delete consultations')
    } finally {
      setDeletingAll(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Not specified'
    const timeMap: Record<string, string> = {
      morning: 'Morning (9 AM - 12 PM)',
      afternoon: 'Afternoon (12 PM - 4 PM)',
      evening: 'Evening (4 PM - 7 PM)',
    }
    return timeMap[timeStr] || timeStr
  }

  const businessTypeMap: Record<string, string> = {
    'lash-studio': 'Lash Studio',
    'beauty-salon': 'Beauty Salon',
    'spa': 'Spa',
    'nail-salon': 'Nail Salon',
    'hair-salon': 'Hair Salon',
    'barbershop': 'Barbershop',
    'wellness-center': 'Wellness Center',
    'fitness-studio': 'Fitness Studio',
    'other-service': 'Other Service Business',
  }

  const hasWebsiteMap: Record<string, string> = {
    'no': "No, I don't have a website",
    'yes-basic': "Yes, but it's very basic",
    'yes-functional': "Yes, it's functional but needs improvement",
    'yes-good': "Yes, it's good but missing features",
  }

  const preferredContactMap: Record<string, string> = {
    email: 'Email',
    phone: 'Phone call',
    whatsapp: 'WhatsApp',
  }

  const filteredConsultations = consultations.filter((consultation) => {
    if (filter === 'recent') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return new Date(consultation.submittedAt) >= sevenDaysAgo
    }
    if (filter === 'with-tier') {
      return !!consultation.interestedTier
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading consultations...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminBackButton />
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-display text-brown mb-2">Labs Consultation Requests</h1>
            <p className="text-gray-600">View all consultation requests from potential clients</p>
          </div>
          {consultations.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              🗑️ Delete All
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            All ({consultations.length})
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'recent'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setFilter('with-tier')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'with-tier'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            With Tier Interest
          </button>
        </div>

        {/* Consultations List */}
        {filteredConsultations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-12 text-center">
            <p className="text-gray-600 text-lg">No consultations found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConsultations.map((consultation) => {
              const isExpanded = expandedId === consultation.submittedAt
              return (
                <div
                  key={consultation.submittedAt}
                  className="bg-white rounded-xl shadow-soft border-2 border-brown-light overflow-hidden"
                >
                  <div
                    className="p-6 cursor-pointer hover:bg-brown-light/10 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : consultation.submittedAt)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-semibold text-brown">
                            {consultation.businessName}
                          </h3>
                          {consultation.interestedTier && (
                            <span className="bg-brown-dark text-white px-3 py-1 rounded-full text-sm font-semibold">
                              Tier: {consultation.interestedTier}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-1">
                          <strong>Contact:</strong> {consultation.contactName}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Email:</strong>{' '}
                          <a
                            href={`mailto:${consultation.email}`}
                            className="text-brown hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {consultation.email}
                          </a>
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Phone:</strong>{' '}
                          <a
                            href={`tel:${consultation.phone}`}
                            className="text-brown hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {consultation.phone}
                          </a>
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Submitted: {formatDate(consultation.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brown mb-1">
                          {consultation.consultationPrice.toLocaleString()} {consultation.currency}
                        </div>
                        <span className="text-gray-500 text-sm">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t-2 border-brown-light p-6 space-y-6">
                      {/* Business Information */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Business Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Business Type:</strong> {businessTypeMap[consultation.businessType] || consultation.businessType}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Services Offered:</strong> {consultation.serviceType}
                            </p>
                            {consultation.monthlyClients && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Monthly Clients:</strong> {consultation.monthlyClients}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Has Website:</strong> {hasWebsiteMap[consultation.hasWebsite] || consultation.hasWebsite || 'Not specified'}
                            </p>
                            {consultation.currentWebsite && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Current Website:</strong>{' '}
                                <a
                                  href={consultation.currentWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brown hover:underline"
                                >
                                  {consultation.currentWebsite}
                                </a>
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Booking System:</strong> {consultation.currentBookingSystem || 'Not specified'}
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Payment System:</strong> {consultation.currentPaymentSystem || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Pain Points */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Pain Points & Goals
                        </h4>
                        <div className="bg-brown-light/20 p-4 rounded-lg">
                          <p className="text-gray-700 whitespace-pre-wrap">{consultation.mainPainPoints}</p>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Project Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {consultation.interestedTier && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Interested Tier:</strong>{' '}
                                <span className="font-semibold text-brown">{consultation.interestedTier}</span>
                              </p>
                            </div>
                          )}
                          {consultation.budgetRange && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Budget Range:</strong> {consultation.budgetRange}
                            </p>
                          )}
                          {consultation.timeline && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Timeline:</strong> {consultation.timeline}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Consultation Preferences */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Consultation Preferences
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Preferred Contact:</strong> {preferredContactMap[consultation.preferredContact] || consultation.preferredContact}
                          </p>
                          {consultation.preferredDate && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Preferred Date:</strong> {formatDate(consultation.preferredDate)}
                            </p>
                          )}
                          {consultation.preferredTime && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Preferred Time:</strong> {formatTime(consultation.preferredTime)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Additional Details */}
                      {consultation.additionalDetails && (
                        <div>
                          <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                            Additional Details
                          </h4>
                          <div className="bg-brown-light/20 p-4 rounded-lg">
                            <p className="text-gray-700 whitespace-pre-wrap">{consultation.additionalDetails}</p>
                          </div>
                        </div>
                      )}

                      {/* Consultation Outcome */}
                      <div className="pt-4 border-t-2 border-brown-light">
                        <h4 className="text-lg font-semibold text-brown mb-3">
                          Consultation Outcome
                        </h4>
                        <div className="flex gap-2 flex-wrap mb-4">
                          <span className={`px-4 py-2 rounded-lg font-semibold ${
                            consultation.outcome === 'build-now'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {consultation.outcome === 'build-now' ? '✓ Build Now' : 'Build Now'}
                          </span>
                          <span className={`px-4 py-2 rounded-lg font-semibold ${
                            consultation.outcome === 'fix-first'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {consultation.outcome === 'fix-first' ? '✓ Fix First' : 'Fix First'}
                          </span>
                          <span className={`px-4 py-2 rounded-lg font-semibold ${
                            consultation.outcome === 'don\'t-build'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {consultation.outcome === 'don\'t-build' ? '✓ Don\'t Build' : 'Don\'t Build'}
                          </span>
                        </div>
                        {consultation.selectedTier && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Selected Tier:</strong> {consultation.selectedTier}
                          </p>
                        )}
                        {consultation.buildEmailSentAt && (
                          <p className="text-sm text-gray-600">
                            <strong>Build Email Sent:</strong> {formatDate(consultation.buildEmailSentAt)}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4 border-t-2 border-brown-light flex-wrap">
                        <button
                          onClick={() => openBuildEmailModal(consultation)}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Send Build Email
                        </button>
                        <button
                          onClick={() => openInvoiceModal(consultation)}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                        >
                          Create Invoice
                        </button>
                        <a
                          href={`mailto:${consultation.email}?subject=Re: LashDiary Labs Consultation Request - ${consultation.businessName}`}
                          className="bg-brown-dark text-white px-6 py-2 rounded-lg font-semibold hover:bg-brown transition-colors"
                        >
                          Reply via Email
                        </a>
                        <a
                          href={`tel:${consultation.phone}`}
                          className="bg-brown-light text-brown px-6 py-2 rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
                        >
                          Call
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invoice Creation Modal */}
      {showInvoiceModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b-2 border-brown-light">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-brown">Create Invoice</h2>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                For: <strong>{selectedConsultation.businessName}</strong> ({selectedConsultation.contactName})
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Tier Selection */}
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Select Tier to Pre-populate Services (Optional)
                </label>
                <select
                  value={selectedTierForInvoice}
                  onChange={(e) => handleTierChangeForInvoice(e.target.value)}
                  disabled={loadingTierForInvoice}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown disabled:opacity-50"
                >
                  <option value="">No tier selected (manual entry)</option>
                  {availableTiers.map((tier) => (
                    <option key={tier.id} value={tier.name}>
                      {tier.name} - {(() => {
                        const consultationCurrency = selectedConsultation?.currency || 'KES'
                        let tierPriceInCurrency = tier.priceKES
                        if (consultationCurrency === 'USD' || consultationCurrency === 'EUR') {
                          if (exchangeRates) {
                            tierPriceInCurrency = consultationCurrency === 'USD'
                              ? tier.priceKES / exchangeRates.usdToKes
                              : tier.priceKES / exchangeRates.eurToKes
                          } else {
                            const defaultRates = { usdToKes: 130, eurToKes: 140 }
                            tierPriceInCurrency = consultationCurrency === 'USD'
                              ? tier.priceKES / defaultRates.usdToKes
                              : tier.priceKES / defaultRates.eurToKes
                          }
                        }
                        return formatCurrency(tierPriceInCurrency, consultationCurrency as Currency)
                      })()}
                    </option>
                  ))}
                </select>
                {loadingTierForInvoice && (
                  <p className="text-sm text-gray-600 mt-1">Loading tier services...</p>
                )}
                {selectedTierForInvoice && !loadingTierForInvoice && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Tier services loaded. You can edit descriptions and prices below.
                  </p>
                )}
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-brown">Invoice Items</h3>
                  <button
                    onClick={addInvoiceItem}
                    className="px-4 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors text-sm"
                  >
                    + Add Custom Item
                  </button>
                </div>
                <div className="space-y-3">
                  {invoiceItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No items added yet. Select a tier above or add custom items.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-sm font-semibold text-brown">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>
                      {invoiceItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border-2 border-brown-light/30 hover:border-brown-light transition-colors">
                          <div className="flex-1 min-w-0">
                            <textarea
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                              placeholder="Service/item description"
                              rows={2}
                              className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown resize-none"
                            />
                          </div>
                          <div className="w-20">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                              min="1"
                              step="1"
                              className="w-full px-2 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown text-center"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full px-2 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown text-right"
                            />
                          </div>
                          <div className="w-32 text-right font-semibold text-brown py-2 flex items-center justify-end">
                            {formatCurrency(item.total, selectedConsultation?.currency || 'KES')}
                          </div>
                          <button
                            onClick={() => removeInvoiceItem(index)}
                            className="text-red-600 hover:text-red-800 px-2 py-2 font-bold text-lg"
                            title="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Tax and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brown mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="Additional notes for the invoice..."
                />
              </div>

              {/* Tier Price Comparison */}
              {selectedTierForInvoice && (() => {
                const tier = availableTiers.find(t => t.name === selectedTierForInvoice)
                if (tier) {
                  const { subtotal, tax, total } = calculateTotals()
                  const consultationCurrency = selectedConsultation?.currency || 'KES'
                  
                  // Tier price is always in KES - convert to consultation currency for comparison
                  let tierTotalInCurrency = tier.priceKES
                  if (consultationCurrency === 'USD' || consultationCurrency === 'EUR') {
                    if (exchangeRates) {
                      tierTotalInCurrency = consultationCurrency === 'USD'
                        ? tier.priceKES / exchangeRates.usdToKes
                        : tier.priceKES / exchangeRates.eurToKes
                    } else {
                      const defaultRates = { usdToKes: 130, eurToKes: 140 }
                      tierTotalInCurrency = consultationCurrency === 'USD'
                        ? tier.priceKES / defaultRates.usdToKes
                        : tier.priceKES / defaultRates.eurToKes
                    }
                  }
                  
                  // Calculate difference in the consultation's currency (direct comparison)
                  const difference = total - tierTotalInCurrency
                  
                  // Tolerance for rounding differences (0.01 for USD, 1 for KES)
                  const tolerance = consultationCurrency === 'USD' ? 0.01 : 1
                  
                  return (
                    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Tier Price Comparison</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Selected Tier Price:</span>
                          <span className="font-semibold text-blue-800">{formatCurrency(tierTotalInCurrency, consultationCurrency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Current Invoice Total:</span>
                          <span className="font-semibold text-blue-800">{formatCurrency(total, consultationCurrency)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-blue-300">
                          <span className="text-blue-700 font-semibold">Difference:</span>
                          <span className={`font-bold ${Math.abs(difference) < tolerance ? 'text-green-600' : difference > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                            {Math.abs(difference) < tolerance ? '✓ Match' : difference > 0 ? `+${formatCurrency(difference, consultationCurrency)}` : formatCurrency(difference, consultationCurrency)}
                          </span>
                        </div>
                        {Math.abs(difference) >= tolerance && (
                          <p className="text-xs text-blue-600 mt-2 italic">
                            {difference > 0 
                              ? 'Invoice total is higher than tier price. Adjust item prices if needed.'
                              : 'Invoice total is lower than tier price. You may want to add more services or adjust prices.'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Totals Preview */}
              {(() => {
                const { subtotal, tax, total } = calculateTotals()
                return (
                  <div className="bg-brown-light/20 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(subtotal, selectedConsultation?.currency || 'KES')}</span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-700">Tax ({taxRate}%):</span>
                        <span className="font-semibold">{formatCurrency(tax, selectedConsultation?.currency || 'KES')}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t-2 border-brown-light">
                      <span className="text-lg font-bold text-brown">Total:</span>
                      <span className="text-lg font-bold text-brown">{formatCurrency(total, selectedConsultation?.currency || 'KES')}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Existing Invoices */}
              {existingInvoices.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-brown mb-3">Existing Invoices</h3>
                  <div className="space-y-2">
                    {existingInvoices.map((inv) => (
                      <div key={inv.invoiceId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg gap-3">
                        <div className="flex-1">
                          <span className="font-semibold">{inv.invoiceNumber}</span>
                          <span className="ml-3 text-sm text-gray-600">
                            {formatCurrency(inv.total, inv.currency)} - {inv.status}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSendInvoice(inv.invoiceId)}
                            disabled={sendingInvoiceId === inv.invoiceId}
                            className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {sendingInvoiceId === inv.invoiceId ? 'Sending...' : 'Send Email'}
                          </button>
                          <a
                            href={`/api/admin/labs/invoices/${inv.invoiceId}/pdf`}
                            target="_blank"
                            className="bg-brown-dark text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-brown transition-colors"
                          >
                            View PDF
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t-2 border-brown-light">
                <button
                  onClick={handleCreateInvoice}
                  disabled={creatingInvoice}
                  className="flex-1 bg-brown-dark text-white px-6 py-3 rounded-lg font-semibold hover:bg-brown transition-colors disabled:opacity-50"
                >
                  {creatingInvoice ? 'Creating...' : 'Create Invoice'}
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-6 py-3 border-2 border-brown-light text-brown rounded-lg font-semibold hover:bg-brown-light/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Build Email Modal */}
      {showBuildEmailModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b-2 border-brown-light">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-brown">Send Build Email</h2>
                <button
                  onClick={() => setShowBuildEmailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                For: <strong>{selectedConsultation.businessName}</strong> ({selectedConsultation.contactName})
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">
                  Select Tier <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTierForBuild}
                  onChange={(e) => setSelectedTierForBuild(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  required
                >
                  <option value="">Select a tier</option>
                  {availableTiers.map((tier) => {
                    const consultationCurrency = selectedConsultation.currency || 'KES'
                    let tierPriceInCurrency = tier.priceKES
                    if (consultationCurrency === 'USD' || consultationCurrency === 'EUR') {
                      if (exchangeRates) {
                        tierPriceInCurrency = consultationCurrency === 'USD'
                          ? tier.priceKES / exchangeRates.usdToKes
                          : tier.priceKES / exchangeRates.eurToKes
                      } else {
                        const defaultRates = { usdToKes: 130, eurToKes: 140 }
                        tierPriceInCurrency = consultationCurrency === 'USD'
                          ? tier.priceKES / defaultRates.usdToKes
                          : tier.priceKES / defaultRates.eurToKes
                      }
                    }
                    return (
                      <option key={tier.id} value={tier.name}>
                        {tier.name} - {formatCurrency(tierPriceInCurrency, consultationCurrency)}
                      </option>
                    )
                  })}
                </select>
                {selectedConsultation.interestedTier && (
                  <p className="text-sm text-gray-600 mt-1">
                    Originally interested in: <strong>{selectedConsultation.interestedTier}</strong>
                  </p>
                )}
              </div>

              {existingInvoices.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-brown mb-2">
                    Select Invoice (Optional)
                  </label>
                  <select
                    value={selectedInvoiceForBuild}
                    onChange={(e) => setSelectedInvoiceForBuild(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  >
                    <option value="">Use most recent invoice</option>
                    {existingInvoices.map((inv) => (
                      <option key={inv.invoiceId} value={inv.invoiceId}>
                        {inv.invoiceNumber} - {formatCurrency(inv.total, inv.currency)} ({inv.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    If no invoice is selected, the most recent invoice will be used.
                  </p>
                </div>
              )}

              {existingInvoices.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> No invoices found for this consultation. Please create an invoice first before sending the build email.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>What this email will include:</strong>
                </p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>Tier selected and total cost</li>
                  <li>Payment structure (100% upfront for Tier 1/2, 50/50 split for Tier 3)</li>
                  <li>What payment unlocks</li>
                  <li>Timeline and next steps</li>
                  <li>Invoice with 7-day expiration notice</li>
                </ul>
              </div>

              <div className="flex gap-4 pt-4 border-t-2 border-brown-light">
                <button
                  onClick={handleSendBuildEmail}
                  disabled={sendingBuildEmail || !selectedTierForBuild || existingInvoices.length === 0}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingBuildEmail ? 'Sending...' : 'Send Build Email'}
                </button>
                <button
                  onClick={() => setShowBuildEmailModal(false)}
                  className="px-6 py-3 border-2 border-brown-light text-brown rounded-lg font-semibold hover:bg-brown-light/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b-2 border-red-200">
              <h2 className="text-2xl font-semibold text-red-600">⚠️ Delete All Consultations?</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>all {consultations.length} consultations</strong>? This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
                <li>All consultation requests</li>
                <li>All invoices (to reset invoice numbering)</li>
              </ul>
              <p className="text-sm text-orange-600 font-semibold mb-6">
                ⚠️ Invoice numbering will start from the beginning (INV-YYYYMMDD-001) after deletion.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingAll ? 'Deleting...' : 'Yes, Delete All'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingAll}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

