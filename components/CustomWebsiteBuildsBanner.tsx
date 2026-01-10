'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface BannerSettings {
  enabled: boolean
  text: string
}

export default function CustomWebsiteBuildsBanner() {
  const pathname = usePathname()
  
  // Initialize from localStorage immediately to prevent banner from disappearing on refresh
  const [bannerSettings, setBannerSettings] = useState<BannerSettings | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('custom-website-builds-banner')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && typeof parsed === 'object' && typeof parsed.enabled === 'boolean') {
            return parsed
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    return null
  })
  
  const [mounted, setMounted] = useState(false)
  // If we have cached settings, we're not loading - we can show immediately
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached settings, don't show loading state
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('custom-website-builds-banner')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && typeof parsed === 'object' && typeof parsed.enabled === 'boolean') {
            return false // We have cached data, not loading
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    return true // No cache, need to fetch
  })

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show banner on all Custom Website Builds pages (main page, checkout, and individual service pages)
  const shouldShow = mounted && pathname?.startsWith('/labs/custom-website-builds')

  // Fetch banner settings immediately when component mounts or pathname changes
  // Use a more aggressive fetch strategy to prevent banner from disappearing on refresh
  useEffect(() => {
    if (!mounted || !shouldShow) {
      // Don't reset settings immediately - only clear when leaving the page
      return
    }

    let isMounted = true
    let retryCount = 0
    const maxRetries = 3

    const fetchBanner = async (retryAttempt = 0) => {
      try {
        const response = await fetch('/api/labs/web-services/banner', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        })

        if (response.ok && isMounted) {
          const data = await response.json()
          // Only update if we got valid data
          if (data && typeof data === 'object') {
            const newSettings: BannerSettings = {
              enabled: data.enabled === true,
              text: typeof data.text === 'string' ? data.text : '',
            }
            setBannerSettings(newSettings)
            // Cache to localStorage for instant display on refresh
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('custom-website-builds-banner', JSON.stringify(newSettings))
              } catch (e) {
                // Ignore localStorage errors
              }
            }
            setIsLoading(false)
          } else if (isMounted) {
            const disabledSettings: BannerSettings = { enabled: false, text: '' }
            setBannerSettings(disabledSettings)
            // Update cache
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('custom-website-builds-banner', JSON.stringify(disabledSettings))
              } catch (e) {
                // Ignore localStorage errors
              }
            }
            setIsLoading(false)
          }
        } else if (response.status === 500 && retryAttempt < maxRetries && isMounted) {
          // Retry on server errors
          setTimeout(() => fetchBanner(retryAttempt + 1), 500 * (retryAttempt + 1))
        } else if (isMounted) {
          // Don't update on error - keep cached settings to prevent banner from disappearing
          setIsLoading(false)
        }
      } catch (error: any) {
        // Silently handle fetch errors - keep cached settings to prevent banner from disappearing
        if (process.env.NODE_ENV === 'development' && isMounted) {
          console.error('Error fetching banner settings:', error)
        }
        
        // Retry on network errors (but not abort errors)
        const isAbortError = 
          error?.name === 'AbortError' || 
          error?.name === 'TimeoutError' ||
          error?.message?.toLowerCase().includes('abort')
        
        if (retryAttempt < maxRetries && isMounted && !isAbortError) {
          setTimeout(() => fetchBanner(retryAttempt + 1), 500 * (retryAttempt + 1))
        } else if (isMounted) {
          // Don't update on error - keep cached settings to prevent banner from disappearing
          setIsLoading(false)
        }
      }
    }

    // Fetch immediately
    fetchBanner()

    // Also set up a periodic check to ensure banner stays visible (every 2 seconds for first 10 seconds)
    const intervalId = setInterval(() => {
      if (isMounted && shouldShow) {
        fetchBanner()
      }
    }, 2000)

    const cleanupInterval = setTimeout(() => {
      clearInterval(intervalId)
    }, 10000) // Stop checking after 10 seconds

    return () => {
      isMounted = false
      clearInterval(intervalId)
      clearTimeout(cleanupInterval)
    }
  }, [shouldShow, mounted, pathname])

  // Position banner above navbar and push navbar down when banner is visible
  // Ensure NO gap between banner and navbar - use MutationObserver for reliable updates
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    const updateNavbarPosition = () => {
      const navbarContainer = document.getElementById('navbar-container')
      if (!navbarContainer) return

      if (bannerSettings?.enabled && bannerSettings?.text?.trim()) {
        // Get actual banner height from the DOM element
        const bannerElement = document.querySelector('.custom-website-builds-banner') as HTMLElement
        if (bannerElement) {
          // Get actual rendered height with padding included - use getBoundingClientRect for pixel-perfect accuracy
          // Force a reflow to ensure accurate measurement
          bannerElement.offsetHeight
          const rect = bannerElement.getBoundingClientRect()
          // Use exact height without rounding - ensure no gap by using precise value
          const bannerHeight = rect.height
          
          // For sticky navbar, we need to set BOTH margin-top AND top to push it below the banner
          // margin-top pushes it down in the flow, top ensures it sticks at the right position
          if (navbarContainer.style.marginTop !== `${bannerHeight}px`) {
            navbarContainer.style.marginTop = `${bannerHeight}px`
          }
          // Set top to banner height so sticky positioning works correctly
          navbarContainer.style.top = `${bannerHeight}px`
          navbarContainer.style.transition = 'margin-top 0.2s ease, top 0.2s ease'
          // Ensure no padding or border that could cause gaps
          navbarContainer.style.paddingTop = '0'
          navbarContainer.style.borderTop = 'none'
          navbarContainer.style.marginBottom = '0'
        } else {
          // Fallback if element not found yet - use smaller estimate for reduced padding
          // 8px top + 8px bottom = 16px, plus ~20px for text line height = ~36-40px
          const estimatedHeight = window.innerWidth < 768 ? 36 : 40
          navbarContainer.style.marginTop = `${estimatedHeight}px`
          navbarContainer.style.top = `${estimatedHeight}px`
          navbarContainer.style.paddingTop = '0'
        }
      } else {
        // Banner is disabled - remove navbar margin and top completely
        navbarContainer.style.marginTop = '0'
        navbarContainer.style.top = '0'
        navbarContainer.style.paddingTop = '0'
      }
    }

    // Update immediately
    updateNavbarPosition()

    // Wait for banner to be in the DOM before calculating position
    // Use multiple requestAnimationFrame calls for reliable updates after render
    let rafId1: number | null = null
    let rafId2: number | null = null
    let retryCount = 0
    const maxRetries = 10 // Limit retries to prevent infinite loop
    
    const waitForBannerAndUpdate = () => {
      const bannerElement = document.querySelector('.custom-website-builds-banner') as HTMLElement
      if (bannerElement && bannerElement.offsetHeight > 0) {
        // Banner is rendered and has height - update position
        updateNavbarPosition()
        // Also update after a short delay to ensure accurate measurement
        rafId2 = requestAnimationFrame(() => {
          updateNavbarPosition()
          setTimeout(() => updateNavbarPosition(), 50)
        })
      } else if (retryCount < maxRetries) {
        // Banner not ready yet - try again (up to maxRetries times)
        retryCount++
        rafId1 = requestAnimationFrame(waitForBannerAndUpdate)
      } else {
        // Max retries reached - update with fallback
        updateNavbarPosition()
      }
    }
    
    // Start waiting for banner after initial render
    rafId1 = requestAnimationFrame(() => {
      waitForBannerAndUpdate()
    })

    // Also use MutationObserver to watch for banner element changes and DOM updates
    const observer = new MutationObserver(() => {
      // Small delay to ensure banner has rendered
      setTimeout(updateNavbarPosition, 10)
    })

    // Observe the document body for when banner is added/removed or updated
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    // Update on window resize
    window.addEventListener('resize', updateNavbarPosition)
    
    // Listen for storage changes (when banner is updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'custom-website-builds-banner' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue)
          if (newSettings && typeof newSettings === 'object') {
            setBannerSettings(newSettings)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Listen for custom event (when banner is updated in same tab by admin)
    const handleBannerUpdate = (e: CustomEvent) => {
      if (e.detail && typeof e.detail === 'object') {
        setBannerSettings(e.detail)
      }
    }
    window.addEventListener('banner-settings-updated', handleBannerUpdate as EventListener)
    
    return () => {
      if (rafId1 !== null) cancelAnimationFrame(rafId1)
      if (rafId2 !== null) cancelAnimationFrame(rafId2)
      observer.disconnect()
      window.removeEventListener('resize', updateNavbarPosition)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('banner-settings-updated', handleBannerUpdate as EventListener)
      const navbarContainer = document.getElementById('navbar-container')
      if (navbarContainer) {
        navbarContainer.style.marginTop = '0'
        navbarContainer.style.top = '0'
      }
    }
  }, [bannerSettings?.enabled, bannerSettings?.text, mounted])

  // Only render if mounted and on correct path
  if (!mounted || !shouldShow) {
    return null
  }

  // Wait for initial load to complete only if we don't have cached settings
  // This prevents banner from disappearing on refresh when we have cached data
  if (isLoading && !bannerSettings) {
    // Still loading and no cache - don't render yet
    return null
  }

    // Only show if we have settings, enabled, and has text
    if (!bannerSettings || !bannerSettings.enabled || !bannerSettings.text?.trim()) {
      // Ensure navbar margin and top are removed when banner is disabled
      if (typeof window !== 'undefined') {
        const navbarContainer = document.getElementById('navbar-container')
        if (navbarContainer) {
          navbarContainer.style.marginTop = '0'
          navbarContainer.style.top = '0'
        }
      }
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
        paddingTop: '8px',
        paddingBottom: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        textAlign: 'center',
        zIndex: 100, // Above navbar (z-[70])
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        margin: 0,
        border: 'none',
      }}
      suppressHydrationWarning
    >
      <p 
        style={{ 
          color: '#ffffff !important',
          fontSize: '14px',
          fontWeight: 600,
          margin: 0,
          padding: 0,
          lineHeight: '1.4',
        }}
        className="text-sm md:text-base font-semibold m-0"
      >
        {bannerSettings.text}
      </p>
    </div>
  )
}

