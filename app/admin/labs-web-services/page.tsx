'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: 'domain' | 'hosting' | 'page' | 'feature' | 'email' | 'design' | 'marketing' | 'other'
  imageUrl?: string
  isRequired?: boolean
  billingPeriod?: 'one-time' | 'yearly' | 'monthly'
  setupFee?: number // One-time setup fee for annually billed services
  discount?: number
  discountAmount?: number
  requiredServices?: string[] // Array of service IDs that must be bought together
}

interface WebServicesData {
  services: WebService[]
  pageDescription?: string
  enableBusinessInfo: boolean
  referralDiscountPercentage?: number
  referrerRewardPercentage?: number
  monthlyCapacity?: number
  priorityFee?: number
  bannerEnabled?: boolean
  bannerText?: string
  cartRules: {
    minimumCartValue: number
    autoAddDomainHosting: boolean
    autoAddDomainHostingProductId?: string
    autoAddContactForm: boolean
    autoAddContactFormProductId?: string
    suggestBusinessEmail: boolean
    suggestBusinessEmailProductId?: string
  }
  checkoutRules: {
    fullPaymentThreshold: number
    partialPaymentThreshold: number
    partialPaymentPercentage: number
  }
  taxPercentage?: number // Tax/VAT percentage (e.g., 16 for 16% VAT)
  keyFeatures?: {
    timelineText?: string
    deliveryText?: string
    learningText?: string
  }
}

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `service-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export default function AdminLabsWebServices() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [data, setData] = useState<WebServicesData>({
    services: [],
    pageDescription: 'Select the services and features you want. Our smart cart will help ensure you have everything you need.',
    enableBusinessInfo: true,
    referralDiscountPercentage: 10,
    referrerRewardPercentage: 5,
    bannerEnabled: false,
    bannerText: '',
    cartRules: {
      minimumCartValue: 20000,
      autoAddDomainHosting: true,
      autoAddContactForm: true,
      suggestBusinessEmail: true,
    },
    checkoutRules: {
      fullPaymentThreshold: 50000,
      partialPaymentThreshold: 50000,
      partialPaymentPercentage: 80,
    },
    taxPercentage: 0,
    keyFeatures: {
      timelineText: 'Your website will be designed and built within <strong>21 days</strong>',
      deliveryText: "You'll receive your <strong>live domain</strong>, <strong>admin login details</strong>, and a <strong>scheduled online walkthrough</strong>",
      learningText: 'Learn how to use and manage your website with confidence',
    },
  })
  const [originalData, setOriginalData] = useState<WebServicesData>(data)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [newService, setNewService] = useState<Partial<WebService>>({
    name: '',
    description: '',
    price: 0,
    category: 'other',
    imageUrl: '',
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null)
  const [editingService, setEditingService] = useState<WebService | null>(null)
  const [editServiceData, setEditServiceData] = useState<Partial<WebService>>({})
  const [formKey, setFormKey] = useState(0) // Key to force ReactQuill to reset
  const [discountCodes, setDiscountCodes] = useState<any[]>([])
  const [loadingDiscountCodes, setLoadingDiscountCodes] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [firstTimeDiscountPercentage, setFirstTimeDiscountPercentage] = useState<number>(10)
  const [selectedCodesToDelete, setSelectedCodesToDelete] = useState<Set<string>>(new Set())
  const [deletingCodes, setDeletingCodes] = useState(false)
  const [newDiscountCode, setNewDiscountCode] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    maxUses: 1,
    expiresAt: '',
  })

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(data) !== JSON.stringify(originalData),
    [data, originalData]
  )

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const authResponse = await fetch('/api/admin/current-user', { credentials: 'include' })
        if (!authResponse.ok) {
          throw new Error('Unauthorized')
        }
        const authData = await authResponse.json()
        if (!isMounted) return
        if (!authData.authenticated) {
          setAuthenticated(false)
          router.replace('/admin/login')
          return
        }
        setAuthenticated(true)

        const response = await fetch('/api/labs/web-services', { credentials: 'include' })
        if (!response.ok) {
          throw new Error('Failed to load web services')
        }
        const loadedData = await response.json()
        if (!isMounted) return

        const normalized: WebServicesData = {
          services: Array.isArray(loadedData.services) ? loadedData.services : [],
          pageDescription: loadedData.pageDescription || 'Select the services and features you want. Our smart cart will help ensure you have everything you need.',
          enableBusinessInfo: loadedData.enableBusinessInfo !== false,
          referralDiscountPercentage: typeof loadedData.referralDiscountPercentage === 'number' 
            ? loadedData.referralDiscountPercentage 
            : 10,
          referrerRewardPercentage: typeof loadedData.referrerRewardPercentage === 'number'
            ? loadedData.referrerRewardPercentage
            : 5,
          monthlyCapacity: typeof loadedData.monthlyCapacity === 'number'
            ? loadedData.monthlyCapacity
            : 7,
          priorityFee: typeof loadedData.priorityFee === 'number'
            ? loadedData.priorityFee
            : 2000,
          cartRules: {
            minimumCartValue: loadedData.cartRules?.minimumCartValue || 20000,
            autoAddDomainHosting: loadedData.cartRules?.autoAddDomainHosting !== false,
            autoAddDomainHostingProductId: loadedData.cartRules?.autoAddDomainHostingProductId,
            autoAddContactForm: loadedData.cartRules?.autoAddContactForm !== false,
            autoAddContactFormProductId: loadedData.cartRules?.autoAddContactFormProductId,
            suggestBusinessEmail: loadedData.cartRules?.suggestBusinessEmail !== false,
            suggestBusinessEmailProductId: loadedData.cartRules?.suggestBusinessEmailProductId,
          },
          checkoutRules: {
            fullPaymentThreshold: loadedData.checkoutRules?.fullPaymentThreshold || 50000,
            partialPaymentThreshold: loadedData.checkoutRules?.partialPaymentThreshold || 50000,
            partialPaymentPercentage: loadedData.checkoutRules?.partialPaymentPercentage || 80,
          },
          taxPercentage: typeof loadedData.taxPercentage === 'number' ? loadedData.taxPercentage : 0,
          keyFeatures: loadedData.keyFeatures || {
            timelineText: 'Your website will be designed and built within <strong>21 days</strong>',
            deliveryText: "You'll receive your <strong>live domain</strong>, <strong>admin login details</strong>, and a <strong>scheduled online walkthrough</strong>",
            learningText: 'Learn how to use and manage your website with confidence',
          },
        }
        
        // Load banner settings separately
        try {
          const bannerResponse = await fetch('/api/labs/web-services/banner', { credentials: 'include' })
          if (bannerResponse.ok) {
            const bannerData = await bannerResponse.json()
            normalized.bannerEnabled = bannerData.enabled || false
            normalized.bannerText = bannerData.text || ''
          }
        } catch (error) {
          console.error('Error loading banner settings:', error)
        }
        
        setData(normalized)
        setOriginalData(normalized)
        
        // Load discount codes
        loadDiscountCodes()
      } catch (error) {
        console.error('Error loading web services:', error)
        if (isMounted) {
          setMessage({ type: 'error', text: 'Failed to load web services. Please refresh the page.' })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [router])
  
  // Load discount codes function
  const loadDiscountCodes = async () => {
    setLoadingDiscountCodes(true)
    try {
      const response = await fetch('/api/labs/web-services/discount-code', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setDiscountCodes(data.promoCodes || [])
      }
    } catch (error) {
      console.error('Error loading discount codes:', error)
    } finally {
      setLoadingDiscountCodes(false)
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = ''
        return ''
      }
      return undefined
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const requestNavigation = (href: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(href)
      setShowDialog(true)
    } else {
      router.push(href)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Save web services data (without banner)
      const { bannerEnabled, bannerText, ...webServicesData } = data
      const response = await fetch('/api/labs/web-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(webServicesData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save web services')
      }

      // Save banner settings separately
      try {
        const bannerSettings = {
          enabled: bannerEnabled || false,
          text: bannerText || '',
        }
        
        const bannerResponse = await fetch('/api/labs/web-services/banner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(bannerSettings),
        })
        
        if (bannerResponse.ok) {
          // Update localStorage immediately so banner updates on Custom Website Builds pages
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('custom-website-builds-banner', JSON.stringify(bannerSettings))
              // Dispatch custom event for same-tab updates (storage event only works cross-tab)
              window.dispatchEvent(new CustomEvent('banner-settings-updated', { detail: bannerSettings }))
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        } else {
          console.error('Failed to save banner settings')
        }
      } catch (bannerError) {
        console.error('Error saving banner settings:', bannerError)
      }

      setOriginalData(data)
      setMessage({ type: 'success', text: 'Web services updated successfully.' })
      setShowDialog(false)
    } catch (error: any) {
      console.error('Error saving web services:', error)
      setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddService = async () => {
    if (!newService.name || !newService.description || !newService.price) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    const service: WebService = {
      id: generateId(),
      name: newService.name,
      description: newService.description,
      price: newService.price,
      category: newService.category || 'other',
      imageUrl: newService.imageUrl,
      isRequired: newService.isRequired || false,
      billingPeriod: newService.billingPeriod || 'one-time',
      setupFee: newService.billingPeriod === 'yearly' ? (newService.setupFee || 0) : undefined, // Only yearly has setup fee
      discount: newService.discount,
      discountAmount: newService.discountAmount,
      requiredServices: newService.requiredServices || [],
    }

    const updatedData = {
      ...data,
      services: [...data.services, service],
    }

    setData(updatedData)

    // Save immediately after adding
    setSaving(true)
    try {
      const response = await fetch('/api/labs/web-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save service')
      }

      setOriginalData(updatedData)
      setMessage({ type: 'success', text: 'Service added and saved successfully!' })
      
      // Reset form completely
      setNewService({
        name: '',
        description: '',
        price: 0,
        category: 'other',
        billingPeriod: 'one-time',
        setupFee: 0,
        imageUrl: '',
        isRequired: false,
        discount: undefined,
        discountAmount: undefined,
        requiredServices: [],
      })
      
      // Force ReactQuill to reset by changing the key
      setFormKey(prev => prev + 1)
    } catch (error: any) {
      console.error('Error saving service:', error)
      setMessage({ type: 'error', text: 'Failed to save service. Please try again.' })
      // Revert the change
      setData(data)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveService = (id: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }))
  }

  const handleServiceChange = (id: string, field: keyof WebService, value: any) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }))
  }

  if (loading || authenticated === null) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <>
      <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {hasUnsavedChanges ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
              <span>⚠️ Unsaved changes</span>
            </div>
          ) : (
            <div className="text-sm text-brown-dark/70">All changes saved</div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => requestNavigation('/admin/dashboard')}
              className="inline-flex items-center justify-center rounded-full border border-brown-light px-4 py-2 text-sm font-semibold text-brown hover:border-brown-dark hover:text-brown-dark transition-colors"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="inline-flex items-center justify-center rounded-full bg-brown-dark px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brown disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {message && (
          <Toast message={message.text} type={message.type} onClose={() => setMessage(null)} />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-10">
          <div>
            <h1 className="text-4xl font-display text-brown-dark mb-2">Labs Web Services</h1>
            <p className="text-brown-dark/80 max-w-3xl">
              Manage web services for the "Custom Website Builds" page. Set prices, descriptions, discounts, and configure cart/checkout rules.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Link
                href="/admin/labs-web-services/orders"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brown-light/30 text-brown-dark rounded-lg hover:bg-brown-light/50 transition-colors font-medium"
              >
                📋 View Orders
              </Link>
              <Link
                href="/admin/labs-web-services/subscribers"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
              >
                👥 Yearly Subscribers
              </Link>
              <Link
                href="/admin/labs-web-services/monthly-subscribers"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
              >
                📅 Monthly Subscribers
              </Link>
              <Link
                href="/admin/labs-web-services/guide"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
              >
                📖 Guide Scenarios
              </Link>
            </div>
          </div>

          {/* Add New Service - Moved to top */}
          <section key={`add-service-form-${formKey}`} className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6 mb-8">
            <h2 className="text-2xl font-semibold text-brown-dark">Add New Service</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={newService.name || ''}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="e.g., Domain Registration"
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Category *
                </label>
                <select
                  value={newService.category || 'other'}
                  onChange={(e) => setNewService({ ...newService, category: e.target.value as WebService['category'] })}
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                >
                  <option value="domain">Domain</option>
                  <option value="hosting">Hosting</option>
                  <option value="page">Page</option>
                  <option value="feature">Feature</option>
                  <option value="email">Email</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Billing Period *
                </label>
                <select
                  value={newService.billingPeriod || 'one-time'}
                  onChange={(e) => setNewService({ ...newService, billingPeriod: e.target.value as 'one-time' | 'yearly' | 'monthly' })}
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                >
                  <option value="one-time">One-Time Payment</option>
                  <option value="yearly">Yearly (Annual Subscription)</option>
                  <option value="monthly">Monthly (Monthly Maintenance)</option>
                </select>
                <p className="text-xs text-brown-dark/60 mt-1">
                  Choose whether this service is a one-time payment, recurring yearly subscription, or monthly maintenance
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  {newService.billingPeriod === 'yearly' ? 'Annual Subscription Price (KES) *' : newService.billingPeriod === 'monthly' ? 'Monthly Subscription Price (KES) *' : 'Price (KES) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newService.price || 0}
                  onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
                {newService.billingPeriod === 'yearly' && (newService.price || 0) > 0 && (
                  <p className="text-xs text-brown-dark/60 mt-1">
                    Monthly equivalent: KES {Math.round((newService.price || 0) / 12).toLocaleString()}/month
                  </p>
                )}
                {newService.billingPeriod === 'monthly' && (newService.price || 0) > 0 && (
                  <p className="text-xs text-brown-dark/60 mt-1">
                    Recurring monthly charge: KES {(newService.price || 0).toLocaleString()}/month
                  </p>
                )}
              </div>
              {newService.billingPeriod === 'yearly' && (
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Setup Fee (KES) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newService.setupFee || 0}
                    onChange={(e) => setNewService({ ...newService, setupFee: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                  <p className="text-xs text-brown-dark/60 mt-1">
                    One-time setup fee paid at checkout. Annual subscription will be billed yearly by Paystack.
                  </p>
                  {(newService.setupFee || 0) > 0 && (newService.price || 0) > 0 && (
                    <div className="mt-2 p-3 bg-brown-light/20 rounded-lg border border-brown-light">
                      <p className="text-xs font-semibold text-brown-dark mb-1">Payment Breakdown:</p>
                      <p className="text-xs text-brown-dark/80">Setup Fee: KES {(newService.setupFee || 0).toLocaleString()}</p>
                      <p className="text-xs text-brown-dark/80">1 Year Subscription: KES {(newService.price || 0).toLocaleString()}</p>
                      <p className="text-xs text-brown-dark/80 mt-1">Total First Payment: KES {((newService.setupFee || 0) + (newService.price || 0)).toLocaleString()}</p>
                      <p className="text-xs text-brown-dark/80">Monthly: KES {Math.round((newService.price || 0) / 12).toLocaleString()}/month</p>
                    </div>
                  )}
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Description *
                </label>
                <div className="border-2 border-brown-light rounded-xl overflow-hidden" style={{ minHeight: '200px' }}>
                  <ReactQuill
                    key={`description-editor-${formKey}`}
                    theme="snow"
                    value={newService.description || ''}
                    onChange={(value) => {
                      setNewService(prev => ({ ...prev, description: value }))
                    }}
                    placeholder="Describe what this service includes... (Press Enter for a new line)"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                      ],
                    }}
                    formats={['header', 'bold', 'italic', 'underline', 'link', 'list']}
                  />
                </div>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Use the toolbar to format text, add links, and create lists.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Product Image (Optional)
                </label>
                <div className="space-y-3">
                  {newService.imageUrl && (
                    <div className="relative inline-block">
                      <img
                        src={newService.imageUrl}
                        alt="Product preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-brown-light"
                      />
                      <button
                        type="button"
                        onClick={() => setNewService({ ...newService, imageUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          
                          setUploadingImage(true)
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            
                            const response = await fetch('/api/labs/web-services/upload-image', {
                              method: 'POST',
                              body: formData,
                            })
                            
                            const data = await response.json()
                            
                            if (response.ok && data.url) {
                              setNewService({ ...newService, imageUrl: data.url })
                            } else {
                              setMessage({ type: 'error', text: data.error || 'Failed to upload image' })
                            }
                          } catch (error) {
                            console.error('Error uploading image:', error)
                            setMessage({ type: 'error', text: 'Failed to upload image' })
                          } finally {
                            setUploadingImage(false)
                          }
                        }}
                        disabled={uploadingImage}
                      />
                      <span className="inline-flex items-center justify-center rounded-xl border-2 border-brown-light bg-white px-4 py-2 text-sm font-medium text-brown-dark hover:border-brown-dark transition-colors disabled:opacity-50">
                        {uploadingImage ? 'Uploading...' : newService.imageUrl ? 'Change Image' : 'Upload Image'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newService.isRequired || false}
                    onChange={(e) => setNewService({ ...newService, isRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                  />
                  <span className="text-sm text-brown-dark">Required (auto-add if missing)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Discount Percentage (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newService.discount || ''}
                  onChange={(e) => setNewService({ ...newService, discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g., 10 for 10% off"
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Discount Amount (KES, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newService.discountAmount || ''}
                  onChange={(e) => setNewService({ ...newService, discountAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="e.g., 1000 for KES 1000 off"
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Must Be Bought Together (optional)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Select other services that must be purchased together with this service. Customers cannot checkout without these services in their cart.
                </p>
                <select
                  multiple
                  value={newService.requiredServices || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setNewService({ ...newService, requiredServices: selected })
                  }}
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none min-h-[100px]"
                  size={5}
                >
                  {data.services
                    .filter(s => s.id !== newService.id) // Don't show current service if editing
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple services
                </p>
                {newService.requiredServices && newService.requiredServices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newService.requiredServices.map((serviceId) => {
                      const service = data.services.find(s => s.id === serviceId)
                      return service ? (
                        <span
                          key={serviceId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-brown-light/30 text-brown-dark rounded text-xs"
                        >
                          {service.name}
                          <button
                            type="button"
                            onClick={() => {
                              setNewService({
                                ...newService,
                                requiredServices: (newService.requiredServices || []).filter(id => id !== serviceId)
                              })
                            }}
                            className="text-brown-dark hover:text-brown"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={handleAddService}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-brown-dark px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brown disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Add & Save Service'}
                </button>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Service will be saved immediately after adding
                </p>
              </div>
            </div>
          </section>

          {/* Page Settings */}
          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Page Settings</h2>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Page Description
              </label>
              <p className="text-xs text-brown-dark/60 mb-2">
                This text appears on the "Custom Website Builds" page. The minimum order value will be automatically appended.
              </p>
              <textarea
                value={data.pageDescription || ''}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    pageDescription: e.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                placeholder="Select the services and features you want. Our smart cart will help ensure you have everything you need."
              />
            </div>

            {/* Key Features Text */}
            <div className="border-t border-brown-light/50 pt-6">
              <h3 className="text-xl font-semibold text-brown-dark mb-4">Key Features Text</h3>
              <p className="text-xs text-brown-dark/60 mb-4">
                Edit the text that appears in the key features section on the Custom Website Builds page. You can use HTML tags like &lt;strong&gt; for bold text.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Timeline Text
                  </label>
                  <textarea
                    value={data.keyFeatures?.timelineText || ''}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        keyFeatures: {
                          ...(prev.keyFeatures || {}),
                          timelineText: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    placeholder="Your website will be designed and built within <strong>21 days</strong>"
                  />
                  <p className="text-xs text-brown-dark/60 mt-2">
                    Example: Your website will be designed and built within &lt;strong&gt;21 days&lt;/strong&gt;
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Delivery Text
                  </label>
                  <textarea
                    value={data.keyFeatures?.deliveryText || ''}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        keyFeatures: {
                          ...(prev.keyFeatures || {}),
                          deliveryText: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    placeholder="You'll receive your <strong>live domain</strong>, <strong>admin login details</strong>, and a <strong>scheduled online walkthrough</strong>"
                  />
                  <p className="text-xs text-brown-dark/60 mt-2">
                    Example: You'll receive your &lt;strong&gt;live domain&lt;/strong&gt;, &lt;strong&gt;admin login details&lt;/strong&gt;, and a &lt;strong&gt;scheduled online walkthrough&lt;/strong&gt;
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Learning Text
                  </label>
                  <textarea
                    value={data.keyFeatures?.learningText || ''}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        keyFeatures: {
                          ...(prev.keyFeatures || {}),
                          learningText: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    placeholder="Learn how to use and manage your website with confidence"
                  />
                  <p className="text-xs text-brown-dark/60 mt-2">
                    Example: Learn how to use and manage your website with confidence
                  </p>
                </div>
              </div>
            </div>
            
            {/* Banner Settings */}
            <div className="border-t border-brown-light/50 pt-6">
              <h3 className="text-xl font-semibold text-brown-dark mb-4">Top Banner</h3>
              <p className="text-xs text-brown-dark/60 mb-4">
                Display a banner at the top of the Custom Website Builds page and checkout pages. The text will always appear in white.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={data.bannerEnabled || false}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          bannerEnabled: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                    />
                    <span className="text-sm font-medium text-brown-dark">Enable Banner</span>
                  </label>
                </div>
                {data.bannerEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Banner Text
                    </label>
                    <textarea
                      value={data.bannerText || ''}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          bannerText: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      placeholder="Enter banner message..."
                    />
                    <p className="text-xs text-brown-dark/60 mt-2">
                      This text will appear in white on a dark brown background at the top of the Custom Website Builds and checkout pages.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.enableBusinessInfo}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      enableBusinessInfo: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                />
                <span className="text-sm font-medium text-brown-dark">Enable Business Information Section</span>
              </label>
              <p className="text-xs text-brown-dark/60 mt-1 ml-6">
                Show business name, domain, and logo fields during checkout
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Referral Discount Percentage (%)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Discount percentage for customers who use a referral code (default: 10%)
                </p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={data.referralDiscountPercentage ?? 10}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      referralDiscountPercentage: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 10)),
                    }))
                  }
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Referrer Reward Percentage (%)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Reward percentage for the person who refers (default: 5%)
                </p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={data.referrerRewardPercentage ?? 5}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      referrerRewardPercentage: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 5)),
                    }))
                  }
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Monthly Capacity Limit
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Maximum number of web service orders accepted per month (default: 7)
                </p>
                <input
                  type="number"
                  min="1"
                  value={data.monthlyCapacity ?? 7}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      monthlyCapacity: Math.max(1, parseInt(e.target.value, 10) || 7),
                    }))
                  }
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-brown-dark mb-2">
                  Priority Fee (KES)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Additional fee for urgent timeline (&lt;10 days) (default: 2,000 KES)
                </p>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={typeof data.priorityFee === 'number' ? data.priorityFee : 2000}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow empty string temporarily while editing
                    if (value === '') {
                      setData((prev) => ({
                        ...prev,
                        priorityFee: 0, // Set to 0 temporarily to allow editing
                      }))
                    } else {
                      const numValue = parseInt(value, 10)
                      if (!isNaN(numValue) && numValue >= 0) {
                        setData((prev) => ({
                          ...prev,
                          priorityFee: numValue,
                        }))
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure a valid value on blur, default to 2000 if empty or invalid
                    const value = e.target.value.trim()
                    if (value === '' || isNaN(parseInt(value, 10)) || parseInt(value, 10) < 0) {
                      setData((prev) => ({
                        ...prev,
                        priorityFee: 2000,
                      }))
                    } else {
                      // Ensure the value is set correctly
                      const numValue = parseInt(value, 10)
                      setData((prev) => ({
                        ...prev,
                        priorityFee: Math.max(0, numValue),
                      }))
                    }
                  }}
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Cart Rules */}
          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Cart Rules</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Minimum Cart Value (KES)
                </label>
                <input
                  type="number"
                  min="0"
                  value={data.cartRules.minimumCartValue}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      cartRules: {
                        ...prev.cartRules,
                        minimumCartValue: Math.max(0, parseInt(e.target.value, 10) || 0),
                      },
                    }))
                  }
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.cartRules.autoAddDomainHosting}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          cartRules: {
                            ...prev.cartRules,
                            autoAddDomainHosting: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                    />
                    <span className="text-sm font-medium text-brown-dark">Auto-add Domain/Hosting if missing</span>
                  </label>
                  {data.cartRules.autoAddDomainHosting && (
                    <div className="ml-6">
                      <label className="block text-xs text-brown-dark/70 mb-1">
                        Select Product to Auto-Add:
                      </label>
                      <select
                        value={data.cartRules.autoAddDomainHostingProductId || ''}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            cartRules: {
                              ...prev.cartRules,
                              autoAddDomainHostingProductId: e.target.value || undefined,
                            },
                          }))
                        }
                        className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      >
                        <option value="">Auto-detect (by category)</option>
                        {data.services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} ({service.category}) - {service.price.toLocaleString()} KES
                          </option>
                        ))}
                        {data.services.length === 0 && (
                          <option disabled>No products available</option>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.cartRules.autoAddContactForm}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          cartRules: {
                            ...prev.cartRules,
                            autoAddContactForm: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                    />
                    <span className="text-sm font-medium text-brown-dark">Auto-add Contact Form if multiple pages</span>
                  </label>
                  {data.cartRules.autoAddContactForm && (
                    <div className="ml-6">
                      <label className="block text-xs text-brown-dark/70 mb-1">
                        Select Product to Auto-Add:
                      </label>
                      <select
                        value={data.cartRules.autoAddContactFormProductId || ''}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            cartRules: {
                              ...prev.cartRules,
                              autoAddContactFormProductId: e.target.value || undefined,
                            },
                          }))
                        }
                        className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      >
                        <option value="">Auto-detect (by name)</option>
                        {data.services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} ({service.category}) - {service.price.toLocaleString()} KES
                          </option>
                        ))}
                        {data.services.length === 0 && (
                          <option disabled>No products available</option>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.cartRules.suggestBusinessEmail}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          cartRules: {
                            ...prev.cartRules,
                            suggestBusinessEmail: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                    />
                    <span className="text-sm font-medium text-brown-dark">Suggest Business Email if domain in cart</span>
                  </label>
                  {data.cartRules.suggestBusinessEmail && (
                    <div className="ml-6">
                      <label className="block text-xs text-brown-dark/70 mb-1">
                        Select Product to Suggest:
                      </label>
                      <select
                        value={data.cartRules.suggestBusinessEmailProductId || ''}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            cartRules: {
                              ...prev.cartRules,
                              suggestBusinessEmailProductId: e.target.value || undefined,
                            },
                          }))
                        }
                        className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      >
                        <option value="">Auto-detect (by category)</option>
                        {data.services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} ({service.category}) - {service.price.toLocaleString()} KES
                          </option>
                        ))}
                        {data.services.length === 0 && (
                          <option disabled>No products available</option>
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Checkout Rules */}
          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Checkout Rules</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Full Payment Threshold (KES)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Below this amount, customers pay full amount
                </p>
                <input
                  type="number"
                  min="0"
                  value={data.checkoutRules.fullPaymentThreshold}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      checkoutRules: {
                        ...prev.checkoutRules,
                        fullPaymentThreshold: Math.max(0, parseInt(e.target.value, 10) || 0),
                      },
                    }))
                  }
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Partial Payment Threshold (KES)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Above this amount, customers can pay partial
                </p>
                <input
                  type="number"
                  min="0"
                  value={data.checkoutRules.partialPaymentThreshold}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      checkoutRules: {
                        ...prev.checkoutRules,
                        partialPaymentThreshold: Math.max(0, parseInt(e.target.value, 10) || 0),
                      },
                    }))
                  }
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Partial Payment Percentage (%)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Percentage to pay at checkout (e.g., 80 = 80%)
                </p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={data.checkoutRules.partialPaymentPercentage}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      checkoutRules: {
                        ...prev.checkoutRules,
                        partialPaymentPercentage: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                      },
                    }))
                  }
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Tax/VAT Settings */}
          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Tax/VAT Settings</h2>
            <div>
              <label className="block text-sm font-medium text-brown-dark mb-2">
                Tax/VAT Percentage (%)
              </label>
              <p className="text-xs text-brown-dark/60 mb-2">
                Tax percentage to apply to the subtotal (e.g., 16 for 16% VAT). Set to 0 to disable tax.
              </p>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={data.taxPercentage || 0}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    taxPercentage: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                  }))
                }
                className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
              />
            </div>
          </section>

          {/* Discount Code Management */}
          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-brown-dark">Discount Code Management</h2>
            
            {/* Generate First-Time User Discount Code */}
            <div className="border border-brown-light rounded-xl p-4 bg-brown-light/10">
              <h3 className="text-lg font-semibold text-brown-dark mb-3">First-Time User Discount Code</h3>
              <p className="text-sm text-brown-dark/70 mb-4">
                Generate a unique discount code that can be used by any first-time user. The code can be used by unlimited first-time users, but each individual user can only use it once.
              </p>
              
              {discountCodes.filter(c => c.isFirstTimeOnly && c.isActive).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-brown-dark">Active First-Time User Code:</p>
                  {discountCodes.filter(c => c.isFirstTimeOnly && c.isActive).map((code) => (
                    <div key={code.id} className="bg-white rounded-lg p-4 border-2 border-brown-light">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-lg font-bold text-brown-dark">{code.code}</span>
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Active</span>
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">First-Time Only</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/labs/web-services/discount-code?id=${code.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ id: code.id, isActive: !code.isActive }),
                                })
                                if (response.ok) {
                                  loadDiscountCodes()
                                  setMessage({ type: 'success', text: `Code ${!code.isActive ? 'activated' : 'deactivated'} successfully` })
                                }
                              } catch (error) {
                                setMessage({ type: 'error', text: 'Failed to update code' })
                              }
                            }}
                            className="px-3 py-1 text-xs rounded bg-brown-light hover:bg-brown text-brown-dark font-semibold transition-colors"
                          >
                            {code.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete discount code ${code.code}? This cannot be undone.`)) {
                                try {
                                  const response = await fetch(`/api/labs/web-services/discount-code?id=${code.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  })
                                  if (response.ok) {
                                    loadDiscountCodes()
                                    setMessage({ type: 'success', text: 'Discount code deleted successfully' })
                                  }
                                } catch (error) {
                                  setMessage({ type: 'error', text: 'Failed to delete code' })
                                }
                              }
                            }}
                            className="px-3 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700 font-semibold transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-brown-dark/70">Discount: </span>
                            <span className="font-semibold text-brown-dark">{code.discountType === 'percentage' ? `${code.discountValue}%` : `${code.discountValue} KES`}</span>
                          </div>
                          <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                            <span className="text-brown-dark/70 text-xs font-medium">Used for Checkout: </span>
                            <span className="font-bold text-brown-dark text-base">{code.usedCount}</span>
                            <span className="text-brown-dark/70 text-xs"> time{code.usedCount !== 1 ? 's' : ''}</span>
                          </div>
                          {code.isFirstTimeOnly && code.maxUses >= 999999 ? (
                            <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                              <span className="text-green-700 text-xs font-medium">✓ Unlimited first-time users</span>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="text-brown-dark/70">Max Uses: </span>
                                <span className="font-semibold text-brown-dark">{code.maxUses}</span>
                              </div>
                              <div>
                                <span className="text-brown-dark/70">Remaining: </span>
                                <span className="font-semibold text-brown-dark">{code.maxUses - code.usedCount}</span>
                              </div>
                            </>
                          )}
                        </div>
                        {code.expiresAt && (
                          <div className="text-sm">
                            <span className="text-brown-dark/70">Expires: </span>
                            <span className="font-semibold text-brown-dark">{new Date(code.expiresAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Discount Percentage (%)
                    </label>
                    <p className="text-xs text-brown-dark/60 mb-2">
                      Set the discount percentage for first-time users (e.g., 10 = 10% off). This code can be used by unlimited first-time users, but each user can only use it once.
                    </p>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={firstTimeDiscountPercentage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10)
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                          setFirstTimeDiscountPercentage(value)
                        } else if (e.target.value === '') {
                          setFirstTimeDiscountPercentage(0)
                        }
                      }}
                      className="w-full md:w-48 rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      placeholder="10"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (firstTimeDiscountPercentage < 0 || firstTimeDiscountPercentage > 100) {
                        setMessage({ type: 'error', text: 'Discount percentage must be between 0 and 100' })
                        return
                      }
                      setGeneratingCode(true)
                      try {
                        const response = await fetch('/api/labs/web-services/discount-code', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ 
                            action: 'generate-first-time', 
                            discountType: 'percentage', 
                            discountValue: firstTimeDiscountPercentage 
                          }),
                        })
                        const data = await response.json()
                        if (response.ok) {
                          loadDiscountCodes()
                          setMessage({ type: 'success', text: `First-time user discount code generated: ${data.code.code} (${firstTimeDiscountPercentage}% off)` })
                        } else {
                          setMessage({ type: 'error', text: data.error || 'Failed to generate discount code' })
                        }
                      } catch (error) {
                        setMessage({ type: 'error', text: 'Failed to generate discount code' })
                      } finally {
                        setGeneratingCode(false)
                      }
                    }}
                    disabled={generatingCode || firstTimeDiscountPercentage < 0 || firstTimeDiscountPercentage > 100}
                    className="inline-flex items-center justify-center rounded-xl bg-brown-dark px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brown disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingCode ? 'Generating...' : `Generate First-Time User Discount Code (${firstTimeDiscountPercentage}% off)`}
                  </button>
                </div>
              )}
            </div>

            {/* All Discount Codes List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-brown-dark">All Discount Codes</h3>
                {discountCodes.length > 0 && (
                  <div className="flex gap-2 items-center">
                    {selectedCodesToDelete.size > 0 && (
                      <button
                        onClick={async () => {
                          if (confirm(`Delete ${selectedCodesToDelete.size} selected discount code(s)? This cannot be undone.`)) {
                            setDeletingCodes(true)
                            try {
                              let successCount = 0
                              let errorCount = 0
                              
                              for (const codeId of Array.from(selectedCodesToDelete)) {
                                try {
                                  const response = await fetch(`/api/labs/web-services/discount-code?id=${codeId}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  })
                                  if (response.ok) {
                                    successCount++
                                  } else {
                                    errorCount++
                                  }
                                } catch (error) {
                                  errorCount++
                                }
                              }
                              
                              if (successCount > 0) {
                                loadDiscountCodes()
                                setSelectedCodesToDelete(new Set())
                                setMessage({ type: 'success', text: `Successfully deleted ${successCount} discount code(s)` })
                              }
                              if (errorCount > 0) {
                                setMessage({ type: 'error', text: `Failed to delete ${errorCount} discount code(s)` })
                              }
                            } catch (error) {
                              setMessage({ type: 'error', text: 'Failed to delete codes' })
                            } finally {
                              setDeletingCodes(false)
                            }
                          }
                        }}
                        disabled={deletingCodes}
                        className="px-3 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingCodes ? 'Deleting...' : `Delete Selected (${selectedCodesToDelete.size})`}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (selectedCodesToDelete.size === discountCodes.length) {
                          setSelectedCodesToDelete(new Set())
                        } else {
                          setSelectedCodesToDelete(new Set(discountCodes.map(c => c.id)))
                        }
                      }}
                      className="px-3 py-1 text-xs rounded bg-brown-light hover:bg-brown text-brown-dark font-semibold transition-colors"
                    >
                      {selectedCodesToDelete.size === discountCodes.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                )}
              </div>
              {loadingDiscountCodes ? (
                <p className="text-brown-dark/70">Loading discount codes...</p>
              ) : discountCodes.length === 0 ? (
                <p className="text-brown-dark/70">No discount codes yet. Generate a first-time user code above.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {discountCodes.map((code) => (
                    <div key={code.id} className={`bg-white rounded-lg p-4 border-2 ${code.isActive ? 'border-green-300' : 'border-gray-300'} ${selectedCodesToDelete.has(code.id) ? 'ring-2 ring-red-400' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedCodesToDelete.has(code.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedCodesToDelete)
                              if (e.target.checked) {
                                newSet.add(code.id)
                              } else {
                                newSet.delete(code.id)
                              }
                              setSelectedCodesToDelete(newSet)
                            }}
                            className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark cursor-pointer"
                          />
                          <div>
                            <span className="text-lg font-bold text-brown-dark">{code.code}</span>
                            {code.isActive ? <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Active</span> : <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">Inactive</span>}
                            {code.isFirstTimeOnly && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">First-Time Only</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/labs/web-services/discount-code?id=${code.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ id: code.id, isActive: !code.isActive }),
                                })
                                if (response.ok) {
                                  loadDiscountCodes()
                                  setMessage({ type: 'success', text: `Code ${!code.isActive ? 'activated' : 'deactivated'} successfully` })
                                }
                              } catch (error) {
                                setMessage({ type: 'error', text: 'Failed to update code' })
                              }
                            }}
                            className="px-3 py-1 text-xs rounded bg-brown-light hover:bg-brown text-brown-dark font-semibold transition-colors"
                          >
                            {code.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete discount code ${code.code}? This cannot be undone.`)) {
                                try {
                                  const response = await fetch(`/api/labs/web-services/discount-code?id=${code.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  })
                                  if (response.ok) {
                                    loadDiscountCodes()
                                    setMessage({ type: 'success', text: 'Discount code deleted successfully' })
                                  }
                                } catch (error) {
                                  setMessage({ type: 'error', text: 'Failed to delete code' })
                                }
                              }
                            }}
                            className="px-3 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700 font-semibold transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div>
                            <span className="text-brown-dark/70">Type: </span>
                            <span className="font-semibold text-brown-dark capitalize">{code.discountType}</span>
                          </div>
                          <div>
                            <span className="text-brown-dark/70">Value: </span>
                            <span className="font-semibold text-brown-dark">{code.discountType === 'percentage' ? `${code.discountValue}%` : `${code.discountValue} KES`}</span>
                          </div>
                          <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                            <span className="text-brown-dark/70 text-xs font-medium">Used for Checkout: </span>
                            <span className="font-bold text-brown-dark text-base">{code.usedCount}</span>
                            <span className="text-brown-dark/70 text-xs"> time{code.usedCount !== 1 ? 's' : ''}</span>
                          </div>
                          {code.isFirstTimeOnly && code.maxUses >= 999999 ? (
                            <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                              <span className="text-green-700 text-xs font-medium">✓ Unlimited first-time users</span>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="text-brown-dark/70">Max Uses: </span>
                                <span className="font-semibold text-brown-dark">{typeof code.maxUses === 'number' ? code.maxUses : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-brown-dark/70">Remaining: </span>
                                <span className="font-semibold text-brown-dark">
                                  {typeof code.maxUses === 'number' && typeof code.usedCount === 'number' 
                                    ? code.maxUses - code.usedCount 
                                    : 'N/A'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {code.expiresAt && (
                          <div className="text-sm">
                            <span className="text-brown-dark/70">Expires: </span>
                            <span className="font-semibold text-brown-dark">{new Date(code.expiresAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      {code.usedBy && code.usedBy.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-brown-light">
                          <span className="text-xs text-brown-dark/70">Used by: </span>
                          <span className="text-xs text-brown-dark font-medium">{code.usedBy.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Duplicate section removed - form is now at the top */}

          {/* Services List - Grid Layout like Frontend */}
          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-brown-dark">
              Services ({data.services.length})
            </h2>
            {data.services.length === 0 ? (
              <p className="text-brown-dark/70">No services yet. Add your first service above.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.services.map((service) => {
                  const getFinalPrice = (s: WebService): number => {
                    let finalPrice = s.price
                    if (s.discountAmount) {
                      finalPrice = s.price - s.discountAmount
                    } else if (s.discount) {
                      finalPrice = s.price * (1 - s.discount / 100)
                    }
                    return Math.max(0, finalPrice)
                  }
                  const finalPrice = getFinalPrice(service)
                  const hasDiscount = service.discount || service.discountAmount

                  return (
                  <div
                    key={service.id}
                    className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-brown-light hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    {service.imageUrl && (
                      <div className="w-full h-48 overflow-hidden bg-brown-light/20">
                        <img
                          src={service.imageUrl}
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-3 flex items-center gap-2 flex-wrap">
                        <span className="inline-block px-3 py-1 bg-brown-light/30 text-brown-dark rounded-full text-xs font-semibold capitalize">
                          {service.category}
                        </span>
                        {service.billingPeriod === 'yearly' && (
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            Yearly
                          </span>
                        )}
                        {service.isRequired && (
                          <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            Required
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-display text-brown-dark mb-2">{service.name}</h3>
                      <div className="mb-4 flex-1">
                        <div 
                          className="text-sm text-brown-dark/70 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: (service.description.replace(/<[^>]*>/g, '').substring(0, 150) + '...') }}
                        />
                      </div>
                      <div className="mb-4">
                        {hasDiscount && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-brown-dark/60 line-through">
                              {service.price.toLocaleString()} KES
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                              {service.discountAmount
                                ? `Save ${service.discountAmount.toLocaleString()} KES`
                                : `${service.discount}% OFF`}
                            </span>
                          </div>
                        )}
                        {service.billingPeriod === 'yearly' && service.setupFee ? (
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm text-brown-dark/70 mb-1">Setup Fee (One-time):</div>
                              <div className="text-xl font-bold text-brown-dark">
                                {service.setupFee.toLocaleString()} KES
                              </div>
                            </div>
                            <div className="border-t border-brown-light pt-2">
                              <div className="text-sm text-brown-dark/70 mb-1">Annual Subscription:</div>
                              <div className="text-xl font-bold text-brown-dark">
                                {finalPrice.toLocaleString()} KES
                              </div>
                              <div className="text-xs text-brown-dark/70 mt-1">
                                per year (KES {Math.round(finalPrice / 12).toLocaleString()}/month)
                              </div>
                            </div>
                            <div className="border-t border-brown-light pt-2">
                              <div className="text-sm text-brown-dark/70 mb-1">Total First Payment:</div>
                              <div className="text-lg font-bold text-brown-dark">
                                {(service.setupFee + finalPrice).toLocaleString()} KES
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-2xl font-bold text-brown-dark">
                              {finalPrice.toLocaleString()} KES
                            </div>
                            {service.billingPeriod === 'yearly' && (
                              <div className="text-xs text-brown-dark/70 mt-1 font-semibold">
                                per year (KES {Math.round(finalPrice / 12).toLocaleString()}/month)
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="border-t border-brown-light pt-4 space-y-3">
                        <div className="grid gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-brown-dark/60 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={service.name}
                              onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)}
                              className="w-full rounded-lg border-2 border-brown-light px-2 py-1 text-xs text-brown-dark focus:border-brown-dark focus:outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-brown-dark/60 mb-1">
                                Category
                              </label>
                              <select
                                value={service.category}
                                onChange={(e) => handleServiceChange(service.id, 'category', e.target.value)}
                                className="w-full rounded-lg border-2 border-brown-light px-2 py-1 text-xs text-brown-dark focus:border-brown-dark focus:outline-none"
                              >
                                <option value="domain">Domain</option>
                                <option value="hosting">Hosting</option>
                                <option value="page">Page</option>
                                <option value="feature">Feature</option>
                                <option value="email">Email</option>
                                <option value="design">Design</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-brown-dark/60 mb-1">
                                Billing
                              </label>
                              <select
                                value={service.billingPeriod || 'one-time'}
                                onChange={(e) => handleServiceChange(service.id, 'billingPeriod', e.target.value as 'one-time' | 'yearly' | 'monthly')}
                                className="w-full rounded-lg border-2 border-brown-light px-2 py-1 text-xs text-brown-dark focus:border-brown-dark focus:outline-none"
                              >
                                <option value="one-time">One-time</option>
                                <option value="yearly">Yearly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-brown-dark/60 mb-1">
                              {service.billingPeriod === 'yearly' ? 'Annual Price (KES)' : service.billingPeriod === 'monthly' ? 'Monthly Price (KES)' : 'Price (KES)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={service.price}
                              onChange={(e) => handleServiceChange(service.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full rounded-lg border-2 border-brown-light px-2 py-1 text-xs text-brown-dark focus:border-brown-dark focus:outline-none"
                            />
                          </div>
                          {service.billingPeriod === 'yearly' && (
                            <div>
                              <label className="block text-xs font-semibold text-brown-dark/60 mb-1">
                                Setup Fee (KES)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={service.setupFee || 0}
                                onChange={(e) => handleServiceChange(service.id, 'setupFee', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-lg border-2 border-brown-light px-2 py-1 text-xs text-brown-dark focus:border-brown-dark focus:outline-none"
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-brown-dark/60 mb-1">
                                Discount %
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={service.discount || ''}
                                onChange={(e) => handleServiceChange(service.id, 'discount', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full rounded-lg border-2 border-brown-light px-2 py-1 text-xs text-brown-dark focus:border-brown-dark focus:outline-none"
                                placeholder="e.g., 10"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-brown-dark/60 mb-1">
                                Discount Amount
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={service.discountAmount || ''}
                                onChange={(e) => handleServiceChange(service.id, 'discountAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="w-full rounded-lg border-2 border-brown-light px-2 py-1 text-xs text-brown-dark focus:border-brown-dark focus:outline-none"
                                placeholder="KES"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={service.isRequired || false}
                                  onChange={(e) => handleServiceChange(service.id, 'isRequired', e.target.checked)}
                                  className="h-3 w-3 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                                />
                                <span className="text-xs text-brown-dark">Required</span>
                              </label>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-brown-light">
                              <button
                                onClick={() => {
                                  setEditingService(service)
                                  setEditServiceData({ ...service })
                                }}
                                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors font-semibold"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleRemoveService(service.id)}
                                className="px-3 py-1.5 text-red-600 hover:text-red-700 text-xs font-semibold border border-red-300 rounded hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={handleSave}
        onLeave={() => {
          setShowDialog(false)
          if (pendingNavigation) {
            router.push(pendingNavigation)
            setPendingNavigation(null)
          }
        }}
        onCancel={() => {
          setShowDialog(false)
          setPendingNavigation(null)
        }}
      />

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-brown-light p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-display text-brown-dark">Edit Service</h2>
              <button
                onClick={() => {
                  setEditingService(null)
                  setEditServiceData({})
                }}
                className="text-brown-dark/70 hover:text-brown-dark text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={editServiceData.name || ''}
                    onChange={(e) => setEditServiceData({ ...editServiceData, name: e.target.value })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Category *
                  </label>
                  <select
                    value={editServiceData.category || 'other'}
                    onChange={(e) => setEditServiceData({ ...editServiceData, category: e.target.value as any })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  >
                    <option value="domain">Domain</option>
                    <option value="hosting">Hosting</option>
                    <option value="page">Page</option>
                    <option value="feature">Feature</option>
                    <option value="email">Email</option>
                    <option value="design">Design</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Billing Period *
                  </label>
                  <select
                    value={editServiceData.billingPeriod || 'one-time'}
                    onChange={(e) => setEditServiceData({ ...editServiceData, billingPeriod: e.target.value as 'one-time' | 'yearly' | 'monthly' })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  >
                    <option value="one-time">One-Time Payment</option>
                    <option value="yearly">Yearly (Annual Subscription)</option>
                    <option value="monthly">Monthly (Monthly Maintenance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    {editServiceData.billingPeriod === 'yearly' ? 'Annual Subscription Price (KES) *' : 'Price (KES) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editServiceData.price || 0}
                    onChange={(e) => setEditServiceData({ ...editServiceData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                  {editServiceData.billingPeriod === 'yearly' && (editServiceData.price || 0) > 0 && (
                    <p className="text-xs text-brown-dark/60 mt-1">
                      Monthly equivalent: KES {Math.round((editServiceData.price || 0) / 12).toLocaleString()}/month
                    </p>
                  )}
                </div>
                {editServiceData.billingPeriod === 'yearly' && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Setup Fee (KES) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editServiceData.setupFee || 0}
                      onChange={(e) => setEditServiceData({ ...editServiceData, setupFee: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">
                      One-time setup fee paid at checkout. Annual subscription will be billed yearly by Paystack.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Discount Percentage (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editServiceData.discount || ''}
                    onChange={(e) => setEditServiceData({ ...editServiceData, discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 10 for 10% off"
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Discount Amount (KES, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editServiceData.discountAmount || ''}
                    onChange={(e) => setEditServiceData({ ...editServiceData, discountAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 1000 for KES 1000 off"
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Description *
                </label>
                <div className="border-2 border-brown-light rounded-xl overflow-hidden" style={{ minHeight: '200px' }}>
                  <ReactQuill
                    theme="snow"
                    value={editServiceData.description || ''}
                    onChange={(value) => setEditServiceData({ ...editServiceData, description: value })}
                    placeholder="Describe what this service includes... (Press Enter for a new line)"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                      ],
                    }}
                    formats={['header', 'bold', 'italic', 'underline', 'link', 'list']}
                  />
                </div>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Use the toolbar to format text, add links, and create lists. Press Enter to create a new line.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Product Image (Optional)
                </label>
                <div className="space-y-3">
                  {editServiceData.imageUrl && (
                    <div className="relative inline-block">
                      <img
                        src={editServiceData.imageUrl}
                        alt="Product preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-brown-light"
                      />
                      <button
                        type="button"
                        onClick={() => setEditServiceData({ ...editServiceData, imageUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          
                          setUploadingImage(true)
                          setUploadingImageId(editingService.id)
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            
                            const response = await fetch('/api/labs/web-services/upload-image', {
                              method: 'POST',
                              body: formData,
                            })
                            
                            const data = await response.json()
                            
                            if (response.ok && data.url) {
                              setEditServiceData({ ...editServiceData, imageUrl: data.url })
                            } else {
                              setMessage({ type: 'error', text: data.error || 'Failed to upload image' })
                            }
                          } catch (error) {
                            console.error('Error uploading image:', error)
                            setMessage({ type: 'error', text: 'Failed to upload image' })
                          } finally {
                            setUploadingImage(false)
                            setUploadingImageId(null)
                          }
                        }}
                        disabled={uploadingImage && uploadingImageId === editingService.id}
                      />
                      <span className="inline-flex items-center justify-center rounded-xl border-2 border-brown-light bg-white px-4 py-2 text-sm font-medium text-brown-dark hover:border-brown-dark transition-colors disabled:opacity-50">
                        {uploadingImage && uploadingImageId === editingService.id ? 'Uploading...' : editServiceData.imageUrl ? 'Change Image' : 'Upload Image'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editServiceData.isRequired || false}
                    onChange={(e) => setEditServiceData({ ...editServiceData, isRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                  />
                  <span className="text-sm text-brown-dark">Required (auto-add if missing)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Must Be Bought Together (optional)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Select other services that must be purchased together with this service. Customers cannot checkout without these services in their cart.
                </p>
                <select
                  multiple
                  value={editServiceData.requiredServices || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setEditServiceData({ ...editServiceData, requiredServices: selected })
                  }}
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none min-h-[100px]"
                  size={5}
                >
                  {data.services
                    .filter(s => s.id !== editingService?.id) // Don't show current service
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple services
                </p>
                {editServiceData.requiredServices && editServiceData.requiredServices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editServiceData.requiredServices.map((serviceId) => {
                      const service = data.services.find(s => s.id === serviceId)
                      return service ? (
                        <span
                          key={serviceId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-brown-light/30 text-brown-dark rounded text-xs"
                        >
                          {service.name}
                          <button
                            type="button"
                            onClick={() => {
                              setEditServiceData({
                                ...editServiceData,
                                requiredServices: (editServiceData.requiredServices || []).filter(id => id !== serviceId)
                              })
                            }}
                            className="text-brown-dark hover:text-brown"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-brown-light">
                <button
                  onClick={async () => {
                    if (!editServiceData.name || !editServiceData.description || !editServiceData.price) {
                      setMessage({ type: 'error', text: 'Please fill in all required fields' })
                      return
                    }

                    setSaving(true)
                    try {
                      // Update the service in the data
                      const updatedServices = data.services.map((s) =>
                        s.id === editingService.id ? { ...editServiceData, id: editingService.id } as WebService : s
                      )

                      const updatedData = {
                        ...data,
                        services: updatedServices,
                      }

                      setData(updatedData)

                      // Save to server
                      const response = await fetch('/api/labs/web-services', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(updatedData),
                      })

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}))
                        throw new Error(errorData.error || 'Failed to save service')
                      }

                      setOriginalData(updatedData)
                      setMessage({ type: 'success', text: 'Service updated successfully!' })
                      setEditingService(null)
                      setEditServiceData({})
                    } catch (error: any) {
                      console.error('Error saving service:', error)
                      setMessage({ type: 'error', text: error.message || 'Failed to save service. Please try again.' })
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingService(null)
                    setEditServiceData({})
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-brown-light p-6 flex items-center justify-between">
              <h2 className="text-2xl font-display text-brown-dark">Edit Service</h2>
              <button
                onClick={() => {
                  setEditingService(null)
                  setEditServiceData({})
                }}
                className="text-brown-dark/70 hover:text-brown-dark text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={editServiceData.name || ''}
                    onChange={(e) => setEditServiceData({ ...editServiceData, name: e.target.value })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Category *
                  </label>
                  <select
                    value={editServiceData.category || 'other'}
                    onChange={(e) => setEditServiceData({ ...editServiceData, category: e.target.value as any })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  >
                    <option value="domain">Domain</option>
                    <option value="hosting">Hosting</option>
                    <option value="page">Page</option>
                    <option value="feature">Feature</option>
                    <option value="email">Email</option>
                    <option value="design">Design</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Billing Period *
                  </label>
                  <select
                    value={editServiceData.billingPeriod || 'one-time'}
                    onChange={(e) => setEditServiceData({ ...editServiceData, billingPeriod: e.target.value as 'one-time' | 'yearly' | 'monthly' })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  >
                    <option value="one-time">One-Time Payment</option>
                    <option value="yearly">Yearly (Annual Subscription)</option>
                    <option value="monthly">Monthly (Monthly Maintenance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    {editServiceData.billingPeriod === 'yearly' ? 'Annual Subscription Price (KES) *' : 'Price (KES) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editServiceData.price || 0}
                    onChange={(e) => setEditServiceData({ ...editServiceData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                  {editServiceData.billingPeriod === 'yearly' && (editServiceData.price || 0) > 0 && (
                    <p className="text-xs text-brown-dark/60 mt-1">
                      Monthly equivalent: KES {Math.round((editServiceData.price || 0) / 12).toLocaleString()}/month
                    </p>
                  )}
                </div>
                {editServiceData.billingPeriod === 'yearly' && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Setup Fee (KES) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editServiceData.setupFee || 0}
                      onChange={(e) => setEditServiceData({ ...editServiceData, setupFee: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">
                      One-time setup fee paid at checkout. Annual subscription will be billed yearly by Paystack.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Discount Percentage (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editServiceData.discount || ''}
                    onChange={(e) => setEditServiceData({ ...editServiceData, discount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 10 for 10% off"
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Discount Amount (KES, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editServiceData.discountAmount || ''}
                    onChange={(e) => setEditServiceData({ ...editServiceData, discountAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 1000 for KES 1000 off"
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Description *
                </label>
                <div className="border-2 border-brown-light rounded-xl overflow-hidden" style={{ minHeight: '200px' }}>
                  <ReactQuill
                    theme="snow"
                    value={editServiceData.description || ''}
                    onChange={(value) => setEditServiceData({ ...editServiceData, description: value })}
                    placeholder="Describe what this service includes... (Press Enter for a new line)"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                      ],
                    }}
                    formats={['header', 'bold', 'italic', 'underline', 'link', 'list']}
                  />
                </div>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Use the toolbar to format text, add links, and create lists. Press Enter to create a new line.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Product Image (Optional)
                </label>
                <div className="space-y-3">
                  {editServiceData.imageUrl && (
                    <div className="relative inline-block">
                      <img
                        src={editServiceData.imageUrl}
                        alt="Product preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-brown-light"
                      />
                      <button
                        type="button"
                        onClick={() => setEditServiceData({ ...editServiceData, imageUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          
                          setUploadingImage(true)
                          setUploadingImageId(editingService.id)
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            
                            const response = await fetch('/api/labs/web-services/upload-image', {
                              method: 'POST',
                              body: formData,
                            })
                            
                            const data = await response.json()
                            
                            if (response.ok && data.url) {
                              setEditServiceData({ ...editServiceData, imageUrl: data.url })
                            } else {
                              setMessage({ type: 'error', text: data.error || 'Failed to upload image' })
                            }
                          } catch (error) {
                            console.error('Error uploading image:', error)
                            setMessage({ type: 'error', text: 'Failed to upload image' })
                          } finally {
                            setUploadingImage(false)
                            setUploadingImageId(null)
                          }
                        }}
                        disabled={uploadingImage && uploadingImageId === editingService.id}
                      />
                      <span className="inline-flex items-center justify-center rounded-xl border-2 border-brown-light bg-white px-4 py-2 text-sm font-medium text-brown-dark hover:border-brown-dark transition-colors disabled:opacity-50">
                        {uploadingImage && uploadingImageId === editingService.id ? 'Uploading...' : editServiceData.imageUrl ? 'Change Image' : 'Upload Image'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editServiceData.isRequired || false}
                    onChange={(e) => setEditServiceData({ ...editServiceData, isRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                  />
                  <span className="text-sm text-brown-dark">Required (auto-add if missing)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Must Be Bought Together (optional)
                </label>
                <p className="text-xs text-brown-dark/60 mb-2">
                  Select other services that must be purchased together with this service. Customers cannot checkout without these services in their cart.
                </p>
                <select
                  multiple
                  value={editServiceData.requiredServices || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setEditServiceData({ ...editServiceData, requiredServices: selected })
                  }}
                  className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none min-h-[100px]"
                  size={5}
                >
                  {data.services
                    .filter(s => s.id !== editingService?.id) // Don't show current service
                    .map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-brown-dark/60 mt-2">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple services
                </p>
                {editServiceData.requiredServices && editServiceData.requiredServices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editServiceData.requiredServices.map((serviceId) => {
                      const service = data.services.find(s => s.id === serviceId)
                      return service ? (
                        <span
                          key={serviceId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-brown-light/30 text-brown-dark rounded text-xs"
                        >
                          {service.name}
                          <button
                            type="button"
                            onClick={() => {
                              setEditServiceData({
                                ...editServiceData,
                                requiredServices: (editServiceData.requiredServices || []).filter(id => id !== serviceId)
                              })
                            }}
                            className="text-brown-dark hover:text-brown"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-brown-light">
                <button
                  onClick={async () => {
                    if (!editServiceData.name || !editServiceData.description || !editServiceData.price) {
                      setMessage({ type: 'error', text: 'Please fill in all required fields' })
                      return
                    }

                    setSaving(true)
                    try {
                      // Update the service in the data
                      setData((prev) => ({
                        ...prev,
                        services: prev.services.map((s) =>
                          s.id === editingService.id ? { ...editServiceData, id: editingService.id } as WebService : s
                        ),
                      }))

                      // Save to server
                      const updatedData = {
                        ...data,
                        services: data.services.map((s) =>
                          s.id === editingService.id ? { ...editServiceData, id: editingService.id } as WebService : s
                        ),
                      }

                      const response = await fetch('/api/labs/web-services', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(updatedData),
                      })

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}))
                        throw new Error(errorData.error || 'Failed to save service')
                      }

                      setOriginalData(updatedData)
                      setMessage({ type: 'success', text: 'Service updated successfully!' })
                      setEditingService(null)
                      setEditServiceData({})
                    } catch (error: any) {
                      console.error('Error saving service:', error)
                      setMessage({ type: 'error', text: error.message || 'Failed to save service. Please try again.' })
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingService(null)
                    setEditServiceData({})
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ql-toolbar {
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          border-color: #E8D5C4;
          background: white;
        }
        .ql-container {
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
          border-color: #E8D5C4;
          background: white;
          font-size: 14px;
        }
        .ql-editor {
          min-height: 150px;
          color: #3E2A20;
        }
        .ql-editor.ql-blank::before {
          color: #999;
          font-style: normal;
        }
        /* Remove ALL blue backgrounds - force white for all buttons */
        .ql-toolbar button,
        .ql-toolbar button.ql-active,
        .ql-toolbar button:hover,
        .ql-toolbar button:focus,
        .ql-toolbar button:active {
          background: white !important;
          background-color: white !important;
          border: none !important;
          box-shadow: none !important;
          color: #7C4B31 !important;
        }
        .ql-toolbar button:hover,
        .ql-toolbar button:focus {
          background: #F3E6DC !important;
          background-color: #F3E6DC !important;
        }
        .ql-toolbar button.ql-active {
          background: #F3E6DC !important;
          background-color: #F3E6DC !important;
        }
        .ql-toolbar .ql-stroke {
          stroke: #7C4B31 !important;
        }
        .ql-toolbar .ql-fill {
          fill: #7C4B31 !important;
        }
        .ql-toolbar button:hover .ql-stroke,
        .ql-toolbar button.ql-active .ql-stroke {
          stroke: #5A3423 !important;
        }
        .ql-toolbar button:hover .ql-fill,
        .ql-toolbar button.ql-active .ql-fill {
          fill: #5A3423 !important;
        }
        .ql-toolbar .ql-picker-label {
          background: white !important;
          border: none !important;
          color: #7C4B31 !important;
        }
        .ql-toolbar .ql-picker-label:hover {
          background: white !important;
          color: #5A3423 !important;
        }
        .ql-toolbar .ql-picker-options {
          background: white !important;
          border: 1px solid #E8D5C4 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          min-width: 150px !important;
          width: auto !important;
        }
        /* Make heading picker dropdown wider */
        .ql-toolbar .ql-picker.ql-header .ql-picker-options {
          min-width: 180px !important;
          width: auto !important;
        }
        .ql-toolbar .ql-picker-item {
          background: white !important;
          background-color: white !important;
          color: #7C4B31 !important;
        }
        .ql-toolbar .ql-picker-item:hover {
          background: #F3E6DC !important;
          background-color: #F3E6DC !important;
          color: #5A3423 !important;
        }
        .ql-toolbar .ql-picker-item.ql-selected {
          background: #F3E6DC !important;
          background-color: #F3E6DC !important;
          color: #5A3423 !important;
        }
        /* Override any Quill default blue styles */
        .ql-toolbar .ql-formats {
          background: transparent !important;
        }
        .ql-toolbar * {
          box-shadow: none !important;
        }
        /* Remove blue from any active states */
        .ql-toolbar button.ql-active:not(:hover) {
          background: white !important;
          background-color: white !important;
        }
        /* Remove any blue from SVG icons */
        .ql-toolbar svg {
          fill: #7C4B31 !important;
        }
        .ql-toolbar button:hover svg,
        .ql-toolbar button.ql-active svg {
          fill: #5A3423 !important;
        }
        /* Ensure no blue appears anywhere in toolbar - target all button classes */
        .ql-toolbar button[class*="ql-"] {
          background: white !important;
          background-color: white !important;
        }
        .ql-toolbar button[class*="ql-"]:hover {
          background: #F3E6DC !important;
          background-color: #F3E6DC !important;
        }
        .ql-toolbar button[class*="ql-"].ql-active {
          background: #F3E6DC !important;
          background-color: #F3E6DC !important;
        }
        /* Remove blue from any pseudo-elements */
        .ql-toolbar button::before,
        .ql-toolbar button::after {
          background: transparent !important;
        }
        /* Force remove any blue background colors */
        .ql-toolbar button[style*="background"] {
          background: white !important;
          background-color: white !important;
        }
      `}</style>
      </div>
    </>
  )
}

