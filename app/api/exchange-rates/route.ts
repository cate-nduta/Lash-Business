import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { DEFAULT_EXCHANGE_RATE_USD, type ExchangeRates } from '@/lib/currency-utils'

// Public API endpoint to fetch exchange rates (no auth required)
export async function GET(request: NextRequest) {
  try {
    const settings = await readDataFile<any>('settings.json', {})
    const rates = settings?.exchangeRates || {}
    
    const exchangeRates: ExchangeRates = {
      usdToKes: typeof rates.usdToKes === 'number' && rates.usdToKes > 0 
        ? rates.usdToKes 
        : DEFAULT_EXCHANGE_RATE_USD,
    }
    
    return NextResponse.json(exchangeRates)
  } catch (error) {
    console.error('Error loading exchange rates:', error)
    // Return default rates on error
    return NextResponse.json({
      usdToKes: DEFAULT_EXCHANGE_RATE_USD,
    })
  }
}





