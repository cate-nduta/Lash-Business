import nodemailer from 'nodemailer'
import { readDataFile } from '@/lib/data-utils'

/**
 * Get email configuration for a specific Labs business
 */
export async function getBusinessEmailConfig(orderId: string): Promise<{
  enabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string
  fromEmail: string
  fromName: string
  replyTo?: string
} | null> {
  try {
    const settingsFileName = `labs-${orderId}-settings.json`
    const settings = await readDataFile<any>(settingsFileName, {})

    if (!settings.emailConfig || !settings.emailConfig.enabled) {
      return null
    }

    return {
      enabled: true,
      smtpHost: settings.emailConfig.smtpHost || 'smtp.zoho.com',
      smtpPort: settings.emailConfig.smtpPort || 465,
      smtpSecure: settings.emailConfig.smtpSecure !== false,
      smtpUser: settings.emailConfig.smtpUser || '',
      smtpPass: settings.emailConfig.smtpPass || '',
      fromEmail: settings.emailConfig.fromEmail || '',
      fromName: settings.emailConfig.fromName || '',
      replyTo: settings.emailConfig.replyTo || settings.emailConfig.fromEmail,
    }
  } catch (error) {
    console.error('Error loading business email config:', error)
    return null
  }
}

/**
 * Create a transporter for a specific business using their email config
 */
export async function createBusinessTransporter(orderId: string): Promise<ReturnType<typeof nodemailer.createTransport> | null> {
  const config = await getBusinessEmailConfig(orderId)

  if (!config || !config.smtpUser || !config.smtpPass) {
    return null
  }

  try {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      pool: false,
      maxConnections: 1,
      maxMessages: 1,
    })
  } catch (error) {
    console.error('Error creating business transporter:', error)
    return null
  }
}

/**
 * Send email using business-specific email configuration
 */
export async function sendBusinessEmail(options: {
  orderId: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}): Promise<{
  success: boolean
  messageId?: string
  error?: string
  accepted?: string[]
  rejected?: string[]
}> {
  try {
    const config = await getBusinessEmailConfig(options.orderId)

    if (!config) {
      return {
        success: false,
        error: 'Business email configuration not enabled or not found',
      }
    }

    const transporter = await createBusinessTransporter(options.orderId)

    if (!transporter) {
      return {
        success: false,
        error: 'Failed to create email transporter. Please check your email configuration.',
      }
    }

    const fromAddress = config.fromName
      ? `"${config.fromName}" <${config.fromEmail}>`
      : config.fromEmail

    const result = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || config.replyTo || config.fromEmail,
      priority: 'high',
      date: new Date(),
    })

    const accepted = Array.isArray(result.accepted) ? result.accepted : []
    const rejected = Array.isArray(result.rejected) ? result.rejected : []

    if (rejected.length > 0) {
      return {
        success: false,
        messageId: result.messageId,
        error: `Email rejected for recipients: ${rejected.join(', ')}`,
        accepted,
        rejected,
      }
    }

    return {
      success: true,
      messageId: result.messageId,
      accepted,
      rejected,
    }
  } catch (error: any) {
    console.error('Error sending business email:', error)
    return {
      success: false,
      error: error.message || 'Unknown error sending email',
    }
  }
}

