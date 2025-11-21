'use client'

import { useState, useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { type ServiceCatalog, type ServiceCategory } from '@/lib/services-utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATE } from '@/lib/currency-utils'
import { useServiceCart } from '@/contexts/ServiceCartContext'
import Link from 'next/link'

interface DisplayService {
  id: string
  name: string
  description: string
  price: string
  duration?: string
}

const serviceDescriptions: Record<string, string> = {
  'Classic Lashes': 'One extension applied to each natural lash for a natural, elegant look. Perfect for everyday wear.',
  'Subtle Hybrid Lashes': 'A subtle blend of classic and volume lashes for a natural yet enhanced appearance.',
  'Hybrid Lashes': 'A beautiful blend of classic and volume lashes, offering fullness with a natural appearance.',
  'Volume Lashes': 'Multiple lightweight extensions per natural lash for a fuller, more dramatic look.',
  'Mega Volume Lashes': 'Ultimate fullness with ultra-fine extensions creating maximum impact and glamour.',
  'Wispy Lashes': 'Feathery, textured lashes that create a soft, fluttery effect with varying lengths.',
  'Classic Infill': 'Maintain your classic lash set with a fill appointment every 2-3 weeks.',
  'Subtle Hybrid Infill': 'Refresh your subtle hybrid lashes to keep them looking perfect.',
  'Hybrid Infill': 'Maintain your hybrid lash set with a fill appointment every 2-3 weeks.',
  'Volume Infill': 'Refresh your volume lashes to maintain their full, dramatic appearance.',
  'Mega Volume Infill': 'Maintain your mega volume lashes with a fill appointment every 2-3 weeks.',
  'Wispy Infill': 'Refresh your wispy lashes to keep that soft, fluttery look.',
  'Lash Lift': 'Enhance your natural lashes with a perm that curls and lifts, no extensions needed.',
  'Lash Removal': 'Professional removal of existing lash extensions. Recommended before getting a new full set for best results.',
}

const toDisplayServices = (category: ServiceCategory, currency: 'KES' | 'USD', formatCurrency: (amount: number) => string): DisplayService[] =>
  category.services.map((service) => {
    const price = currency === 'USD' && service.priceUSD !== undefined
      ? service.priceUSD
      : currency === 'USD' && service.price
      ? convertCurrency(service.price, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
      : service.price || 0
    return {
      id: service.id,
      name: service.name,
      description: serviceDescriptions[service.name] || '',
      price: formatCurrency(price),
      duration: service.duration ? `${service.duration} min` : undefined,
    }
  })

export default function Services() {
  const { currency, setCurrency, formatCurrency } = useCurrency()
  const { addService, hasService, items, getTotalItems } = useServiceCart()
  const [catalog, setCatalog] = useState<ServiceCatalog>({ categories: [] })
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addedServiceId, setAddedServiceId] = useState<string | null>(null)
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    fetch('/api/services', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load services')
        }
        return response.json()
      })
      .then((data: ServiceCatalog) => {
        setCatalog(data)
        if (data.categories.length > 0) {
          setActiveCategoryId(data.categories[0].id)
        }
      })
      .catch((error) => {
        console.error('Error loading services:', error)
      })
      .finally(() => setLoading(false))
  }, [])

  const activeCategory = useMemo(() => {
    if (!activeCategoryId) return null
    return catalog.categories.find((category) => category.id === activeCategoryId) ?? null
  }, [catalog, activeCategoryId])

  useEffect(() => {
    if (catalog.categories.length === 0) {
      setActiveCategoryId(null)
      return
    }
    if (!activeCategoryId || !catalog.categories.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId(catalog.categories[0].id)
    }
  }, [catalog, activeCategoryId])

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-[var(--color-text)]">Loading services...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20 relative overflow-hidden">
      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="cartoon-sticker top-20 left-10 animate-float-sticker opacity-40 hidden md:block" style={{ animationDelay: '0s' }}>
          <div className="sticker-lash"></div>
        </div>
        <div className="cartoon-sticker top-32 right-16 animate-float-sticker opacity-35 hidden lg:block" style={{ animationDelay: '1.2s' }}>
          <div className="sticker-star"></div>
        </div>
        <div className="cartoon-sticker bottom-40 left-20 animate-float-sticker opacity-30 hidden md:block" style={{ animationDelay: '2.3s' }}>
          <div className="sticker-heart"></div>
        </div>
        <div className="cartoon-sticker top-1/2 right-12 animate-float-sticker opacity-35 hidden xl:block" style={{ animationDelay: '0.8s' }}>
          <div className="sticker-sparkle animate-rotate-slow"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-8 sm:mb-12 md:mb-16 relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-[var(--color-primary)] mb-4 sm:mb-6 relative inline-block">
            Our Services
            <span className="absolute -top-2 -right-8 text-2xl opacity-50 hidden lg:inline-block">✨</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Discover our range of premium lash and brow treatments. Select a category to explore services crafted to
            enhance your natural beauty. 💅
          </p>
        </div>

        {catalog.categories.length === 0 ? (
          <div className="border border-dashed border-brown-light rounded-2xl p-12 text-center text-gray-500 bg-white/60">
            No services available at the moment. Please check back soon.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 md:mb-10 px-2">
              {catalog.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`btn-fun px-4 sm:px-5 py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all touch-manipulation ${
                    category.id === activeCategoryId
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-lg hover-bounce'
                      : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-text)]/20 hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] hover-grow'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {activeCategory ? (
              <div className="space-y-10">
                {activeCategory.showNotice && activeCategory.notice.trim().length > 0 && (
                  <div className="bg-[var(--color-surface)] border-l-4 border-[var(--color-primary)] rounded-r-xl p-6 shadow-soft text-left">
                    <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-2">Please note</h2>
                    <p className="text-[var(--color-text)] whitespace-pre-line">{activeCategory.notice}</p>
                  </div>
                )}

                <div
                  ref={ref}
                  className={`space-y-6 transition-opacity ${inView ? 'animate-fade-in-up' : 'opacity-0'}`}
                >
                  {toDisplayServices(activeCategory, currency, formatCurrency).map((displayService, index) => {
                    const fullService = activeCategory.services.find(s => s.id === displayService.id)
                    const isInCart = hasService(displayService.id)
                    const justAdded = addedServiceId === displayService.id
                    
                    const handleAddToCart = () => {
                      if (fullService) {
                        addService({
                          serviceId: fullService.id,
                          name: fullService.name,
                          price: currency === 'USD' && fullService.priceUSD !== undefined 
                            ? fullService.priceUSD 
                            : currency === 'USD' && fullService.price
                            ? convertCurrency(fullService.price, 'KES', 'USD', DEFAULT_EXCHANGE_RATE)
                            : fullService.price || 0,
                          priceUSD: fullService.priceUSD,
                          duration: fullService.duration,
                          categoryId: activeCategory.id,
                          categoryName: activeCategory.name,
                        })
                        setAddedServiceId(displayService.id)
                        setTimeout(() => setAddedServiceId(null), 2000)
                      }
                    }
                    
                    return (
                      <div
                        key={displayService.id}
                        className="card-interactive rounded-2xl border border-[var(--color-text)]/10 bg-[var(--color-surface)] shadow-soft p-4 sm:p-6 md:p-8 transition-all duration-300 hover:shadow-soft-lg hover:border-[var(--color-primary)]/40 hover-glow-fun group relative overflow-hidden"
                      >
                        <div className="cartoon-sticker top-3 right-3 opacity-0 group-hover:opacity-30 transition-opacity duration-300 hidden sm:block">
                          <div className="sticker-sparkle"></div>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                              <h3 className="text-xl sm:text-2xl md:text-3xl font-display text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                                {displayService.name}
                              </h3>
                              <span className="text-[var(--color-primary)] font-semibold text-lg sm:text-xl bg-[color-mix(in srgb,var(--color-primary) 8%, var(--color-surface) 92%)] px-3 py-1 rounded-full border border-[var(--color-primary)]/40 group-hover:border-[var(--color-primary)] transition-colors inline-block w-fit">
                                {displayService.price}
                              </span>
                            </div>
                            {displayService.description && (
                              <p className="text-[var(--color-text)]/80 leading-relaxed mb-2 group-hover:text-[var(--color-text)] transition-colors">
                                {displayService.description}
                              </p>
                            )}
                            {displayService.duration && (
                              <p className="text-sm font-semibold text-[var(--color-primary)]/80 mb-3">
                                Duration: {displayService.duration}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {isInCart ? (
                              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold text-sm text-center border border-green-300">
                                ✓ In Cart
                              </div>
                            ) : (
                              <button
                                onClick={handleAddToCart}
                                className="btn-fun px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-lg font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm"
                              >
                                {justAdded ? <span className="animate-bounce-fun">✓ Added!</span> : 'Add to Cart'}
                              </button>
                            )}
                            {getTotalItems() > 0 && (
                              <Link
                                href="/booking"
                                className="btn-fun px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text)] rounded-lg font-semibold text-sm hover:bg-[var(--color-accent)]/80 transition-colors text-center border border-[var(--color-primary)]/20"
                              >
                                Book ({getTotalItems()})
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-brown-light rounded-2xl p-12 text-center text-gray-500 bg-white/60">
                Select a category to view services.
              </div>
            )}
          </>
        )}

        <div className="mt-16 bg-[var(--color-surface)] rounded-lg shadow-soft p-8 border-t-4 border-[var(--color-primary)]/60 relative overflow-hidden hover-lift">
          <div className="cartoon-sticker top-4 right-4 opacity-25 hidden sm:block">
            <div className="sticker-star animate-float-sticker"></div>
          </div>
          <h3 className="text-2xl font-display text-[var(--color-text)] mb-4">Additional Information 📝</h3>
          <div className="space-y-3 text-[var(--color-text)]/80">
            <p>
              <strong className="text-[var(--color-primary)]">Fill Appointments:</strong> Recommended every 2-3 weeks to maintain your
              lashes. 💖
            </p>
            <p>
              <strong className="text-[var(--color-primary)]">Consultation:</strong> Free consultation available for first-time clients
              to help you choose the perfect lash style. ✨
            </p>
            <p>
              <strong className="text-[var(--color-primary)]">Aftercare:</strong> Detailed aftercare instructions provided to ensure
              longevity and maintain the quality of your lashes. 🌟
            </p>
            <p>
              <strong className="text-[var(--color-primary)]">Pricing:</strong> Prices are displayed in {currency === 'KES' ? 'Kenyan Shillings (KES)' : 'US Dollars (USD)'}. You can switch currencies on the booking page. Contact us for
              any questions about our services or to book your appointment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

