import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { normalizePromoCatalog, type PromoCode } from '@/lib/promo-utils'

export async function POST(request: NextRequest) {
  try {
    const raw = await readDataFile('promo-codes.json', {})
    const { catalog, changed } = normalizePromoCatalog(raw)

    if (changed) {
      await writeDataFile('promo-codes.json', catalog)
    }

    const body = await request.json()
    const { code, email, isFirstTimeClient, referralType } = body as {
      code?: string
      email?: string
      isFirstTimeClient?: boolean
      referralType?: 'friend' | 'salon' | null
    }

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Promo code required' }, { status: 400 })
    }

    const promoCode = catalog.promoCodes.find((promo) => promo.code.toLowerCase() === code.toLowerCase())

    if (!promoCode || promoCode.active === false) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid promo code',
        code: 'INVALID',
      }, { status: 404 })
    }

    const now = new Date()

    if (promoCode.validFrom) {
      const starts = new Date(promoCode.validFrom)
      if (starts > now) {
        return NextResponse.json({ valid: false, error: 'This promo code is not yet valid.' }, { status: 400 })
      }
    }

    if (promoCode.validUntil) {
      const ends = new Date(promoCode.validUntil)
      if (ends < now) {
        return NextResponse.json({ valid: false, error: 'This promo code has expired.' }, { status: 400 })
      }
    }

    if (promoCode.usageLimit && typeof promoCode.usedCount === 'number' && promoCode.usedCount >= promoCode.usageLimit) {
      return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit.' }, { status: 400 })
    }

    const normalizedReferrerEmail = promoCode.referrerEmail?.toLowerCase() || null
    const requesterEmail = typeof email === 'string' ? email.toLowerCase() : null
    const isReferral = promoCode.isReferral === true
    const isSalonReferral = promoCode.isSalonReferral === true
    const allowsFirstTime = promoCode.allowFirstTimeClient ?? false

    if (isReferral && !isSalonReferral) {
      const isReferrer = Boolean(normalizedReferrerEmail && requesterEmail && normalizedReferrerEmail === requesterEmail)
      const friendUsesRemaining =
        typeof promoCode.friendUsesRemaining === 'number' ? promoCode.friendUsesRemaining : null
      const referrerRewardAvailable = promoCode.referrerRewardAvailable ?? false

      if (isReferrer) {
        if (!referrerRewardAvailable) {
          return NextResponse.json({
            valid: false,
            error: 'Your referral reward has already been used or is not yet unlocked.',
            code: 'REFERRAL_REFERRER_ONLY',
          }, { status: 400 })
        }
      } else {
        if (friendUsesRemaining !== null && friendUsesRemaining <= 0) {
          return NextResponse.json({
            valid: false,
            error: 'This referral code has already been used by a friend. Ask your friend for a new code.',
            code: 'REFERRAL_FRIEND_LIMIT',
          }, { status: 400 })
        }
        if (isFirstTimeClient === true && allowsFirstTime === false) {
          return NextResponse.json({
            valid: false,
            error: 'This referral code cannot be used on a first visit.',
            code: 'REFERRAL_FIRST_TIME_BLOCKED',
          }, { status: 400 })
        }
      }
    } else if (isSalonReferral) {
      if (promoCode.salonUsageLimit != null && typeof promoCode.salonUsedCount === 'number' && promoCode.salonUsedCount >= promoCode.salonUsageLimit) {
        return NextResponse.json({
          valid: false,
          error: 'This salon referral code has reached its usage limit.',
          code: 'SALON_LIMIT_REACHED',
        }, { status: 400 })
      }
      if (referralType && referralType !== 'salon') {
        return NextResponse.json({
          valid: false,
          error: 'Please select “Referred by a salon / beautician / influencer” to use this code.',
          code: 'SALON_USE_REQUIRED',
        }, { status: 400 })
      }
      if (isFirstTimeClient === false && promoCode.clientDiscountPercent === null) {
        return NextResponse.json({
          valid: false,
          error: 'This salon referral code can only be used by new clients.',
          code: 'SALON_FIRST_TIME_BLOCKED',
        }, { status: 400 })
      }
    } else if (isFirstTimeClient === true) {
      return NextResponse.json({
        valid: false,
        error: 'First-time clients qualify for the welcome discount automatically and cannot use promo codes yet.',
        code: 'FIRST_TIME_PROMO_BLOCKED',
      }, { status: 400 })
    }

    const sanitized = {
      code: promoCode.code,
      description: promoCode.description || '',
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      minPurchase: promoCode.minPurchase ?? 0,
      maxDiscount: promoCode.maxDiscount ?? null,
      isReferral,
      referrerEmail: normalizedReferrerEmail,
      friendUsesRemaining: promoCode.friendUsesRemaining ?? null,
      referrerRewardAvailable: promoCode.referrerRewardAvailable ?? false,
      allowFirstTimeClient: allowsFirstTime,
      appliesToReferrer: isReferral ? normalizedReferrerEmail === requesterEmail : false,
      appliesToFriend: isReferral ? normalizedReferrerEmail !== requesterEmail : false,
      isSalonReferral,
      salonName: promoCode.salonName ?? null,
      salonEmail: promoCode.salonEmail ?? null,
      salonPartnerType: promoCode.salonPartnerType ?? 'salon',
      clientDiscountPercent: promoCode.clientDiscountPercent ?? null,
      salonCommissionPercent: promoCode.salonCommissionPercent ?? null,
      salonUsageLimit: promoCode.salonUsageLimit ?? null,
      salonUsedCount: promoCode.salonUsedCount ?? 0,
    }

    return NextResponse.json({ valid: true, promoCode: sanitized })
  } catch (error) {
    console.error('Error validating promo code:', error)
    return NextResponse.json({ valid: false, error: 'Failed to validate promo code' }, { status: 500 })
  }
}
