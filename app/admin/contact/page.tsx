'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

export default function AdminContact() {
  const [contact, setContact] = useState({
    phone: '',
    email: '',
    instagram: '',
    instagramUrl: '',
    location: '',
    mobileServiceNote: '',
  })
  const [originalContact, setOriginalContact] = useState({
    phone: '',
    email: '',
    instagram: '',
    instagramUrl: '',
    location: '',
    mobileServiceNote: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(contact) !== JSON.stringify(originalContact)

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadContact()
        }
      })
  }, [router])

  const loadContact = async () => {
    try {
      const response = await fetch('/api/admin/contact')
      if (response.ok) {
        const data = await response.json()
        setContact(data)
        setOriginalContact(data)
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
      const response = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Contact information updated successfully!' })
        setOriginalContact(contact) // Update original to clear unsaved changes flag
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

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Contact Information</h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                placeholder="+254 712 345 678"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Email Address
              </label>
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
                Instagram Handle
              </label>
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
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Location/Service Area
              </label>
              <input
                type="text"
                value={contact.location}
                onChange={(e) => setContact({ ...contact, location: e.target.value })}
                placeholder="Nairobi environs"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Mobile Service Note
              </label>
              <input
                type="text"
                value={contact.mobileServiceNote}
                onChange={(e) => setContact({ ...contact, mobileServiceNote: e.target.value })}
                placeholder="Mobile service available within Nairobi environs • We come to you at no extra cost"
                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
              />
              <p className="text-xs text-gray-500 mt-1">This appears on the homepage</p>
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

