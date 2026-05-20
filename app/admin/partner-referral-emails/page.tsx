'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Toast from '@/components/Toast'
import type { PartnerOnboardingRecord } from '@/lib/partner-onboarding-utils'

type OverridesFormState = {
  onboardingSubject: string
  onboardingBodyHtml: string
  onboardingBodyText: string
  detailsSubject: string
  detailsBodyHtml: string
  detailsBodyText: string
  commissionType: 'percentage' | 'fixed'
  commissionPercent: string
  commissionAmount: string
  clientDiscountEnabled: boolean
  clientDiscountType: 'percentage' | 'fixed'
  clientDiscountPercent: string
  clientDiscountAmount: string
  codeValidDays: string
  redeemLimit: string
  payoutScheduleNote: string
  paymentMethod: string
}

type AdminMessage = { type: 'success' | 'error'; text: string } | null

const DEFAULT_ONBOARDING_SUBJECT = 'Welcome to LashDiary — {{partnerLabel}} Onboarding'
const DEFAULT_ONBOARDING_HTML = `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; background: #FDF9F4; color: #3E2A20;">
    <h2 style="margin-top: 0; margin-bottom: 16px; color: #7C4B31;">
      Welcome to LashDiary — Partner Onboard
    </h2>
    <p>Hi {{firstName}},</p>
    <p>{{intro}}</p>
    <h3 style="margin: 24px 0 12px; color: #7C4B31;">Commission &amp; timing</h3>
    <ul style="padding-left: 20px; line-height: 1.6;">
      <li>You’ll earn <strong>{{commissionLabel}}</strong> for every referral that books with your code.</li>
      <li>{{payoutScheduleNote}}</li>
      {{clientDiscountHtmlLine}}
      <li>Your promo code will be active for <strong>{{codeValidDays}} days</strong> and can be redeemed by up to <strong>{{redeemLimit}} new clients</strong>. We refresh or extend codes as your referrals grow.</li>
      <li>Commission statements and referral status updates are emailed automatically, so you always know what’s pending.</li>
    </ul>
    <p>When you’re ready to move forward, tap agree. We’ll countersign within 48 hours and send your welcome toolkit plus the exact steps to start sharing.</p>
    <p style="margin: 32px 0;">
      <a href="{{agreeUrl}}" target="_blank" style="display:inline-block;padding:12px 24px;background-color:#7C4B31;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600;">Agree &amp; Continue</a>
    </p>
    <p>If the button doesn’t load, copy and paste this link into your browser:<br/><a href="{{agreeUrl}}" style="color:#7C4B31;">{{agreeUrl}}</a></p>
    <p>Reply to this email anytime if you’d like to tailor the offer or request additional materials.</p>
    <p>Can’t wait to launch together!</p>
    <p>Warmly,<br/>Catherine &amp; the LashDiary Team<br/><a href="mailto:{{studioEmail}}" style="color:#7C4B31;">{{studioEmail}}</a></p>
  </div>
`.replace(/\n\s+/g, '\n')

const DEFAULT_ONBOARDING_TEXT = [
  'Hi {{firstName}},',
  '',
  '{{intro}}',
  '',
  'Commission & timing',
  '• Earn {{commissionLabel}} for every completed referral.',
  '• {{payoutScheduleNote}}',
  '{{clientDiscountTextLine}}',
  '• Codes stay active for {{codeValidDays}} days with {{redeemLimit}} redemptions.',
  '',
  'When you’re ready, tap agree and we’ll send your full toolkit:',
  '{{agreeUrl}}',
  '',
  'Need anything? Reply to this email.',
  '',
  'Warmly,',
  'Catherine & the LashDiary Team',
  '{{studioEmail}}',
].join('\n')

