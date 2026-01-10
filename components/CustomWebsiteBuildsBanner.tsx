'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface BannerSettings {
  enabled: boolean
  text: string
}

export default function CustomWebsiteBuildsBanner() {
  const pathname = usePathname()
  const [bannerSettings, setBannerSettings] = useState<BannerSettings | null>(null)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show banner on all Custom Website Builds pages (main page, checkout, and individual service pages)
  const shouldShow = mounted && pathname?.startsWith('/labs/custom-website-builds')

  useEffect(() => {
    if (!mounted || !shouldShow) {
      return
    }

    const fetchBanner = async () => {
      try {
        const response = await fetch('/api/labs/web-services/banner', {
          cache: 'no-store',
        })
        if (response.ok) {
          const data = await response.json()
          setBannerSettings(data)
        }
      } catch (error) {
        console.error('Error fetching banner settings:', error)
        // Set default on error so banner can still attempt to render
        setBannerSettings({ enabled: false, text: '' })
      }
    }

    fetchBanner()
  }, [shouldShow, mounted])

  // Position banner above navbar and push navbar down when banner is visible
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    if (bannerSettings?.enabled && bannerSettings?.text?.trim()) {
      const navbarContainer = document.getElementById('navbar-container')
      if (navbarContainer) {
        // Get banner height (approximately 56px on desktop, 52px on mobile)
        const bannerHeight = window.innerWidth < 768 ? 52 : 56
        navbarContainer.style.marginTop = `${bannerHeight}px`
        navbarContainer.style.transition = 'margin-top 0.3s ease'
      }
    } else {
      // Banner is disabled - remove navbar margin
      const navbarContainer = document.getElementById('navbar-container')
      if (navbarContainer) {
        navbarContainer.style.marginTop = '0'
      }
    }
    
    return () => {
      const navbarContainer = document.getElementById('navbar-container')
      if (navbarContainer) {
        navbarContainer.style.marginTop = '0'
      }
    }
  }, [bannerSettings?.enabled, bannerSettings?.text, mounted])

  // Only render if mounted and on correct path
  if (!mounted || !shouldShow) {
    return null
  }

  // Show loading state or wait for banner settings
  if (!bannerSettings) {
    return null // Still loading
  }

  // Only show if enabled and has text
  if (!bannerSettings.enabled || !bannerSettings.text?.trim()) {
    return null
  }

  return (
    <div 
      className="custom-website-builds-banner"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        backgroundColor: 'var(--color-primary-dark)',
        paddingTop: '12px',
        paddingBottom: '12px',
        paddingLeft: '16px',
        paddingRight: '16px',
        textAlign: 'center',
        zIndex: 100, // Above navbar (z-[70])
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
      suppressHydrationWarning
    >
      <p 
        style={{ 
          color: '#ffffff !important',
          fontSize: '14px',
          fontWeight: 600,
          margin: 0,
          lineHeight: '1.5',
        }}
        className="text-sm md:text-base font-semibold m-0"
      >
        {bannerSettings.text}
      </p>
    </div>
  )
}

