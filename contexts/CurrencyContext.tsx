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
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('preferredCurrency') as Currency | null
      if (savedCurrency && (savedCurrency === 'KES' || savedCurrency === 'USD' || savedCurrency === 'EUR')) {
        setCurrencyState(savedCurrency)
      }
    }
  }, [])

  // Save currency to localStorage when it changes
  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('preferredCurrency', newCurrency)
      } catch (error) {
        console.error('Error saving currency to localStorage:', error)
      }
    }
  }

  const formatCurrency = (amount: number): string => {
    const config = CURRENCIES[currency]
    
    if (currency === 'USD' || currency === 'EUR') {
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

