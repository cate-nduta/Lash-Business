import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export interface PricingTier {
  id: string
  name: string
  tagline: string
  priceKES: number
  description: string
  features: {
    included: string[]
    excluded?: string[]
  }
  cta: string
  popular?: boolean
}

export interface LabsStatistics {
  consultationsCompleted: number
  websitesBuilt: number
  averageSetupTime: string
  clientSatisfactionRate: number
  businessesTransformed?: number
}

export interface WhatYouGetContent {
  title: string
  subtitle: string
  whatYouGetTitle: string
  whatYouGetItems: string[]
  whyThisWorksTitle: string
  whyThisWorksItems: string[]
}

export interface WhoThisIsForContent {
  title: string
  subtitle: string
  items: string[]
}

export interface CustomBuildsCTA {
  title: string
  description: string
  buttonText: string
  buttonUrl: string
  enabled?: boolean
  discountPercentage?: number // Discount percentage to display (0-100)
}

export interface BudgetRange {
  id: string
  label: string
  value: string
}

export interface DiscountCode {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number // Percentage (0-100) or fixed amount in KES
  expiresAt?: string // ISO date string - optional expiration date
  maxUses?: number // Optional: maximum number of times this code can be used
  usedCount?: number // Track how many times this code has been used
}

export interface LabsSettings {
  consultationFeeKES: number
  tiers: PricingTier[]
  statistics?: LabsStatistics
  statisticsEnabled?: boolean // Enable/disable Statistics section display
  budgetRanges?: BudgetRange[] // Budget range options for booking form
  whatYouGet?: WhatYouGetContent
  whatYouGetEnabled?: boolean // Enable/disable What You Get section display
  whoThisIsFor?: WhoThisIsForContent
  whoThisIsForEnabled?: boolean // Enable/disable Who This is For section display
  courseSectionEnabled?: boolean // Enable/disable Course section display
  buildOnYourOwnEnabled?: boolean // Enable/disable Custom Website Builds section display
  waitlistPageEnabled?: boolean // Enable/disable Waitlist page
  waitlistSectionEnabled?: boolean // Enable/disable Waitlist section on Labs page
  discountSectionEnabled?: boolean // Enable/disable Discount section on book-appointment page
  discountCodes?: DiscountCode[] // Discount codes for consultation bookings
  customBuildsCTA?: CustomBuildsCTA // Custom Website Builds CTA section
  googleMeetRoom?: string
  googleMeetRoomLastChanged?: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Default tiers - same as in admin route
const DEFAULT_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter System',
    tagline: 'Plug-and-play structure for service providers who want to stop managing chaos.',
    priceKES: 100000,
    description: '',
    features: {
      included: [
        'Pre-built website structure (locked layout)',
        'Core pages: Home, Services, Booking & Checkout, Contact',
        'Guided setup flow (business details, services, pricing)',
        'Basic booking rules: working hours, simple deposits OR full payment',
        'One payment provider connection',
        'Temporary subdomain included',
        'Mobile-first, professional design',
      ],
      excluded: [
        'No layout changes',
        'No strategy input',
        'No advanced booking logic',
        'No domain assistance beyond basic instructions',
      ],
    },
    cta: 'Get Started',
  },
  {
    id: 'business',
    name: 'Business System',
    tagline: 'Your website works the way your business actually works.',
    priceKES: 200000,
    description: '',
    features: {
      included: [
        'Everything in Starter System',
        'Flexible structure (you adjust pages and flow)',
        'Additional pages: About, Policies / Terms, FAQ',
        'Advanced booking rules: buffer times, cancellation windows, deposits + balance logic',
        'Multiple payment methods (based on country)',
        'Custom domain connection',
        'Automated emails: booking confirmation, reminders, cancellation notices',
        'One guided setup or review session',
      ],
      excluded: [
        'No unlimited changes',
        'No full done-for-you build',
        'No ongoing support',
      ],
    },
    cta: 'Get Started',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Full Operations Suite',
    tagline: 'A website that replaces a receptionist, a notebook, and half your mental load.',
    priceKES: 300000,
    description: '',
    features: {
      included: [
        'Everything in Business System',
        'Full system setup done-for-you',
        'Full page set: Home, About, Services, Booking, Blog / Content, Legal pages',
        'Client journey design: how clients discover, how they book, how they pay, how they behave',
        'Advanced booking & checkout logic: service-specific rules, conditional deposits',
        'Domain setup + launch handled',
        'Post-launch support window',
        'Final review + handover',
      ],
    },
    cta: 'Get Started',
  },
]

