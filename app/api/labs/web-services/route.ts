import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'

interface WebService {
  id: string
  name: string
  description: string
  price: number
  category: 'domain' | 'hosting' | 'page' | 'feature' | 'email' | 'design' | 'other'
  imageUrl?: string // Product image URL
  isRequired?: boolean // For auto-add logic
  billingPeriod?: 'one-time' | 'yearly' // Billing period: one-time payment or yearly subscription
  setupFee?: number // One-time setup fee for annually billed services
  createdAt?: string
  updatedAt?: string
  discount?: number // Optional discount percentage
  discountAmount?: number // Optional fixed discount amount
  requiredServices?: string[] // Array of service IDs that must be bought together
}

interface WebServicesData {
  services: WebService[]
  pageDescription?: string // Editable description text for the page
  enableBusinessInfo: boolean // Enable/disable business information section
  referralDiscountPercentage?: number // Discount percentage for referred customers (default 10%)
  referrerRewardPercentage?: number // Reward percentage for the referrer (default 5%)
  monthlyCapacity?: number // Monthly order capacity limit (default 7)
  priorityFee?: number // Priority fee for urgent timeline (<10 days) (default 2000)
  domainPricing?: {
    setupFee: number // One-time setup fee for new domain (default 4000)
    annualPrice: number // Annual subscription price for domain (default 2000)
    totalFirstPayment: number // Total first payment (setupFee + annualPrice) (default 6000)
  }
  cartRules: {
    minimumCartValue: number // Default 20000
    autoAddDomainHosting: boolean
    autoAddDomainHostingProductId?: string // Product ID to auto-add for domain/hosting
    autoAddContactForm: boolean
    autoAddContactFormProductId?: string // Product ID to auto-add for contact form
    suggestBusinessEmail: boolean
    suggestBusinessEmailProductId?: string // Product ID to suggest for business email
  }
  checkoutRules: {
    fullPaymentThreshold: number // Below this, pay full amount
    partialPaymentThreshold: number // Above this, pay 80% at checkout
    partialPaymentPercentage: number // Default 80
  }
}

