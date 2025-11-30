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

    const loadLogoSettings = async () => {
      try {
        const response = await fetch(`/api/settings?ts=${Date.now()}`, {
          cache: 'no-store',
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
        }
      } catch (error) {
        console.error('Error loading logo settings:', error)
        if (isMounted) {
          setLogoSettings(DEFAULT_SETTINGS)
        }
      }
    }

    loadLogoSettings()

    return () => {
      isMounted = false
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

  if (logoSettings.logoType === 'image' && logoSettings.logoUrl) {
    return (
      <img
        src={logoSettings.logoUrl}
        alt={logoSettings.logoText || 'Logo'}
        className={`logo-image ${imageClassName || 'h-16 md:h-20 object-contain'}`}
      />
    )
  }

  return (
    <h1 className={className} style={mergedStyle}>
      {logoSettings.logoText}
    </h1>
  )
}

