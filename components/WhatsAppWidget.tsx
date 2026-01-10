'use client'

import { useState, useEffect } from 'react'
import WhatsAppChat from '@/components/WhatsAppChat'

interface LabsSettings {
  whatsappNumber?: string
  whatsappMessage?: string
  whatsappEnabled?: boolean
}

export default function WhatsAppWidget() {
  const [whatsappConfig, setWhatsappConfig] = useState<LabsSettings | null>(null)

  useEffect(() => {
    // Fetch settings immediately without blocking render
    const fetchSettings = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      try {
        const response = await fetch('/api/labs/settings', {
          cache: 'no-store',
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          if (data.whatsappEnabled === true && data.whatsappNumber) {
            setWhatsappConfig({
              whatsappNumber: data.whatsappNumber || '',
              whatsappMessage: data.whatsappMessage || 'Hello! I have a question about LashDiary Labs.',
              whatsappEnabled: true,
            })
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId)
        // Silently fail - don't show widget if settings can't be loaded
        // Ignore abort/timeout errors as they're expected
        if (error?.name !== 'AbortError' && error?.name !== 'TimeoutError') {
          console.error('Error fetching WhatsApp settings:', error)
        }
      }
    }

    fetchSettings()
  }, [])

  // Don't render anything until we have config with required fields, but don't show loading state
  if (!whatsappConfig || !whatsappConfig.whatsappNumber || !whatsappConfig.whatsappEnabled) {
    return null
  }

  return (
    <WhatsAppChat
      phoneNumber={whatsappConfig.whatsappNumber}
      message={whatsappConfig.whatsappMessage}
      enabled={whatsappConfig.whatsappEnabled}
    />
  )
}

