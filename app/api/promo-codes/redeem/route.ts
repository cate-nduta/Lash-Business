import { NextRequest, NextResponse } from 'next/server'
import { readDataFilePreferRemote, writeDataFile } from '@/lib/data-utils'
import nodemailer from 'nodemailer'
import { normalizePromoCatalog } from '@/lib/promo-utils'
import { getSalonCommissionSettings } from '@/lib/discount-utils'
import { loadPolicies } from '@/lib/policies-utils'
import {
  getAvailableReferrerRewardPercent,
  getReferralDefaultsFromPolicies,
  resolveFriendDiscountSettings,
} from '@/lib/referral-utils'
import {
  sendAdminReferralUsedEmail,
  sendReferrerRewardReadyEmail,
  zohoTransporter as referralZoho,
} from '@/lib/email/client-referral'

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_SMTP_USER =
  process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || process.env.ZOHO_USERNAME || ''
const ZOHO_SMTP_PASS =
  process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_APP_PASSWORD || ''
const ZOHO_FROM_EMAIL =
  process.env.ZOHO_FROM_EMAIL ||
  process.env.ZOHO_FROM ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : '') ||
  BUSINESS_NOTIFICATION_EMAIL
const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  ZOHO_FROM_EMAIL ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : BUSINESS_NOTIFICATION_EMAIL)
const EMAIL_FROM_NAME = 'The LashDiary'
const BASE_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || ''
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }
  return 'https://lashdiary.co.ke'
})()

const zohoTransporter =
  ZOHO_SMTP_USER && ZOHO_SMTP_PASS
    ? nodemailer.createTransport({
        host: ZOHO_SMTP_HOST,
        port: ZOHO_SMTP_PORT,
        secure: ZOHO_SMTP_PORT === 465,
        auth: {
          user: ZOHO_SMTP_USER,
          pass: ZOHO_SMTP_PASS,
        },
      })
    : null

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

function isDateExpired(dateValue?: string | null) {
  if (!dateValue) return false
  const expiry = new Date(`${dateValue}T23:59:59`)
  if (Number.isNaN(expiry.getTime())) return false
  return expiry < new Date()
}

