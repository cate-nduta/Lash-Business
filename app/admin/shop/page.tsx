'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  quantity: number
  imageUrl?: string
  images?: string[]
  createdAt?: string
  updatedAt?: string
}

type ShopState = {
  products: Product[]
  orders?: any[]
  transportationFee: number
  shopNotice: string
  pickupLocation: string
  pickupDays: string[]
}

type SelectedImage = {
  file: File
  previewUrl: string
}

type UploadState = {
  images: SelectedImage[]
  name: string
  description: string
  price: string
  quantity: string
  uploading: boolean
  error: string | null
}

const createInitialUploadState = (): UploadState => ({
  images: [],
  name: '',
  description: '',
  price: '',
  quantity: '',
  uploading: false,
  error: null,
})

type ToastMessage = { type: 'success' | 'error'; text: string }

const MAX_PRODUCT_IMAGES = 3

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `product-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export default function AdminShop() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [shop, setShop] = useState<ShopState>({ 
    products: [], 
    transportationFee: 150, 
    shopNotice: '',
    pickupLocation: 'Pick up Mtaani',
    pickupDays: ['Monday', 'Wednesday', 'Friday']
  })
  const [originalShop, setOriginalShop] = useState<ShopState>({ 
    products: [], 
    transportationFee: 150, 
    shopNotice: '',
    pickupLocation: 'Pick up Mtaani',
    pickupDays: ['Monday', 'Wednesday', 'Friday']
  })
  const [uploadState, setUploadState] = useState<UploadState>(createInitialUploadState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products')

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(shop) !== JSON.stringify(originalShop),
    [shop, originalShop],
  )

  const updateUploadState = useCallback(
    (updater: (prev: UploadState) => UploadState) => {
      setUploadState((prev) => updater(prev))
    },
    [],
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

        const shopResponse = await fetch('/api/admin/shop', { credentials: 'include' })
        if (!shopResponse.ok) {
          throw new Error('Failed to load shop products')
        }
        const data = await shopResponse.json()
        if (!isMounted) return

        const products: Product[] = Array.isArray(data?.products)
          ? data.products.map((entry: any) => ({
              id:
                typeof entry?.id === 'string' && entry.id.trim().length > 0
                  ? entry.id.trim()
                  : generateId(),
              name:
                typeof entry?.name === 'string' && entry.name.trim().length > 0
                  ? entry.name.trim()
                  : 'Untitled product',
              description:
                typeof entry?.description === 'string' && entry.description.trim().length > 0
                  ? entry.description.trim()
                  : undefined,
              price: typeof entry?.price === 'number' && entry.price >= 0 ? entry.price : 0,
              quantity: typeof entry?.quantity === 'number' && entry.quantity >= 0 ? Math.floor(entry.quantity) : 0,
              images: (() => {
                const imageArray = Array.isArray(entry?.images)
                  ? entry.images
                      .filter((url: any) => typeof url === 'string' && url.trim().length > 0)
                      .slice(0, MAX_PRODUCT_IMAGES)
                  : []
                if (imageArray.length === 0 && typeof entry?.imageUrl === 'string' && entry.imageUrl.trim().length > 0) {
                  imageArray.push(entry.imageUrl.trim())
                }
                return imageArray
              })(),
              imageUrl: (() => {
                if (Array.isArray(entry?.images) && entry.images.length > 0) {
                  const firstValid = entry.images.find((url: any) => typeof url === 'string' && url.trim().length > 0)
                  if (firstValid) return firstValid.trim()
                }
                if (typeof entry?.imageUrl === 'string' && entry.imageUrl.trim().length > 0) {
                  return entry.imageUrl.trim()
                }
                return undefined
              })(),
              createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : undefined,
              updatedAt: typeof entry?.updatedAt === 'string' ? entry.updatedAt : undefined,
            }))
          : []

        const transportationFee =
          typeof data?.transportationFee === 'number' && data.transportationFee >= 0
            ? data.transportationFee
            : 150
        
        const shopNotice = typeof data?.shopNotice === 'string' ? data.shopNotice : ''
        const pickupLocation = typeof data?.pickupLocation === 'string' && data.pickupLocation.trim().length > 0
          ? data.pickupLocation.trim()
          : 'Pick up Mtaani'
        const pickupDays = Array.isArray(data?.pickupDays) && data.pickupDays.length > 0
          ? data.pickupDays.filter((day: any) => typeof day === 'string' && day.trim().length > 0)
          : ['Monday', 'Wednesday', 'Friday']

        const normalized: ShopState = { 
          products, 
          orders: data?.orders || [],
          transportationFee, 
          shopNotice, 
          pickupLocation,
          pickupDays
        }
        setShop(normalized)
        setOriginalShop(normalized)
      } catch (error) {
        console.error('Error loading shop products:', error)
        if (isMounted) {
          setMessage({ type: 'error', text: 'Failed to load shop products. Please refresh the page.' })
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

  useEffect(() => {
    return () => {
      uploadState.images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [uploadState.images])

  const requestNavigation = (href: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(href)
      setShowDialog(true)
    } else {
      router.push(href)
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
      const response = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(shop),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save shop products')
      }

      setOriginalShop(shop)
      setMessage({ type: 'success', text: 'Shop products updated successfully.' })
      setShowDialog(false)
    } catch (error) {
      console.error('Error saving shop products:', error)
      setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) {
      return
    }

    updateUploadState((prev) => {
      const existingImages = [...prev.images]
      const availableSlots = MAX_PRODUCT_IMAGES - existingImages.length

      if (availableSlots <= 0) {
        return {
          ...prev,
          error: `You already have ${MAX_PRODUCT_IMAGES} images. Remove one to add another.`,
        }
      }

      const newImages: SelectedImage[] = []

      for (const file of files) {
        if (newImages.length >= availableSlots) {
          break
        }

        if (!file.type.startsWith('image/')) {
          newImages.forEach((image) => URL.revokeObjectURL(image.previewUrl))
          return {
            ...prev,
            error: 'Please select image files only (JPG, PNG, or WebP).',
          }
        }

        if (file.size > 5 * 1024 * 1024) {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
          newImages.forEach((image) => URL.revokeObjectURL(image.previewUrl))
          return {
            ...prev,
            error: `File "${file.name}" is ${fileSizeMB} MB. Each image must be under 5 MB.`,
          }
        }

        newImages.push({
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }

      if (newImages.length === 0) {
        return prev
      }

      return {
        ...prev,
        images: [...existingImages, ...newImages],
        error: null,
      }
    })
  }

  const latestImagesRef = useRef<SelectedImage[]>([])

  useEffect(() => {
    latestImagesRef.current = uploadState.images
  }, [uploadState.images])

  useEffect(() => {
    return () => {
      latestImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [])

  const resetUploadState = () => {
    uploadState.images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setUploadState(createInitialUploadState())
  }

  const handleRemoveImage = (index: number) => {
    updateUploadState((prev) => {
      if (index < 0 || index >= prev.images.length) {
        return prev
      }
      const imageToRemove = prev.images[index]
      URL.revokeObjectURL(imageToRemove.previewUrl)
      const nextImages = prev.images.filter((_, i) => i !== index)
      return {
        ...prev,
        images: nextImages,
        error: null,
      }
    })
  }

  const handleUpload = async () => {
    if (uploadState.images.length === 0) {
      console.error('No images in uploadState')
      updateUploadState((prev) => ({ ...prev, error: 'Please select at least one image (max 3).' }))
      return
    }
    const name = uploadState.name.trim()
    if (!name) {
      updateUploadState((prev) => ({ ...prev, error: 'Please enter a product name.' }))
      return
    }

    const price = parseFloat(uploadState.price)
    if (isNaN(price) || price < 0) {
      updateUploadState((prev) => ({ ...prev, error: 'Please enter a valid price.' }))
      return
    }

    const quantity = parseInt(uploadState.quantity, 10)
    if (isNaN(quantity) || quantity < 0) {
      updateUploadState((prev) => ({ ...prev, error: 'Please enter a valid quantity.' }))
      return
    }

    setUploadState((prev) => ({ ...prev, uploading: true, error: null }))
    setMessage(null)

    const previousShopState = shop
    const uploadedImageUrls: string[] = []

    try {
      for (const image of uploadState.images) {
        const formData = new FormData()
        formData.append('file', image.file)

        const response = await fetch('/api/admin/shop/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        const data = await response.json()
        if (!response.ok || !data.success || typeof data.url !== 'string') {
          throw new Error(data.error || 'Failed to upload image')
        }

        uploadedImageUrls.push(data.url)
      }

      const newProduct: Product = {
        id: generateId(),
        name,
        description: uploadState.description.trim() || undefined,
        price,
        quantity,
        imageUrl: uploadedImageUrls[0],
        images: uploadedImageUrls.slice(0, MAX_PRODUCT_IMAGES),
      }

      const updatedShop: ShopState = {
        ...shop,
        products: [...shop.products, newProduct],
      }

      setShop(updatedShop)

      const saveResponse = await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedShop),
      })

      const saveData = await saveResponse.json().catch(() => ({}))

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Failed to publish product')
      }

      setShop(updatedShop)
      setOriginalShop(updatedShop)
      setMessage({
        type: 'success',
        text: 'Product uploaded and is now visible in the shop.',
      })
      resetUploadState()
    } catch (error: any) {
      console.error('Upload error:', error)
      setShop(previousShopState)
      const errorMessage = error?.message || 'Product not added. Please try again.'
      setUploadState((prev) => ({
        ...prev,
        error: errorMessage,
      }))
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setUploadState((prev) => ({ ...prev, uploading: false }))
    }
  }

  const handleReplaceImage = async (productId: string, fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file (JPG, PNG, or WebP).' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB.' })
      return
    }

    setReplacingImageId(productId)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/shop/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()
      if (!response.ok || !data.success || typeof data.url !== 'string') {
        throw new Error(data.error || 'Failed to upload image')
      }

      setShop((prev) => ({
        ...prev,
        products: prev.products.map((product) =>
          product.id === productId
            ? {
                ...product,
                imageUrl: data.url,
                images: (() => {
                  const existing = Array.isArray(product.images) ? [...product.images] : []
                  if (existing.length > 0) {
                    existing[0] = data.url
                  } else {
                    existing.push(data.url)
                  }
                  return existing.slice(0, MAX_PRODUCT_IMAGES)
                })(),
              }
            : product,
        ),
      }))
      setMessage({ type: 'success', text: 'Image replaced. Remember to save your changes.' })
    } catch (error: any) {
      console.error('Failed to replace image:', error)
      setMessage({ type: 'error', text: error?.message || 'Failed to replace image.' })
    } finally {
      setReplacingImageId(null)
    }
  }

  const handleProductChange = (productId: string, field: keyof Product, value: string | number) => {
    setShop((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.id === productId
          ? {
              ...product,
              [field]: value,
            }
          : product,
      ),
    }))
  }

  const handleRemoveProduct = (productId: string) => {
    setShop((prev) => ({
      ...prev,
      products: prev.products.filter((product) => product.id !== productId),
    }))
  }

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    setShop((prev) => {
      const list = [...prev.products]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= list.length) {
        return prev
      }
      ;[list[index], list[targetIndex]] = [list[targetIndex], list[index]]
      return {
        ...prev,
        products: list,
      }
    })
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
    <div className="min-h-screen bg-baby-pink-light py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {hasUnsavedChanges ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
              <span>⚠️ Unsaved changes</span>
              <span className="text-xs font-normal text-orange-500">Save to publish updates</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-display text-brown-dark mb-2">Shop Management</h1>
              <p className="text-brown-dark/80 max-w-3xl">
                Upload and manage your lash products. Set prices and quantities. When customers purchase products, the quantity will automatically decrease.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-brown-light mb-6">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-3 font-semibold text-sm transition-all ${
                  activeTab === 'products'
                    ? 'text-brown-dark border-b-2 border-brown-dark'
                    : 'text-brown-dark/60 hover:text-brown-dark'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                  activeTab === 'orders'
                    ? 'text-brown-dark border-b-2 border-brown-dark'
                    : 'text-brown-dark/60 hover:text-brown-dark'
                }`}
              >
                Orders
                {shop.orders && shop.orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'picked_up').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {shop.orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'picked_up').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {activeTab === 'orders' ? (
            /* Orders Tab */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-brown-dark">Orders</h2>
                {shop.orders && shop.orders.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to clear ALL orders? This action cannot be undone.')) {
                        return
                      }
                      try {
                        const response = await fetch('/api/admin/shop/clear-orders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                        })
                        if (!response.ok) {
                          throw new Error('Failed to clear orders')
                        }
                        const data = await response.json()
                        setMessage({ type: 'success', text: data.message || 'All orders cleared successfully.' })
                        // Reload shop data
                        const shopResponse = await fetch('/api/admin/shop', {
                          credentials: 'include',
                        })
                        if (shopResponse.ok) {
                          const shopData = await shopResponse.json()
                          setShop((prev) => ({ ...prev, orders: [] }))
                          setOriginalShop((prev) => ({ ...prev, orders: [] }))
                        }
                      } catch (error) {
                        console.error('Error clearing orders:', error)
                        setMessage({ type: 'error', text: 'Failed to clear orders. Please try again.' })
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                  >
                    Clear All Orders
                  </button>
                )}
              </div>
              {shop.orders && shop.orders.length > 0 ? (
                <div className="space-y-4">
                  {shop.orders
                    .sort((a: any, b: any) => {
                      // Sort by status priority, then by date
                      const statusOrder: Record<string, number> = {
                        pending: 0,
                        'to_be_dropped': 1,
                        ready: 2,
                        dropped: 3,
                        picked_up: 4,
                        delivered: 5,
                      }
                      const statusDiff = (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999)
                      if (statusDiff !== 0) return statusDiff
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    })
                    .map((order: any) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-lg shadow-lg border-2 border-brown-light p-6"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-xl font-semibold text-brown-dark mb-1">{order.productName}</h3>
                                <p className="text-sm text-brown-dark/70">
                                  Order ID: <strong>{order.id}</strong> • {new Date(order.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                  order.status === 'delivered' || order.status === 'picked_up'
                                    ? 'bg-green-100 text-green-700'
                                    : order.status === 'dropped'
                                    ? 'bg-blue-100 text-blue-700'
                                    : order.status === 'ready'
                                    ? 'bg-purple-100 text-purple-700'
                                    : order.status === 'to_be_dropped'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {order.status === 'to_be_dropped'
                                  ? 'To be Dropped'
                                  : order.status === 'picked_up'
                                  ? 'Picked Up'
                                  : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div className="bg-brown-light/20 rounded-lg p-4">
                                <h4 className="font-semibold text-brown-dark mb-2 text-sm">Customer Information</h4>
                                {order.email && (
                                  <p className="text-sm text-brown-dark/70 mb-1">
                                    <strong>Email:</strong> {order.email}
                                  </p>
                                )}
                                {order.phoneNumber && (
                                  <p className="text-sm text-brown-dark/70 mb-1">
                                    <strong>Phone:</strong> {order.phoneNumber}
                                  </p>
                                )}
                              </div>

                              <div className="bg-brown-light/20 rounded-lg p-4">
                                <h4 className="font-semibold text-brown-dark mb-2 text-sm">Order Details</h4>
                                <p className="text-sm text-brown-dark/70 mb-1">
                                  <strong>Product:</strong> {order.productName}
                                </p>
                                <p className="text-sm text-brown-dark/70 mb-1">
                                  <strong>Subtotal:</strong> {order.subtotal?.toLocaleString() || order.amount.toLocaleString()} KES
                                </p>
                                {order.transportationFee > 0 && (
                                  <p className="text-sm text-brown-dark/70 mb-1">
                                    <strong>Pickup Fee:</strong> {order.transportationFee.toLocaleString()} KES
                                  </p>
                                )}
                                <p className="text-sm text-brown-dark/70 font-semibold">
                                  <strong>Total:</strong> {order.amount.toLocaleString()} KES
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 bg-brown-light/20 rounded-lg p-4">
                              <h4 className="font-semibold text-brown-dark mb-2 text-sm">Delivery Information</h4>
                              <p className="text-sm text-brown-dark/70 mb-2">
                                <strong>Option:</strong>{' '}
                                {order.deliveryOption === 'pickup' ? (
                                  <span className="font-semibold">Pick up in Town</span>
                                ) : (
                                  <span className="font-semibold">Deliver to Home</span>
                                )}
                              </p>
                              {order.deliveryOption === 'pickup' && (
                                <p className="text-sm text-brown-dark/70">
                                  Customer will collect from the pickup location. Status updates when you mark as dropped.
                                </p>
                              )}
                              {order.deliveryOption === 'delivery' && (
                                <>
                                  <p className="text-sm text-brown-dark/70 mb-1">
                                    <strong>Delivery Address:</strong>
                                  </p>
                                  <p className="text-sm text-brown-dark/80 bg-white p-2 rounded border border-brown-light">
                                    {order.deliveryAddress || 'Not provided'}
                                  </p>
                                </>
                              )}
                            </div>

                            {order.readyForPickupAt && (
                              <p className="text-xs text-brown-dark/60 mt-3">
                                Ready since: {new Date(order.readyForPickupAt).toLocaleString()}
                              </p>
                            )}
                            {order.droppedAt && (
                              <p className="text-xs text-brown-dark/60 mt-1">
                                Dropped at: {new Date(order.droppedAt).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 md:min-w-[180px]">
                            {order.status === 'pending' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/shop/orders/ready', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ orderId: order.id }),
                                    })

                                    const data = await response.json()

                                    if (!response.ok) {
                                      setMessage({ type: 'error', text: data.error || 'Failed to mark order as ready' })
                                      return
                                    }

                                    setMessage({ type: 'success', text: data.message || 'Order marked as ready' })
                                    // Reload shop data
                                    const shopResponse = await fetch('/api/admin/shop', { credentials: 'include' })
                                    const shopData = await shopResponse.json()
                                    setShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                    setOriginalShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                  } catch (error) {
                                    console.error('Error marking order as ready:', error)
                                    setMessage({ type: 'error', text: 'Failed to mark order as ready' })
                                  }
                                }}
                                className="w-full px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors text-sm font-semibold"
                              >
                                Mark as Ready
                              </button>
                            )}

                            {order.status === 'ready' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/shop/orders/status', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ orderId: order.id, status: 'to_be_dropped' }),
                                    })

                                    const data = await response.json()

                                    if (!response.ok) {
                                      setMessage({ type: 'error', text: data.error || 'Failed to update order status' })
                                      return
                                    }

                                    setMessage({ type: 'success', text: 'Order marked as "To be dropped"' })
                                    const shopResponse = await fetch('/api/admin/shop', { credentials: 'include' })
                                    const shopData = await shopResponse.json()
                                    setShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                    setOriginalShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                  } catch (error) {
                                    console.error('Error updating order status:', error)
                                    setMessage({ type: 'error', text: 'Failed to update order status' })
                                  }
                                }}
                                className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
                              >
                                Mark as "To be Dropped"
                              </button>
                            )}

                            {order.status === 'to_be_dropped' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/shop/orders/status', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ orderId: order.id, status: 'dropped' }),
                                    })

                                    const data = await response.json()

                                    if (!response.ok) {
                                      setMessage({ type: 'error', text: data.error || 'Failed to update order status' })
                                      return
                                    }

                                    setMessage({ type: 'success', text: 'Order marked as "Dropped"' })
                                    const shopResponse = await fetch('/api/admin/shop', { credentials: 'include' })
                                    const shopData = await shopResponse.json()
                                    setShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                    setOriginalShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                  } catch (error) {
                                    console.error('Error updating order status:', error)
                                    setMessage({ type: 'error', text: 'Failed to update order status' })
                                  }
                                }}
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                              >
                                Mark as "Dropped"
                              </button>
                            )}

                            {order.status === 'dropped' && order.deliveryOption === 'pickup' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/shop/orders/status', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ orderId: order.id, status: 'picked_up' }),
                                    })

                                    const data = await response.json()

                                    if (!response.ok) {
                                      setMessage({ type: 'error', text: data.error || 'Failed to update order status' })
                                      return
                                    }

                                    setMessage({ type: 'success', text: 'Order marked as "Picked Up"' })
                                    const shopResponse = await fetch('/api/admin/shop', { credentials: 'include' })
                                    const shopData = await shopResponse.json()
                                    setShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                    setOriginalShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                  } catch (error) {
                                    console.error('Error updating order status:', error)
                                    setMessage({ type: 'error', text: 'Failed to update order status' })
                                  }
                                }}
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
                              >
                                Mark as "Picked Up"
                              </button>
                            )}

                            {order.status === 'dropped' && order.deliveryOption === 'delivery' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/shop/orders/status', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({ orderId: order.id, status: 'delivered' }),
                                    })

                                    const data = await response.json()

                                    if (!response.ok) {
                                      setMessage({ type: 'error', text: data.error || 'Failed to update order status' })
                                      return
                                    }

                                    setMessage({ type: 'success', text: 'Order marked as "Delivered"' })
                                    const shopResponse = await fetch('/api/admin/shop', { credentials: 'include' })
                                    const shopData = await shopResponse.json()
                                    setShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                    setOriginalShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                                  } catch (error) {
                                    console.error('Error updating order status:', error)
                                    setMessage({ type: 'error', text: 'Failed to update order status' })
                                  }
                                }}
                                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
                              >
                                Mark as "Delivered"
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg border-2 border-brown-light p-12 text-center">
                  <p className="text-brown-dark/70 text-lg">No orders yet</p>
                  <p className="text-brown-dark/50 text-sm mt-2">Orders will appear here when customers make purchases</p>
                </div>
              )}
            </div>
          ) : (
            /* Products Tab */
            <div className="space-y-10">

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            {/* Shop Settings */}
            <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70 p-6 space-y-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-brown-dark">Shop Settings</h2>
                <p className="text-sm text-brown-dark/70">
                  Keep customers informed about pickup logistics and availability.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Shop Notice</label>
                  <p className="text-xs text-brown-dark/60 mb-2">
                    Display a short announcement (drop-off dates, pickup info, etc.). Appears under the shop heading.
                  </p>
                  <textarea
                    value={shop.shopNotice}
                    onChange={(e) =>
                      setShop((prev) => ({
                        ...prev,
                        shopNotice: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="e.g., Products drop in town on Fridays. Pickup available Monday–Saturday..."
                    className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                  <p className="text-xs text-brown-dark/50 mt-1">Leave empty to hide the notice.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-brown-dark">Pickup Location Name</label>
                    <p className="text-xs text-brown-dark/60">
                      e.g., “Pick up Mtaani”, “ABC Store - Town Center”
                    </p>
                    <input
                      type="text"
                      value={shop.pickupLocation}
                      onChange={(e) =>
                        setShop((prev) => ({
                          ...prev,
                          pickupLocation: e.target.value.trim() || 'Pick up Mtaani',
                        }))
                      }
                      placeholder="Pick up Mtaani"
                      className="w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-brown-dark">Transportation Fee (KES)</label>
                    <p className="text-xs text-brown-dark/60">Fee charged for delivery to the pickup location.</p>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={shop.transportationFee}
                        onChange={(e) =>
                          setShop((prev) => ({
                            ...prev,
                            transportationFee: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-32 rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      />
                      <span className="text-sm text-brown-dark/70">
                        Current: {shop.transportationFee.toLocaleString()} KES
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-brown-dark">Pickup Days</label>
                    <span className="text-xs text-brown-dark/60">Choose exactly 3 days</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <label
                        key={day}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                          shop.pickupDays.includes(day)
                            ? 'border-brown-dark bg-brown-light/30 text-brown-dark'
                            : 'border-brown-light text-brown-dark/70 hover:border-brown'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={shop.pickupDays.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (shop.pickupDays.length < 3) {
                                setShop((prev) => ({
                                  ...prev,
                                  pickupDays: [...prev.pickupDays, day],
                                }))
                              }
                            } else {
                              setShop((prev) => ({
                                ...prev,
                                pickupDays: prev.pickupDays.filter((d) => d !== day),
                              }))
                            }
                          }}
                          className="h-4 w-4 rounded border-brown-light text-brown-dark focus:ring-brown-dark"
                          disabled={!shop.pickupDays.includes(day) && shop.pickupDays.length >= 3}
                        />
                        <span>{day}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-brown-dark/50 mt-2">
                    Selected: {shop.pickupDays.length > 0 ? shop.pickupDays.join(', ') : 'None'}
                  </p>
                </div>
              </div>
            </section>

            {/* Orders Management */}
            <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/80 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-brown-dark">Orders Overview</h2>
                  <p className="text-sm text-brown-dark/70">
                    Track pending pickups and deliveries from one spot.
                  </p>
                </div>
                {shop.orders && (
                  <span className="rounded-full bg-brown-light/40 px-3 py-1 text-xs font-semibold text-brown-dark">
                    {shop.orders.length} total
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {shop.orders && shop.orders.length > 0 ? (
                  shop.orders
                    .filter((order: any) => order.status !== 'picked_up')
                    .map((order: any) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-brown-light bg-brown-light/20 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="font-semibold text-brown-dark">{order.productName}</h3>
                            <p className="text-sm text-brown-dark/70">
                              Order {order.id} • {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                            {order.email && (
                              <p className="text-sm text-brown-dark/70">Email: {order.email}</p>
                            )}
                            {order.phoneNumber && (
                              <p className="text-sm text-brown-dark/70">Phone: {order.phoneNumber}</p>
                            )}
                            <p className="text-sm text-brown-dark/70">
                              Total: {order.amount.toLocaleString()} KES
                              {order.deliveryOption === 'pickup' &&
                                ` (includes ${order.transportationFee || 0} KES pickup fee)`}
                              {order.deliveryOption === 'delivery' && ` (home delivery)`}
                            </p>
                            {order.deliveryOption === 'delivery' && order.deliveryAddress && (
                              <p className="text-sm text-brown-dark/70 mt-1">
                                <strong>Delivery Address:</strong> {order.deliveryAddress}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              order.status === 'ready'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {order.status === 'ready' ? 'Ready' : 'Pending'}
                          </span>
                        </div>

                        {order.status === 'pending' && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/admin/shop/orders/ready', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ orderId: order.id }),
                                })

                                const data = await response.json()

                                if (!response.ok) {
                                  alert(data.error || 'Failed to mark order as ready')
                                  return
                                }

                                setMessage({ type: 'success', text: data.message || 'Order marked as ready' })
                                const shopResponse = await fetch('/api/admin/shop', { credentials: 'include' })
                                const shopData = await shopResponse.json()
                                setShop((prev) => ({ ...prev, orders: shopData.orders || [] }))
                              } catch (error) {
                                console.error('Error marking order as ready:', error)
                                setMessage({ type: 'error', text: 'Failed to mark order as ready' })
                              }
                            }}
                            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brown-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brown"
                          >
                            Mark as Ready for Pickup
                          </button>
                        )}

                        {order.status === 'ready' && order.readyForPickupAt && (
                          <p className="text-xs text-brown-dark/60 mt-2">
                            Ready since: {new Date(order.readyForPickupAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="rounded-xl border border-dashed border-brown-light px-4 py-8 text-center text-sm text-brown-dark/70">
                    No orders yet. New purchases will appear here automatically.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Products Management */}
          <section className="border border-brown-light/50 rounded-2xl shadow-soft bg-white/70">
            <div className="border-b border-brown-light/40 px-6 py-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-brown-dark">Products</h2>
                <p className="text-sm text-brown-dark/70 max-w-3xl">
                  Upload products with photos, descriptions, pricing, and stock levels. Remember to save when finished.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brown-light px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brown-dark/80">
                {shop.products.length} product{shop.products.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div className="rounded-2xl border border-dashed border-brown-light bg-brown-light/20 p-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-brown-dark">Add a new product</h3>
                  <p className="text-sm text-brown-dark/60">
                    Upload an image, fill out the details, then click “Upload & Add”. Don’t forget to save changes at the top when you’re done.
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-brown-dark">
                      Product images (up to 3)
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => handleFileSelect(event.target.files)}
                        className="mt-2 w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      />
                    </label>
                    {uploadState.images.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-brown-dark/70">
                          Selected {uploadState.images.length} image{uploadState.images.length === 1 ? '' : 's'} •{' '}
                          {uploadState.images.length === MAX_PRODUCT_IMAGES ? 'Maximum reached' : `${MAX_PRODUCT_IMAGES - uploadState.images.length} spot(s) left`}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {uploadState.images.map((image, index) => (
                            <div
                              key={image.previewUrl}
                              className="relative aspect-square overflow-hidden rounded-lg border border-brown-light bg-white"
                            >
                              <img src={image.previewUrl} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 rounded-full bg-white/90 px-2 text-[10px] font-semibold text-red-600 shadow"
                                aria-label={`Remove image ${index + 1}`}
                              >
                                ✕
                              </button>
                              <span className="absolute bottom-1 left-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-brown-dark">
                                #{index + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="block text-sm font-medium text-brown-dark">
                      Product name *
                      <input
                        type="text"
                        value={uploadState.name}
                        onChange={(event) => updateUploadState((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Lash Bath Kit"
                        className="mt-2 w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-medium text-brown-dark">
                      Description (optional)
                      <textarea
                        value={uploadState.description}
                        onChange={(event) =>
                          updateUploadState((prev) => ({ ...prev, description: event.target.value }))
                        }
                        rows={3}
                        className="mt-2 w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        placeholder="Product description..."
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-brown-dark">
                        Price (KES) *
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={uploadState.price}
                          onChange={(event) =>
                            updateUploadState((prev) => ({ ...prev, price: event.target.value }))
                          }
                          placeholder="0.00"
                          className="mt-2 w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </label>
                      <label className="block text-sm font-medium text-brown-dark">
                        Quantity *
                        <input
                          type="number"
                          min="0"
                          value={uploadState.quantity}
                          onChange={(event) =>
                            updateUploadState((prev) => ({ ...prev, quantity: event.target.value }))
                          }
                          placeholder="0"
                          className="mt-2 w-full rounded-xl border-2 border-brown-light bg-white px-4 py-3 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploadState.uploading}
                        className="inline-flex items-center justify-center rounded-xl bg-brown-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brown disabled:opacity-50"
                      >
                        {uploadState.uploading ? 'Uploading…' : 'Upload & Add'}
                      </button>
                      <button
                        type="button"
                        onClick={resetUploadState}
                        className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-brown-dark/70 hover:border-brown-light"
                      >
                        Clear
                      </button>
                    </div>
                    {uploadState.error && (
                      <p className="text-sm text-red-600 font-medium">{uploadState.error}</p>
                    )}
                  </div>
                </div>
              </div>

              {shop.products.length === 0 ? (
                <div className="rounded-xl border border-brown-light bg-brown-light/20 px-5 py-6 text-sm text-brown-dark/80">
                  No products yet. Add your first product to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {shop.products.map((product, index) => {
                    const productImages =
                      Array.isArray(product.images) && product.images.length > 0
                        ? product.images
                        : product.imageUrl
                        ? [product.imageUrl]
                        : []

                    return (
                      <div key={product.id} className="rounded-2xl border-2 border-brown-light bg-white shadow-sm">
                        <div className="relative w-full aspect-square overflow-hidden rounded-t-2xl bg-brown-light/20">
                          {productImages.length > 0 ? (
                            <img
                              src={productImages[0]}
                              alt={`Product: ${product.name}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-brown-dark/60">
                              No image available
                            </div>
                          )}
                          <label className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brown-dark shadow cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleReplaceImage(product.id, event.target.files)}
                              className="hidden"
                            />
                            <span className="text-[11px] uppercase tracking-wide">
                              {replacingImageId === product.id ? 'Updating...' : 'Replace Cover'}
                            </span>
                          </label>
                        </div>
                        {productImages.length > 1 && (
                          <div className="px-5 pt-3">
                            <div className="grid grid-cols-3 gap-2">
                              {productImages.slice(1, MAX_PRODUCT_IMAGES).map((imageUrl, thumbIndex) => (
                                <div
                                  key={`${product.id}-thumb-${thumbIndex}`}
                                  className="aspect-square overflow-hidden rounded-lg border border-brown-light bg-brown-light/10"
                                >
                                  <img src={imageUrl} alt={`${product.name} alt view ${thumbIndex + 2}`} className="h-full w-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-3 px-5 py-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-brown-dark/60">
                            Product name
                          </label>
                          <input
                            type="text"
                            value={product.name}
                            onChange={(event) => handleProductChange(product.id, 'name', event.target.value)}
                            className="mt-1 w-full rounded-lg border-2 border-brown-light px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-brown-dark/60">
                            Description (optional)
                          </label>
                          <textarea
                            value={product.description || ''}
                            onChange={(event) => handleProductChange(product.id, 'description', event.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded-lg border-2 border-brown-light px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                            placeholder="Product description..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-brown-dark/60">
                              Price (KES)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={product.price}
                              onChange={(event) =>
                                handleProductChange(product.id, 'price', parseFloat(event.target.value) || 0)
                              }
                              className="mt-1 w-full rounded-lg border-2 border-brown-light px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-brown-dark/60">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={product.quantity}
                              onChange={(event) =>
                                handleProductChange(
                                  product.id,
                                  'quantity',
                                  Math.floor(parseFloat(event.target.value) || 0),
                                )
                              }
                              className="mt-1 w-full rounded-lg border-2 border-brown-light px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                            />
                            {product.quantity === 0 && (
                              <p className="mt-1 text-xs text-red-600 font-medium">Out of stock</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(index, 'up')}
                              className="inline-flex items-center gap-1 rounded-full border border-brown-light px-4 py-1.5 text-sm font-semibold text-brown-dark hover:border-brown-dark disabled:opacity-40"
                              disabled={index === 0}
                            >
                              ↑ Move up
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(index, 'down')}
                              className="inline-flex items-center gap-1 rounded-full border border-brown-light px-4 py-1.5 text-sm font-semibold text-brown-dark hover:border-brown-dark disabled:opacity-40"
                              disabled={index === shop.products.length - 1}
                            >
                              ↓ Move down
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(product.id)}
                            className="rounded-full border border-red-100 px-3 py-1.5 text-sm font-semibold text-red-600 hover:border-red-400 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showDialog}
        onSave={handleDialogSave}
        onLeave={handleDialogLeave}
        onCancel={handleDialogCancel}
      />
    </div>
  )
}

