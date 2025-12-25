'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminBackButton from '@/components/AdminBackButton'
import type { ContractTerms } from '@/types/consultation-workflow'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

interface ContractTemplate {
  id: string
  name: string
  contractTerms: ContractTerms
  createdAt: string
  updatedAt: string
}

export default function AdminContractTemplate() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadTemplate()
      } catch (error) {
        router.replace('/admin/login')
      }
    }

    checkAuth()
  }, [router])

  const loadTemplate = async () => {
    try {
      const response = await authorizedFetch('/api/admin/labs/contract-template')
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.template)
      } else {
        // Create default template if none exists
        createDefaultTemplate()
      }
    } catch (error) {
      console.error('Error loading template:', error)
      createDefaultTemplate()
    } finally {
      setLoading(false)
    }
  }

  const createDefaultTemplate = () => {
    const defaultTemplate: ContractTemplate = {
      id: 'default',
      name: 'Default Contract Template',
      contractTerms: {
        deliverables: {
          included: [],
          notIncluded: [],
          extras: [],
        },
        paymentTerms: {
          consultationFee: 0,
          consultationFeeNonRefundable: true,
          upfrontPercentage: 80,
          upfrontAmount: 0,
          finalPercentage: 20,
          finalAmount: 0,
          finalPaymentDue: 'before launch',
          invoiceExpiryDays: 7,
          noWorkWithoutPayment: true,
        },
        timelines: {
          clientResponsibilities: ['Provide content and materials'],
          clientDelays: 'Project timeline may be extended',
          providerDelays: 'We will communicate any delays promptly',
        },
        boundaries: {
          revisionLimit: 2,
          revisionType: 'rounds',
          noRefundsAfterStart: true,
          noEndlessChanges: true,
        },
        confidentiality: {
          providerRetainsIPUntilPayment: true,
          clientReceivesIPOnFullPayment: true,
          mutualNDA: true,
        },
        cancellation: {
          clientCancellationPolicy: 'Consultation fee is non-refundable',
          providerCancellationPolicy: 'Full refund if we cancel',
        },
        liability: {
          noIndirectDamages: true,
          noThirdPartyResponsibility: true,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTemplate(defaultTemplate)
  }

  const handleSave = async () => {
    if (!template) return

    setSaving(true)
    try {
      const response = await authorizedFetch('/api/admin/labs/contract-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      alert('Contract template saved successfully!')
      loadTemplate()
    } catch (error: any) {
      alert(error.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const updateClientResponsibility = (index: number, value: string) => {
    if (!template) return
    const updated = { ...template }
    updated.contractTerms.timelines.clientResponsibilities[index] = value
    updated.updatedAt = new Date().toISOString()
    setTemplate(updated)
  }

  const addClientResponsibility = () => {
    if (!template) return
    const updated = { ...template }
    updated.contractTerms.timelines.clientResponsibilities.push('')
    updated.updatedAt = new Date().toISOString()
    setTemplate(updated)
  }

  const removeClientResponsibility = (index: number) => {
    if (!template) return
    const updated = { ...template }
    updated.contractTerms.timelines.clientResponsibilities = updated.contractTerms.timelines.clientResponsibilities.filter((_, i) => i !== index)
    updated.updatedAt = new Date().toISOString()
    setTemplate(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Error loading template</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminBackButton />
        <div className="mb-8">
          <h1 className="text-3xl font-display text-brown mb-2">Edit Contract Template</h1>
          <p className="text-gray-600">Edit the default contract template that will be used for all new contracts</p>
        </div>

        <div className="bg-white rounded-xl shadow-soft border-2 border-brown-light p-6 space-y-6">
          {/* Note about Deliverables */}
          <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-semibold mb-1">
              ℹ️ Note About Deliverables
            </p>
            <p className="text-sm text-blue-700">
              Deliverables (What's Included, What's Not Included, What Counts as Extra) are automatically generated from the selected tier when sending a contract. They cannot be edited in the template as they vary by tier.
            </p>
          </div>

          {/* Payment Terms */}
          <div>
            <h3 className="text-xl font-semibold text-brown mb-4">Payment Terms</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Upfront Percentage (%)</label>
                <input
                  type="number"
                  value={template.contractTerms.paymentTerms.upfrontPercentage}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.paymentTerms.upfrontPercentage = parseInt(e.target.value) || 80
                    updated.contractTerms.paymentTerms.finalPercentage = 100 - updated.contractTerms.paymentTerms.upfrontPercentage
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Final percentage will automatically be {100 - (template.contractTerms.paymentTerms.upfrontPercentage || 80)}%
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Final Payment Due</label>
                <input
                  type="text"
                  value={template.contractTerms.paymentTerms.finalPaymentDue}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.paymentTerms.finalPaymentDue = e.target.value
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="e.g., before launch"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Invoice Expiry Days</label>
                <input
                  type="number"
                  value={template.contractTerms.paymentTerms.invoiceExpiryDays}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.paymentTerms.invoiceExpiryDays = parseInt(e.target.value) || 7
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  min="1"
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of days before an unpaid invoice expires
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.paymentTerms.consultationFeeNonRefundable}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.paymentTerms.consultationFeeNonRefundable = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  Consultation Fee is Non-Refundable
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.paymentTerms.noWorkWithoutPayment}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.paymentTerms.noWorkWithoutPayment = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  No Work Without Payment
                </label>
              </div>
            </div>
          </div>

          {/* Timelines */}
          <div>
            <h3 className="text-xl font-semibold text-brown mb-4">Timelines</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Client Responsibilities</label>
                {template.contractTerms.timelines.clientResponsibilities.map((item, index) => (
                  <div key={`responsibility-${index}`} className="flex items-center mb-2">
                    <textarea
                      value={item}
                      onChange={(e) => updateClientResponsibility(index, e.target.value)}
                      rows={1}
                      className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown resize-none"
                      placeholder="e.g., Provide content and materials"
                    />
                    <button
                      type="button"
                      onClick={() => removeClientResponsibility(index)}
                      className="ml-2 text-red-600 hover:text-red-800 font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addClientResponsibility}
                  className="mt-2 px-4 py-2 bg-brown-dark text-white rounded-lg font-semibold hover:bg-brown transition-colors text-sm"
                >
                  + Add Client Responsibility
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Client Delays Policy</label>
                <textarea
                  value={template.contractTerms.timelines.clientDelays}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.timelines.clientDelays = e.target.value
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="e.g., Project timeline may be extended if client delays in providing required materials"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Provider Delays Policy</label>
                <textarea
                  value={template.contractTerms.timelines.providerDelays}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.timelines.providerDelays = e.target.value
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="e.g., We will communicate any delays promptly"
                />
              </div>
            </div>
          </div>

          {/* Boundaries */}
          <div>
            <h3 className="text-xl font-semibold text-brown mb-4">Boundaries</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Revision Limit</label>
                <input
                  type="number"
                  value={template.contractTerms.boundaries.revisionLimit}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.boundaries.revisionLimit = parseInt(e.target.value) || 2
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  min="0"
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of revision rounds included
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Revision Type</label>
                <input
                  type="text"
                  value={template.contractTerms.boundaries.revisionType}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.boundaries.revisionType = e.target.value
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="e.g., rounds"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Type of revisions (e.g., "rounds", "iterations")
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.boundaries.noRefundsAfterStart}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.boundaries.noRefundsAfterStart = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  No Refunds After Work Starts
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.boundaries.noEndlessChanges}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.boundaries.noEndlessChanges = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  No Endless Changes (Revision Limit Applies)
                </label>
              </div>
            </div>
          </div>

          {/* Confidentiality */}
          <div>
            <h3 className="text-xl font-semibold text-brown mb-4">Confidentiality & Intellectual Property</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.confidentiality.providerRetainsIPUntilPayment}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.confidentiality.providerRetainsIPUntilPayment = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  Provider Retains IP Until Full Payment
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.confidentiality.clientReceivesIPOnFullPayment}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.confidentiality.clientReceivesIPOnFullPayment = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  Client Receives IP Upon Full Payment
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.confidentiality.mutualNDA}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.confidentiality.mutualNDA = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  Mutual NDA (Non-Disclosure Agreement)
                </label>
              </div>
            </div>
          </div>

          {/* Cancellation */}
          <div>
            <h3 className="text-xl font-semibold text-brown mb-4">Cancellation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Client Cancellation Policy</label>
                <textarea
                  value={template.contractTerms.cancellation.clientCancellationPolicy}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.cancellation.clientCancellationPolicy = e.target.value
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="e.g., Consultation fee is non-refundable. If client cancels after work begins, no refund will be provided."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown mb-2">Provider Cancellation Policy</label>
                <textarea
                  value={template.contractTerms.cancellation.providerCancellationPolicy}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.cancellation.providerCancellationPolicy = e.target.value
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-brown-light rounded-lg focus:outline-none focus:border-brown"
                  placeholder="e.g., Full refund if we cancel the project"
                />
              </div>
            </div>
          </div>

          {/* Liability */}
          <div>
            <h3 className="text-xl font-semibold text-brown mb-4">Liability</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.liability.noIndirectDamages}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.liability.noIndirectDamages = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  No Liability for Indirect Damages
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={template.contractTerms.liability.noThirdPartyResponsibility}
                  onChange={(e) => {
                    const updated = { ...template }
                    updated.contractTerms.liability.noThirdPartyResponsibility = e.target.checked
                    updated.updatedAt = new Date().toISOString()
                    setTemplate(updated)
                  }}
                  className="w-5 h-5 text-brown-dark border-brown-light rounded focus:ring-brown"
                />
                <label className="text-sm font-semibold text-brown">
                  No Responsibility for Third-Party Issues
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t-2 border-brown-light">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-brown-dark text-white px-6 py-3 rounded-lg font-semibold hover:bg-brown transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Contract Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