const DEFAULT_DETAILS_SUBJECT = 'Welcome to the Partner Referral Program 🤎'
const DEFAULT_DETAILS_HTML = `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; background: #FDF9F4; color: #3E2A20;">
    <h2 style="margin-top: 0; color: #7C4B31;">Welcome to the Partner Referral Program 🤎</h2>
    <p>Hi {{firstName}},</p>
    <p>We’re thrilled to have you as part of our referral family! Here’s how your exclusive code works:</p>
    <h3 style="color:#7C4B31;">Commission</h3>
    <p>You’ll earn <strong>{{commissionLabel}}</strong> for every client who books using your promo code, once the client has completed their appointment.</p>
    <h3 style="color:#7C4B31;">Payment</h3>
    <p>{{payoutScheduleNote}}</p>
    <p>Approved commissions are paid via {{paymentMethod}}.</p>
    <h3 style="color:#7C4B31;">Your Promo Code</h3>
    <div style="background:#FFFFFF;border-radius:12px;padding:16px 24px;border:1px dashed #7C4B31;display:inline-block;font-size:26px;font-weight:700;letter-spacing:4px;color:#7C4B31;">
      {{promoCode}}
    </div>
    <p style="margin-top:16px;">Each code comes with <strong>{{redeemLimit}} available slots</strong> and will remain active for <strong>{{codeValidDays}} days</strong> from the issue date (until {{validUntil}}). We’ll refresh or extend it based on your performance and engagement.</p>
    {{clientDiscountHtml}}
    <h3 style="color:#7C4B31;">Important Details</h3>
    <ul style="line-height:1.6;">
      {{clientDiscountListItem}}
      <li>Commissions apply only after the referred client completes their appointment.</li>
      <li>If a client cancels or reschedules outside our policy window, no commission applies.</li>
      <li>You’ll receive an email when a client uses your code and another email when an eligible commission is marked paid.</li>
      <li>Your referral dashboard keeps a live view of pending and completed referrals.</li>
    </ul>
    <p>We reserve the right to pause or terminate a promo code if there’s misuse, false advertising, unprofessional conduct, sharing client information without consent, or any fraudulent activity.</p>
    <p>We’re building this program on trust, transparency, and mutual respect — and we’re thrilled to have you on board.</p>
    <p>Thank you for helping us grow our salon community — your referrals mean a lot to us and we can’t wait to celebrate your success.</p>
    <p style="margin-top:24px;">Warmly,<br/>Catherine &amp; the LashDiary Team</p>
    <hr style="margin:32px 0;border:none;border-top:1px solid #EADFD6;" />
    <p style="font-size:14px;color:#7C4B31;">Need support? Reply to this email or reach us at <a href="mailto:{{studioEmail}}" style="color:#7C4B31;">{{studioEmail}}</a>.</p>
  </div>
`.replace(/\n\s+/g, '\n')

const DEFAULT_DETAILS_TEXT = [
  'Welcome to the Partner Referral Program 🤎',
  '',
  'Hi {{firstName}},',
  '',
  'We’re thrilled to have you as part of our referral family! Here’s how your exclusive code works:',
  '',
  'Commission:',
  '• You’ll earn {{commissionLabel}} for every client who books using your promo code, once the client has completed their appointment.',
  '',
  'Payment:',
  '• {{payoutScheduleNote}}',
  '• Approved commissions are paid via {{paymentMethod}}.',
  '',
  'Your promo code:',
  '• {{promoCode}}',
  '• Active for {{codeValidDays}} days (until {{validUntil}}) with {{redeemLimit}} available slots.',
  '{{clientDiscountText}}',
  '',
  'Important details:',
  '• Commissions apply only after the referred client completes their appointment.',
  '• If a client cancels outside our policy window, no commission applies.',
  '• You’ll receive an email when a client uses your code and another email when an eligible commission is marked paid.',
  '• Check your referral dashboard anytime for pending and completed referrals.',
  '',
  'Program guidelines:',
  '• We may pause or terminate a code for misuse, self-use, misrepresentation, unprofessional behavior, sharing client information without consent, or any fraudulent/inappropriate activity.',
  '• We’ll email you if a code is paused. Repeated violations can lead to permanent removal.',
  '• We rely on trust, transparency, and mutual respect—and we’re excited to grow together.',
  '',
  'Thank you for growing our community — we can’t wait to celebrate your success.',
  '',
  'Warmly,',
  'Catherine & the LashDiary Team',
  '{{studioEmail}}',
].join('\n')

const DEFAULT_REFERRAL_NUMBERS = {
  commissionPercent: '3.5',
  commissionAmount: '',
  commissionType: 'percentage' as const,
  clientDiscountEnabled: true,
  clientDiscountType: 'percentage' as const,
  clientDiscountPercent: '8',
  clientDiscountAmount: '',
  codeValidDays: '35',
  redeemLimit: '10',
  payoutScheduleNote:
    'Commissions become eligible only after the referred client completes their appointment, then they are paid at the end of the month after the code validity period closes.',
  paymentMethod: 'M-Pesa or bank transfer',
}

