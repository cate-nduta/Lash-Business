'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

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
  const pathname = usePathname()
  const [bannerState, setBannerState] = useState<BannerState>(DEFAULT_STATE)
  const [ready, setReady] = useState(false)

  // Hide banner on /labs pages
  const shouldShow = !pathname.startsWith('/labs')

  useEffect(() => {
    if (!shouldShow) {
      setReady(true)
      // Reset navbar position when not showing
      const navbarContainer = document.getElementById('navbar-container')
      if (navbarContainer) {
        navbarContainer.style.setProperty('top', '0', 'important')
        navbarContainer.style.setProperty('margin-top', '0', 'important')
      }
      return
    }

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
  }, [shouldShow])

  useEffect(() => {
    const navbarContainer = document.getElementById('navbar-container')
    if (!navbarContainer) return
    navbarContainer.style.setProperty('top', '0', 'important')
    navbarContainer.style.setProperty('margin-top', '0', 'important')
    navbarContainer.style.setProperty('padding-top', '0', 'important')
  }, [shouldShow, ready, bannerState.bannerEnabled])

  if (!shouldShow || !ready || !bannerState.bannerEnabled) {
    return null
  }

  const defaultMessage =
    bannerState.percentage !== null
      ? `🎉 Special Offer: ${bannerState.percentage}% OFF for First-Time Clients! Book today and save! 🎉`
      : 'January Offer: Use code NLR9Q7YA for checkout to get 10% off your first order.'

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
      className="w-full bg-[var(--color-primary)] text-white border-b border-[var(--color-primary-dark)]/25 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{
        width: '100%',
        display: 'block',
        margin: 0,
        padding: '8px 12px',
        zIndex: 60,
        boxSizing: 'border-box',
        height: 'auto',
      }}
    >
      <div className="mx-auto max-w-7xl text-center">
        <span className="text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide uppercase text-white leading-snug">
          {message}
        </span>
      </div>
    </div>
  )
}
