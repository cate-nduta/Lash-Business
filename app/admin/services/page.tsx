'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

interface Service {
  name: string
  price: number
  duration: number
}

interface ServicesData {
  fullSets: Service[]
  lashFills: Service[]
  otherServices: Service[]
}

export default function AdminServices() {
  const [services, setServices] = useState<ServicesData>({
    fullSets: [],
    lashFills: [],
    otherServices: [],
  })
  const [originalServices, setOriginalServices] = useState<ServicesData>({
    fullSets: [],
    lashFills: [],
    otherServices: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const router = useRouter()
  const hasUnsavedChanges = JSON.stringify(services) !== JSON.stringify(originalServices)

  useEffect(() => {
    // Check auth and load data
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/admin/login')
        } else {
          loadServices()
        }
      })
  }, [router])

  const loadServices = async () => {
    try {
      const response = await fetch('/api/admin/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
        setOriginalServices(data)
      }
    } catch (error) {
      console.error('Error loading services:', error)
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
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(services),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Services updated successfully!' })
        setOriginalServices(services) // Update original to clear unsaved changes flag
        setShowDialog(false) // Close dialog if open
      } else {
        setMessage({ type: 'error', text: 'Failed to save services' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const updateService = (category: keyof ServicesData, index: number, field: keyof Service, value: string | number) => {
    setServices((prev) => {
      const updated = { ...prev }
      updated[category] = [...updated[category]]
      updated[category][index] = { ...updated[category][index], [field]: value }
      return updated
    })
  }

  const addService = (category: keyof ServicesData) => {
    setServices((prev) => ({
      ...prev,
      [category]: [...prev[category], { name: '', price: 0, duration: 60 }],
    }))
  }

  const removeService = (category: keyof ServicesData, index: number) => {
    setServices((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  const renderServiceCategory = (title: string, category: keyof ServicesData) => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-brown-dark">{title}</h2>
        <button
          onClick={() => addService(category)}
          className="bg-brown-dark text-white px-4 py-2 rounded-lg hover:bg-brown transition-colors"
        >
          + Add Service
        </button>
      </div>
      <div className="space-y-4">
        {services[category].map((service, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-pink-light rounded-lg">
            <input
              type="text"
              value={service.name}
              onChange={(e) => updateService(category, index, 'name', e.target.value)}
              placeholder="Service name"
              className="px-3 py-2 border border-brown-light rounded bg-white"
            />
            <input
              type="number"
              value={service.price}
              onChange={(e) => updateService(category, index, 'price', parseInt(e.target.value) || 0)}
              placeholder="Price (KSH)"
              className="px-3 py-2 border border-brown-light rounded bg-white"
            />
            <input
              type="number"
              value={service.duration}
              onChange={(e) => updateService(category, index, 'duration', parseInt(e.target.value) || 60)}
              placeholder="Duration (minutes)"
              className="px-3 py-2 border border-brown-light rounded bg-white"
            />
            <button
              onClick={() => removeService(category, index)}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
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
          <h1 className="text-4xl font-display text-brown-dark mb-8">Service Prices Management</h1>
          {renderServiceCategory('Full Sets', 'fullSets')}
          {renderServiceCategory('Lash Fills', 'lashFills')}
          {renderServiceCategory('Other Services', 'otherServices')}
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

