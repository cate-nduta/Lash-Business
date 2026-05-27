import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFilePreferRemote, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import { normalizePromoCatalog } from '@/lib/promo-utils'
import { sendPartnerOnboardingEmail } from '@/lib/email/send-partner-onboarding'

type PartnerReferral = {
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
  clientDiscountAmount?: number | null
  commissionType?: 'percentage' | 'fixed'
  commissionPercent: number
  commissionFixedAmount?: number | null
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

type PartnerReferralCatalog = {
  referrals: PartnerReferral[]
}

const REFERRALS_FILE = 'referrals-tracking.json'
const LEGACY_REFERRALS_FILE = 'salon-referrals.json'

const formatCurrency = (value: number) => `KSH ${Math.max(0, Math.round(value)).toLocaleString()}`

function buildCommissionPaidEmail(referral: PartnerReferral) {
  const partnerName = referral.salonName || 'Beauty Partner'
  const clientName = referral.clientName || 'your referred client'
  const service = referral.service || 'a LashDiary service'
  const amount = referral.commissionTotalAmount ?? (referral as any).commissionAmount ?? 0
  const paidAt = referral.paidAt
    ? new Date(referral.paidAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  const subject = 'Your LashDiary referral commission has been paid 🤎'
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; background: #FDF9F4; color: #3E2A20;">
      <h2 style="margin-top: 0; color: #7C4B31;">Commission paid</h2>
      <p>Hi ${partnerName},</p>
      <p>Your referral commission for <strong>${clientName}</strong> has been marked as paid.</p>
      <div style="margin: 18px 0; padding: 18px 20px; background: #FFFFFF; border: 1px solid #EADFD6; border-radius: 12px;">
        <p style="margin: 0 0 8px 0;"><strong>Promo code:</strong> ${referral.promoCode}</p>
        <p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${service}</p>
        <p style="margin: 0 0 8px 0;"><strong>Commission paid:</strong> ${formatCurrency(amount)}</p>
        <p style="margin: 0;"><strong>Paid date:</strong> ${paidAt}</p>
      </div>
      <p>Commissions are only confirmed after the client completes their appointment, so this referral is now closed as paid.</p>
      <p style="margin-top:24px;">Warmly,<br/>Catherine &amp; the LashDiary Team<br/><a href="mailto:hello@lashdiary.co.ke" style="color:#7C4B31;">hello@lashdiary.co.ke</a></p>
    </div>
  `.replace(/\n\s+/g, '\n')
  const text = [
    'Commission paid',
    '',
    `Hi ${partnerName},`,
    '',
    `Your referral commission for ${clientName} has been marked as paid.`,
    `Promo code: ${referral.promoCode}`,
    `Service: ${service}`,
    `Commission paid: ${formatCurrency(amount)}`,
    `Paid date: ${paidAt}`,
    '',
    'Commissions are only confirmed after the client completes their appointment, so this referral is now closed as paid.',
    '',
    'Warmly,',
    'Catherine & the LashDiary Team',
    'hello@lashdiary.co.ke',
  ].join('\n')

  return { subject, html, text }
}

async function loadReferralCatalog(): Promise<PartnerReferralCatalog> {
  const primary = await readDataFilePreferRemote<PartnerReferralCatalog>(REFERRALS_FILE, { referrals: [] })
  if (Array.isArray(primary?.referrals) && primary.referrals.length > 0) {
    return primary
  }

  const legacy = await readDataFilePreferRemote<PartnerReferralCatalog>(LEGACY_REFERRALS_FILE, { referrals: [] })
  if (Array.isArray(legacy?.referrals) && legacy.referrals.length > 0) {
    await writeDataFile(REFERRALS_FILE, legacy)
    return legacy
  }

  return { referrals: [] }
}

export async function GET() {
  try {
    await requireAdminAuth()
    const data = await loadReferralCatalog()
    const referrals = Array.isArray(data.referrals) ? data.referrals : []

    const totals = referrals.reduce(
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

    const promoRaw = await readDataFilePreferRemote('promo-codes.json', {})
    const { catalog: promoCatalog, changed: promoChanged } = normalizePromoCatalog(promoRaw)
    if (promoChanged) {
      await writeDataFile('promo-codes.json', promoCatalog)
    }

    const partnerCodes = promoCatalog.promoCodes
      .filter((promo) => promo.isSalonReferral)
      .map((promo) => ({
        code: promo.code,
        salonName: promo.salonName || '',
        salonEmail: promo.salonEmail || '',
        salonPartnerType: promo.salonPartnerType || 'salon',
        discountType: promo.discountType,
        clientDiscountPercent:
          promo.clientDiscountPercent ??
          (promo.discountType === 'percentage' && (promo.discountValue ?? 0) > 0 ? promo.discountValue : null),
        clientDiscountAmount:
          promo.clientDiscountAmount ??
          (promo.discountType === 'fixed' && (promo.discountValue ?? 0) > 0 ? promo.discountValue : null),
        salonCommissionType: promo.salonCommissionType ?? 'percentage',
        salonCommissionPercent: promo.salonCommissionPercent ?? null,
        salonCommissionAmount: promo.salonCommissionAmount ?? null,
        salonUsageLimit: promo.salonUsageLimit ?? promo.usageLimit ?? null,
        salonUsedCount: promo.salonUsedCount ?? promo.usedCount ?? 0,
        commissionTotal: promo.commissionTotal ?? 0,
        commissionPaid: promo.commissionPaid ?? 0,
      terminatedAt: promo.terminatedAt ?? null,
        active: promo.active !== false,
      }))

    return NextResponse.json({
      referrals,
      totals,
      partnerCodes,
    })
  } catch (error) {
    console.error('Error loading referrals tracking:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to load referrals tracking' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const body = await request.json()
    const action = body?.action

    if (action === 'terminate-code') {
      const codeRaw = body?.code
      const promoCodeValue = typeof codeRaw === 'string' ? codeRaw.trim().toUpperCase() : ''
      if (!promoCodeValue) {
        return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 })
      }

      const promoRaw = await readDataFilePreferRemote('promo-codes.json', {})
      const { catalog } = normalizePromoCatalog(promoRaw)
      const index = catalog.promoCodes.findIndex((promo) => promo.code === promoCodeValue)
      if (index === -1) {
        return NextResponse.json({ error: 'Promo code not found.' }, { status: 404 })
      }

      const promo = { ...catalog.promoCodes[index] }
      const alreadyTerminated = promo.active === false && promo.terminatedAt

      promo.active = false
      promo.terminatedAt = new Date().toISOString()
      catalog.promoCodes[index] = promo
      await writeDataFile('promo-codes.json', catalog)

      let emailResult: any = null
      if (promo.salonEmail) {
        const subject = 'Update on your LashDiary referral code'
        const html = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; background: #FDF9F4; color: #3E2A20;">
            <h2 style="margin-top: 0; color: #7C4B31;">Referral code update</h2>
            <p>Hi ${promo.salonName || 'Partner'},</p>
            <p>We’ve paused your LashDiary referral code <strong>${promo.code}</strong> effective immediately.</p>
            <p>This decision follows activity that falls outside our referral guidelines (misuse, inaccurate promotion, client privacy, or other conduct noted in your welcome pack).</p>
            <p>Any completed referrals already on file will be reviewed and, if eligible, paid at the end of the month after the code validity period closes. Pending or future bookings made with this code will no longer qualify for payouts.</p>
            <p>If you believe this was triggered in error, reply to this email so we can review the details together.</p>
            <p>We appreciate your understanding as we protect a consistent client experience for every LashDiary guest.</p>
            <p style="margin-top:24px;">Warmly,<br/>Catherine &amp; the LashDiary Team<br/><a href="mailto:hello@lashdiary.co.ke" style="color:#7C4B31;">hello@lashdiary.co.ke</a></p>
          </div>
        `.replace(/\n\s+/g, '\n')

        const text = [
          'Referral code update',
          '',
          `Hi ${promo.salonName || 'Partner'},`,
          '',
          `We’ve paused your LashDiary referral code ${promo.code} effective immediately.`,
          'This follows activity that falls outside our referral guidelines (misuse, inaccurate promotion, client privacy, or other conduct noted in your welcome pack).',
          '',
          'Any completed referrals already on file will be reviewed and, if eligible, paid at the end of the month after the code validity period closes. Pending or future bookings made with this code will no longer qualify for payouts.',
          '',
          'If you believe this was triggered in error, reply to this email so we can review the details together.',
          '',
          'We appreciate your understanding as we protect a consistent client experience for every LashDiary guest.',
          '',
          'Warmly,',
          'Catherine & the LashDiary Team',
          'hello@lashdiary.co.ke',
        ].join('\n')

        try {
          emailResult = await sendPartnerOnboardingEmail({
            to: promo.salonEmail,
            subject,
            html,
            text,
          })
        } catch (error) {
          console.error('Failed to send promo termination email:', error)
          emailResult = { success: false, error: (error as Error)?.message || 'Unable to send email' }
        }
      }

      await recordActivity({
        module: 'promo_codes',
        action: 'update',
        performedBy,
        summary: `Terminated partner code ${promoCodeValue}`,
        targetId: promoCodeValue,
        targetType: 'partner_code',
        details: {
          promo,
          emailResult,
        },
      })

      await revalidatePath('/admin/referrals-tracking')

      return NextResponse.json({
        success: true,
        promo,
        alreadyTerminated,
        emailResult,
      })
    }

    const { id, status } = body as { id?: string; status?: 'pending' | 'paid' }

    if (!id) {
      return NextResponse.json({ error: 'Referral ID is required' }, { status: 400 })
    }

    const data = await loadReferralCatalog()
    const referrals = Array.isArray(data.referrals) ? [...data.referrals] : []
    const index = referrals.findIndex((entry) => entry.id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Referral entry not found' }, { status: 404 })
    }

    const referral = { ...referrals[index] }
    const previousStatus = referral.status || 'pending'
    const nextStatus = status === 'paid' ? 'paid' : 'pending'

    referral.status = nextStatus
    if (nextStatus === 'paid') {
      referral.paidAt = referral.paidAt || new Date().toISOString()
      referral.commissionFinalStatus = 'paid'
      referral.commissionFinalPaidAt = referral.commissionFinalPaidAt || referral.paidAt
    } else {
      referral.paidAt = null
      referral.commissionFinalStatus = 'pending'
      referral.commissionFinalPaidAt = null
    }
    referral.updatedAt = new Date().toISOString()

    referrals[index] = referral
    await writeDataFile(REFERRALS_FILE, { referrals })

    let emailResult: any = null

    if (previousStatus !== nextStatus) {
      const promoRaw = await readDataFilePreferRemote('promo-codes.json', {})
      const { catalog } = normalizePromoCatalog(promoRaw)
      const promoIndex = catalog.promoCodes.findIndex(
        (promoCode) => promoCode.code.toLowerCase() === referral.promoCode.toLowerCase(),
      )
      if (promoIndex !== -1) {
        const promo = { ...catalog.promoCodes[promoIndex] }
        const amount = referral.commissionTotalAmount ?? (referral as any).commissionAmount ?? 0
        if (nextStatus === 'paid') {
          promo.commissionPaid = (promo.commissionPaid || 0) + amount
        } else if (previousStatus === 'paid') {
          promo.commissionPaid = Math.max((promo.commissionPaid || 0) - amount, 0)
        }
        catalog.promoCodes[promoIndex] = promo
        await writeDataFile('promo-codes.json', catalog)
      }

      if (nextStatus === 'paid' && referral.salonEmail) {
        const email = buildCommissionPaidEmail(referral)
        try {
          emailResult = await sendPartnerOnboardingEmail({
            to: referral.salonEmail,
            subject: email.subject,
            html: email.html,
            text: email.text,
          })
        } catch (error) {
          console.error('Failed to send commission paid email:', error)
          emailResult = { success: false, error: (error as Error)?.message || 'Unable to send email' }
        }
      }
    }

    await recordActivity({
      module: 'promo_codes',
      action: 'update',
      performedBy,
      summary: `Updated referral ${id} status to ${nextStatus}`,
      targetId: id,
      targetType: 'partner_referral',
      details: {
        referral,
        emailResult,
      },
    })

    return NextResponse.json({ success: true, referral, emailResult })
  } catch (error) {
    console.error('Error updating referrals tracking:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
  }
}


