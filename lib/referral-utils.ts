import type { PromoCode } from '@/lib/promo-utils'
import type { PolicyVariables } from '@/lib/policies-types'

export type ReferralDiscountSettings = {
  friendDiscountEnabled: boolean
  friendDiscountPercent: number
  referrerRewardPercent: number
}

export function getReferralDefaultsFromPolicies(
  variables?: Partial<PolicyVariables> | null,
): ReferralDiscountSettings {
  return {
    friendDiscountEnabled: true,
    friendDiscountPercent:
      typeof variables?.referralDiscountPercent === 'number' ? variables.referralDiscountPercent : 10,
    referrerRewardPercent:
      typeof variables?.referralRewardPercent === 'number' ? variables.referralRewardPercent : 10,
  }
}

export function resolveFriendDiscountSettings(
  promo: PromoCode,
  policyDefaults?: ReferralDiscountSettings,
): ReferralDiscountSettings {
  const defaults = policyDefaults ?? {
    friendDiscountEnabled: true,
    friendDiscountPercent: 10,
    referrerRewardPercent: 10,
  }

  const friendDiscountEnabled =
    promo.friendDiscountEnabled === false
      ? false
      : promo.friendDiscountEnabled === true || defaults.friendDiscountEnabled

  const friendFromField =
    typeof promo.friendDiscountPercent === 'number' && Number.isFinite(promo.friendDiscountPercent)
      ? promo.friendDiscountPercent
      : null

  const friendDiscountPercent =
    friendFromField !== null
      ? Math.max(0, friendFromField)
      : promo.discountType === 'percentage'
        ? Math.max(0, promo.discountValue ?? defaults.friendDiscountPercent)
        : defaults.friendDiscountPercent

  const rewardFromField =
    typeof promo.referrerRewardPercent === 'number' && Number.isFinite(promo.referrerRewardPercent)
      ? promo.referrerRewardPercent
      : null

  const referrerRewardPercent =
    rewardFromField !== null
      ? Math.max(0, rewardFromField)
      : promo.discountType === 'percentage'
        ? Math.max(0, promo.discountValue ?? defaults.referrerRewardPercent)
        : defaults.referrerRewardPercent

  return {
    friendDiscountEnabled,
    friendDiscountPercent,
    referrerRewardPercent,
  }
}

export function getFriendBookingDiscount(promo: PromoCode, policyDefaults?: ReferralDiscountSettings) {
  const settings = resolveFriendDiscountSettings(promo, policyDefaults)
  if (!settings.friendDiscountEnabled || settings.friendDiscountPercent <= 0) {
    return { discountType: 'percentage' as const, discountValue: 0 }
  }
  return { discountType: 'percentage' as const, discountValue: settings.friendDiscountPercent }
}

export function getReferrerBookingDiscount(promo: PromoCode, policyDefaults?: ReferralDiscountSettings) {
  const discountValue = getAvailableReferrerRewardPercent(promo, policyDefaults)
  if (discountValue <= 0) {
    return { discountType: 'percentage' as const, discountValue: 0 }
  }
  return { discountType: 'percentage' as const, discountValue }
}

export function getAvailableReferrerRewardPercent(
  promo: PromoCode,
  policyDefaults?: ReferralDiscountSettings,
) {
  const settings = resolveFriendDiscountSettings(promo, policyDefaults)
  const earnedCount = Math.max(0, promo.friendRedemptionCount ?? (promo.referrerRewardAvailable ? 1 : 0))
  const redeemedCount = Math.max(0, promo.referrerRewardRedeemedCount ?? 0)
  const availableCount = Math.max(0, earnedCount - redeemedCount)
  return Math.min(100, availableCount * settings.referrerRewardPercent)
}

export function getReferralProgress(promo: PromoCode) {
  const limit = Math.max(0, promo.friendReferralLimit ?? 1)
  const redeemed = Math.max(0, promo.friendRedemptionCount ?? 0)
  const rewardRedeemed = Math.max(0, promo.referrerRewardRedeemedCount ?? 0)

  return {
    limit,
    redeemed,
    remaining: Math.max(0, limit - redeemed),
    rewardRedeemed,
    rewardAvailableCount: Math.max(0, redeemed - rewardRedeemed),
  }
}

export function formatPercentLabel(value: number) {
  if (value <= 0) return 'no discount'
  return value % 1 === 0 ? `${value}%` : `${value}%`
}
