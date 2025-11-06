import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

interface Booking {
  email: string
  name: string
  date: string
}

interface EmailCampaign {
  id: string
  subject: string
  content: string
  recipientType: 'all' | 'first-time' | 'returning'
  sentAt: string | null
  createdAt: string
  totalRecipients: number
  opened: number
  clicked: number
  notOpened: number
}

function createEmailTemplate(content: string, campaignId: string, recipientEmail: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LashDiary</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F9D0DE;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9D0DE; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #F9D0DE; padding: 40px 30px; text-align: center; border-bottom: 2px solid #733D26;">
              <h1 style="color: #733D26; margin: 0; font-size: 32px; font-weight: bold;">LashDiary</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                ${content.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9D0DE; padding: 30px; text-align: center; border-top: 2px solid #733D26;">
              <p style="color: #733D26; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">With love and gratitude,</p>
              <p style="color: #733D26; font-size: 16px; font-weight: bold; margin: 0;">The LashDiary Team</p>
              <p style="color: #733D26; font-size: 12px; margin: 20px 0 0 0;">
                <a href="${BASE_URL}" style="color: #733D26; text-decoration: none;">Visit Our Website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <!-- Tracking Pixel -->
  <img src="${BASE_URL}/api/admin/email-marketing/track/open?campaign=${campaignId}&email=${encodeURIComponent(recipientEmail)}" width="1" height="1" style="display: none;" />
</body>
</html>
  `.trim()
}

function processLinks(content: string, campaignId: string, recipientEmail: string): string {
  // Replace all links with tracking URLs
  const linkRegex = /<a\s+href=["']([^"']+)["']([^>]*)>/gi
  return content.replace(linkRegex, (match, url, attributes) => {
    const trackingUrl = `${BASE_URL}/api/admin/email-marketing/track/click?campaign=${campaignId}&email=${encodeURIComponent(recipientEmail)}&url=${encodeURIComponent(url)}`
    return `<a href="${trackingUrl}"${attributes}>`
  })
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { subject, content, recipientType } = body

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      )
    }

    // Get customers based on recipient type
    const bookingsData = readDataFile<{ bookings: Booking[] }>('bookings.json')
    const bookings = bookingsData.bookings || []
    
    const customerMap = new Map<string, { email: string; name: string; totalBookings: number }>()
    
    bookings.forEach(booking => {
      const existing = customerMap.get(booking.email)
      if (existing) {
        existing.totalBookings += 1
      } else {
        customerMap.set(booking.email, {
          email: booking.email,
          name: booking.name,
          totalBookings: 1,
        })
      }
    })

    let recipients: Array<{ email: string; name: string }> = []
    
    if (recipientType === 'all') {
      recipients = Array.from(customerMap.values()).map(c => ({ email: c.email, name: c.name }))
    } else if (recipientType === 'first-time') {
      recipients = Array.from(customerMap.values())
        .filter(c => c.totalBookings === 1)
        .map(c => ({ email: c.email, name: c.name }))
    } else if (recipientType === 'returning') {
      recipients = Array.from(customerMap.values())
        .filter(c => c.totalBookings > 1)
        .map(c => ({ email: c.email, name: c.name }))
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for the selected type' },
        { status: 400 }
      )
    }

    // Create campaign record
    const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const campaign: EmailCampaign = {
      id: campaignId,
      subject,
      content,
      recipientType,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      totalRecipients: recipients.length,
      opened: 0,
      clicked: 0,
      notOpened: recipients.length,
    }

    // Save campaign
    const campaignsData = readDataFile<{ campaigns: EmailCampaign[] }>('email-campaigns.json')
    const campaigns = campaignsData.campaigns || []
    campaigns.push(campaign)
    writeDataFile('email-campaigns.json', { campaigns })

    // Send emails
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const processedContent = processLinks(content, campaignId, recipient.email)
        const emailHtml = createEmailTemplate(processedContent, campaignId, recipient.email)
        
        await resend.emails.send({
          from: `LashDiary <${FROM_EMAIL}>`,
          to: recipient.email,
          subject: subject,
          html: emailHtml,
        })
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error)
      }
    })

    await Promise.all(emailPromises)

    return NextResponse.json({
      success: true,
      recipientsCount: recipients.length,
      campaignId,
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error sending email campaign:', error)
    return NextResponse.json(
      { error: 'Failed to send email campaign' },
      { status: 500 }
    )
  }
}

