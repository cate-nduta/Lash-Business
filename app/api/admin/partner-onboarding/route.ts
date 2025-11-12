import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import {
  addPartnerOnboardingRecord,
  loadPartnerOnboardingRecords,
  PartnerType,
  PartnerOnboardingRecord,
  updatePartnerOnboardingRecord,
  deletePartnerOnboardingRecord,
  resolvePartnerReferralConfig,
  PartnerEmailOverrides,
  PartnerReferralOverrides,
} from '@/lib/partner-onboarding-utils'
import { loadPolicies } from '@/lib/policies-utils'
import { sendPartnerOnboardingEmail } from '@/lib/email/send-partner-onboarding'

export const revalidate = 0
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const partnerIntroCopy: Record<PartnerType, string> = {
  salon:
    'Welcome to the LashDiary partner circle! Share your LashDiary code with clients, friends, and family—we’ll handle the bookings, service, and payouts.',
  beautician:
    'We’re excited to collaborate with you. Keep doing what you do best and simply share your LashDiary code whenever someone asks for a lash studio recommendation.',
  influencer:
    'Thrilled to have you on the LashDiary roster. Drop your LashDiary code wherever it fits naturally and we’ll take care of every appointment from there.',
}

const studioContactEmail = process.env.CALENDAR_EMAIL || 'hello@lashdiary.co.ke'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

type TemplateContext = Record<string, string | number>

function renderWithTokens(template: string, context: TemplateContext) {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (match, token) => {
    const value = context[token]
    return value === undefined || value === null ? '' : String(value)
  })
}

