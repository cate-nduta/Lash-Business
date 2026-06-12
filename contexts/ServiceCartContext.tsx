'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Currency, convertCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency-utils'

export interface ServiceCartItem {
  serviceId: string
  name: string
  price: number // KES price
  priceUSD?: number // USD price
  duration: number
  categoryId: string
  categoryName: string
}

interface ServiceCartContextType {
  items: ServiceCartItem[]
  addService: (service: ServiceCartItem) => void
  removeService: (serviceId: string) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: (currency: Currency, exchangeRates?: { usdToKes: number }) => number
  getTotalDuration: () => number
  hasService: (serviceId: string) => boolean
}

const ServiceCartContext = createContext<ServiceCartContextType | undefined>(undefined)
const SERVICE_CART_STORAGE_KEY = 'serviceCart'

const getBrowserStorages = () => {
  const storages: Storage[] = []

  ;(['localStorage', 'sessionStorage'] as const).forEach((storageKey) => {
    try {
      storages.push(window[storageKey])
    } catch {
      // Access can throw in some browser privacy modes.
    }
  })

  return storages
}

const loadStoredServiceCart = () => {
  for (const storage of getBrowserStorages()) {
    try {
      const savedCart = storage.getItem(SERVICE_CART_STORAGE_KEY)
      if (!savedCart) continue

      const parsed = JSON.parse(savedCart)
      if (Array.isArray(parsed)) {
        return parsed as ServiceCartItem[]
      }
    } catch {
      try {
        storage.removeItem(SERVICE_CART_STORAGE_KEY)
      } catch {
        // Ignore storage cleanup errors.
      }
    }
  }

  return []
}

const saveStoredServiceCart = (items: ServiceCartItem[]) => {
  const serializedCart = JSON.stringify(items)

  for (const storage of getBrowserStorages()) {
    try {
      storage.setItem(SERVICE_CART_STORAGE_KEY, serializedCart)
    } catch {
      // Some browsers can block one storage type; keep trying the others.
    }
  }
}

const clearStoredServiceCart = () => {
  for (const storage of getBrowserStorages()) {
    try {
      storage.removeItem(SERVICE_CART_STORAGE_KEY)
    } catch {
      // Ignore storage cleanup errors.
    }
  }
}

export function ServiceCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ServiceCartItem[]>([])
  const [hasLoadedCart, setHasLoadedCart] = useState(false)

  // Load cart from browser storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const parsed = loadStoredServiceCart()
        if (parsed.length > 0) {
          setItems(parsed)
          console.log('✅ Service cart loaded from browser storage:', parsed.length, 'items')
        }
      } catch (error) {
        console.error('❌ Error loading service cart from browser storage:', error)
        // Clear corrupted data
        clearStoredServiceCart()
      } finally {
        setHasLoadedCart(true)
      }
    } else {
      setHasLoadedCart(true)
    }
  }, [])

  // Save cart to browser storage whenever it changes
  useEffect(() => {
    if (!hasLoadedCart) return
    if (typeof window !== 'undefined') {
      try {
        saveStoredServiceCart(items)
      } catch (error) {
        console.error('Error saving service cart to browser storage:', error)
      }
    }
  }, [hasLoadedCart, items])

  const addService = (service: ServiceCartItem) => {
    setItems((prevItems) => {
      // Check if service already exists
      const existingIndex = prevItems.findIndex((item) => item.serviceId === service.serviceId)
      if (existingIndex >= 0) {
        // Service already in cart, don't add duplicate
        return prevItems
      }
      return [...prevItems, service]
    })
  }

  const removeService = (serviceId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.serviceId !== serviceId))
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalItems = () => {
    return items.length
  }

  const getTotalPrice = (currency: Currency, exchangeRates?: { usdToKes: number }) => {
    const rates = exchangeRates || DEFAULT_EXCHANGE_RATES
    return items.reduce((total, item) => {
      if (currency === 'KES') {
        return total + item.price
      }
      if (currency === 'USD' && item.priceUSD !== undefined) {
        return total + item.priceUSD
      }
      // For USD without priceUSD, convert from KES using provided exchange rates
      return total + convertCurrency(item.price, 'KES', currency, rates)
    }, 0)
  }

  const getTotalDuration = () => {
    return items.reduce((total, item) => total + item.duration, 0)
  }

  const hasService = (serviceId: string) => {
    return items.some((item) => item.serviceId === serviceId)
  }

  return (
    <ServiceCartContext.Provider
      value={{
        items,
        addService,
        removeService,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getTotalDuration,
        hasService,
      }}
    >
      {children}
    </ServiceCartContext.Provider>
  )
}

export function useServiceCart() {
  const context = useContext(ServiceCartContext)
  if (context === undefined) {
    throw new Error('useServiceCart must be used within a ServiceCartProvider')
  }
  return context
}

