'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useLabsCart } from '../../cart-context'
import { useCurrency } from '@/contexts/CurrencyContext'

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: string
  billingPeriod?: 'one-time' | 'yearly' | 'monthly'
  setupFee?: number
}

interface GuideScenario {
  id: string
  name: string
  description: string
  mustHaveServiceIds: string[]
  recommendedServiceIds: string[]
}

interface GuideData {
  scenarios: GuideScenario[]
}

// Utility function to create URL-friendly slugs from scenario names
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export default function GuideScenarioPage() {
  const router = useRouter()
  const params = useParams()
  const scenarioSlug = params?.scenario as string
  const { addToCart, removeFromCart } = useLabsCart()
  const { currency, formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [guideData, setGuideData] = useState<GuideData | null>(null)
  const [services, setServices] = useState<WebService[]>([])
  const [selectedScenario, setSelectedScenario] = useState<GuideScenario | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [guideResponse, servicesResponse] = await Promise.all([
          fetch('/api/labs/guide'),
          fetch('/api/labs/web-services'),
        ])

        if (!guideResponse.ok || !servicesResponse.ok) {
          throw new Error('Failed to load data')
        }

        const guide = await guideResponse.json()
        const servicesData = await servicesResponse.json()
        
        setGuideData(guide)
        setServices(servicesData.services || [])

        // Find the scenario by matching slug
        const scenario = guide.scenarios?.find((s: GuideScenario) => 
          createSlug(s.name) === scenarioSlug
        )
        
        if (scenario) {
          setSelectedScenario(scenario)
        }
      } catch (error) {
        console.error('Error loading guide data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (scenarioSlug) {
      loadData()
    }
  }, [scenarioSlug])

  const getServiceById = (id: string): WebService | undefined => {
    return services.find(s => s.id === id)
  }

  const isInCart = (serviceId: string): boolean => {
    if (typeof window === 'undefined') return false
    const cart = JSON.parse(localStorage.getItem('labs-cart') || '[]')
    return cart.some((item: any) => item.productId === serviceId || item.id === serviceId)
  }

  const getFinalPrice = (service: WebService): number => {
    return (service.price || 0) + (service.setupFee || 0)
  }

  const handleAddAllMustHaves = async (scenario: GuideScenario) => {
    const allServiceIds = [...scenario.mustHaveServiceIds, ...scenario.recommendedServiceIds]
    
    // Set flag to indicate services are being added from a guide page
    if (typeof window !== 'undefined') {
      localStorage.setItem('labs-checkout-from-guide', 'true')
    }
    
    // Remove services first to reset quantity, then add them fresh with quantity 1
    allServiceIds.forEach(serviceId => {
      const service = getServiceById(serviceId)
      if (service) {
        // Remove if exists (to reset quantity)
        removeFromCart(service.id)
        // Add fresh with quantity 1
        addToCart({
          productId: service.id,
          name: service.name,
          price: service.price || 0,
          setupFee: service.setupFee || 0,
          category: service.category,
          billingPeriod: service.billingPeriod || 'one-time',
        })
      }
    })

    // Small delay to ensure cart state is updated before navigation
    setTimeout(() => {
      router.push('/labs/custom-website-builds/checkout?fromGuide=true')
    }, 300)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-brown-dark/70">Loading guide...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedScenario) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/labs/custom-website-builds/guide"
            className="inline-flex items-center mb-6 no-underline back-to-services-link"
            style={{
              backgroundColor: 'transparent',
              padding: 0,
              border: 'none',
              boxShadow: 'none',
              color: 'var(--color-text)',
            }}
          >
            ← Back to Guide
          </Link>
          <div className="text-center py-12">
            <h1 className="text-2xl font-display text-brown-dark mb-4">Scenario not found</h1>
            <Link
              href="/labs/custom-website-builds/guide"
              className="px-6 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-medium"
            >
              Back to Guide
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const mustHaveServices = selectedScenario.mustHaveServiceIds
    .map(id => getServiceById(id))
    .filter((s): s is WebService => s !== undefined)
  
  const recommendedServices = selectedScenario.recommendedServiceIds
    .map(id => getServiceById(id))
    .filter((s): s is WebService => s !== undefined)

  const allMustHavesInCart = selectedScenario.mustHaveServiceIds.every(id => isInCart(id))

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/labs/custom-website-builds/guide"
          className="inline-flex items-center mb-6 no-underline back-to-services-link"
          style={{
            backgroundColor: 'transparent',
            padding: 0,
            border: 'none',
            boxShadow: 'none',
            color: 'var(--color-text)',
          }}
        >
          ← Back to Guide
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-display text-brown-dark mb-2">{selectedScenario.name}</h1>
              {selectedScenario.description && (
                <div 
                  className="text-brown-dark/70 text-lg prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedScenario.description }}
                />
              )}
            </div>

            <div className="space-y-6">
              {/* Must-Haves Section */}
              {mustHaveServices.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-brown-dark flex items-center gap-2">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                        Must-Haves
                      </span>
                    </h2>
                    {allMustHavesInCart && (
                      <span className="text-sm text-green-600 font-medium">✓ All added to cart</span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {mustHaveServices.map((service) => {
                      const inCart = isInCart(service.id)
                      const finalPrice = getFinalPrice(service)
                      return (
                        <div
                          key={service.id}
                          className="p-4 rounded-lg border-2 bg-white border-brown-light"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-brown-dark">{service.name}</h3>
                              <p className="text-xs text-brown-dark/60 mt-1 line-clamp-2">
                                {service.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="text-sm font-bold text-brown-dark">
                              {formatCurrency(finalPrice)}
                              {service.billingPeriod === 'monthly' && ' /month'}
                              {service.billingPeriod === 'yearly' && ' /year'}
                            </div>
                            <div className="text-xs text-brown-dark/60">
                              {service.category} • {service.billingPeriod || 'one-time'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recommended Section */}
              {recommendedServices.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-brown-dark mb-4 flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                      Recommended
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {recommendedServices.map((service) => {
                      const finalPrice = getFinalPrice(service)
                      return (
                        <div
                          key={service.id}
                          className="p-4 rounded-lg border-2 bg-white border-brown-light"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-brown-dark">{service.name}</h3>
                              <p className="text-xs text-brown-dark/60 mt-1 line-clamp-2">
                                {service.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="text-sm font-bold text-brown-dark">
                              {formatCurrency(finalPrice)}
                              {service.billingPeriod === 'monthly' && ' /month'}
                              {service.billingPeriod === 'yearly' && ' /year'}
                            </div>
                            <div className="text-xs text-brown-dark/60">
                              {service.category} • {service.billingPeriod || 'one-time'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add All Button */}
              <div className="pt-4 border-t border-brown-light">
                <button
                  onClick={() => handleAddAllMustHaves(selectedScenario)}
                  className="w-full px-6 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold text-lg"
                >
                  Add All Services to Cart & Proceed to Checkout
                </button>
                <p className="text-xs text-brown-dark/60 mt-2 text-center">
                  This will add all must-have and recommended services to your cart and take you to checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