function buildOnboardingEmail({
  record,
  intro,
  agreeUrl,
  referralConfig,
  studioEmail,
}: {
  record: PartnerOnboardingRecord
  intro: string
  agreeUrl: string
  referralConfig: ReturnType<typeof resolvePartnerReferralConfig>
  studioEmail: string
}): { subject: string; html: string; text: string } {
  const firstName = record.contactName.split(' ')[0]
  const partnerLabel = mapPartnerLabel(record.partnerType)
  const overrides = record.emailOverrides ?? {}

  const context: TemplateContext = {
    firstName,
    businessName: record.businessName,
    partnerLabel,
    intro,
    agreeUrl,
    studioEmail,
    commissionPercent: referralConfig.commissionPercent,
    clientDiscountPercent: referralConfig.clientDiscountPercent,
    codeValidDays: referralConfig.codeValidDays,
    redeemLimit: referralConfig.redeemLimit,
    payoutScheduleNote: referralConfig.payoutScheduleNote,
  }

  const defaultSubject = `Welcome to LashDiary — ${partnerLabel} Onboarding`

  const defaultHtml = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; background: #FDF9F4; color: #3E2A20;">
      <h2 style="margin-top: 0; margin-bottom: 16px; color: #7C4B31;">
        Welcome to LashDiary — Partner Onboard
      </h2>
      <p>Hi {{firstName}},</p>
      <p>{{intro}}</p>
      <h3 style="margin: 24px 0 12px; color: #7C4B31;">Commission &amp; timing</h3>
      <ul style="padding-left: 20px; line-height: 1.6;">
      <li>You’ll earn <strong>{{commissionPercent}}% of the completed service price</strong> for every referral that books with your code.</li>
        <li>{{payoutScheduleNote}}</li>
        <li>Every client who redeems your code receives an <strong>{{clientDiscountPercent}}% discount</strong> on the service they choose.</li>
        <li>Your promo code will be active for <strong>{{codeValidDays}} days</strong> and can be redeemed by up to <strong>{{redeemLimit}} new clients</strong>. We refresh or extend codes as your referrals grow.</li>
        <li>Commission statements and referral status updates are emailed automatically, so you always know what’s pending.</li>
      </ul>
      <p>Tap agree when you’re ready. We’ll countersign within 48 hours and send your welcome toolkit (referral cards, copy, and promo assets) plus the exact steps to start sharing.</p>
      <p style="margin: 32px 0;">
        <a href="{{agreeUrl}}" target="_blank" style="display:inline-block;padding:12px 24px;background-color:#7C4B31;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600;">Agree &amp; Continue</a>
      </p>
      <p>If the button doesn’t load, copy and paste this link into your browser:<br/><a href="{{agreeUrl}}" style="color:#7C4B31;">{{agreeUrl}}</a></p>
      <p>Reply to this email anytime if you’d like to tailor the offer or request additional materials.</p>
      <p>Can’t wait to launch together!</p>
      <p>Warmly,<br/>Catherine &amp; the LashDiary Team<br/><a href="mailto:{{studioEmail}}" style="color:#7C4B31;">{{studioEmail}}</a></p>
    </div>
  `.replace(/\n\s+/g, '\n')

  const defaultText = [
    `Hi {{firstName}},`,
    '',
    '{{intro}}',
    '',
    'Commission & timing',
    `• Earn {{commissionPercent}}% of every completed referral.`,
    `• {{payoutScheduleNote}}`,
    `• Each client gets {{clientDiscountPercent}}% off when they use your code.`,
    `• Codes stay active for {{codeValidDays}} days with {{redeemLimit}} redemptions.`,
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

  const subjectTemplate = overrides.onboardingSubject || defaultSubject
  const htmlTemplate = overrides.onboardingBodyHtml || defaultHtml
  const textTemplate = overrides.onboardingBodyText || defaultText

  return {
    subject: renderWithTokens(subjectTemplate, context),
    html: renderWithTokens(htmlTemplate, context),
    text: renderWithTokens(textTemplate, context),
  }
}

function sanitiseEmailOverrides(input: any): PartnerEmailOverrides | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }
  const result: PartnerEmailOverrides = {}
  if (typeof input.onboardingSubject === 'string') result.onboardingSubject = input.onboardingSubject
  if (typeof input.onboardingBodyHtml === 'string') result.onboardingBodyHtml = input.onboardingBodyHtml
  if (typeof input.onboardingBodyText === 'string') result.onboardingBodyText = input.onboardingBodyText
  if (typeof input.detailsSubject === 'string') result.detailsSubject = input.detailsSubject
  if (typeof input.detailsBodyHtml === 'string') result.detailsBodyHtml = input.detailsBodyHtml
  if (typeof input.detailsBodyText === 'string') result.detailsBodyText = input.detailsBodyText
  return Object.keys(result).length > 0 ? result : undefined
}

function sanitiseReferralOverrides(input: any): PartnerReferralOverrides | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }
  const result: PartnerReferralOverrides = {}
  if (input.commissionPercent !== undefined && !Number.isNaN(Number(input.commissionPercent))) {
    result.commissionPercent = Number(input.commissionPercent)
  }
  if (input.clientDiscountPercent !== undefined && !Number.isNaN(Number(input.clientDiscountPercent))) {
    result.clientDiscountPercent = Number(input.clientDiscountPercent)
  }
  if (input.codeValidDays !== undefined && !Number.isNaN(Number(input.codeValidDays))) {
    result.codeValidDays = Number(input.codeValidDays)
  }
  if (input.redeemLimit !== undefined && !Number.isNaN(Number(input.redeemLimit))) {
    result.redeemLimit = Number(input.redeemLimit)
  }
  if (typeof input.payoutScheduleNote === 'string') {
    result.payoutScheduleNote = input.payoutScheduleNote
  }
  if (typeof input.paymentMethod === 'string') {
    result.paymentMethod = input.paymentMethod
  }
  return Object.keys(result).length > 0 ? result : undefined
}
function mapPartnerLabel(partnerType: PartnerType) {
  switch (partnerType) {
    case 'salon':
      return 'Salon Partner'
    case 'beautician':
      return 'Beautician Partner'
    case 'influencer':
      return 'Influencer Partner'
    default:
      return 'Partner'
  }
}

function validateBody(payload: any) {
  const partnerType: PartnerType | undefined = ['salon', 'beautician', 'influencer'].includes(payload?.partnerType)
    ? payload.partnerType
    : undefined
  const businessName = typeof payload?.businessName === 'string' ? payload.businessName.trim() : ''
  const contactName = typeof payload?.contactName === 'string' ? payload.contactName.trim() : ''
  const email =
    typeof payload?.email === 'string' && payload.email.includes('@') ? payload.email.trim().toLowerCase() : ''
  const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : ''
  const notes = typeof payload?.notes === 'string' ? payload.notes.trim() : ''

  if (!partnerType) {
    throw new Error('Partner type is required.')
  }
  if (!businessName) {
    throw new Error('Business or brand name is required.')
  }
  if (!contactName) {
    throw new Error('Primary contact name is required.')
  }
  if (!email) {
    throw new Error('Contact email is required.')
  }

  return {
    partnerType,
    businessName,
    contactName,
    email,
    phone,
    notes,
  }
}

export async function GET() {
  try {
    await requireAdminAuth()
    const records = await loadPartnerOnboardingRecords()
    return NextResponse.json({ records }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading partner onboarding records:', error)
    return NextResponse.json({ error: 'Failed to load onboardings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const admin = await getAdminUser()

    const payload = await request.json()
    const data = validateBody(payload)

    const baseRecord = await addPartnerOnboardingRecord({
      partnerType: data.partnerType,
      businessName: data.businessName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
    })

    const policies = await loadPolicies()
    const partnerLabel = mapPartnerLabel(data.partnerType)
    const agreeUrl = `${BASE_URL.replace(/\/$/, '')}/api/partner-onboarding/accept?token=${encodeURIComponent(
      baseRecord.agreementToken,
    )}`

    const intro = partnerIntroCopy[data.partnerType]
    const referralConfig = resolvePartnerReferralConfig(baseRecord, policies)
    const { subject, html: emailHtml, text: emailText } = buildOnboardingEmail({
      record: baseRecord,
      intro,
      agreeUrl,
      referralConfig,
      studioEmail: studioContactEmail,
    })

    const emailResult = await sendPartnerOnboardingEmail({
      to: data.email,
      subject,
      html: emailHtml,
      text: emailText,
    })

    const updatedRecord =
      (await updatePartnerOnboardingRecord(baseRecord.id, {
        emailStatus: emailResult.success ? 'sent' : 'error',
        emailSentAt: emailResult.success ? new Date().toISOString() : baseRecord.emailSentAt,
        emailError: emailResult.success ? null : emailResult.error || 'Unable to send email',
        emailProvider: emailResult.provider,
      })) || baseRecord

    await recordActivity({
      module: 'email',
      action: 'create',
      performedBy: admin?.username || 'owner',
      summary: `Sent onboarding kit to ${updatedRecord.businessName} (${mapPartnerLabel(updatedRecord.partnerType)})`,
      targetId: updatedRecord.id,
      targetType: 'partner_onboarding',
      details: {
        partnerId: updatedRecord.id,
        emailStatus: updatedRecord.emailStatus,
        emailProvider: updatedRecord.emailProvider ?? null,
      },
    })

    revalidatePath('/admin/partner-onboarding')

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error creating partner onboarding:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Failed to create onboarding',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminAuth()
    const admin = await getAdminUser()
    const payload = await request.json()

    const id = typeof payload?.id === 'string' ? payload.id : ''
    if (!id) {
      return NextResponse.json({ error: 'Onboarding ID is required.' }, { status: 400 })
    }

    const action = payload?.action

    let updatedRecord = null

    if (action === 'mark-received' || action === 'mark-accepted') {
      updatedRecord = await updatePartnerOnboardingRecord(id, {
        agreementAcceptedAt: new Date().toISOString(),
      })
    } else if (action === 'update-notes') {
      updatedRecord = await updatePartnerOnboardingRecord(id, {
        notes: typeof payload?.notes === 'string' ? payload.notes.trim() : undefined,
      })
    } else if (action === 'update-overrides') {
      const reset = payload?.reset === true
      const emailOverridesPayload =
        reset || payload?.emailOverrides === null
          ? null
          : sanitiseEmailOverrides(payload?.emailOverrides)
      const referralOverridesPayload =
        reset || payload?.referralOverrides === null
          ? null
          : sanitiseReferralOverrides(payload?.referralOverrides)

      const update: {
        emailOverrides?: PartnerEmailOverrides | null
        referralOverrides?: PartnerReferralOverrides | null
      } = {}

      if (emailOverridesPayload === null) {
        update.emailOverrides = null
      } else if (emailOverridesPayload !== undefined) {
        update.emailOverrides = emailOverridesPayload
      }

      if (referralOverridesPayload === null) {
        update.referralOverrides = null
      } else if (referralOverridesPayload !== undefined) {
        update.referralOverrides = referralOverridesPayload
      }

      updatedRecord = Object.keys(update).length > 0 ? await updatePartnerOnboardingRecord(id, update) : null
    } else {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
    }

    if (!updatedRecord) {
      return NextResponse.json({ error: 'Onboarding record not found.' }, { status: 404 })
    }

    if (action === 'update-overrides') {
      await recordActivity({
        module: 'email',
        action: 'update',
        performedBy: admin?.username || 'owner',
        summary: `Updated referral email overrides for ${updatedRecord.businessName}`,
        targetId: updatedRecord.id,
        targetType: 'partner_onboarding',
        details: {
          partnerId: updatedRecord.id,
          hasEmailOverrides: Boolean(updatedRecord.emailOverrides),
          hasReferralOverrides: Boolean(updatedRecord.referralOverrides),
        },
      })
    } else {
      await recordActivity({
        module: 'email',
        action: 'update',
        performedBy: admin?.username || 'owner',
        summary:
          action === 'mark-received' || action === 'mark-accepted'
            ? `Marked agreement accepted for ${updatedRecord.businessName}`
            : `Updated onboarding notes for ${updatedRecord.businessName}`,
        targetId: updatedRecord.id,
        targetType: 'partner_onboarding',
        details: {
          partnerId: updatedRecord.id,
        },
      })
    }

    revalidatePath('/admin/partner-onboarding')

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating partner onboarding record:', error)
    return NextResponse.json({ error: 'Failed to update onboarding record' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth()
    const admin = await getAdminUser()
    const payload = await request.json().catch(() => ({}))
    const id = typeof payload?.id === 'string' ? payload.id : ''

    if (!id) {
      return NextResponse.json({ error: 'Onboarding ID is required.' }, { status: 400 })
    }

    const removed = await deletePartnerOnboardingRecord(id)
    if (!removed) {
      return NextResponse.json({ error: 'Onboarding record not found.' }, { status: 404 })
    }

    await recordActivity({
      module: 'email',
      action: 'delete',
      performedBy: admin?.username || 'owner',
      summary: `Deleted onboarding record ${id}`,
      targetId: id,
      targetType: 'partner_onboarding',
      details: { id },
    })

    revalidatePath('/admin/partner-onboarding')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting partner onboarding record:', error)
    return NextResponse.json({ error: 'Failed to delete onboarding record' }, { status: 500 })
  }
}

