'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminContact() {
  const defaultContactState = {
    phone: '',
    email: '',
    instagram: '',
    instagramUrl: '',
    location: '',
    showPhone: true,
    showEmail: true,
    showInstagram: true,
    showLocation: true,
  }
  type ContactState = typeof defaultContactState

  const coerceBoolean = (value: unknown, defaultValue: boolean) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true
      if (value.toLowerCase() === 'false') return false
    }
    return defaultValue
  }

  const [contact, setContact] = useState<ContactState>(defaultContactState)
  const [originalContact, setOriginalContact] = useState<ContactState>(defaultContactState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(contact) !== JSON.stringify(originalContact)

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      try {
        const response = await authorizedFetch('/api/admin/current-user')
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        if (!isMounted) return
        if (!data.authenticated) {
          router.replace('/admin/login')
          return
        }
        loadContact()
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

  const loadContact = async () => {
    try {
      const response = await authorizedFetch('/api/admin/contact')
      if (response.ok) {
        const data = await response.json()
        const { mobileServiceNote, ...rest } = data || {}
        const sanitizedContact = {
          ...defaultContactState,
          ...rest,
          showPhone: coerceBoolean(rest?.showPhone, defaultContactState.showPhone),
          showEmail: coerceBoolean(rest?.showEmail, defaultContactState.showEmail),
          showInstagram: coerceBoolean(rest?.showInstagram, defaultContactState.showInstagram),
          showLocation: coerceBoolean(rest?.showLocation, defaultContactState.showLocation),
        }
        setContact(sanitizedContact)
        setOriginalContact(sanitizedContact)
      }
    } catch (error) {
      console.error('Error loading contact:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // Intercept Link clicks
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      setPendingNavigation(href)
      setShowDialog(true)
    }
  }

  const handleDialogSave = async () => {
    await handleSave()
    if (pendingNavigation) {
      setShowDialog(false)
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const handleDialogLeave = () => {
    setShowDialog(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const handleDialogCancel = () => {
    setShowDialog(false)
    setPendingNavigation(null)
  }

  const handleToggleVisibility = (
    key: 'showPhone' | 'showEmail' | 'showInstagram' | 'showLocation'
  ) => {
    setContact((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const visibilityButtonStyles = (active: boolean) =>
    `ml-4 px-4 py-1 rounded-full border-2 text-sm font-medium transition-all ${
      active
        ? 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100'
        : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
    }`

  const visibilityLabel = (active: boolean) => (active ? 'Visible on website' : 'Hidden on website')

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authorizedFetch('/api/admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Contact information updated successfully!' })
        setOriginalContact({ ...contact }) // Update original to clear unsaved changes flag
        setShowDialog(false) // Close dialog if open
      } else {
        setMessage({ type: 'error', text: 'Failed to save contact information' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          {hasUnsavedChanges && (
            <div className="text-sm text-orange-600 font-medium">
              ⚠️ You have unsaved changes
            </div>
          )}
          <Link 
            href="/admin/dashboard" 
            className="text-brown hover:text-brown-dark"
            onClick={(e) => handleLinkClick(e, '/admin/dashboard')}
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brown-dark text-white px-6 py-2 rounded-lg hover:bg-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
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
          <h1 className="text-4xl font-display text-brown-dark mb-8">Contact Information</h1>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-brown-dark">
                  Phone Number
                </label>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showPhone')}
                  className={visibilityButtonStyles(contact.showPhone)}
                >
                  {visibilityLabel(contact.showPhone)}
                </button>
              </div>
              <input
                type="text"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                placeholder="e.g. +254 7XX XXX XXX"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-brown-dark">
                  Email Address
                </label>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showEmail')}
                  className={visibilityButtonStyles(contact.showEmail)}
                >
                  {visibilityLabel(contact.showEmail)}
                </button>
              </div>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-brown-dark">
                  Instagram Handle
                </label>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showInstagram')}
                  className={visibilityButtonStyles(contact.showInstagram)}
                >
                  {visibilityLabel(contact.showInstagram)}
                </button>
              </div>
              <input
                type="text"
                value={contact.instagram}
                onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
                placeholder="@lashdiary"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
              <p className="text-xs text-gray-500 mt-1">Include the @ symbol</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Instagram URL
              </label>
              <input
                type="url"
                value={contact.instagramUrl}
                onChange={(e) => setContact({ ...contact, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/lashdiary"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-brown-dark">
                  Studio Location
                </label>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showLocation')}
                  className={visibilityButtonStyles(contact.showLocation)}
                >
                  {visibilityLabel(contact.showLocation)}
                </button>
              </div>
              <input
                type="text"
                value={contact.location}
                onChange={(e) => setContact({ ...contact, location: e.target.value })}
                placeholder="LashDiary Studio, Nairobi, Kenya"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
            </div>
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={handleDialogSave}
        onLeave={handleDialogLeave}
        onCancel={handleDialogCancel}
        saving={saving}
      />
    </div>
  )
}

