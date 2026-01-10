import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: 'domain' | 'hosting' | 'page' | 'feature' | 'email' | 'design' | 'other'
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
  billingPeriod?: 'one-time' | 'yearly'
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
}

interface Order {
  id: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    price: number
    billingPeriod?: 'one-time' | 'yearly'
    setupFee?: number
  }>
  subtotal: number
  setupFeesTotal: number // Total of all setup fees
  referralDiscount?: number
  appliedReferralCode?: string
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

    // Apply discount code if provided
    let referralDiscount = 0
    let appliedReferralCode: string | null = null
    
    if (referralCode && referralCode.trim()) {
      try {
        // Create URL with search params for GET request
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url.split('/api')[0]
        const validateUrl = new URL('/api/labs/web-services/validate-discount', baseUrl)
        validateUrl.searchParams.set('code', referralCode.trim().toUpperCase())
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

    // Calculate final subtotal after discount
    const subtotal = originalSubtotal - referralDiscount

    // Apply payment rules
    const { checkoutRules } = webServicesData
    let initialPayment: number
    let remainingPayment: number

    if (subtotal < checkoutRules.fullPaymentThreshold) {
      // Pay full amount
      initialPayment = subtotal
      remainingPayment = 0
    } else {
      // Pay partial (80% or configured percentage)
      initialPayment = Math.round(subtotal * (checkoutRules.partialPaymentPercentage / 100))
      remainingPayment = subtotal - initialPayment
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
      total: subtotal, // Final total after discount
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
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    // Save order
    const orders = await readDataFile<Order[]>('labs-web-services-orders.json', [])
    orders.push(order)
    await writeDataFile('labs-web-services-orders.json', orders)

    return NextResponse.json({
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
      total: subtotal, // Final total after discount
      initialPayment,
      remainingPayment,
      paymentStatus: order.paymentStatus,
      email,
    })
  } catch (error: any) {
    console.error('Error processing checkout:', error)
    return NextResponse.json(
      { error: 'Failed to process checkout', details: error.message },
      { status: 500 }
    )
  }
}

