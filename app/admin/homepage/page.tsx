'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog'
import ImageCrop from '@/components/ImageCrop'

interface HomepageData {
  hero: {
    title: string
    subtitle: string
    highlight?: string
    badge?: string
    mobileServiceNote?: string
    buttons?: Array<{
      text: string
      url: string
      primary?: boolean
      external?: boolean
    }>
  }
  intro: {
    title: string
    paragraph1: string
    paragraph2: string
    features: string
  }
  features: Array<{
    title: string
    description: string
  }>
  meetArtist?: {
    enabled: boolean
    title: string
    name: string
    bio: string
    photo?: string
    credentials?: string
  }
  ourStudio?: {
    enabled: boolean
    title: string
    description: string
    images: string[]
  }
  tsubokiMassage?: {
    enabled?: boolean
    badge?: string
    title?: string
    subtitle?: string
    description?: string
    benefits?: string[]
    whyItMatters?: string
    backgroundImage?: string
  }
  countdownBanner?: {
    enabled?: boolean
    eyebrow?: string
    title?: string
    message?: string
    eventDate?: string
    buttonText?: string
    buttonUrl?: string
  }
  giftCardSection?: {
    enabled?: boolean
  }
  modelSignup?: {
    enabled?: boolean
    title?: string
    description?: string
    buttonText?: string
  }
  faqSection?: {
    enabled?: boolean
    icon?: string
    title?: string
    description?: string
    buttonText?: string
    buttonUrl?: string
  }
  cta: {
    enabled?: boolean
    badge?: string
    title: string
    description: string
    buttonText: string
    buttonUrl?: string
    secondaryButtonText?: string
    secondaryButtonUrl?: string
  }
  showFridayBooking?: boolean
  fridayBookingMessage?: string
}

interface DiscountsData {
  firstTimeClientDiscount: {
    enabled: boolean
    percentage: number
    bannerEnabled: 'auto' | 'enabled' | 'disabled'
    bannerMessage: string
  }
  returningClientDiscount: {
    enabled: boolean
    tier30Percentage: number
    tier45Percentage: number
  }
  depositPercentage: number
}

const authorizedFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, { credentials: 'include', ...init })

const createDefaultDiscounts = (): DiscountsData => ({
  firstTimeClientDiscount: { enabled: true, percentage: 0, bannerEnabled: 'auto', bannerMessage: '' },
  returningClientDiscount: { enabled: true, tier30Percentage: 0, tier45Percentage: 0 },
  depositPercentage: 0,
})

const createDefaultMassage = () => ({
  enabled: true,
  badge: 'Complimentary Ritual',
  title: 'Complimentary Japanese Facial Massage',
  subtitle: 'Included with every lash service',
  description: '',
  benefits: [] as string[],
  whyItMatters: '',
  backgroundImage: '',
})

type MassageSettings = ReturnType<typeof createDefaultMassage>

const createDefaultCountdownBanner = () => ({
  enabled: false,
  eyebrow: 'Limited Time',
  title: 'New drop launches soon',
  message: 'Secure your appointment before the slots disappear.',
  eventDate: '',
  buttonText: 'Book Now',
  buttonUrl: '',
})

