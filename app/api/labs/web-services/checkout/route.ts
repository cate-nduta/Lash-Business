import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: 'domain' | 'hosting' | 'page' | 'feature' | 'email' | 'design' | 'marketing' | 'other'
  imageUrl?: string
  isRequired?: boolean
  discount?: number
  discountAmount?: number
  requiredServices?: string[] // Array of service IDs that must be bought together
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  billingPeriod?: 'one-time' | 'yearly' | 'monthly'
  setupFee?: number // One-time setup fee for annually billed services
}

interface WebServicesData {
  services: WebService[]
  domainPricing?: {
    setupFee: number
    annualPrice: number
    totalFirstPayment: number
  }
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
  taxPercentage?: number // VAT/Tax percentage (e.g., 16 for 16% VAT)
}

interface Order {
  id: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
    billingPeriod?: 'one-time' | 'yearly' | 'monthly'
    setupFee?: number
  }>
  subtotal: number
  setupFeesTotal: number // Total of all setup fees
  referralDiscount?: number
  appliedReferralCode?: string
  taxAmount?: number // Tax/VAT amount
  taxPercentage?: number // Tax/VAT percentage
  total: number
  initialPayment: number
  remainingPayment: number
  paymentStatus: 'pending' | 'partial' | 'completed'
  name: string
  email: string
  phoneNumber: string
  websiteType?: 'personal' | 'business' // Website type: personal or business
  businessName?: string
  domainType?: 'new' | 'existing'
  domainExtension?: string // .co.ke, .com, etc.
  domainName?: string // The domain name without extension
  existingDomain?: string // Full existing domain if they have one
  logoType?: 'upload' | 'text' | 'custom'
  logoUrl?: string // URL if uploaded
  logoText?: string // Text for text logo
  primaryColor?: string // Primary color for website theme
  secondaryColor?: string // Secondary color for website theme
  businessDescription?: string // Business description/about (for business websites)
  personalWebsiteAbout?: string // Website about/description (for personal websites)
  businessAddress?: string // Street address
  businessCity?: string // City
  businessCountry?: string // Country
  businessHours?: Array<{
    day: string
    open: string
    close: string
    closed: boolean
  }> // Business hours for each day
  servicesProducts?: string // List of services/products
  socialMediaLinks?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
    youtube?: string
    tiktok?: string
  } // Social media links
  timeline?: '10' | '21' | 'urgent' // Timeline/deadline selection
  priorityFee?: number // Priority fee if urgent timeline selected
  consultationDate?: string // Selected consultation date (YYYY-MM-DD format)
  consultationTimeSlot?: string // Selected consultation time slot (ISO string)
  consultationMeetingType?: 'online' | 'phone' // Meeting type: 'online' for Google Meet, 'phone' for Phone/WhatsApp Call
  domainPricing?: {
    setupFee: number
    annualPrice: number
    totalFirstPayment: number
  } // Domain pricing if new domain is selected
  createdAt: string
  websiteName?: string
  websiteUrl?: string
  meetingLink?: string
  status: 'pending' | 'in_progress' | 'completed' | 'delivered'
  adminNotes?: string
}

