import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface PaymentLink {
  id: string
  name: string
  type: 'stripe' | 'paypal' | 'bank-transfer' | 'mpesa' | 'other'
  url: string
  instructions?: string
  enabled: boolean
  order: number
}

export interface PaymentSettings {
  paymentLinks: PaymentLink[]
  checkoutInstructions: string
  defaultPaymentMethod: 'stripe' | 'paypal' | 'bank-transfer' | 'mpesa' | 'manual' | null
  showPaymentInstructions: boolean
  paymentInstructionsTitle: string
}

const DEFAULT_SETTINGS: PaymentSettings = {
  paymentLinks: [],
  checkoutInstructions: '',
  defaultPaymentMethod: null,
  showPaymentInstructions: true,
  paymentInstructionsTitle: 'Payment Instructions',
}

export async function GET(request: NextRequest) {
  try {
    const settings = await readDataFile<PaymentSettings>('payment-settings.json', DEFAULT_SETTINGS)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error loading payment settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentLinks, checkoutInstructions, defaultPaymentMethod, showPaymentInstructions, paymentInstructionsTitle } = body

    // Validate payment links
    if (!Array.isArray(paymentLinks)) {
      return NextResponse.json(
        { error: 'Payment links must be an array' },
        { status: 400 }
      )
    }

    // Validate each payment link
    for (const link of paymentLinks) {
      if (!link.id || !link.name || !link.type) {
        return NextResponse.json(
          { error: 'Each payment link must have an id, name, and type' },
          { status: 400 }
        )
      }

      if (!['stripe', 'paypal', 'bank-transfer', 'mpesa', 'other'].includes(link.type)) {
        return NextResponse.json(
          { error: 'Invalid payment link type' },
          { status: 400 }
        )
      }

      if (!link.url || !link.url.trim()) {
        return NextResponse.json(
          { error: 'Each payment link must have a URL' },
          { status: 400 }
        )
      }
    }

    const settings: PaymentSettings = {
      paymentLinks: paymentLinks.map((link: PaymentLink, index: number) => ({
        ...link,
        order: link.order !== undefined ? link.order : index,
        enabled: link.enabled !== undefined ? link.enabled : true,
      })),
      checkoutInstructions: checkoutInstructions || '',
      defaultPaymentMethod: defaultPaymentMethod || null,
      showPaymentInstructions: showPaymentInstructions !== undefined ? showPaymentInstructions : true,
      paymentInstructionsTitle: paymentInstructionsTitle || 'Payment Instructions',
    }

    await writeDataFile('payment-settings.json', settings)

    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    console.error('Error saving payment settings:', error)
    return NextResponse.json(
      { error: 'Failed to save payment settings', details: error.message },
      { status: 500 }
    )
  }
}

