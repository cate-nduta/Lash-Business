'use client'

import { useState, useEffect } from 'react'

type BannerState = {
  bannerEnabled: boolean
  bannerMessage: string
  percentage: number | null
}

const DEFAULT_STATE: BannerState = {
  bannerEnabled: false,
  bannerMessage: '',
  percentage: null,
}

const formatMessage = (template: string, percentage: number | null) => {
  if (!template || template.trim().length === 0) {
    return ''
  }

  const replacePercentage = (value: string) =>
    value.replace(/{{\s*percentage\s*}}/gi, percentage !== null ? `${percentage}` : '')

  const finalMessage = replacePercentage(template.trim())
  return finalMessage
}

export default function PromoBanner() {
  const [bannerState, setBannerState] = useState<BannerState>(DEFAULT_STATE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/discounts')
      .then((res) => res.json())
      .then((data) => {
        const firstTime = data?.firstTimeClientDiscount || {}
        const percentage = Number(firstTime.percentage)
        const percentageValue = Number.isFinite(percentage) ? percentage : null
        const discountEnabled = Boolean(firstTime.enabled)
        const bannerSetting = firstTime.bannerEnabled

        const bannerEnabled =
          bannerSetting === false
            ? false
            : bannerSetting === true
            ? true
            : discountEnabled

        const bannerMessage =
          typeof firstTime.bannerMessage === 'string' ? firstTime.bannerMessage : ''

        setBannerState({
          bannerEnabled,
          bannerMessage,
          percentage: percentageValue,
        })
      })
      .catch((error) => {
        console.error('Error loading discount banner settings:', error)
      })
      .finally(() => {
        setReady(true)
      })
  }, [])

  if (!ready || !bannerState.bannerEnabled) {
    return null
  }

  const defaultMessage =
    bannerState.percentage !== null
      ? `🎉 Special Offer: ${bannerState.percentage}% OFF for First-Time Clients! Book today and save! 🎉`
      : ''

  const rawMessage =
    bannerState.bannerMessage && bannerState.bannerMessage.trim().length > 0
      ? bannerState.bannerMessage
      : defaultMessage

  const message = formatMessage(rawMessage, bannerState.percentage)

  if (!message || message.trim().length === 0) {
    return null
  }

  return (
    <div
      className="py-1.5 overflow-hidden relative w-full z-50 bg-[var(--color-primary)] text-white border-b border-[var(--color-primary-dark)]/25 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ color: '#fff' }}
    >
      <div className="flex animate-scroll whitespace-nowrap">
        {[...Array(2)].map((_, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-6 shrink-0">
            {[...Array(3)].map((__, itemIndex) => (
              <div key={`${groupIndex}-${itemIndex}`} className="flex items-center gap-6 shrink-0">
                <span className="text-xs md:text-sm font-semibold tracking-wide uppercase text-white">
                  {message}
                </span>
                <span className="text-sm text-white">•</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

