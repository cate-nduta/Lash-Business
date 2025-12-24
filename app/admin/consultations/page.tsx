'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminBackButton from '@/components/AdminBackButton'
import type { Consultation } from '@/types/consultation-workflow'
import type { ContractTerms } from '@/types/consultation-workflow'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [showContractModal, setShowContractModal] = useState(false)
  const [sendingContract, setSendingContract] = useState(false)
  
  // Contract form state
  const [projectDescription, setProjectDescription] = useState('')
  const [projectCost, setProjectCost] = useState(0)
  const [contractTerms, setContractTerms] = useState<ContractTerms>({
    deliverables: {
      included: [''],
      notIncluded: [''],
      extras: [''],
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
      clientResponsibilities: [''],
      clientDelays: 'Project timeline may be extended accordingly.',
      providerDelays: 'We will communicate any delays and adjust timeline as needed.',
    },
    boundaries: {
      revisionLimit: 2,
      revisionType: 'rounds of revisions',
      noRefundsAfterStart: true,
      noEndlessChanges: true,
    },
    confidentiality: {
      providerRetainsIPUntilPayment: true,
      clientReceivesIPOnFullPayment: true,
      mutualNDA: false,
    },
    cancellation: {
      clientCancellationPolicy: 'Upfront payment is non-refundable after work starts.',
      providerCancellationPolicy: 'Partial payments for unstarted work will be refunded.',
    },
    liability: {
      noIndirectDamages: true,
      noThirdPartyResponsibility: true,
    },
  })
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    // Calculate amounts when project cost changes
    if (projectCost > 0) {
      const upfrontAmount = Math.round(projectCost * (contractTerms.paymentTerms.upfrontPercentage / 100))
      const finalAmount = projectCost - upfrontAmount
      setContractTerms(prev => ({
        ...prev,
        paymentTerms: {
          ...prev.paymentTerms,
          upfrontAmount,
          finalAmount,
        },
      }))
    }
  }, [projectCost, contractTerms.paymentTerms.upfrontPercentage])

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
      loadConsultations()
    } catch (error) {
      router.replace('/admin/login')
    }
  }

  const loadConsultations = async () => {
    try {
      const response = await authorizedFetch('/api/consultations')
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

  const updateConsultationDecision = async (consultationId: string, decision: 'proceed' | 'decline', notes?: string) => {
    try {
      const response = await authorizedFetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminDecision: decision,
          adminDecisionNotes: notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update consultation')
      }

      await loadConsultations()
    } catch (error) {
      console.error('Error updating consultation:', error)
      alert('Failed to update consultation. Please try again.')
    }
  }

  const openContractModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setProjectDescription('')
    setProjectCost(0)
    setShowContractModal(true)
  }

  const sendContract = async () => {
    if (!selectedConsultation) return

    if (!projectDescription || projectCost <= 0) {
      alert('Please fill in project description and cost')
      return
    }

    setSendingContract(true)
    try {
      const response = await authorizedFetch(`/api/consultations/${selectedConsultation.id}/send-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectDescription,
          projectCost,
          contractTerms,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send contract')
      }

      const data = await response.json()
      alert(`Contract sent successfully! Contract URL: ${data.contractUrl}`)
      setShowContractModal(false)
      await loadConsultations()
    } catch (error: any) {
      alert(error.message || 'Failed to send contract')
    } finally {
      setSendingContract(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF9F4] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4B31] mx-auto"></div>
            <p className="mt-4 text-[#6B4A3B]">Loading consultations...</p>
          </div>
        </div>
      </div>
    )
  }

  const pendingConsultations = consultations.filter(c => c.status === 'pending')
  const completedConsultations = consultations.filter(c => c.status === 'completed')
  const declinedConsultations = consultations.filter(c => c.status === 'declined')

  return (
    <div className="min-h-screen bg-[#FDF9F4] p-8">
      <div className="max-w-7xl mx-auto">
        <AdminBackButton />
        <h1 className="text-3xl font-bold text-[#7C4B31] mb-8">Post-Consultation Management</h1>

        {/* Pending Consultations */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-[#7C4B31] mb-4">
            Pending Decisions ({pendingConsultations.length})
          </h2>
          {pendingConsultations.length === 0 ? (
            <p className="text-[#6B4A3B]">No pending consultations.</p>
          ) : (
            <div className="space-y-4">
              {pendingConsultations.map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#3E2A20]">{consultation.clientName}</h3>
                      <p className="text-[#6B4A3B]">{consultation.clientEmail}</p>
                      {consultation.clientPhone && (
                        <p className="text-[#6B4A3B]">{consultation.clientPhone}</p>
                      )}
                      <p className="text-sm text-[#6B4A3B] mt-2">
                        Consultation Date: {formatDate(consultation.consultationDate)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateConsultationDecision(consultation.id, 'proceed')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Proceed
                      </button>
                      <button
                        onClick={() => updateConsultationDecision(consultation.id, 'decline')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                  {consultation.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-[#3E2A20]">{consultation.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Completed Consultations (Ready for Contract) */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-[#7C4B31] mb-4">
            Ready for Contract ({completedConsultations.length})
          </h2>
          {completedConsultations.length === 0 ? (
            <p className="text-[#6B4A3B]">No consultations ready for contract.</p>
          ) : (
            <div className="space-y-4">
              {completedConsultations.map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#3E2A20]">{consultation.clientName}</h3>
                      <p className="text-[#6B4A3B]">{consultation.clientEmail}</p>
                      <p className="text-sm text-[#6B4A3B] mt-2">
                        Decision made: {consultation.adminDecisionAt ? formatDate(consultation.adminDecisionAt) : 'N/A'}
                      </p>
                      {consultation.contractId && (
                        <p className="text-sm text-green-600 mt-2">✓ Contract sent</p>
                      )}
                    </div>
                    {!consultation.contractId && (
                      <button
                        onClick={() => openContractModal(consultation)}
                        className="px-4 py-2 bg-[#7C4B31] text-white rounded hover:bg-[#6B3E26]"
                      >
                        Send Contract
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Declined Consultations */}
        {declinedConsultations.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-[#7C4B31] mb-4">
              Declined ({declinedConsultations.length})
            </h2>
            <div className="space-y-4">
              {declinedConsultations.map((consultation) => (
                <div key={consultation.id} className="bg-white rounded-lg shadow p-6 opacity-75">
                  <h3 className="text-xl font-semibold text-[#3E2A20]">{consultation.clientName}</h3>
                  <p className="text-[#6B4A3B]">{consultation.clientEmail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contract Modal */}
        {showContractModal && selectedConsultation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
              <h2 className="text-2xl font-bold text-[#7C4B31] mb-6">
                Send Contract to {selectedConsultation.clientName}
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                    Project Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                    placeholder="Describe what you are delivering..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                    Project Cost (KES) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={projectCost}
                    onChange={(e) => setProjectCost(Number(e.target.value))}
                    min="0"
                    step="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                  />
                  {projectCost > 0 && (
                    <div className="mt-2 text-sm text-[#6B4A3B]">
                      <p>Upfront (80%): KES {contractTerms.paymentTerms.upfrontAmount.toLocaleString()}</p>
                      <p>Final (20%): KES {contractTerms.paymentTerms.finalAmount.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Contract Terms Editor - Simplified for now */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-[#7C4B31] mb-4">Contract Terms</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                        What's Included (one per line)
                      </label>
                      <textarea
                        value={contractTerms.deliverables.included.join('\n')}
                        onChange={(e) => setContractTerms(prev => ({
                          ...prev,
                          deliverables: {
                            ...prev.deliverables,
                            included: e.target.value.split('\n').filter(l => l.trim()),
                          },
                        }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                        What's Not Included (one per line)
                      </label>
                      <textarea
                        value={contractTerms.deliverables.notIncluded.join('\n')}
                        onChange={(e) => setContractTerms(prev => ({
                          ...prev,
                          deliverables: {
                            ...prev.deliverables,
                            notIncluded: e.target.value.split('\n').filter(l => l.trim()),
                          },
                        }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                        What Counts as Extra (one per line)
                      </label>
                      <textarea
                        value={contractTerms.deliverables.extras.join('\n')}
                        onChange={(e) => setContractTerms(prev => ({
                          ...prev,
                          deliverables: {
                            ...prev.deliverables,
                            extras: e.target.value.split('\n').filter(l => l.trim()),
                          },
                        }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#3E2A20] mb-2">
                        Client Responsibilities (one per line)
                      </label>
                      <textarea
                        value={contractTerms.timelines.clientResponsibilities.join('\n')}
                        onChange={(e) => setContractTerms(prev => ({
                          ...prev,
                          timelines: {
                            ...prev.timelines,
                            clientResponsibilities: e.target.value.split('\n').filter(l => l.trim()),
                          },
                        }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#7C4B31]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={sendContract}
                  disabled={sendingContract || !projectDescription || projectCost <= 0}
                  className="px-6 py-2 bg-[#7C4B31] text-white rounded hover:bg-[#6B3E26] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingContract ? 'Sending...' : 'Send Contract'}
                </button>
                <button
                  onClick={() => setShowContractModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

