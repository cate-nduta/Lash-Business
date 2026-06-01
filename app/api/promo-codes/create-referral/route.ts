import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { PromoCode } from '@/lib/promo-utils'
import { loadPolicies } from '@/lib/policies-utils'
import { getReferralDefaultsFromPolicies } from '@/lib/referral-utils'
import {
  sendAdminReferralGeneratedEmail,
  sendFriendInviteEmail,
  sendReferralInstructionsEmail,
  zohoTransporter,
} from '@/lib/email/client-referral'

function generateReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let value = ''
  for (let i = 0; i < 6; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `REF-${value}`
}

type CreateReferralBody = {
  referrerEmail?: string
  referrerName?: string
  friendEmail?: string | null
  friendDiscountEnabled?: boolean
  friendDiscountPercent?: number
  referrerRewardPercent?: number
  friendReferralLimit?: number
  referralValidDays?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateReferralBody
    const referrerEmail = (body?.referrerEmail || '').toString().trim().toLowerCase()
    const referrerName = (body?.referrerName || '').toString().trim()
    const friendEmailRaw = body?.friendEmail
    const friendEmail = typeof friendEmailRaw === 'string' ? friendEmailRaw.trim().toLowerCase() : null
    const friendReferralLimit =
      typeof body.friendReferralLimit === 'number' && Number.isFinite(body.friendReferralLimit)
        ? Math.max(1, Math.min(10, Math.round(body.friendReferralLimit)))
        : 3
    const referralValidDays =
      typeof body.referralValidDays === 'number' && Number.isFinite(body.referralValidDays)
        ? Math.max(1, Math.min(365, Math.round(body.referralValidDays)))
        : 30

    if (!referrerEmail || !referrerEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid referrer email is required.' }, { status: 400 })
    }

    const policies = await loadPolicies()
    const defaults = getReferralDefaultsFromPolicies(policies.variables)

    const friendDiscountEnabled =
      body.friendDiscountEnabled === false ? false : defaults.friendDiscountEnabled
    const friendDiscountPercent =
      typeof body.friendDiscountPercent === 'number' && Number.isFinite(body.friendDiscountPercent)
        ? Math.max(0, Math.min(100, body.friendDiscountPercent))
        : defaults.friendDiscountPercent
    const referrerRewardPercent =
      typeof body.referrerRewardPercent === 'number' && Number.isFinite(body.referrerRewardPercent)
        ? Math.max(0, Math.min(100, body.referrerRewardPercent))
        : defaults.referrerRewardPercent

    const emailSettings = {
      friendDiscountEnabled,
      friendDiscountPercent,
      referrerRewardPercent,
      friendReferralLimit,
      referralValidDays,
    }

    const promoData = await readDataFile<{ promoCodes: PromoCode[] }>('promo-codes.json', { promoCodes: [] })
    const promoCodes = Array.isArray(promoData.promoCodes) ? [...promoData.promoCodes] : []

    const existing = promoCodes.find(
      (promo) =>
        promo.isReferral === true &&
        !promo.isSalonReferral &&
        (promo.referrerEmail || '').toLowerCase() === referrerEmail &&
        promo.active !== false &&
        ((typeof promo.friendUsesRemaining === 'number' && promo.friendUsesRemaining > 0) ||
          promo.referrerRewardAvailable === true),
    )

    if (existing) {
      if (
        existing.isReferral &&
        (existing.friendUsesRemaining ?? 0) <= 0 &&
        existing.referrerRewardAvailable === false
      ) {
        existing.friendUsesRemaining = Math.max(0, friendReferralLimit - (existing.friendRedemptionCount ?? 0))
      }
      existing.friendDiscountEnabled = friendDiscountEnabled
      existing.friendDiscountPercent = friendDiscountPercent
      existing.referrerRewardPercent = referrerRewardPercent
      existing.friendReferralLimit = friendReferralLimit
      existing.referralValidDays = referralValidDays
      existing.friendRedemptionCount = existing.friendRedemptionCount ?? 0
      existing.referrerRewardRedeemedCount = existing.referrerRewardRedeemedCount ?? 0
      existing.friendUsesRemaining = Math.max(0, friendReferralLimit - (existing.friendRedemptionCount ?? 0))
      existing.referrerName = referrerName || existing.referrerName || null
      existing.discountValue = friendDiscountPercent
      const refreshedExpiry = new Date()
      refreshedExpiry.setDate(refreshedExpiry.getDate() + referralValidDays)
      existing.validUntil = refreshedExpiry.toISOString().split('T')[0]

      if (zohoTransporter) {
        try {
          await sendReferralInstructionsEmail(referrerEmail, referrerName, existing.code, emailSettings)
          existing.instructionsSentAt = new Date().toISOString()
          if (friendEmail) {
            await sendFriendInviteEmail(friendEmail, existing.code, referrerName, emailSettings)
          }
          await sendAdminReferralGeneratedEmail({
            referrerEmail,
            referrerName,
            code: existing.code,
            reused: true,
            settings: emailSettings,
            friendEmail,
          })
        } catch (emailError) {
          console.error('Failed to resend referral email:', emailError)
        }
      }
      await writeDataFile('promo-codes.json', { promoCodes })
      return NextResponse.json({ success: true, promoCode: existing, reused: true })
    }

    const newCode = generateReferralCode()
    const now = new Date()
    const validUntil = new Date(now)
    validUntil.setDate(validUntil.getDate() + referralValidDays)

    const referralPromo: PromoCode = {
      code: newCode,
      description: `Referral from ${referrerName || 'LashDiary client'}`,
      discountType: 'percentage',
      discountValue: friendDiscountPercent,
      minPurchase: 0,
      maxDiscount: null,
      validFrom: now.toISOString().split('T')[0],
      validUntil: validUntil.toISOString().split('T')[0],
      usageLimit: null,
      usedCount: 0,
      active: true,
      isReferral: true,
      referrerEmail,
      referrerName: referrerName || null,
      friendReferralLimit,
      friendRedemptionCount: 0,
      referrerRewardRedeemedCount: 0,
      referralValidDays,
      friendUsesRemaining: friendReferralLimit,
      referrerRewardAvailable: false,
      friendDiscountEnabled,
      friendDiscountPercent,
      referrerRewardPercent,
      allowFirstTimeClient: true,
      autoGenerated: true,
      instructionsSentAt: zohoTransporter ? new Date().toISOString() : null,
    }

    promoCodes.push(referralPromo)
    await writeDataFile('promo-codes.json', { promoCodes })

    if (zohoTransporter) {
      try {
        await sendReferralInstructionsEmail(referrerEmail, referrerName, newCode, emailSettings)
        if (friendEmail) {
          await sendFriendInviteEmail(friendEmail, newCode, referrerName, emailSettings)
        }
        await sendAdminReferralGeneratedEmail({
          referrerEmail,
          referrerName,
          code: newCode,
          reused: false,
          settings: emailSettings,
          friendEmail,
        })
      } catch (emailError) {
        console.error('Failed to send referral email:', emailError)
      }
    }

    return NextResponse.json({ success: true, promoCode: referralPromo, reused: false })
  } catch (error) {
    console.error('Error creating referral promo code:', error)
    return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 })
  }
}
