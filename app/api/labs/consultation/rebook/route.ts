import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import type { ConsultationSubmission } from '@/app/api/labs/consultation/route'
import {
  sanitizeText,
  sanitizeOptionalText,
  ValidationError,
} from '@/lib/input-validation'
import {
  getZohoTransporter,
  isZohoConfigured,
  BUSINESS_NOTIFICATION_EMAIL,
  FROM_EMAIL,
  EMAIL_FROM_NAME,
} from '@/lib/email/zoho-config'
import { formatCurrency, type Currency } from '@/lib/currency-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatTime(timeStr: string): string {
  const timeMap: Record<string, string> = {
    morning: '9:00 AM - 12:00 PM',
    afternoon: '12:00 PM - 4:00 PM',
    evening: '4:00 PM - 7:00 PM',
  }
  return timeMap[timeStr] || timeStr
}

async function sendRebookingEmail(data: ConsultationSubmission, originalDate: string, originalTime: string) {
  if (!isZohoConfigured()) {
    console.warn('Zoho email not configured, skipping email notification')
    return
  }

  const transporter = getZohoTransporter()
  if (!transporter) {
    console.warn('Email transporter not available')
    return
  }

  const timeGatedLink = data.consultationId 
    ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://lashdiary.co.ke'}/labs/meet/${data.consultationId}`
    : null

  try {
    await transporter.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.email,
      cc: BUSINESS_NOTIFICATION_EMAIL,
      subject: `✅ Consultation Rescheduled - ${data.businessName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color: #FDF9F4;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FDF9F4; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px; background: linear-gradient(135deg, #7C4B31 0%, #9D6B4F 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin:0; color: #FFFFFF; font-size: 28px; font-weight: bold;">
                ✅ Consultation Rescheduled
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 32px;">
              <p style="color: #3E2A20; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${data.contactName},
              </p>
              
              <p style="color: #3E2A20; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Your consultation has been successfully rescheduled!
              </p>

              <div style="background-color: #F3E6DC; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #7C4B31;">
                <p style="margin: 0 0 12px 0; color: #6B4A3B; font-weight: 600; font-size: 14px;">Previous Schedule:</p>
                <p style="margin: 0; color: #3E2A20; font-size: 16px;">
                  ${formatDate(originalDate)} at ${formatTime(originalTime)}
                </p>
              </div>

              <div style="background-color: #E8F5E9; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #4CAF50;">
                <p style="margin: 0 0 12px 0; color: #2E7D32; font-weight: 600; font-size: 14px;">New Schedule:</p>
                <p style="margin: 0; color: #1B5E20; font-size: 18px; font-weight: 600;">
                  ${formatDate(data.preferredDate)} at ${formatTime(data.preferredTime)}
                </p>
              </div>

              ${data.meetingType === 'online' && timeGatedLink ? `
              <div style="background-color: #E3F2FD; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #2196F3;">
                <p style="margin: 0 0 12px 0; color: #1565C0; font-weight: 600; font-size: 14px;">📹 Your Secure Meeting Link:</p>
                <p style="margin: 0 0 8px 0;">
                  <a href="${timeGatedLink}" style="color: #1976D2; text-decoration: none; font-weight: 600; font-size: 16px; word-break: break-all;">${timeGatedLink}</a>
                </p>
                <p style="margin: 8px 0 0 0; color: #1565C0; font-size: 12px;">
                  🔒 This link will only work during your scheduled time slot. Do not share this link.
                </p>
              </div>
              ` : ''}

              <div style="background-color: #FFF3E0; padding: 16px; border-radius: 8px; margin: 24px 0; border: 2px solid #FF9800;">
                <p style="margin: 0; color: #E65100; font-size: 14px; font-weight: 600;">
                  💡 No Payment Required
                </p>
                <p style="margin: 8px 0 0 0; color: #BF360C; font-size: 13px;">
                  Since you already paid for your original consultation, no additional payment is required for this rescheduled appointment.
                </p>
              </div>

              <p style="color: #3E2A20; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                We look forward to meeting with you!
              </p>

              <p style="color: #3E2A20; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Best regards,<br>
                The LashDiary Labs Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Consultation Rescheduled

Hi ${data.contactName},

Your consultation has been successfully rescheduled!

Previous Schedule: ${formatDate(originalDate)} at ${formatTime(originalTime)}
New Schedule: ${formatDate(data.preferredDate)} at ${formatTime(data.preferredTime)}

${data.meetingType === 'online' && timeGatedLink ? `\n📹 Your Secure Meeting Link:\n${timeGatedLink}\n\n🔒 This link will only work during your scheduled time slot.\n` : ''}

💡 No Payment Required
Since you already paid for your original consultation, no additional payment is required for this rescheduled appointment.

We look forward to meeting with you!

Best regards,
The LashDiary Labs Team
      `.trim(),
    })
  } catch (error) {
    console.error('Error sending rebooking email:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { consultationId, preferredDate, preferredTime } = body

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Consultation ID is required' },
        { status: 400 }
      )
    }

    if (!preferredDate || !preferredTime) {
      return NextResponse.json(
        { error: 'Preferred date and time are required' },
        { status: 400 }
      )
    }

    // Load consultations
    const consultationsData = await readDataFile<{ consultations: ConsultationSubmission[] }>(
      'labs-consultations.json',
      { consultations: [] }
    )

    // Find the consultation
    const consultationIndex = consultationsData.consultations.findIndex(
      (c) => c.consultationId === consultationId || c.submittedAt === consultationId
    )

    if (consultationIndex === -1) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    const originalConsultation = consultationsData.consultations[consultationIndex]
    
    // Store original date/time for email
    const originalDate = originalConsultation.preferredDate
    const originalTime = originalConsultation.preferredTime

    // Check if new slot is already booked
    const isSlotBooked = consultationsData.consultations.some(
      (c, index) => 
        index !== consultationIndex &&
        c.preferredDate === preferredDate && 
        c.preferredTime === preferredTime &&
        c.status !== 'cancelled'
    )

    if (isSlotBooked) {
      return NextResponse.json(
        { error: 'This time slot is already booked. Please select another date or time.' },
        { status: 400 }
      )
    }

    // Sanitize new date/time
    let sanitizedDate: string
    let sanitizedTime: string

    try {
      sanitizedDate = sanitizeText(preferredDate, { fieldName: 'Preferred date', maxLength: 50 })
      sanitizedTime = sanitizeText(preferredTime, { fieldName: 'Preferred time', maxLength: 50 })
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    // Update consultation with new date/time
    const updatedConsultation: ConsultationSubmission = {
      ...originalConsultation,
      preferredDate: sanitizedDate,
      preferredTime: sanitizedTime,
      status: 'confirmed', // Reset to confirmed
      // Keep the same consultation ID and payment info
      // No need to update meetLink - it will use the same admin-configured room
    }

    // Update in array
    consultationsData.consultations[consultationIndex] = updatedConsultation
    await writeDataFile('labs-consultations.json', consultationsData)

    // Send rebooking confirmation email
    try {
      await sendRebookingEmail(updatedConsultation, originalDate, originalTime)
    } catch (error) {
      console.error('Error sending rebooking email:', error)
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Consultation rescheduled successfully',
      consultation: {
        consultationId: updatedConsultation.consultationId,
        preferredDate: updatedConsultation.preferredDate,
        preferredTime: updatedConsultation.preferredTime,
        meetingType: updatedConsultation.meetingType,
      },
    })
  } catch (error: any) {
    console.error('Error rebooking consultation:', error)
    return NextResponse.json(
      {
        error: 'Failed to reschedule consultation',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

