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

// Exchange rate conversion (you can fetch this from an API or set it manually)
// For now, using a placeholder - you should fetch real-time rates
export const DEFAULT_EXCHANGE_RATE = 130 // 1 USD = 130 KES (example rate)

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): number {
  if (fromCurrency === toCurrency) return amount
  
  if (fromCurrency === 'USD' && toCurrency === 'KES') {
    return amount * exchangeRate
  }
  
  if (fromCurrency === 'KES' && toCurrency === 'USD') {
    const usdAmount = amount / exchangeRate
    // Round up to next dollar if there are any decimals
    if (usdAmount % 1 !== 0) {
      return Math.ceil(usdAmount)
    }
    return usdAmount
  }
  
  return amount
}

