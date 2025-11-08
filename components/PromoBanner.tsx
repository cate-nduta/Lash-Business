'use client'

import { useState, useEffect } from 'react'

export default function PromoBanner() {
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null)
  const [discountEnabled, setDiscountEnabled] = useState(true)

  useEffect(() => {
    // Fetch discount data from API
    fetch('/api/discounts')
      .then((res) => res.json())
      .then((data) => {
        if (data.firstTimeClientDiscount) {
          setDiscountPercentage(data.firstTimeClientDiscount.percentage)
          setDiscountEnabled(data.firstTimeClientDiscount.enabled)
        }
      })
      .catch((error) => {
        console.error('Error loading discount:', error)
        // Fallback to default
        setDiscountPercentage(10)
      })
  }, [])

  // Don't show banner if discount is disabled
  if (!discountEnabled || discountPercentage === null) {
    return null
  }

  const message = `🎉 Special Offer: ${discountPercentage}% OFF for First-Time Clients! Book your appointment today and save! 🎉`
  
  return (
    <div
      className="py-1.5 overflow-hidden relative w-full z-50 bg-[var(--color-primary)] text-white border-b border-[var(--color-primary-dark)]/25 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ color: '#fff' }}
    >
      <div className="flex animate-scroll whitespace-nowrap">
        {/* Duplicate content for seamless loop */}
        <div className="flex items-center gap-6 shrink-0">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-6 shrink-0">
              <span className="text-xs md:text-sm font-semibold tracking-wide uppercase text-white">
                {message}
              </span>
              <span className="text-sm text-white">•</span>
            </div>
          ))}
        </div>
        {/* Duplicate again for seamless infinite scroll */}
        <div className="flex items-center gap-6 shrink-0">
          {[...Array(3)].map((_, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-6 shrink-0">
              <span className="text-xs md:text-sm font-semibold tracking-wide uppercase text-white">
                {message}
              </span>
              <span className="text-sm text-white">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

