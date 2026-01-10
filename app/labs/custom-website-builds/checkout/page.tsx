'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useLabsCart } from '../cart-context'
import { convertCurrency, DEFAULT_EXCHANGE_RATES, type ExchangeRates } from '@/lib/currency-utils'
import Link from 'next/link'
import PaystackInlinePayment from '@/components/PaystackInlinePayment'

interface CheckoutData {
  orderId: string
  items: Array<{
    productId: string
    name: string
    price: number
    quantity: number
    billingPeriod?: 'one-time' | 'yearly'
    setupFee?: number
  }>
  subtotal: number
  setupFeesTotal?: number // Total of all setup fees
  domainPricing?: {
    setupFee: number
    annualPrice: number
    totalFirstPayment: number
  }
  referralDiscount?: number
  appliedReferralCode?: string
  total: number
  initialPayment: number
  remainingPayment: number
  paymentStatus: 'pending' | 'partial' | 'completed'
  email: string
}

function LabsCheckoutContentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, clearCart, restoreCart, getTotalPrice, addToCart, removeFromCart, updateQuantity } = useLabsCart()
  const { currency, formatCurrency } = useCurrency()
  const [orderRestored, setOrderRestored] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [processing, setProcessing] = useState(false)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    publicKey: string
    email: string
    amount: number
    currency: string
    reference: string
    customerName: string
    phone?: string
    orderId: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [minimumCartValue, setMinimumCartValue] = useState<number>(20000)
  const [enableBusinessInfo, setEnableBusinessInfo] = useState<boolean>(true)
  const [allServices, setAllServices] = useState<any[]>([])
  const [referralDiscountPercentage, setReferralDiscountPercentage] = useState<number>(10) // Default 10%
  const [domainPricing, setDomainPricing] = useState<{
    setupFee: number
    annualPrice: number
    totalFirstPayment: number
  } | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const [validatingCode, setValidatingCode] = useState(false)
  const [codeValid, setCodeValid] = useState<boolean | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [calculatedDiscount, setCalculatedDiscount] = useState<number>(0) // Calculated discount amount
  
  // Website type: 'personal' or 'business'
  const [websiteType, setWebsiteType] = useState<'personal' | 'business'>('business')
  
  // Business details
  const [businessName, setBusinessName] = useState('')
  const [domainType, setDomainType] = useState<'new' | 'existing'>('new')
  const [domainExtension, setDomainExtension] = useState('.co.ke')
  const [domainName, setDomainName] = useState('')
  const [existingDomain, setExistingDomain] = useState('')
  
  // Logo options
  const [logoType, setLogoType] = useState<'upload' | 'text' | 'custom'>('text')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [logoText, setLogoText] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showLogoDesignSuggestion, setShowLogoDesignSuggestion] = useState(false)
  
  // Color options
  const [primaryColor, setPrimaryColor] = useState('#7C4B31') // Default brown
  const [secondaryColor, setSecondaryColor] = useState('#F3E6DC') // Default light brown
  
  // Additional business information
  const [businessDescription, setBusinessDescription] = useState('')
  const [personalWebsiteAbout, setPersonalWebsiteAbout] = useState('') // For personal websites
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessCountry, setBusinessCountry] = useState('Kenya')
  const [businessHours, setBusinessHours] = useState<Array<{
    day: string
    open: string
    close: string
    closed: boolean
  }>>([
    { day: 'Monday', open: '09:00', close: '17:00', closed: false },
    { day: 'Tuesday', open: '09:00', close: '17:00', closed: false },
    { day: 'Wednesday', open: '09:00', close: '17:00', closed: false },
    { day: 'Thursday', open: '09:00', close: '17:00', closed: false },
    { day: 'Friday', open: '09:00', close: '17:00', closed: false },
    { day: 'Saturday', open: '09:00', close: '17:00', closed: false },
    { day: 'Sunday', open: '09:00', close: '17:00', closed: true },
  ])
  const [servicesProducts, setServicesProducts] = useState('')
  const [socialMediaLinks, setSocialMediaLinks] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
  })
  
  // Timeline/deadline
  const [timeline, setTimeline] = useState<'10' | '21' | 'urgent' | ''>('')
  const [priorityFee, setPriorityFee] = useState<number>(2000) // Default priority fee

  // Discount amount is now calculated by the API during validation
  // No need to recalculate here - it's set in the validation handler
  useEffect(() => {
    if (codeValid !== true) {
      setCalculatedDiscount(0)
    }
  }, [codeValid, getTotalPrice, timeline, priorityFee, domainType, domainPricing])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/labs/web-services', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setMinimumCartValue(data.cartRules?.minimumCartValue || 20000)
          setEnableBusinessInfo(data.enableBusinessInfo !== false)
          setPriorityFee(data.priorityFee || 2000)
          setReferralDiscountPercentage(data.referralDiscountPercentage || 10)
          setAllServices(data.services || [])
          if (data.domainPricing) {
            setDomainPricing(data.domainPricing)
          } else {
            // Set default domain pricing
            setDomainPricing({
              setupFee: 4000,
              annualPrice: 2000,
              totalFirstPayment: 6000,
            })
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        // Set default domain pricing on error
        setDomainPricing({
          setupFee: 4000,
          annualPrice: 2000,
          totalFirstPayment: 6000,
        })
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setExchangeRates(data)
        }
      } catch (error) {
        console.error('Error loading exchange rates:', error)
      }
    }
    loadExchangeRates()
  }, [])

  // Restore order from orderId in URL
  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (orderId && !orderRestored) {
      const restoreOrder = async () => {
        try {
          const response = await fetch(`/api/labs/web-services/orders/restore?orderId=${orderId}`, {
            cache: 'no-store',
          })
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.order) {
              const order = data.order
              
              // Restore cart items
              restoreCart(order.items || [])
              
              // Restore form fields
              if (order.name) setName(order.name)
              if (order.email) setEmail(order.email)
              if (order.phoneNumber) setPhoneNumber(order.phoneNumber)
              if (order.businessName) setBusinessName(order.businessName)
              if (order.domainType) setDomainType(order.domainType)
              if (order.domainExtension) setDomainExtension(order.domainExtension)
              if (order.domainName) setDomainName(order.domainName)
              if (order.existingDomain) setExistingDomain(order.existingDomain)
              if (order.logoType) setLogoType(order.logoType)
              if (order.logoUrl) setLogoUrl(order.logoUrl)
              if (order.logoText) setLogoText(order.logoText)
              if (order.primaryColor) setPrimaryColor(order.primaryColor)
              if (order.secondaryColor) setSecondaryColor(order.secondaryColor)
              if (order.businessDescription) setBusinessDescription(order.businessDescription)
              if (order.businessAddress) setBusinessAddress(order.businessAddress)
              if (order.businessCity) setBusinessCity(order.businessCity)
              if (order.businessCountry) setBusinessCountry(order.businessCountry)
              if (order.businessHours) setBusinessHours(order.businessHours)
              if (order.servicesProducts) setServicesProducts(order.servicesProducts)
              if (order.socialMediaLinks) setSocialMediaLinks(order.socialMediaLinks)
              if (order.timeline) setTimeline(order.timeline)
              
              setOrderRestored(true)
            }
          }
        } catch (error) {
          console.error('Error restoring order:', error)
        }
      }
      restoreOrder()
    }
  }, [searchParams, orderRestored, restoreCart])

  // Auto-fill logo text with business name (only if empty)
  useEffect(() => {
    if (logoType === 'text' && businessName && !logoText.trim()) {
      setLogoText(businessName)
    }
  }, [businessName, logoType]) // Don't include logoText in deps to avoid overwriting user input

  // Update logo design suggestion when cart changes and auto-add logo design service
  useEffect(() => {
    if (logoType === 'custom') {
      const hasLogoDesign = items.some(item => 
        item.name.toLowerCase().includes('logo') && 
        item.name.toLowerCase().includes('design')
      )
      setShowLogoDesignSuggestion(!hasLogoDesign)
      
      // Auto-add Logo Design service if not in cart
      if (!hasLogoDesign && allServices.length > 0) {
        const logoDesignService = allServices.find(s => 
          s.name.toLowerCase().includes('logo') && 
          s.name.toLowerCase().includes('design')
        )
        if (logoDesignService) {
          addToCart({
            productId: logoDesignService.id,
            name: logoDesignService.name,
            price: logoDesignService.price,
            category: logoDesignService.category,
            billingPeriod: logoDesignService.billingPeriod,
            setupFee: logoDesignService.setupFee,
          })
        }
      }
    }
  }, [logoType, items, allServices, addToCart])

  const getDisplayPrice = (price: number) => {
    if (currency === 'USD') {
      const usdPrice = convertCurrency(price, 'KES', 'USD', exchangeRates)
      return formatCurrency(usdPrice)
    }
    return formatCurrency(price)
  }

  const handleLogoTypeChange = (type: 'upload' | 'text' | 'custom') => {
    setLogoType(type)
    setError(null)
  }

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/labs/web-services/upload-logo', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (response.ok && data.url) {
        setLogoUrl(data.url)
        setError(null)
      } else {
        setError(data.error || 'Failed to upload logo. Please try again.')
        setLogoFile(null)
        setLogoUrl('')
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      setError('Failed to upload logo. Please try again.')
      setLogoFile(null)
      setLogoUrl('')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Helper function to check for missing required services
  const checkMissingRequiredServices = (): string[] => {
    if (items.length === 0 || allServices.length === 0) return []
    
    const cartItemIds = items.map(item => item.productId)
    const missingRequiredServices: string[] = []
    
    // Recursive function to check all required services (including nested requirements)
    const checkRequiredServices = (serviceId: string, visited: Set<string>) => {
      if (visited.has(serviceId)) return // Prevent infinite loops
      visited.add(serviceId)
      
      const service = allServices.find(s => s.id === serviceId)
      if (!service || !service.requiredServices) return
      
      for (const requiredId of service.requiredServices) {
        if (!cartItemIds.includes(requiredId)) {
          const requiredService = allServices.find(s => s.id === requiredId)
          if (requiredService && !missingRequiredServices.includes(requiredService.name)) {
            missingRequiredServices.push(requiredService.name)
          }
          // Recursively check if this required service itself has required services
          checkRequiredServices(requiredId, visited)
        } else {
          // If the required service is in cart, check if it has its own required services
          const requiredService = allServices.find(s => s.id === requiredId)
          if (requiredService) {
            checkRequiredServices(requiredId, visited)
          }
        }
      }
    }
    
    // Check all items in cart for required services
    for (const item of items) {
      const itemVisited = new Set<string>() // Separate visited set for each top-level item
      checkRequiredServices(item.productId, itemVisited)
    }
    
    return missingRequiredServices
  }

  const handleCheckout = async () => {
    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }

    // Check for required services first (before other validations)
    const missingRequiredServices = checkMissingRequiredServices()
    if (missingRequiredServices.length > 0) {
      setError(`The following required services must be added to your cart before checkout: ${missingRequiredServices.join(', ')}. These services are required and cannot be purchased separately. If you'd like to discuss your options, please book a consultation at lashdiary.co.ke/labs/book-appointment.`)
      return
    }

    // Calculate original cart total (before discount, includes setup fees for yearly services, priority fee, and domain pricing)
    // This is what must meet the minimum cart value requirement
    const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
    const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
    const originalCartTotal = getTotalPrice() + urgentPriorityFee + domainFee
    
    // Check minimum cart value using ORIGINAL total (before discount)
    // Discounts can bring it below minimum, but original must meet minimum
    if (originalCartTotal < minimumCartValue) {
      setError(`Minimum order value is ${formatCurrency(minimumCartValue)}. Your cart total is ${formatCurrency(originalCartTotal)}. Please add more items to your cart.`)
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number')
      return
    }

    // Validate website info only if enabled
    if (enableBusinessInfo) {
      // Validate business name (only for business websites)
      if (websiteType === 'business' && !businessName.trim()) {
        setError('Please enter your business name')
        return
      }

      // Validate domain (for both types)
      if (domainType === 'new' && !domainName.trim()) {
        setError('Please enter your desired domain name')
        return
      }

      if (domainType === 'existing' && !existingDomain.trim()) {
        setError('Please enter your existing domain')
        return
      }

      // Validate logo (for both types)
      if (logoType === 'upload' && !logoUrl && !logoFile) {
        setError('Please upload your logo or select a different logo option')
        return
      }

      if (logoType === 'text' && !logoText.trim()) {
        setError('Please enter text for your logo')
        return
      }

      if (logoType === 'custom') {
        // Check if logo design service is in cart
        const hasLogoDesign = items.some(item => 
          item.name.toLowerCase().includes('logo') && 
          item.name.toLowerCase().includes('design')
        )
        if (!hasLogoDesign) {
          setError('Please add the Logo Design service to your cart if you want a custom logo')
          return
        }
      }

      // Validate colors (for both types)
      if (!primaryColor || !primaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        setError('Please select a valid primary color')
        return
      }
      if (!secondaryColor || !secondaryColor.match(/^#[0-9A-Fa-f]{6}$/)) {
        setError('Please select a valid secondary color')
        return
      }

      // Validate business-specific information
      if (websiteType === 'business') {
        if (!businessDescription.trim() || businessDescription.trim().length < 50) {
          setError('Please provide a business description (at least 50 characters)')
          return
        }
        if (!businessAddress.trim()) {
          setError('Please enter your business address')
          return
        }
        if (!businessCity.trim()) {
          setError('Please enter your city')
          return
        }
        if (!businessCountry.trim()) {
          setError('Please enter your country')
          return
        }
        if (!servicesProducts.trim()) {
          setError('Please list your services or products')
          return
        }
      } else {
        // Validate personal website information
        if (!personalWebsiteAbout.trim() || personalWebsiteAbout.trim().length < 50) {
          setError('Please provide information about what your website is about (at least 50 characters)')
          return
        }
      }

      // Timeline is required for both types
      if (!timeline) {
        setError('Please select a timeline/deadline')
        return
      }
    }

    setProcessing(true)
    setError(null)

    // Upload logo if needed and not already uploaded
    if (logoType === 'upload' && logoFile && !logoUrl) {
      await handleLogoUpload(logoFile)
      if (!logoUrl) {
        setProcessing(false)
        return // Error already set by handleLogoUpload
      }
    }

    try {
      const response = await fetch('/api/labs/web-services/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            billingPeriod: item.billingPeriod,
            setupFee: item.setupFee,
          })),
          websiteType: enableBusinessInfo ? websiteType : 'business', // Default to business if disabled
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          businessName: enableBusinessInfo && websiteType === 'business' ? businessName.trim() : undefined,
          domainType: enableBusinessInfo ? domainType : undefined,
          domainExtension: enableBusinessInfo && domainType === 'new' ? domainExtension : undefined,
          domainName: enableBusinessInfo && domainType === 'new' ? domainName.trim() : undefined,
          existingDomain: enableBusinessInfo && domainType === 'existing' ? existingDomain.trim() : undefined,
          logoType: enableBusinessInfo ? logoType : undefined,
          logoUrl: enableBusinessInfo && logoType === 'upload' ? logoUrl : undefined,
          logoText: enableBusinessInfo && logoType === 'text' ? logoText.trim() : undefined,
          primaryColor: enableBusinessInfo ? primaryColor : undefined,
          secondaryColor: enableBusinessInfo ? secondaryColor : undefined,
          businessDescription: enableBusinessInfo && websiteType === 'business' ? businessDescription.trim() : undefined,
          personalWebsiteAbout: enableBusinessInfo && websiteType === 'personal' ? personalWebsiteAbout.trim() : undefined,
          businessAddress: enableBusinessInfo && websiteType === 'business' ? businessAddress.trim() : undefined,
          businessCity: enableBusinessInfo && websiteType === 'business' ? businessCity.trim() : undefined,
          businessCountry: enableBusinessInfo && websiteType === 'business' ? businessCountry.trim() : undefined,
          businessHours: enableBusinessInfo && websiteType === 'business' ? businessHours : undefined,
          servicesProducts: enableBusinessInfo && websiteType === 'business' ? servicesProducts.trim() : undefined,
          socialMediaLinks: enableBusinessInfo ? socialMediaLinks : undefined,
          timeline: timeline || undefined,
          priorityFee: timeline === 'urgent' ? priorityFee : 0,
          referralCode: referralCode.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if error is related to referral code
        if (data.error && (data.error.toLowerCase().includes('referral') || data.error.toLowerCase().includes('code'))) {
          setCodeError(data.error)
          setCodeValid(false)
          setError(null) // Don't show general error for referral code issues
        } else {
          setError(data.error || 'Failed to process checkout')
        }
        setProcessing(false)
        return
      }

      setCheckoutData(data)

      // Convert payment amount based on selected currency
      const paymentAmount = currency === 'USD' 
        ? convertCurrency(data.initialPayment, 'KES', 'USD', exchangeRates)
        : data.initialPayment
      
      // Initialize Paystack payment
      const paymentResponse = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          amount: Math.round(paymentAmount * 100) / 100, // Round to 2 decimals for USD
          currency: currency,
          metadata: {
            payment_type: 'labs_web_services',
            order_id: data.orderId,
            items: data.items?.map((item: any) => item.name).join(', ') || 'Web services',
            original_amount_kes: data.initialPayment, // Store original KES amount
            payment_currency: currency,
          },
          customerName: name.trim() || email.split('@')[0],
          phone: phoneNumber || undefined,
        }),
      })

      const paymentData = await paymentResponse.json()

      if (paymentResponse.ok && paymentData.success && paymentData.reference) {
        let paystackPublicKey = ''
        try {
          const publicKeyResponse = await fetch('/api/paystack/public-key')
          const publicKeyData = await publicKeyResponse.json()
          if (publicKeyResponse.ok && publicKeyData.success && publicKeyData.publicKey) {
            paystackPublicKey = publicKeyData.publicKey
          } else {
            paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
          }
        } catch (error) {
          console.error('Error fetching public key:', error)
          paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''
        }

        if (!paystackPublicKey) {
          setError('Payment gateway not configured. Please contact support.')
          setProcessing(false)
          return
        }

        setPaymentData({
          publicKey: paystackPublicKey,
          email: email,
          amount: paymentAmount,
          currency: currency,
          reference: paymentData.reference,
          customerName: email.split('@')[0],
          phone: phoneNumber || undefined,
          orderId: data.orderId,
        })

        setShowPaymentModal(true)
      } else {
        setError(paymentData.error || 'Failed to initialize payment. Please try again.')
        setProcessing(false)
      }
    } catch (error: any) {
      console.error('Error processing checkout:', error)
      setError('Failed to process checkout. Please try again.')
      setProcessing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-baby-pink-light py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-display text-brown-dark mb-4">Checkout</h1>
          <p className="text-brown-dark/70 text-lg mb-8">Your cart is empty</p>
          <Link
            href="/labs/custom-website-builds"
            className="inline-block bg-brown-dark hover:bg-brown text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Browse Services
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-baby-pink-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-display text-brown-dark mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-semibold text-brown-dark mb-4">Order Summary</h2>
            {items.map((item) => {
              const hasSetupFee = item.billingPeriod === 'yearly' && item.setupFee && item.setupFee > 0
              const totalFirstPayment = hasSetupFee 
                ? (item.setupFee! * item.quantity) + (item.price * item.quantity)
                : item.price * item.quantity
              
              return (
                <div
                  key={item.productId}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-brown-dark">{item.name}</h3>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-600 hover:text-red-700 text-sm font-semibold px-2 py-1 hover:bg-red-50 rounded transition-colors"
                          title="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-brown-dark/70">Quantity:</span>
                        <div className="flex items-center border border-brown-light rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-3 py-1 text-brown-dark hover:bg-brown-light/30 text-sm font-semibold"
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="px-4 py-1 text-brown-dark font-semibold text-sm min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-3 py-1 text-brown-dark hover:bg-brown-light/30 text-sm font-semibold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {hasSetupFee && (
                        <div className="mt-2">
                          <span className="text-sm font-semibold text-brown-dark">Total First Payment:</span>
                          <span className="ml-2 text-lg font-bold text-brown-dark">
                            {getDisplayPrice(totalFirstPayment)}
                          </span>
                        </div>
                      )}
                      {item.billingPeriod === 'yearly' && !hasSetupFee && (
                        <div className="mt-2">
                          <span className="text-sm font-semibold text-brown-dark">Annual Subscription:</span>
                          <span className="ml-2 text-lg font-bold text-brown-dark">
                            {getDisplayPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      )}
                    </div>
                    {!hasSetupFee && (
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-brown-dark">
                          {getDisplayPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    )}
                  </div>
                  {hasSetupFee && (
                    <div className="space-y-2 pt-3 border-t border-brown-light">
                      <div className="flex justify-between text-sm">
                        <span className="text-brown-dark/70">Setup Fee (One-time):</span>
                        <span className="font-semibold text-brown-dark">
                          {getDisplayPrice(item.setupFee! * item.quantity)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brown-dark/70">Annual Subscription:</span>
                        <span className="font-semibold text-brown-dark">
                          {getDisplayPrice(item.price * item.quantity)}
                        </span>
                      </div>
                      <p className="text-xs text-brown-dark/60 mt-2 italic">
                        * Annual subscription will be billed yearly by Paystack after the first payment.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Priority Fee */}
            {timeline === 'urgent' && priorityFee > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-brown-dark">Priority Delivery</h3>
                    <p className="text-sm text-brown-dark/70">Less than 10 Days (Priority)</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brown-dark">
                      {getDisplayPrice(priorityFee)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Add More Services Link */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <Link
                href="/labs/custom-website-builds"
                className="inline-flex items-center gap-2 text-brown-dark hover:text-brown font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add More Services
              </Link>
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-8 sticky top-24">
              <h2 className="text-2xl font-semibold text-brown-dark mb-6">Payment Details</h2>

              {/* Required Services Warning */}
              {(() => {
                const missingRequiredServices = checkMissingRequiredServices()
                if (missingRequiredServices.length > 0) {
                  return (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <p className="text-sm font-semibold text-red-800 mb-2">
                        ⚠️ Required Services Missing
                      </p>
                      <p className="text-xs text-red-700 mb-2">
                        The following services must be added to your cart before checkout:
                      </p>
                      <ul className="list-disc list-inside text-xs text-red-700 mb-2 space-y-1">
                        {missingRequiredServices.map((serviceName) => (
                          <li key={serviceName}>{serviceName}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-red-700">
                        These services are required and cannot be purchased separately. If you'd like to discuss your options, please{' '}
                        <Link href="/labs/book-appointment" className="text-red-900 underline font-semibold hover:text-red-950">
                          book a consultation
                        </Link>
                        {' '}so we can determine the best way forward for your needs.
                      </p>
                    </div>
                  )
                }
                return null
              })()}

              {/* Minimum Cart Value Warning */}
              {(() => {
                // Check original cart total (before discount, including priority fee and domain pricing) against minimum
                // Show warning only if original total is below minimum (not if discount brought it below)
                const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
                const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
                const originalCartTotal = getTotalPrice() + urgentPriorityFee + domainFee
                const isBelowMinimum = originalCartTotal < minimumCartValue
                return isBelowMinimum ? (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      ⚠️ Minimum Order Required
                    </p>
                    <p className="text-xs text-red-700">
                      Your cart total is {formatCurrency(originalCartTotal)}. Minimum order value is {formatCurrency(minimumCartValue)}. Please add more items to proceed. Note: After applying a discount code, your final total may be below the minimum, which is allowed.
                    </p>
                  </div>
                ) : null
              })()}

              {checkoutData && (
                <div className="space-y-5 mb-6">
                  {/* Domain Pricing */}
                  {checkoutData.domainPricing && domainType === 'new' && (
                    <div className="bg-white border-2 border-brown-light rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-semibold text-brown-dark mb-3">Your Own Website Domain</h3>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-brown-dark/70">Setup Fee (One-time):</span>
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(checkoutData.domainPricing.setupFee)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-brown-dark/70">Annual Subscription:</span>
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(checkoutData.domainPricing.annualPrice)}
                            <span className="text-xs text-brown-dark/60 ml-1">
                              per year ({getDisplayPrice(Math.round(checkoutData.domainPricing.annualPrice / 12))}/month)
                            </span>
                          </span>
                        </div>
                        <div className="border-t border-brown-light pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-semibold text-brown-dark">Total First Payment:</span>
                            <span className="font-bold text-brown-dark text-lg">
                              {getDisplayPrice(checkoutData.domainPricing.totalFirstPayment)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-brown-dark/60 italic">
                        Your unique web address (e.g. {domainName || 'yourbusiness'}{domainExtension || '.co.ke'}) that people type to find you online.
                      </p>
                    </div>
                  )}
                  
                  {checkoutData.setupFeesTotal && checkoutData.setupFeesTotal > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-brown-dark/70">Setup Fees (One-time)</span>
                        <div className="text-right">
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(checkoutData.setupFeesTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> Annual subscriptions will be billed yearly by Paystack after this first payment.
                        </p>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-brown-dark/70">Subtotal</span>
                    <div className="text-right">
                      <span className="font-semibold text-brown-dark">
                        {getDisplayPrice(checkoutData.subtotal)}
                      </span>
                    </div>
                  </div>

                  {checkoutData.referralDiscount && checkoutData.referralDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="text-sm">
                        Discount {checkoutData.appliedReferralCode && `(${checkoutData.appliedReferralCode})`}
                      </span>
                      <span className="font-semibold text-sm">
                        -{getDisplayPrice(checkoutData.referralDiscount)}
                      </span>
                    </div>
                  )}

                  {checkoutData.remainingPayment > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Payment Plan:</strong>
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Initial Payment (Now):</span>
                          <div className="text-right">
                            <span className="font-semibold">
                              {getDisplayPrice(checkoutData.initialPayment)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining Balance:</span>
                          <div className="text-right">
                            <span className="font-semibold">
                              {getDisplayPrice(checkoutData.remainingPayment)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-blue-700 mt-2">
                          The remaining balance will be due before we send you your website details.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-brown-light pt-4">
                    <div className="flex justify-between text-lg mb-2">
                      <span className="font-semibold text-brown-dark">
                        {checkoutData.remainingPayment > 0 ? 'Pay Now' : 'Total'}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-brown-dark text-xl">
                          {getDisplayPrice(checkoutData.initialPayment)}
                        </span>
                      </div>
                    </div>
                    {checkoutData.setupFeesTotal && checkoutData.setupFeesTotal > 0 && (
                      <p className="text-xs text-brown-dark/60 italic mt-2">
                        This includes setup fees and first year subscription. Annual renewals will be billed automatically by Paystack.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!checkoutData && (
                <div className="space-y-5 mb-6">
                  {/* Domain Pricing Preview */}
                  {domainType === 'new' && domainPricing && (
                    <div className="bg-white border-2 border-brown-light rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-semibold text-brown-dark mb-3">Your Own Website Domain</h3>
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-brown-dark/70">Setup Fee (One-time):</span>
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(domainPricing.setupFee)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-brown-dark/70">Annual Subscription:</span>
                          <span className="font-semibold text-brown-dark">
                            {getDisplayPrice(domainPricing.annualPrice)}
                            <span className="text-xs text-brown-dark/60 ml-1">
                              per year ({getDisplayPrice(Math.round(domainPricing.annualPrice / 12))}/month)
                            </span>
                          </span>
                        </div>
                        <div className="border-t border-brown-light pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-semibold text-brown-dark">Total First Payment:</span>
                            <span className="font-bold text-brown-dark text-lg">
                              {getDisplayPrice(domainPricing.totalFirstPayment)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-brown-dark/60 italic">
                        Your unique web address (e.g. {domainName || 'yourbusiness'}{domainExtension || '.co.ke'}) that people type to find you online.
                      </p>
                    </div>
                  )}
                  
                  {timeline === 'urgent' && priorityFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-brown-dark/70">Priority Fee</span>
                      <div className="text-right">
                        <span className="font-semibold text-brown-dark">
                          {getDisplayPrice(priorityFee)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-brown-dark/70">Subtotal</span>
                    <div className="text-right">
                      <span className="font-semibold text-brown-dark">
                        {getDisplayPrice(
                          getTotalPrice() + 
                          (timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0) +
                          (domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0)
                        )}
                      </span>
                    </div>
                  </div>
                  {codeValid === true && calculatedDiscount > 0 && (
                    <div className="flex justify-between text-green-600 border-t border-brown-light pt-3">
                      <span className="text-sm">
                        Discount {referralCode && `(${referralCode})`}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-sm">
                          -{getDisplayPrice(calculatedDiscount)}
                        </span>
                      </div>
                    </div>
                  )}
                  {codeValid === true && calculatedDiscount > 0 && (
                    <div className="flex justify-between text-lg font-semibold border-t border-brown-dark pt-3">
                      <span className="text-brown-dark">Total</span>
                      <div className="text-right">
                        <span className="font-bold text-brown-dark">
                          {getDisplayPrice(
                            (getTotalPrice() + 
                            (timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0) +
                            (domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0)) - 
                            calculatedDiscount
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-dark mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="254712345678"
                    className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Discount Code Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-brown-dark mb-2">
                  Discount Code <span className="text-sm text-brown-dark/60">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase())
                      setCodeValid(null)
                      setCodeError(null)
                      setCalculatedDiscount(0)
                    }}
                    placeholder="Enter discount code"
                    disabled={codeValid === true}
                    className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none disabled:bg-brown-light/30 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!referralCode.trim()) {
                        setCodeError('Please enter a referral code')
                        return
                      }
                      
                      // Check minimum cart value BEFORE applying discount
                      // The cart must meet minimum before discount can be applied
                      // Include priority fee and domain pricing if applicable (they're part of original total before discount)
                      const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
                      const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
                      const originalCartTotal = getTotalPrice() + urgentPriorityFee + domainFee
                      if (originalCartTotal < minimumCartValue) {
                        setCodeError(`Your cart total (${formatCurrency(originalCartTotal)}) must meet the minimum order value (${formatCurrency(minimumCartValue)}) before applying a discount code. Please add more items to your cart first.`)
                        setCodeValid(false)
                        return
                      }
                      
                      setValidatingCode(true)
                      setCodeError(null)
                      setCodeValid(null)
                      setCalculatedDiscount(0)
                      try {
                        // Calculate original cart total (including priority fee and domain pricing) for validation
                        const urgentPriorityFee = timeline === 'urgent' && priorityFee > 0 ? priorityFee : 0
                        const domainFee = domainType === 'new' && domainPricing ? domainPricing.totalFirstPayment : 0
                        const originalTotal = getTotalPrice() + urgentPriorityFee + domainFee
                        
                        // Validate discount code using new discount code API
                        const validateUrl = new URL('/api/labs/web-services/validate-discount', window.location.origin)
                        validateUrl.searchParams.set('code', referralCode.trim().toUpperCase())
                        validateUrl.searchParams.set('email', email || '')
                        validateUrl.searchParams.set('cartTotal', originalTotal.toString())
                        
                        const response = await fetch(validateUrl.toString())
                        const data = await response.json()
                        
                        if (data.valid) {
                          setCodeValid(true)
                          setCodeError(null)
                          // Use the discount amount calculated by the API
                          setCalculatedDiscount(data.discountAmount || 0)
                        } else {
                          setCodeValid(false)
                          setCodeError(data.error || 'Invalid discount code')
                          setCalculatedDiscount(0)
                        }
                      } catch (error) {
                        setCodeValid(false)
                        setCodeError('Failed to validate code. Please try again.')
                        setCalculatedDiscount(0)
                      } finally {
                        setValidatingCode(false)
                      }
                    }}
                    disabled={validatingCode || !referralCode.trim() || codeValid === true}
                    className="px-4 py-2 bg-brown-light hover:bg-brown text-brown-dark font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {validatingCode ? 'Checking...' : codeValid === true ? 'Applied' : 'Apply'}
                  </button>
                  {codeValid === true && (
                    <button
                      type="button"
                      onClick={() => {
                        setReferralCode('')
                        setCodeValid(null)
                        setCodeError(null)
                        setCalculatedDiscount(0)
                      }}
                      className="px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                      title="Remove code"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {codeValid === true && (
                  <p className="text-sm text-green-600 mt-2">✓ Discount code applied successfully! Your discount will be applied at checkout.</p>
                )}
                {codeError && (
                  <p className="text-sm text-red-600 mt-2">{codeError}</p>
                )}
              </div>

              {/* Website Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-brown-dark mb-3">
                  Website Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    websiteType === 'business' 
                      ? 'border-brown-dark bg-brown-light/30' 
                      : 'border-brown-light hover:border-brown-dark/50'
                  }`}>
                    <input
                      type="radio"
                      name="websiteType"
                      value="business"
                      checked={websiteType === 'business'}
                      onChange={(e) => setWebsiteType('business')}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-brown-dark mb-1">Business</span>
                    <span className="text-xs text-brown-dark/70 text-center">For businesses and organizations</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    websiteType === 'personal' 
                      ? 'border-brown-dark bg-brown-light/30' 
                      : 'border-brown-light hover:border-brown-dark/50'
                  }`}>
                    <input
                      type="radio"
                      name="websiteType"
                      value="personal"
                      checked={websiteType === 'personal'}
                      onChange={(e) => setWebsiteType('personal')}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-brown-dark mb-1">Personal</span>
                    <span className="text-xs text-brown-dark/70 text-center">For personal use or portfolios</span>
                  </label>
                </div>
              </div>

              {/* Business Details Section */}
              {enableBusinessInfo && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-brown-dark mb-4">
                  {websiteType === 'business' ? 'Business Information' : 'Website Information'}
                </h3>
                
                <div className="space-y-4 mb-6">
                  {/* Business Name - Only for business websites */}
                  {websiteType === 'business' && (
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your Business Name"
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                    />
                  </div>
                  )}

                  {/* Domain Selection */}
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Domain <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="domainType"
                            value="new"
                            checked={domainType === 'new'}
                            onChange={(e) => setDomainType('new')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">New Domain</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="domainType"
                            value="existing"
                            checked={domainType === 'existing'}
                            onChange={(e) => setDomainType('existing')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">I Have My Own Domain</span>
                        </label>
                      </div>

                      {domainType === 'new' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={domainName}
                            onChange={(e) => setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="yourbusiness"
                            className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                          />
                          <select
                            value={domainExtension}
                            onChange={(e) => setDomainExtension(e.target.value)}
                            className="rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                          >
                            <option value=".co.ke">.co.ke</option>
                            <option value=".com">.com</option>
                            <option value=".org">.org</option>
                            <option value=".net">.net</option>
                            <option value=".info">.info</option>
                            <option value=".ke">.ke</option>
                          </select>
                          <div className="flex items-center px-3 text-sm text-brown-dark/70">
                            {domainName && domainExtension && (
                              <span>{domainName}{domainExtension}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={existingDomain}
                          onChange={(e) => setExistingDomain(e.target.value)}
                          placeholder="example.com"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Logo Options */}
                  <div>
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Logo <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="logoType"
                            value="upload"
                            checked={logoType === 'upload'}
                            onChange={(e) => handleLogoTypeChange('upload')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">I Have My Own Logo</span>
                        </label>
                        {logoType === 'upload' && (
                          <div className="ml-6 space-y-2">
                            <input
                              type="file"
                              accept=".png,.pdf,image/png,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  // Validate file type
                                  const validTypes = ['image/png', 'application/pdf']
                                  const validExtensions = ['.png', '.pdf']
                                  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
                                  
                                  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                                    setError('Please upload a PNG or PDF file')
                                    return
                                  }
                                  
                                  setLogoFile(file)
                                  handleLogoUpload(file)
                                }
                              }}
                              className="text-sm text-brown-dark"
                              disabled={uploadingLogo}
                            />
                            <p className="text-xs text-brown-dark/70 mt-1">Accepted formats: PNG or PDF</p>
                            {uploadingLogo && (
                              <p className="text-xs text-brown-dark/70">Uploading...</p>
                            )}
                            {logoUrl && (
                              <div className="mt-2">
                                <img src={logoUrl} alt="Logo preview" className="max-h-20 max-w-32 object-contain" />
                                <p className="text-xs text-green-600 mt-1">✓ Logo uploaded successfully</p>
                              </div>
                            )}
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="logoType"
                            value="text"
                            checked={logoType === 'text'}
                            onChange={(e) => handleLogoTypeChange('text')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">Text Logo (Free)</span>
                        </label>
                        {logoType === 'text' && (
                          <div className="ml-6">
                            <input
                              type="text"
                              value={logoText}
                              onChange={(e) => setLogoText(e.target.value)}
                              placeholder={websiteType === 'business' ? (businessName || "Your Business Name") : (name || "Your Name")}
                              className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                            />
                            <p className="text-xs text-brown-dark/70 mt-1">This will be displayed as text on your website</p>
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="logoType"
                            value="custom"
                            checked={logoType === 'custom'}
                            onChange={(e) => handleLogoTypeChange('custom')}
                            className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                          />
                          <span className="text-sm text-brown-dark">Custom Logo Design (Extra Fee)</span>
                        </label>
                            {logoType === 'custom' && (
                          <div className="ml-6">
                            {showLogoDesignSuggestion ? (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800 mb-2">
                                  <strong>Logo Design Service Required</strong>
                                </p>
                                <p className="text-xs text-blue-700 mb-3">
                                  To get a custom logo designed, please add the "Logo Design" service to your cart first.
                                </p>
                                <Link
                                  href="/labs/custom-website-builds"
                                  className="inline-block text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                                >
                                  Add Logo Design Service
                                </Link>
                              </div>
                            ) : (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700">
                                  ✓ Logo Design service found in cart
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Color Options */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Website Colors <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-4">
                      Choose the primary and secondary colors for your website theme
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-brown-dark mb-2">
                          Primary Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-12 w-20 rounded-lg border-2 border-brown-light cursor-pointer"
                          />
                          <input
                            type="text"
                            value={primaryColor}
                            onChange={(e) => {
                              const value = e.target.value
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                setPrimaryColor(value.length === 7 ? value : value.padEnd(7, '0'))
                              }
                            }}
                            placeholder="#7C4B31"
                            className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark mb-2">
                          Secondary Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="h-12 w-20 rounded-lg border-2 border-brown-light cursor-pointer"
                          />
                          <input
                            type="text"
                            value={secondaryColor}
                            onChange={(e) => {
                              const value = e.target.value
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                setSecondaryColor(value.length === 7 ? value : value.padEnd(7, '0'))
                              }
                            }}
                            placeholder="#F3E6DC"
                            className="flex-1 rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border-2 border-brown-light"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <span className="text-xs text-brown-dark/70">Primary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border-2 border-brown-light"
                          style={{ backgroundColor: secondaryColor }}
                        />
                        <span className="text-xs text-brown-dark/70">Secondary</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Description - For business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Description <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-2">
                      Tell us about your business. This will be used for your About page and homepage.
                    </p>
                    <textarea
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="Describe your business, what you do, your mission, and what makes you unique..."
                      rows={5}
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none resize-y"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">
                      {businessDescription.length} characters (recommended: 200-500 characters)
                    </p>
                  </div>
                  )}

                  {/* Personal Website About - For personal websites */}
                  {websiteType === 'personal' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      What is the website about? <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-2">
                      Tell us about your website. This will be used for your About page and homepage.
                    </p>
                    <textarea
                      value={personalWebsiteAbout}
                      onChange={(e) => setPersonalWebsiteAbout(e.target.value)}
                      placeholder="Describe what your website is about, your interests, projects, or what you want to share..."
                      rows={5}
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none resize-y"
                    />
                    <p className="text-xs text-brown-dark/60 mt-1">
                      {personalWebsiteAbout.length} characters (recommended: 200-500 characters)
                    </p>
                  </div>
                  )}

                  {/* Business Address - Only for business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Address <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="Street Address"
                        required
                        className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={businessCity}
                          onChange={(e) => setBusinessCity(e.target.value)}
                          placeholder="City"
                          required
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                        <input
                          type="text"
                          value={businessCountry}
                          onChange={(e) => setBusinessCountry(e.target.value)}
                          placeholder="Country"
                          required
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Business Hours - Only for business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Business Hours <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-3">
                      Set your operating hours for each day of the week
                    </p>
                    <div className="space-y-2">
                      {businessHours.map((day, index) => (
                        <div key={day.day} className="flex items-center gap-3 p-2 bg-brown-light/20 rounded-lg">
                          <div className="w-24 text-sm font-medium text-brown-dark">
                            {day.day}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!day.closed}
                              onChange={(e) => {
                                const updated = [...businessHours]
                                updated[index].closed = !e.target.checked
                                setBusinessHours(updated)
                              }}
                              className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                            />
                            <span className="text-xs text-brown-dark/70">Open</span>
                          </label>
                          {!day.closed && (
                            <>
                              <input
                                type="time"
                                value={day.open}
                                onChange={(e) => {
                                  const updated = [...businessHours]
                                  updated[index].open = e.target.value
                                  setBusinessHours(updated)
                                }}
                                className="flex-1 rounded-lg border-2 border-brown-light bg-white px-2 py-1 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                              />
                              <span className="text-brown-dark/70">to</span>
                              <input
                                type="time"
                                value={day.close}
                                onChange={(e) => {
                                  const updated = [...businessHours]
                                  updated[index].close = e.target.value
                                  setBusinessHours(updated)
                                }}
                                className="flex-1 rounded-lg border-2 border-brown-light bg-white px-2 py-1 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                              />
                            </>
                          )}
                          {day.closed && (
                            <span className="text-sm text-brown-dark/60 italic">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Services/Products List - Only for business websites */}
                  {websiteType === 'business' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Services/Products <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-2">
                      List the services or products you offer. One per line or separated by commas.
                    </p>
                    <textarea
                      value={servicesProducts}
                      onChange={(e) => setServicesProducts(e.target.value)}
                      placeholder="Service 1&#10;Service 2&#10;Service 3&#10;Or: Service 1, Service 2, Service 3"
                      rows={4}
                      required
                      className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none resize-y"
                    />
                  </div>
                  )}

                  {/* Social Media Links */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Social Media Links
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-3">
                      Add your social media profiles (optional but recommended)
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          Facebook
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.facebook}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, facebook: e.target.value })}
                          placeholder="https://facebook.com/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          Instagram
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.instagram}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, instagram: e.target.value })}
                          placeholder="https://instagram.com/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          Twitter/X
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.twitter}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, twitter: e.target.value })}
                          placeholder="https://twitter.com/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          LinkedIn
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.linkedin}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/company/yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          YouTube
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.youtube}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, youtube: e.target.value })}
                          placeholder="https://youtube.com/@yourchannel"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brown-dark/70 mb-1">
                          TikTok
                        </label>
                        <input
                          type="url"
                          value={socialMediaLinks.tiktok}
                          onChange={(e) => setSocialMediaLinks({ ...socialMediaLinks, tiktok: e.target.value })}
                          placeholder="https://tiktok.com/@yourpage"
                          className="w-full rounded-lg border-2 border-brown-light bg-white px-3 py-2 text-sm text-brown-dark focus:border-brown-dark focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeline/Deadline */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-brown-dark mb-2">
                      Timeline/Deadline <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-brown-dark/70 mb-3">
                      When do you need your website completed?
                    </p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border-2 border-brown-light rounded-lg cursor-pointer hover:border-brown-dark transition-colors">
                        <input
                          type="radio"
                          name="timeline"
                          value="21"
                          checked={timeline === '21'}
                          onChange={(e) => setTimeline('21')}
                          className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-brown-dark">21 Days (Standard)</span>
                          <p className="text-xs text-brown-dark/70">Standard delivery time</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border-2 border-brown-light rounded-lg cursor-pointer hover:border-brown-dark transition-colors">
                        <input
                          type="radio"
                          name="timeline"
                          value="10"
                          checked={timeline === '10'}
                          onChange={(e) => setTimeline('10')}
                          className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-brown-dark">10 Days (Fast Track)</span>
                          <p className="text-xs text-brown-dark/70">Faster delivery</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border-2 border-brown-light rounded-lg cursor-pointer hover:border-brown-dark transition-colors">
                        <input
                          type="radio"
                          name="timeline"
                          value="urgent"
                          checked={timeline === 'urgent'}
                          onChange={(e) => setTimeline('urgent')}
                          className="h-4 w-4 text-brown-dark focus:ring-brown-dark"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-brown-dark">Less than 10 Days (Priority)</span>
                          <p className="text-xs text-brown-dark/70">Urgent delivery</p>
                        </div>
                      </label>
                      {timeline === 'urgent' && (
                        <div className="ml-7 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Priority Fee:</strong> Highly prioritized websites require an additional fee of{' '}
                            <strong>{formatCurrency(priorityFee)}</strong> to ensure fast delivery.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={processing || !name.trim() || !email.trim() || !phoneNumber.trim() || checkMissingRequiredServices().length > 0}
                className="w-full bg-brown-dark hover:bg-brown text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : checkoutData ? 'Proceed to Payment' : 'Calculate Payment'}
              </button>
              {checkMissingRequiredServices().length > 0 && (
                <p className="text-xs text-red-600 mt-2 text-center">
                  Please add all required services to your cart before proceeding.
                </p>
              )}

              <Link
                href="/labs/custom-website-builds"
                className="block text-center text-brown-dark/70 hover:text-brown-dark mt-4 text-sm"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Paystack Inline Payment Modal */}
      {showPaymentModal && paymentData && (
        <PaystackInlinePayment
          publicKey={paymentData.publicKey}
          email={paymentData.email}
          amount={paymentData.amount}
          currency={paymentData.currency}
          reference={paymentData.reference}
          customerName={paymentData.customerName}
          phone={paymentData.phone}
          metadata={{
            payment_type: 'labs_web_services',
            order_id: paymentData.orderId,
          }}
          onSuccess={async (reference) => {
            setShowPaymentModal(false)
            setProcessing(true)

            try {
              const verifyResponse = await fetch(`/api/paystack/verify?reference=${reference}`)
              const verifyData = await verifyResponse.json()

              if (verifyResponse.ok && verifyData.success) {
                clearCart()
                router.push(`/payment/success?reference=${reference}&payment_type=labs_web_services&amount=${paymentData.amount}&currency=KES`)
              } else {
                setError(verifyData.error || 'Payment verification failed. Please contact support.')
                setProcessing(false)
              }
            } catch (error) {
              console.error('Error verifying payment:', error)
              setError('Error verifying payment. Please contact support.')
              setProcessing(false)
            }
          }}
          onClose={() => {
            setShowPaymentModal(false)
            setPaymentData(null)
            setProcessing(false)
          }}
        />
      )}
    </div>
  )
}

function LabsCheckoutContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-baby-pink-light flex items-center justify-center">
        <div className="text-brown text-xl">Loading checkout...</div>
      </div>
    }>
      <LabsCheckoutContentInner />
    </Suspense>
  )
}

export default function LabsCheckout() {
  return <LabsCheckoutContent />
}