const DEFAULT_BUDGET_RANGES: BudgetRange[] = [
  { id: '100k-150k', label: '100K–150K KES', value: '100k-150k' },
  { id: '150k-250k', label: '150K–250K KES', value: '150k-250k' },
  { id: '250k-300k+', label: '250K–300K+ KES', value: '250k-300k+' },
]

const DEFAULT_SETTINGS: LabsSettings = {
  consultationFeeKES: 0,
  tiers: DEFAULT_TIERS,
  statistics: {
    consultationsCompleted: 0,
    websitesBuilt: 0,
    averageSetupTime: '2-3 weeks',
    clientSatisfactionRate: 0,
    businessesTransformed: 0,
  },
  statisticsEnabled: true, // Statistics section enabled by default
  budgetRanges: DEFAULT_BUDGET_RANGES,
  whatYouGetEnabled: true, // What You Get section enabled by default
  courseSectionEnabled: true, // Course section enabled by default
    buildOnYourOwnEnabled: true, // Custom Website Builds section enabled by default
  waitlistPageEnabled: false, // Waitlist page disabled by default
  waitlistSectionEnabled: true, // Waitlist section enabled by default
  discountSectionEnabled: false, // Discount section disabled by default
  discountCodes: [], // No discount codes by default
  customBuildsCTA: {
    title: 'Build Your Perfect System',
    description: 'Need specific features? Choose exactly what you need from our Custom Website Builds menu. Select only the services that matter to your business.',
    buttonText: 'Explore Custom Builds',
    buttonUrl: '/labs/custom-website-builds',
    enabled: true,
    discountPercentage: 10, // Default 10% discount
  },
  whatYouGet: {
    title: 'What You Get',
    subtitle: 'Your tier determines the features and support you receive. Choose the system that matches your business needs.',
    whatYouGetTitle: 'What you get when you purchase',
    whatYouGetItems: [
      'A complete website with the same structure and features as LashDiary',
      'Your website will be built according to your selected tier',
      'Full control over branding: logo, colors, business information, and social media',
      'Built-in booking system and checkout that works for your service model',
      'Connect your own payment providers (Stripe, PayPal, M-Pesa) - we don\'t process payments for you',
      'Domain options: temporary subdomain instantly, or connect your custom domain',
      'Admin dashboard to manage bookings, clients, and your business operations',
      'Mobile-responsive design that works perfectly on all devices',
    ],
    whyThisWorksTitle: 'Why this works for service providers',
    whyThisWorksItems: [
      'No more lost bookings - everything is organized in one place',
      'Payment confusion eliminated - clients pay directly to your connected accounts',
      'Reduce no-shows and cancellations with automated reminders and clear policies',
      'Focus on your craft while the website handles the operational chaos',
    ],
  },
  whoThisIsFor: {
    title: 'Who This is For',
    subtitle: 'This system is for service providers who:',
    items: [
      'Struggle to keep track of client bookings and constantly worry about scheduling mistakes.',
      'Get frustrated trying to chase deposits or payments from clients.',
      'Spend hours manually adding appointments to calendars or sending reminders.',
      'Lose track of how much money they\'ve received or what\'s still owed.',
      'Want to reduce no-shows with booking fees and automated reminders.',
      'Need simple, secure payment checkouts that just work.',
      'Want email automation for confirmations, follow-ups, and client communications.',
      'Are ready to invest in a professional system to get rid of chaos and run their business efficiently.',
    ],
  },
  googleMeetRoom: '',
  googleMeetRoomLastChanged: new Date().toISOString(),
}

