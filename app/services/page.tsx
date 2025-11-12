'use client'

import { useState, useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { type ServiceCatalog, type ServiceCategory } from '@/lib/services-utils'

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
}

const formatCurrency = (value: number) => `KSH ${value.toLocaleString()}`

const toDisplayServices = (category: ServiceCategory): DisplayService[] =>
  category.services.map((service) => ({
    id: service.id,
    name: service.name,
    description: serviceDescriptions[service.name] || '',
    price: formatCurrency(service.price),
    duration: service.duration ? `${service.duration} min` : undefined,
  }))

export default function Services() {
  const [catalog, setCatalog] = useState<ServiceCatalog>({ categories: [] })
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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
    <div className="min-h-screen bg-baby-pink-light py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-display text-[var(--color-primary)] mb-6">Our Services</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover our range of premium lash and brow treatments. Select a category to explore services crafted to
            enhance your natural beauty.
          </p>
        </div>

        {catalog.categories.length === 0 ? (
          <div className="border border-dashed border-brown-light rounded-2xl p-12 text-center text-gray-500 bg-white/60">
            No services available at the moment. Please check back soon.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              {catalog.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`px-5 py-2 rounded-full border text-sm font-semibold transition-all ${
                    category.id === activeCategoryId
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-lg'
                      : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-text)]/20 hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]'
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
                  {toDisplayServices(activeCategory).map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-[var(--color-text)]/10 bg-[var(--color-surface)] shadow-soft p-8 transition-all duration-300 hover:shadow-soft-lg hover:border-[var(--color-primary)]/40 hover:scale-[1.02] transform cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <h3 className="text-2xl md:text-3xl font-display text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                          {service.name}
                        </h3>
                        <span className="text-[var(--color-primary)] font-semibold text-xl bg-[color-mix(in srgb,var(--color-primary) 8%, var(--color-surface) 92%)] px-3 py-1 rounded-full border border-[var(--color-primary)]/40 group-hover:border-[var(--color-primary)] transition-colors">
                          {service.price}
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-[var(--color-text)]/80 leading-relaxed mb-2 group-hover:text-[var(--color-text)] transition-colors">
                          {service.description}
                        </p>
                      )}
                      {service.duration && (
                        <p className="text-sm font-semibold text-[var(--color-primary)]/80">
                          Duration: {service.duration}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-brown-light rounded-2xl p-12 text-center text-gray-500 bg-white/60">
                Select a category to view services.
              </div>
            )}
          </>
        )}

        <div className="mt-16 bg-[var(--color-surface)] rounded-lg shadow-soft p-8 border-t-4 border-[var(--color-primary)]/60">
          <h3 className="text-2xl font-display text-[var(--color-text)] mb-4">Additional Information</h3>
          <div className="space-y-3 text-[var(--color-text)]/80">
            <p>
              <strong className="text-[var(--color-primary)]">Fill Appointments:</strong> Recommended every 2-3 weeks to maintain your
              lashes.
            </p>
            <p>
              <strong className="text-[var(--color-primary)]">Consultation:</strong> Free consultation available for first-time clients
              to help you choose the perfect lash style.
            </p>
            <p>
              <strong className="text-[var(--color-primary)]">Aftercare:</strong> Detailed aftercare instructions provided to ensure
              longevity and maintain the quality of your lashes.
            </p>
            <p>
              <strong className="text-[var(--color-primary)]">Pricing:</strong> All prices are in Kenyan Shillings (KSH). Contact us for
              any questions about our services or to book your appointment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

