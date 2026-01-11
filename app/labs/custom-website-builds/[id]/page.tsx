'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { DEFAULT_EXCHANGE_RATES, type ExchangeRates } from '@/lib/currency-utils'
import { useLabsCart } from '../cart-context'

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
  category: 'domain' | 'hosting' | 'page' | 'feature' | 'email' | 'design' | 'marketing' | 'other'
  imageUrl?: string
  isRequired?: boolean
  billingPeriod?: 'one-time' | 'yearly'
  setupFee?: number // One-time setup fee for annually billed services
  discount?: number
  discountAmount?: number
  requiredServices?: string[] // Array of service IDs that must be bought together
}

export default function ServiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const serviceSlug = params.id as string
  const { currency, formatCurrency } = useCurrency()
  const { addToCart, items } = useLabsCart()
  const [service, setService] = useState<WebService | null>(null)
  const [allServices, setAllServices] = useState<WebService[]>([])
  const [loading, setLoading] = useState(true)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only showing cart-dependent content after mount
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
    const fetchService = async () => {
      if (!serviceSlug) {
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch(`/api/labs/web-services?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (response.ok) {
          const data = await response.json()
          setAllServices(data.services || [])
          // Find service by matching slug
          const foundService = data.services?.find((s: WebService) => {
            const serviceSlugFromName = createSlug(s.name)
            return serviceSlugFromName === serviceSlug
          })
          if (foundService) {
            setService(foundService)
          } else {
            router.push('/labs/custom-website-builds')
          }
        }
      } catch (error) {
        console.error('Error fetching service:', error)
        router.push('/labs/custom-website-builds')
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [serviceSlug, router])

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

  const getTotalFirstPayment = (service: WebService) => {
    // For annually billed services, total first payment = setup fee + annual subscription
    if (service.billingPeriod === 'yearly' && service.setupFee) {
      const annualPrice = getFinalPrice(service)
      return annualPrice + service.setupFee
    }
    // For one-time services, just return the final price
    return getFinalPrice(service)
  }

  const handleAddToCart = () => {
    if (!service) return
    const finalPrice = getFinalPrice(service)
    addToCart({
      productId: service.id,
      name: service.name,
      price: finalPrice,
      category: service.category,
      billingPeriod: service.billingPeriod,
      setupFee: service.setupFee,
    })
  }

  // Only check cart after component is mounted to prevent hydration mismatch
  const isInCart = mounted && service ? items.some((item) => item.productId === service.id) : false

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown text-xl">Loading service details...</div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-center">
          <p className="text-brown text-xl mb-4">Service not found</p>
          <Link
            href="/labs/custom-website-builds"
            className="inline-flex items-center no-underline font-semibold back-to-services-link"
            style={{ 
              backgroundColor: 'transparent', 
              padding: 0,
              border: 'none',
              boxShadow: 'none',
            }}
          >
            ← Back to Services
          </Link>
        </div>
      </div>
    )
  }

  const finalPrice = getFinalPrice(service)
  const totalFirstPayment = getTotalFirstPayment(service)
  const hasDiscount = service.discount || service.discountAmount
  const isAnnuallyBilled = service.billingPeriod === 'yearly' && service.setupFee

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/labs/custom-website-builds"
          className="inline-flex items-center mb-6 no-underline back-to-services-link"
          style={{ 
            backgroundColor: 'transparent', 
            padding: 0,
            border: 'none',
            boxShadow: 'none',
            color: 'var(--color-text)',
          }}
        >
          ← Back to Services
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {service.imageUrl && (
            <div className="w-full h-64 md:h-96 overflow-hidden bg-brown-light/20">
              <img
                src={service.imageUrl}
                alt={service.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-8">
            <div className="mb-4 flex items-center gap-2 flex-wrap">
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

            <h1 className="text-4xl font-display text-brown-dark mb-4">{service.name}</h1>

            <div className="mb-6">
              {isAnnuallyBilled ? (
                <>
                  {/* Show breakdown for annually billed services */}
                  {hasDiscount && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-brown-dark/60 line-through">
                        Total First Payment: {getDisplayPrice((service.setupFee || 0) + service.price)}
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
                        {service.discountAmount
                          ? `Save ${getDisplayPrice(service.discountAmount)} on subscription`
                          : `${service.discount}% OFF subscription`}
                      </span>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Setup Fee (One-time):</span>
                        <span className="font-semibold text-blue-900">
                          {getDisplayPrice(service.setupFee || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Annual Subscription:</span>
                        <span className="font-semibold text-blue-900">
                          {getDisplayPrice(finalPrice)}
                          <span className="text-xs font-normal text-blue-700 ml-1">
                            ({getDisplayPrice(Math.round((finalPrice || 0) / 12))}/month)
                          </span>
                        </span>
                      </div>
                      <div className="border-t border-blue-200 pt-2 mt-2">
                        <div className="flex justify-between font-bold text-base">
                          <span className="text-blue-900">Total First Payment:</span>
                          <span className="text-blue-900">{getDisplayPrice(totalFirstPayment)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 mt-2 italic">
                      * The annual subscription ({getDisplayPrice(finalPrice)}) will automatically renew one year after purchase.
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-brown-dark text-center">
                    {getDisplayPrice(totalFirstPayment)}
                  </div>
                  <div className="text-sm text-brown-dark/70 mt-1 text-center font-semibold">
                    Total First Payment (payable now)
                  </div>
                </>
              ) : (
                <>
                  {/* Show regular price for one-time services */}
              {hasDiscount && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg text-brown-dark/60 line-through">
                    {getDisplayPrice(service.price)}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-semibold">
                    {service.discountAmount
                      ? `Save ${getDisplayPrice(service.discountAmount)}`
                      : `${service.discount}% OFF`}
                  </span>
                </div>
              )}
              <div className="text-4xl font-bold text-brown-dark">
                {getDisplayPrice(finalPrice)}
              </div>
                </>
              )}
            </div>

            <div className="prose prose-lg max-w-none mb-8">
              <h2 className="text-2xl font-semibold text-brown-dark mb-3">Description</h2>
              <div 
                className="text-brown text-base leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: service.description }}
              />
            </div>

            {service.isRequired && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This service may be automatically added to your cart if required.
                </p>
              </div>
            )}

            {service.requiredServices && service.requiredServices.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Recommended Services</h3>
                <p className="text-sm text-blue-800 mb-2">
                  These services are recommended because <strong>{service.name}</strong> cannot stand alone. 
                </p>
                <p className="text-sm text-blue-800 mb-3 font-medium">
                  ⚠️ It is not possible to checkout without adding these recommended services to your cart.
                </p>
                <p className="text-sm text-blue-700 mb-4">
                  If you'd like to discuss your options or have questions, please{' '}
                  <Link 
                    href="/labs/book-appointment" 
                    className="text-blue-900 underline font-semibold hover:text-blue-950"
                  >
                    book a consultation
                  </Link>
                  {' '}so we can determine the best way forward for your needs.
                </p>
                <div className="space-y-3">
                  {service.requiredServices.map((requiredServiceId) => {
                    const requiredService = allServices.find(s => s.id === requiredServiceId)
                    if (!requiredService) return null
                    const isInCart = mounted ? items.some(item => item.productId === requiredServiceId) : false
                    const finalPrice = getFinalPrice(requiredService)
                    return (
                      <div
                        key={requiredServiceId}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                          isInCart ? 'bg-green-50 border-green-300' : 'bg-white border-blue-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-brown-dark">{requiredService.name}</h4>
                            {isInCart && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                ✓ In Cart
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-brown-dark/70 mt-1">
                            {requiredService.billingPeriod === 'yearly' && requiredService.setupFee ? (
                              <>
                                Total First Payment: {getDisplayPrice((requiredService.setupFee || 0) + getFinalPrice(requiredService))}
                              </>
                            ) : (
                              <>
                            {getDisplayPrice(finalPrice)}
                            {requiredService.billingPeriod === 'yearly' && ' per year'}
                              </>
                            )}
                          </p>
                        </div>
                        {!isInCart && (
                          <button
                            onClick={() => {
                              addToCart({
                                productId: requiredService.id,
                                name: requiredService.name,
                                price: finalPrice,
                                category: requiredService.category,
                                billingPeriod: requiredService.billingPeriod,
                                setupFee: requiredService.setupFee,
                              })
                            }}
                            className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={isInCart}
                className={`flex-1 py-4 rounded-lg font-semibold text-lg transition-all duration-300 ${
                  isInCart
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-brown-dark hover:bg-brown text-white'
                }`}
              >
                {isInCart ? 'Added to Cart' : 'Add to Cart'}
              </button>
              <Link
                href="/labs/custom-website-builds/checkout"
                className="px-6 py-4 bg-brown-light hover:bg-brown text-brown-dark font-semibold rounded-lg transition-colors"
                suppressHydrationWarning
              >
                View Cart (<span className={mounted && items.length > 0 ? 'text-white' : ''}>{mounted ? items.length : 0}</span>)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