// Public GET endpoint - no authentication required
export async function GET(request: NextRequest) {
  try {
    let settings: LabsSettings
    try {
      settings = await readDataFile<LabsSettings>('labs-settings.json', DEFAULT_SETTINGS)
    } catch (readError) {
      console.error('Error reading labs-settings.json, using defaults:', readError)
      settings = DEFAULT_SETTINGS
    }
    
    // Ensure all required fields are present with defaults
    // IMPORTANT: Use actual consultationFeeKES from settings file (can be 0 for free consultations)
    const completeSettings: LabsSettings = {
      consultationFeeKES: typeof settings.consultationFeeKES === 'number' ? settings.consultationFeeKES : 0,
      tiers: (settings.tiers && Array.isArray(settings.tiers) && settings.tiers.length > 0) 
        ? settings.tiers 
        : DEFAULT_TIERS,
      statistics: settings.statistics || DEFAULT_SETTINGS.statistics,
      statisticsEnabled: settings.statisticsEnabled !== undefined ? settings.statisticsEnabled : DEFAULT_SETTINGS.statisticsEnabled,
      budgetRanges: (settings.budgetRanges && Array.isArray(settings.budgetRanges) && settings.budgetRanges.length > 0)
        ? settings.budgetRanges
        : DEFAULT_BUDGET_RANGES,
      whatYouGet: settings.whatYouGet || DEFAULT_SETTINGS.whatYouGet,
      whatYouGetEnabled: settings.whatYouGetEnabled !== undefined ? settings.whatYouGetEnabled : DEFAULT_SETTINGS.whatYouGetEnabled,
      whoThisIsFor: settings.whoThisIsFor || DEFAULT_SETTINGS.whoThisIsFor,
      whoThisIsForEnabled: settings.whoThisIsForEnabled !== undefined ? settings.whoThisIsForEnabled : DEFAULT_SETTINGS.whoThisIsForEnabled,
      courseSectionEnabled: settings.courseSectionEnabled !== undefined ? settings.courseSectionEnabled : DEFAULT_SETTINGS.courseSectionEnabled,
      buildOnYourOwnEnabled: settings.buildOnYourOwnEnabled !== undefined ? settings.buildOnYourOwnEnabled : DEFAULT_SETTINGS.buildOnYourOwnEnabled,
      waitlistPageEnabled: settings.waitlistPageEnabled !== undefined ? settings.waitlistPageEnabled : false,
      waitlistSectionEnabled: settings.waitlistSectionEnabled !== undefined ? settings.waitlistSectionEnabled : DEFAULT_SETTINGS.waitlistSectionEnabled,
      discountSectionEnabled: settings.discountSectionEnabled !== undefined ? settings.discountSectionEnabled : DEFAULT_SETTINGS.discountSectionEnabled,
      discountCodes: Array.isArray(settings.discountCodes) ? settings.discountCodes : DEFAULT_SETTINGS.discountCodes,
      customBuildsCTA: settings.customBuildsCTA || DEFAULT_SETTINGS.customBuildsCTA,
      googleMeetRoom: settings.googleMeetRoom || '',
      googleMeetRoomLastChanged: settings.googleMeetRoomLastChanged || new Date().toISOString(),
    }
    
    // Always ensure tiers are present - if missing or empty, use defaults
    if (!completeSettings.tiers || completeSettings.tiers.length === 0) {
      completeSettings.tiers = DEFAULT_TIERS
    }
    
    // Final validation - this should NEVER fail if code above works
    if (!completeSettings.tiers || completeSettings.tiers.length === 0) {
      // Force defaults as last resort
      return NextResponse.json(DEFAULT_SETTINGS, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }
    
    return NextResponse.json(completeSettings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error loading labs settings:', error)
    // Return defaults on error with no-cache headers - ensure it's always valid JSON
    try {
      return NextResponse.json(DEFAULT_SETTINGS, {
        status: 200, // Return 200 even on error to prevent page crashes
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    } catch (jsonError) {
      // Last resort - return minimal valid response
      console.error('Error serializing DEFAULT_SETTINGS:', jsonError)
      return NextResponse.json({
        consultationFeeKES: 0,
        tiers: DEFAULT_TIERS,
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }
  }
}

