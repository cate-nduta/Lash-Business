const BASE_URL = (() => {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }
  return 'http://localhost:3000'
})()

type BookingPromoRedemptionData = {
  promoCode?: string | null
  email?: string | null
  name?: string | null
  service?: string | null
  bookingId?: string | null
  date?: string | null
  timeSlot?: string | null
  originalPrice?: number | null
  finalPrice?: number | null
  discount?: number | null
}

export async function redeemPromoCodeForBooking(booking: BookingPromoRedemptionData) {
  if (!booking.promoCode || !booking.email) {
    return { skipped: true }
  }

  try {
    const response = await fetch(`${BASE_URL}/api/promo-codes/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        code: booking.promoCode,
        email: booking.email,
        clientName: booking.name || null,
        service: booking.service || null,
        bookingId: booking.bookingId || null,
        appointmentDate: booking.date || null,
        appointmentTime: booking.timeSlot || null,
        originalPrice: booking.originalPrice || 0,
        finalPrice: booking.finalPrice || 0,
        discount: booking.discount || 0,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('Promo code redemption failed:', data)
      return { success: false, error: data?.error || 'Failed to redeem promo code' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Promo code redemption request failed:', error)
    return { success: false, error: 'Failed to redeem promo code' }
  }
}
