import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { readDataFilePreferRemote, writeDataFile } from '@/lib/data-utils'
import { normalizePromoCatalog } from '@/lib/promo-utils'
import { loadPolicies } from '@/lib/policies-utils'
import { getReferralDefaultsFromPolicies, resolveFriendDiscountSettings } from '@/lib/referral-utils'
import {
  sendFriendInviteEmail,
  sendReferralInstructionsEmail,
  zohoTransporter,
} from '@/lib/email/client-referral'
import { recordActivity } from '@/lib/activity-log'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'

    const body = await request.json()
    const code = (body?.code || '').toString().trim().toUpperCase()
    const friendEmailRaw = body?.friendEmail
    const friendEmail = typeof friendEmailRaw === 'string' ? friendEmailRaw.trim().toLowerCase() : null

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 })
    }

    if (!zohoTransporter) {
      return NextResponse.json({ error: 'Email is not configured (Zoho SMTP).' }, { status: 500 })
    }

    const raw = await readDataFilePreferRemote('promo-codes.json', {})
    const { catalog } = normalizePromoCatalog(raw)
    const index = catalog.promoCodes.findIndex((promo) => promo.code.toUpperCase() === code)

    if (index === -1) {
      return NextResponse.json({ error: 'Promo code not found.' }, { status: 404 })
    }

    const promo = { ...catalog.promoCodes[index] }

    if (!promo.isReferral || promo.isSalonReferral) {
      return NextResponse.json({ error: 'This code is not a client referral code.' }, { status: 400 })
    }

    const referrerEmail = promo.referrerEmail
    if (!referrerEmail) {
      return NextResponse.json({ error: 'Referrer email is missing on this code.' }, { status: 400 })
    }

    const policies = await loadPolicies()
    const emailSettings = resolveFriendDiscountSettings(
      promo,
      getReferralDefaultsFromPolicies(policies.variables),
    )
    const fullEmailSettings = {
      ...emailSettings,
      friendReferralLimit: promo.friendReferralLimit ?? 1,
      referralValidDays: promo.referralValidDays ?? null,
      friendRedemptionCount: promo.friendRedemptionCount ?? 0,
    }

    const referrerName = promo.referrerName || promo.description?.replace(/^Referral from /i, '') || ''

    await sendReferralInstructionsEmail(referrerEmail, referrerName, promo.code, fullEmailSettings)
    if (friendEmail) {
      await sendFriendInviteEmail(friendEmail, promo.code, referrerName, fullEmailSettings)
    }

    promo.instructionsSentAt = new Date().toISOString()
    catalog.promoCodes[index] = promo
    await writeDataFile('promo-codes.json', catalog)

    await recordActivity({
      module: 'promo_codes',
      action: 'update',
      performedBy,
      summary: `Sent referral instructions for ${promo.code} to ${referrerEmail}`,
      targetId: promo.code,
      targetType: 'client_referral',
    })

    return NextResponse.json({ success: true, instructionsSentAt: promo.instructionsSentAt })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending referral email:', error)
    return NextResponse.json({ error: 'Failed to send referral email' }, { status: 500 })
  }
}
