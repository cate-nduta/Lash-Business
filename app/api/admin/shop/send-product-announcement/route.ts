import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { loadSubscribers, loadUnsubscribes, filterRecipients, getBusinessSettings, ensureUnsubscribeToken } from '@/lib/email-campaign-utils'
import nodemailer from 'nodemailer'

const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
const ZOHO_SMTP_USER = process.env.ZOHO_SMTP_USER || process.env.ZOHO_SMTP_USERNAME || process.env.ZOHO_USERNAME || ''
const ZOHO_SMTP_PASS = process.env.ZOHO_SMTP_PASS || process.env.ZOHO_SMTP_PASSWORD || process.env.ZOHO_APP_PASSWORD || ''
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_FROM || (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : '')
const FROM_EMAIL = process.env.FROM_EMAIL || ZOHO_FROM_EMAIL || 'hello@lashdiary.co.ke'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

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

interface ProductAnnouncementRequest {
  productName: string
  productDescription?: string
  productPrice: number
  productImageUrl?: string
  productLink?: string
  subject: string
  header: string
  benefits: string[]
  body?: string
}

function createProductEmailTemplate(data: {
  productName: string
  productDescription?: string
  productPrice: number
  productImageUrl?: string
  productLink?: string
  header: string
  benefits: string[]
  body?: string
  unsubscribeLink: string
}) {
  const { productName, productDescription, productPrice, productImageUrl, productLink, header, benefits, body, unsubscribeLink } = data
  
  const shopLink = productLink || `${BASE_URL}/shop`
  const formattedPrice = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(productPrice)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Product: ${productName}</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FDF9F4;">
  <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#FDF9F4;">
    <tr>
      <td style="padding:40px 20px; text-align:center;">
        <table role="presentation" style="max-width:600px; margin:0 auto; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:40px 32px 32px; text-align:center; background:linear-gradient(135deg, #F3E6DC 0%, #E8D5C4 100%);">
              <h1 style="margin:0 0 12px 0; font-size:28px; font-weight:600; color:#3E2A20; line-height:1.3;">
                ${header}
              </h1>
            </td>
          </tr>

          <!-- Product Image -->
          ${productImageUrl ? `
          <tr>
            <td style="padding:0;">
              <img src="${productImageUrl}" alt="${productName}" style="width:100%; max-width:600px; height:auto; display:block;" />
            </td>
          </tr>
          ` : ''}

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 24px 0; font-size:16px; color:#3E2A20; line-height:1.6;">
                Hey there!
              </p>
              
              <p style="margin:0 0 24px 0; font-size:16px; color:#3E2A20; line-height:1.6;">
                We've got a little secret… and it's too good to keep to ourselves.
              </p>

              <div style="background-color:#FDF9F4; border-left:4px solid #7C4B31; padding:20px; margin:24px 0; border-radius:8px;">
                <h2 style="margin:0 0 12px 0; font-size:22px; font-weight:600; color:#7C4B31;">
                  Introducing ${productName}
                </h2>
                ${productDescription ? `
                <p style="margin:0 0 16px 0; font-size:15px; color:#6B4A3B; line-height:1.6;">
                  ${productDescription}
                </p>
                ` : ''}
                <p style="margin:0; font-size:18px; font-weight:600; color:#3E2A20;">
                  ${formattedPrice}
                </p>
              </div>

              ${body ? `
              <p style="margin:0 0 24px 0; font-size:16px; color:#3E2A20; line-height:1.6;">
                ${body}
              </p>
              ` : ''}

              ${benefits.length > 0 ? `
              <div style="margin:32px 0;">
                <h3 style="margin:0 0 16px 0; font-size:18px; font-weight:600; color:#3E2A20;">
                  Why you'll love it:
                </h3>
                <ul style="margin:0; padding-left:24px; color:#3E2A20; font-size:15px; line-height:1.8;">
                  ${benefits.map(benefit => `<li style="margin-bottom:12px;">${benefit}</li>`).join('')}
                </ul>
              </div>
              ` : ''}

              <p style="margin:24px 0; font-size:15px; color:#6B4A3B; line-height:1.6;">
                Don't sleep on this—our new arrivals have a way of flying off the shelf (or out of the DMs).
              </p>

              <!-- CTA Button -->
              <div style="text-align:center; margin:32px 0;">
                <a href="${shopLink}" style="display:inline-block; padding:16px 40px; background-color:#7C4B31; color:#FFFFFF; text-decoration:none; border-radius:999px; font-weight:600; font-size:16px; letter-spacing:0.02em;">
                  Grab yours now
                </a>
              </div>

              <p style="margin:24px 0 0 0; font-size:14px; color:#6B4A3B; line-height:1.6; font-style:italic;">
                P.S. Go on, treat yourself. You deserve it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; background-color:#F3E6DC; text-align:center; border-top:1px solid #E8D5C4;">
              <p style="margin:0 0 8px 0; font-size:13px; color:#6B4A3B;">
                🤎 The LashDiary Team
              </p>
              <p style="margin:0; font-size:12px; color:#6B4A3B;">
                <a href="${unsubscribeLink}" style="color:#6B4A3B; text-decoration:underline;">Unsubscribe</a>
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

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    if (!zohoTransporter) {
      return NextResponse.json({ 
        error: 'Email service not configured. Please set ZOHO_SMTP_USER and ZOHO_SMTP_PASS in your environment variables.' 
      }, { status: 500 })
    }

    const body: ProductAnnouncementRequest = await request.json()
    const { productName, productDescription, productPrice, productImageUrl, productLink, subject, header, benefits, body: emailBody } = body

    if (!productName || !subject || !header) {
      return NextResponse.json(
        { error: 'Product name, subject, and header are required' },
        { status: 400 }
      )
    }

    // Load subscribers - get everyone from the database
    const subscribers = await loadSubscribers()
    
    if (!Array.isArray(subscribers)) {
      console.error('Subscribers is not an array:', typeof subscribers)
      return NextResponse.json({ 
        error: 'Subscribers data is invalid. Expected an array.' 
      }, { status: 400 })
    }
    
    if (subscribers.length === 0) {
      return NextResponse.json({ 
        error: 'No subscribers found in database. Make sure you have bookings or manual subscribers added.' 
      }, { status: 400 })
    }

    // Get all recipients (everyone in database)
    let recipients = filterRecipients('all', subscribers)
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ 
        error: `No recipients found. Total subscribers: ${subscribers.length}` 
      }, { status: 400 })
    }

    // Filter out invalid recipients (missing email)
    recipients = recipients.filter(
      (recipient) => recipient && recipient.email && typeof recipient.email === 'string' && recipient.email.trim().length > 0
    )

    if (recipients.length === 0) {
      return NextResponse.json({ 
        error: 'No recipients with valid email addresses found.' 
      }, { status: 400 })
    }

    // Load unsubscribes to exclude them (only those with unsubscribedAt set)
    const unsubscribeRecords = await loadUnsubscribes()
    const unsubscribedSet = new Set(
      Array.isArray(unsubscribeRecords)
        ? unsubscribeRecords
            .filter((record) => record.unsubscribedAt && record.email)
            .map((record) => record.email.toLowerCase())
        : []
    )

    // Filter out unsubscribed emails
    recipients = recipients.filter(
      (recipient) => !unsubscribedSet.has(recipient.email.toLowerCase())
    )

    if (recipients.length === 0) {
      return NextResponse.json({ 
        error: `All subscribers have unsubscribed. No valid recipients to send to.` 
      }, { status: 400 })
    }

    // Get business settings for unsubscribe link
    const businessSettings = await getBusinessSettings()

    // Create base email content (we'll personalize unsubscribe links per recipient)
    const baseUnsubscribeLink = `${BASE_URL}/api/admin/email-marketing/unsubscribe?token=TOKEN&email=EMAIL`

    // Send emails
    const emailPromises = recipients.map(async (recipient) => {
      const unsubscribeToken = ensureUnsubscribeToken(recipient.email)
      const personalUnsubscribeLink = `${BASE_URL}/api/admin/email-marketing/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(recipient.email)}`
      
      const emailContent = createProductEmailTemplate({
        productName,
        productDescription,
        productPrice,
        productImageUrl,
        productLink: productLink || `${BASE_URL}/shop`,
        header,
        benefits: Array.isArray(benefits) ? benefits.filter(b => b.trim().length > 0) : [],
        body: emailBody,
        unsubscribeLink: personalUnsubscribeLink,
      })

      return zohoTransporter.sendMail({
        from: `"${businessSettings.name || 'The LashDiary'}" <${FROM_EMAIL}>`,
        to: recipient.email,
        subject: subject.includes('🤎') ? subject : `${subject} 🤎`,
        html: emailContent,
      })
    })

    await Promise.all(emailPromises)

    return NextResponse.json({
      success: true,
      message: `Product announcement sent to ${recipients.length} subscribers`,
      recipientsCount: recipients.length,
    })
  } catch (error: any) {
    console.error('Error sending product announcement:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send product announcement' },
      { status: 500 }
    )
  }
}


