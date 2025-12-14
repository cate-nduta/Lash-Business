import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { normalizePromoCatalog } from '@/lib/promo-utils'
import type { ClientUsersData, ClientData } from '@/types/client'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'

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
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'

// Check if today is someone's birthday
function isBirthdayToday(birthday: string): boolean {
  const today = new Date()
  const birthDate = new Date(birthday)
  
  // Compare month and day only (ignore year)
  return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate()
}

// Generate birthday discount code
function generateBirthdayCode(): string {
  const random = randomBytes(4).toString('hex').toUpperCase()
  return `BDAY${random}`
}

// Create birthday email template
function createBirthdayEmailTemplate(name: string, discountCode: string, expiryDate: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #FDF9F4;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDF9F4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color: #FFFFFF; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:40px 32px; text-align:center; background: linear-gradient(135deg, #F3E6DC 0%, #FFFFFF 100%); border-radius:12px 12px 0 0;">
              <h1 style="margin:0 0 12px 0; font-size:32px; color:#3E2A20; font-weight:bold;">A Special Gift Just For You!</h1>
              <p style="margin:0; font-size:18px; color:#6B4A3B;">We're celebrating you today!</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px 0; font-size:16px; color:#3E2A20; line-height:1.6;">
                As a special thank you for being part of the LashDiary family, we're giving you an exclusive birthday gift!
              </p>
              
              <div style="background-color:#F3E6DC; border-radius:8px; padding:24px; text-align:center; margin:24px 0;">
                <p style="margin:0 0 12px 0; font-size:14px; color:#6B4A3B; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Your Birthday Discount</p>
                <p style="margin:0 0 16px 0; font-size:36px; color:#7C4B31; font-weight:bold;">12% OFF</p>
                <p style="margin:0 0 20px 0; font-size:18px; color:#3E2A20; font-weight:600;">Use Code: <span style="background-color:#FFFFFF; padding:8px 16px; border-radius:6px; font-family:monospace; letter-spacing:2px;">${discountCode}</span></p>
                <p style="margin:0; font-size:14px; color:#6B4A3B;">Valid until ${expiryDate}</p>
              </div>
              
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;">
                <tr>
                  <td align="center" style="padding:0;">
                    <a href="${BASE_URL}/booking" style="display:inline-block; padding:14px 32px; background-color:#7C4B31; color:#FFFFFF; border-radius:999px; text-decoration:none; font-weight:600; font-size:16px;">Book Your Appointment</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:24px 0 0 0; font-size:14px; color:#6B4A3B; line-height:1.6;">
                Treat yourself to a fresh set of lashes or a refill. This discount is our way of making your special day even more beautiful!
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding:24px 32px; background-color:#FDF9F4; text-align:center; border-radius:0 0 12px 12px;">
              <p style="margin:0; font-size:13px; color:#6B4A3B;">We hope your day is as beautiful as you are!</p>
              <p style="margin:4px 0 0 0; font-size:14px; color:#7C4B31; font-weight:600;">🤎 The LashDiary Team</p>
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
      return NextResponse.json(
        { error: 'Email service not configured. Please set up ZOHO_SMTP credentials.' },
        { status: 500 }
      )
    }

    const today = new Date()
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const rawPromoData = await readDataFile<any>('promo-codes.json', { promoCodes: [] })
    
    // Normalize promo codes to ensure correct structure
    const { catalog: promoCatalog } = normalizePromoCatalog(rawPromoData)
    
    let sentCount = 0
    let failedCount = 0
    const results: Array<{ email: string; success: boolean; error?: string }> = []

    for (const user of usersData.users) {
      if (!user.isActive || !user.birthday) continue

      // Check if today is their birthday
      if (!isBirthdayToday(user.birthday)) continue

      // Generate discount code
      const discountCode = generateBirthdayCode()
      const expiryDate = new Date(today)
      expiryDate.setDate(expiryDate.getDate() + 7) // Valid for 7 days
      
      const expiryDateStr = expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Create promo code (using correct structure)
      const promoCode = {
        code: discountCode,
        discountType: 'percentage' as const,
        discountValue: 12,
        description: `Birthday discount for ${user.name}`,
        validFrom: today.toISOString().split('T')[0],
        validUntil: expiryDate.toISOString().split('T')[0],
        usageLimit: 1,
        usedCount: 0,
        active: true,
        autoGenerated: true,
        usedByEmails: [],
      }

      promoCatalog.promoCodes.push(promoCode)

      // Send email
      try {
        const emailHtml = createBirthdayEmailTemplate(user.name, discountCode, expiryDateStr)
        
        await zohoTransporter.sendMail({
          from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
          to: user.email,
          subject: `Happy Birthday! Your Special 12% Discount Awaits! 🤎`,
          html: emailHtml,
        })

        sentCount++
        results.push({ email: user.email, success: true })
      } catch (emailError: any) {
        failedCount++
        results.push({
          email: user.email,
          success: false,
          error: emailError.message || 'Failed to send email',
        })
        console.error(`Failed to send birthday email to ${user.email}:`, emailError)
        // Remove the promo code if email failed
        promoCatalog.promoCodes = promoCatalog.promoCodes.filter((p: any) => p.code !== discountCode)
      }
    }

    // Save all promo codes at once
    await writeDataFile('promo-codes.json', promoCatalog)

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      results,
    })
  } catch (error: any) {
    console.error('Birthday email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send birthday emails' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// GET endpoint to check for birthdays (can be called by cron)
export async function GET(request: NextRequest) {
  try {
    // Allow unauthenticated access for cron jobs (you may want to add a secret token)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-token'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      // For manual testing, allow admin auth
      try {
        await requireAdminAuth()
      } catch {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const today = new Date()
    const usersData = await readDataFile<ClientUsersData>('users.json', { users: [] })
    const birthdaysToday: Array<{ name: string; email: string; birthday: string }> = []

    for (const user of usersData.users) {
      if (!user.isActive || !user.birthday) continue
      if (isBirthdayToday(user.birthday)) {
        birthdaysToday.push({
          name: user.name,
          email: user.email,
          birthday: user.birthday,
        })
      }
    }

    return NextResponse.json({
      today: today.toISOString().split('T')[0],
      birthdaysFound: birthdaysToday.length,
      birthdays: birthdaysToday,
    })
  } catch (error: any) {
    console.error('Check birthdays error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check birthdays' },
      { status: 500 }
    )
  }
}

