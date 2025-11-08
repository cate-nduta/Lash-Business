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

interface ThemeProviderProps {
  children: React.ReactNode
  colors: ThemeColors
}

export default function ThemeProvider({ children, colors }: ThemeProviderProps) {
  useEffect(() => {
    // Apply CSS variables
    const root = document.documentElement
    const previousTransition = root.style.transition
    const bodyPreviousTransition = document.body.style.transition

    const transitionValue = 'background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease'
    root.style.transition = transitionValue
    document.body.style.transition = transitionValue

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

    return () => {
      root.style.transition = previousTransition
      document.body.style.transition = bodyPreviousTransition
    }
  }, [colors])

  return <>{children}</>
}