const DEFAULT_FORM: OverridesFormState = {
  onboardingSubject: DEFAULT_ONBOARDING_SUBJECT,
  onboardingBodyHtml: DEFAULT_ONBOARDING_HTML,
  onboardingBodyText: DEFAULT_ONBOARDING_TEXT,
  detailsSubject: DEFAULT_DETAILS_SUBJECT,
  detailsBodyHtml: DEFAULT_DETAILS_HTML,
  detailsBodyText: DEFAULT_DETAILS_TEXT,
  commissionType: DEFAULT_REFERRAL_NUMBERS.commissionType,
  commissionPercent: DEFAULT_REFERRAL_NUMBERS.commissionPercent,
  commissionAmount: DEFAULT_REFERRAL_NUMBERS.commissionAmount,
  clientDiscountEnabled: DEFAULT_REFERRAL_NUMBERS.clientDiscountEnabled,
  clientDiscountType: DEFAULT_REFERRAL_NUMBERS.clientDiscountType,
  clientDiscountPercent: DEFAULT_REFERRAL_NUMBERS.clientDiscountPercent,
  clientDiscountAmount: DEFAULT_REFERRAL_NUMBERS.clientDiscountAmount,
  codeValidDays: DEFAULT_REFERRAL_NUMBERS.codeValidDays,
  redeemLimit: DEFAULT_REFERRAL_NUMBERS.redeemLimit,
  payoutScheduleNote: DEFAULT_REFERRAL_NUMBERS.payoutScheduleNote,
  paymentMethod: DEFAULT_REFERRAL_NUMBERS.paymentMethod,
}

