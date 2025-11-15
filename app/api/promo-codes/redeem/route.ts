import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { Resend } from 'resend'
import { normalizePromoCatalog } from '@/lib/promo-utils'
import { getSalonCommissionSettings } from '@/lib/discount-utils'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

function trackEmailUsage(promo: any, email: string | null | undefined) {
  if (email) {
    const usedByEmails = Array.isArray(promo.usedByEmails) ? [...promo.usedByEmails] : []
    const normalizedEmail = email.toLowerCase()
    if (!usedByEmails.includes(normalizedEmail)) {
      usedByEmails.push(normalizedEmail)
      promo.usedByEmails = usedByEmails
    }
  }
}

async function sendRewardReadyEmail(referrerEmail: string, code: string) {
  if (!resend) return

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #2F1A16; background-color: #FFF8FB;">
      <h2 style="margin-top: 0; color: #733D26;">Your friend just redeemed your LashDiary code! 💖</h2>
      <p>Your referral code <strong>${code}</strong> has been used by a friend.</p>
      <p>That means your 10% loyalty reward is ready for your next appointment. Use the same code when booking to enjoy your discount.</p>
      <div style="margin: 16px 0; padding: 16px; background: #F3F0FF; border-radius: 12px; border: 2px dashed #7A6CFF; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #5143C5;">Your referral code:</p>
        <p style="margin: 6px 0 0 0; font-size: 26px; font-weight: bold; letter-spacing: 2px;">${code}</p>
      </div>
      <p>Book whenever you're ready:</p>
      <p><a href="${BASE_URL}/booking" style="color: #7A6CFF;">${BASE_URL.replace(/^https?:\/\//, '')}</a></p>
      <p>Thank you for sharing the LashDiary glow!</p>
    </div>
  `

  await resend.emails.send({
    from: `LashDiary Referrals <${FROM_EMAIL}>`,
    to: referrerEmail,
    subject: 'Your LashDiary referral reward is ready!',
    html,
  })
}

async function sendSalonReferralEmail({
  salonEmail,
  salonName,
  clientName,
  service,
  commissionAmount,
  commissionPercent,
  usageSummary,
  bookingLink,
}: {
  salonEmail: string
  salonName: string
  clientName: string
  service: string
  commissionAmount: number
  commissionPercent: number
  usageSummary: string
  bookingLink: string
}) {
  if (!resend || !salonEmail) return

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; background: #FFFDF8; color: #2F1A16;">
      <h2 style="margin-top: 0; color: #733D26;">One of your referrals just booked! ✨</h2>
      <p>Hi ${salonName || 'Beauty Partner'},</p>
      <p><strong>${clientName || 'A client'}</strong> booked <em>${service || 'a LashDiary service'}</em> using your personal salon referral code.</p>
      <p>You’ve earned <strong>KSH ${commissionAmount.toLocaleString()}</strong> (${commissionPercent}% of the service price).</p>
      <p style="margin: 16px 0; padding: 14px; background: #FDF3D7; border-left: 4px solid #F7B500; border-radius: 6px;">${usageSummary}</p>
      <p>We’ll reach out when commissions are paid. Contact us anytime if you have questions.</p>
      <p style="margin-top: 24px;">With gratitude,<br />The LashDiary Team 💕</p>
      <p style="font-size: 12px; color: #7a7a7a; margin-top: 24px;">Track all referrals at <a href="${bookingLink}" style="color: #7A6CFF;">${bookingLink.replace(/^https?:\/\//, '')}</a></p>
    </div>
  `

  await resend.emails.send({
    from: `LashDiary Referrals <${FROM_EMAIL}>`,
    to: salonEmail,
    subject: '✨ Commission earned from your LashDiary referral',
    html,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = (body?.code || '').toString().trim()
    const email = (body?.email || '').toString().trim().toLowerCase()

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }

    const raw = await readDataFile('promo-codes.json', {})
    const { catalog, changed } = normalizePromoCatalog(raw)
    if (changed) {
      await writeDataFile('promo-codes.json', catalog)
    }

    const promoCodes = Array.isArray(catalog.promoCodes) ? [...catalog.promoCodes] : []
    const index = promoCodes.findIndex((promo) => promo.code.toLowerCase() === code.toLowerCase())
    if (index === -1) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }

    const promo = { ...promoCodes[index] }
    const isReferral = promo.isReferral === true
    const isSalonReferral = promo.isSalonReferral === true
    const normalizedRefEmail = promo.referrerEmail?.toLowerCase() || null
    const isReferrer = Boolean(normalizedRefEmail && email && normalizedRefEmail === email)

    let friendRedeemed = false
    let referrerRedeemed = false
    let salonRedeemed = false
    let salonCommissionAmount = 0

    if (isSalonReferral) {
      const originalPrice = Number(body?.originalPrice) || 0
      const finalPrice = Number(body?.finalPrice) || originalPrice
      const commissionSettings = await getSalonCommissionSettings()
      const commissionPercent = commissionSettings.totalPercentage
      const clientDiscountPercent = typeof promo.clientDiscountPercent === 'number' ? promo.clientDiscountPercent : Number(body?.clientDiscountPercent) || 0
      const commissionFinalAmount = Math.round(
        originalPrice * (commissionSettings.totalPercentage / 100),
      )
      const commissionEarlyAmount = 0
      salonCommissionAmount = commissionFinalAmount

      trackEmailUsage(promo, email)

      promo.usedCount = (promo.usedCount || 0) + 1
      promo.salonUsedCount = (promo.salonUsedCount || 0) + 1
      promo.commissionTotal = (promo.commissionTotal || 0) + salonCommissionAmount
      promo.commissionPaid = promo.commissionPaid || 0

      if (promo.salonUsageLimit && promo.salonUsedCount >= promo.salonUsageLimit) {
        promo.active = false
      }
      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        promo.active = false
      }

      const referralsFile = 'referrals-tracking.json'
      const legacyReferralsFile = 'salon-referrals.json'
      const referralsData = await readDataFile<{ referrals: any[] }>(referralsFile, { referrals: [] })
      let referrals = Array.isArray(referralsData.referrals) ? [...referralsData.referrals] : []
      if (referrals.length === 0) {
        const legacyData = await readDataFile<{ referrals: any[] }>(legacyReferralsFile, { referrals: [] })
        if (Array.isArray(legacyData.referrals) && legacyData.referrals.length > 0) {
          referrals = [...legacyData.referrals]
        }
      }

      referrals.push({
        id: `salon-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        promoCode: promo.code,
        salonName: promo.salonName || null,
        salonEmail: promo.salonEmail || null,
        clientName: body?.clientName || null,
        clientEmail: email || null,
        service: body?.service || null,
        bookingId: body?.bookingId || null,
        appointmentDate: body?.appointmentDate || null,
        appointmentTime: body?.appointmentTime || null,
        originalPrice,
        finalPrice,
        discountApplied: Number(body?.discount) || 0,
        clientDiscountPercent,
        commissionPercent,
        commissionTotalAmount: salonCommissionAmount,
        commissionEarlyPercent: commissionSettings.earlyPercentage,
        commissionFinalPercent: commissionSettings.finalPercentage,
        commissionEarlyAmount,
        commissionFinalAmount,
        commissionEarlyStatus: 'pending',
        commissionFinalStatus: 'pending',
        commissionEarlyPaidAt: null,
        commissionFinalPaidAt: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      await writeDataFile(referralsFile, { referrals })

      if (promo.salonEmail) {
        const usageSummary = promo.salonUsageLimit
          ? `${promo.salonUsedCount} of ${promo.salonUsageLimit} cards redeemed`
          : `${promo.salonUsedCount} cards redeemed`

        try {
          await sendSalonReferralEmail({
            salonEmail: promo.salonEmail,
            salonName: promo.salonName || '',
            clientName: body?.clientName || '',
            service: body?.service || 'LashDiary service',
            commissionAmount: salonCommissionAmount,
            commissionPercent,
            usageSummary,
            bookingLink: `${BASE_URL}/booking`,
          })
        } catch (emailError) {
          console.error('Failed to send salon referral email:', emailError)
        }
      }

      salonRedeemed = true
    } else if (isReferral) {
      trackEmailUsage(promo, email)

      if (isReferrer) {
        if (!promo.referrerRewardAvailable) {
          return NextResponse.json({ error: 'Referral reward not available for this code.' }, { status: 400 })
        }
        promo.referrerRewardAvailable = false
        promo.usedCount = (promo.usedCount || 0) + 1
        referrerRedeemed = true
      } else {
        const remaining = typeof promo.friendUsesRemaining === 'number' ? promo.friendUsesRemaining : 0
        if (remaining <= 0) {
          return NextResponse.json({ error: 'Referral code has already been used.' }, { status: 400 })
        }
        promo.friendUsesRemaining = remaining - 1
        promo.referrerRewardAvailable = true
        promo.usedCount = (promo.usedCount || 0) + 1
        friendRedeemed = true
      }
    } else {
      trackEmailUsage(promo, email)
      promo.usedCount = (promo.usedCount || 0) + 1
      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        promo.active = false
      }
    }

    promoCodes[index] = promo
    await writeDataFile('promo-codes.json', { promoCodes })

    if (friendRedeemed && resend && normalizedRefEmail) {
      try {
        await sendRewardReadyEmail(normalizedRefEmail, promo.code)
      } catch (emailError) {
        console.error('Failed to send referral reward email:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      friendRedeemed,
      referrerRedeemed,
      salonRedeemed,
      salonCommissionAmount,
      promoCode: promo,
    })
  } catch (error) {
    console.error('Error updating promo code usage:', error)
    return NextResponse.json({ error: 'Failed to update promo code usage' }, { status: 500 })
  }
}
