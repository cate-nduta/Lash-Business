'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

export default function AdminContact() {
  const SOCIAL_PLATFORMS = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'twitter', label: 'Twitter / X' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'pinterest', label: 'Pinterest' },
    { id: 'other', label: 'Other' },
  ]

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
    showContactInfoSection: true,
    showBusinessHoursSection: true,
    showStayUpdatedSection: true,
    showReadyToBookSection: true,
    showSocialMediaSection: true,
    socialLinks: [] as { platform: string; label: string; url: string }[],
    headerTitle: 'Get In Touch',
    headerSubtitle: 'Visit us at our studio or reach out with any questions. We can\'t wait to welcome you and curate a stunning lash look.',
    businessHoursTitle: 'Business Hours',
    socialMediaTitle: 'Follow Us',
    socialMediaDescription: 'Stay connected and see our latest work on social media',
    bookingTitle: 'Ready to Book?',
    bookingDescription: 'Reserve your studio appointment today and let us pamper you with a luxury lash experience.',
    bookingButtonText: 'Book Appointment',
    whatsappMessage: 'Hello! I would like to chat with you.',
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
          showContactInfoSection: data.showContactInfoSection !== undefined ? Boolean(data.showContactInfoSection) : true,
          showBusinessHoursSection: data.showBusinessHoursSection !== undefined ? Boolean(data.showBusinessHoursSection) : true,
          showStayUpdatedSection: data.showStayUpdatedSection !== undefined ? Boolean(data.showStayUpdatedSection) : true,
          showReadyToBookSection: data.showReadyToBookSection !== undefined ? Boolean(data.showReadyToBookSection) : true,
          showSocialMediaSection: data.showSocialMediaSection !== undefined ? Boolean(data.showSocialMediaSection) : true,
          socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks.filter((s: { url?: string }) => s?.url?.trim()) : (data.instagramUrl || data.instagram ? [{ platform: 'instagram', label: 'Instagram', url: data.instagramUrl || `https://instagram.com/${(data.instagram || '').replace('@', '')}` }] : []),
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
      const toSave = {
        ...contact,
        socialLinks: (contact.socialLinks || []).filter((s) => s?.url?.trim()),
      }
      const response = await authorizedFetch('/api/admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      })

      if (response.ok) {
        const responseData = await response.json()
        console.log('Save response:', responseData)
        
        // Update localStorage for WhatsApp button if phone or message changed
        if (typeof window !== 'undefined') {
          if (contact.phone) {
            let cleaned = contact.phone.replace(/\s|-|\(|\)/g, '')
            if (!cleaned.startsWith('+')) {
              if (cleaned.startsWith('0')) {
                cleaned = cleaned.substring(1)
              }
              cleaned = '+254' + cleaned
            }
            localStorage.setItem('whatsapp-phone', cleaned)
          }
          if (contact.whatsappMessage) {
            localStorage.setItem('whatsapp-message', contact.whatsappMessage)
          }
          // Dispatch event to update WhatsApp button across all tabs
          window.dispatchEvent(new Event('contact-settings-updated'))
        }
        
        setMessage({ type: 'success', text: 'Contact information updated successfully! The contact page will refresh automatically.' })
        setOriginalContact({ ...toSave })
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
            {/* Section Visibility */}
            <div className="pb-8 border-b-2 border-brown-light">
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">Section Visibility</h2>
              <p className="text-sm text-brown-dark/70 mb-4">Enable or disable entire sections on the Get In Touch page.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'showContactInfoSection', label: 'Contact Information' },
                  { key: 'showBusinessHoursSection', label: 'Business Hours' },
                  { key: 'showStayUpdatedSection', label: 'Stay Updated (email signup)' },
                  { key: 'showReadyToBookSection', label: 'Ready to Book' },
                  { key: 'showSocialMediaSection', label: 'Social Media / Follow Us' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-pink-light/30 rounded-lg cursor-pointer">
                    <span className="font-medium text-brown-dark">{label}</span>
                    <input
                      type="checkbox"
                      checked={contact[key as keyof ContactState] as boolean}
                      onChange={(e) => setContact({ ...contact, [key]: e.target.checked })}
                      className="w-4 h-4 text-brown focus:ring-brown border-brown-light rounded"
                    />
                  </label>
                ))}
              </div>
            </div>

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
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Social Media Links (Instagram, Facebook, TikTok, etc.)
              </label>
              <p className="text-xs text-brown-dark/70 mb-3">Add multiple social media platforms. Each will appear in the Contact Information card and the Follow Us section.</p>
              <div className="space-y-3">
                {(contact.socialLinks || []).map((link, index) => (
                  <div key={index} className="flex flex-wrap gap-2 items-start p-3 bg-pink-light/20 rounded-lg">
                    <select
                      value={link.platform}
                      onChange={(e) => {
                        const next = [...(contact.socialLinks || [])]
                        const platformId = e.target.value
                        next[index] = { ...next[index], platform: platformId, label: SOCIAL_PLATFORMS.find(p => p.id === platformId)?.label || platformId }
                        setContact({ ...contact, socialLinks: next })
                      }}
                      className="flex-shrink-0 w-32 px-3 py-2 border-2 border-brown-light rounded-lg bg-white"
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    {link.platform === 'other' && (
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => {
                          const next = [...(contact.socialLinks || [])]
                          next[index] = { ...next[index], label: e.target.value }
                          setContact({ ...contact, socialLinks: next })
                        }}
                        placeholder="Custom label"
                        className="w-28 px-3 py-2 border-2 border-brown-light rounded-lg bg-white"
                      />
                    )}
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const next = [...(contact.socialLinks || [])]
                        next[index] = { ...next[index], url: e.target.value }
                        setContact({ ...contact, socialLinks: next })
                      }}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                    <button
                      type="button"
                      onClick={() => setContact({ ...contact, socialLinks: (contact.socialLinks || []).filter((_, i) => i !== index) })}
                      className="flex-shrink-0 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Remove"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setContact({ ...contact, socialLinks: [...(contact.socialLinks || []), { platform: 'instagram', label: 'Instagram', url: '' }] })}
                  className="px-4 py-2 border-2 border-dashed border-brown-light text-brown-dark rounded-lg hover:bg-pink-light/30 transition-colors"
                >
                  + Add social media link
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Legacy: Instagram handle below is kept for backward compatibility. Use social links above for all platforms.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Instagram Handle (legacy)
              </label>
              <input
                type="text"
                value={contact.instagram}
                onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
                placeholder="@lashdiary"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
              <input
                type="url"
                value={contact.instagramUrl}
                onChange={(e) => setContact({ ...contact, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/lashdiary"
                className="w-full mt-2 px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
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
            <div className="pb-8 border-b-2 border-brown-light">
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

            {/* WhatsApp Button Section */}
            <div>
              <h2 className="text-2xl font-semibold text-brown-dark mb-4">WhatsApp Button</h2>
              <p className="text-sm text-brown-dark/70 mb-4">
                Customize the WhatsApp button that appears on every page. The button will use your theme colors and display the message below when clicked.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Default Message
                  </label>
                  <textarea
                    value={contact.whatsappMessage}
                    onChange={(e) => setContact({ ...contact, whatsappMessage: e.target.value })}
                    placeholder="Hello! I would like to chat with you."
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be pre-filled when users click the WhatsApp button.
                  </p>
                </div>
                <div className="bg-brown-light/20 border-2 border-brown-light rounded-lg p-4">
                  <p className="text-sm text-brown-dark font-medium mb-2">Note:</p>
                  <ul className="text-xs text-brown-dark/70 space-y-1 list-disc list-inside">
                    <li>The phone number used is from the "Phone Number" field above</li>
                    <li>The button color will automatically match your theme</li>
                    <li>The button appears in the bottom-right corner of every page</li>
                  </ul>
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