// Smart cart logic
function applySmartCartRules(
  items: CartItem[],
  services: WebService[],
  cartRules: WebServicesData['cartRules']
): CartItem[] {
  const updatedItems = [...items]
  const serviceMap = new Map(services.map((s) => [s.id, s]))

  // Check if hosting exists
  const hasHosting = updatedItems.some((item) => {
    const service = serviceMap.get(item.productId)
    return service?.category === 'hosting'
  })

  // Check if domain exists
  const hasDomain = updatedItems.some((item) => {
    const service = serviceMap.get(item.productId)
    return service?.category === 'domain'
  })

  // Auto-add domain/hosting if not present
  if (cartRules.autoAddDomainHosting && !hasHosting && !hasDomain) {
    let hostingService: WebService | undefined
    
    // Use configured product ID if available
    if (cartRules.autoAddDomainHostingProductId) {
      hostingService = services.find((s) => s.id === cartRules.autoAddDomainHostingProductId)
    }
    
    // Fallback to finding by category if no specific product ID
    if (!hostingService) {
      hostingService = services.find((s) => s.category === 'hosting' && s.isRequired)
    }
    
    if (hostingService && !updatedItems.some((item) => item.productId === hostingService!.id)) {
      updatedItems.push({
        productId: hostingService.id,
        name: hostingService.name,
        price: hostingService.price,
        quantity: 1,
      })
    }
  }

  // Count pages
  const pageCount = updatedItems.filter((item) => {
    const service = serviceMap.get(item.productId)
    return service?.category === 'page'
  }).length

  // Auto-add contact form if multiple pages
  if (cartRules.autoAddContactForm && pageCount > 1) {
    let contactFormService: WebService | undefined
    
    // Use configured product ID if available
    if (cartRules.autoAddContactFormProductId) {
      contactFormService = services.find((s) => s.id === cartRules.autoAddContactFormProductId)
    }
    
    // Fallback to finding by name/category if no specific product ID
    if (!contactFormService) {
      contactFormService = services.find(
        (s) => s.name.toLowerCase().includes('contact') && s.category === 'feature'
      )
    }
    
    if (contactFormService && !updatedItems.some((item) => item.productId === contactFormService!.id)) {
      updatedItems.push({
        productId: contactFormService.id,
        name: contactFormService.name,
        price: contactFormService.price,
        quantity: 1,
      })
    }
  }

  return updatedItems
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      items,
      websiteType, // 'personal' or 'business'
      name,
      email,
      phoneNumber,
      businessName,
      domainType,
      domainExtension,
      domainName,
      existingDomain,
      logoType,
      logoUrl,
      logoText,
      primaryColor,
      secondaryColor,
      businessDescription,
      personalWebsiteAbout, // For personal websites
      businessAddress,
      businessCity,
      businessCountry,
      businessHours,
      servicesProducts,
      socialMediaLinks,
      timeline,
      priorityFee,
      referralCode, // Optional referral/discount code
      consultationDate, // Consultation call date (YYYY-MM-DD format)
      consultationTimeSlot, // Consultation call time slot (ISO string)
      consultationMeetingType, // Meeting type: 'online' for Google Meet, 'phone' for Phone/WhatsApp Call
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Validate consultation date, time slot, and meeting type if provided
    if (consultationDate && consultationTimeSlot && !consultationMeetingType) {
      return NextResponse.json({ error: 'Consultation meeting type is required when date and time are provided' }, { status: 400 })
    }
    
    if (consultationDate && consultationTimeSlot && consultationMeetingType) {
      // Check if this time slot is already booked
      const consultationsData = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
      const showcaseBookings = await readDataFile<any[]>('labs-showcase-bookings.json', [])
      
      // Normalize time for comparison - handles various formats consistently
      const normalizeTimeForComparison = (timeStr: string): string => {
        if (!timeStr) return ''
        // Extract time from ISO string (e.g., "2024-01-15T09:30:00+03:00" -> "9:30 am")
        // Or normalize label format (e.g., "9:30 AM" -> "9:30 am")
        try {
          // Try parsing as ISO string first
          if (timeStr.includes('T')) {
            const date = new Date(timeStr)
            if (!isNaN(date.getTime())) {
              const hours = date.getHours()
              const minutes = date.getMinutes()
              const ampm = hours >= 12 ? 'pm' : 'am'
              const displayHours = hours % 12 || 12
              const displayMinutes = String(minutes).padStart(2, '0')
              return `${displayHours}:${displayMinutes} ${ampm}`
            }
          }
          // Try parsing label format (e.g., "9:30 AM", "09:30 AM", "9:30AM")
          const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
          if (match) {
            let hour = parseInt(match[1], 10)
            const minute = match[2]
            const ampm = match[3]?.toLowerCase() || 'am'
            return `${hour}:${minute} ${ampm}`
          }
          // Fallback: just lowercase and trim
          return timeStr.toLowerCase().trim().replace(/\s+/g, ' ')
        } catch {
          return timeStr.toLowerCase().trim().replace(/\s+/g, ' ')
        }
      }
      
      const selectedDateStr = consultationDate // Already in YYYY-MM-DD format
      const selectedTimeLabel = normalizeTimeForComparison(consultationTimeSlot)
      
      // Check consultations for conflicts
      const hasConsultationConflict = consultationsData.consultations.some((consultation: any) => {
        if (!consultation.preferredDate || !consultation.preferredTime) return false
        const status = consultation.status?.toLowerCase()
        // Block ALL non-cancelled consultations to prevent double booking
        if (status === 'cancelled') return false
        
        const consultationDate = consultation.preferredDate.split('T')[0] || consultation.preferredDate
        const consultationTime = normalizeTimeForComparison(consultation.preferredTime)
        
        return consultationDate === selectedDateStr && consultationTime === selectedTimeLabel
      })
      
      // Check showcase bookings for conflicts
      const hasShowcaseConflict = showcaseBookings.some((booking: any) => {
        if (!booking.appointmentDate || !booking.appointmentTime) return false
        const status = booking.status?.toLowerCase()
        // Block ALL non-cancelled bookings to prevent double booking
        if (status === 'cancelled') return false
        
        // Parse appointment date to YYYY-MM-DD format
        let appointmentDateStr: string
        if (typeof booking.appointmentDate === 'string') {
          if (booking.appointmentDate.includes('T')) {
            appointmentDateStr = booking.appointmentDate.split('T')[0]
          } else {
            appointmentDateStr = booking.appointmentDate
          }
        } else {
          appointmentDateStr = new Date(booking.appointmentDate).toISOString().split('T')[0]
        }
        
        const bookingTime = normalizeTimeForComparison(booking.appointmentTime)
        
        return appointmentDateStr === selectedDateStr && bookingTime === selectedTimeLabel
      })
      
      if (hasConsultationConflict || hasShowcaseConflict) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select another date or time.' },
          { status: 409 }
        )
      }
    }

    // Load web services data
    const webServicesData = await readDataFile<WebServicesData>('labs-web-services.json', {
      services: [],
      domainPricing: {
        setupFee: 4000,
        annualPrice: 2000,
        totalFirstPayment: 6000,
      },
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
    })

    // Check capacity before processing
    const capacityResponse = await fetch(new URL('/api/labs/web-services/capacity', request.url), {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    if (capacityResponse.ok) {
      const capacityData = await capacityResponse.json()
      if (capacityData.isCapacityReached) {
        return NextResponse.json(
          {
            error: 'Monthly capacity reached. All available slots for this month are currently filled. New web service orders will reopen next month.',
          },
          { status: 400 }
        )
      }
    }

    // Apply smart cart rules
    const finalItems = applySmartCartRules(items, webServicesData.services, webServicesData.cartRules)

    // Check for required services (recursively to handle nested requirements)
    const cartItemIds = finalItems.map(item => item.productId)
    const missingRequiredServices: string[] = []
    
    // Recursive function to check all required services (including nested requirements)
    const checkRequiredServices = (serviceId: string, visited: Set<string>) => {
      if (visited.has(serviceId)) return // Prevent infinite loops
      visited.add(serviceId)
      
      const service = webServicesData.services.find(s => s.id === serviceId)
      if (!service || !service.requiredServices) return
      
      for (const requiredId of service.requiredServices) {
        if (!cartItemIds.includes(requiredId)) {
          const requiredService = webServicesData.services.find(s => s.id === requiredId)
          if (requiredService && !missingRequiredServices.includes(requiredService.name)) {
            missingRequiredServices.push(requiredService.name)
          }
          // Recursively check if this required service itself has required services
          checkRequiredServices(requiredId, visited)
        } else {
          // If the required service is in cart, check if it has its own required services
          const requiredService = webServicesData.services.find(s => s.id === requiredId)
          if (requiredService) {
            checkRequiredServices(requiredId, visited)
          }
        }
      }
    }
    
    // Check all items in cart for required services
    // Use a separate visited set for each top-level item to avoid cross-contamination
    for (const item of finalItems) {
      const itemVisited = new Set<string>()
      checkRequiredServices(item.productId, itemVisited)
    }
    
    if (missingRequiredServices.length > 0) {
      return NextResponse.json(
        {
          error: `The following required services must be added to your cart before checkout: ${missingRequiredServices.join(', ')}. These services are required and cannot be purchased separately. If you'd like to discuss your options, please book a consultation at lashdiary.co.ke/labs/book-appointment.`,
        },
        { status: 400 }
      )
    }

    // Calculate setup fees total (for yearly services with setup fees)
    let setupFeesTotal = finalItems.reduce((sum, item) => {
      if (item.billingPeriod === 'yearly' && item.setupFee) {
        return sum + (item.setupFee * item.quantity)
      }
      return sum
    }, 0)

    // Add domain pricing if "New Domain" is selected
    let domainSetupFee = 0
    let domainAnnualPrice = 0
    let domainTotalFirstPayment = 0
    if (domainType === 'new' && webServicesData.domainPricing) {
      domainSetupFee = webServicesData.domainPricing.setupFee || 4000
      domainAnnualPrice = webServicesData.domainPricing.annualPrice || 2000
      domainTotalFirstPayment = webServicesData.domainPricing.totalFirstPayment || (domainSetupFee + domainAnnualPrice)
      setupFeesTotal += domainSetupFee
    }

    // Calculate original subtotal (annual subscription prices + setup fees, before discount and priority fee)
    let originalSubtotal = finalItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    originalSubtotal += setupFeesTotal
    
    // Add domain annual subscription price if "New Domain" is selected (in addition to setup fee)
    if (domainType === 'new' && domainAnnualPrice > 0) {
      originalSubtotal += domainAnnualPrice
    }
    
    // Add priority fee if urgent timeline is selected
    const urgentPriorityFee = timeline === 'urgent' && priorityFee ? priorityFee : 0
    originalSubtotal += urgentPriorityFee

    // Check minimum cart value (before discount, but after priority fee)
    if (originalSubtotal < webServicesData.cartRules.minimumCartValue) {
      return NextResponse.json(
        {
          error: `Minimum order value is ${webServicesData.cartRules.minimumCartValue.toLocaleString()} KES. Your cart total is ${originalSubtotal.toLocaleString()} KES.`,
        },
        { status: 400 }
      )
    }

    // Apply discount code if provided (check both referral codes and spin wheel codes)
    let referralDiscount = 0
    let appliedReferralCode: string | null = null
    let discountServiceName: string | null = null // Name of the service that was discounted
    let discountServicePercentage: number | null = null // Percentage discount applied to the service
    
    if (referralCode && referralCode.trim()) {
      const codeToCheck = referralCode.trim().toUpperCase()
      
      // First check if it's a spin wheel code
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url.split('/api')[0]
        const spinWheelUrl = new URL('/api/labs/spin-wheel/validate-code', baseUrl)
        spinWheelUrl.searchParams.set('code', codeToCheck)
        spinWheelUrl.searchParams.set('email', email)
        spinWheelUrl.searchParams.set('context', 'checkout')
        
        const spinWheelResponse = await fetch(spinWheelUrl.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        
          if (spinWheelResponse.ok) {
            const spinWheelData = await spinWheelResponse.json()
            if (spinWheelData.valid) {
              if (spinWheelData.prize.type === 'discount_percentage' && spinWheelData.prize.value) {
                // Check if discount applies to a specific service or entire cart
                const discountServiceId = spinWheelData.prize.discountServiceId || spinWheelData.prize.serviceType
                const discountPercentage = spinWheelData.prize.value
                
                if (discountServiceId) {
                  // Discount applies to a specific service
                  const serviceIndex = finalItems.findIndex(item => item.productId === discountServiceId)
                  if (serviceIndex !== -1) {
                    // Get service name for display
                    const service = webServicesData.services.find(s => s.id === discountServiceId)
                    discountServiceName = service?.name || finalItems[serviceIndex].name || 'Service'
                    discountServicePercentage = discountPercentage
                    
                    // Calculate discount for this specific service
                    const servicePrice = finalItems[serviceIndex].price * finalItems[serviceIndex].quantity
                    const serviceSetupFee = (finalItems[serviceIndex].setupFee || 0) * finalItems[serviceIndex].quantity
                    const serviceTotal = servicePrice + serviceSetupFee
                    const serviceDiscount = Math.round(serviceTotal * (discountPercentage / 100))
                    
                    referralDiscount = serviceDiscount
                    appliedReferralCode = codeToCheck
                    
                    // Apply discount to the service (reduce price proportionally)
                    const originalServicePrice = finalItems[serviceIndex].price
                    const originalServiceSetupFee = finalItems[serviceIndex].setupFee || 0
                    const discountedServicePrice = Math.max(0, Math.round(originalServicePrice * (1 - discountPercentage / 100)))
                    const discountedServiceSetupFee = Math.max(0, Math.round(originalServiceSetupFee * (1 - discountPercentage / 100)))
                    
                    finalItems[serviceIndex] = {
                      ...finalItems[serviceIndex],
                      price: discountedServicePrice,
                      setupFee: discountedServiceSetupFee,
                    }
                    
                    // Recalculate setup fees total after discounting service
                    setupFeesTotal = finalItems.reduce((sum, item) => {
                      if (item.billingPeriod === 'yearly' && item.setupFee) {
                        return sum + (item.setupFee * item.quantity)
                      }
                      return sum
                    }, 0)
                    if (domainType === 'new' && webServicesData.domainPricing) {
                      setupFeesTotal += domainSetupFee
                    }
                    
                    // Recalculate subtotal after discounting service
                    originalSubtotal = finalItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    originalSubtotal += setupFeesTotal
                    if (domainType === 'new' && domainAnnualPrice > 0) {
                      originalSubtotal += domainAnnualPrice
                    }
                    originalSubtotal += urgentPriorityFee
                  } else {
                    // Service not in cart - return error
                    return NextResponse.json(
                      { error: `This code is for a ${discountPercentage}% discount on ${spinWheelData.prize.label || 'a specific service'}, but that service is not in your cart. Please add it first.` },
                      { status: 400 }
                    )
                  }
                } else {
                  // Discount applies to entire cart
                  referralDiscount = Math.round(originalSubtotal * (discountPercentage / 100))
                  appliedReferralCode = codeToCheck
                }
              } else if (spinWheelData.prize.type === 'free_service') {
                // Free service prize - find the service in cart and make it free
                const freeServiceId = spinWheelData.prize.freeServiceId || spinWheelData.prize.serviceType
                if (freeServiceId) {
                  // Find the service in the cart and set its price to 0
                  const serviceIndex = finalItems.findIndex(item => item.productId === freeServiceId)
                  if (serviceIndex !== -1) {
                    // Calculate the discount amount (price of the free service before making it free)
                    const freeServicePrice = finalItems[serviceIndex].price * finalItems[serviceIndex].quantity
                    // If it has a setup fee, include that too
                    const freeServiceSetupFee = (finalItems[serviceIndex].setupFee || 0) * finalItems[serviceIndex].quantity
                    referralDiscount = freeServicePrice + freeServiceSetupFee
                    appliedReferralCode = codeToCheck
                    
                    // Set the service price to 0 in the items array
                    finalItems[serviceIndex] = {
                      ...finalItems[serviceIndex],
                      price: 0,
                      setupFee: 0,
                    }
                    
                    // Recalculate setup fees total after making service free
                    setupFeesTotal = finalItems.reduce((sum, item) => {
                      if (item.billingPeriod === 'yearly' && item.setupFee) {
                        return sum + (item.setupFee * item.quantity)
                      }
                      return sum
                    }, 0)
                    if (domainType === 'new' && webServicesData.domainPricing) {
                      setupFeesTotal += domainSetupFee
                    }
                    
                    // Recalculate subtotal after making service free
                    originalSubtotal = finalItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                    originalSubtotal += setupFeesTotal
                    if (domainType === 'new' && domainAnnualPrice > 0) {
                      originalSubtotal += domainAnnualPrice
                    }
                    originalSubtotal += urgentPriorityFee
                  } else {
                    // Service not in cart - return error
                    return NextResponse.json(
                      { error: `This code is for a free ${spinWheelData.prize.label || 'service'}, but that service is not in your cart. Please add it first.` },
                      { status: 400 }
                    )
                  }
                }
              }
            } else {
              // Spin wheel code is invalid - don't try regular discount code
              return NextResponse.json(
                { error: spinWheelData.error || 'Invalid or expired spin wheel code' },
                { status: 400 }
              )
            }
          }
      } catch (error) {
        console.error('Error validating spin wheel code:', error)
      }
      
      // If not a spin wheel code or spin wheel validation failed, try regular discount code
      if (!appliedReferralCode) {
        try {
          // Create URL with search params for GET request
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url.split('/api')[0]
          const validateUrl = new URL('/api/labs/web-services/validate-discount', baseUrl)
          validateUrl.searchParams.set('code', codeToCheck)
          validateUrl.searchParams.set('email', email)
          validateUrl.searchParams.set('cartTotal', originalSubtotal.toString())
          
          const validateResponse = await fetch(validateUrl.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          
          if (validateResponse.ok) {
            const discountData = await validateResponse.json()
            if (discountData.valid) {
              appliedReferralCode = discountData.code
              referralDiscount = discountData.discountAmount || 0
              
              // Mark code as used after successful validation (before creating order)
              try {
                const markUsedUrl = new URL('/api/labs/web-services/validate-discount', baseUrl)
                const markUsedResponse = await fetch(markUsedUrl.toString(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    code: discountData.code,
                    email: email,
                  }),
                })
                
                if (!markUsedResponse.ok) {
                  console.error('Failed to mark discount code as used')
                  // Don't fail checkout if marking as used fails - code was already validated
                }
              } catch (markError) {
                console.error('Error marking discount code as used:', markError)
                // Don't fail checkout if marking as used fails
              }
            } else {
              // If discount code validation failed, return error
              return NextResponse.json(
                { error: discountData.error || 'Invalid or already used discount code' },
                { status: 400 }
              )
            }
          } else {
            // If discount code validation failed, return error
            const errorData = await validateResponse.json().catch(() => ({}))
            return NextResponse.json(
              { error: errorData.error || 'Invalid or already used discount code' },
              { status: 400 }
            )
          }
      } catch (error) {
        console.error('Error applying discount code:', error)
        // Continue without discount if discount code fails
      }
      }
    }

    // Calculate final subtotal after discount
    const subtotal = originalSubtotal - referralDiscount

    // Calculate tax/VAT if tax percentage is set
    const taxPercentage = webServicesData.taxPercentage || 0
    const taxAmount = taxPercentage > 0 ? Math.round(subtotal * (taxPercentage / 100)) : 0
    const total = subtotal + taxAmount

    // Apply payment rules to the total (including tax)
    const { checkoutRules } = webServicesData
    let initialPayment: number
    let remainingPayment: number

    if (total < checkoutRules.fullPaymentThreshold) {
      // Pay full amount
      initialPayment = total
      remainingPayment = 0
    } else {
      // Pay partial (80% or configured percentage)
      initialPayment = Math.round(total * (checkoutRules.partialPaymentPercentage / 100))
      remainingPayment = total - initialPayment
    }

    // Create order
    const orderId = `labs-order-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const order: Order = {
      id: orderId,
      items: finalItems.map((item) => ({
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        billingPeriod: item.billingPeriod,
        setupFee: item.setupFee,
      })),
      subtotal: originalSubtotal, // Original subtotal before discount
      setupFeesTotal, // Total of all setup fees (includes domain setup fee if applicable)
      domainPricing: domainType === 'new' && domainSetupFee > 0 ? {
        setupFee: domainSetupFee,
        annualPrice: domainAnnualPrice,
        totalFirstPayment: domainTotalFirstPayment,
      } : undefined,
      referralDiscount: referralDiscount > 0 ? referralDiscount : undefined,
      appliedReferralCode: appliedReferralCode || undefined,
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
      taxPercentage: taxPercentage > 0 ? taxPercentage : undefined,
      total, // Final total after discount and tax
      initialPayment,
      remainingPayment,
      paymentStatus: remainingPayment > 0 ? 'partial' : 'pending',
      name: name.trim(),
      email,
      phoneNumber: phoneNumber.trim(),
      websiteType: websiteType || 'business', // Default to 'business' if not provided
      businessName: businessName || undefined,
      domainType: domainType || undefined,
      domainExtension: domainExtension || undefined,
      domainName: domainName || undefined,
      existingDomain: existingDomain || undefined,
      logoType: logoType || undefined,
      logoUrl: logoUrl || undefined,
      logoText: logoText || undefined,
      primaryColor: primaryColor || undefined,
      secondaryColor: secondaryColor || undefined,
      businessDescription: businessDescription || undefined,
      personalWebsiteAbout: personalWebsiteAbout || undefined,
      businessAddress: businessAddress || undefined,
      businessCity: businessCity || undefined,
      businessCountry: businessCountry || undefined,
      businessHours: businessHours || undefined,
      servicesProducts: servicesProducts || undefined,
      socialMediaLinks: socialMediaLinks || undefined,
      timeline: timeline || undefined,
      priorityFee: urgentPriorityFee > 0 ? urgentPriorityFee : undefined,
      consultationDate: consultationDate || undefined,
      consultationTimeSlot: consultationTimeSlot || undefined,
      consultationMeetingType: consultationMeetingType || undefined,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    // Save order
    const orders = await readDataFile<Order[]>('labs-web-services-orders.json', [])
    orders.push(order)
    await writeDataFile('labs-web-services-orders.json', orders)

    // Mark spin wheel code as used if it was applied
    if (appliedReferralCode && appliedReferralCode.startsWith('SPIN')) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url.split('/api')[0]
        const markUsedUrl = new URL('/api/labs/spin-wheel/mark-used', baseUrl)
        const markUsedResponse = await fetch(markUsedUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedReferralCode,
            email: email,
            usedFor: 'checkout',
            orderId: orderId,
          }),
        })
        
        if (!markUsedResponse.ok) {
          console.error('Failed to mark spin wheel code as used')
        }
      } catch (error) {
        console.error('Error marking spin wheel code as used:', error)
      }
    }

    const responseData = {
      success: true,
      orderId,
      items: finalItems,
      subtotal: originalSubtotal, // Original subtotal before discount
      setupFeesTotal, // Total of all setup fees (includes domain setup fee if applicable)
      domainPricing: domainType === 'new' ? {
        setupFee: domainSetupFee,
        annualPrice: domainAnnualPrice,
        totalFirstPayment: domainTotalFirstPayment,
      } : undefined,
      referralDiscount: referralDiscount > 0 ? referralDiscount : undefined,
      appliedReferralCode: appliedReferralCode || undefined,
      discountServiceName: discountServiceName || undefined, // Name of the service that was discounted
      discountServicePercentage: discountServicePercentage || undefined, // Percentage discount applied to the service
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
      taxPercentage: taxPercentage > 0 ? taxPercentage : undefined,
      total, // Final total after discount and tax
      initialPayment,
      remainingPayment,
      paymentStatus: order.paymentStatus,
      email,
    };
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error processing checkout:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout', details: error.message },
      { status: 500 }
    );
  }
}

