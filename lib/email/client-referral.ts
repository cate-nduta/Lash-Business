import nodemailer from 'nodemailer'
import { formatPercentLabel } from '@/lib/referral-utils'

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

export const BASE_URL = (() => {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }
  return 'https://lashdiary.co.ke'
})()

export const zohoTransporter =
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

export type ClientReferralEmailSettings = {
  friendDiscountEnabled: boolean
  friendDiscountPercent: number
  referrerRewardPercent: number
  friendReferralLimit?: number
  referralValidDays?: number | null
  friendRedemptionCount?: number
  availableRewardPercent?: number
}

export type AdminReferralGeneratedEmailData = {
  referrerName?: string | null
  referrerEmail: string
  code: string
  reused?: boolean
  settings: ClientReferralEmailSettings
  friendEmail?: string | null
}

export type AdminReferralUsedEmailData = {
  code: string
  referrerName?: string | null
  referrerEmail?: string | null
  friendName?: string | null
  friendEmail?: string | null
  service?: string | null
  bookingId?: string | null
  appointmentDate?: string | null
  appointmentTime?: string | null
  originalPrice?: number
  finalPrice?: number
  discountApplied?: number
  friendRedemptionCount?: number
  friendReferralLimit?: number | null
  availableRewardPercent?: number
}

function friendDiscountLine(settings: ClientReferralEmailSettings) {
  if (!settings.friendDiscountEnabled || settings.friendDiscountPercent <= 0) {
    return 'Your friend can book using your code (no friend discount on this referral).'
  }
  return `Your friend gets <strong>${formatPercentLabel(settings.friendDiscountPercent)} off</strong> their first LashDiary visit when they use the code while booking.`
}

function referrerRewardLine(settings: ClientReferralEmailSettings) {
  if (settings.referrerRewardPercent <= 0) {
    return 'Once they book, you will be notified — thank you for sharing LashDiary!'
  }
  const limit = settings.friendReferralLimit ?? 1
  if (limit > 1) {
    return `Each friend who books unlocks <strong>${formatPercentLabel(settings.referrerRewardPercent)} off</strong> for you, up to <strong>${formatPercentLabel(limit * settings.referrerRewardPercent)} off</strong> when ${limit} friends use your code.`
  }
  return `Once they book, <strong>you</strong> unlock <strong>${formatPercentLabel(settings.referrerRewardPercent)} off</strong> your next appointment using the <em>same code</em>.`
}

