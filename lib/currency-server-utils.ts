// SERVER-SIDE ONLY - Do not import in client components
import { readDataFile } from '@/lib/data-utils'
import { DEFAULT_EXCHANGE_RATE_USD, type ExchangeRates } from '@/lib/currency-utils'

// Get exchange rates from settings or use defaults (SERVER-SIDE ONLY)
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const settings = await readDataFile<any>('settings.json', {})
    const rates = settings?.exchangeRates || {}
    
    return {
      usdToKes: typeof rates.usdToKes === 'number' && rates.usdToKes > 0 
        ? rates.usdToKes 
        : DEFAULT_EXCHANGE_RATE_USD,
    }
  } catch (error) {
    console.error('Error loading exchange rates:', error)
    return {
      usdToKes: DEFAULT_EXCHANGE_RATE_USD,
    }
  }
}







