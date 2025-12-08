import nodemailer from 'nodemailer'
import type { GiftCard } from '@/lib/gift-card-utils'

const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'
const OWNER_EMAIL = BUSINESS_NOTIFICATION_EMAIL
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The LashDiary'
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

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

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

function createGiftCardPurchaseEmailTemplate(card: GiftCard) {
  const { background, card: cardBg, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const friendlyName = card.purchasedBy.name.trim().split(' ')[0]
  const expiresDate = new Date(card.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Gift Card is Ready!</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'DM Serif Text', Georgia, serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${cardBg}; border-radius:18px; border:1px solid ${accent}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.08);">
          <tr>
            <td style="padding:28px 32px 12px 32px; text-align:center; background:${cardBg};">
              <p style="margin:0; text-transform:uppercase; letter-spacing:3px; font-size:12px; color:${textSecondary};">Gift Card Purchase</p>
              <h1 style="margin:12px 0 0 0; font-size:36px; color:${brand}; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:600; line-height:1.3; letter-spacing:0.5px;">Your Gift Card is Ready!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <p style="margin:0 0 18px 0; font-size:16px; line-height:1.6; color:${textPrimary};">
                Thank you, ${friendlyName}! Your gift card has been created and is ready to use.
              </p>

              <div style="border-radius:14px; padding:20px 24px; background:${background}; border:2px solid ${brand}; margin-bottom:24px; text-align:center;">
                <p style="margin:0 0 12px 0; font-size:14px; color:${textSecondary}; text-transform:uppercase; letter-spacing:1px;">Gift Card Code</p>
                <p style="margin:0 0 16px 0; font-size:32px; font-family:monospace; font-weight:bold; color:${brand}; letter-spacing:4px;">
                  ${card.code}
                </p>
                <p style="margin:0; font-size:20px; color:${textPrimary}; font-weight:600;">
                  Amount: ${card.amount.toLocaleString()} KSH
                </p>
              </div>

              <div style="border-radius:14px; padding:18px 20px; background:${cardBg}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">Gift Card Details</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary}; width:140px;">Amount</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600;">${card.amount.toLocaleString()} KSH</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Expires</td>
                    <td style="padding:6px 0; color:${textPrimary};">${expiresDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Status</td>
                    <td style="padding:6px 0; color:${textPrimary};">Active</td>
                  </tr>
                </table>
              </div>

              ${card.recipient?.name || card.recipient?.email ? `
              <div style="border-radius:14px; padding:18px 20px; background:${cardBg}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">Recipient</h2>
                ${card.recipient.name ? `<p style="margin:0 0 8px 0; color:${textPrimary}; font-size:15px;"><strong>${card.recipient.name}</strong></p>` : ''}
                ${card.recipient.email ? `<p style="margin:0 0 8px 0; color:${textSecondary}; font-size:14px;">${card.recipient.email}</p>` : ''}
                ${card.recipient.message ? `<p style="margin:8px 0 0 0; color:${textPrimary}; font-size:14px; font-style:italic; padding-top:8px; border-top:1px solid ${accent};">"${card.recipient.message}"</p>` : ''}
              </div>
              ` : ''}

              <div style="border-radius:14px; padding:18px 20px; background:${cardBg}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 12px 0; font-size:17px; color:${brand};">How to Use</h2>
                <ol style="margin:0; padding-left:20px; color:${textPrimary}; font-size:14px; line-height:1.8;">
                  <li style="margin-bottom:8px;">Visit our booking page and select your desired service</li>
                  <li style="margin-bottom:8px;">Enter your gift card code in the "Gift Card Code" field during checkout</li>
                  <li style="margin-bottom:8px;">The gift card balance will be automatically applied to your booking</li>
                  <li style="margin-bottom:8px;">If the gift card doesn't cover the full amount, you can pay the remaining balance</li>
                </ol>
              </div>

              <p style="margin:0 0 18px 0; font-size:14px; color:${textSecondary};">
                Questions about your gift card? Reply to this email or contact us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:13px; color:${textSecondary};">We can't wait to see you!</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:${brand}; font-weight:600;">🤎 The LashDiary Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function createGiftCardRecipientSurpriseEmailTemplate(card: GiftCard) {
  const { background, card: cardBg, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  const recipientName = card.recipient?.name || card.recipient?.email?.split('@')[0] || 'Friend'
  const purchaserName = card.purchasedBy.name
  const expiresDate = new Date(card.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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
  const bookingLink = `${BASE_URL}/booking/gift-card?code=${card.code}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Surprise! You Have a Gift Card!</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background:${background}; font-family: 'DM Serif Text', Georgia, serif; color:${textPrimary};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${background}; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:${cardBg}; border-radius:18px; border:2px solid ${brand}; overflow:hidden; box-shadow:0 12px 32px rgba(124,75,49,0.12);">
          <tr>
            <td style="padding:32px 32px 16px 32px; text-align:center; background:linear-gradient(135deg, ${brand} 0%, ${brand}dd 100%);">
              <p style="margin:0; text-transform:uppercase; letter-spacing:4px; font-size:12px; color:#FFFFFF;">SURPRISE!</p>
              <h1 style="margin:16px 0 0 0; font-size:40px; color:#FFFFFF; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-weight:700; line-height:1.2; letter-spacing:0.5px;">You Have a Gift Card!</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 24px 32px;">
              <p style="margin:0 0 20px 0; font-size:18px; line-height:1.7; color:${textPrimary}; text-align:center;">
                <strong>${recipientName}</strong>, someone special thinks you deserve beautiful lashes!
              </p>

              ${card.recipient?.message ? `
              <div style="border-radius:14px; padding:20px 24px; background:${background}; border-left:4px solid ${brand}; margin-bottom:24px; font-style:italic;">
                <p style="margin:0; font-size:16px; line-height:1.6; color:${textPrimary};">
                  "${card.recipient.message}"
                </p>
                ${card.recipient.name || purchaserName ? `
                <p style="margin:12px 0 0 0; font-size:14px; color:${textSecondary}; text-align:right; font-style:normal;">
                  — ${purchaserName}
                </p>
                ` : ''}
              </div>
              ` : card.recipient?.name || purchaserName ? `
              <p style="margin:0 0 24px 0; font-size:16px; line-height:1.6; color:${textSecondary}; text-align:center;">
                From: <strong style="color:${textPrimary};">${purchaserName}</strong>
              </p>
              ` : ''}

              <div style="border-radius:14px; padding:24px; background:linear-gradient(135deg, ${brand}15 0%, ${accent}40 100%); border:3px solid ${brand}; margin-bottom:24px; text-align:center;">
                <p style="margin:0 0 12px 0; font-size:14px; color:${textSecondary}; text-transform:uppercase; letter-spacing:2px; font-weight:600;">Your Gift Card Code</p>
                <p style="margin:0 0 20px 0; font-size:36px; font-family:monospace; font-weight:bold; color:${brand}; letter-spacing:6px;">
                  ${card.code}
                </p>
                <p style="margin:0; font-size:24px; color:${textPrimary}; font-weight:700;">
                  ${card.amount.toLocaleString()} KSH
                </p>
              </div>

              <div style="border-radius:14px; padding:20px 24px; background:${cardBg}; border:1px solid ${accent}; margin-bottom:24px;">
                <h2 style="margin:0 0 16px 0; font-size:20px; color:${brand}; text-align:center;">How to Use Your Gift Card</h2>
                <ol style="margin:0; padding-left:24px; color:${textPrimary}; font-size:15px; line-height:2;">
                  <li style="margin-bottom:10px;">Click the button below to book your appointment</li>
                  <li style="margin-bottom:10px;">Select your preferred date and time</li>
                  <li style="margin-bottom:10px;">Your gift card will be automatically applied</li>
                  <li style="margin-bottom:10px;">Enjoy your beautiful lashes!</li>
                </ol>
              </div>

              <div style="text-align:center; margin:28px 0;">
                <a href="${bookingLink}" style="display:inline-block; padding:18px 48px; background:${brand}; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:700; font-size:18px; letter-spacing:0.5px; box-shadow:0 8px 24px rgba(124,75,49,0.3); transition:all 0.3s;">
                  Book Your Appointment Now →
                </a>
              </div>

              <div style="border-radius:14px; padding:18px 20px; background:${cardBg}; border:1px solid ${accent}; margin-top:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px; line-height:1.6;">
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Valid Until</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600; text-align:right;">${expiresDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0; color:${textSecondary};">Amount</td>
                    <td style="padding:6px 0; color:${textPrimary}; font-weight:600; text-align:right;">${card.amount.toLocaleString()} KSH</td>
                  </tr>
                </table>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; color:${textSecondary}; text-align:center; line-height:1.6;">
                Questions? Reply to this email or contact us at <a href="mailto:${OWNER_EMAIL}" style="color:${brand}; text-decoration:none; font-weight:600;">${OWNER_EMAIL}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px; background:${background}; text-align:center;">
              <p style="margin:0; font-size:14px; color:${textSecondary};">We can't wait to make you feel beautiful!</p>
              <p style="margin:4px 0 0 0; font-size:15px; color:${brand}; font-weight:600;">🤎 The LashDiary Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export async function sendGiftCardPurchaseEmail(card: GiftCard) {
  if (!zohoTransporter) {
    console.warn('Email transporter not configured. Skipping gift card purchase email.')
    return { success: false, error: 'Email not configured' }
  }

  console.log('📧 Starting gift card email sending process:', {
    cardCode: card.code,
    purchaserEmail: card.purchasedBy.email,
    recipientEmail: card.recipient?.email || 'none',
    hasRecipient: !!card.recipient,
  })

  try {
    const htmlContent = createGiftCardPurchaseEmailTemplate(card)

    // Send to purchaser
    const purchaserMailOptions = {
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: card.purchasedBy.email,
      subject: 'Your Gift Card Purchase is Complete 🤎',
      html: htmlContent,
    }

    const purchaserInfo = await zohoTransporter.sendMail(purchaserMailOptions)
    console.log('✅ Gift card purchase email sent to purchaser:', card.purchasedBy.email, 'Message ID:', purchaserInfo.messageId)

    // Send surprise email to recipient if different
    const recipientEmail = card.recipient?.email?.trim()
    if (recipientEmail) {
      // Normalize emails for comparison (case-insensitive)
      const recipientEmailNormalized = recipientEmail.toLowerCase()
      const purchaserEmailNormalized = card.purchasedBy.email.trim().toLowerCase()
      
      console.log('🔍 Checking recipient email:', {
        recipientEmail: recipientEmail,
        purchaserEmail: card.purchasedBy.email,
        areDifferent: recipientEmailNormalized !== purchaserEmailNormalized,
      })
      
      if (recipientEmailNormalized !== purchaserEmailNormalized) {
        try {
          console.log('📨 Preparing to send surprise email to recipient:', recipientEmail)
          const recipientHtmlContent = createGiftCardRecipientSurpriseEmailTemplate(card)
          const recipientMailOptions = {
            from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
            to: recipientEmail,
            subject: 'Someone Special Sent You a Gift! 🤎',
            html: recipientHtmlContent,
          }

          console.log('📤 Sending recipient email to:', recipientEmail)
          const recipientInfo = await zohoTransporter.sendMail(recipientMailOptions)
          console.log('✅ Gift card surprise email sent to recipient:', recipientEmail, 'Message ID:', recipientInfo.messageId)
          
          return { 
            success: true, 
            messageId: purchaserInfo.messageId,
            recipientMessageId: recipientInfo.messageId,
            recipientEmail: recipientEmail,
          }
        } catch (recipientEmailError: any) {
          console.error('❌ Error sending recipient email:', {
            recipientEmail: recipientEmail,
            error: recipientEmailError.message,
            stack: recipientEmailError.stack,
            code: recipientEmailError.code,
            response: recipientEmailError.response,
          })
          // Don't fail the whole operation if recipient email fails
          return { 
            success: true, 
            messageId: purchaserInfo.messageId,
            recipientError: recipientEmailError.message,
          }
        }
      } else {
        console.log('ℹ️ Skipping recipient email - recipient email matches purchaser email:', recipientEmail)
      }
    } else {
      console.log('ℹ️ No recipient email provided or recipient email is empty. Recipient object:', card.recipient)
    }

    return { success: true, messageId: purchaserInfo.messageId }
  } catch (error: any) {
    console.error('❌ Error sending gift card purchase email:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
    })
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