export async function sendReferralInstructionsEmail(
  referrerEmail: string,
  referrerName: string,
  code: string,
  settings: ClientReferralEmailSettings,
) {
  if (!zohoTransporter) {
    console.warn('Zoho SMTP not configured; skipping referral instruction email.')
    return
  }

  const safeName = referrerName || 'Beautiful'
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #2F1A16; background-color: #FFF8FB;">
      <h2 style="margin-top: 0; color: #733D26;">LashDiary Referral — Share with a Friend</h2>
      <p>Hi ${safeName},</p>
      <p>Thank you for being a loyal LashDiary client! Here's your personal referral code:</p>
      <div style="margin: 16px 0; padding: 16px; background: #F3F0FF; border-radius: 12px; border: 2px dashed #7A6CFF; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #5143C5;">Share this code with a friend:</p>
        <p style="margin: 6px 0 0 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${code}</p>
      </div>
      <ul style="padding-left: 18px; line-height: 1.6;">
        <li>${friendDiscountLine(settings)}</li>
        <li>${referrerRewardLine(settings)}</li>
        <li>This code can be used by up to <strong>${settings.friendReferralLimit ?? 1} friend${(settings.friendReferralLimit ?? 1) === 1 ? '' : 's'}</strong>${settings.referralValidDays ? ` within <strong>${settings.referralValidDays} days</strong>` : ''}.</li>
      </ul>
      <p style="margin-top: 24px;">Ready to share the love? Forward this email or copy your code into a message.</p>
      <p>We appreciate you for helping the LashDiary family grow!</p>
      <p style="margin-top: 32px;">🤎 With love,<br/>The LashDiary Team</p>
      <p style="font-size: 12px; color: #7a7a7a; margin-top: 24px;">
        Book anytime at <a href="${BASE_URL}/booking" style="color: #7A6CFF; text-decoration: none;">${BASE_URL.replace(/^https?:\/\//, '')}</a>
      </p>
    </div>
  `

  await zohoTransporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    to: referrerEmail,
    subject: 'Your Referral Code is Ready 🤎',
    html,
  })
}

export async function sendAdminReferralGeneratedEmail(data: AdminReferralGeneratedEmailData) {
  if (!zohoTransporter) {
    console.warn('Zoho SMTP not configured; skipping admin referral generated email.')
    return
  }

  const limit = data.settings.friendReferralLimit ?? 1
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #2F1A16; background-color: #FFF8FB;">
      <h2 style="margin-top: 0; color: #733D26;">Client referral code ${data.reused ? 'updated' : 'generated'}</h2>
      <p>A client referral code has been ${data.reused ? 'updated/re-sent' : 'generated and sent'}.</p>
      <div style="margin: 16px 0; padding: 16px; background: #FFFFFF; border: 1px solid #EADFD6; border-radius: 12px;">
        <p style="margin: 0 0 8px 0;"><strong>Code:</strong> ${data.code}</p>
        <p style="margin: 0 0 8px 0;"><strong>Referrer:</strong> ${data.referrerName || 'Client'} (${data.referrerEmail})</p>
        ${data.friendEmail ? `<p style="margin: 0 0 8px 0;"><strong>Friend invite sent to:</strong> ${data.friendEmail}</p>` : ''}
        <p style="margin: 0 0 8px 0;"><strong>Friend discount:</strong> ${
          data.settings.friendDiscountEnabled && data.settings.friendDiscountPercent > 0
            ? `${formatPercentLabel(data.settings.friendDiscountPercent)} off`
            : 'No friend discount'
        }</p>
        <p style="margin: 0 0 8px 0;"><strong>Referrer reward:</strong> ${formatPercentLabel(data.settings.referrerRewardPercent)} per successful friend booking</p>
        <p style="margin: 0;"><strong>Friend limit:</strong> ${limit}${data.settings.referralValidDays ? ` within ${data.settings.referralValidDays} days` : ''}</p>
      </div>
      <p style="font-size: 12px; color: #7a7a7a;">You can review this code in Admin → Promo Codes.</p>
    </div>
  `

  await zohoTransporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    to: BUSINESS_NOTIFICATION_EMAIL,
    subject: `Client Referral Code ${data.reused ? 'Updated' : 'Generated'}: ${data.code}`,
    html,
  })
}

export async function sendFriendInviteEmail(
  friendEmail: string,
  code: string,
  referrerName: string,
  settings: ClientReferralEmailSettings,
) {
  if (!zohoTransporter) {
    console.warn('Zoho SMTP not configured; skipping friend referral invite email.')
    return
  }

  const safeName = referrerName || 'a LashDiary client'
  const discountNote =
    settings.friendDiscountEnabled && settings.friendDiscountPercent > 0
      ? `Use it when booking your first appointment to enjoy <strong>${formatPercentLabel(settings.friendDiscountPercent)} off</strong>.`
      : 'Use it when booking your appointment with LashDiary.'

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #2F1A16; background-color: #FFF8FB;">
      <h2 style="margin-top: 0; color: #733D26;">${safeName} sent you a LashDiary referral</h2>
      <p>Hello!</p>
      <p>${safeName} thought you'd love LashDiary. Use their personal referral code:</p>
      <div style="margin: 16px 0; padding: 16px; background: #F3F0FF; border-radius: 12px; border: 2px dashed #7A6CFF; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #5143C5;">Referral code:</p>
        <p style="margin: 6px 0 0 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${code}</p>
      </div>
      <p style="margin: 0 0 16px 0;">${discountNote}</p>
      <p style="margin: 0 0 16px 0;">Book now at <a href="${BASE_URL}/booking" style="color: #7A6CFF;">${BASE_URL.replace(/^https?:\/\//, '')}/booking</a>.</p>
      <p style="margin-top: 24px;">Can't wait to pamper you!<br/>🤎 The LashDiary Team</p>
    </div>
  `

  await zohoTransporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    to: friendEmail,
    subject: 'You Received a Referral Code 🤎',
    html,
  })
}

export async function sendReferrerRewardReadyEmail(
  referrerEmail: string,
  code: string,
  settings: ClientReferralEmailSettings,
) {
  if (!zohoTransporter) return

  const rewardText =
    (settings.availableRewardPercent ?? settings.referrerRewardPercent) > 0
      ? `That means your ${formatPercentLabel(settings.availableRewardPercent ?? settings.referrerRewardPercent)} loyalty reward is ready for your next appointment. Use the same code when booking to enjoy your discount.`
      : 'Thank you for referring a friend to LashDiary!'
  const progressText =
    typeof settings.friendRedemptionCount === 'number' && settings.friendReferralLimit
      ? `<p>You have ${settings.friendRedemptionCount} of ${settings.friendReferralLimit} friend referrals counted on this code.</p>`
      : ''

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #2F1A16; background-color: #FFF8FB;">
      <h2 style="margin-top: 0; color: #733D26;">Your friend just redeemed your LashDiary code!</h2>
      <p>Your referral code <strong>${code}</strong> has been used by a friend.</p>
      ${progressText}
      <p>${rewardText}</p>
      <div style="margin: 16px 0; padding: 16px; background: #F3F0FF; border-radius: 12px; border: 2px dashed #7A6CFF; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #5143C5;">Your referral code:</p>
        <p style="margin: 6px 0 0 0; font-size: 26px; font-weight: bold; letter-spacing: 2px;">${code}</p>
      </div>
      <p>Book whenever you're ready:</p>
      <p><a href="${BASE_URL}/booking" style="color: #7A6CFF;">${BASE_URL.replace(/^https?:\/\//, '')}</a></p>
      <p>Thank you for sharing the LashDiary glow!</p>
    </div>
  `

  await zohoTransporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    to: referrerEmail,
    subject: 'Your Referral Reward is Ready 🤎',
    html,
  })
}

