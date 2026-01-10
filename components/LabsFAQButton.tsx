'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function LabsFAQButton() {
  const [mounted, setMounted] = useState(false)
  const [primaryColor, setPrimaryColor] = useState<string>('#733D26') // Default brown color
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    
    // Load theme colors from CSS variables
    if (typeof window !== 'undefined') {
      const computedStyle = getComputedStyle(document.documentElement)
      const cssPrimary = computedStyle.getPropertyValue('--color-primary').trim()
      if (cssPrimary) {
        setPrimaryColor(cssPrimary)
      }
    }
  }, [])

  // Listen for theme changes
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

    window.addEventListener('theme-changed', handleThemeChange)
    window.addEventListener('storage', handleThemeChange)

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange)
      window.removeEventListener('storage', handleThemeChange)
    }
  }, [])

  // Only show on labs pages, but not on the FAQ page itself
  if (!mounted || !pathname?.startsWith('/labs') || pathname === '/labs/faq') {
    return null
  }

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
    <Link
      href="/labs/faq"
      className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-[9997] text-white rounded-full p-3 sm:p-4 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 hover:scale-110 flex items-center justify-center group relative"
      aria-label="View FAQ"
      style={{
        width: '56px',
        height: '56px',
        backgroundColor: primaryColor,
        boxShadow: `0 4px 12px ${shadowColor}`,
        position: 'fixed',
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
        zIndex: 9997,
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
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6 relative z-10"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
      <span className="sr-only">View FAQ</span>
    </Link>
  )
}

