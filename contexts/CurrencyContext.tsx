'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Currency, CURRENCIES } from '@/lib/currency-utils'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatCurrency: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('KES')

  // Load currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredCurrency') as Currency | null
    if (savedCurrency && (savedCurrency === 'KES' || savedCurrency === 'USD')) {
      setCurrencyState(savedCurrency)
    }
  }, [])

  // Save currency to localStorage when it changes
  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency)
    localStorage.setItem('preferredCurrency', newCurrency)
  }

  const formatCurrency = (amount: number): string => {
    const config = CURRENCIES[currency]
    
    if (currency === 'USD') {
      return `${config.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    
    // KES formatting (no decimals typically)
    return `${config.symbol} ${Math.round(amount).toLocaleString('en-KE')}`
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

