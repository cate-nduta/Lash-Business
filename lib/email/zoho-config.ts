import nodemailer from 'nodemailer'

/**
 * Centralized Zoho SMTP Configuration
 * This module provides a single source of truth for Zoho email configuration
 * and ensures all email sending functions use the same validated settings.
 */

// Zoho SMTP Configuration
export const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com'
export const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT || 465)
export const ZOHO_SMTP_USER =
  process.env.ZOHO_SMTP_USER || 
  process.env.ZOHO_SMTP_USERNAME || 
  process.env.ZOHO_USERNAME || 
  ''
export const ZOHO_SMTP_PASS =
  process.env.ZOHO_SMTP_PASS || 
  process.env.ZOHO_SMTP_PASSWORD || 
  process.env.ZOHO_APP_PASSWORD || 
  ''

// Email addresses
export const BUSINESS_NOTIFICATION_EMAIL =
  process.env.BUSINESS_NOTIFICATION_EMAIL ||
  process.env.OWNER_EMAIL ||
  process.env.CALENDAR_EMAIL ||
  'hello@lashdiary.co.ke'

export const ZOHO_FROM_EMAIL =
  process.env.ZOHO_FROM_EMAIL ||
  process.env.ZOHO_FROM ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : '') ||
  BUSINESS_NOTIFICATION_EMAIL

export const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  ZOHO_FROM_EMAIL ||
  (ZOHO_SMTP_USER ? `${ZOHO_SMTP_USER}` : BUSINESS_NOTIFICATION_EMAIL)

export const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'The LashDiary'

// Create Zoho transporter
let zohoTransporter: ReturnType<typeof nodemailer.createTransport> | null = null

/**
 * Validates that Zoho SMTP credentials are configured
 */
export function isZohoConfigured(): boolean {
  return Boolean(ZOHO_SMTP_USER && ZOHO_SMTP_USER.trim().length > 0 && 
                 ZOHO_SMTP_PASS && ZOHO_SMTP_PASS.trim().length > 0)
}

/**
 * Gets the Zoho transporter, creating it if necessary
 * Returns null if configuration is missing
 */
export function getZohoTransporter(): ReturnType<typeof nodemailer.createTransport> | null {
  if (!isZohoConfigured()) {
    return null
  }

  // Return existing transporter if already created
  if (zohoTransporter) {
    return zohoTransporter
  }

  // Create new transporter
  try {
    zohoTransporter = nodemailer.createTransport({
      host: ZOHO_SMTP_HOST,
      port: ZOHO_SMTP_PORT,
      secure: ZOHO_SMTP_PORT === 465,
      auth: {
        user: ZOHO_SMTP_USER,
        pass: ZOHO_SMTP_PASS,
      },
      // Add connection timeout and retry options
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })

    // Verify connection on creation (optional, can be removed if causing issues)
    // zohoTransporter.verify((error) => {
    //   if (error) {
    //     console.error('Zoho SMTP connection verification failed:', error)
    //   } else {
    //     console.log('✅ Zoho SMTP connection verified successfully')
    //   }
    // })

    return zohoTransporter
  } catch (error) {
    console.error('Failed to create Zoho transporter:', error)
    return null
  }
}

/**
 * Validates Zoho configuration and returns detailed status
 */
export function validateZohoConfig(): {
  configured: boolean
  errors: string[]
  warnings: string[]
  info: {
    host: string
    port: number
    user: string
    fromEmail: string
    businessEmail: string
  }
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!ZOHO_SMTP_USER || ZOHO_SMTP_USER.trim().length === 0) {
    errors.push('ZOHO_SMTP_USER is not set')
  }

  if (!ZOHO_SMTP_PASS || ZOHO_SMTP_PASS.trim().length === 0) {
    errors.push('ZOHO_SMTP_PASS is not set')
  }

  if (ZOHO_SMTP_PORT !== 465 && ZOHO_SMTP_PORT !== 587) {
    warnings.push(`ZOHO_SMTP_PORT is set to ${ZOHO_SMTP_PORT}, expected 465 (SSL) or 587 (TLS)`)
  }

  if (!FROM_EMAIL || !FROM_EMAIL.includes('@')) {
    warnings.push('FROM_EMAIL may be invalid')
  }

  return {
    configured: errors.length === 0,
    errors,
    warnings,
    info: {
      host: ZOHO_SMTP_HOST,
      port: ZOHO_SMTP_PORT,
      user: ZOHO_SMTP_USER || '(not set)',
      fromEmail: FROM_EMAIL,
      businessEmail: BUSINESS_NOTIFICATION_EMAIL,
    },
  }
}

/**
 * Sends an email using Zoho SMTP with proper error handling
 */
export async function sendEmailViaZoho(options: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  from?: string
}): Promise<{
  success: boolean
  messageId?: string
  error?: string
  accepted?: string[]
  rejected?: string[]
}> {
  const transporter = getZohoTransporter()

  if (!transporter) {
    const configStatus = validateZohoConfig()
    return {
      success: false,
      error: `Zoho SMTP not configured. ${configStatus.errors.join('; ')}`,
    }
  }

  try {
    const fromAddress = options.from || `"${EMAIL_FROM_NAME}" <${FROM_EMAIL}>`
    
    const result = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || BUSINESS_NOTIFICATION_EMAIL,
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
    console.error('Error sending email via Zoho:', error)
    return {
      success: false,
      error: error.message || 'Unknown error sending email',
    }
  }
}

// Log configuration status on module load (only in development)
if (process.env.NODE_ENV === 'development') {
  const configStatus = validateZohoConfig()
  if (configStatus.configured) {
    console.log('✅ Zoho SMTP configuration is valid')
    if (configStatus.warnings.length > 0) {
      console.warn('⚠️ Zoho SMTP warnings:', configStatus.warnings.join('; '))
    }
  } else {
    console.error('❌ Zoho SMTP configuration is invalid:')
    configStatus.errors.forEach((error) => console.error(`  - ${error}`))
  }
}

