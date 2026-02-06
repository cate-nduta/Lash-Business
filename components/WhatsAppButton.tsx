'use client'

import { useState, useEffect } from 'react'

export default function WhatsAppButton() {
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [whatsappMessage, setWhatsappMessage] = useState<string>('Hello! I would like to chat with you.')
  const [mounted, setMounted] = useState(false)
  const [primaryColor, setPrimaryColor] = useState<string>('#733D26') // Default brown color
  const [showWhatsAppButton, setShowWhatsAppButton] = useState(true) // Default true until we fetch

  useEffect(() => {
    fetch('/api/pages-settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setShowWhatsAppButton(data.whatsappButton !== false))
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Set mounted immediately to show button as fast as possible
    setMounted(true)
    
    // Try to load from localStorage first for faster display
    if (typeof window !== 'undefined') {
      const cachedPhone = localStorage.getItem('whatsapp-phone')
      const cachedMessage = localStorage.getItem('whatsapp-message')
      if (cachedPhone) {
        setPhoneNumber(cachedPhone)
      }
      if (cachedMessage) {
        setWhatsappMessage(cachedMessage)
      }
      
      // Also load theme color immediately from CSS variables
      const computedStyle = getComputedStyle(document.documentElement)
      const cssPrimary = computedStyle.getPropertyValue('--color-primary').trim()
      if (cssPrimary) {
        setPrimaryColor(cssPrimary)
      }
    }

    let isMounted = true

    const loadSettings = async () => {
      try {
        const fetchContact = async () => {
          try {
            const response = await fetch('/api/contact', { 
              cache: 'no-store',
            })
            return response
          } catch (err: any) {
            // Silently handle fetch errors
            if (process.env.NODE_ENV === 'development' && isMounted) {
              console.error('Error fetching contact:', err)
            }
            return null
          }
        }

        const fetchTheme = async () => {
          try {
            const response = await fetch('/api/theme/current', { 
              cache: 'no-store',
            })
            return response
          } catch (err: any) {
            // Silently handle fetch errors
            if (process.env.NODE_ENV === 'development' && isMounted) {
              console.error('Error fetching theme:', err)
            }
            return null
          }
        }

        const [contactResponse, themeResponse] = await Promise.allSettled([
          fetchContact(),
          fetchTheme(),
        ]).then(results => {
          return results.map(result => {
            if (result.status === 'fulfilled') {
              return result.value
            }
            // Handle rejection - silently ignore
            if (process.env.NODE_ENV === 'development' && isMounted) {
              console.error('Error in Promise.allSettled:', result.reason)
            }
            return null
          })
        }) as [Response | null, Response | null]

        if (!isMounted) return // Don't update state if component unmounted

        if (contactResponse?.ok) {
          try {
            const contactData = await contactResponse.json()
            if (contactData.phone && isMounted) {
              // Clean phone number: remove spaces, dashes, parentheses, and ensure it starts with country code
              let cleaned = contactData.phone.replace(/\s|-|\(|\)/g, '')
              // If it doesn't start with +, assume it's a Kenyan number and add +254
              if (!cleaned.startsWith('+')) {
                // Remove leading 0 if present
                if (cleaned.startsWith('0')) {
                  cleaned = cleaned.substring(1)
                }
                cleaned = '+254' + cleaned
              }
              if (isMounted) {
                setPhoneNumber(cleaned)
                // Cache it
                if (typeof window !== 'undefined') {
                  localStorage.setItem('whatsapp-phone', cleaned)
                }
              }
            }
            if (contactData.whatsappMessage && isMounted) {
              setWhatsappMessage(contactData.whatsappMessage)
              if (typeof window !== 'undefined') {
                localStorage.setItem('whatsapp-message', contactData.whatsappMessage)
              }
            }
          } catch (parseError) {
            // Silently handle JSON parse errors
            if (process.env.NODE_ENV === 'development' && isMounted) {
              console.error('Error parsing contact response:', parseError)
            }
          }
        }

        // Also try API as fallback for theme color if CSS variable wasn't available
        if (themeResponse?.ok && isMounted) {
          try {
            const themeData = await themeResponse.json()
            if (themeData.primary && primaryColor === '#733D26' && isMounted) {
              setPrimaryColor(themeData.primary)
            }
          } catch (parseError) {
            // Silently handle JSON parse errors
            if (process.env.NODE_ENV === 'development' && isMounted) {
              console.error('Error parsing theme response:', parseError)
            }
          }
        }
      } catch (error: any) {
        // Silently handle all errors - don't block rendering, button will still show
        if (process.env.NODE_ENV === 'development' && isMounted) {
          console.error('Error loading WhatsApp settings:', error)
        }
      }
    }

    loadSettings()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [])

  // Listen for theme changes and contact data updates
  useEffect(() => {
    const handleThemeChange = () => {
      if (typeof window !== 'undefined') {
        const computedStyle = getComputedStyle(document.documentElement)
        const cssPrimary = computedStyle.getPropertyValue('--color-primary').trim()
        if (cssPrimary) {
          setPrimaryColor(cssPrimary)
        }
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      // Update if phone or message changes in localStorage
      if (e.key === 'whatsapp-phone' && e.newValue) {
        setPhoneNumber(e.newValue)
      }
      if (e.key === 'whatsapp-message' && e.newValue) {
        setWhatsappMessage(e.newValue)
      }
      // Also check for theme changes
      handleThemeChange()
    }

    const handleCustomEvent = () => {
      handleThemeChange()
      // Reload contact data if updated
      if (typeof window !== 'undefined') {
        const cachedPhone = localStorage.getItem('whatsapp-phone')
        const cachedMessage = localStorage.getItem('whatsapp-message')
        if (cachedPhone) setPhoneNumber(cachedPhone)
        if (cachedMessage) setWhatsappMessage(cachedMessage)
      }
    }

    window.addEventListener('theme-changed', handleThemeChange)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('contact-settings-updated', handleCustomEvent)

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('contact-settings-updated', handleCustomEvent)
    }
  }, [])

  // Don't show if disabled in pages settings
  if (!showWhatsAppButton) {
    return null
  }
  // Always show button once mounted (prevent hydration mismatch)
  if (!mounted) {
    return null // Prevent hydration mismatch
  }
  
  // Use phone number if available, otherwise fallback to empty (link will still work)
  const displayPhone = phoneNumber || ''

  // Create WhatsApp link with custom message
  // Use displayPhone which may be empty while loading, but the button will still render
  const encodedMessage = encodeURIComponent(whatsappMessage)
  const whatsappUrl = displayPhone 
    ? `https://wa.me/${displayPhone.replace(/\+/g, '')}?text=${encodedMessage}`
    : 'https://wa.me/' // Fallback - will redirect to WhatsApp app

  // Calculate lighter and darker shades for hover states
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 115, g: 61, b: 38 }
  }

  const rgb = hexToRgb(primaryColor)
  const hoverColor = `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`
  const activeColor = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`
  const shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9998] text-white rounded-full p-3 sm:p-4 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 hover:scale-110 flex items-center justify-center group relative"
      aria-label="Chat with us on WhatsApp"
      style={{
        width: '56px',
        height: '56px',
        backgroundColor: primaryColor,
        boxShadow: `0 4px 12px ${shadowColor}`,
        position: 'fixed',
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
        zIndex: 9998,
        pointerEvents: 'auto',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverColor
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = primaryColor
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.backgroundColor = activeColor
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.backgroundColor = hoverColor
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-7 h-7 relative z-10"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
      <span className="sr-only">Chat with us on WhatsApp</span>
    </a>
  )
}

