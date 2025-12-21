// SERVER-SIDE ONLY - Do not import in client components
import { readDataFile } from '@/lib/data-utils'
import { DEFAULT_EXCHANGE_RATE_USD, DEFAULT_EXCHANGE_RATE_EUR, type ExchangeRates } from '@/lib/currency-utils'

// Get exchange rates from settings or use defaults (SERVER-SIDE ONLY)
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const settings = await readDataFile<any>('settings.json', {})
    const rates = settings?.exchangeRates || {}
    
    return {
      usdToKes: typeof rates.usdToKes === 'number' && rates.usdToKes > 0 
        ? rates.usdToKes 
        : DEFAULT_EXCHANGE_RATE_USD,
      eurToKes: typeof rates.eurToKes === 'number' && rates.eurToKes > 0 
        ? rates.eurToKes 
        : DEFAULT_EXCHANGE_RATE_EUR,
    }
  } catch (error) {
    console.error('Error loading exchange rates:', error)
    return {
      usdToKes: DEFAULT_EXCHANGE_RATE_USD,
      eurToKes: DEFAULT_EXCHANGE_RATE_EUR,
    }
  }
}



