import { sendEmailViaZoho, FROM_EMAIL } from '@/lib/email/zoho-config'
import {
  formatTrainingDate,
  formatTrainingDateRange,
  formatTrainingDurationLabel,
  hasTrainingCourseMaterial,
} from '@/lib/training-utils'
import type { TrainingIntake, TrainingProgram, TrainingStarterKitOption } from '@/types/training'

function normalizeBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }
  return 'https://lashdiary.co.ke'
}

const BASE_URL = normalizeBaseUrl()

const EMAIL_STYLES = {
  background: '#FDF9F4',
  card: '#FFFFFF',
  accent: '#F3E6DC',
  textPrimary: '#3E2A20',
  textSecondary: '#6B4A3B',
  brand: '#7C4B31',
}

export async function sendTrainingEnrollmentConfirmation(data: {
  email: string
  name: string
  program: TrainingProgram
  intake: TrainingIntake
  amountKES: number
  selectedTiming?: string
  selectedStarterKitOption?: TrainingStarterKitOption
  accessToken?: string
}): Promise<{ success: boolean; error?: string }> {
  const { email, name, program, intake, amountKES, accessToken } = data
  const friendlyName = name.split(' ')[0] || 'Student'
  const location = intake.location || program.location
  const courseMaterialReady = hasTrainingCourseMaterial(program)
  const courseUrl = accessToken && courseMaterialReady ? `${BASE_URL}/masterclass/course/${accessToken}` : ''
  const starterKitLabel =
    data.selectedStarterKitOption === 'without_starter_kit'
      ? 'Without starter kit'
      : 'With starter kit'
  const durationDays = intake.durationDays || intake.trainingDates.length || program.durationDays || 5
  const datesList = intake.trainingDates
    .map((d) => `<li style="margin:4px 0;">${formatTrainingDate(d)}</li>`)
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Masterclass Enrollment Confirmed</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${EMAIL_STYLES.background};">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:${EMAIL_STYLES.background};">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:${EMAIL_STYLES.card};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,${EMAIL_STYLES.brand},#9A6B4F);padding:28px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;">Masterclass Enrollment Confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:${EMAIL_STYLES.textPrimary};">
            <p>Hi ${friendlyName},</p>
            <p>Your spot for <strong>${program.title}</strong> is confirmed. Payment of <strong>KES ${amountKES.toLocaleString()}</strong> has been received.</p>
            <div style="background:${EMAIL_STYLES.accent};padding:16px;border-radius:8px;margin:20px 0;">
              <p style="margin:0 0 8px;"><strong>Cohort:</strong> ${intake.title}</p>
              <p style="margin:0 0 8px;"><strong>Duration:</strong> ${formatTrainingDurationLabel(durationDays)} training</p>
              <p style="margin:0 0 8px;"><strong>Dates:</strong> ${formatTrainingDateRange(intake.trainingDates)}</p>
              ${data.selectedTiming ? `<p style="margin:0 0 8px;"><strong>Timing:</strong> ${data.selectedTiming}</p>` : ''}
              <p style="margin:0 0 8px;"><strong>Package:</strong> ${starterKitLabel}</p>
              <p style="margin:0;"><strong>Location:</strong> ${location}</p>
            </div>
            <p><strong>Training days:</strong></p>
            <ul>${datesList}</ul>
            <p>Please arrive on time each day. If you have questions, reply to this email.</p>
            ${
              courseUrl
                ? `<div style="margin:24px 0; text-align:center;">
                    <a href="${courseUrl}" style="display:inline-block;background:${EMAIL_STYLES.brand};color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
                      Open your course page
                    </a>
                  </div>
                  <p style="font-size:13px;color:${EMAIL_STYLES.textSecondary};">Keep this email safe. This private link gives you access to your course material.</p>`
                : `<div style="background:${EMAIL_STYLES.accent};padding:16px;border-radius:8px;margin:24px 0;">
                    <p style="margin:0;color:${EMAIL_STYLES.textPrimary};"><strong>Course resources:</strong> Your payment and enrollment are confirmed. The course resources are still being prepared and will be shared with you as soon as they are ready.</p>
                  </div>`
            }
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await sendEmailViaZoho({
      to: email,
      subject: `Confirmed: ${program.title} – ${intake.title}`,
      html,
      from: FROM_EMAIL,
    })
    return { success: true }
  } catch (error) {
    console.error('Training confirmation email failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}
