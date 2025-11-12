'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Toast from '@/components/Toast'
import type {
  PartnerOnboardingRecord,
  PartnerType,
} from '@/lib/partner-onboarding-utils'

const partnerOptions: Array<{ value: PartnerType; label: string }> = [
  { value: 'salon', label: 'Salon' },
  { value: 'beautician', label: 'Beautician' },
  { value: 'influencer', label: 'Influencer / Creator' },
]

const partnerBadges: Record<PartnerType, string> = {
  salon: 'Salon Partner',
  beautician: 'Beautician Partner',
  influencer: 'Influencer Partner',
}

const statusBadgeClasses: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
}

type Message = { type: 'success' | 'error'; text: string } | null

type FormState = {
  partnerType: PartnerType
  businessName: string
  contactName: string
  email: string
  phone: string
  notes: string
}

const initialFormState: FormState = {
  partnerType: 'salon',
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  notes: '',
}

export default function PartnerOnboardingAdminPage() {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [records, setRecords] = useState<PartnerOnboardingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PartnerOnboardingRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailsSendingId, setDetailsSendingId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const ensureAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data?.authenticated) {
          window.location.href = '/admin/login'
          return
        }
        setAuthenticated(true)
        await loadRecords()
      } catch (error) {
        if (!isMounted) return
        setAuthenticated(false)
        window.location.href = '/admin/login'
      }
    }

    ensureAuth()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/partner-onboarding', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load onboarding records')
      }
      const data = await response.json()
      setRecords(Array.isArray(data.records) ? data.records : [])
    } catch (error) {
      console.error('Error loading onboarding records:', error)
      setMessage({ type: 'error', text: 'Failed to load partner onboarding records.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetForm = () => {
    setForm({
      partnerType: form.partnerType,
      businessName: '',
      contactName: '',
      email: '',
      phone: '',
      notes: '',
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const payload = {
        partnerType: form.partnerType,
        businessName: form.businessName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
        notes: form.notes,
      }

      const response = await fetch('/api/admin/partner-onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send onboarding email.')
      }

      const record: PartnerOnboardingRecord | undefined = data?.record
      if (record) {
        setRecords((prev) => [record, ...prev.filter((entry) => entry.id !== record.id)])
      }

      setMessage({
        type: 'success',
        text: 'Onboarding email sent successfully. Partners can now review and agree from their inbox.',
      })
      resetForm()
    } catch (error: any) {
      console.error('Failed to create onboarding record:', error)
      setMessage({
        type: 'error',
        text: error?.message || 'Failed to create onboarding record. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const markAgreementAccepted = async (record: PartnerOnboardingRecord) => {
    try {
      const response = await fetch('/api/admin/partner-onboarding', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, action: 'mark-accepted' }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update record.')
      }

      const updated: PartnerOnboardingRecord | undefined = data?.record
      if (updated) {
        setRecords((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)))
      }
      setMessage({ type: 'success', text: 'Marked agreement as accepted.' })
    } catch (error: any) {
      console.error('Failed to mark agreement received:', error)
      setMessage({ type: 'error', text: error?.message || 'Could not update record.' })
    }
  }

  const deleteRecord = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const response = await fetch('/api/admin/partner-onboarding', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete record.')
      }
      setRecords((prev) => prev.filter((entry) => entry.id !== deleteTarget.id))
      setMessage({ type: 'success', text: 'Onboarding record removed. You can now send a fresh email.' })
      setDeleteTarget(null)
    } catch (error: any) {
      console.error('Failed to delete onboarding record:', error)
      setMessage({ type: 'error', text: error?.message || 'Could not delete record.' })
    } finally {
      setDeleting(false)
    }
  }

  const editNotes = async (record: PartnerOnboardingRecord) => {
    const existing = record.notes || ''
    const updatedNotes = window.prompt('Update notes for this partner:', existing) ?? undefined
    if (updatedNotes === undefined || updatedNotes === existing) {
      return
    }
    try {
      const response = await fetch('/api/admin/partner-onboarding', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id, action: 'update-notes', notes: updatedNotes }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update notes.')
      }
      const updated: PartnerOnboardingRecord | undefined = data?.record
      if (updated) {
        setRecords((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)))
      }
      setMessage({ type: 'success', text: 'Notes updated.' })
    } catch (error: any) {
      console.error('Failed to update notes:', error)
      setMessage({ type: 'error', text: error?.message || 'Could not update notes.' })
    }
  }

  const awaitingAgreementCount = useMemo(
    () => records.filter((record) => !record.agreementAcceptedAt).length,
    [records],
  )

  const sendDetailsEmail = async (record: PartnerOnboardingRecord) => {
    setDetailsSendingId(record.id)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/partner-onboarding/details', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: record.id }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send partner details email.')
      }
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send partner details email.')
      }
      const updated: PartnerOnboardingRecord | undefined = data?.record
      if (updated) {
        setRecords((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)))
      }
      const promoCode = data?.promoCode ? ` Promo code ${data.promoCode} is now active.` : ''
      setMessage({
        type: 'success',
        text: `Partner details email sent successfully.${promoCode}`,
      })
    } catch (error: any) {
      console.error('Failed to send partner details email:', error)
      setMessage({
        type: 'error',
        text: error?.message || 'Could not send partner details email.',
      })
    } finally {
      setDetailsSendingId(null)
    }
  }

  if (authenticated === null || loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading partner onboarding...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      {message && (
        <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display text-brown-dark mb-2">Partner Onboarding</h1>
            <p className="text-brown-dark/70 text-sm">
              Send welcome packs, track signed agreements, and keep notes on salons, beauticians, and creators.
            </p>
          </div>
          <Link href="/admin/dashboard" className="text-brown hover:text-brown-dark">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-brown-light/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display text-brown-dark">Send onboarding kit</h2>
              <p className="text-sm text-brown-dark/70">
                We’ll email the agreement, attach the PDF, and keep a record of the status here.
              </p>
            </div>
            <div className="text-sm text-brown-dark/70">
              Awaiting agreement: <span className="font-semibold">{awaitingAgreementCount}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Partner Type</label>
              <select
                value={form.partnerType}
                onChange={(event) => handleInputChange('partnerType', event.target.value as PartnerType)}
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              >
                {partnerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Business / Brand Name *
              </label>
              <input
                type="text"
                value={form.businessName}
                onChange={(event) => handleInputChange('businessName', event.target.value)}
                required
                placeholder="Glow Beauty Studio"
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Primary Contact *</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(event) => handleInputChange('contactName', event.target.value)}
                required
                placeholder="Jane Doe"
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Contact Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => handleInputChange('email', event.target.value)}
                required
                placeholder="hello@glowstudio.co.ke"
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-brown-dark mb-2">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => handleInputChange('phone', event.target.value)}
                placeholder="e.g. +254 7XX XXX XXX"
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Internal Notes (optional)
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => handleInputChange('notes', event.target.value)}
                placeholder="Mention anything special to tailor their welcome kit."
                className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-3 rounded-lg bg-brown-dark text-white font-semibold hover:bg-brown disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Sending...' : 'Send onboarding email'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-brown-light/40">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-display text-brown-dark">Recent onboardings</h2>
              <p className="text-sm text-brown-dark/70">
                Track email delivery, agreement status, and keep notes for each partner.
              </p>
            </div>
            <button
              type="button"
              onClick={loadRecords}
              className="px-3 py-2 rounded-lg border border-brown-light text-brown-dark hover:border-brown-dark transition text-sm"
            >
              Refresh
            </button>
          </div>

          {records.length === 0 ? (
            <div className="text-center text-brown py-12 border-2 border-dashed border-brown-light rounded-xl">
              No partner onboardings yet.
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-xl border border-brown-light/60 bg-white/90 shadow-sm p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="px-2 py-1 rounded-full border border-brown-light text-brown-dark/80">
                        {partnerBadges[record.partnerType]}
                      </span>
                      <span className="text-xs text-brown-dark/60">Agreement ID: {record.agreementId}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-brown-dark">{record.businessName}</h3>
                      <p className="text-sm text-brown-dark/70">
                        {record.contactName} • {record.email}
                        {record.phone ? ` • ${record.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-brown-dark/70">
                      <span>
                        Created{' '}
                        {new Date(record.createdAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full font-semibold ${
                          statusBadgeClasses[record.emailStatus] || statusBadgeClasses.pending
                        }`}
                      >
                        Email {record.emailStatus === 'sent' ? 'sent' : record.emailStatus}
                      </span>
                      {record.emailError && (
                        <span className="text-red-600 font-semibold">
                          Email error: {record.emailError}
                        </span>
                      )}
                      {record.emailProvider && (
                        <span className="text-brown-dark/60">
                          Provider: {record.emailProvider.toUpperCase()}
                        </span>
                      )}
                      {record.promoCode && (
                        <span className="text-brown-dark/80 font-semibold">
                          Promo code: {record.promoCode}
                        </span>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-sm text-brown-dark/80 bg-baby-pink-light/70 border border-brown-light/60 rounded-lg px-3 py-2">
                        {record.notes}
                      </p>
                    )}
                    {record.agreementAcceptedAt ? (
                      <div className="space-y-2">
                        <p className="text-sm text-green-700 font-semibold">
                          Agreement accepted{' '}
                          {new Date(record.agreementAcceptedAt).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                        {record.detailsEmailSentAt ? (
                          <p className="text-xs text-brown-dark/70">
                            Details email last sent{' '}
                            {new Date(record.detailsEmailSentAt).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        ) : (
                          <p className="text-xs text-brown-dark/70">
                            Send the referral toolkit once you’re ready.
                          </p>
                        )}
                        <Link
                          href={`/admin/partner-referral-emails?partnerId=${record.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brown-light text-xs font-semibold text-brown-dark hover:bg-brown-light/20 transition"
                        >
                          Edit email &amp; numbers
                        </Link>
                        <button
                          type="button"
                          onClick={() => sendDetailsEmail(record)}
                          disabled={detailsSendingId === record.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {detailsSendingId === record.id
                            ? 'Sending details...'
                            : record.detailsEmailSentAt
                            ? 'Resend details email'
                            : 'Send details email'}
                        </button>
                        {record.detailsEmailStatus === 'error' && record.detailsEmailError && (
                          <p className="text-xs text-red-600">
                            Last attempt failed: {record.detailsEmailError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-brown-dark/70">
                        Waiting for partner agreement.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <button
                      type="button"
                      onClick={() => markAgreementAccepted(record)}
                      disabled={Boolean(record.agreementAcceptedAt)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        record.agreementAcceptedAt
                          ? 'border border-green-200 text-green-700 bg-green-50 cursor-not-allowed'
                          : 'bg-brown-dark text-white hover:bg-brown'
                      }`}
                    >
                      {record.agreementAcceptedAt ? 'Agreement confirmed' : 'Mark agreement accepted'}
                    </button>
                    <button
                      type="button"
                      onClick={() => editNotes(record)}
                      className="px-4 py-2 rounded-lg border border-brown-light text-brown-dark hover:border-brown-dark transition text-sm"
                    >
                      {record.notes ? 'Edit notes' : 'Add note'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(record)
                      }}
                      className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition text-sm"
                    >
                      Delete record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-display text-brown-dark">Delete onboarding record?</h3>
            <p className="text-sm text-brown-dark/80">
              Removing this record clears the local history so you can send a fresh onboarding email.
            </p>
            <div className="rounded-lg bg-baby-pink-light/60 border border-brown-light/50 p-4 text-sm text-brown-dark">
              <p className="font-semibold">{deleteTarget.businessName}</p>
              <p>
                {deleteTarget.contactName} • {deleteTarget.email}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deleting) setDeleteTarget(null)
                }}
                className="px-4 py-2 rounded-lg border border-brown-light text-brown-dark hover:border-brown-dark transition text-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteRecord}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition text-sm disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

