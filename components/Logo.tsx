'use client'

import { useState, useEffect, useMemo, type CSSProperties } from 'react'

interface LogoSettings {
  logoType: 'text' | 'image'
  logoUrl: string
  logoText: string
  logoColor: string
}

interface LogoProps {
  className?: string
  style?: CSSProperties
  imageClassName?: string
}

const DEFAULT_SETTINGS: LogoSettings = {
  logoType: 'text',
  logoUrl: '',
  logoText: '',
  logoColor: '#733D26',
}

export default function Logo({
  className = 'text-3xl md:text-4xl font-display font-bold',
  style,
  imageClassName,
}: LogoProps) {
  const [logoSettings, setLogoSettings] = useState<LogoSettings | null>(null)

  useEffect(() => {
    let isMounted = true
    let refreshInterval: ReturnType<typeof setInterval> | null = null

    const loadLogoSettings = async () => {
      try {
        const response = await fetch(`/api/settings?ts=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        })
        if (!response.ok) {
          throw new Error(`Failed to load settings: ${response.status}`)
        }

        const data = await response.json()
        const business = data?.business ?? {}

        const updatedSettings: LogoSettings = {
          logoType: business.logoType === 'image' ? 'image' : 'text',
          logoUrl: business.logoUrl || '',
          logoText: typeof business.logoText === 'string' ? business.logoText : '',
          logoColor: business.logoColor || DEFAULT_SETTINGS.logoColor,
        }

        if (isMounted) {
          setLogoSettings(updatedSettings)
          // Debug log in development
          if (process.env.NODE_ENV === 'development') {
            console.log('[Logo] Settings loaded:', updatedSettings)
          }
        }
      } catch (error) {
        console.error('Error loading logo settings:', error)
        if (isMounted) {
          setLogoSettings(DEFAULT_SETTINGS)
        }
      }
    }

    // Load settings immediately
    loadLogoSettings()

    // Refresh settings every 5 seconds to pick up changes quickly
    refreshInterval = setInterval(() => {
      if (isMounted) {
        loadLogoSettings()
      }
    }, 5000)

    // Refresh when window gains focus (user returns to tab)
    const handleFocus = () => {
      if (isMounted) {
        loadLogoSettings()
      }
    }
    
    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (isMounted && !document.hidden) {
        loadLogoSettings()
      }
    }
    
    // Listen for settings update events (broadcast from admin settings page)
    const handleSettingsUpdate = () => {
      if (isMounted) {
        loadLogoSettings()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('settingsUpdated', handleSettingsUpdate)

    return () => {
      isMounted = false
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('settingsUpdated', handleSettingsUpdate)
    }
  }, [])

  const mergedStyle = useMemo(() => {
    if (!logoSettings) {
      return style
    }
    return {
      color: logoSettings.logoColor || DEFAULT_SETTINGS.logoColor,
      ...(style || {}),
    }
  }, [logoSettings, style])

  if (!logoSettings) {
    return null
  }

  // Show image logo only if logoType is 'image' AND logoUrl exists
  if (logoSettings.logoType === 'image' && logoSettings.logoUrl) {
    // Add cache-busting query parameter to image URL if it's not a data URL
    const imageUrl = logoSettings.logoUrl.startsWith('data:')
      ? logoSettings.logoUrl
      : `${logoSettings.logoUrl}${logoSettings.logoUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
    
    return (
      <img
        src={imageUrl}
        alt={logoSettings.logoText || 'Logo'}
        className={`logo-image ${imageClassName || 'h-16 md:h-20 object-contain'}`}
        key={logoSettings.logoUrl} // Force re-render when URL changes
      />
    )
  }

  // Show text logo (default or when logoType is 'text')
  // Use logoText if available, otherwise fallback to default
  const displayText = logoSettings.logoText || (logoSettings.logoType === 'text' ? 'LashDiary' : '')
  
  return (
    <h1 className={className} style={mergedStyle}>
      {displayText}
    </h1>
  )
}

