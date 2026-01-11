'use client'

import { useState, useEffect, useRef } from 'react'
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
  const bannerRef = useRef<HTMLDivElement | null>(null)

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

  // FORCE position navbar below banner - runs BEFORE banner renders
  useEffect(() => {
    const navbarContainer = document.getElementById('navbar-container')
    if (!navbarContainer) return

    if (!shouldShow || !ready || !bannerState.bannerEnabled) {
      // Reset when banner not showing
      navbarContainer.style.setProperty('top', '0', 'important')
      navbarContainer.style.setProperty('margin-top', '0', 'important')
      navbarContainer.style.setProperty('padding-top', '0', 'important')
      return
    }

    const bannerElement = bannerRef.current
    if (!bannerElement) {
      // Banner not rendered yet - set a default and retry
      setTimeout(() => {
        const el = bannerRef.current
        if (el && navbarContainer) {
          const height = el.getBoundingClientRect().height || 40
          navbarContainer.style.setProperty('top', `${height}px`, 'important')
          navbarContainer.style.setProperty('margin-top', `${height}px`, 'important')
        }
      }, 0)
      return
    }

    const updatePosition = () => {
      // Force reflow
      const height = bannerElement.offsetHeight || bannerElement.getBoundingClientRect().height || 40
      
      if (height > 0) {
        // Set BOTH top and margin-top to push navbar below banner using setProperty with !important
        navbarContainer.style.setProperty('top', `${height}px`, 'important')
        navbarContainer.style.setProperty('margin-top', `${height}px`, 'important')
        navbarContainer.style.setProperty('padding-top', '0', 'important')
        navbarContainer.style.transition = 'margin-top 0.2s ease, top 0.2s ease'
        navbarContainer.style.setProperty('border-top', 'none', 'important')
        navbarContainer.style.setProperty('margin-bottom', '0', 'important')
      }
    }

    // Use MutationObserver to watch for banner size changes
    const observer = new MutationObserver(updatePosition)
    observer.observe(bannerElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    // Update immediately and continuously
    updatePosition()
    const intervalId = setInterval(updatePosition, 100)
    
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    // Multiple immediate updates to catch any timing issues
    const timeouts = [
      setTimeout(updatePosition, 0),
      setTimeout(updatePosition, 10),
      setTimeout(updatePosition, 50),
      setTimeout(updatePosition, 100),
      setTimeout(updatePosition, 200),
      setTimeout(updatePosition, 500),
    ]

    return () => {
      observer.disconnect()
      clearInterval(intervalId)
      timeouts.forEach(clearTimeout)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
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
      ref={bannerRef}
      className="overflow-hidden w-full bg-[var(--color-primary)] text-white border-b border-[var(--color-primary-dark)]/25 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{
        position: 'sticky',
        top: 0,
        width: '100%',
        display: 'block',
        margin: 0,
        padding: '6px 0',
        zIndex: 60,
        boxSizing: 'border-box',
        minHeight: '40px',
        // Ensure banner takes up space and doesn't collapse
        flexShrink: 0,
        height: 'auto',
      }}
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
