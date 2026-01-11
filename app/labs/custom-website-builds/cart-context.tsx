'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface LabsCartItem {
  productId: string
  name: string
  price: number
  quantity: number
  category?: string
  billingPeriod?: 'one-time' | 'yearly' | 'monthly'
  setupFee?: number // One-time setup fee for annually billed services
}

interface LabsCartContextType {
  items: LabsCartItem[]
  addToCart: (item: Omit<LabsCartItem, 'quantity'>) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  restoreCart: (items: LabsCartItem[]) => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

const LabsCartContext = createContext<LabsCartContextType | undefined>(undefined)

export function LabsCartProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage immediately (SSR-safe)
  const [items, setItems] = useState<LabsCartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('labs-cart')
        if (savedCart) {
          const parsed = JSON.parse(savedCart)
          if (Array.isArray(parsed)) {
            console.log('✅ Labs cart initialized from localStorage:', parsed)
            return parsed
          }
        }
      } catch (error) {
        console.error('Error initializing labs cart from localStorage:', error)
      }
    }
    return []
  })

  // Load cart from localStorage on mount (in case of hydration mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('labs-cart')
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart)
          // Ensure parsed items are valid
          if (Array.isArray(parsed)) {
            // Only update if different to avoid unnecessary re-renders
            setItems(prevItems => {
              if (JSON.stringify(prevItems) !== JSON.stringify(parsed)) {
                console.log('✅ Labs cart synced from localStorage:', parsed)
                return parsed
              }
              return prevItems
            })
          }
        } catch (error) {
          console.error('Error loading labs cart from localStorage:', error)
        }
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && items.length >= 0) {
      try {
        const cartJson = JSON.stringify(items)
        localStorage.setItem('labs-cart', cartJson)
        console.log('💾 Labs cart saved to localStorage:', items)
      } catch (error) {
        console.error('Error saving labs cart to localStorage:', error)
      }
    }
  }, [items])

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'labs-cart' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) {
            setItems(parsed)
            console.log('🔄 Labs cart synced from storage event:', parsed)
          }
        } catch (error) {
          console.error('Error parsing cart from storage event:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const addToCart = (item: Omit<LabsCartItem, 'quantity'>) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.productId === item.productId)
      if (existingItem) {
        const updated = prevItems.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
        console.log('✅ Updated item quantity in cart:', updated)
        return updated
      }
      const newItems = [...prevItems, { ...item, quantity: 1 }]
      console.log('✅ Added new item to cart:', newItems)
      return newItems
    })
  }

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((i) => i.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setItems((prevItems) =>
      prevItems.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const restoreCart = (newItems: LabsCartItem[]) => {
    setItems(newItems)
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      // For yearly services with setup fee, include setup fee in the total
      if (item.billingPeriod === 'yearly' && item.setupFee) {
        return total + ((item.setupFee + item.price) * item.quantity)
      }
      return total + item.price * item.quantity
    }, 0)
  }

  return (
    <LabsCartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        restoreCart,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </LabsCartContext.Provider>
  )
}

export function useLabsCart() {
  const context = useContext(LabsCartContext)
  if (context === undefined) {
    throw new Error('useLabsCart must be used within a LabsCartProvider')
  }
  return context
}

