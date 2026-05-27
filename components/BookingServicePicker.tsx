'use client'

import { useEffect, useMemo, useState } from 'react'
import { type ServiceCatalog } from '@/lib/services-utils'
import { Currency, convertCurrency, type ExchangeRates } from '@/lib/currency-utils'
import { type ServiceCartItem } from '@/contexts/ServiceCartContext'
import FormattedText from '@/components/FormattedText'

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

type BookingServicePickerProps = {
  catalog: ServiceCatalog
  loading: boolean
  currency: Currency
  exchangeRates: ExchangeRates
  formatPrice: (amount: number) => string
  addService: (service: ServiceCartItem) => void
  hasService: (serviceId: string) => boolean
}

export default function BookingServicePicker({
  catalog,
  loading,
  currency,
  exchangeRates,
  formatPrice,
  addService,
  hasService,
}: BookingServicePickerProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [addedServiceId, setAddedServiceId] = useState<string | null>(null)

  useEffect(() => {
    if (catalog.categories.length === 0) {
      setActiveCategoryId(null)
      return
    }
    if (!activeCategoryId || !catalog.categories.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(catalog.categories[0].id)
    }
  }, [catalog, activeCategoryId])

  const activeCategory = useMemo(() => {
    if (!activeCategoryId) return null
    return catalog.categories.find((c) => c.id === activeCategoryId) ?? null
  }, [catalog, activeCategoryId])

  const formatServicePrice = (priceKES: number, priceUSD?: number) => {
    let amount = priceKES
    if (currency === 'USD' && priceUSD !== undefined) {
      amount = priceUSD
    } else if (currency !== 'KES') {
      amount = convertCurrency(priceKES, 'KES', currency, exchangeRates)
    }
    return formatPrice(amount)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-brown-light bg-white/80 p-8 text-center text-brown-dark/70">
        Loading services…
      </div>
    )
  }

  if (catalog.categories.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brown-light bg-white/60 p-8 text-center text-brown-dark/70">
        No services available right now. Please check back soon.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {catalog.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategoryId(category.id)}
            className={`shrink-0 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
              category.id === activeCategoryId
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-md'
                : 'bg-white text-brown-dark border-brown-light hover:border-[var(--color-primary)]/50'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {activeCategory?.showNotice && activeCategory.notice.trim().length > 0 && (
        <div className="bg-white border-l-4 border-[var(--color-primary)] rounded-r-xl p-4 text-sm text-brown-dark/90">
          <p className="font-semibold text-[var(--color-primary)] mb-1">Please note</p>
          <FormattedText text={activeCategory.notice} as="p" autoLink />
        </div>
      )}

      {activeCategory ? (
        <div className="space-y-4 max-h-[min(68dvh,640px)] overflow-y-auto pr-1 sm:max-h-[min(70vh,640px)]">
          {activeCategory.services.map((service) => {
            const isInCart = hasService(service.id)
            const justAdded = addedServiceId === service.id
            const description =
              service.description?.trim() || serviceDescriptions[service.name] || ''
            const priceLabel = formatServicePrice(service.price, service.priceUSD)

            const handleAdd = () => {
              addService({
                serviceId: service.id,
                name: service.name,
                price: service.price || 0,
                priceUSD: service.priceUSD,
                duration: service.duration || 60,
                categoryId: activeCategory.id,
                categoryName: activeCategory.name,
              })
              setAddedServiceId(service.id)
              setTimeout(() => setAddedServiceId(null), 2000)
            }

            return (
              <div
                key={service.id}
                className="rounded-2xl border border-brown-light/80 bg-white shadow-soft p-4 sm:p-5 transition-all hover:border-[var(--color-primary)]/40"
              >
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="text-lg sm:text-xl font-display text-brown-dark">{service.name}</h4>
                      <span className="text-sm font-semibold text-[var(--color-primary)] bg-[color-mix(in srgb,var(--color-primary) 8%, white 92%)] px-3 py-1 rounded-full border border-[var(--color-primary)]/30">
                        {priceLabel}
                      </span>
                    </div>
                    {description && (
                      <FormattedText
                        text={description}
                        as="p"
                        className="text-sm text-brown-dark/80 leading-relaxed mb-2"
                      />
                    )}
                    {service.duration > 0 && (
                      <p className="text-xs font-semibold text-[var(--color-primary)]/80">
                        Duration: {service.duration} min
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-44 shrink-0">
                    {service.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-brown-light/60">
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-36 object-cover"
                        />
                      </div>
                    )}
                    {isInCart ? (
                      <div className="px-4 py-2.5 bg-green-100 text-green-800 rounded-lg font-semibold text-sm text-center border border-green-300">
                        ✓ Added
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity min-h-[44px]"
                      >
                        {justAdded ? '✓ Added!' : 'Add service'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-brown-dark/70">Select a category to view services.</p>
      )}

      <p className="text-xs text-brown-dark/60">
        Your booking details are saved automatically on this device. You can add more than one service if needed.
      </p>
    </div>
  )
}
