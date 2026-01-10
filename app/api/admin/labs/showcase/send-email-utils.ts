import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendEmailViaZoho } from '@/lib/email/zoho-config'
import { BUSINESS_NOTIFICATION_EMAIL } from '@/lib/email/zoho-config'
import type { BuildProject } from '@/app/api/admin/labs/build-projects/route'
import { generateShowcaseToken } from '@/lib/showcase-token-utils'

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

export async function sendShowcaseEmailForProject(projectId: string): Promise<void> {
  const projects = await readDataFile<BuildProject[]>('labs-build-projects.json', [])
  const projectIndex = projects.findIndex(p => p.projectId === projectId)

  if (projectIndex === -1) {
    throw new Error('Project not found')
  }

  const project = projects[projectIndex]

  // Always regenerate showcase booking token to ensure it uses the new readable format
  // This migrates old hex tokens to the new format: {name}{date}-showcase-meeting
  const customerName = project.contactName || project.businessName || project.email.split('@')[0]
  const projectDate = project.createdAt || project.updatedAt || new Date().toISOString()
  project.showcaseBookingToken = generateShowcaseToken(customerName, projectDate)
  project.updatedAt = new Date().toISOString()
  projects[projectIndex] = project
  await writeDataFile('labs-build-projects.json', projects)

  const bookingUrl = `${BASE_URL}/labs/showcase-booking/${project.showcaseBookingToken}`

  // Send showcase email to client
  const clientEmailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #FDF9F4;">
        <div style="background: #FFFFFF; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #7C4B31; margin-top: 0;">Your Project Has Been Launched!</h1>
          
          <p>Hello ${project.contactName},</p>
          
          <p>Great news! Your product is ready for launch and is ready for you to use!</p>
          
          <p>We'd love to schedule a <strong>Showcase Meeting</strong> to walk you through everything. During this meeting, we'll cover:</p>
          
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Complete walkthrough of your website</li>
            <li>All workflows and how to use the system</li>
            <li>Answer any questions you may have</li>
            <li>Tips and best practices for getting the most out of your new system</li>
          </ul>
          
          <p>You can choose between an <strong>online meeting</strong> or a <strong>physical meeting</strong> at our studio.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${bookingUrl}" 
               style="display: inline-block; background: #7C4B31; color: #FFFFFF; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Book Your Showcase Meeting
            </a>
          </div>
          
          <p style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E0E0E0; font-size: 14px; color: #666;">
            If you have any questions before the meeting, please don't hesitate to reach out to us.
          </p>
          
          <p style="margin-top: 16px; font-size: 14px; color: #666;">
            Best regards,<br>
            The LashDiary Labs Team
          </p>
        </div>
      </body>
    </html>
  `

  await sendEmailViaZoho({
    to: project.email,
    subject: `Your Product is Ready for Launch - Book Your Showcase Meeting`,
    html: clientEmailHtml,
  })

  // Update project milestone
  project.milestones.showcaseEmailSent = {
    date: new Date().toISOString(),
    notes: 'Showcase meeting email sent to client',
  }
  project.updatedAt = new Date().toISOString()
  projects[projectIndex] = project
  await writeDataFile('labs-build-projects.json', projects)
}

