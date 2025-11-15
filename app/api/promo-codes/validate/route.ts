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

    const parseDateOnly = (dateStr: string): Date | null => {
      if (!dateStr || typeof dateStr !== 'string') return null
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const date = new Date(year, month, day)
          date.setHours(0, 0, 0, 0)
          return date
        }
      }
      const parsed = new Date(dateStr)
      parsed.setHours(0, 0, 0, 0)
      return isNaN(parsed.getTime()) ? null : parsed
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (promoCode.validFrom) {
      const starts = parseDateOnly(promoCode.validFrom)
      if (starts && starts > today) {
        return NextResponse.json({ valid: false, error: 'This promo code is not yet valid.' }, { status: 400 })
      }
    }

    if (promoCode.validUntil) {
      const ends = parseDateOnly(promoCode.validUntil)
      if (ends && ends < today) {
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

    if (requesterEmail) {
      const usedByEmails = Array.isArray(promoCode.usedByEmails)
        ? promoCode.usedByEmails.map((e: string) => e.toLowerCase())
        : []
      if (usedByEmails.includes(requesterEmail)) {
        return NextResponse.json({
          valid: false,
          error: 'You have already used this promo code. Each promo code can only be used once per email address.',
          code: 'PROMO_ALREADY_USED',
        }, { status: 400 })
      }
    }

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
    }

    if (!isReferral && !isSalonReferral && allowsFirstTime === false && isFirstTimeClient === true) {
      return NextResponse.json({
        valid: false,
        error: 'This promo code cannot be used by first-time clients. Please book your first appointment to become eligible.',
        code: 'CARD_FIRST_TIME_BLOCKED',
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