export async function sendAdminReferralUsedEmail(data: AdminReferralUsedEmailData) {
  if (!zohoTransporter) {
    console.warn('Zoho SMTP not configured; skipping admin referral used email.')
    return
  }

  const progress =
    typeof data.friendRedemptionCount === 'number' && data.friendReferralLimit
      ? `${data.friendRedemptionCount} of ${data.friendReferralLimit} friend referrals used`
      : 'Friend referral used'
  const rewardText =
    typeof data.availableRewardPercent === 'number'
      ? `${formatPercentLabel(data.availableRewardPercent)} currently available for referrer`
      : 'Reward availability updated'

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #2F1A16; background-color: #FFF8FB;">
      <h2 style="margin-top: 0; color: #733D26;">Client referral code used</h2>
      <p>A friend booked using a client referral code.</p>
      <div style="margin: 16px 0; padding: 16px; background: #FFFFFF; border: 1px solid #EADFD6; border-radius: 12px;">
        <p style="margin: 0 0 8px 0;"><strong>Code:</strong> ${data.code}</p>
        <p style="margin: 0 0 8px 0;"><strong>Referrer:</strong> ${data.referrerName || 'Client'}${data.referrerEmail ? ` (${data.referrerEmail})` : ''}</p>
        <p style="margin: 0 0 8px 0;"><strong>Friend/client:</strong> ${data.friendName || 'Client'}${data.friendEmail ? ` (${data.friendEmail})` : ''}</p>
        ${data.service ? `<p style="margin: 0 0 8px 0;"><strong>Service:</strong> ${data.service}</p>` : ''}
        ${data.bookingId ? `<p style="margin: 0 0 8px 0;"><strong>Booking ID:</strong> ${data.bookingId}</p>` : ''}
        ${data.appointmentDate ? `<p style="margin: 0 0 8px 0;"><strong>Appointment date:</strong> ${data.appointmentDate}${data.appointmentTime ? ` at ${data.appointmentTime}` : ''}</p>` : ''}
        <p style="margin: 0 0 8px 0;"><strong>Progress:</strong> ${progress}</p>
        <p style="margin: 0;"><strong>Reward:</strong> ${rewardText}</p>
      </div>
      <p style="font-size: 12px; color: #7a7a7a;">You can review this usage in Admin → Referrals Tracking and Admin → Bookings.</p>
    </div>
  `

  await zohoTransporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
    to: BUSINESS_NOTIFICATION_EMAIL,
    subject: `Client Referral Used: ${data.code}`,
    html,
  })
}
