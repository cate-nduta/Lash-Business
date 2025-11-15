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
    headerTitle: 'Get In Touch',
    headerSubtitle: 'Visit us at our studio or reach out with any questions. We can\'t wait to welcome you and curate a stunning lash look.',
    businessHoursTitle: 'Business Hours',
    socialMediaTitle: 'Follow Us',
    socialMediaDescription: 'Stay connected and see our latest work on social media',
    bookingTitle: 'Ready to Book?',
    bookingDescription: 'Reserve your studio appointment today and let us pamper you with a luxury lash experience.',
    bookingButtonText: 'Book Appointment',
  }
  type ContactState = typeof defaultContactState

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
        const sanitizedContact = {
          ...defaultContactState,
          ...data,
          showPhone: data.showPhone !== undefined ? Boolean(data.showPhone) : defaultContactState.showPhone,
          showEmail: data.showEmail !== undefined ? Boolean(data.showEmail) : defaultContactState.showEmail,
          showInstagram: data.showInstagram !== undefined ? Boolean(data.showInstagram) : defaultContactState.showInstagram,
          showLocation: data.showLocation !== undefined ? Boolean(data.showLocation) : defaultContactState.showLocation,
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
        const responseData = await response.json()
        console.log('Save response:', responseData)
        setMessage({ type: 'success', text: 'Contact information updated successfully! The contact page will refresh automatically.' })
        setOriginalContact({ ...contact })
        setShowDialog(false)
        
        // Open contact page in new tab to verify changes
        setTimeout(() => {
          window.open('/contact', '_blank')
        }, 1000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Failed to save contact information' 
        })
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving' })
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
          <h1 className="text-4xl font-display text-brown-dark mb-8">Contact Page Settings</h1>
          
          <div className="space-y-8">
            {/* Header Section */}
            <div className="pb-8 border-b-2 border-brown-light">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Page Header</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Header Title
                  </label>
                  <input
                    type="text"
                    value={contact.headerTitle}
                    onChange={(e) => setContact({ ...contact, headerTitle: e.target.value })}
                    placeholder="Get In Touch"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Header Subtitle
                  </label>
                  <textarea
                    value={contact.headerSubtitle}
                    onChange={(e) => setContact({ ...contact, headerSubtitle: e.target.value })}
                    placeholder="Visit us at our studio or reach out with any questions..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="pb-8 border-b-2 border-brown-light">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Contact Information</h2>
              <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-brown-dark">
                  Phone Number
                </label>
                    <label className="flex items-center gap-2 text-sm text-brown-dark cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contact.showPhone}
                        onChange={(e) => setContact({ ...contact, showPhone: e.target.checked })}
                        className="w-4 h-4 text-brown focus:ring-brown border-brown-light rounded"
                      />
                      <span>Show on website</span>
                    </label>
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
                    <label className="flex items-center gap-2 text-sm text-brown-dark cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contact.showEmail}
                        onChange={(e) => setContact({ ...contact, showEmail: e.target.checked })}
                        className="w-4 h-4 text-brown focus:ring-brown border-brown-light rounded"
                      />
                      <span>Show on website</span>
                    </label>
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
                    <label className="flex items-center gap-2 text-sm text-brown-dark cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contact.showInstagram}
                        onChange={(e) => setContact({ ...contact, showInstagram: e.target.checked })}
                        className="w-4 h-4 text-brown focus:ring-brown border-brown-light rounded"
                      />
                      <span>Show on website</span>
                    </label>
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
                    <label className="flex items-center gap-2 text-sm text-brown-dark cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contact.showLocation}
                        onChange={(e) => setContact({ ...contact, showLocation: e.target.checked })}
                        className="w-4 h-4 text-brown focus:ring-brown border-brown-light rounded"
                      />
                      <span>Show on website</span>
                    </label>
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

            {/* Business Hours Section */}
            <div className="pb-8 border-b-2 border-brown-light">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Business Hours Section</h2>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={contact.businessHoursTitle}
                  onChange={(e) => setContact({ ...contact, businessHoursTitle: e.target.value })}
                  placeholder="Business Hours"
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
            </div>

            {/* Social Media Section */}
            <div className="pb-8 border-b-2 border-brown-light">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Social Media Section</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={contact.socialMediaTitle}
                    onChange={(e) => setContact({ ...contact, socialMediaTitle: e.target.value })}
                    placeholder="Follow Us"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Section Description
                  </label>
                  <textarea
                    value={contact.socialMediaDescription}
                    onChange={(e) => setContact({ ...contact, socialMediaDescription: e.target.value })}
                    placeholder="Stay connected and see our latest work on social media"
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
              </div>
            </div>

            {/* Booking Section */}
            <div>
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Booking Section</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={contact.bookingTitle}
                    onChange={(e) => setContact({ ...contact, bookingTitle: e.target.value })}
                    placeholder="Ready to Book?"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Section Description
                  </label>
                  <textarea
                    value={contact.bookingDescription}
                    onChange={(e) => setContact({ ...contact, bookingDescription: e.target.value })}
                    placeholder="Reserve your studio appointment today..."
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={contact.bookingButtonText}
                    onChange={(e) => setContact({ ...contact, bookingButtonText: e.target.value })}
                    placeholder="Book Appointment"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                </div>
              </div>
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
