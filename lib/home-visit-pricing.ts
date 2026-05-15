/** Home visit settings stored on availability.json → homeCalls */
export interface HomeCallsConfig {
  enabled?: boolean
  sectionTitle?: string
  sectionDescription?: string
  /** Extra charge in KES added on top of service price for home visits */
  feeKES?: number
}

export function normalizeHomeVisitFeeKES(fee: unknown): number {
  const n = Number(fee)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

/**
 * Home visit fee is added after service discounts.
 * Waived when the client has 100% off services (discount covers full service subtotal).
 */
export function computeHomeVisitFeeKES(params: {
  isHomeVisit: boolean
  homeCalls?: HomeCallsConfig | null
  serviceSubtotalKES: number
  discountKES: number
}): number {
  if (!params.isHomeVisit || !params.homeCalls?.enabled) return 0
  const fee = normalizeHomeVisitFeeKES(params.homeCalls.feeKES)
  if (fee === 0) return 0
  const subtotal = Math.max(0, Math.round(params.serviceSubtotalKES))
  const discount = Math.max(0, Math.round(params.discountKES))
  if (subtotal > 0 && discount >= subtotal) return 0
  return fee
}

export function computeBookingTotalsKES(params: {
  serviceSubtotalKES: number
  discountKES: number
  homeVisitFeeKES: number
}): {
  serviceSubtotalKES: number
  discountKES: number
  homeVisitFeeKES: number
  originalPriceKES: number
  finalPriceKES: number
} {
  const serviceSubtotalKES = Math.max(0, Math.round(params.serviceSubtotalKES))
  const discountKES = Math.min(Math.max(0, Math.round(params.discountKES)), serviceSubtotalKES)
  const homeVisitFeeKES = Math.max(0, Math.round(params.homeVisitFeeKES))
  const originalPriceKES = serviceSubtotalKES + homeVisitFeeKES
  const finalPriceKES = Math.max(0, serviceSubtotalKES - discountKES) + homeVisitFeeKES
  return {
    serviceSubtotalKES,
    discountKES,
    homeVisitFeeKES,
    originalPriceKES,
    finalPriceKES,
  }
}

export function sumServiceDetailsSubtotalKES(
  serviceDetails: Array<{ price?: number }> | null | undefined,
): number {
  if (!Array.isArray(serviceDetails) || serviceDetails.length === 0) return 0
  return serviceDetails.reduce((sum, d) => {
    const p = Number(d?.price)
    return sum + (Number.isFinite(p) && p > 0 ? Math.round(p) : 0)
  }, 0)
}
