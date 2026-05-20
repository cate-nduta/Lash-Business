'use client'

import { useEffect, useState } from 'react'

type CookieConsentProps = {
  gaId?: string
}

const CONSENT_KEY = 'lash_cookie_consent'

export default function CookieConsent({ gaId }: CookieConsentProps) {
  const [consent, setConsent] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    setConsent(stored)
    setVisible(!stored)
  }, [])

  useEffect(() => {
    if (consent !== 'accepted' || !gaId || typeof window === 'undefined') return
    if (document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${gaId}"]`)) return

    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function gtag(...args: any[]) {
      window.dataLayer.push(args)
    }

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    document.head.appendChild(script)

    window.gtag('js', new Date())
    window.gtag('config', gaId, {
      page_path: window.location.pathname,
    })
  }, [consent, gaId])

  const saveChoice = (choice: 'accepted' | 'declined') => {
    localStorage.setItem(CONSENT_KEY, choice)
    document.cookie = `${CONSENT_KEY}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax`
    setConsent(choice)
    setVisible(false)
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: { choice } }))
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-h-[calc(100dvh-1.5rem)] max-w-3xl overflow-y-auto rounded-2xl border border-brown-light bg-white p-4 shadow-2xl sm:inset-x-4 sm:bottom-4 sm:p-5"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="text-sm text-brown-dark md:pr-4">
          <p className="font-semibold text-base mb-1">Cookie preferences</p>
          <p className="leading-relaxed text-brown-dark/80">
            We use essential cookies/local storage to remember things like your cart, booking draft, and popup choices.
            With your permission, we also use analytics cookies to understand visits and improve the website.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 md:w-40 md:grid-cols-1">
          <button
            type="button"
            onClick={() => saveChoice('accepted')}
            className="rounded-full bg-brown-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brown"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => saveChoice('declined')}
            className="rounded-full border border-brown-light px-4 py-2 text-sm font-semibold text-brown-dark hover:bg-pink-light"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    dataLayer: any[]
    gtag?: (...args: any[]) => void
  }
}
