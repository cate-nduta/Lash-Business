'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

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

interface Theme {
  name: string
  colors: ThemeColors
}

interface ThemeData {
  currentTheme: string
  themes: {
    [key: string]: Theme
  }
}

export default function AdminTheme() {
  const [themeData, setThemeData] = useState<ThemeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const applyThemeColors = (themeKey: string, themes: ThemeData['themes']) => {
    const theme = themes?.[themeKey]
    if (!theme) return

    const root = document.documentElement
    const transitionValue =
      'background-color 0.35s ease, color 0.35s ease, border-color 0.35s ease'

    const previousRootTransition = root.style.transition
    const previousBodyTransition = document.body.style.transition

    root.style.transition = transitionValue
    document.body.style.transition = transitionValue

    const { colors } = theme
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
  }

  const fetchThemeData = async (suppressLoading = false) => {
    if (!suppressLoading) {
      setLoading(true)
    }
    try {
      const response = await fetch('/api/admin/theme', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (response.ok) {
        const data = (await response.json()) as ThemeData
        setThemeData(data)
        applyThemeColors(data.currentTheme, data.themes)
        return data
      } else {
        setMessage({ type: 'error', text: 'Failed to load theme' })
        return null
      }
    } catch (error) {
      console.error('Error loading theme:', error)
      setMessage({ type: 'error', text: 'Failed to load theme' })
      return null
    } finally {
      if (!suppressLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/current-user', {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return

        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }

        fetchThemeData()
      } catch (error) {
        if (!isMounted) return
        router.replace('/admin/login')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleThemeChange = async (themeName: string) => {
    setSaving(true)
    setMessage(null)

    if (themeData?.themes) {
      applyThemeColors(themeName, themeData.themes)
    }

    try {
      const response = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTheme: themeName }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        const updated = await fetchThemeData(true)
        const themeNameLabel =
          updated?.themes?.[updated.currentTheme]?.name ||
          themeData?.themes?.[themeName]?.name ||
          'Selected theme'
        setMessage({ type: 'success', text: `Theme changed to ${themeNameLabel}!` })
        setTimeout(() => {
          router.refresh()
        }, 400)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change theme' })
      }
    } catch (error) {
      console.error('Error changing theme:', error)
      setMessage({ type: 'error', text: 'An error occurred while changing theme' })
    } finally {
      setSaving(false)
    }
  }

  const getSeasonEmoji = (themeKey: string) => {
    const emojis: { [key: string]: string } = {
      default: '🌸',
      summer: '☀️',
      winter: '❄️',
      spring: '🌷',
      fall: '🍂',
    }
    return emojis[themeKey] || '🎨'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!themeData) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Failed to load theme data</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Toast Notification */}
        {message && (
          <Toast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-4">Seasonal Themes</h1>
          <p className="text-brown mb-8">
            Change the look and feel of your entire website instantly by selecting a seasonal theme. 
            All colors across both admin and client-facing pages will update automatically.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(themeData.themes).map(([themeKey, theme]) => {
              const isActive = themeData.currentTheme === themeKey
              
              return (
                <div
                  key={themeKey}
                  className={`relative rounded-2xl overflow-hidden border-4 transition-all ${
                    isActive 
                      ? 'border-green-500 shadow-xl scale-105' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-4 right-4 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Active ✓
                    </div>
                  )}
                  
                  {/* Color Preview */}
                  <div className="h-32 grid grid-cols-5 gap-0">
                    <div style={{ backgroundColor: theme.colors.primary }} className="h-full"></div>
                    <div style={{ backgroundColor: theme.colors.primaryLight }} className="h-full"></div>
                    <div style={{ backgroundColor: theme.colors.secondary }} className="h-full"></div>
                    <div style={{ backgroundColor: theme.colors.accent }} className="h-full"></div>
                    <div style={{ backgroundColor: theme.colors.background }} className="h-full"></div>
                  </div>

                  {/* Theme Info */}
                  <div className="p-6 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl">{getSeasonEmoji(themeKey)}</span>
                      <h3 className="text-2xl font-display text-gray-800">{theme.name}</h3>
                    </div>

                    {/* Color Swatches */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div 
                          style={{ backgroundColor: theme.colors.primary }} 
                          className="w-6 h-6 rounded border border-gray-300"
                        ></div>
                        <span className="text-xs text-gray-600">Primary: {theme.colors.primary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          style={{ backgroundColor: theme.colors.secondary }} 
                          className="w-6 h-6 rounded border border-gray-300"
                        ></div>
                        <span className="text-xs text-gray-600">Secondary: {theme.colors.secondary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          style={{ backgroundColor: theme.colors.accent }} 
                          className="w-6 h-6 rounded border border-gray-300"
                        ></div>
                        <span className="text-xs text-gray-600">Accent: {theme.colors.accent}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleThemeChange(themeKey)}
                      disabled={saving || isActive}
                      className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                        isActive
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                      style={!isActive ? { 
                        backgroundColor: theme.colors.primary,
                        color: '#ffffff'
                      } : {}}
                    >
                      {isActive ? 'Currently Active' : 'Apply This Theme'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 p-6 bg-blue-50 border-l-4 border-blue-400 rounded">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 How It Works</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click "Apply This Theme" on any seasonal theme</li>
              <li>• The entire website (admin + client pages) will update instantly</li>
              <li>• All buttons, backgrounds, text colors change automatically</li>
              <li>• Your content stays the same - only colors change</li>
              <li>• Switch themes as often as you like!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

