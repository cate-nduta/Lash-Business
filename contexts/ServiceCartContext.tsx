'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  getTotalPrice: (currency: 'KES' | 'USD') => number
  getTotalDuration: () => number
  hasService: (serviceId: string) => boolean
}

const ServiceCartContext = createContext<ServiceCartContextType | undefined>(undefined)

export function ServiceCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ServiceCartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('serviceCart')
        if (savedCart) {
          const parsed = JSON.parse(savedCart)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed)
            console.log('✅ Service cart loaded from localStorage:', parsed.length, 'items')
          }
        }
      } catch (error) {
        console.error('❌ Error loading service cart from localStorage:', error)
        // Clear corrupted data
        localStorage.removeItem('serviceCart')
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('serviceCart', JSON.stringify(items))
  }, [items])

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

  const getTotalPrice = (currency: 'KES' | 'USD') => {
    return items.reduce((total, item) => {
      const price = currency === 'USD' && item.priceUSD !== undefined ? item.priceUSD : item.price
      return total + price
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

