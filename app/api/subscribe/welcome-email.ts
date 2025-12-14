import nodemailer from 'nodemailer'
import { readDataFile } from '@/lib/data-utils'

// CRITICAL: Email templates always read fresh data - no caching
// This ensures emails always show current homepage features, settings, etc.

function normalizeBaseUrl(): string {
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
}

const BASE_URL = normalizeBaseUrl()
const rawFromName = process.env.EMAIL_FROM_NAME || 'The LashDiary'
const EMAIL_FROM_NAME = rawFromName === 'LashDiary' ? 'The LashDiary' : rawFromName
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
  'hello@lashdiary.co.ke'
const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  ZOHO_FROM_EMAIL ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : 'hello@lashdiary.co.ke')

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

async function createWelcomeEmailTemplate(data: { name: string; promoCode: string; unsubscribeToken: string; discountPercentage: number }) {
  const { name, promoCode, unsubscribeToken, discountPercentage } = data
  const { background, card, accent, textPrimary, textSecondary, brand } = EMAIL_STYLES
  
  // Load homepage features dynamically
  let homepageFeatures: Array<{ title: string; description: string }> = []
  try {
    const homepageData = await readDataFile<any>('homepage.json', {})
    homepageFeatures = Array.isArray(homepageData?.features) ? homepageData.features : []
  } catch (error) {
    console.warn('Could not load homepage features for email, using defaults:', error)
  }
  
  // Fallback to default features if none found
  if (homepageFeatures.length === 0) {
    homepageFeatures = [
      {
        title: 'Retention That Actually Retains',
        description: 'Your lashes should last as long as you want them to. With meticulous prep, precise isolation, and high-quality adhesive, I ensure your set stays full, flawless, and low-maintenance. Less fallout, less stress.'
      },
      {
        title: 'Tsuboki Facial Massage to Complement Your Look',
        description: 'Every lash session includes a Tsuboki-inspired facial massage that relaxes, refreshes, and gives your eyes a subtle lift. It\'s the perfect little boost to complement your lashes and leave your face glowing.'
      },
      {
        title: 'Precision Lash Mapping for Your Unique Face',
        description: 'No one-size-fits-all here. Using your face shape and eye anatomy, I create a personalized lash map so you\'ll know exactly what style suits you best. It\'s clarity, customization, and confidence in every set.'
      },
      {
        title: 'A Calm, Intentional Studio Space',
        description: 'This isn\'t a noisy salon. My space is quiet, clean, and aesthetic. Designed for comfort and relaxation. Breathe, unwind, and maybe even sneak in the best mini-break of your day.'
      }
    ]
  }
  
  // Generate features HTML
  const featuresHTML = homepageFeatures.map((feature, index) => {
    const isLast = index === homepageFeatures.length - 1
    return `
                <div style="margin-bottom:${isLast ? '0' : '20px'}; padding-bottom:${isLast ? '0' : '20px'}; border-bottom:${isLast ? 'none' : `1px solid ${accent}`};">
                  <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:${brand};">
                    ${String(index + 1).padStart(2, '0')} · ${feature.title}
                  </p>
                  <p style="margin:0; font-size:15px; line-height:1.7; color:${textSecondary};">
                    ${feature.description}
                  </p>
                </div>
    `.trim()
  }).join('\n')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LashDiary!</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Serif+Text&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; font-family: 'DM Serif Text', Georgia, serif; background-color:${background};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${background}; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:${card}; border-radius:24px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${brand} 0%, #9A5B3A 100%); padding:48px 32px 40px 32px; text-align:center;">
              <div style="font-size:48px; margin-bottom:16px;">🤎</div>
              <h1 style="margin:0; font-size:32px; font-weight:600; color:#FFFFFF; font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; letter-spacing:0.5px;">Your Exclusive Discount Awaits!</h1>
              <p style="margin:12px 0 0 0; font-size:18px; color:#FFFFFF; opacity:0.95;">We're so excited to have you, ${name}!</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:40px 32px;">
              
              <!-- Welcome Message -->
              <p style="margin:0 0 24px 0; font-size:17px; line-height:1.7; color:${textPrimary};">
                Thank you for joining our newsletter! I'm so excited to share my latest lash looks, special offers, and beauty tips with you.
              </p>

              <!-- Promo Code Box -->
              <div style="background: linear-gradient(135deg, ${accent} 0%, #F9EDE3 100%); border:2px dashed ${brand}; border-radius:20px; padding:32px 24px; text-align:center; margin:32px 0;">
                <p style="margin:0 0 12px 0; font-size:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:${textSecondary};">
                  ✨ Your Exclusive Discount
                </p>
                <div style="margin:16px 0;">
                  <p style="margin:0 0 8px 0; font-size:20px; font-weight:600; color:${textPrimary};">
                    Get ${discountPercentage}% OFF
                  </p>
                  <p style="margin:0; font-size:16px; color:${textSecondary};">
                    👁️ Your First Lash Appointment
                  </p>
                </div>
                <div style="background:${card}; border-radius:12px; padding:20px; margin:20px 0; border:2px solid ${brand};">
                  <p style="margin:0 0 8px 0; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.15em; color:${textSecondary};">
                    Use Code:
                  </p>
                  <p style="margin:0; font-size:32px; font-weight:bold; color:${brand}; letter-spacing:0.1em; font-family: 'Courier New', monospace;">
                    ${promoCode}
                  </p>
                </div>
                <p style="margin:16px 0 0 0; font-size:13px; color:${textSecondary}; line-height:1.6;">
                  Valid for first-time clients only. One use per customer.
                </p>
                <p style="margin:12px 0 0 0; font-size:13px; color:${brand}; font-weight:600; line-height:1.6;">
                  ⏰ This code will be effective for 40 days after you join The LashDiary.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center; margin:32px 0;">
                <a href="${BASE_URL}/booking" style="display:inline-block; padding:16px 40px; background:${brand}; color:#FFFFFF; text-decoration:none; border-radius:999px; font-weight:600; font-size:16px; box-shadow: 0 4px 12px rgba(124, 75, 49, 0.3); transition: all 0.3s ease;">
                  📅 Book Your Appointment Now
                </a>
              </div>

              <!-- Business Features Section -->
              <div style="background:${background}; border-radius:16px; padding:24px; margin:24px 0;">
                <p style="margin:0 0 20px 0; font-size:15px; font-weight:600; color:${textPrimary}; text-align:center;">
                  What Makes LashDiary Special
                </p>
                
                ${featuresHTML}
              </div>

              <!-- Closing Message -->
              <p style="margin:24px 0 0 0; font-size:16px; line-height:1.7; color:${textPrimary};">
                I'm here to help you look and feel your absolute best. If you have any questions, feel free to reach out – I'd love to chat!
              </p>
              <p style="margin:20px 0 0 0; font-size:16px; color:${textPrimary};">
                Sending you lots of lash love!
              </p>
              <p style="margin:8px 0 0 0; font-size:16px; font-weight:600; color:${brand};">
                🤎 The LashDiary Team
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px; background:${background}; text-align:center; border-top:1px solid ${accent};">
              <p style="margin:0 0 12px 0; font-size:13px; color:${textSecondary};">
                <a href="${BASE_URL}" style="color:${brand}; text-decoration:none;">LashDiary</a> | Luxury Lash Services
              </p>
              <p style="margin:0; font-size:12px; color:${textSecondary};">
                You're receiving this because you subscribed to our newsletter.
              </p>
              <p style="margin:12px 0 0 0; font-size:12px;">
                <a href="${BASE_URL}/unsubscribe/${unsubscribeToken}" style="color:${textSecondary}; text-decoration:underline;">Unsubscribe</a>
              </p>
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

export async function sendWelcomeEmail(data: { email: string; name: string; promoCode: string; unsubscribeToken: string; discountPercentage: number }) {
  const { email, name, promoCode, unsubscribeToken, discountPercentage } = data

  if (!zohoTransporter) {
    console.warn('Email transporter not configured. Skipping welcome email.')
    return
  }

  // Load homepage features for plain text email
  let homepageFeatures: Array<{ title: string; description: string }> = []
  try {
    const homepageData = await readDataFile<any>('homepage.json', {})
    homepageFeatures = Array.isArray(homepageData?.features) ? homepageData.features : []
  } catch (error) {
    console.warn('Could not load homepage features for email, using defaults:', error)
  }
  
  // Fallback to default features if none found
  if (homepageFeatures.length === 0) {
    homepageFeatures = [
      {
        title: 'Retention That Actually Retains',
        description: 'Your lashes should last as long as you want them to. With meticulous prep, precise isolation, and high-quality adhesive, I ensure your set stays full, flawless, and low-maintenance. Less fallout, less stress.'
      },
      {
        title: 'Tsuboki Facial Massage to Complement Your Look',
        description: 'Every lash session includes a Tsuboki-inspired facial massage that relaxes, refreshes, and gives your eyes a subtle lift. It\'s the perfect little boost to complement your lashes and leave your face glowing.'
      },
      {
        title: 'Precision Lash Mapping for Your Unique Face',
        description: 'No one-size-fits-all here. Using your face shape and eye anatomy, I create a personalized lash map so you\'ll know exactly what style suits you best. It\'s clarity, customization, and confidence in every set.'
      },
      {
        title: 'A Calm, Intentional Studio Space',
        description: 'This isn\'t a noisy salon. My space is quiet, clean, and aesthetic. Designed for comfort and relaxation. Breathe, unwind, and maybe even sneak in the best mini-break of your day.'
      }
    ]
  }

  const html = await createWelcomeEmailTemplate({ name, promoCode, unsubscribeToken, discountPercentage })
  
  // Generate plain text features section
  const featuresText = homepageFeatures.map((feature, index) => 
    `${String(index + 1).padStart(2, '0')} · ${feature.title}\n${feature.description}`
  ).join('\n\n')

  try {
    const info = await zohoTransporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome! Your Exclusive Discount Code Awaits',
      html,
      text: `
Welcome to LashDiary, ${name}!

Thank you for joining our newsletter! We're so excited to have you.

Your Exclusive Discount:
Get ${discountPercentage}% OFF your first lash appointment!

Use Code: ${promoCode}

Valid for first-time clients only. One use per customer.
⏰ This code will be effective for 40 days after you join The LashDiary.

Book your appointment now: ${BASE_URL}/booking

What Makes LashDiary Special:

${featuresText}

We're here to help you look and feel your absolute best. If you have any questions, feel free to reach out – we'd love to chat!

Sending you lots of lash love,
The LashDiary Team

---
You're receiving this because you subscribed to our newsletter.
Unsubscribe: ${BASE_URL}/unsubscribe/${unsubscribeToken}
      `.trim(),
    })

    console.log('Welcome email sent:', info.messageId)
    return info
  } catch (error) {
    console.error('Error sending welcome email:', error)
    throw error
  }
}

