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

export interface LabsSettings {
  consultationFeeKES: number
  tiers: PricingTier[]
  statistics?: LabsStatistics
  whatYouGet?: WhatYouGetContent
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

const DEFAULT_SETTINGS: LabsSettings = {
  consultationFeeKES: 7000,
  tiers: DEFAULT_TIERS,
  statistics: {
    consultationsCompleted: 0,
    websitesBuilt: 0,
    averageSetupTime: '2-3 weeks',
    clientSatisfactionRate: 0,
    businessesTransformed: 0,
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
  googleMeetRoom: '',
  googleMeetRoomLastChanged: new Date().toISOString(),
}

// Public GET endpoint - no authentication required
export async function GET(request: NextRequest) {
  try {
    const settings = await readDataFile<LabsSettings>('labs-settings.json', DEFAULT_SETTINGS)
    
    // Log what we read from the file/database
    console.log('Labs settings loaded from storage:', {
      hasSettings: !!settings,
      hasTiers: !!settings.tiers,
      tiersIsArray: Array.isArray(settings.tiers),
      tiersLength: settings.tiers?.length || 0,
      consultationFee: settings.consultationFeeKES,
    })
    
    // Ensure all required fields are present with defaults
    const completeSettings: LabsSettings = {
      consultationFeeKES: settings.consultationFeeKES || DEFAULT_SETTINGS.consultationFeeKES,
      tiers: (settings.tiers && Array.isArray(settings.tiers) && settings.tiers.length > 0) 
        ? settings.tiers 
        : DEFAULT_TIERS,
      statistics: settings.statistics || DEFAULT_SETTINGS.statistics,
      whatYouGet: settings.whatYouGet || DEFAULT_SETTINGS.whatYouGet,
      googleMeetRoom: settings.googleMeetRoom || '',
      googleMeetRoomLastChanged: settings.googleMeetRoomLastChanged || new Date().toISOString(),
    }
    
    // Always ensure tiers are present - if missing or empty, use defaults
    if (!completeSettings.tiers || completeSettings.tiers.length === 0) {
      console.warn('Labs settings had empty tiers, using defaults. Original settings:', settings)
      completeSettings.tiers = DEFAULT_TIERS
    }
    
    // Final validation - this should NEVER fail if code above works
    if (!completeSettings.tiers || completeSettings.tiers.length === 0) {
      console.error('CRITICAL ERROR: Complete settings still has empty tiers after initialization!')
      console.error('Complete settings:', JSON.stringify(completeSettings, null, 2))
      // Force defaults as last resort
      return NextResponse.json(DEFAULT_SETTINGS, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    }
    
    // Log final response
    console.log('Returning labs settings with', completeSettings.tiers.length, 'tiers')
    
    return NextResponse.json(completeSettings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading labs settings:', error)
    // Return defaults on error with no-cache headers
    return NextResponse.json(DEFAULT_SETTINGS, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