export default function PartnerReferralEmails() {
  const searchParams = useSearchParams()
  const [records, setRecords] = useState<PartnerOnboardingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<OverridesFormState>({ ...DEFAULT_FORM })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<AdminMessage>(null)

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  )
  const partnerIdQuery = searchParams.get('partnerId')

  useEffect(() => {
    let isActive = true
    fetch('/api/admin/partner-onboarding', {
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load partner records')
        }
        const data = await response.json()
        if (!isActive) return
        setRecords(Array.isArray(data?.records) ? data.records : [])
      })
      .catch((error) => {
        if (!isActive) return
        console.error('Error loading partners:', error)
        setMessage({ type: 'error', text: 'Failed to load partner records.' })
      })
      .finally(() => {
        if (isActive) setLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!selectedRecord) {
      setForm({ ...DEFAULT_FORM })
      return
    }

    const emailOverrides = selectedRecord.emailOverrides ?? {}
    const referralOverrides = selectedRecord.referralOverrides ?? {}

    setForm({
      onboardingSubject: emailOverrides.onboardingSubject ?? DEFAULT_ONBOARDING_SUBJECT,
      onboardingBodyHtml: emailOverrides.onboardingBodyHtml ?? DEFAULT_ONBOARDING_HTML,
      onboardingBodyText: emailOverrides.onboardingBodyText ?? DEFAULT_ONBOARDING_TEXT,
      detailsSubject: emailOverrides.detailsSubject ?? DEFAULT_DETAILS_SUBJECT,
      detailsBodyHtml: emailOverrides.detailsBodyHtml ?? DEFAULT_DETAILS_HTML,
      detailsBodyText: emailOverrides.detailsBodyText ?? DEFAULT_DETAILS_TEXT,
      commissionType: referralOverrides.commissionType ?? DEFAULT_REFERRAL_NUMBERS.commissionType,
      commissionPercent:
        referralOverrides.commissionPercent !== undefined
          ? String(referralOverrides.commissionPercent)
          : DEFAULT_REFERRAL_NUMBERS.commissionPercent,
      commissionAmount:
        referralOverrides.commissionAmount !== undefined
          ? String(referralOverrides.commissionAmount)
          : DEFAULT_REFERRAL_NUMBERS.commissionAmount,
      clientDiscountEnabled:
        referralOverrides.clientDiscountEnabled !== undefined
          ? referralOverrides.clientDiscountEnabled
          : DEFAULT_REFERRAL_NUMBERS.clientDiscountEnabled,
      clientDiscountType: referralOverrides.clientDiscountType ?? DEFAULT_REFERRAL_NUMBERS.clientDiscountType,
      clientDiscountPercent:
        referralOverrides.clientDiscountPercent !== undefined
          ? String(referralOverrides.clientDiscountPercent)
          : DEFAULT_REFERRAL_NUMBERS.clientDiscountPercent,
      clientDiscountAmount:
        referralOverrides.clientDiscountAmount !== undefined
          ? String(referralOverrides.clientDiscountAmount)
          : DEFAULT_REFERRAL_NUMBERS.clientDiscountAmount,
      codeValidDays:
        referralOverrides.codeValidDays !== undefined
          ? String(referralOverrides.codeValidDays)
          : DEFAULT_REFERRAL_NUMBERS.codeValidDays,
      redeemLimit:
        referralOverrides.redeemLimit !== undefined
          ? String(referralOverrides.redeemLimit)
          : DEFAULT_REFERRAL_NUMBERS.redeemLimit,
      payoutScheduleNote: referralOverrides.payoutScheduleNote ?? DEFAULT_REFERRAL_NUMBERS.payoutScheduleNote,
      paymentMethod: referralOverrides.paymentMethod ?? DEFAULT_REFERRAL_NUMBERS.paymentMethod,
    })
  }, [selectedRecord])

  useEffect(() => {
    if (!partnerIdQuery || selectedId) return
    const exists = records.some((record) => record.id === partnerIdQuery)
    if (exists) {
      setSelectedId(partnerIdQuery)
    }
  }, [records, partnerIdQuery, selectedId])

  const handleChange = (field: keyof OverridesFormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    if (!selectedRecord || saving) return
    setSaving(true)
    setMessage(null)

    const emailOverrides = {
      onboardingSubject:
        form.onboardingSubject && form.onboardingSubject !== DEFAULT_ONBOARDING_SUBJECT
          ? form.onboardingSubject
          : undefined,
      onboardingBodyHtml:
        form.onboardingBodyHtml && form.onboardingBodyHtml !== DEFAULT_ONBOARDING_HTML
          ? form.onboardingBodyHtml
          : undefined,
      onboardingBodyText:
        form.onboardingBodyText && form.onboardingBodyText !== DEFAULT_ONBOARDING_TEXT
          ? form.onboardingBodyText
          : undefined,
      detailsSubject:
        form.detailsSubject && form.detailsSubject !== DEFAULT_DETAILS_SUBJECT ? form.detailsSubject : undefined,
      detailsBodyHtml:
        form.detailsBodyHtml && form.detailsBodyHtml !== DEFAULT_DETAILS_HTML
          ? form.detailsBodyHtml
          : undefined,
      detailsBodyText:
        form.detailsBodyText && form.detailsBodyText !== DEFAULT_DETAILS_TEXT
          ? form.detailsBodyText
          : undefined,
    }

    const referralOverrides = {
      commissionType:
        form.commissionType !== DEFAULT_REFERRAL_NUMBERS.commissionType ? form.commissionType : undefined,
      commissionPercent:
        form.commissionPercent && form.commissionPercent !== DEFAULT_REFERRAL_NUMBERS.commissionPercent
          ? Number(form.commissionPercent)
          : undefined,
      commissionAmount:
        form.commissionAmount && form.commissionAmount !== DEFAULT_REFERRAL_NUMBERS.commissionAmount
          ? Number(form.commissionAmount)
          : undefined,
      clientDiscountEnabled:
        form.clientDiscountEnabled !== DEFAULT_REFERRAL_NUMBERS.clientDiscountEnabled
          ? form.clientDiscountEnabled
          : undefined,
      clientDiscountType:
        form.clientDiscountType !== DEFAULT_REFERRAL_NUMBERS.clientDiscountType
          ? form.clientDiscountType
          : undefined,
      clientDiscountPercent:
        form.clientDiscountPercent && form.clientDiscountPercent !== DEFAULT_REFERRAL_NUMBERS.clientDiscountPercent
          ? Number(form.clientDiscountPercent)
          : undefined,
      clientDiscountAmount:
        form.clientDiscountAmount && form.clientDiscountAmount !== DEFAULT_REFERRAL_NUMBERS.clientDiscountAmount
          ? Number(form.clientDiscountAmount)
          : undefined,
      codeValidDays:
        form.codeValidDays && form.codeValidDays !== DEFAULT_REFERRAL_NUMBERS.codeValidDays
          ? Number(form.codeValidDays)
          : undefined,
      redeemLimit:
        form.redeemLimit && form.redeemLimit !== DEFAULT_REFERRAL_NUMBERS.redeemLimit
          ? Number(form.redeemLimit)
          : undefined,
      payoutScheduleNote:
        form.payoutScheduleNote && form.payoutScheduleNote !== DEFAULT_REFERRAL_NUMBERS.payoutScheduleNote
          ? form.payoutScheduleNote
          : undefined,
      paymentMethod:
        form.paymentMethod && form.paymentMethod !== DEFAULT_REFERRAL_NUMBERS.paymentMethod
          ? form.paymentMethod
          : undefined,
    }

    const payload: Record<string, unknown> = {
      id: selectedRecord.id,
      action: 'update-overrides',
    }

    if (Object.values(emailOverrides).some((value) => value !== undefined)) {
      payload.emailOverrides = emailOverrides
    }
    if (Object.values(referralOverrides).some((value) => value !== undefined)) {
      payload.referralOverrides = referralOverrides
    }

    if (!payload.emailOverrides && !payload.referralOverrides) {
      setMessage({ type: 'error', text: 'Please add at least one override before saving.' })
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/admin/partner-onboarding', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save overrides.')
      }
      if (data?.record) {
        setRecords((prev) =>
          prev.map((record) => (record.id === data.record.id ? data.record : record)),
        )
        setMessage({ type: 'success', text: 'Overrides saved successfully.' })
      } else {
        setMessage({ type: 'success', text: 'Overrides saved.' })
      }
    } catch (error: any) {
      console.error('Failed to save overrides:', error)
      setMessage({ type: 'error', text: error?.message || 'Failed to save overrides.' })
    } finally {
      setSaving(false)
    }
  }

  const handleResetOverrides = async () => {
    if (!selectedRecord || saving) return
    if (!window.confirm('Reset overrides for this partner? This cannot be undone.')) {
      return
    }
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/partner-onboarding', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRecord.id,
          action: 'update-overrides',
          reset: true,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to reset overrides.')
      }
      if (data?.record) {
        setRecords((prev) =>
          prev.map((record) => (record.id === data.record.id ? data.record : record)),
        )
      }
      setMessage({ type: 'success', text: 'Overrides cleared.' })
      setForm({ ...DEFAULT_FORM })
    } catch (error: any) {
      console.error('Failed to reset overrides:', error)
      setMessage({ type: 'error', text: error?.message || 'Failed to reset overrides.' })
    } finally {
      setSaving(false)
    }
  }

  const tokensList = [
    '{{firstName}}',
    '{{businessName}}',
    '{{partnerLabel}}',
    '{{intro}}',
    '{{agreeUrl}}',
    '{{studioEmail}}',
    '{{promoCode}}',
    '{{validUntil}}',
    '{{commissionPercent}}',
    '{{commissionAmount}}',
    '{{commissionLabel}}',
    '{{clientDiscountPercent}}',
    '{{clientDiscountAmount}}',
    '{{clientDiscountLabel}}',
    '{{clientDiscountHtmlLine}}',
    '{{clientDiscountTextLine}}',
    '{{clientDiscountHtml}}',
    '{{clientDiscountListItem}}',
    '{{clientDiscountText}}',
    '{{codeValidDays}}',
    '{{redeemLimit}}',
    '{{paymentMethod}}',
  ]

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display text-brown-dark mb-2">Partner Referral Emails</h1>
            <p className="text-brown text-sm md:text-base max-w-2xl">
              Tailor onboarding and follow-up emails for specific partners. Any overrides you set here will
              be used the next time you send the welcome or referral toolkit emails.
            </p>
          </div>
          <Link
            href="/admin/partner-onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-brown-light text-brown-dark bg-white hover:bg-brown-light/20 transition-colors text-sm font-semibold"
          >
            ← Back to Partner Onboarding
          </Link>
        </div>

        {message && (
          <div className="mb-4">
            <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-brown-light rounded-xl p-8 text-center text-brown">
            Loading partner records...
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white border border-brown-light rounded-xl p-8 text-center text-brown">
            No partner onboarding records yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <div className="bg-white border border-brown-light rounded-xl p-5 shadow-soft">
              <h2 className="text-xl font-semibold text-brown-dark mb-4">Partners</h2>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {records.map((record) => {
                  const isSelected = record.id === selectedId
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedId(record.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-brown-dark font-semibold'
                          : 'border-brown-light hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/5'
                      }`}
                    >
                      <div className="text-sm text-brown-dark">
                        {record.businessName}{' '}
                        <span className="text-xs uppercase tracking-wide text-brown-dark/60">
                          ({record.partnerType})
                        </span>
                      </div>
                      <div className="text-xs text-brown/80">{record.email}</div>
                      {record.emailOverrides && (
                        <div className="mt-1 text-[11px] text-green-700">Custom email overrides</div>
                      )}
                      {record.referralOverrides && (
                        <div className="text-[11px] text-blue-700">Custom referral settings</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white border border-brown-light rounded-xl p-6 shadow-soft min-h-[60vh]">
              {selectedRecord ? (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-display text-brown-dark">
                        {selectedRecord.businessName}
                      </h2>
                      <p className="text-sm text-brown">
                        {selectedRecord.contactName} • {selectedRecord.email}
                      </p>
                      <p className="text-xs text-brown/70">
                        Partner type: {selectedRecord.partnerType.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold text-sm hover:brightness-110 disabled:opacity-60"
                      >
                        {saving ? 'Saving...' : 'Save overrides'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetOverrides}
                        disabled={saving}
                        className="px-4 py-2 rounded-full border-2 border-brown-light text-brown-dark text-sm hover:bg-brown-light/10 disabled:opacity-60"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>

                  <div className="bg-baby-pink-light/40 border border-brown-light rounded-lg p-4">
                    <p className="text-sm text-brown-dark font-semibold mb-2">Available tokens</p>
                    <p className="text-xs text-brown">
                      You can use these placeholders inside email subjects or bodies—they’ll be replaced
                      automatically before the message is sent:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tokensList.map((token) => (
                        <code
                          key={token}
                          className="px-2 py-1 rounded bg-white border border-brown-light text-xs text-brown"
                        >
                          {token}
                        </code>
                      ))}
                    </div>
                  </div>

                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-brown-dark">Onboarding Email Overrides</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="onboardingSubject">
                          Subject
                        </label>
                        <input
                          id="onboardingSubject"
                          type="text"
                          value={form.onboardingSubject}
                          onChange={(e) => handleChange('onboardingSubject', e.target.value)}
                          placeholder="Custom subject (optional)"
                          className="w-full px-4 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="onboardingBodyText">
                          Plain-text body
                        </label>
                        <textarea
                          id="onboardingBodyText"
                          rows={6}
                          value={form.onboardingBodyText}
                          onChange={(e) => handleChange('onboardingBodyText', e.target.value)}
                          placeholder="Optional plain-text fallback."
                          className="w-full px-4 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-brown-dark" htmlFor="onboardingBodyHtml">
                        HTML body
                      </label>
                      <textarea
                        id="onboardingBodyHtml"
                        rows={10}
                        value={form.onboardingBodyHtml}
                        onChange={(e) => handleChange('onboardingBodyHtml', e.target.value)}
                        placeholder="Paste custom HTML here (optional). Leave blank to use the default template."
                        className="w-full px-4 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm font-mono"
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-brown-dark">Referral Toolkit Email Overrides</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="detailsSubject">
                          Subject
                        </label>
                        <input
                          id="detailsSubject"
                          type="text"
                          value={form.detailsSubject}
                          onChange={(e) => handleChange('detailsSubject', e.target.value)}
                          placeholder="Custom subject (optional)"
                          className="w-full px-4 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="detailsBodyText">
                          Plain-text body
                        </label>
                        <textarea
                          id="detailsBodyText"
                          rows={6}
                          value={form.detailsBodyText}
                          onChange={(e) => handleChange('detailsBodyText', e.target.value)}
                          placeholder="Optional plain-text fallback."
                          className="w-full px-4 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-brown-dark" htmlFor="detailsBodyHtml">
                        HTML body
                      </label>
                      <textarea
                        id="detailsBodyHtml"
                        rows={10}
                        value={form.detailsBodyHtml}
                        onChange={(e) => handleChange('detailsBodyHtml', e.target.value)}
                        placeholder="Paste custom HTML here (optional). Leave blank to use the default template."
                        className="w-full px-4 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm font-mono"
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xl font-semibold text-brown-dark">Referral Settings Overrides</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark">Commission paid to partner</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleChange('commissionType', 'percentage')}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${
                              form.commissionType === 'percentage'
                                ? 'bg-brown-dark text-white border-brown-dark'
                                : 'bg-white text-brown-dark border-brown-light'
                            }`}
                          >
                            Percentage
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChange('commissionType', 'fixed')}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${
                              form.commissionType === 'fixed'
                                ? 'bg-brown-dark text-white border-brown-dark'
                                : 'bg-white text-brown-dark border-brown-light'
                            }`}
                          >
                            Fixed KES
                          </button>
                        </div>
                        <input
                          id="commissionPercent"
                          type="number"
                          step={form.commissionType === 'fixed' ? '1' : '0.01'}
                          value={form.commissionType === 'fixed' ? form.commissionAmount : form.commissionPercent}
                          onChange={(e) =>
                            handleChange(
                              form.commissionType === 'fixed' ? 'commissionAmount' : 'commissionPercent',
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-semibold text-brown-dark">Client discount</label>
                          <label className="inline-flex items-center gap-2 text-xs text-brown-dark">
                            <input
                              type="checkbox"
                              checked={form.clientDiscountEnabled}
                              onChange={(e) => handleChange('clientDiscountEnabled', e.target.checked)}
                              className="h-4 w-4 accent-brown-dark"
                            />
                            Enable
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleChange('clientDiscountType', 'percentage')}
                            disabled={!form.clientDiscountEnabled}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50 ${
                              form.clientDiscountType === 'percentage'
                                ? 'bg-brown-dark text-white border-brown-dark'
                                : 'bg-white text-brown-dark border-brown-light'
                            }`}
                          >
                            Percentage
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChange('clientDiscountType', 'fixed')}
                            disabled={!form.clientDiscountEnabled}
                            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50 ${
                              form.clientDiscountType === 'fixed'
                                ? 'bg-brown-dark text-white border-brown-dark'
                                : 'bg-white text-brown-dark border-brown-light'
                            }`}
                          >
                            Fixed KES
                          </button>
                        </div>
                        <input
                          id="clientDiscountPercent"
                          type="number"
                          step={form.clientDiscountType === 'fixed' ? '1' : '0.1'}
                          disabled={!form.clientDiscountEnabled}
                          value={form.clientDiscountType === 'fixed' ? form.clientDiscountAmount : form.clientDiscountPercent}
                          onChange={(e) =>
                            handleChange(
                              form.clientDiscountType === 'fixed' ? 'clientDiscountAmount' : 'clientDiscountPercent',
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm disabled:opacity-60"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="codeValidDays">
                          Code validity (days)
                        </label>
                        <input
                          id="codeValidDays"
                          type="number"
                          value={form.codeValidDays}
                          onChange={(e) => handleChange('codeValidDays', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="redeemLimit">
                          Redeem limit
                        </label>
                        <input
                          id="redeemLimit"
                          type="number"
                          value={form.redeemLimit}
                          onChange={(e) => handleChange('redeemLimit', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="paymentMethod">
                          Payment method / notes
                        </label>
                        <input
                          id="paymentMethod"
                          type="text"
                          value={form.paymentMethod}
                          onChange={(e) => handleChange('paymentMethod', e.target.value)}
                          placeholder="e.g., M-Pesa or bank transfer"
                          className="w-full px-3 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-brown-dark" htmlFor="payoutScheduleNote">
                          Payout schedule note
                        </label>
                        <textarea
                          id="payoutScheduleNote"
                          rows={3}
                          value={form.payoutScheduleNote}
                          onChange={(e) => handleChange('payoutScheduleNote', e.target.value)}
                          placeholder="Explain when commissions are paid."
                          className="w-full px-3 py-2 rounded-lg border-2 border-brown-light bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm"
                        />
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-brown">
                  Select a partner to edit their overrides.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

