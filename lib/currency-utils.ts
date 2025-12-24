export type Currency = 'KES' | 'USD'

export interface CurrencyConfig {
  code: Currency
  symbol: string
  name: string
  locale: string
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  KES: {
    code: 'KES',
    symbol: 'KSH',
    name: 'Kenyan Shilling',
    locale: 'en-KE',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
  },
}

export function formatCurrency(amount: number, currency: Currency = 'KES'): string {
  const config = CURRENCIES[currency]
  
  if (currency === 'USD') {
    return `${config.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  // KES formatting (no decimals typically)
  return `${config.symbol} ${Math.round(amount).toLocaleString('en-KE')}`
}

export function formatCurrencyCompact(amount: number, currency: Currency = 'KES'): string {
  const config = CURRENCIES[currency]
  
  if (currency === 'USD') {
    return `${config.symbol}${amount.toFixed(2)}`
  }
  
  return `${config.symbol} ${Math.round(amount).toLocaleString()}`
}

export function parseCurrencyAmount(value: string, currency: Currency = 'KES'): number {
  // Remove currency symbols and spaces
  const cleaned = value.replace(/[^\d.,]/g, '').replace(/,/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// Default exchange rates (fallback if not set in admin settings)
export const DEFAULT_EXCHANGE_RATE_USD = 130 // 1 USD = 130 KES
// Backward compatibility: DEFAULT_EXCHANGE_RATE maps to USD rate
export const DEFAULT_EXCHANGE_RATE = DEFAULT_EXCHANGE_RATE_USD
// Helper: Default exchange rates object for easy use
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  usdToKes: DEFAULT_EXCHANGE_RATE_USD,
}

export interface ExchangeRates {
  usdToKes: number // 1 USD = X KES
}

// Note: getExchangeRates() has been moved to lib/currency-server-utils.ts
// Import it only in server-side code (API routes, server components)

// Synchronous version for client-side (uses defaults or passed rates)
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates?: ExchangeRates
): number {
  if (fromCurrency === toCurrency) return amount
  
  // Use provided rates or defaults
  const rates = exchangeRates || {
    usdToKes: DEFAULT_EXCHANGE_RATE_USD,
  }
  
  // Convert to KES first (base currency), then to target currency
  let amountInKES = amount
  
  if (fromCurrency === 'USD') {
    amountInKES = amount * rates.usdToKes
  }
  // If fromCurrency is KES, amountInKES is already correct
  
  // Convert from KES to target currency
  if (toCurrency === 'USD') {
    const usdAmount = amountInKES / rates.usdToKes
    // Round to 2 decimal places for USD
    return Math.round(usdAmount * 100) / 100
  }
  
  // If toCurrency is KES, return amountInKES (round for KES)
  return Math.round(amountInKES)
}

// Note: For server-side async conversion, import from lib/currency-server-utils.ts
// Client-side code should fetch rates from /api/admin/settings and use convertCurrency() directly

