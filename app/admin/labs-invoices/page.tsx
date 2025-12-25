'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminBackButton from '@/components/AdminBackButton'
import type { ConsultationInvoice, InvoiceItem } from '@/app/api/admin/labs/invoices/route'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminLabsInvoices() {
  const [invoices, setInvoices] = useState<ConsultationInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'expired'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<ConsultationInvoice | null>(null)
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null)
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null)
  const [markingPaymentId, setMarkingPaymentId] = useState<{ invoiceId: string; paymentType: 'upfront' | 'final' } | null>(null)
  const [sendingShowcaseEmailId, setSendingShowcaseEmailId] = useState<string | null>(null)
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
        // Check for expired invoices first, then load
        await checkExpiredInvoices()
        loadInvoices()
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

  const checkExpiredInvoices = async () => {
    try {
      await authorizedFetch('/api/admin/labs/invoices/check-expired', {
        method: 'GET',
      })
      // Don't show alert - just silently update
    } catch (error) {
      console.error('Error checking expired invoices:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
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

      alert('Invoice sent successfully!')
      loadInvoices() // Reload to update status
    } catch (error: any) {
      alert(error.message || 'Failed to send invoice')
    } finally {
      setSendingInvoiceId(null)
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!confirm('Mark this invoice as paid?')) {
      return
    }

    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update invoice')
      }

      alert('Invoice marked as paid!')
      loadInvoices()
    } catch (error: any) {
      alert(error.message || 'Failed to update invoice')
    }
  }

  const handleMarkPayment = async (invoiceId: string, paymentType: 'upfront' | 'final', isPaid: boolean) => {
    const paymentName = paymentType === 'upfront' ? 'Downpayment' : 'Final Payment'
    const action = isPaid ? 'mark as paid' : 'mark as unpaid'
    
    if (!confirm(`${isPaid ? 'Mark' : 'Unmark'} ${paymentName} as ${isPaid ? 'paid' : 'unpaid'}?`)) {
      return
    }

    setMarkingPaymentId({ invoiceId, paymentType })
    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [paymentType === 'upfront' ? 'upfrontPaid' : 'secondPaid']: isPaid,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment status')
      }

      alert(`${paymentName} ${isPaid ? 'marked as paid' : 'marked as unpaid'}!`)
      loadInvoices()
    } catch (error: any) {
      alert(error.message || 'Failed to update payment status')
    } finally {
      setMarkingPaymentId(null)
    }
  }

  const handleSendShowcaseEmail = async (invoiceId: string) => {
    if (!confirm('Send showcase meeting email to the client? This will allow them to book a time to go through their project.')) {
      return
    }

    setSendingShowcaseEmailId(invoiceId)
    try {
      // Find the invoice to get client details
      const invoice = invoices.find(inv => inv.invoiceId === invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Find or create build project for this invoice
      const projectsResponse = await authorizedFetch('/api/admin/labs/build-projects')
      if (!projectsResponse.ok) {
        throw new Error('Failed to load build projects')
      }
      const projectsData = await projectsResponse.json()
      let project = projectsData.projects?.find((p: any) => p.invoiceId === invoiceId)

      // If no project exists, create one automatically
      if (!project) {
        // Get consultation data to get tier name
        let tierName = 'Unknown Tier'
        try {
          const consultationsResponse = await authorizedFetch('/api/admin/labs/consultations')
          if (consultationsResponse.ok) {
            const consultationsData = await consultationsResponse.json()
            const consultation = consultationsData.consultations?.find((c: any) => 
              (c.consultationId || c.submittedAt) === invoice.consultationId
            )
            tierName = consultation?.selectedTier || consultation?.interestedTier || 'Unknown Tier'
          }
        } catch (error) {
          console.warn('Could not load consultation data, using default tier name')
        }

        // Create build project automatically
        const createProjectResponse = await authorizedFetch('/api/admin/labs/build-projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultationId: invoice.consultationId,
            invoiceId: invoice.invoiceId,
            businessName: invoice.businessName,
            contactName: invoice.contactName,
            email: invoice.email,
            phone: invoice.phone || '',
            tierName: tierName,
            totalAmount: invoice.total,
            currency: invoice.currency,
          }),
        })

        if (!createProjectResponse.ok) {
          const error = await createProjectResponse.json()
          // If project creation fails, still try to send email with invoice data
          console.warn('Failed to create build project, will send email directly:', error)
        } else {
          const createdProject = await createProjectResponse.json()
          project = createdProject.project
        }
      }

      // Send showcase email (will use project if exists, or create one in the API)
      const response = await authorizedFetch('/api/admin/labs/showcase/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project?.projectId,
          invoiceId: invoiceId, // Fallback to invoice ID if no project
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send showcase email')
      }

      alert('Showcase email sent successfully!')
      loadInvoices()
    } catch (error: any) {
      alert(error.message || 'Failed to send showcase email')
    } finally {
      setSendingShowcaseEmailId(null)
    }
  }

  const handleDeleteExpiredInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this expired invoice? This will send a build slot release email to the client and cannot be undone.')) {
      return
    }

    setDeletingInvoiceId(invoiceId)
    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices/${invoiceId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete invoice')
      }

      alert('Expired invoice deleted and build slot release email sent to client.')
      loadInvoices()
    } catch (error: any) {
      alert(error.message || 'Failed to delete invoice')
    } finally {
      setDeletingInvoiceId(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingInvoice) return

    try {
      const response = await authorizedFetch(`/api/admin/labs/invoices/${editingInvoice.invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editingInvoice.items,
          taxRate: editingInvoice.taxRate,
          notes: editingInvoice.notes,
          dueDate: editingInvoice.dueDate,
          status: editingInvoice.status,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update invoice')
      }

      alert('Invoice updated successfully!')
      setEditingInvoice(null)
      loadInvoices()
    } catch (error: any) {
      alert(error.message || 'Failed to update invoice')
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-600 text-white'
      case 'sent':
        return 'bg-blue-600 text-white'
      case 'expired':
        return 'bg-red-600 text-white'
      case 'cancelled':
        return 'bg-gray-600 text-white'
      default:
        return 'bg-yellow-600 text-white'
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'all') return true
    return invoice.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading invoices...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminBackButton />
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-display text-brown mb-2">Labs Invoices</h1>
            <p className="text-gray-600">Manage all invoices for Labs consultations</p>
          </div>
          <a
            href="/admin/labs-build-projects"
            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            View Build Projects →
          </a>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'draft'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Draft ({invoices.filter(i => i.status === 'draft').length})
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'sent'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Sent ({invoices.filter(i => i.status === 'sent').length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'paid'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Paid ({invoices.filter(i => i.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'expired'
                ? 'bg-brown-dark text-white'
                : 'bg-white text-brown border-2 border-brown-light hover:border-brown'
            }`}
          >
            Expired ({invoices.filter(i => i.status === 'expired').length})
          </button>
        </div>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-12 text-center">
            <p className="text-gray-600 text-lg">No invoices found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => {
              const isExpanded = expandedId === invoice.invoiceId
              const isEditing = editingInvoice?.invoiceId === invoice.invoiceId
              return (
                <div
                  key={invoice.invoiceId}
                  className={`bg-white rounded-xl shadow-soft border-2 overflow-hidden ${
                    invoice.status === 'expired' 
                      ? 'border-red-500 bg-red-50/30' 
                      : 'border-brown-light'
                  }`}
                >
                  <div
                    className="p-6 cursor-pointer hover:bg-brown-light/10 transition-colors"
                    onClick={() => !isEditing && setExpandedId(isExpanded ? null : invoice.invoiceId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className={`text-xl font-semibold ${invoice.status === 'expired' ? 'text-red-600' : 'text-brown'}`}>
                            {invoice.invoiceNumber}
                            {invoice.status === 'expired' && ' ⚠️'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(invoice.status)}`}>
                            {invoice.status === 'expired' ? 'EXPIRED (UNPAID)' : invoice.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-1">
                          <strong>Business:</strong> {invoice.businessName}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Contact:</strong> {invoice.contactName}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Email:</strong>{' '}
                          <a
                            href={`mailto:${invoice.email}`}
                            className="text-brown hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {invoice.email}
                          </a>
                        </p>
                        <p className={`text-sm mt-2 ${
                          invoice.status === 'expired' 
                            ? 'text-red-600 font-semibold' 
                            : invoice.status === 'paid'
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}>
                          Created: {formatDate(invoice.createdAt)} | Due: {formatDate(invoice.dueDate)}
                          {invoice.expirationDate && (
                            <span className={invoice.status === 'expired' ? ' font-bold' : ''}>
                              {' | '}
                              {invoice.status === 'expired' ? 'Expired: ' : 'Expires: '}
                              {formatDate(invoice.expirationDate)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brown mb-1">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </div>
                        <span className="text-gray-500 text-sm">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && !isEditing && (
                    <div className="border-t-2 border-brown-light p-6 space-y-6">
                      {/* Invoice Items */}
                      <div>
                        <h4 className="text-lg font-semibold text-brown mb-3 border-b-2 border-brown-light pb-2">
                          Invoice Items
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-brown-dark text-white">
                                <th className="p-3 text-left">Description</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 text-right">Unit Price</th>
                                <th className="p-3 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-brown-light">
                                  <td className="p-3">{item.description}</td>
                                  <td className="p-3 text-center">{item.quantity}</td>
                                  <td className="p-3 text-right">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                                  <td className="p-3 text-right font-semibold">{formatCurrency(item.total, invoice.currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <div className="w-64 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Subtotal:</span>
                              <span className="font-semibold">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                            </div>
                            {invoice.tax && invoice.taxRate && (
                              <div className="flex justify-between">
                                <span className="text-gray-700">Tax ({invoice.taxRate}%):</span>
                                <span className="font-semibold">{formatCurrency(invoice.tax, invoice.currency)}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t-2 border-brown-light">
                              <span className="text-lg font-bold text-brown">Total:</span>
                              <span className="text-lg font-bold text-brown">{formatCurrency(invoice.total, invoice.currency)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {invoice.notes && (
                        <div>
                          <h4 className="text-lg font-semibold text-brown mb-2">Notes</h4>
                          <p className="text-gray-700 whitespace-pre-wrap bg-brown-light/20 p-4 rounded-lg">{invoice.notes}</p>
                        </div>
                      )}

                      {/* Payment Status */}
                      <div className="pt-4 border-t-2 border-brown-light">
                        <h4 className="text-lg font-semibold text-brown mb-4">Payment Status</h4>
                        
                        {/* Overall Status */}
                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                          <span className={`px-4 py-2 rounded-lg font-semibold ${
                            invoice.status === 'paid'
                              ? 'bg-green-600 text-white'
                              : invoice.status === 'expired'
                              ? 'bg-red-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {invoice.status === 'paid' ? '✓ Paid' : invoice.status === 'expired' ? '✗ Expired (Unpaid)' : '⏳ Unpaid'}
                          </span>
                          {invoice.status === 'expired' && invoice.expirationDate && (
                            <span className="text-sm text-red-600 font-semibold">
                              Expired on {formatDate(invoice.expirationDate)}
                            </span>
                          )}
                          {/* Send Showcase Email Button - Only show when final payment (20%) is paid */}
                          {invoice.secondPaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendShowcaseEmail(invoice.invoiceId)
                              }}
                              disabled={sendingShowcaseEmailId === invoice.invoiceId}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                              title="Send showcase meeting email to client"
                            >
                              {sendingShowcaseEmailId === invoice.invoiceId ? 'Sending...' : 'Send Showcase Email'}
                            </button>
                          )}
                        </div>

                        {/* Split Payment Tracking - Show for all invoices */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                          <h5 className="text-md font-semibold text-brown mb-3">Payment Breakdown</h5>
                          
                          {/* Downpayment (80%) */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-brown-light">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-brown">
                                  Downpayment ({invoice.downpaymentPercent || 80}%)
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  invoice.upfrontPaid
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}>
                                  {invoice.upfrontPaid ? '✓ Paid' : '⏳ Unpaid'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Amount: {formatCurrency(
                                  invoice.invoiceAmount && invoice.invoiceType === 'downpayment'
                                    ? invoice.invoiceAmount
                                    : Math.round(invoice.total * ((invoice.downpaymentPercent || 80) / 100)),
                                  invoice.currency
                                )}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkPayment(invoice.invoiceId, 'upfront', !invoice.upfrontPaid)
                              }}
                              disabled={markingPaymentId?.invoiceId === invoice.invoiceId && markingPaymentId?.paymentType === 'upfront'}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                invoice.upfrontPaid
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              } disabled:opacity-50`}
                            >
                              {markingPaymentId?.invoiceId === invoice.invoiceId && markingPaymentId?.paymentType === 'upfront'
                                ? 'Updating...'
                                : invoice.upfrontPaid
                                ? 'Mark Unpaid'
                                : 'Mark as Paid'}
                            </button>
                          </div>

                          {/* Final Payment (20%) */}
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-brown-light">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-brown">
                                  Final Payment ({invoice.finalPaymentPercent || 20}%)
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  invoice.secondPaid
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}>
                                  {invoice.secondPaid ? '✓ Paid' : '⏳ Unpaid'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Amount: {formatCurrency(
                                  invoice.invoiceAmount && invoice.invoiceType === 'final'
                                    ? invoice.invoiceAmount
                                    : Math.round(invoice.total * ((invoice.finalPaymentPercent || 20) / 100)),
                                  invoice.currency
                                )}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkPayment(invoice.invoiceId, 'final', !invoice.secondPaid)
                              }}
                              disabled={markingPaymentId?.invoiceId === invoice.invoiceId && markingPaymentId?.paymentType === 'final'}
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                invoice.secondPaid
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              } disabled:opacity-50`}
                            >
                              {markingPaymentId?.invoiceId === invoice.invoiceId && markingPaymentId?.paymentType === 'final'
                                ? 'Updating...'
                                : invoice.secondPaid
                                ? 'Mark Unpaid'
                                : 'Mark as Paid'}
                            </button>
                          </div>

                          {/* Total Paid Summary */}
                          <div className="pt-3 border-t-2 border-brown-light">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-brown">Total Paid:</span>
                              <span className="text-lg font-bold text-green-700">
                                {formatCurrency(
                                  (invoice.upfrontPaid ? Math.round(invoice.total * ((invoice.downpaymentPercent || 80) / 100)) : 0) +
                                  (invoice.secondPaid ? Math.round(invoice.total * ((invoice.finalPaymentPercent || 20) / 100)) : 0),
                                  invoice.currency
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-sm text-gray-600">Remaining:</span>
                              <span className={`text-sm font-semibold ${
                                (invoice.upfrontPaid && invoice.secondPaid) ? 'text-green-700' : 'text-red-600'
                              }`}>
                                {formatCurrency(
                                  invoice.total -
                                  ((invoice.upfrontPaid ? Math.round(invoice.total * ((invoice.downpaymentPercent || 80) / 100)) : 0) +
                                  (invoice.secondPaid ? Math.round(invoice.total * ((invoice.finalPaymentPercent || 20) / 100)) : 0)),
                                  invoice.currency
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4 border-t-2 border-brown-light flex-wrap">
                        {invoice.status !== 'expired' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingInvoice(invoice)
                            }}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Edit Invoice
                          </button>
                        )}
                        {invoice.status === 'expired' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteExpiredInvoice(invoice.invoiceId)
                            }}
                            disabled={deletingInvoiceId === invoice.invoiceId}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deletingInvoiceId === invoice.invoiceId ? 'Deleting...' : 'Delete & Release Build Slot'}
                          </button>
                        )}
                        {invoice.status !== 'paid' && invoice.status !== 'expired' && invoice.status !== 'cancelled' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsPaid(invoice.invoiceId)
                            }}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                          >
                            Mark as Paid
                          </button>
                        )}
                        {invoice.status !== 'sent' && invoice.status !== 'paid' && invoice.status !== 'expired' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSendInvoice(invoice.invoiceId)
                            }}
                            disabled={sendingInvoiceId === invoice.invoiceId}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {sendingInvoiceId === invoice.invoiceId ? 'Sending...' : 'Send Email'}
                          </button>
                        )}
                        <a
                          href={`/api/admin/labs/invoices/${invoice.invoiceId}/pdf`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-brown-dark text-white px-6 py-2 rounded-lg font-semibold hover:bg-brown transition-colors"
                        >
                          View PDF
                        </a>
                        <a
                          href={`mailto:${invoice.email}?subject=Re: Invoice ${invoice.invoiceNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-brown-light text-brown px-6 py-2 rounded-lg font-semibold hover:bg-brown-light/80 transition-colors"
                        >
                          Reply via Email
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Edit Mode */}
                  {isEditing && (
                    <div className="border-t-2 border-brown-light p-6 space-y-6">
                      <h4 className="text-lg font-semibold text-brown mb-4">Edit Invoice</h4>
                      
                      {/* Invoice Items Editor */}
                      <div>
                        <h5 className="text-md font-semibold text-brown mb-3">Items</h5>
                        <div className="space-y-3">
                          {editingInvoice.items.map((item, index) => (
                            <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <textarea
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = { ...editingInvoice }
                                    updated.items[index].description = e.target.value
                                    setEditingInvoice(updated)
                                  }}
                                  rows={2}
                                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                                />
                              </div>
                              <div className="w-20">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const updated = { ...editingInvoice }
                                    updated.items[index].quantity = parseFloat(e.target.value) || 1
                                    updated.items[index].total = updated.items[index].quantity * updated.items[index].unitPrice
                                    // Recalculate totals
                                    updated.subtotal = updated.items.reduce((sum, i) => sum + i.total, 0)
                                    updated.tax = updated.taxRate ? updated.subtotal * (updated.taxRate / 100) : undefined
                                    updated.total = updated.subtotal + (updated.tax || 0)
                                    setEditingInvoice(updated)
                                  }}
                                  min="1"
                                  className="w-full px-2 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown text-center"
                                />
                              </div>
                              <div className="w-32">
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const updated = { ...editingInvoice }
                                    updated.items[index].unitPrice = parseFloat(e.target.value) || 0
                                    updated.items[index].total = updated.items[index].quantity * updated.items[index].unitPrice
                                    // Recalculate totals
                                    updated.subtotal = updated.items.reduce((sum, i) => sum + i.total, 0)
                                    updated.tax = updated.taxRate ? updated.subtotal * (updated.taxRate / 100) : undefined
                                    updated.total = updated.subtotal + (updated.tax || 0)
                                    setEditingInvoice(updated)
                                  }}
                                  min="0"
                                  step="0.01"
                                  className="w-full px-2 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown text-right"
                                />
                              </div>
                              <div className="w-32 text-right font-semibold text-brown py-2">
                                {formatCurrency(item.total, editingInvoice.currency)}
                              </div>
                              <button
                                onClick={() => {
                                  const updated = { ...editingInvoice }
                                  updated.items = updated.items.filter((_, i) => i !== index)
                                  updated.subtotal = updated.items.reduce((sum, i) => sum + i.total, 0)
                                  updated.tax = updated.taxRate ? updated.subtotal * (updated.taxRate / 100) : undefined
                                  updated.total = updated.subtotal + (updated.tax || 0)
                                  setEditingInvoice(updated)
                                }}
                                className="text-red-600 hover:text-red-800 px-2"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const updated = { ...editingInvoice }
                              updated.items.push({ description: '', quantity: 1, unitPrice: 0, total: 0 })
                              setEditingInvoice(updated)
                            }}
                            className="w-full py-2 border-2 border-dashed border-brown-light rounded-lg text-brown hover:border-brown transition-colors"
                          >
                            + Add Item
                          </button>
                        </div>
                      </div>

                      {/* Tax and Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-brown mb-2">Tax Rate (%)</label>
                          <input
                            type="number"
                            value={editingInvoice.taxRate || 0}
                            onChange={(e) => {
                              const updated = { ...editingInvoice }
                              updated.taxRate = parseFloat(e.target.value) || 0
                              updated.tax = updated.taxRate ? updated.subtotal * (updated.taxRate / 100) : undefined
                              updated.total = updated.subtotal + (updated.tax || 0)
                              setEditingInvoice(updated)
                            }}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-brown mb-2">Due Date</label>
                          <input
                            type="date"
                            value={editingInvoice.dueDate}
                            onChange={(e) => {
                              const updated = { ...editingInvoice }
                              updated.dueDate = e.target.value
                              setEditingInvoice(updated)
                            }}
                            className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brown mb-2">Status</label>
                        <select
                          value={editingInvoice.status}
                          onChange={(e) => {
                            const updated = { ...editingInvoice }
                            updated.status = e.target.value as any
                            setEditingInvoice(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                          <option value="expired">Expired</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brown mb-2">Notes</label>
                        <textarea
                          value={editingInvoice.notes || ''}
                          onChange={(e) => {
                            const updated = { ...editingInvoice }
                            updated.notes = e.target.value
                            setEditingInvoice(updated)
                          }}
                          rows={3}
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                        />
                      </div>

                      {/* Totals Preview */}
                      <div className="bg-brown-light/20 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-700">Subtotal:</span>
                          <span className="font-semibold">{formatCurrency(editingInvoice.subtotal, editingInvoice.currency)}</span>
                        </div>
                        {editingInvoice.tax && editingInvoice.taxRate && (
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-700">Tax ({editingInvoice.taxRate}%):</span>
                            <span className="font-semibold">{formatCurrency(editingInvoice.tax, editingInvoice.currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t-2 border-brown-light">
                          <span className="text-lg font-bold text-brown">Total:</span>
                          <span className="text-lg font-bold text-brown">{formatCurrency(editingInvoice.total, editingInvoice.currency)}</span>
                        </div>
                      </div>

                      {/* Edit Actions */}
                      <div className="flex gap-4 pt-4 border-t-2 border-brown-light">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 bg-brown-dark text-white px-6 py-3 rounded-lg font-semibold hover:bg-brown transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingInvoice(null)}
                          className="px-6 py-3 border-2 border-brown-light text-brown rounded-lg font-semibold hover:bg-brown-light/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

