'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface PartnerReferral {
  id: string
  promoCode: string
  salonName?: string | null
  salonEmail?: string | null
  clientName?: string | null
  clientEmail?: string | null
  service?: string | null
  bookingId?: string | null
  appointmentDate?: string | null
  appointmentTime?: string | null
  originalPrice: number
  finalPrice: number
  discountApplied: number
  clientDiscountPercent?: number | null
  commissionPercent: number
  commissionTotalAmount?: number
  commissionEarlyPercent?: number
  commissionFinalPercent?: number
  commissionEarlyAmount?: number
  commissionFinalAmount?: number
  commissionEarlyStatus?: 'pending' | 'earned' | 'paid'
  commissionFinalStatus?: 'pending' | 'earned' | 'paid'
  commissionEarlyPaidAt?: string | null
  commissionFinalPaidAt?: string | null
  status: 'pending' | 'paid'
  createdAt: string
  updatedAt?: string | null
  paidAt?: string | null
}

interface ReferralTotals {
  pendingCount: number
  pendingAmount: number
  paidCount: number
  paidAmount: number
}

type PartnerCodeSummary = {
  code: string
  salonName: string
  salonEmail: string
  salonPartnerType: 'salon' | 'beautician' | 'influencer'
  clientDiscountPercent: number | null
  salonCommissionPercent: number | null
  salonUsageLimit: number | null
  salonUsedCount: number
  commissionTotal: number
  commissionPaid: number
  active: boolean
  terminatedAt?: string | null
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const formatCurrency = (value: number) => `KSH ${value.toLocaleString()}`
const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function ReferralsTrackingAdmin() {
  const [referrals, setReferrals] = useState<PartnerReferral[]>([])
  const [partnerCodes, setPartnerCodes] = useState<PartnerCodeSummary[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [terminatingCode, setTerminatingCode] = useState<string | null>(null)
  const [terminateTarget, setTerminateTarget] = useState<PartnerCodeSummary | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const auth = await authorizedFetch('/api/admin/current-user')
        if (!auth.ok) {
          throw new Error('Unauthorized')
        }
        const authData = await auth.json()
        if (!authData.authenticated) {
          window.location.href = '/admin/login'
          return
        }

        const response = await authorizedFetch('/api/admin/referrals-tracking')
        if (!response.ok) {
          throw new Error('Failed to load referrals')
        }
        const data = await response.json()
        if (!isMounted) return
        setReferrals(data.referrals || [])
        setPartnerCodes(data.partnerCodes || [])
      } catch (error) {
        console.error('Error loading referrals tracking:', error)
        if (isMounted) {
          setMessage({ type: 'error', text: 'Failed to load referral tracking data.' })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])
  useEffect(() => {
    if (selectedCode && !partnerCodes.some((partner) => partner.code === selectedCode)) {
      setSelectedCode(null)
    }
  }, [partnerCodes, selectedCode])
  useEffect(() => {
    setStatusFilter('all')
  }, [selectedCode])

  const selectedPartner = useMemo(
    () => (selectedCode ? partnerCodes.find((partner) => partner.code === selectedCode) || null : null),
    [partnerCodes, selectedCode],
  )

  const selectedReferrals = useMemo(() => {
    if (!selectedCode) return []
    return referrals.filter((referral) => referral.promoCode.toUpperCase() === selectedCode.toUpperCase())
  }, [referrals, selectedCode])

  const filteredReferrals = useMemo(() => {
    if (!selectedCode) return []
    if (statusFilter === 'all') return selectedReferrals
    return selectedReferrals.filter((referral) => referral.status === statusFilter)
  }, [selectedReferrals, selectedCode, statusFilter])

  const partnerTotals = useMemo(() => {
    return selectedReferrals.reduce(
      (acc, entry) => {
        const amount = entry.commissionTotalAmount ?? (entry as any).commissionAmount ?? 0
        if (entry.status === 'paid') {
          acc.paidCount += 1
          acc.paidAmount += amount
        } else {
          acc.pendingCount += 1
          acc.pendingAmount += amount
        }
        return acc
      },
      { pendingCount: 0, pendingAmount: 0, paidCount: 0, paidAmount: 0 },
    )
  }, [selectedReferrals])

  const pendingSummary = `${partnerTotals.pendingCount} pending (${formatCurrency(partnerTotals.pendingAmount)})`
  const paidSummary = `${partnerTotals.paidCount} paid (${formatCurrency(partnerTotals.paidAmount)})`
  const selectedPartnerLabel = selectedPartner
    ? selectedPartner.salonPartnerType === 'beautician'
      ? 'Beautician'
      : selectedPartner.salonPartnerType === 'influencer'
      ? 'Influencer'
      : 'Salon'
    : null

  const handleStatusChange = async (id: string, nextStatus: 'pending' | 'paid') => {
    setSavingId(id)
    setMessage(null)
    try {
      const response = await authorizedFetch('/api/admin/referrals-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update referral')
      }
      const updated = await response.json()
      setMessage({ type: 'success', text: 'Referral status updated.' })
      setReferrals((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, ...updated.referral } : entry)),
      )
    } catch (error) {
      console.error('Failed to update referral:', error)
      setMessage({ type: 'error', text: 'Could not update referral status.' })
    } finally {
      setSavingId(null)
    }
  }

  const confirmTerminateCode = async (code: PartnerCodeSummary) => {
    setTerminatingCode(code.code)
    setMessage(null)
    try {
      const response = await authorizedFetch('/api/admin/referrals-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'terminate-code', code: code.code }),
      })
      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to terminate referral code.')
      }

      const updatedPromo = data?.promo
      if (updatedPromo) {
        setPartnerCodes((prev) =>
          prev.map((entry) =>
            entry.code === updatedPromo.code
              ? {
                  ...entry,
                  active: updatedPromo.active !== false,
                  terminatedAt: updatedPromo.terminatedAt || new Date().toISOString(),
                }
              : entry,
          ),
        )
      }

      setMessage({
        type: 'success',
        text: `Referral code ${code.code} has been terminated${
          data?.emailResult?.success === false
            ? ' (partner email failed to send — please follow up manually)'
            : '.'
        }`,
      })
    } catch (error: any) {
      console.error('Failed to terminate referral code:', error)
      setMessage({ type: 'error', text: error?.message || 'Could not terminate referral code.' })
    } finally {
      setTerminatingCode(null)
      setTerminateTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading referrals tracking...</div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display text-brown-dark">Referrals Tracking</h1>
            <p className="text-sm text-brown-dark/70 mt-1">
              Monitor partner activity, commissions, and usage across all beautician, salon, and influencer codes.
            </p>
          </div>
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-brown-dark">Active partner codes</h2>
            <p className="text-sm text-brown-dark/60">
              See how many redemptions remain and track commission performance for each code.
            </p>
          </div>
          {partnerCodes.length === 0 ? (
            <div className="text-center text-brown py-6 border-2 border-dashed border-brown-light rounded-xl">
              No partner codes created yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {partnerCodes.map((code) => {
                const partnerLabel =
                  code.salonPartnerType === 'beautician'
                    ? 'Beautician'
                    : code.salonPartnerType === 'influencer'
                    ? 'Influencer'
                    : 'Salon'
                const remaining =
                  code.salonUsageLimit !== null && code.salonUsageLimit !== undefined
                    ? Math.max(code.salonUsageLimit - code.salonUsedCount, 0)
                    : null
                return (
                  <div
                    key={code.code}
                    className={`rounded-xl border p-4 shadow-sm ${code.active ? 'border-brown-light bg-pink-light/50' : 'border-brown-light/60 bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase text-brown-dark/60 tracking-wide">Code</p>
                        <p className="text-lg font-display text-brown-dark">{code.code}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${code.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                      >
                        {code.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-brown-dark">
                      <div>
                        <span className="font-semibold">Partner:</span> {code.salonName || '—'}{' '}
                        <span className="text-xs text-brown-dark/60">({partnerLabel})</span>
                      </div>
                      <div className="text-xs text-brown-dark/60">{code.salonEmail || 'No email on file'}</div>
                      <div>
                        <span className="font-semibold">Client discount:</span>{' '}
                        {code.clientDiscountPercent ?? 0}%
                      </div>
                      <div>
                        <span className="font-semibold">Commission:</span>{' '}
                        {code.salonCommissionPercent ?? 0}%
                      </div>
                      <div>
                        <span className="font-semibold">Usage:</span>{' '}
                        {code.salonUsedCount}
                        {code.salonUsageLimit ? ` / ${code.salonUsageLimit}` : ''}
                        {remaining !== null && code.active && (
                          <span className="text-xs text-brown-dark/60"> ({remaining} slots remaining)</span>
                        )}
                      </div>
                      <div className="text-xs text-brown-dark/60">
                        Commission earned: {formatCurrency(code.commissionTotal)}
                      </div>
                      <div className="text-xs text-brown-dark/60">
                        Commission paid: {formatCurrency(code.commissionPaid)}
                      </div>
                      {code.terminatedAt && (
                        <div className="text-xs text-red-600">
                          Terminated {formatDateTime(code.terminatedAt)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedCode((prev) => (prev === code.code ? null : code.code))}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brown-light text-brown-dark hover:bg-pink-light/40 text-xs font-semibold transition"
                      >
                        {selectedCode === code.code ? 'Hide activity' : 'View activity'}
                      </button>
                      {code.active ? (
                        <button
                          type="button"
                          onClick={() => setTerminateTarget(code)}
                          disabled={terminatingCode === code.code}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {terminatingCode === code.code ? 'Terminating...' : 'Terminate'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-brown-dark">
                Referral activity{selectedPartner ? ` — ${selectedPartner.salonName || selectedPartner.code}` : ''}
              </h2>
              {selectedPartner ? (
                <p className="text-sm text-brown-dark/60">
                  Pending: {pendingSummary} • Paid: {paidSummary}
                </p>
              ) : (
                <p className="text-sm text-brown-dark/60">
                  Select a partner above to review their referral history and commission status.
                </p>
              )}
            </div>
            {selectedPartner && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-brown-dark font-medium">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'pending' | 'paid')}
                  className="px-3 py-2 border border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            )}
          </div>

          {selectedPartner && (
            <div className="mb-4 rounded-lg border border-brown-light/60 bg-pink-light/40 p-4 text-sm text-brown-dark space-y-1">
              <div className="font-semibold text-brown-dark text-base">
                {selectedPartner.salonName || 'Partner'}{' '}
                {selectedPartnerLabel && (
                  <span className="text-xs text-brown-dark/60">({selectedPartnerLabel})</span>
                )}
              </div>
              <div className="text-brown-dark/70">{selectedPartner.salonEmail || 'No email on file'}</div>
              <div className="flex flex-wrap gap-4 text-xs text-brown-dark/70">
                <span>Code: {selectedPartner.code}</span>
                <span>Commission: {selectedPartner.salonCommissionPercent ?? 0}%</span>
                <span>Client discount: {selectedPartner.clientDiscountPercent ?? 0}%</span>
                <span>
                  Usage: {selectedPartner.salonUsedCount}
                  {selectedPartner.salonUsageLimit ? ` / ${selectedPartner.salonUsageLimit}` : ''}
                </span>
                <span>Total earned: {formatCurrency(selectedPartner.commissionTotal)}</span>
                <span>Total paid: {formatCurrency(selectedPartner.commissionPaid)}</span>
              </div>
              {selectedPartner.terminatedAt && (
                <div className="text-xs text-red-600 mt-1">
                  Terminated {formatDateTime(selectedPartner.terminatedAt)}
                </div>
              )}
            </div>
          )}

          {!selectedPartner ? (
            <div className="text-center text-brown py-12 border-2 border-dashed border-brown-light rounded-xl">
              Choose a partner to view referral activity.
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center text-brown py-12 border-2 border-dashed border-brown-light rounded-xl">
              No referrals found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brown-light/60">
                <thead className="bg-pink-light/40">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-brown-dark">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-brown-dark">Partner</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-brown-dark">Client &amp; Service</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-brown-dark">Commission</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-brown-dark">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-brown-dark">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-light/40">
                  {filteredReferrals.map((entry) => (
                    <tr key={entry.id} className="hover:bg-pink-light/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-brown-dark">
                        <div className="font-semibold">{formatDateTime(entry.createdAt)}</div>
                        {entry.bookingId && (
                          <div className="text-xs text-brown-dark/60">Booking: {entry.bookingId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-brown-dark">
                        <div className="font-semibold">{entry.salonName || '—'}</div>
                        <div className="text-xs text-brown-dark/60">{entry.salonEmail || 'No email on file'}</div>
                        <div className="text-xs text-brown-dark/60 mt-1">Code: {entry.promoCode}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-brown-dark">
                        <div className="font-semibold">{entry.clientName || 'New client'}</div>
                        <div className="text-xs text-brown-dark/60">{entry.service || 'Service'}</div>
                        {entry.clientDiscountPercent !== null && entry.clientDiscountPercent !== undefined && (
                          <div className="text-xs text-green-700 mt-1">
                            Client discount: {entry.clientDiscountPercent}% • Commission: {entry.commissionPercent}%
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-brown-dark">
                        <div className="font-semibold">
                          {formatCurrency(
                            (entry.commissionTotalAmount ?? (entry as any).commissionAmount ?? 0) as number,
                          )}
                        </div>
                        <div className="text-xs text-brown-dark/60">
                          Service price: {formatCurrency(entry.originalPrice)}
                        </div>
                        {(entry.commissionEarlyAmount ?? 0) > 0 && (
                          <div className="text-xs text-brown-dark/60 mt-1">
                            Early payout: {formatCurrency(entry.commissionEarlyAmount ?? 0)} (
                            {entry.commissionEarlyPercent ?? 0}%){' '}
                            {entry.commissionEarlyStatus && entry.commissionEarlyStatus !== 'pending'
                              ? `• ${entry.commissionEarlyStatus}`
                              : ''}
                          </div>
                        )}
                        <div className="text-xs text-brown-dark/60">
                          Commission release: {formatCurrency(entry.commissionFinalAmount ?? 0)} (
                          {entry.commissionFinalPercent ?? 0}%){' '}
                          {entry.commissionFinalStatus && entry.commissionFinalStatus !== 'pending'
                            ? `• ${entry.commissionFinalStatus}`
                            : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            entry.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {entry.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                        {entry.paidAt && (
                          <div className="text-xs text-green-700 mt-1">
                            Paid {formatDateTime(entry.paidAt)}
                          </div>
                        )}
                        {entry.commissionEarlyStatus && (entry.commissionEarlyAmount ?? 0) > 0 && (
                          <div className="text-xs text-brown-dark/60 mt-1">
                            Early payout: {entry.commissionEarlyStatus}
                            {entry.commissionEarlyPaidAt
                              ? ` (${formatDateTime(entry.commissionEarlyPaidAt)})`
                              : ''}
                          </div>
                        )}
                        {entry.commissionFinalStatus && (
                          <div className="text-xs text-brown-dark/60">
                            Final payout: {entry.commissionFinalStatus}
                            {entry.commissionFinalPaidAt
                              ? ` (${formatDateTime(entry.commissionFinalPaidAt)})`
                              : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(entry.id, entry.status === 'paid' ? 'pending' : 'paid')}
                          disabled={savingId === entry.id}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            entry.status === 'paid'
                              ? 'border border-brown-light text-brown-dark hover:bg-pink-light/40'
                              : 'bg-brown-dark text-white hover:bg-brown'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {savingId === entry.id
                            ? 'Updating...'
                            : entry.status === 'paid'
                            ? 'Mark as pending'
                            : 'Mark as paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
      {terminateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-display text-brown-dark">Terminate referral code?</h3>
            <p className="text-sm text-brown-dark/80">
              This will immediately pause <span className="font-semibold">{terminateTarget.code}</span>. The partner will receive an email and any future bookings with this code will be blocked.
            </p>
            <div className="rounded-lg bg-baby-pink-light/60 border border-brown-light/50 p-4 text-sm text-brown-dark">
              <p className="font-semibold">{terminateTarget.salonName || 'Partner'}</p>
              <p className="text-brown-dark/70">{terminateTarget.salonEmail || 'No email on file'}</p>
              <p className="text-brown-dark/70 mt-2">
                Commission paid to date: {formatCurrency(terminateTarget.commissionPaid)} • Redeemed: {terminateTarget.salonUsedCount}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTerminateTarget(null)}
                className="px-4 py-2 rounded-lg border border-brown-light text-brown-dark hover:border-brown-dark transition text-sm"
                disabled={terminatingCode === terminateTarget.code}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmTerminateCode(terminateTarget)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition text-sm disabled:opacity-60"
                disabled={terminatingCode === terminateTarget.code}
              >
                {terminatingCode === terminateTarget.code ? 'Terminating...' : 'Terminate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


