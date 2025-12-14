import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import type { PaymentSettings } from '@/app/api/admin/payment-settings/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    
    // Only return enabled payment links for public access
    const publicSettings = {
      ...settings,
      paymentLinks: settings.paymentLinks
        .filter(link => link.enabled)
        .sort((a, b) => a.order - b.order),
    }
    
    return NextResponse.json(publicSettings, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error loading payment settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

