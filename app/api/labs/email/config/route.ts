import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface EmailConfig {
  enabled: boolean
  provider: 'zoho' | 'custom'
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string // This will be encrypted/stored securely
  fromEmail: string
  fromName: string
  replyTo?: string
  domain?: string // For verification
}

export async function GET(request: NextRequest) {
  try {
    // Get user from auth check
    const authResponse = await fetch(`${request.nextUrl.origin}/api/labs/auth/check`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    })

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authData = await authResponse.json()
    if (!authData.authenticated || !authData.orderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load order to get settings file name
    const orders = await readDataFile<any[]>('labs-orders.json', [])
    const order = orders.find(o => o.orderId === authData.orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Load email config from settings file
    const settingsFileName = `labs-${order.orderId}-settings.json`
    const settings = await readDataFile<any>(settingsFileName, {})

    // Return config (without password for security)
    const emailConfig = settings.emailConfig || {}
    const configToReturn: Partial<EmailConfig> = {
      ...emailConfig,
      smtpPass: emailConfig.smtpPass ? '***' : '', // Don't send password back
    }

    return NextResponse.json({ config: configToReturn })
  } catch (error: any) {
    console.error('Error loading email config:', error)
    return NextResponse.json(
      { error: 'Failed to load email configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from auth check
    const authResponse = await fetch(`${request.nextUrl.origin}/api/labs/auth/check`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    })

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authData = await authResponse.json()
    if (!authData.authenticated || !authData.orderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { config } = body

    // Validate config
    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Invalid email configuration' },
        { status: 400 }
      )
    }

    // Load order to get settings file name
    const orders = await readDataFile<any[]>('labs-orders.json', [])
    const order = orders.find(o => o.orderId === authData.orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Load existing settings
    const settingsFileName = `labs-${order.orderId}-settings.json`
    const settings = await readDataFile<any>(settingsFileName, {})

    // If password is '***', keep existing password
    let smtpPass = config.smtpPass
    if (config.smtpPass === '***' && settings.emailConfig?.smtpPass) {
      smtpPass = settings.emailConfig.smtpPass
    }

    // Update email config
    settings.emailConfig = {
      enabled: config.enabled ?? false,
      provider: config.provider || 'zoho',
      smtpHost: config.smtpHost || 'smtp.zoho.com',
      smtpPort: config.smtpPort || 465,
      smtpSecure: config.smtpSecure !== undefined ? config.smtpSecure : true,
      smtpUser: config.smtpUser || '',
      smtpPass: smtpPass || '',
      fromEmail: config.fromEmail || '',
      fromName: config.fromName || '',
      replyTo: config.replyTo || config.fromEmail || '',
      domain: config.domain || '',
    }

    // Save settings
    await writeDataFile(settingsFileName, settings)

    return NextResponse.json({ success: true, config: { ...settings.emailConfig, smtpPass: '***' } })
  } catch (error: any) {
    console.error('Error saving email config:', error)
    return NextResponse.json(
      { error: 'Failed to save email configuration' },
      { status: 500 }
    )
  }
}

