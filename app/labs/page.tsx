'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertCurrency, DEFAULT_EXCHANGE_RATES } from '@/lib/currency-utils'
import CoursesDiscountBanner from '@/components/CoursesDiscountBanner'

interface PricingTier {
  id: string
  name: string
  tagline: string
  priceKES: number
  description: string
  features: {
    included: string[]
    excluded?: string[]
  }
  cta: string
  popular?: boolean
}

interface WhatYouGetContent {
  title: string
  subtitle: string
  whatYouGetTitle: string
  whatYouGetItems: string[]
  whyThisWorksTitle: string
  whyThisWorksItems: string[]
}

interface WhoThisIsForContent {
  title: string
  subtitle: string
  items: string[]
}

interface LabsStatistics {
  consultationsCompleted: number
  websitesBuilt: number
  averageSetupTime: string
  clientSatisfactionRate: number
  businessesTransformed?: number
}

interface LabsSettings {
  consultationFeeKES: number
  tiers: PricingTier[]
  statistics?: LabsStatistics
  statisticsEnabled?: boolean
  whatYouGet?: WhatYouGetContent
  whatYouGetEnabled?: boolean
  whoThisIsFor?: WhoThisIsForContent
  whoThisIsForEnabled?: boolean
  courseSectionEnabled?: boolean
}

