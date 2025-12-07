'use client'

import { useEffect, useRef } from 'react'

interface ThemeColors {
  primary: string
  primaryDark: string
  primaryLight: string
  secondary: string
  secondaryDark: string
  accent: string
  background: string
  surface: string
  text: string
  onPrimary?: string
  onSecondary?: string
}

interface ThemeProviderProps {
  children: React.ReactNode
  colors: ThemeColors
}

export default function ThemeProvider({ children, colors }: ThemeProviderProps) {
  const previousColorsRef = useRef<ThemeColors | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    const root = document.documentElement
    
    // Check if colors have actually changed to avoid unnecessary updates
    const colorsChanged = !previousColorsRef.current || 
      previousColorsRef.current.primary !== colors.primary ||
      previousColorsRef.current.background !== colors.background ||
      previousColorsRef.current.text !== colors.text

    // On initial mount, apply immediately without transition
    if (isInitialMount.current) {
      // Apply colors immediately without transition
      root.style.setProperty('--color-primary', colors.primary)
      root.style.setProperty('--color-primary-dark', colors.primaryDark)
      root.style.setProperty('--color-primary-light', colors.primaryLight)
      root.style.setProperty('--color-secondary', colors.secondary)
      root.style.setProperty('--color-secondary-dark', colors.secondaryDark)
      root.style.setProperty('--color-accent', colors.accent)
      root.style.setProperty('--color-background', colors.background)
      root.style.setProperty('--color-surface', colors.surface)
      root.style.setProperty('--color-text', colors.text)
      root.style.setProperty('--color-on-primary', colors.onPrimary || '#ffffff')
      root.style.setProperty('--color-on-secondary', colors.onSecondary || colors.text)
      isInitialMount.current = false
      previousColorsRef.current = { ...colors }
      return
    }

    // For theme changes (not initial mount), use smooth transitions
    if (colorsChanged) {
      const transitionValue = 
        'background-color 0.35s ease, ' +
        'color 0.35s ease, ' +
        'border-color 0.35s ease, ' +
        'box-shadow 0.35s ease, ' +
        'opacity 0.35s ease'
      
      root.style.transition = transitionValue
      document.body.style.transition = transitionValue

      // Update all CSS variables atomically
      requestAnimationFrame(() => {
        root.style.setProperty('--color-primary', colors.primary)
        root.style.setProperty('--color-primary-dark', colors.primaryDark)
        root.style.setProperty('--color-primary-light', colors.primaryLight)
        root.style.setProperty('--color-secondary', colors.secondary)
        root.style.setProperty('--color-secondary-dark', colors.secondaryDark)
        root.style.setProperty('--color-accent', colors.accent)
        root.style.setProperty('--color-background', colors.background)
        root.style.setProperty('--color-surface', colors.surface)
        root.style.setProperty('--color-text', colors.text)
        root.style.setProperty('--color-on-primary', colors.onPrimary || '#ffffff')
        root.style.setProperty('--color-on-secondary', colors.onSecondary || colors.text)
      })
    }

    previousColorsRef.current = { ...colors }
  }, [colors])

  return <>{children}</>
}