const DEFAULT_DATA: WebServicesData = {
  services: [],
  pageDescription: 'Select the services and features you want. Our smart cart will help ensure you have everything you need.',
  enableBusinessInfo: true,
  referralDiscountPercentage: 10, // 10% discount for referred customers
  referrerRewardPercentage: 5, // 5% reward for the referrer
  monthlyCapacity: 7, // Default monthly capacity limit
  priorityFee: 2000, // Default priority fee for urgent timeline
  domainPricing: {
    setupFee: 4000, // One-time setup fee for new domain
    annualPrice: 2000, // Annual subscription price for domain
    totalFirstPayment: 6000, // Total first payment (setupFee + annualPrice)
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
}

export async function GET(request: NextRequest) {
  try {
    const data = await readDataFile<WebServicesData>('labs-web-services.json', DEFAULT_DATA)
    // Ensure pageDescription exists (for backward compatibility)
    if (!data.pageDescription) {
      data.pageDescription = DEFAULT_DATA.pageDescription
    }
    // Ensure enableBusinessInfo exists (for backward compatibility)
    if (typeof data.enableBusinessInfo === 'undefined') {
      data.enableBusinessInfo = DEFAULT_DATA.enableBusinessInfo
    }
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error loading web services:', error)
    return NextResponse.json(
      { error: 'Failed to load web services', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResponse = await fetch(new URL('/api/admin/current-user', request.url), {
      headers: {
        Cookie: request.headers.get('Cookie') || '',
      },
    })

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authData = await authResponse.json()
    if (!authData.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data: WebServicesData = {
      services: Array.isArray(body.services) ? body.services : [],
      pageDescription: typeof body.pageDescription === 'string' 
        ? body.pageDescription.trim() 
        : DEFAULT_DATA.pageDescription,
      enableBusinessInfo: body.enableBusinessInfo !== false,
      referralDiscountPercentage: typeof body.referralDiscountPercentage === 'number'
        ? Math.max(0, Math.min(100, body.referralDiscountPercentage))
        : DEFAULT_DATA.referralDiscountPercentage,
      referrerRewardPercentage: typeof body.referrerRewardPercentage === 'number'
        ? Math.max(0, Math.min(100, body.referrerRewardPercentage))
        : DEFAULT_DATA.referrerRewardPercentage,
      monthlyCapacity: typeof body.monthlyCapacity === 'number'
        ? Math.max(1, body.monthlyCapacity)
        : DEFAULT_DATA.monthlyCapacity,
      priorityFee: typeof body.priorityFee === 'number'
        ? Math.max(0, body.priorityFee)
        : DEFAULT_DATA.priorityFee,
      domainPricing: body.domainPricing
        ? {
            setupFee: typeof body.domainPricing.setupFee === 'number'
              ? Math.max(0, body.domainPricing.setupFee)
              : (DEFAULT_DATA.domainPricing?.setupFee || 4000),
            annualPrice: typeof body.domainPricing.annualPrice === 'number'
              ? Math.max(0, body.domainPricing.annualPrice)
              : (DEFAULT_DATA.domainPricing?.annualPrice || 2000),
            totalFirstPayment: typeof body.domainPricing.totalFirstPayment === 'number'
              ? Math.max(0, body.domainPricing.totalFirstPayment)
              : (typeof body.domainPricing.setupFee === 'number' && typeof body.domainPricing.annualPrice === 'number'
                  ? body.domainPricing.setupFee + body.domainPricing.annualPrice
                  : (DEFAULT_DATA.domainPricing?.totalFirstPayment || 6000)),
          }
        : (DEFAULT_DATA.domainPricing || {
            setupFee: 4000,
            annualPrice: 2000,
            totalFirstPayment: 6000,
          }),
      cartRules: {
        minimumCartValue: typeof body.cartRules?.minimumCartValue === 'number' 
          ? body.cartRules.minimumCartValue 
          : DEFAULT_DATA.cartRules.minimumCartValue,
        autoAddDomainHosting: body.cartRules?.autoAddDomainHosting !== false,
        autoAddDomainHostingProductId: typeof body.cartRules?.autoAddDomainHostingProductId === 'string'
          ? body.cartRules.autoAddDomainHostingProductId
          : undefined,
        autoAddContactForm: body.cartRules?.autoAddContactForm !== false,
        autoAddContactFormProductId: typeof body.cartRules?.autoAddContactFormProductId === 'string'
          ? body.cartRules.autoAddContactFormProductId
          : undefined,
        suggestBusinessEmail: body.cartRules?.suggestBusinessEmail !== false,
        suggestBusinessEmailProductId: typeof body.cartRules?.suggestBusinessEmailProductId === 'string'
          ? body.cartRules.suggestBusinessEmailProductId
          : undefined,
      },
      checkoutRules: {
        fullPaymentThreshold: typeof body.checkoutRules?.fullPaymentThreshold === 'number'
          ? body.checkoutRules.fullPaymentThreshold
          : DEFAULT_DATA.checkoutRules.fullPaymentThreshold,
        partialPaymentThreshold: typeof body.checkoutRules?.partialPaymentThreshold === 'number'
          ? body.checkoutRules.partialPaymentThreshold
          : DEFAULT_DATA.checkoutRules.partialPaymentThreshold,
        partialPaymentPercentage: typeof body.checkoutRules?.partialPaymentPercentage === 'number'
          ? Math.max(0, Math.min(100, body.checkoutRules.partialPaymentPercentage))
          : DEFAULT_DATA.checkoutRules.partialPaymentPercentage,
      },
    }

    await writeDataFile('labs-web-services.json', data)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error saving web services:', error)
    return NextResponse.json(
      { error: 'Failed to save web services', details: error.message },
      { status: 500 }
    )
  }
}

