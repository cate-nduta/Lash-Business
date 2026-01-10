'use client'

import { useEffect } from 'react'

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

interface ThemeData {
  currentTheme: string
  themes: {
    [key: string]: {
      name: string
      colors: ThemeColors
    }
  }
}

const applyThemeColors = (colors: ThemeColors, useTransition = false) => {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  if (!root) return

  if (useTransition) {
    // Use smooth transitions when theme is changed
    const transitionValue = 'background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease'
    const previousRootTransition = root.style.transition
    const previousBodyTransition = document.body.style.transition

    root.style.transition = transitionValue
    document.body.style.transition = transitionValue

    // Apply theme colors with transition
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

    setTimeout(() => {
      root.style.transition = previousRootTransition
      document.body.style.transition = previousBodyTransition
    }, 400)
  } else {
    // Apply theme colors immediately without transition (for initial load)
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
  }
}

export default function GlobalThemeLoader() {
  useEffect(() => {
    let isInitialMount = true

    const loadAndApplyTheme = async (useTransition = false) => {
      if (typeof window === 'undefined') return
      
      try {
        // Fetch current theme from public API (no auth required for reading)
        const response = await fetch('/api/theme/current', {
          cache: 'no-store',
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.colors) {
            applyThemeColors(data.colors, useTransition && !isInitialMount)
            // Save to localStorage for faster future loads
            try {
              localStorage.setItem('current-theme-colors', JSON.stringify(data.colors))
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error)
        // Fallback: Try to read from localStorage if it was previously saved
        try {
          const savedTheme = localStorage.getItem('current-theme-colors')
          if (savedTheme) {
            const colors = JSON.parse(savedTheme)
            applyThemeColors(colors, useTransition && !isInitialMount)
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }

    // Load theme on mount (without transition for initial load)
    loadAndApplyTheme(false)
    isInitialMount = false

    // Listen for theme changes from admin page (custom event)
    const handleThemeChange = (e: Event) => {
      // Use transition when theme is changed (not on initial mount)
      loadAndApplyTheme(true)
    }
    
    // Listen for storage changes from other tabs/pages
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme-changed') {
        // Use transition when theme is changed
        loadAndApplyTheme(true)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('theme-changed', handleThemeChange)
      window.addEventListener('storage', handleStorageChange)

      return () => {
        window.removeEventListener('theme-changed', handleThemeChange)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  return null // This component doesn't render anything
}

