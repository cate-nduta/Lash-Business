'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import Toast from '@/components/Toast'
import PasswordInput from '@/components/PasswordInput'

interface Settings {
  business: {
    name: string
    phone: string
    email: string
    address: string
    description: string
    logoType: 'text' | 'image'
    logoUrl: string
    logoText: string
    logoColor: string
    faviconUrl: string
    faviconVersion: number
    taxPercentage?: number
    eyepatchImageUrl?: string
  }
  social: {
    instagram: string
    facebook: string
    tiktok: string
    twitter: string
  }
  newsletter?: {
    discountPercentage?: number
  }
  exchangeRates?: {
    usdToKes?: number
    eurToKes?: number
  }
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({
    business: {
      name: '',
      phone: '',
      email: '',
      address: '',
      description: '',
      logoType: 'text',
      logoUrl: '',
      logoText: '',
      logoColor: '#733D26',
      faviconUrl: '',
      faviconVersion: 0,
      taxPercentage: 0,
      eyepatchImageUrl: '',
    },
    social: {
      instagram: '',
      facebook: '',
      tiktok: '',
      twitter: '',
    },
    newsletter: {
      discountPercentage: 10,
    },
    exchangeRates: {
      usdToKes: 130,
      eurToKes: 140,
    },
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [uploadingEyepatch, setUploadingEyepatch] = useState(false)
  const faviconInputRef = useRef<HTMLInputElement | null>(null)
  const eyepatchInputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

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

        loadSettings()
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

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const loaded = data as Settings
        if (!loaded.business.faviconUrl) {
          loaded.business.faviconUrl = ''
        }
        if (!loaded.business.logoColor) {
          loaded.business.logoColor = '#733D26'
        }
        if (!loaded.business.faviconVersion) {
          loaded.business.faviconVersion = Date.now()
        }
        if (!loaded.business.eyepatchImageUrl) {
          loaded.business.eyepatchImageUrl = ''
        }
        // Ensure tax percentage exists
        if (typeof loaded.business.taxPercentage !== 'number') {
          loaded.business.taxPercentage = 0
        }
        // Ensure newsletter settings exist
        if (!loaded.newsletter) {
          loaded.newsletter = { discountPercentage: 10 }
        } else if (typeof loaded.newsletter.discountPercentage !== 'number') {
          loaded.newsletter.discountPercentage = 10
        }
        // Ensure exchange rates exist
        if (!loaded.exchangeRates) {
          loaded.exchangeRates = { usdToKes: 130, eurToKes: 140 }
        } else {
          if (typeof loaded.exchangeRates.usdToKes !== 'number' || loaded.exchangeRates.usdToKes <= 0) {
            loaded.exchangeRates.usdToKes = 130
          }
          if (typeof loaded.exchangeRates.eurToKes !== 'number' || loaded.exchangeRates.eurToKes <= 0) {
            loaded.exchangeRates.eurToKes = 140
          }
        }
        setSettings(loaded)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (section: 'business' | 'social' | 'newsletter' | 'exchangeRates', field: string, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
    setHasUnsavedChanges(true)
  }

  const refreshFavicon = () => {
    // Force browser to reload favicon by updating link element
    if (typeof window !== 'undefined' && settings.business.faviconUrl) {
      const baseUrl = window.location.origin
      const faviconUrl = settings.business.faviconUrl.startsWith('http')
        ? settings.business.faviconUrl
        : `${baseUrl}${settings.business.faviconUrl}`
      const version = settings.business.faviconVersion || Date.now()
      const url = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${version}&t=${Date.now()}`

      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel*="icon"]')
      existingLinks.forEach(link => link.remove())

      // Add new favicon links
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/svg+xml'
      link.href = url
      document.head.appendChild(link)

      // Also add apple-touch-icon
      const appleLink = document.createElement('link')
      appleLink.rel = 'apple-touch-icon'
      appleLink.href = url
      document.head.appendChild(appleLink)

      // Force page reload if favicon was updated
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          business: {
            ...settings.business,
            faviconUrl: settings.business.faviconUrl || '',
            logoColor: settings.business.logoColor || '#733D26',
          },
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully! Refreshing favicon...' })
        setHasUnsavedChanges(false)
        
        // Refresh favicon if it exists
        if (settings.business.faviconUrl) {
          setTimeout(() => {
            refreshFavicon()
          }, 1000)
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => {
          setShowPasswordModal(false)
          setPasswordMessage(null)
        }, 2000)
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const handleUploadFavicon = async (file: File) => {
    setUploadingFavicon(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('favicon', file)
      const response = await fetch('/api/admin/settings/upload-favicon', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload favicon')
      }
      if (data.settings?.business) {
        setSettings(data.settings as Settings)
      } else {
        setSettings((prev) => ({
          ...prev,
          business: {
            ...prev.business,
            faviconUrl: data.faviconUrl,
            faviconVersion: data.faviconVersion || Date.now(),
          },
        }))
      }
      setHasUnsavedChanges(true)
      setMessage({ type: 'success', text: 'Favicon uploaded! Save changes to apply it (page will refresh automatically).' })
    } catch (error: any) {
      console.error('Error uploading favicon:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to upload favicon' })
    } finally {
      setUploadingFavicon(false)
      if (faviconInputRef.current) {
        faviconInputRef.current.value = ''
      }
    }
  }

  const handleUploadEyepatch = async (file: File) => {
    setUploadingEyepatch(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('eyepatch', file)
      const response = await fetch('/api/admin/settings/upload-eyepatch', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload eyepatch image')
      }
      if (data.settings?.business) {
        setSettings(data.settings as Settings)
      } else {
        setSettings((prev) => ({
          ...prev,
          business: {
            ...prev.business,
            eyepatchImageUrl: data.eyepatchImageUrl,
          },
        }))
      }
      setHasUnsavedChanges(true)
      setMessage({ type: 'success', text: 'Eyepatch image uploaded! Save changes to apply it.' })
      if (eyepatchInputRef.current) {
        eyepatchInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error('Error uploading eyepatch image:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to upload eyepatch image' })
    } finally {
      setUploadingEyepatch(false)
    }
  }

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setPendingNavigation(href)
      setShowUnsavedDialog(true)
    }
  }

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedDialog(false)
    setHasUnsavedChanges(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
    }
  }

  const handleCancelDialog = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      {/* Toast Notification */}
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkClick(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Settings</h1>

          {/* Business Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Business Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.business.name}
                  onChange={(e) => handleInputChange('business', 'name', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.business.phone}
                  onChange={(e) => handleInputChange('business', 'phone', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="e.g. +254 7XX XXX XXX"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Business Email
                </label>
                <input
                  type="email"
                  value={settings.business.email}
                  onChange={(e) => handleInputChange('business', 'email', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="hello@lashdiary.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Business Address
                </label>
                <input
                  type="text"
                  value={settings.business.address}
                  onChange={(e) => handleInputChange('business', 'address', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="Nairobi, Kenya"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Business Description
                </label>
                <textarea
                  rows={3}
                  value={settings.business.description}
                  onChange={(e) => handleInputChange('business', 'description', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="Luxury Lash Extensions & Beauty Services"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Tax Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.business.taxPercentage || 0}
                  onChange={(e) => handleInputChange('business', 'taxPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the tax percentage (e.g., 16 for 16% VAT). Used in analytics to calculate taxes on revenue.
                </p>
              </div>
            </div>
          </div>

          {/* Logo Settings */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Logo Settings</h2>
            
            {/* Logo Type Selector */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-brown-dark mb-2">
                Logo Type
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('business', 'logoType', 'text')
                    setHasUnsavedChanges(true)
                  }}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                    settings.business.logoType === 'text'
                      ? 'bg-brown-dark text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Text Logo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange('business', 'logoType', 'image')
                    setHasUnsavedChanges(true)
                  }}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                    settings.business.logoType === 'image'
                      ? 'bg-brown-dark text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Image Logo
                </button>
              </div>
            </div>

            {/* Text Logo Option */}
            {settings.business.logoType === 'text' && (
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Logo Text
                </label>
                <input
                  type="text"
                  value={settings.business.logoText}
                  onChange={(e) => handleInputChange('business', 'logoText', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="LashDiary"
                />
                <p className="text-xs text-gray-600 mt-2">
                  This text will appear in your navigation, footer, and emails in your brand font.
                </p>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Logo Text Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.business.logoColor || '#733D26'}
                      onChange={(e) => handleInputChange('business', 'logoColor', e.target.value)}
                      className="h-12 w-16 cursor-pointer border-2 border-brown-light rounded-lg"
                      aria-label="Select logo text color"
                    />
                    <input
                      type="text"
                      value={settings.business.logoColor || '#733D26'}
                      onChange={(e) => handleInputChange('business', 'logoColor', e.target.value)}
                      className="w-32 px-3 py-2 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark text-sm uppercase"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Choose any HEX color (e.g. #733D26) to match your brand palette.
                  </p>
                </div>
                {/* Logo Preview */}
                <div className="mt-4 p-6 bg-baby-pink-light rounded-lg border-2 border-brown-light">
                  <p className="text-xs text-brown-dark mb-2 font-semibold">Preview:</p>
                  <h1
                    className="text-3xl font-display font-bold"
                    style={{ color: settings.business.logoColor || '#733D26' }}
                  >
                    {settings.business.logoText || 'LashDiary'}
                  </h1>
                </div>
              </div>
            )}

            {/* Image Logo Option */}
            {settings.business.logoType === 'image' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brown-dark mb-2">
                    Upload Logo Image
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setUploadingLogo(true)
                      const formData = new FormData()
                      formData.append('logo', file)

                      try {
                        const response = await fetch('/api/admin/settings/upload-logo', {
                          method: 'POST',
                          body: formData,
                          credentials: 'include',
                        })
                        const data = await response.json()
                        
                        if (response.ok && data.logoUrl) {
                          handleInputChange('business', 'logoUrl', data.logoUrl)
                          handleInputChange('business', 'logoType', 'image')
                          setMessage({ type: 'success', text: 'Logo uploaded! Remember to save changes.' })
                        } else {
                          setMessage({ type: 'error', text: data.error || 'Failed to upload logo' })
                        }
                      } catch (error) {
                        console.error('Error uploading logo:', error)
                        setMessage({ type: 'error', text: 'Error uploading logo' })
                      } finally {
                        setUploadingLogo(false)
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Recommended: PNG or SVG with transparent background. Max size: 2MB. Ideal dimensions: 200x60px
                  </p>
                </div>

                {/* Logo Preview */}
                {settings.business.logoUrl && (
                  <div className="p-6 bg-baby-pink-light rounded-lg border-2 border-brown-light">
                    <p className="text-xs text-brown-dark mb-2 font-semibold">Current Logo:</p>
                    <img 
                      src={settings.business.logoUrl} 
                      alt="Logo preview" 
                      className="h-16 object-contain"
                    />
                  </div>
                )}

                {uploadingLogo && (
                  <div className="text-sm text-brown-dark">Uploading logo...</div>
                )}
              </div>
            )}
          </div>

          {/* Favicon Settings */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-2">Favicon</h2>
            <p className="text-sm text-gray-600 mb-4">
              This is the small icon shown in browser tabs and bookmarks. Upload a square image (PNG, JPG, WebP, or SVG).
            </p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 border-2 border-brown-light flex items-center justify-center bg-white overflow-hidden">
                  {settings.business.faviconUrl ? (
                    <img
                      src={settings.business.faviconUrl}
                      alt="Favicon preview"
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center text-xs text-gray-400 text-center leading-tight px-1">
                      No favicon
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">Preview</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown disabled:opacity-50"
                  >
                    {uploadingFavicon ? 'Uploading...' : 'Upload New Favicon'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings((prev) => ({
                        ...prev,
                        business: {
                          ...prev.business,
                          faviconUrl: '',
                          faviconVersion: Date.now(),
                        },
                      }))
                      setHasUnsavedChanges(true)
                      setMessage({ type: 'success', text: 'Favicon removed. Save to apply.' })
                    }}
                    className="px-4 py-2 bg-white border-2 border-brown-light text-brown-dark rounded-lg hover:bg-pink-light/70"
                  >
                    Remove Favicon
                  </button>
                </div>
                <p className="text-xs text-gray-500">Tip: A simple 64x64 image with neutral colors works best.</p>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleUploadFavicon(file)
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Eyepatch Image Settings */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-2">Lash Map Eyepatch Image</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload an image with two eyepatches (left and right) side by side. This image will be used throughout the website for lash mapping.
            </p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex flex-col items-center gap-2">
                <div className="w-64 h-32 border-2 border-brown-light flex items-center justify-center bg-white overflow-hidden">
                  {settings.business.eyepatchImageUrl ? (
                    <img
                      src={settings.business.eyepatchImageUrl}
                      alt="Eyepatch preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 text-center leading-tight px-1">
                      No eyepatch image
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">Preview</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => eyepatchInputRef.current?.click()}
                    disabled={uploadingEyepatch}
                    className="px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown disabled:opacity-50"
                  >
                    {uploadingEyepatch ? 'Uploading...' : 'Upload Eyepatch Image'}
                  </button>
                  {settings.business.eyepatchImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((prev) => ({
                          ...prev,
                          business: {
                            ...prev.business,
                            eyepatchImageUrl: '',
                          },
                        }))
                        setHasUnsavedChanges(true)
                        setMessage({ type: 'success', text: 'Eyepatch image removed. Save to apply.' })
                      }}
                      className="px-4 py-2 bg-white border-2 border-brown-light text-brown-dark rounded-lg hover:bg-pink-light/70"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">Recommended: Image with two eyepatches side by side. Max size: 5MB.</p>
                <input
                  ref={eyepatchInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleUploadEyepatch(file)
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Social Media Links</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Instagram
                </label>
                <input
                  type="text"
                  value={settings.social.instagram}
                  onChange={(e) => handleInputChange('social', 'instagram', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="https://instagram.com/lashdiary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Facebook
                </label>
                <input
                  type="text"
                  value={settings.social.facebook}
                  onChange={(e) => handleInputChange('social', 'facebook', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="https://facebook.com/lashdiary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  TikTok
                </label>
                <input
                  type="text"
                  value={settings.social.tiktok}
                  onChange={(e) => handleInputChange('social', 'tiktok', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="https://tiktok.com/@lashdiary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Twitter
                </label>
                <input
                  type="text"
                  value={settings.social.twitter}
                  onChange={(e) => handleInputChange('social', 'twitter', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  placeholder="https://twitter.com/lashdiary"
                />
              </div>
            </div>
          </div>

          {/* Newsletter Settings */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Newsletter Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Welcome Discount Percentage
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settings.newsletter?.discountPercentage ?? 10}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(100, Number(e.target.value)))
                      setSettings(prev => ({
                        ...prev,
                        newsletter: {
                          ...prev.newsletter,
                          discountPercentage: value,
                        }
                      }))
                      setHasUnsavedChanges(true)
                    }}
                    className="w-24 px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                  <span className="text-brown-dark font-semibold">%</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  The discount percentage shown in the newsletter popup that appears on your homepage when clients first visit. 
                  New subscribers receive this discount code via email, which applies to their first lash appointment only. 
                  (Current: {settings.newsletter?.discountPercentage ?? 10}%)
                </p>
              </div>
            </div>
          </div>

          {/* Blog Settings */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Blog Settings</h2>
            <div className="space-y-4">
            </div>
          </div>

          {/* Currency Exchange Rates */}
          <div className="mb-8">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Currency Exchange Rates</h2>
            <p className="text-sm text-gray-600 mb-4">
              Set the exchange rates for converting between KES (Kenyan Shillings) and other currencies. 
              These rates are used for consultations, invoices, and all currency conversions throughout the system.
            </p>
            <div className="space-y-4 bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  USD to KES Rate
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">1 USD =</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={settings.exchangeRates?.usdToKes ?? 130}
                    onChange={(e) => {
                      const value = Math.max(1, Number(e.target.value))
                      setSettings(prev => ({
                        ...prev,
                        exchangeRates: {
                          ...prev.exchangeRates,
                          usdToKes: value,
                        }
                      }))
                      setHasUnsavedChanges(true)
                    }}
                    className="w-32 px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                  <span className="text-brown-dark font-semibold">KES</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Example: If 1 USD = 130 KES, enter 130. This means 1 US Dollar equals 130 Kenyan Shillings.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  EUR to KES Rate
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">1 EUR =</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={settings.exchangeRates?.eurToKes ?? 140}
                    onChange={(e) => {
                      const value = Math.max(1, Number(e.target.value))
                      setSettings(prev => ({
                        ...prev,
                        exchangeRates: {
                          ...prev.exchangeRates,
                          eurToKes: value,
                        }
                      }))
                      setHasUnsavedChanges(true)
                    }}
                    className="w-32 px-4 py-3 border-2 border-brown-light rounded-lg bg-white text-brown-dark focus:ring-2 focus:ring-brown-dark focus:border-brown-dark"
                  />
                  <span className="text-brown-dark font-semibold">KES</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Example: If 1 EUR = 140 KES, enter 140. This means 1 Euro equals 140 Kenyan Shillings.
                </p>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="mb-8 p-6 bg-pink-light/30 rounded-lg border-2 border-brown-light">
            <h2 className="text-2xl font-display text-brown-dark mb-4">Security</h2>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-6 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              Change Admin Password
            </button>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="flex-1 px-6 py-3 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-display text-brown-dark mb-6">Change Password</h2>

            {passwordMessage && (
              <div
                className={`mb-4 p-3 rounded-lg ${
                  passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Current Password
                </label>
                <PasswordInput
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className="border-2 border-brown-light"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  New Password
                </label>
                <PasswordInput
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={8}
                  className="border-2 border-brown-light"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Confirm New Password
                </label>
                <PasswordInput
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className="border-2 border-brown-light"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setPasswordMessage(null)
                  }}
                  className="flex-1 px-4 py-2 text-brown-dark border-2 border-brown-light rounded-lg hover:bg-brown-light/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSave}
        onLeave={handleLeaveWithoutSaving}
        onCancel={handleCancelDialog}
        saving={saving}
      />
    </div>
  )
}