export default function LabsPage() {
  const { currency } = useCurrency()
  const [hoveredTier, setHoveredTier] = useState<string | null>(null)
  const [settings, setSettings] = useState<LabsSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Use public API route - no authentication required
        const timestamp = Date.now()
        const response = await fetch(`/api/labs/settings?t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        })
        if (response.ok) {
          const data = await response.json()
          
          // The API should always return tiers (it has defaults)
          // Trust the API response - it guarantees tiers are present
          if (data && data.tiers && Array.isArray(data.tiers) && data.tiers.length > 0) {
            setSettings(data)
          } else {
            // This should never happen if API works correctly
            // Still set the data - API should have provided defaults
            // If tiers are missing, the empty state will show
            setSettings(data || {
              consultationFeeKES: 0,
              tiers: [],
            })
          }
        } else {
          // Fallback to default if API fails
          setSettings({
            consultationFeeKES: 0,
            tiers: [],
          })
        }
      } catch (error) {
        console.error('Error loading labs settings:', error)
        // Fallback to default on error
        setSettings({
          consultationFeeKES: 0,
          tiers: [],
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const tiers = settings?.tiers || []

  const formatPrice = (priceKES: number): string => {
    if (currency === 'USD') {
      const priceUSD = convertCurrency(priceKES, 'KES', 'USD', DEFAULT_EXCHANGE_RATES)
      return `$${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    return `${priceKES.toLocaleString('en-US')} KSH`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <CoursesDiscountBanner />
      <div className="min-h-screen bg-baby-pink-light py-8 sm:py-12 md:py-20 relative overflow-hidden">
        {/* Floating Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Simplified decorative elements to avoid missing CSS class errors */}
          <div className="absolute top-20 left-10 animate-float opacity-40 hidden md:block" style={{ animationDelay: '0s' }}>
            <div className="text-4xl">✨</div>
          </div>
          <div className="absolute top-32 right-16 animate-float opacity-35 hidden lg:block" style={{ animationDelay: '1.2s' }}>
            <div className="text-3xl">⭐</div>
          </div>
          <div className="absolute bottom-40 left-20 animate-float opacity-30 hidden md:block" style={{ animationDelay: '2.3s' }}>
            <div className="text-4xl">❤️</div>
          </div>
          <div className="absolute top-1/2 right-12 animate-float opacity-35 hidden xl:block" style={{ animationDelay: '0.8s' }}>
            <div className="text-3xl animate-spin" style={{ animationDuration: '20s' }}>💫</div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display text-[var(--color-primary)] mb-4 sm:mb-6 relative inline-block">
              LashDiary Labs
              <span className="absolute -top-2 -right-8 text-2xl opacity-50 hidden lg:inline-block">✨</span>
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-[var(--color-text)] mb-6 max-w-3xl mx-auto font-medium">
              For service providers who want order and less chaos
            </p>
            <div className="max-w-4xl mx-auto mt-8">
              <div className="bg-[var(--color-surface)] rounded-2xl p-6 sm:p-8 md:p-10 shadow-soft border border-[var(--color-primary)]/10">
                <p className="text-base sm:text-lg text-[var(--color-text)] leading-relaxed mb-4">
                  We understand that running a service-based business means juggling appointments, payments, client communication, and endless administrative tasks. 
                  <span className="font-semibold text-[var(--color-primary)]"> LashDiary Labs</span> exists to eliminate that chaos.
                </p>
                <p className="text-base sm:text-lg text-[var(--color-text)]/90 leading-relaxed">
                  We provide <span className="font-semibold">professional systems with perfectly implemented checkouts</span> that transform how you manage your business. 
                  No more lost bookings, payment confusion, or client communication breakdowns. Just clean, organized operations that let you focus on what you do best.
                </p>
                <p className="text-base sm:text-lg text-[var(--color-text)]/90 leading-relaxed mt-4">
                  Your tier determines the features and support you receive based on the system you choose. 
                  We'll set up your system according to your selected tier and provide you with login credentials to access your account.
                </p>
                <p className="text-base sm:text-lg text-[var(--color-text)]/90 leading-relaxed mt-4">
                  <span className="italic text-[var(--color-text)]/80">Please note:</span> A consultation is required before purchasing any tier. 
                  This ensures we understand your specific needs and recommend the perfect system for your business.
                </p>
              </div>
            </div>
          </div>

          {/* Consultation Information Section */}
          <div className="mb-16">
            <div className="bg-[var(--color-surface)] rounded-2xl p-8 sm:p-10 md:p-12 shadow-soft border border-[var(--color-primary)]/10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-[var(--color-primary)] text-center mb-6">
                What is a Consultation?
              </h2>
              
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg sm:text-xl text-[var(--color-text)] leading-relaxed">
                    A consultation is a comprehensive one-on-one session where we dive deep into your business operations, 
                    understand your specific needs, and create a tailored plan for your booking system. This is your opportunity 
                    to see exactly how LashDiary works and determine if it's the right fit for your business.
                  </p>
                </div>

                {/* Consultation Fee */}
                <div className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 rounded-xl p-6 border border-[var(--color-primary)]/20">
                  <div className="text-center">
                    <p className="text-sm sm:text-base text-[var(--color-text)]/70 mb-2">Consultation Fee</p>
                    <p className="text-4xl sm:text-5xl font-bold text-[var(--color-primary)] mb-2">
                      {settings?.consultationFeeKES === 0 
                        ? 'Free' 
                        : settings?.consultationFeeKES 
                          ? formatPrice(settings.consultationFeeKES)
                          : 'Loading...'}
                    </p>
                    <p className="text-sm sm:text-base text-[var(--color-text)]/70">
                      {settings?.consultationFeeKES === 0 
                        ? 'No payment required for this consultation'
                        : 'One-time fee for a full consultation session'}
                    </p>
                  </div>
                </div>

                {/* What the Consultation Entails */}
                <div>
                  <h3 className="text-2xl sm:text-3xl font-display text-[var(--color-primary)] mb-4">
                    What the Consultation Entails
                  </h3>
                  <ul className="space-y-3 text-[var(--color-text)]">
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-[var(--color-primary)] mr-3 flex-shrink-0 mt-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-base sm:text-lg">
                        <strong>Live Demo of LashDiary.co.ke:</strong> You'll get hands-on access to see exactly how the system works. 
                        We'll walk you through both the <strong>admin side</strong> (where you manage bookings, clients, and settings) 
                        and the <strong>client side</strong> (where your customers book appointments and make payments).
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-[var(--color-primary)] mr-3 flex-shrink-0 mt-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-base sm:text-lg">
                        <strong>Business Analysis:</strong> We'll analyze your current booking process, identify pain points, 
                        and understand your specific operational needs.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-[var(--color-primary)] mr-3 flex-shrink-0 mt-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-base sm:text-lg">
                        <strong>Customized Recommendations:</strong> Based on your business model, we'll recommend the perfect 
                        tier and features that align with your goals and budget.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-[var(--color-primary)] mr-3 flex-shrink-0 mt-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-base sm:text-lg">
                        <strong>Implementation Plan:</strong> We'll create a clear roadmap for how your system will be set up, 
                        what features you'll get, and the timeline for delivery.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-[var(--color-primary)] mr-3 flex-shrink-0 mt-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-base sm:text-lg">
                        <strong>Q&A Session:</strong> Ask any questions you have about the system, pricing, implementation, 
                        or how it will work specifically for your business.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* CTA */}
                <div className="text-center pt-4">
                  <Link
                    href="/labs/book-appointment"
                    className="inline-block bg-[var(--color-primary)] text-[var(--color-on-primary)] px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    Book Your Consultation
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-[var(--color-primary)] text-center mb-4">
              Ready to Get Started? Choose Your System
            </h2>
            <p className="text-center text-[var(--color-text)] mb-12 text-lg max-w-2xl mx-auto">
              After your consultation, you'll be able to choose the tier that best fits your business needs. 
              Book your consultation first to discuss your requirements and see the system in action.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
              {tiers.length > 0 ? tiers.map((tier, index) => {
                const isHovered = hoveredTier === tier.id
                const isPopular = tier.popular

                return (
                  <div
                    key={tier.id}
                    className={`relative bg-[var(--color-surface)] rounded-2xl shadow-soft border-2 transition-all duration-300 ${
                      isPopular
                        ? 'border-[var(--color-primary)] shadow-xl z-10 md:col-span-1'
                        : 'border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40'
                    }`}
                    onMouseEnter={() => setHoveredTier(tier.id)}
                    onMouseLeave={() => setHoveredTier(null)}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 z-20">
                        <span className="bg-[var(--color-primary)] text-[var(--color-on-primary)] px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-md">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="p-4 sm:p-6 md:p-8">
                      {/* Tier Header */}
                      <div className="mb-4 sm:mb-6">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-display text-[var(--color-primary)] mb-2">
                          {tier.name}
                        </h3>
                        {tier.description && (
                          <p className="text-xs sm:text-sm text-[var(--color-text)]/70 italic mb-2 sm:mb-3">
                            {tier.description}
                          </p>
                        )}
                        <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-primary)] mb-2">
                          {formatPrice(tier.priceKES)}
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] mb-2 sm:mb-3 uppercase tracking-wide">
                            What You Get
                          </h4>
                          <ul className="space-y-1.5 sm:space-y-2">
                            {tier.features.included.map((feature, idx) => (
                              <li key={idx} className="flex items-start text-xs sm:text-sm text-[var(--color-text)]">
                                <svg
                                  className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)] mr-2 flex-shrink-0 mt-0.5"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {tier.features.excluded && tier.features.excluded.length > 0 && (
                          <div className="pt-3 sm:pt-4 border-t border-[var(--color-primary)]/10">
                            <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-text)]/60 mb-2 sm:mb-3 uppercase tracking-wide">
                              Not Included
                            </h4>
                            <ul className="space-y-1.5 sm:space-y-2">
                              {tier.features.excluded.map((feature, idx) => (
                                <li key={idx} className="flex items-start text-xs sm:text-sm text-[var(--color-text)]/60">
                                  <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text)]/40 mr-2 flex-shrink-0 mt-0.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span className="leading-relaxed">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* CTA Button */}
                      <Link
                        href={`/labs/book-appointment?tier=${encodeURIComponent(tier.id)}`}
                        className={`block w-full text-center py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ${
                          isPopular
                            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-dark)] shadow-md hover:shadow-lg transform hover:scale-105'
                            : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]'
                        }`}
                      >
                        {tier.cta}
                      </Link>
                    </div>
                  </div>
                )
              }) : (
                // This should never happen since API always returns default tiers
                // But if it does, show a loading/empty state without error message
                <div className="w-full text-center py-12">
                  <p className="text-[var(--color-text)] text-lg">Loading pricing tiers...</p>
                </div>
              )}
            </div>
          </div>

          {/* What You Get Section */}
          {settings?.whatYouGetEnabled && settings?.whatYouGet && (
            <div className="bg-[var(--color-surface)] rounded-2xl p-8 sm:p-10 md:p-12 shadow-soft border border-[var(--color-primary)]/10 mb-12">
              <h2 className="text-3xl sm:text-4xl font-display text-[var(--color-primary)] text-center mb-4">
                {settings.whatYouGet.title || 'What You Get'}
              </h2>
              {settings.whatYouGet.subtitle && (
                <p className="text-lg sm:text-xl text-[var(--color-text)] mb-10 text-center max-w-3xl mx-auto">
                  {settings.whatYouGet.subtitle}
                </p>
              )}

              <div className="max-w-4xl mx-auto space-y-10">
                {/* What You Get Items */}
                {settings.whatYouGet.whatYouGetTitle && settings.whatYouGet.whatYouGetItems && settings.whatYouGet.whatYouGetItems.length > 0 && (
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-display text-[var(--color-primary)] mb-6">
                      {settings.whatYouGet.whatYouGetTitle}
                    </h3>
                    <ul className="space-y-4 text-[var(--color-text)]">
                      {settings.whatYouGet.whatYouGetItems.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-[var(--color-primary)] mr-3 mt-1 text-xl">•</span>
                          <span className="text-base sm:text-lg">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Why This Works Items */}
                {settings.whatYouGet.whyThisWorksTitle && settings.whatYouGet.whyThisWorksItems && settings.whatYouGet.whyThisWorksItems.length > 0 && (
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-display text-[var(--color-primary)] mb-6">
                      {settings.whatYouGet.whyThisWorksTitle}
                    </h3>
                    <ul className="space-y-4 text-[var(--color-text)]">
                      {settings.whatYouGet.whyThisWorksItems.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-[var(--color-primary)] mr-3 mt-1 text-xl">•</span>
                          <span className="text-base sm:text-lg">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Who This is For Section */}
          {settings?.whoThisIsForEnabled && settings?.whoThisIsFor && (
            <div className="bg-[var(--color-surface)] rounded-2xl p-8 sm:p-10 md:p-12 shadow-soft border border-[var(--color-primary)]/10 mb-12">
              <h2 className="text-3xl sm:text-4xl font-display text-[var(--color-primary)] text-center mb-8">
                {settings.whoThisIsFor.title || 'Who This is For'}
              </h2>
              <div className="max-w-4xl mx-auto">
                {settings.whoThisIsFor.subtitle && (
                  <p className="text-lg sm:text-xl text-[var(--color-text)] mb-8 text-center">
                    {settings.whoThisIsFor.subtitle}
                  </p>
                )}
                {settings.whoThisIsFor.items && settings.whoThisIsFor.items.length > 0 && (
                  <ul className="space-y-4 text-[var(--color-text)]">
                    {settings.whoThisIsFor.items.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-[var(--color-primary)] mr-3 mt-1 text-xl">•</span>
                        <span className="text-base sm:text-lg">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}


          {/* Statistics Section */}
          {settings?.statisticsEnabled && settings?.statistics && (
            <div className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 rounded-2xl p-8 sm:p-10 md:p-12 shadow-soft border border-[var(--color-primary)]/20 mt-8">
                <h3 className="text-2xl sm:text-3xl font-display text-[var(--color-primary)] text-center mb-8">
                  The Results Speak for Themselves
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-primary)] mb-2">
                      {settings.statistics.consultationsCompleted > 0 ? settings.statistics.consultationsCompleted : '0'}
                    </div>
                    <div className="text-sm sm:text-base text-[var(--color-text)] font-medium">
                      Consultations Completed
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-primary)] mb-2">
                      {settings.statistics.websitesBuilt > 0 ? settings.statistics.websitesBuilt : '0'}
                    </div>
                    <div className="text-sm sm:text-base text-[var(--color-text)] font-medium">
                      Websites Built
                    </div>
                  </div>
                  {settings.statistics.businessesTransformed && settings.statistics.businessesTransformed > 0 && (
                    <div className="text-center">
                      <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-primary)] mb-2">
                        {settings.statistics.businessesTransformed}
                      </div>
                      <div className="text-sm sm:text-base text-[var(--color-text)] font-medium">
                        Businesses Transformed
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-primary)] mb-2">
                      {settings.statistics.clientSatisfactionRate > 0 ? `${settings.statistics.clientSatisfactionRate}%` : '0%'}
                    </div>
                    <div className="text-sm sm:text-base text-[var(--color-text)] font-medium">
                      Client Satisfaction
                    </div>
                  </div>
                  {settings.statistics.averageSetupTime && (
                    <div className="text-center col-span-2 md:col-span-4 mt-4">
                      <div className="text-lg sm:text-xl text-[var(--color-text)] font-medium">
                        Average Setup Time: <span className="text-[var(--color-primary)] font-semibold">{settings.statistics.averageSetupTime}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Course Section */}
          {settings?.courseSectionEnabled !== false && (
            <div className="bg-[var(--color-surface)] rounded-2xl p-8 sm:p-10 md:p-12 shadow-soft border border-[var(--color-primary)]/10 mb-12">
              <h2 className="text-3xl sm:text-4xl font-display text-[var(--color-primary)] text-center mb-4">
                Learn to Build Your Own Booking Website
              </h2>
              <p className="text-lg text-[var(--color-text)] mb-6 text-center max-w-3xl mx-auto">
                Want to build your own booking website from scratch? Our comprehensive course teaches you everything you need to know, step-by-step. No coding experience required!
              </p>
              <div className="text-center">
                <Link
                  href="/courses"
                  className="inline-block bg-[var(--color-primary)] text-[var(--color-on-primary)] px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  View Course
                </Link>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 rounded-2xl p-8 sm:p-10 md:p-12 border border-[var(--color-primary)]/20">
            <h2 className="text-3xl sm:text-4xl font-display text-[var(--color-primary)] mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg text-[var(--color-text)] mb-8 max-w-2xl mx-auto">
              Start with a consultation. Book a full day session where we'll diagnose your operations, create a clear plan, and give you an honest recommendation.
            </p>
            <Link
              href="/labs/book-appointment"
              className="inline-block bg-[var(--color-primary)] text-[var(--color-on-primary)] px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              Book a Consult
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}