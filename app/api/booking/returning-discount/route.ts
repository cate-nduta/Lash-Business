import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

const parseClientDate = (value: string | null) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get('email')
    const dateParam = searchParams.get('date')

    if (!emailParam || !emailParam.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 })
    }

    const targetDate = parseClientDate(dateParam)
    const email = emailParam.trim().toLowerCase()

    const [bookingsData, discountsConfig] = await Promise.all([
      readDataFile<{ bookings: Array<Record<string, any>> }>('bookings.json', { bookings: [] }),
      readDataFile<Record<string, any>>('discounts.json', {}),
    ])
    const bookings = Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : []
    const returningConfig = discountsConfig?.returningClientDiscount ?? {}
    const returningEnabled = returningConfig?.enabled !== false
    const tier30Percentage = Number(
      returningConfig?.tier30Percentage ??
        returningConfig?.within30DaysPercentage ??
        returningConfig?.percentage ??
        0,
    )
    const tier45Percentage = Number(
      returningConfig?.tier45Percentage ??
        returningConfig?.within31To45DaysPercentage ??
        returningConfig?.percentage ??
        0,
    )

    let lastPaidAt: string | null = null

    for (const booking of bookings) {
      const bookingEmail =
        typeof booking?.email === 'string' ? booking.email.trim().toLowerCase() : null
      if (bookingEmail !== email) continue

      const finalPriceRaw = Number(booking?.finalPrice ?? 0)
      const finalPrice = Number.isFinite(finalPriceRaw) ? finalPriceRaw : 0
      const depositRaw = Number(booking?.deposit ?? 0)
      const depositTotal = Number.isFinite(depositRaw) ? depositRaw : 0

      let paidAt: string | null =
        typeof booking?.paidInFullAt === 'string' && booking.paidInFullAt.trim().length > 0
          ? booking.paidInFullAt
          : null

      if (!paidAt && Array.isArray(booking?.payments) && depositTotal >= finalPrice && finalPrice > 0) {
        const latestPayment = booking.payments
          .map((entry: any) =>
            typeof entry?.date === 'string' && entry.date.trim().length > 0 ? entry.date : null,
          )
          .filter((value: string | null): value is string => Boolean(value))
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())
        if (latestPayment.length > 0) {
          paidAt = latestPayment[0]
        }
      }

      if (!paidAt) continue

      if (!lastPaidAt || new Date(paidAt) > new Date(lastPaidAt)) {
        lastPaidAt = paidAt
      }
    }

    let discountPercent = 0
    let daysSince: number | null = null

    if (returningEnabled && lastPaidAt && targetDate) {
      const lastPaidDate = new Date(lastPaidAt)
      const diffMs = targetDate.getTime() - lastPaidDate.getTime()
      daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (daysSince >= 0 && daysSince <= 30) {
        discountPercent = Math.max(0, tier30Percentage)
      } else if (daysSince >= 0 && daysSince <= 45) {
        discountPercent = Math.max(0, tier45Percentage)
      }
    }

    return NextResponse.json({
      lastPaidAt,
      discountPercent,
      daysSince,
    })
  } catch (error) {
    console.error('Error loading returning discount:', error)
    return NextResponse.json({ error: 'Failed to calculate returning discount.' }, { status: 500 })
  }
}

