'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { DEFAULT_EXCHANGE_RATES, type ExchangeRates } from '@/lib/currency-utils'
import { useLabsCart } from './cart-context'

// Utility function to create URL-friendly slugs from product names
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: 'domain' | 'hosting' | 'page' | 'feature' | 'email' | 'design' | 'other'
  imageUrl?: string
  isRequired?: boolean
  billingPeriod?: 'one-time' | 'yearly'
  setupFee?: number // One-time setup fee for annually billed services
  discount?: number
  discountAmount?: number
  requiredServices?: string[] // Array of service IDs that must be bought together
}

interface WebServicesData {
  services: WebService[]
  pageDescription?: string
  cartRules: {
    minimumCartValue: number
    autoAddDomainHosting: boolean
    autoAddContactForm: boolean
    suggestBusinessEmail: boolean
  }
}

function BuildOnYourOwnContent() {
  const { currency, formatCurrency } = useCurrency()
  const { addToCart, items, removeFromCart, updateQuantity, getTotalPrice } = useLabsCart()
  const [services, setServices] = useState<WebService[]>([])
  const [pageDescription, setPageDescription] = useState<string>('Select the services and features you want. Our smart cart will help ensure you have everything you need.')
  const [cartRules, setCartRules] = useState<WebServicesData['cartRules']>({
    minimumCartValue: 20000,
    autoAddDomainHosting: true,
    autoAddContactForm: true,
    suggestBusinessEmail: true,
  })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES)
  const [capacityStatus, setCapacityStatus] = useState<{
    isCapacityReached: boolean
    orderCount: number
    monthlyCapacity: number
    currentMonth: string
  } | null>(null)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [submittingWaitlist, setSubmittingWaitlist] = useState(false)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [waitlistError, setWaitlistError] = useState<string | null>(null)
  const [expandedRecommendedServices, setExpandedRecommendedServices] = useState<Set<string>>(new Set())

  // Ensure component is mounted before rendering client-only content
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setExchangeRates(data)
        }
      } catch (error) {
        console.error('Error loading exchange rates:', error)
      }
    }
    loadExchangeRates()
  }, [])

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const [servicesResponse, capacityResponse] = await Promise.all([
          fetch(`/api/labs/web-services?t=${Date.now()}`, { cache: 'no-store' }),
          fetch('/api/labs/web-services/capacity', { cache: 'no-store' }),
        ])
        
        if (servicesResponse.ok) {
          const data = await servicesResponse.json()
          setServices(data.services || [])
          setPageDescription(data.pageDescription || 'Select the services and features you want. Our smart cart will help ensure you have everything you need.')
          setCartRules(data.cartRules || {
            minimumCartValue: 20000,
            autoAddDomainHosting: true,
            autoAddContactForm: true,
            suggestBusinessEmail: true,
          })
        }

        if (capacityResponse.ok) {
          const capacityData = await capacityResponse.json()
          setCapacityStatus(capacityData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const getDisplayPrice = (price: number) => {
    if (currency === 'USD') {
      // Convert KES to USD: divide by the exchange rate (default 130)
      const exchangeRate = exchangeRates.usdToKes || 130
      const usdPrice = price / exchangeRate
      // formatCurrency uses the currency from context, but we need to format as USD
      return `$${usdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    // KES formatting
    return `KSH ${Math.round(price).toLocaleString('en-KE')}`
  }

  const getFinalPrice = (service: WebService) => {
    let finalPrice = service.price
    if (service.discountAmount) {
      finalPrice = service.price - service.discountAmount
    } else if (service.discount) {
      finalPrice = service.price * (1 - service.discount / 100)
    }
    return Math.max(0, finalPrice)
  }

  const categories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean))
  ).sort()

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category === selectedCategory)
    : services

  const handleAddToCart = (service: WebService) => {
    if (capacityStatus?.isCapacityReached) {
      return // Block adding to cart when capacity is reached
    }
    const finalPrice = getFinalPrice(service)
    // For yearly services with setup fee, the price in cart is the annual subscription
    // Setup fee will be handled separately in checkout
    addToCart({
      productId: service.id,
      name: service.name,
      price: finalPrice,
      category: service.category,
      billingPeriod: service.billingPeriod,
      setupFee: service.setupFee,
    })
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!waitlistEmail.trim() || !waitlistEmail.includes('@')) {
      setWaitlistError('Please enter a valid email address')
      return
    }

    setSubmittingWaitlist(true)
    setWaitlistError(null)

    try {
      const response = await fetch('/api/labs/web-services/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setWaitlistSuccess(true)
        setWaitlistEmail('')
      } else {
        setWaitlistError(data.error || 'Failed to add email to waitlist')
      }
    } catch (error) {
      console.error('Error submitting waitlist:', error)
      setWaitlistError('Failed to submit. Please try again.')
    } finally {
      setSubmittingWaitlist(false)
    }
  }

  const isInCart = (serviceId: string) => {
    return items.some((item) => item.productId === serviceId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown text-xl">Loading services...</div>
      </div>
    )
  }

  const isCapacityReached = capacityStatus?.isCapacityReached ?? false

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header and Cart Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left: Header Section */}
          <div className="lg:col-span-2">
            <div className="text-center lg:text-left">
              {/* Main Heading */}
              <h1 className="text-5xl md:text-6xl font-display text-brown-dark mb-3 leading-tight">
                Custom Website Builds
              </h1>
              
              {/* Subtitle */}
              <p className="text-brown-dark text-xl md:text-2xl font-medium mb-6">
                Choose exactly what you need for your booking website
              </p>
              
              {/* Description Card */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg border border-brown-light/30 max-w-2xl lg:max-w-none mx-auto lg:mx-0">
                <p className="text-brown-dark text-base md:text-lg leading-relaxed mb-4">
                  {pageDescription || 'Select the services and features you need, and our smart cart will guide you to ensure nothing essential is missed.'}
                </p>
                
                {/* Key Features */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brown-dark mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-brown-dark/80 text-sm md:text-base">
                      Your website will be designed and built within <strong className="text-brown-dark font-semibold">21 days</strong>
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brown-dark mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-brown-dark/80 text-sm md:text-base">
                      You'll receive your <strong className="text-brown-dark font-semibold">live domain</strong>, <strong className="text-brown-dark font-semibold">admin login details</strong>, and a <strong className="text-brown-dark font-semibold">scheduled online walkthrough</strong>
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-brown-dark mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-brown-dark/80 text-sm md:text-base">
                      Learn how to use and manage your website with confidence
                    </p>
                  </div>
                </div>
                
                {/* Minimum Order Value - Highlighted */}
                <div className="pt-4 border-t border-brown-light/40">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-brown-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-brown-dark font-semibold text-base md:text-lg">
                      Minimum order value: <span className="text-brown-dark text-lg md:text-xl">{getDisplayPrice(cartRules.minimumCartValue)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Cart Icon */}
          <div className="lg:col-span-1">
            <div className="flex justify-center lg:justify-end">
              <Link
                href="/labs/custom-website-builds/checkout"
                className="relative inline-flex items-center gap-3 p-4 bg-brown-dark text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-lg font-semibold text-white">Cart</span>
                {mounted && items.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-brown-dark rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                    {items.length}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Capacity Reached Message */}
        {isCapacityReached && (
          <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-red-800 mb-3 text-center">
              Monthly Capacity Reached
            </h2>
            <p className="text-red-700 text-center mb-4">
              We take on a limited number of web service projects each month to ensure quality delivery.
            </p>
            <p className="text-red-700 text-center mb-6">
              All available slots for this month are currently filled. New web service orders will reopen next month.
            </p>

            {/* Waitlist Form */}
            {!waitlistSuccess ? (
              <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto">
                <div className="mb-4">
                  <label htmlFor="waitlist-email" className="block text-sm font-medium text-red-800 mb-2">
                    Get notified when slots open:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      id="waitlist-email"
                      value={waitlistEmail}
                      onChange={(e) => {
                        setWaitlistEmail(e.target.value)
                        setWaitlistError(null)
                      }}
                      placeholder="your@email.com"
                      required
                      className="flex-1 rounded-lg border-2 border-red-300 bg-white px-4 py-2 text-sm text-brown-dark focus:border-red-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingWaitlist}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingWaitlist ? 'Submitting...' : 'Notify Me'}
                    </button>
                  </div>
                  {waitlistError && (
                    <p className="text-red-600 text-sm mt-2">{waitlistError}</p>
                  )}
                </div>
              </form>
            ) : (
              <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-center font-semibold">
                  ✓ You've been added to the waitlist! We'll notify you when slots open.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
                selectedCategory === null
                  ? 'bg-brown-dark text-white shadow-lg'
                  : 'bg-white text-brown-dark border-2 border-brown-light hover:border-brown-dark'
              }`}
            >
              All Services
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 capitalize ${
                  selectedCategory === category
                    ? 'bg-brown-dark text-white shadow-lg'
                    : 'bg-white text-brown-dark border-2 border-brown-light hover:border-brown-dark'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {filteredServices.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-brown text-xl">
              {selectedCategory ? `No services found in "${selectedCategory}" category.` : 'No services available at the moment.'}
            </p>
            <p className="text-brown-dark/70 mt-2">
              {selectedCategory ? (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-brown-dark underline hover:text-brown"
                >
                  View all services
                </button>
              ) : (
                'Check back soon!'
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const finalPrice = getFinalPrice(service)
              const inCart = isInCart(service.id)
              const hasDiscount = service.discount || service.discountAmount

              return (
                <div
                  key={service.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  <Link
                    href={isCapacityReached ? '#' : `/labs/custom-website-builds/${createSlug(service.name)}`}
                    onClick={(e) => {
                      if (isCapacityReached) {
                        e.preventDefault()
                      }
                    }}
                    className={`flex-1 flex flex-col transition-opacity ${
                      isCapacityReached ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
                    }`}
                  >
                    {service.imageUrl && (
                      <div className="w-full h-48 overflow-hidden bg-brown-light/20">
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-3 py-1 bg-brown-light/30 text-brown-dark rounded-full text-xs font-semibold capitalize">
                        {service.category}
                      </span>
                      {service.billingPeriod === 'yearly' ? (
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          Billed Annually
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          One-Time Payment
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-display text-brown-dark mb-3">
                      {service.name}
                    </h3>
                    <div 
                      className="text-brown text-sm mb-4 flex-1 line-clamp-3 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1"
                      dangerouslySetInnerHTML={{ __html: service.description.replace(/<[^>]*>/g, '').substring(0, 150) + '...' }}
                    />
                    <div className="mb-4">
                      {hasDiscount && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-brown-dark/60 line-through">
                            {getDisplayPrice(service.price)}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                            {service.discountAmount
                              ? `Save ${getDisplayPrice(service.discountAmount)}`
                              : `${service.discount}% OFF`}
                          </span>
                        </div>
                      )}
                      {service.billingPeriod === 'yearly' && service.setupFee ? (
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-brown-dark/70 mb-1">Setup Fee (One-time):</div>
                            <div className="text-lg font-bold text-brown-dark">
                              {getDisplayPrice(service.setupFee)}
                            </div>
                          </div>
                          <div className="border-t border-brown-light pt-2">
                            <div className="text-xs text-brown-dark/70 mb-1">Annual Subscription:</div>
                            <div className="text-lg font-bold text-brown-dark">
                              {getDisplayPrice(finalPrice)}
                            </div>
                            <div className="text-xs text-brown-dark/60 mt-1">
                              per year ({getDisplayPrice(Math.round(finalPrice / 12))}/month)
                            </div>
                          </div>
                          <div className="border-t border-brown-light pt-2">
                            <div className="text-xs text-brown-dark/70 mb-1">Total First Payment:</div>
                            <div className="text-xl font-bold text-brown-dark">
                              {getDisplayPrice(service.setupFee + finalPrice)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-brown-dark">
                            {getDisplayPrice(finalPrice)}
                          </div>
                          {service.billingPeriod === 'yearly' && (
                            <div className="text-xs text-brown-dark/70 mt-1 font-medium">
                              per year ({getDisplayPrice(Math.round(finalPrice / 12))}/month)
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    </div>
                  </Link>
                  
                  {/* Recommended Services Section */}
                  {service.requiredServices && service.requiredServices.length > 0 && (
                    <div className="px-6 pb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedRecommendedServices(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(service.id)) {
                              newSet.delete(service.id)
                            } else {
                              newSet.add(service.id)
                            }
                            return newSet
                          })
                        }}
                        className="w-full bg-brown-dark hover:bg-brown border border-brown-dark rounded-lg p-2 transition-all duration-300 recommended-services-button"
                        style={{ 
                          backgroundColor: 'var(--color-primary-dark)',
                          color: '#ffffff'
                        }}
                      >
                        <div className="flex items-center justify-between recommended-services-text" style={{ color: '#ffffff' }}>
                          <div className="flex items-center gap-2 recommended-services-text" style={{ color: '#ffffff' }}>
                            <span 
                              className="text-xs font-semibold recommended-services-text" 
                              style={{ color: '#ffffff' }}
                            >
                              ⚠️ {service.requiredServices.length} Recommended Service{service.requiredServices.length > 1 ? 's' : ''} Required
                            </span>
                            {mounted && service.requiredServices.some(id => items.some(item => item.productId === id)) && (
                              <span className="px-1.5 py-0.5 bg-white text-brown-dark rounded text-xs font-semibold">
                                {service.requiredServices.filter(id => items.some(item => item.productId === id)).length}/{service.requiredServices.length} Added
                              </span>
                            )}
                          </div>
                          <svg
                            className={`w-4 h-4 recommended-services-icon transition-transform ${
                              expandedRecommendedServices.has(service.id) ? 'transform rotate-180' : ''
                            }`}
                            style={{ color: '#ffffff' }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {expandedRecommendedServices.has(service.id) && (
                        <div className="mt-2 bg-brown-light/20 border border-brown-light/40 rounded-lg p-3 space-y-2">
                          <p className="text-xs text-brown-dark mb-2">
                            <strong>{service.name}</strong> cannot stand alone. Checkout requires all recommended services.
                          </p>
                          {service.requiredServices.map((requiredServiceId) => {
                            const requiredService = services.find(s => s.id === requiredServiceId)
                            if (!requiredService) return null
                            const requiredInCart = items.some(item => item.productId === requiredServiceId)
                            const requiredFinalPrice = getFinalPrice(requiredService)
                            return (
                              <div
                                key={requiredServiceId}
                                className={`flex items-center justify-between p-2 rounded border ${
                                  requiredInCart ? 'bg-green-50 border-green-300' : 'bg-white border-blue-200'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-semibold text-brown-dark text-xs truncate">{requiredService.name}</h5>
                                    {requiredInCart && (
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold whitespace-nowrap">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-brown-dark/70 mt-0.5">
                                    {getDisplayPrice(requiredFinalPrice)}
                                    {requiredService.billingPeriod === 'yearly' && ' per year'}
                                  </p>
                                </div>
                                {!requiredInCart && !isCapacityReached && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAddToCart(requiredService)
                                    }}
                                    disabled={isCapacityReached}
                                    className="ml-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          <p className="text-xs text-blue-700 mt-2 pt-2 border-t border-blue-200">
                            Questions?{' '}
                            <Link 
                              href="/labs/book-appointment" 
                              className="text-blue-900 underline font-semibold hover:text-blue-950"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Book a consultation
                            </Link>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="px-6 pb-6">
                    <div className="flex gap-2">
                      <Link
                        href={isCapacityReached ? '#' : `/labs/custom-website-builds/${createSlug(service.name)}`}
                        onClick={(e) => {
                          if (isCapacityReached) {
                            e.preventDefault()
                          }
                        }}
                        className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all duration-300 text-center ${
                          isCapacityReached
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
                            : 'bg-brown-light hover:bg-brown text-brown-dark hover:text-white'
                        }`}
                      >
                        View Details
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isCapacityReached) {
                            return
                          }
                          handleAddToCart(service)
                        }}
                        disabled={inCart || isCapacityReached}
                        className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                          inCart || isCapacityReached
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-brown-dark hover:bg-brown text-white'
                        }`}
                      >
                        {inCart ? 'Added' : isCapacityReached ? 'Unavailable' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

export default function BuildOnYourOwn() {
  return <BuildOnYourOwnContent />
}