export default function AdminHomepage() {
  const [homepage, setHomepage] = useState<HomepageData>({
    hero: { title: '', subtitle: '', highlight: '', badge: '', buttons: [] },
    intro: { title: '', paragraph1: '', paragraph2: '', features: '' },
    features: [],
    meetArtist: {
      enabled: false,
      title: 'Meet Your Lash Artist',
      name: '',
      bio: '',
      photo: '',
      credentials: '',
    },
    ourStudio: {
      enabled: false,
      title: 'Our Studio',
      description: '',
      images: [],
    },
    tsubokiMassage: createDefaultMassage(),
    countdownBanner: createDefaultCountdownBanner(),
    giftCardSection: { enabled: true },
    modelSignup: { enabled: false, title: 'Model Casting Call', description: 'Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation.', buttonText: 'Apply Now' },
    cta: { title: '', description: '', buttonText: '' },
    showFridayBooking: true,
    fridayBookingMessage: 'Friday Night Bookings Available',
  })
  const [originalHomepage, setOriginalHomepage] = useState<HomepageData>({
    hero: { title: '', subtitle: '', highlight: '', badge: '' },
    intro: { title: '', paragraph1: '', paragraph2: '', features: '' },
    features: [],
    meetArtist: {
      enabled: false,
      title: 'Meet Your Lash Artist',
      name: '',
      bio: '',
      photo: '',
      credentials: '',
    },
    ourStudio: {
      enabled: false,
      title: 'Our Studio',
      description: '',
      images: [],
    },
    tsubokiMassage: createDefaultMassage(),
    countdownBanner: createDefaultCountdownBanner(),
    giftCardSection: { enabled: true },
    modelSignup: { enabled: false, title: 'Model Casting Call', description: 'Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation.', buttonText: 'Apply Now' },
    cta: { title: '', description: '', buttonText: '' },
    showFridayBooking: true,
    fridayBookingMessage: 'Friday Night Bookings Available',
  })
  const [discounts, setDiscounts] = useState<DiscountsData>(() => createDefaultDiscounts())
  const [originalDiscounts, setOriginalDiscounts] = useState<DiscountsData>(() => createDefaultDiscounts())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({})
  const [uploadingArtistPhoto, setUploadingArtistPhoto] = useState(false)
  const [uploadingMassageBackground, setUploadingMassageBackground] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const router = useRouter()
  const updateMassage = (partial: Partial<MassageSettings>) => {
    setHomepage((prev) => {
      const current = prev.tsubokiMassage ?? createDefaultMassage()
      return { ...prev, tsubokiMassage: { ...current, ...partial } }
    })
  }
  const updateCountdownBanner = (partial: Partial<ReturnType<typeof createDefaultCountdownBanner>>) => {
    setHomepage((prev) => {
      const current = prev.countdownBanner ?? createDefaultCountdownBanner()
      return { ...prev, countdownBanner: { ...current, ...partial } }
    })
  }
  const hasUnsavedChanges =
    JSON.stringify(homepage) !== JSON.stringify(originalHomepage) ||
    JSON.stringify(discounts) !== JSON.stringify(originalDiscounts)

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
        loadData()
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

  const loadData = async () => {
    try {
      const [homepageResponse, discountsResponse] = await Promise.all([
        authorizedFetch('/api/admin/homepage'),
        authorizedFetch('/api/admin/discounts'),
      ])

      if (homepageResponse.ok) {
        const data = await homepageResponse.json()
        const normalizedHero = {
          ...data.hero,
          highlight: data.hero?.highlight ?? data.hero?.mobileServiceNote ?? '',
          badge: data.hero?.badge ?? data.hero?.mobileServiceNote ?? '',
          buttons: Array.isArray(data.hero?.buttons) ? data.hero.buttons : [],
        }
        const normalizedHomepage: HomepageData = {
          ...data,
          hero: normalizedHero,
          meetArtist: data.meetArtist || {
            enabled: false,
            title: 'Meet Your Lash Artist',
            name: '',
            bio: '',
            photo: '',
            credentials: '',
          },
          ourStudio: data.ourStudio || {
            enabled: false,
            title: 'Our Studio',
            description: '',
            images: [],
          },
          tsubokiMassage: {
            enabled: data?.tsubokiMassage?.enabled !== false,
            badge: data?.tsubokiMassage?.badge ?? 'Complimentary Ritual',
            title: data?.tsubokiMassage?.title ?? 'Complimentary Japanese Facial Massage',
            subtitle: data?.tsubokiMassage?.subtitle ?? 'Included with every lash service',
            description: data?.tsubokiMassage?.description ?? '',
            benefits: Array.isArray(data?.tsubokiMassage?.benefits) ? data.tsubokiMassage.benefits : [],
            whyItMatters: data?.tsubokiMassage?.whyItMatters ?? '',
            backgroundImage: data?.tsubokiMassage?.backgroundImage ?? '',
          },
          countdownBanner: {
            ...createDefaultCountdownBanner(),
            ...(data?.countdownBanner || {}),
            enabled: data?.countdownBanner?.enabled ?? false,
          },
          giftCardSection: {
            enabled: data.giftCardSection?.enabled !== false,
          },
          modelSignup: {
            enabled: data.modelSignup?.enabled ?? false,
            title: data.modelSignup?.title ?? 'Model Casting Call',
            description: data.modelSignup?.description ?? 'Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation.',
            buttonText: data.modelSignup?.buttonText ?? 'Apply Now',
          },
          faqSection: {
            enabled: data.faqSection?.enabled !== false,
            icon: data.faqSection?.icon ?? '💭',
            title: data.faqSection?.title ?? 'Frequently Asked Questions',
            description: data.faqSection?.description ?? "Have questions? We've got answers. Explore our FAQ to learn more about lash extensions, appointments, and everything in between.",
            buttonText: data.faqSection?.buttonText ?? 'View FAQs',
            buttonUrl: data.faqSection?.buttonUrl ?? '/policies#faq',
          },
          cta: {
            enabled: data.cta?.enabled !== false,
            badge: data.cta?.badge ?? 'Confidence Awaits',
            title: data.cta?.title ?? '',
            description: data.cta?.description ?? '',
            buttonText: data.cta?.buttonText ?? '',
            buttonUrl: data.cta?.buttonUrl ?? '/booking',
            secondaryButtonText: data.cta?.secondaryButtonText ?? 'Browse Services',
            secondaryButtonUrl: data.cta?.secondaryButtonUrl ?? '/services',
          },
          showFridayBooking: data.showFridayBooking !== undefined ? data.showFridayBooking : true,
          fridayBookingMessage: data.fridayBookingMessage ?? 'Friday Night Bookings Available',
        }
        setHomepage(normalizedHomepage)
        setOriginalHomepage(normalizedHomepage)
      } else {
        console.error('Failed to load homepage data')
      }

      if (discountsResponse.ok) {
        const discountData = await discountsResponse.json()
        const normalizedDiscounts: DiscountsData = {
          firstTimeClientDiscount: {
            enabled: Boolean(discountData?.firstTimeClientDiscount?.enabled),
            percentage: Number(discountData?.firstTimeClientDiscount?.percentage ?? 0),
            bannerEnabled:
              discountData?.firstTimeClientDiscount?.bannerEnabled === false
                ? 'disabled'
                : discountData?.firstTimeClientDiscount?.bannerEnabled === true
                ? 'enabled'
                : 'auto',
            bannerMessage:
              typeof discountData?.firstTimeClientDiscount?.bannerMessage === 'string'
                ? discountData.firstTimeClientDiscount.bannerMessage
                : '',
          },
          returningClientDiscount: {
            enabled: Boolean(discountData?.returningClientDiscount?.enabled),
            tier30Percentage: Number(
              discountData?.returningClientDiscount?.tier30Percentage ??
                discountData?.returningClientDiscount?.within30DaysPercentage ??
                discountData?.returningClientDiscount?.percentage ??
                0,
            ),
            tier45Percentage: Number(
              discountData?.returningClientDiscount?.tier45Percentage ??
                discountData?.returningClientDiscount?.within31To45DaysPercentage ??
                discountData?.returningClientDiscount?.percentage ??
                0,
            ),
          },
          depositPercentage: Number(discountData?.depositPercentage ?? 0),
        }
        setDiscounts(normalizedDiscounts)
        setOriginalDiscounts(JSON.parse(JSON.stringify(normalizedDiscounts)) as DiscountsData)
      } else {
        console.error('Failed to load discount data for promo banner')
      }
    } catch (error) {
      console.error('Error loading homepage or promo banner data:', error)
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

    const discountsChanged = JSON.stringify(discounts) !== JSON.stringify(originalDiscounts)

    try {
      const homepageResponse = await authorizedFetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homepage),
      })

      let discountsResponse: Response | null = null

      if (discountsChanged) {
        const normalizedDiscountPayload = {
          firstTimeClientDiscount: {
            enabled: Boolean(discounts.firstTimeClientDiscount.enabled),
            percentage: Number(discounts.firstTimeClientDiscount.percentage ?? 0),
            bannerEnabled:
              discounts.firstTimeClientDiscount.bannerEnabled === 'enabled'
                ? true
                : discounts.firstTimeClientDiscount.bannerEnabled === 'disabled'
                ? false
                : null,
            bannerMessage: discounts.firstTimeClientDiscount.bannerMessage ?? '',
          },
          returningClientDiscount: {
            enabled: Boolean(discounts.returningClientDiscount.enabled),
            tier30Percentage: Number(discounts.returningClientDiscount.tier30Percentage ?? 0),
            tier45Percentage: Number(discounts.returningClientDiscount.tier45Percentage ?? 0),
          },
          depositPercentage: Number(discounts.depositPercentage ?? 0),
        }

        discountsResponse = await authorizedFetch('/api/admin/discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedDiscountPayload),
        })
      }

      const homepageOk = homepageResponse.ok
      const discountsOk = !discountsChanged || (discountsResponse?.ok ?? false)

      if (homepageOk && discountsOk) {
        setMessage({ type: 'success', text: 'Homepage settings updated successfully! Please refresh the homepage (press Ctrl+Shift+R or Cmd+Shift+R) to see your new buttons.' })
        setOriginalHomepage(homepage)
        if (discountsChanged) {
          setOriginalDiscounts(JSON.parse(JSON.stringify(discounts)) as DiscountsData)
        }
        setShowDialog(false)
      } else {
        if (!homepageOk && !discountsOk) {
          setMessage({
            type: 'error',
            text: 'Failed to save homepage content and promo banner settings',
          })
        } else if (!homepageOk) {
          setMessage({ type: 'error', text: 'Failed to save homepage content' })
        } else {
          setMessage({ type: 'error', text: 'Failed to save promo banner settings' })
        }
      }
    } catch (error) {
      console.error('Error saving homepage or promo banner settings:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const updateFeature = (index: number, field: 'title' | 'description', value: string) => {
    setHomepage((prev) => {
      const updatedFeatures = [...prev.features]
      updatedFeatures[index] = { ...updatedFeatures[index], [field]: value }
      return { ...prev, features: updatedFeatures }
    })
  }

  const addFeature = () => {
    setHomepage((prev) => ({
      ...prev,
      features: [
        ...prev.features,
        {
          title: '',
          description: '',
        },
      ],
    }))
  }

  const removeFeature = (index: number) => {
    setHomepage((prev) => ({
      ...prev,
      features: prev.features.filter((_, featureIndex) => featureIndex !== index),
    }))
  }

  const updateStudioImage = (index: number, value: string) => {
    setHomepage((prev) => {
      const studio = prev.ourStudio || {
        enabled: false,
        title: 'Our Studio',
        description: '',
        images: [],
      }
      const newImages = [...studio.images]
      newImages[index] = value
      return {
        ...prev,
        ourStudio: {
          ...studio,
          images: newImages,
        },
      }
    })
  }

  const addStudioImage = () => {
    setHomepage((prev) => {
      const studio = prev.ourStudio || {
        enabled: false,
        title: 'Our Studio',
        description: '',
        images: [],
      }
      return {
        ...prev,
        ourStudio: {
          ...studio,
          images: [...studio.images, ''],
        },
      }
    })
  }

  const removeStudioImage = (index: number) => {
    setHomepage((prev) => {
      const studio = prev.ourStudio || {
        enabled: false,
        title: 'Our Studio',
        description: '',
        images: [],
      }
      return {
        ...prev,
        ourStudio: {
          ...studio,
          images: studio.images.filter((_, imageIndex) => imageIndex !== index),
        },
      }
    })
  }

  const handleStudioImageUpload = async (index: number, file: File) => {
    if (!file) return

    setUploadingImages((prev) => ({ ...prev, [index]: true }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/studio', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image')
      }

      // Update the image URL in the state
      updateStudioImage(index, data.url)
      setMessage({ type: 'success', text: 'Image uploaded successfully!' })
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload image',
      })
    } finally {
      setUploadingImages((prev) => ({ ...prev, [index]: false }))
    }
  }

  const handleArtistPhotoSelect = (file: File) => {
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string
      setImageToCrop(imageSrc)
      setShowCropModal(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropModal(false)
    setImageToCrop(null)
    
    setUploadingArtistPhoto(true)

    try {
      // Convert blob to file
      const file = new File([croppedBlob], 'artist-photo.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/artist', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      // Update the photo URL in the state
      setHomepage({
        ...homepage,
        meetArtist: {
          ...(homepage.meetArtist || {
          enabled: true,
          title: 'Meet Your Lash Artist',
          name: '',
          bio: '',
          photo: '',
          credentials: '',
        }),
          photo: data.url,
        },
      })
      setMessage({ type: 'success', text: 'Photo uploaded and cropped successfully!' })
    } catch (error) {
      console.error('Error uploading photo:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload photo',
      })
    } finally {
      setUploadingArtistPhoto(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setImageToCrop(null)
  }

  const handleMassageBackgroundUpload = async (file: File) => {
    if (!file) return

    setUploadingMassageBackground(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/studio', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image')
      }

      updateMassage({ backgroundImage: data.url })
      setMessage({ type: 'success', text: 'Background image uploaded successfully!' })
    } catch (error) {
      console.error('Error uploading background image:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload background image',
      })
    } finally {
      setUploadingMassageBackground(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown">Loading...</div>
      </div>
    )
  }

  const massageSettings = homepage.tsubokiMassage ?? createDefaultMassage()

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

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-display text-brown-dark mb-8">Homepage Content</h1>

          {/* Promo Banner */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Promo Banner</h2>
            <p className="text-sm text-brown-dark/80 mb-4">
              Update the sliding banner that appears above the public site header.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Banner visibility</label>
                <select
                  value={discounts.firstTimeClientDiscount.bannerEnabled}
                  onChange={(e) =>
                    setDiscounts((prev) => ({
                      ...prev,
                      firstTimeClientDiscount: {
                        ...prev.firstTimeClientDiscount,
                        bannerEnabled: e.target.value as 'auto' | 'enabled' | 'disabled',
                      },
                    }))
                  }
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                >
                  <option value="auto">Auto (show when offer is enabled)</option>
                  <option value="enabled">Always show</option>
                  <option value="disabled">Hide banner</option>
                </select>
                <p className="text-xs text-brown mt-2">
                  “Auto” shows the banner whenever the first-time client discount is enabled. Choose “Hide”
                  to remove it entirely, or “Always show” to keep it visible even if the offer is off.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Banner message</label>
                <textarea
                  value={discounts.firstTimeClientDiscount.bannerMessage}
                  onChange={(e) =>
                    setDiscounts((prev) => ({
                      ...prev,
                      firstTimeClientDiscount: {
                        ...prev.firstTimeClientDiscount,
                        bannerMessage: e.target.value,
                      },
                    }))
                  }
                  rows={2}
                  placeholder="🎉 Special Offer: {{percentage}}% OFF for first-time clients!"
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
                <p className="text-xs text-brown mt-2">
                  Use {'{{percentage}}'} anywhere in the message to automatically insert the current first-time
                  discount (%). Leave blank to use the default announcement.
                </p>
              </div>
              <div className="p-4 bg-pink-light/30 border border-brown-light rounded-lg text-sm text-brown-dark">
                <span className="font-semibold">Preview:&nbsp;</span>
                {(() => {
                  const percentageValue = discounts.firstTimeClientDiscount.percentage
                  const template = discounts.firstTimeClientDiscount.bannerMessage?.trim()
                  const defaultMessage =
                    Number.isFinite(percentageValue) && percentageValue !== null
                      ? `🎉 Special Offer: ${percentageValue}% OFF for First-Time Clients! Book today and save! 🎉`
                      : ''
                  const rawMessage = template && template.length > 0 ? template : defaultMessage
                  if (!rawMessage) {
                    return 'No banner text will be displayed.'
                  }
                  return rawMessage.replace(/{{\s*percentage\s*}}/gi, `${percentageValue}`)
                })()}
                {discounts.firstTimeClientDiscount.bannerEnabled === 'disabled' && (
                  <span className="block text-xs text-brown-dark/70 mt-2">
                    Banner is currently hidden. Change visibility to show it on the site.
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Hero Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Hero Section</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={homepage.showFridayBooking !== false}
                    onChange={(e) =>
                      setHomepage({ ...homepage, showFridayBooking: e.target.checked })
                    }
                    className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                  />
                  <span className="text-sm font-medium text-brown-dark">Show Friday Night Booking Notice</span>
                </label>
                <p className="text-xs text-brown mt-1 ml-6">
                  When enabled, a small notice about Friday night bookings will appear in the hero section (only if Friday slots are available).
                </p>
              </div>
              {homepage.showFridayBooking !== false && (
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Friday Night Booking Message</label>
                  <input
                    type="text"
                    value={homepage.fridayBookingMessage ?? 'Friday Night Bookings Available'}
                    onChange={(e) => setHomepage({ ...homepage, fridayBookingMessage: e.target.value })}
                    placeholder="Friday Night Bookings Available"
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  />
                  <p className="text-xs text-brown mt-1">
                    The text that appears in the Friday night booking notice. The moon emoji (🌙) will be added automatically.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                <input
                  type="text"
                  value={homepage.hero.title}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, title: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Subtitle</label>
                <input
                  type="text"
                  value={homepage.hero.subtitle}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, subtitle: e.target.value } })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Badge Text</label>
                <input
                  type="text"
                  value={homepage.hero.badge ?? ''}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, badge: e.target.value } })}
                  placeholder="e.g., Nairobi Studio Experience"
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Highlight Text</label>
                <input
                  type="text"
                  value={homepage.hero.highlight ?? ''}
                  onChange={(e) => setHomepage({ ...homepage, hero: { ...homepage.hero, highlight: e.target.value } })}
                  placeholder="e.g., Visit our Nairobi studio for a bespoke lash experience."
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                />
              </div>

              {/* Hero Buttons */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-brown-dark mb-3">Hero Section Buttons</label>
                <p className="text-xs text-brown-dark/70 mb-4">
                  Customize the buttons in your hero section. The first button will be styled as the primary button.
                </p>
                {(homepage.hero.buttons || []).map((button, index) => (
                  <div key={index} className="mb-4 p-4 border-2 border-brown-light rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-brown-dark">Button {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newButtons = [...(homepage.hero.buttons || [])]
                          newButtons.splice(index, 1)
                          setHomepage({ ...homepage, hero: { ...homepage.hero, buttons: newButtons } })
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-brown-dark mb-1">Button Text</label>
                        <input
                          type="text"
                          value={button.text}
                          onChange={(e) => {
                            const newButtons = [...(homepage.hero.buttons || [])]
                            newButtons[index] = { ...newButtons[index], text: e.target.value }
                            setHomepage({ ...homepage, hero: { ...homepage.hero, buttons: newButtons } })
                          }}
                          placeholder="e.g., Book Now"
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark mb-1">Button URL</label>
                        <input
                          type="text"
                          value={button.url}
                          onChange={(e) => {
                            const newButtons = [...(homepage.hero.buttons || [])]
                            newButtons[index] = { ...newButtons[index], url: e.target.value }
                            setHomepage({ ...homepage, hero: { ...homepage.hero, buttons: newButtons } })
                          }}
                          placeholder="e.g., /booking or https://example.com"
                          className="w-full px-3 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={button.primary !== false && index === 0}
                            onChange={(e) => {
                              const newButtons = [...(homepage.hero.buttons || [])]
                              newButtons[index] = { ...newButtons[index], primary: e.target.checked }
                              setHomepage({ ...homepage, hero: { ...homepage.hero, buttons: newButtons } })
                            }}
                            className="w-4 h-4 text-brown focus:ring-brown border-brown-light rounded"
                            disabled={index === 0}
                          />
                          <span className="text-xs text-brown-dark">Primary Button (first button is primary by default)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={button.external === true}
                            onChange={(e) => {
                              const newButtons = [...(homepage.hero.buttons || [])]
                              newButtons[index] = { ...newButtons[index], external: e.target.checked }
                              setHomepage({ ...homepage, hero: { ...homepage.hero, buttons: newButtons } })
                            }}
                            className="w-4 h-4 text-brown focus:ring-brown border-brown-light rounded"
                          />
                          <span className="text-xs text-brown-dark">External Link (opens in new tab)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newButtons = [...(homepage.hero.buttons || []), { text: '', url: '', primary: false, external: false }]
                    setHomepage({ ...homepage, hero: { ...homepage.hero, buttons: newButtons } })
                  }}
                  className="mt-3 px-4 py-2 bg-brown-light text-brown-dark rounded-lg hover:bg-brown hover:text-white transition-colors text-sm font-medium"
                >
                  + Add Button
                </button>
                {(!homepage.hero.buttons || homepage.hero.buttons.length === 0) && (
                  <p className="mt-2 text-xs text-brown-dark/60 italic">
                    No buttons configured. Default buttons (Book Now, View Gallery) will be shown.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Countdown Banner */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-2">Homepage Countdown Banner</h2>
            <p className="text-sm text-brown-dark/80 mb-4">
              Highlight a launch, promo, or booking deadline with a live timer on the public homepage.
              You can toggle it anytime from here.
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={homepage.countdownBanner?.enabled || false}
                  onChange={(e) => updateCountdownBanner({ enabled: e.target.checked })}
                  className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                />
                <span className="text-sm font-medium text-brown-dark">Show countdown banner on homepage</span>
              </label>
              {homepage.countdownBanner?.enabled && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-brown-dark mb-2">Eyebrow / Label</label>
                      <input
                        type="text"
                        value={homepage.countdownBanner.eyebrow || ''}
                        onChange={(e) => updateCountdownBanner({ eyebrow: e.target.value })}
                        placeholder="Limited Time Offer"
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brown-dark mb-2">Headline</label>
                      <input
                        type="text"
                        value={homepage.countdownBanner.title || ''}
                        onChange={(e) => updateCountdownBanner({ title: e.target.value })}
                        placeholder="Skin Reset Ritual booking closes soon"
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Supporting message</label>
                    <textarea
                      value={homepage.countdownBanner.message || ''}
                      onChange={(e) => updateCountdownBanner({ message: e.target.value })}
                      rows={2}
                      placeholder="Add a short note about the experience, perks, or deadline."
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-brown-dark mb-2">Event date &amp; time</label>
                      <input
                        type="datetime-local"
                        value={
                          homepage.countdownBanner.eventDate
                            ? new Date(homepage.countdownBanner.eventDate).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          updateCountdownBanner({
                            eventDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                      <p className="text-xs text-brown mt-1">
                        The timer counts down to this exact date/time (browser timezone).
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-brown-dark mb-2">Button text</label>
                        <input
                          type="text"
                          value={homepage.countdownBanner.buttonText || ''}
                          onChange={(e) => updateCountdownBanner({ buttonText: e.target.value })}
                          placeholder="Book Now"
                          className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-brown-dark mb-2">Button link</label>
                        <input
                          type="text"
                          value={homepage.countdownBanner.buttonUrl || ''}
                          onChange={(e) => updateCountdownBanner({ buttonUrl: e.target.value })}
                          placeholder="https://booking-link.com"
                          className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-pink-light/20 border border-dashed border-brown-light rounded-lg">
                    <p className="text-xs uppercase tracking-[0.2em] text-brown-dark font-semibold mb-1">
                      Preview
                    </p>
                    <div className="text-sm text-brown space-y-1">
                      <p className="font-semibold text-brown-dark">
                        {homepage.countdownBanner.eyebrow || 'Limited Time Offer'}
                      </p>
                      <p className="text-lg font-display text-brown-dark">
                        {homepage.countdownBanner.title || 'Add your headline'}
                      </p>
                      <p>{homepage.countdownBanner.message || 'Share a short message about your promo or launch.'}</p>
                      {homepage.countdownBanner.eventDate ? (
                        <p className="text-xs text-brown-dark/70">
                          Counting down to {new Date(homepage.countdownBanner.eventDate).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs text-red-600">Add a date to enable the timer.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gift Card Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Gift Card Section</h2>
            <p className="text-sm text-brown mb-4">
              Show or hide the "Buy a Gift Card" section on the homepage (appears after "Why Choose LashDiary").
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={homepage.giftCardSection?.enabled !== false}
                  onChange={(e) =>
                    setHomepage((prev) => ({
                      ...prev,
                      giftCardSection: { enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                />
                <span className="text-sm font-medium text-brown-dark">Show gift card section on homepage</span>
              </label>
            </div>
          </div>

          {/* Model Signup Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Model Signup Section</h2>
            <p className="text-sm text-brown-dark/80 mb-4">
              Show or hide the model casting call section on the homepage. When enabled, this section will appear on the homepage and a link will be added to the footer.
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={homepage.modelSignup?.enabled ?? false}
                  onChange={(e) =>
                    setHomepage((prev) => ({
                      ...prev,
                      modelSignup: {
                        ...(prev.modelSignup || {
                          enabled: false,
                          title: 'Model Casting Call',
                          description: 'Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation.',
                          buttonText: 'Apply Now',
                        }),
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                />
                <span className="text-sm font-medium text-brown-dark">Show model signup section on homepage</span>
              </label>
              {homepage.modelSignup?.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                    <input
                      type="text"
                      value={homepage.modelSignup.title || 'Model Casting Call'}
                      onChange={(e) =>
                        setHomepage((prev) => ({
                          ...prev,
                          modelSignup: {
                            ...(prev.modelSignup || {
                              enabled: true,
                              title: 'Model Casting Call',
                              description: 'Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation.',
                              buttonText: 'Apply Now',
                            }),
                            title: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Model Casting Call"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Description</label>
                    <textarea
                      value={homepage.modelSignup.description || ''}
                      onChange={(e) =>
                        setHomepage((prev) => ({
                          ...prev,
                          modelSignup: {
                            ...(prev.modelSignup || {
                              enabled: true,
                              title: 'Model Casting Call',
                              description: 'Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation.',
                              buttonText: 'Apply Now',
                            }),
                            description: e.target.value,
                          },
                        }))
                      }
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Button Text</label>
                    <input
                      type="text"
                      value={homepage.modelSignup.buttonText || 'Apply Now'}
                      onChange={(e) =>
                        setHomepage((prev) => ({
                          ...prev,
                          modelSignup: {
                            ...(prev.modelSignup || {
                              enabled: true,
                              title: 'Model Casting Call',
                              description: 'Interested in becoming a LashDiary model? Apply for a free full set in exchange for content creation.',
                              buttonText: 'Apply Now',
                            }),
                            buttonText: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Apply Now"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Features</h2>
            {homepage.features.length === 0 && (
              <div className="mb-4 p-4 bg-pink-light/20 border border-dashed border-brown-light rounded-lg text-sm text-brown-dark/80">
                No features yet. Click "Add Feature" to highlight what makes your studio special.
              </div>
            )}
            {homepage.features.map((feature, index) => (
              <div key={index} className="mb-4 p-4 bg-pink-light/30 rounded-lg border border-brown-light">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-brown-dark mb-2">Feature {index + 1} Title</label>
                      <input
                        type="text"
                        value={feature.title}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brown-dark mb-2">Feature {index + 1} Description</label>
                      <textarea
                        value={feature.description}
                        onChange={(e) => updateFeature(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    aria-label={`Remove feature ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addFeature}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
            >
              + Add Feature
            </button>
          </div>

          {/* Meet Your Lash Artist Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Meet Your Lash Artist</h2>
            <p className="text-sm text-brown-dark/80 mb-4">
              Add a personal section introducing yourself or your lead lash artist. This helps build trust and connection with potential clients.
            </p>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={homepage.meetArtist?.enabled || false}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        meetArtist: {
                          ...(homepage.meetArtist || {
                            title: 'Meet Your Lash Artist',
                            name: '',
                            bio: '',
                            photo: '',
                            credentials: '',
                          }),
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                  />
                  <span className="text-sm font-medium text-brown-dark">Enable "Meet Your Lash Artist" section</span>
                </label>
              </div>
              {homepage.meetArtist?.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Section Title</label>
                    <input
                      type="text"
                      value={homepage.meetArtist.title || 'Meet Your Lash Artist'}
                      onChange={(e) =>
                        setHomepage({
                          ...homepage,
                          meetArtist: {
                            ...(homepage.meetArtist || {
                              enabled: true,
                              title: 'Meet Your Lash Artist',
                              name: '',
                              bio: '',
                              photo: '',
                              credentials: '',
                            }),
                            title: e.target.value,
                          },
                        })
                      }
                      placeholder="Meet Your Lash Artist"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Artist Name</label>
                    <input
                      type="text"
                      value={homepage.meetArtist.name || ''}
                      onChange={(e) =>
                        setHomepage({
                          ...homepage,
                          meetArtist: {
                            ...(homepage.meetArtist || {
                              enabled: true,
                              title: 'Meet Your Lash Artist',
                              name: '',
                              bio: '',
                              photo: '',
                              credentials: '',
                            }),
                            name: e.target.value,
                          },
                        })
                      }
                      placeholder="Your name or artist's name"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Credentials/Certifications (Optional)</label>
                    <input
                      type="text"
                      value={homepage.meetArtist.credentials || ''}
                      onChange={(e) =>
                        setHomepage({
                          ...homepage,
                          meetArtist: {
                            ...(homepage.meetArtist || {
                              enabled: true,
                              title: 'Meet Your Lash Artist',
                              name: '',
                              bio: '',
                              photo: '',
                              credentials: '',
                            }),
                            credentials: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., Certified Lash Technician, 5+ Years Experience"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Bio/Description</label>
                    <textarea
                      value={homepage.meetArtist.bio || ''}
                      onChange={(e) =>
                        setHomepage({
                          ...homepage,
                          meetArtist: {
                            ...(homepage.meetArtist || {
                              enabled: true,
                              title: 'Meet Your Lash Artist',
                              name: '',
                              bio: '',
                              photo: '',
                              credentials: '',
                            }),
                            bio: e.target.value,
                          },
                        })
                      }
                      rows={4}
                      placeholder="Tell clients about your passion for lash artistry, your approach, and what makes your work special..."
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Photo (Optional)</label>
                    
                    {/* File Upload */}
                    <div className="mb-3">
                      <label className="block text-xs text-brown-dark/70 mb-1">
                        Upload from device:
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleArtistPhotoSelect(file)
                          }
                        }}
                        disabled={uploadingArtistPhoto || showCropModal}
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brown-dark file:text-white hover:file:bg-brown transition-colors cursor-pointer disabled:opacity-50"
                      />
                      {uploadingArtistPhoto && (
                        <p className="text-xs text-brown mt-1">Uploading...</p>
                      )}
                    </div>

                    {/* URL Input (Alternative) */}
                    <div>
                      <label className="block text-xs text-brown-dark/70 mb-1">
                        Or enter photo URL:
                      </label>
                      <input
                        type="text"
                        value={homepage.meetArtist.photo || ''}
                        onChange={(e) =>
                          setHomepage({
                            ...homepage,
                            meetArtist: {
                              ...(homepage.meetArtist || {
                                enabled: true,
                                title: 'Meet Your Lash Artist',
                                name: '',
                                bio: '',
                                photo: '',
                                credentials: '',
                              }),
                              photo: e.target.value,
                            },
                          })
                        }
                        placeholder="https://example.com/your-photo.jpg or /uploads/your-photo.jpg"
                        className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm"
                      />
                    </div>

                    {/* Photo Preview */}
                    {homepage.meetArtist.photo && (
                      <div className="mt-3 rounded-lg overflow-hidden border-2 border-brown-light max-w-xs">
                        <img
                          src={homepage.meetArtist.photo}
                          alt="Artist photo preview"
                          className="w-full h-auto"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}

                    <p className="text-xs text-brown mt-2">
                      Upload a photo from your device or enter a full URL. Maximum file size: 10MB. Supported formats: JPEG, PNG, WebP, GIF.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Our Studio Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Our Studio</h2>
            <p className="text-sm text-brown-dark/80 mb-4">
              Showcase your studio space with photos and a description. This helps clients visualize the experience before booking.
            </p>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={homepage.ourStudio?.enabled || false}
                    onChange={(e) =>
                      setHomepage({
                        ...homepage,
                        ourStudio: {
                          ...(homepage.ourStudio || {
                            title: 'Our Studio',
                            description: '',
                            images: [],
                          }),
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                  />
                  <span className="text-sm font-medium text-brown-dark">Enable "Our Studio" section</span>
                </label>
              </div>
              {homepage.ourStudio?.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Section Title</label>
                    <input
                      type="text"
                      value={homepage.ourStudio.title || 'Our Studio'}
                      onChange={(e) =>
                        setHomepage({
                          ...homepage,
                          ourStudio: {
                            ...(homepage.ourStudio || {
                              enabled: true,
                              title: 'Our Studio',
                              description: '',
                              images: [],
                            }),
                            title: e.target.value,
                          },
                        })
                      }
                      placeholder="Our Studio"
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Description</label>
                    <textarea
                      value={homepage.ourStudio.description || ''}
                      onChange={(e) =>
                        setHomepage({
                          ...homepage,
                          ourStudio: {
                            ...(homepage.ourStudio || {
                              enabled: true,
                              title: 'Our Studio',
                              description: '',
                              images: [],
                            }),
                            description: e.target.value,
                          },
                        })
                      }
                      rows={3}
                      placeholder="Describe your studio space, atmosphere, and what makes it special..."
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-4">Studio Gallery Images</label>
                    {homepage.ourStudio.images && homepage.ourStudio.images.length === 0 && (
                      <div className="mb-4 p-4 bg-pink-light/20 border border-dashed border-brown-light rounded-lg text-sm text-brown-dark/80">
                        No images yet. Click "Add Image" to add photos of your studio.
                      </div>
                    )}
                    {homepage.ourStudio.images && homepage.ourStudio.images.map((imageUrl, index) => (
                      <div key={index} className="mb-4 p-4 bg-pink-light/30 rounded-lg border border-brown-light">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-brown-dark mb-2">
                              Image {index + 1}
                            </label>
                            
                            {/* File Upload */}
                            <div className="mb-3">
                              <label className="block text-xs text-brown-dark/70 mb-1">
                                Upload from device:
                              </label>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleStudioImageUpload(index, file)
                                  }
                                }}
                                disabled={uploadingImages[index]}
                                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brown-dark file:text-white hover:file:bg-brown transition-colors cursor-pointer disabled:opacity-50"
                              />
                              {uploadingImages[index] && (
                                <p className="text-xs text-brown mt-1">Uploading...</p>
                              )}
                            </div>

                            {/* URL Input (Alternative) */}
                            <div>
                              <label className="block text-xs text-brown-dark/70 mb-1">
                                Or enter image URL:
                              </label>
                              <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => updateStudioImage(index, e.target.value)}
                                placeholder="https://example.com/studio-photo.jpg or /uploads/studio-photo.jpg"
                                className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm"
                              />
                            </div>

                            {imageUrl && (
                              <div className="mt-3 rounded-lg overflow-hidden border-2 border-brown-light max-w-xs">
                                <img
                                  src={imageUrl}
                                  alt={`Studio ${index + 1}`}
                                  className="w-full h-auto"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStudioImage(index)}
                            className="text-sm text-red-600 hover:text-red-700 font-semibold mt-8"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addStudioImage}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brown-dark text-white rounded-lg hover:bg-brown transition-colors font-semibold"
                    >
                      + Add Image
                    </button>
                    <p className="text-xs text-brown mt-2">
                      Upload images from your device or enter full URLs. Only the first 4 images will be displayed on the homepage in a 2x2 grid layout. Maximum file size: 10MB. Supported formats: JPEG, PNG, WebP, GIF.
                    </p>
                    {homepage.ourStudio.images && homepage.ourStudio.images.length > 4 && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                        ⚠️ You have {homepage.ourStudio.images.length} images, but only the first 4 will be displayed on the homepage.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Complimentary Japanese Facial Massage Section */}
          <div className="py-8 border-t border-brown-light mt-8">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Complimentary Japanese Facial Massage</h2>
            <p className="text-sm text-brown-dark/70 mb-6">
              Update the text that appears on the public site letting clients know every lash service now includes this relaxation ritual.
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={massageSettings.enabled}
                  onChange={(e) => updateMassage({ enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-2 border-brown-light text-brown-dark focus:ring-brown-dark"
                />
                <span className="text-sm font-medium text-brown-dark">Show this section on the website</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Badge</label>
                  <input
                    type="text"
                    value={massageSettings.badge}
                    onChange={(e) => updateMassage({ badge: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    placeholder="Complimentary Ritual"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                  <input
                    type="text"
                    value={massageSettings.title}
                    onChange={(e) => updateMassage({ title: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                    placeholder="Complimentary Japanese Facial Massage"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Subtitle</label>
                <input
                  type="text"
                  value={massageSettings.subtitle}
                  onChange={(e) => updateMassage({ subtitle: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  placeholder="Included with every lash service"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Description</label>
                <textarea
                  value={massageSettings.description}
                  onChange={(e) => updateMassage({ description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  placeholder="Explain what the Japanese facial massage feels like and when clients receive it."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Background Image</label>
                <p className="text-xs text-brown-dark/70 mb-3">
                  This photo displays behind the badge and title on the homepage section. Use a wide studio or ritual photo for best results.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleMassageBackgroundUpload(file)
                    }
                  }}
                  disabled={uploadingMassageBackground}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brown-dark file:text-white hover:file:bg-brown transition-colors cursor-pointer disabled:opacity-50"
                />
                {uploadingMassageBackground && (
                  <p className="text-xs text-brown mt-1">Uploading...</p>
                )}
                <div className="mt-3">
                  <label className="block text-xs text-brown-dark/70 mb-1">Or enter image URL:</label>
                  <input
                    type="text"
                    value={massageSettings.backgroundImage ?? ''}
                    onChange={(e) => updateMassage({ backgroundImage: e.target.value })}
                    placeholder="/uploads/studio/..."
                    className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown text-sm"
                  />
                </div>
                {massageSettings.backgroundImage && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-brown-light h-40 bg-cover bg-center"
                    style={{ backgroundImage: `url('${massageSettings.backgroundImage}')` }}
                  >
                    <div className="h-full w-full bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Benefits (one per line)</label>
                <textarea
                  value={(massageSettings.benefits || []).join('\n')}
                  onChange={(e) =>
                    updateMassage({
                      benefits: e.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  placeholder={'Reduces facial tension before lash application\nBoosts lymphatic drainage and glow'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-dark mb-2">Why it matters</label>
                <textarea
                  value={massageSettings.whyItMatters}
                  onChange={(e) => updateMassage({ whyItMatters: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                  placeholder="Share why the massage supports lash retention or the client experience."
                />
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">FAQ Section</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={homepage.faqSection?.enabled !== false}
                  onChange={(e) => setHomepage({ ...homepage, faqSection: { ...(homepage.faqSection || {}), enabled: e.target.checked } })}
                  className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                />
                <span className="text-sm font-medium text-brown-dark">Show FAQ section on homepage</span>
              </label>
              {homepage.faqSection?.enabled !== false && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Icon (Emoji)</label>
                    <input
                      type="text"
                      value={homepage.faqSection?.icon || '💭'}
                      onChange={(e) => setHomepage({ ...homepage, faqSection: { ...(homepage.faqSection || {}), icon: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="💭"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                    <input
                      type="text"
                      value={homepage.faqSection?.title || 'Frequently Asked Questions'}
                      onChange={(e) => setHomepage({ ...homepage, faqSection: { ...(homepage.faqSection || {}), title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Frequently Asked Questions"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Description</label>
                    <textarea
                      value={homepage.faqSection?.description || ''}
                      onChange={(e) => setHomepage({ ...homepage, faqSection: { ...(homepage.faqSection || {}), description: e.target.value } })}
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Have questions? We've got answers. Explore our FAQ to learn more about lash extensions, appointments, and everything in between."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Button Text</label>
                    <input
                      type="text"
                      value={homepage.faqSection?.buttonText || 'View FAQs'}
                      onChange={(e) => setHomepage({ ...homepage, faqSection: { ...(homepage.faqSection || {}), buttonText: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="View FAQs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Button URL</label>
                    <input
                      type="text"
                      value={homepage.faqSection?.buttonUrl || '/policies#faq'}
                      onChange={(e) => setHomepage({ ...homepage, faqSection: { ...(homepage.faqSection || {}), buttonUrl: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="/policies#faq or https://example.com"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">Use relative URLs like /policies#faq or full URLs like https://example.com</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mb-8 pb-8 border-b-2 border-brown-light">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Call to Action Section</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={homepage.cta?.enabled !== false}
                  onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, enabled: e.target.checked } })}
                  className="w-4 h-4 text-brown-dark focus:ring-brown border-brown-light rounded"
                />
                <span className="text-sm font-medium text-brown-dark">Show CTA section on homepage</span>
              </label>
              {homepage.cta?.enabled !== false && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Badge Text (Small text above title)</label>
                    <input
                      type="text"
                      value={homepage.cta.badge || 'Confidence Awaits'}
                      onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, badge: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Confidence Awaits"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Title</label>
                    <input
                      type="text"
                      value={homepage.cta.title}
                      onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Ready to Transform Your Look?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Description</label>
                    <textarea
                      value={homepage.cta.description}
                      onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, description: e.target.value } })}
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Book your appointment today and enjoy luxury lash services at our Nairobi studio!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Primary Button Text</label>
                    <input
                      type="text"
                      value={homepage.cta.buttonText}
                      onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, buttonText: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Book Now!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Primary Button URL</label>
                    <input
                      type="text"
                      value={homepage.cta.buttonUrl || '/booking'}
                      onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, buttonUrl: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="/booking or https://example.com"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">Use relative URLs like /booking or full URLs like https://example.com</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Secondary Button Text (Optional)</label>
                    <input
                      type="text"
                      value={homepage.cta.secondaryButtonText || 'Browse Services'}
                      onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, secondaryButtonText: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="Browse Services"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">Leave empty to hide the secondary button</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">Secondary Button URL</label>
                    <input
                      type="text"
                      value={homepage.cta.secondaryButtonUrl || '/services'}
                      onChange={(e) => setHomepage({ ...homepage, cta: { ...homepage.cta, secondaryButtonUrl: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-brown-light rounded-lg bg-white focus:ring-2 focus:ring-brown focus:border-brown"
                      placeholder="/services or https://example.com"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">Only used if secondary button text is provided</p>
                  </div>
                </>
              )}
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

      {/* Image Crop Modal */}
      {showCropModal && imageToCrop && (
        <ImageCrop
          imageSrc={imageToCrop}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // Square crop for artist photos
        />
      )}
    </div>
  )
}