async function sendSalonReferralEmail({
  salonEmail,
  salonName,
  clientName,
  service,
  commissionAmount,
  commissionLabel,
  usageSummary,
  bookingLink,
}: {
  salonEmail: string
  salonName: string
  clientName: string
  service: string
  commissionAmount: number
  commissionLabel: string
  usageSummary: string
  bookingLink: string
}) {
  if (!zohoTransporter || !salonEmail) return

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; background: #FFFDF8; color: #2F1A16;">
      <h2 style="margin-top: 0; color: #733D26;">One of your referrals just booked!</h2>
      <p>Hi ${salonName || 'Beauty Partner'},</p>
      <p><strong>${clientName || 'A client'}</strong> booked <em>${service || 'a LashDiary service'}</em> using your personal salon referral code.</p>
      <p>Your expected commission is <strong>KSH ${commissionAmount.toLocaleString()}</strong> (${commissionLabel}). This becomes payable after the client completes their appointment.</p>
      <p style="margin: 16px 0; padding: 14px; background: #FDF3D7; border-left: 4px solid #F7B500; border-radius: 6px;">${usageSummary}</p>
      <p>Eligible commissions are paid at the end of the month after the code validity period closes. We’ll email you again when this commission is marked paid.</p>
      <p style="margin-top: 24px;">🤎 With gratitude,<br />The LashDiary Team</p>
      <p style="font-size: 12px; color: #7a7a7a; margin-top: 24px;">Track all referrals at <a href="${bookingLink}" style="color: #7A6CFF;">${bookingLink.replace(/^https?:\/\//, '')}</a></p>
    </div>
  `

  await zohoTransporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    to: salonEmail,
    subject: 'Referral Booking Received 🤎',
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

    const raw = await readDataFilePreferRemote('promo-codes.json', {})
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
    
    // SECURITY: Check if this is a welcome discount code
    const isWelcomeDiscount = promo.autoGenerated === true && 
      (promo.description?.toLowerCase().includes('welcome discount') || 
       promo.description?.toLowerCase().includes('newsletter subscribers'))

    // SECURITY: If this is a welcome discount, check if email has already used one
    if (isWelcomeDiscount && email) {
      const welcomeDiscountData = await readDataFilePreferRemote<{ recipients: Array<{ email: string; receivedAt: string; promoCode?: string; usedAt?: string }> }>(
        'welcome-discount-recipients.json',
        { recipients: [] }
      )
      
      const existingRecipient = welcomeDiscountData.recipients.find(
        (recipient) => recipient.email.toLowerCase() === email
      )
      
      // If they've already used a welcome discount (not just received one), block them
      if (existingRecipient && existingRecipient.usedAt) {
        return NextResponse.json({ 
          error: 'You have already used your welcome discount. Each email address can only use the welcome discount once.' 
        }, { status: 400 })
      }
    }

    let friendRedeemed = false
    let referrerRedeemed = false
    let salonRedeemed = false
    let salonCommissionAmount = 0

    if (isSalonReferral) {
      const originalPrice = Number(body?.originalPrice) || 0
      const finalPrice = Number(body?.finalPrice) || originalPrice
      const commissionSettings = await getSalonCommissionSettings()
      const commissionType = promo.salonCommissionType === 'fixed' ? 'fixed' : 'percentage'
      const commissionPercent =
        commissionType === 'percentage'
          ? typeof promo.salonCommissionPercent === 'number'
            ? promo.salonCommissionPercent
            : commissionSettings.totalPercentage
          : 0
      const fixedCommissionAmount =
        commissionType === 'fixed' && typeof promo.salonCommissionAmount === 'number'
          ? promo.salonCommissionAmount
          : 0
      const clientDiscountPercent =
        typeof promo.clientDiscountPercent === 'number' ? promo.clientDiscountPercent : Number(body?.clientDiscountPercent) || 0
      const clientDiscountAmount =
        typeof promo.clientDiscountAmount === 'number' ? promo.clientDiscountAmount : Number(body?.clientDiscountAmount) || 0
      const commissionFinalAmount =
        commissionType === 'fixed'
          ? Math.round(fixedCommissionAmount)
          : Math.round(originalPrice * (commissionPercent / 100))
      const commissionEarlyAmount = 0
      salonCommissionAmount = commissionFinalAmount
      const commissionLabel =
        commissionType === 'fixed'
          ? `KSH ${Math.round(fixedCommissionAmount).toLocaleString()} fixed commission`
          : `${commissionPercent}% of the service price`

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
      const referralsData = await readDataFilePreferRemote<{ referrals: any[] }>(referralsFile, { referrals: [] })
      let referrals = Array.isArray(referralsData.referrals) ? [...referralsData.referrals] : []
      if (referrals.length === 0) {
        const legacyData = await readDataFilePreferRemote<{ referrals: any[] }>(legacyReferralsFile, { referrals: [] })
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
        clientDiscountAmount,
        commissionPercent,
        commissionType,
        commissionFixedAmount: commissionType === 'fixed' ? fixedCommissionAmount : null,
        commissionTotalAmount: salonCommissionAmount,
        commissionEarlyPercent: commissionSettings.earlyPercentage,
        commissionFinalPercent: commissionPercent,
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
            commissionLabel,
            usageSummary,
            bookingLink: `${BASE_URL}/booking`,
          })
        } catch (emailError) {
          console.error('Failed to send salon referral email:', emailError)
        }
      }

      salonRedeemed = true
    } else if (isReferral) {
      if (isReferrer) {
        const policies = await loadPolicies()
        const availableRewardPercent = getAvailableReferrerRewardPercent(
          promo,
          getReferralDefaultsFromPolicies(policies.variables),
        )

        if (availableRewardPercent <= 0) {
          return NextResponse.json({ error: 'Referral reward not available for this code.' }, { status: 400 })
        }
        promo.referrerRewardRedeemedCount = promo.friendRedemptionCount ?? 0
        promo.referrerRewardAvailable = false
        promo.usedCount = (promo.usedCount || 0) + 1
        trackEmailUsage(promo, email)
        referrerRedeemed = true
      } else {
        const usedByEmails = Array.isArray(promo.usedByEmails)
          ? promo.usedByEmails.map((usedEmail: string) => usedEmail.toLowerCase())
          : []
        if (email && usedByEmails.includes(email)) {
          return NextResponse.json({
            success: true,
            duplicate: true,
            friendRedeemed: false,
            referrerRedeemed: false,
            salonRedeemed: false,
            salonCommissionAmount,
            promoCode: promo,
          })
        }
        if (isDateExpired(promo.validUntil)) {
          return NextResponse.json({ error: 'This referral code has expired for friend bookings.' }, { status: 400 })
        }
        const remaining = typeof promo.friendUsesRemaining === 'number' ? promo.friendUsesRemaining : 0
        if (remaining <= 0) {
          return NextResponse.json({ error: 'Referral code has already been used.' }, { status: 400 })
        }
        promo.friendRedemptionCount = (promo.friendRedemptionCount ?? 0) + 1
        promo.friendUsesRemaining = Math.max(0, remaining - 1)
        promo.referrerRewardAvailable = (promo.friendRedemptionCount ?? 0) > (promo.referrerRewardRedeemedCount ?? 0)
        promo.usedCount = (promo.usedCount || 0) + 1
        trackEmailUsage(promo, email)
        friendRedeemed = true

        const referralsFile = 'referrals-tracking.json'
        const referralsData = await readDataFilePreferRemote<{ referrals: any[] }>(referralsFile, { referrals: [] })
        const referrals = Array.isArray(referralsData.referrals) ? [...referralsData.referrals] : []
        const policies = await loadPolicies()
        const referralSettings = resolveFriendDiscountSettings(
          promo,
          getReferralDefaultsFromPolicies(policies.variables),
        )

        referrals.push({
          id: `client-ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'client',
          promoCode: promo.code,
          referrerEmail: normalizedRefEmail,
          referrerName: promo.referrerName || null,
          clientName: body?.clientName || null,
          clientEmail: email || null,
          service: body?.service || null,
          bookingId: body?.bookingId || null,
          appointmentDate: body?.appointmentDate || null,
          appointmentTime: body?.appointmentTime || null,
          originalPrice: Number(body?.originalPrice) || 0,
          finalPrice: Number(body?.finalPrice) || 0,
          discountApplied: Number(body?.discount) || 0,
          friendDiscountPercent: referralSettings.friendDiscountPercent,
          referrerRewardPercent: referralSettings.referrerRewardPercent,
          friendRedemptionCount: promo.friendRedemptionCount ?? 0,
          friendReferralLimit: promo.friendReferralLimit ?? null,
          availableRewardPercent: getAvailableReferrerRewardPercent(
            promo,
            getReferralDefaultsFromPolicies(policies.variables),
          ),
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        await writeDataFile(referralsFile, { referrals })
      }
    } else {
      trackEmailUsage(promo, email)
      promo.usedCount = (promo.usedCount || 0) + 1
      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        promo.active = false
      }
      
      // SECURITY: If this is a welcome discount being used, mark it in the tracking file
      if (isWelcomeDiscount && email) {
        const welcomeDiscountData = await readDataFilePreferRemote<{ recipients: Array<{ email: string; receivedAt: string; promoCode?: string; usedAt?: string }> }>(
          'welcome-discount-recipients.json',
          { recipients: [] }
        )
        
        const recipientIndex = welcomeDiscountData.recipients.findIndex(
          (recipient) => recipient.email.toLowerCase() === email
        )
        
        if (recipientIndex >= 0) {
          // Update existing record to mark as used
          welcomeDiscountData.recipients[recipientIndex].usedAt = new Date().toISOString()
          if (!welcomeDiscountData.recipients[recipientIndex].promoCode) {
            welcomeDiscountData.recipients[recipientIndex].promoCode = promo.code
          }
        } else {
          // Create new record if somehow they're using a welcome code but not in the system
          welcomeDiscountData.recipients.push({
            email: email,
            receivedAt: new Date().toISOString(),
            promoCode: promo.code,
            usedAt: new Date().toISOString(),
          })
        }
        
        await writeDataFile('welcome-discount-recipients.json', welcomeDiscountData)
      }
    }

    promoCodes[index] = promo
    await writeDataFile('promo-codes.json', { promoCodes })

    if (friendRedeemed && referralZoho && normalizedRefEmail) {
      try {
        const policies = await loadPolicies()
        const referralSettings = resolveFriendDiscountSettings(
          promo,
          getReferralDefaultsFromPolicies(policies.variables),
        )
        await sendReferrerRewardReadyEmail(normalizedRefEmail, promo.code, {
          ...referralSettings,
          friendReferralLimit: promo.friendReferralLimit ?? undefined,
          referralValidDays: promo.referralValidDays ?? null,
          friendRedemptionCount: promo.friendRedemptionCount ?? 0,
          availableRewardPercent: getAvailableReferrerRewardPercent(
            promo,
            getReferralDefaultsFromPolicies(policies.variables),
          ),
        })
        await sendAdminReferralUsedEmail({
          code: promo.code,
          referrerName: promo.referrerName ?? null,
          referrerEmail: normalizedRefEmail,
          friendName: body?.clientName || null,
          friendEmail: email || null,
          service: body?.service || null,
          bookingId: body?.bookingId || null,
          appointmentDate: body?.appointmentDate || null,
          appointmentTime: body?.appointmentTime || null,
          originalPrice: Number(body?.originalPrice) || 0,
          finalPrice: Number(body?.finalPrice) || 0,
          discountApplied: Number(body?.discount) || 0,
          friendRedemptionCount: promo.friendRedemptionCount ?? 0,
          friendReferralLimit: promo.friendReferralLimit ?? null,
          availableRewardPercent: getAvailableReferrerRewardPercent(
            promo,
            getReferralDefaultsFromPolicies(policies.variables),
          ),
        })
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
