import { NextResponse } from 'next/server'
import { validateZohoConfig, isZohoConfigured, getZohoTransporter } from '@/lib/email/zoho-config'

/**
 * API endpoint to check Zoho email configuration status
 * GET /api/admin/email/check-config
 */
export async function GET() {
  try {
    const configStatus = validateZohoConfig()
    const transporter = getZohoTransporter()

    // Try to verify connection if configured
    let connectionVerified = false
    let connectionError: string | null = null

    if (transporter && configStatus.configured) {
      try {
        await transporter.verify()
        connectionVerified = true
      } catch (error: any) {
        connectionError = error.message || 'Connection verification failed'
      }
    }

    return NextResponse.json({
      configured: configStatus.configured,
      connectionVerified,
      connectionError,
      errors: configStatus.errors,
      warnings: configStatus.warnings,
      info: configStatus.info,
      ready: configStatus.configured && connectionVerified,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        configured: false,
        connectionVerified: false,
        error: error.message || 'Failed to check configuration',
      },
      { status: 500 }
    )
  }
}

