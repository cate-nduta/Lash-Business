'use client'

import { useState, useEffect } from 'react'

interface LogoProps {
  className?: string
}

export default function Logo({ className = "text-2xl font-display text-brown font-bold" }: LogoProps) {
  const [logoSettings, setLogoSettings] = useState<{
    logoType: 'text' | 'image'
    logoUrl: string
    logoText: string
  }>({
    logoType: 'text',
    logoUrl: '',
    logoText: 'LashDiary',
  })

  useEffect(() => {
    // Fetch logo settings
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.business) {
          setLogoSettings({
            logoType: data.settings.business.logoType || 'text',
            logoUrl: data.settings.business.logoUrl || '',
            logoText: data.settings.business.logoText || 'LashDiary',
          })
        }
      })
      .catch((error) => {
        console.error('Error loading logo settings:', error)
      })
  }, [])

  if (logoSettings.logoType === 'image' && logoSettings.logoUrl) {
    return (
      <img 
        src={logoSettings.logoUrl} 
        alt={logoSettings.logoText || 'Logo'} 
        className="h-10 md:h-12 object-contain"
      />
    )
  }

  return (
    <h1 className={className}>
      {logoSettings.logoText || 'LashDiary'}
    </h1>
  )
}

