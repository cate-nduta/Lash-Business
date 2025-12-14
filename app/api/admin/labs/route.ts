import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

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
  googleMeetRoom?: string // Google Meet room link (can be changed weekly)
  googleMeetRoomLastChanged?: string // ISO date string of when it was last changed
}

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
    priceKES: 300000, // Paid tier - 300,000 KSH
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

const DEFAULT_STATISTICS: LabsStatistics = {
  consultationsCompleted: 0,
  websitesBuilt: 0,
  averageSetupTime: '2-3 weeks',
  clientSatisfactionRate: 0,
  businessesTransformed: 0,
}

const DEFAULT_WHAT_YOU_GET: WhatYouGetContent = {
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
}

const DEFAULT_SETTINGS: LabsSettings = {
  consultationFeeKES: 7000,
  tiers: DEFAULT_TIERS,
  statistics: DEFAULT_STATISTICS,
  whatYouGet: DEFAULT_WHAT_YOU_GET,
  googleMeetRoom: '',
  googleMeetRoomLastChanged: new Date().toISOString(),
}

export async function GET(request: NextRequest) {
  try {
    const settings = await readDataFile<LabsSettings>('labs-settings.json', DEFAULT_SETTINGS)
    
    // Log what we received for debugging
    console.log('Loaded labs settings:', {
      hasTiers: !!settings.tiers,
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
    
    // Always ensure tiers are present - if missing or empty, use defaults and save
    if (!completeSettings.tiers || completeSettings.tiers.length === 0) {
      console.warn('Labs settings had empty tiers, initializing with defaults')
      completeSettings.tiers = DEFAULT_TIERS
      await writeDataFile('labs-settings.json', completeSettings)
    } else if (!settings.tiers || settings.tiers.length === 0) {
      // Settings were loaded but tiers were empty - save the complete version
      await writeDataFile('labs-settings.json', completeSettings)
    }
    
    // Validate the response before sending
    if (!completeSettings.tiers || completeSettings.tiers.length === 0) {
      console.error('ERROR: Complete settings still has empty tiers after initialization!')
      // Force defaults as last resort
      return NextResponse.json(DEFAULT_SETTINGS)
    }
    
    return NextResponse.json(completeSettings)
  } catch (error) {
    console.error('Error loading labs settings:', error)
    // If file doesn't exist, create it with defaults
    try {
      await writeDataFile('labs-settings.json', DEFAULT_SETTINGS)
      return NextResponse.json(DEFAULT_SETTINGS)
    } catch (writeError) {
      console.error('Error initializing labs settings file:', writeError)
      return NextResponse.json(DEFAULT_SETTINGS)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { consultationFeeKES, tiers } = body

    // Validate consultation fee
    if (typeof consultationFeeKES !== 'number' || consultationFeeKES < 0) {
      return NextResponse.json(
        { error: 'Invalid consultation fee. Must be a positive number.' },
        { status: 400 }
      )
    }

    // Validate tiers
    if (!Array.isArray(tiers)) {
      return NextResponse.json(
        { error: 'Tiers must be an array' },
        { status: 400 }
      )
    }

    // Ensure at least one tier is provided
    if (tiers.length === 0) {
      return NextResponse.json(
        { error: 'At least one pricing tier must be configured' },
        { status: 400 }
      )
    }

    // Validate each tier
    for (const tier of tiers) {
      if (!tier.id || !tier.name || typeof tier.priceKES !== 'number' || tier.priceKES < 0) {
        return NextResponse.json(
          { error: 'Each tier must have an id, name, and valid priceKES' },
          { status: 400 }
        )
      }

      if (!tier.features || !Array.isArray(tier.features.included)) {
        return NextResponse.json(
          { error: 'Each tier must have features.included array' },
          { status: 400 }
        )
      }
    }

    // Get current settings to check if Meet room link changed
    const currentSettings = await readDataFile<LabsSettings>('labs-settings.json', DEFAULT_SETTINGS)
    const newMeetRoom = body.googleMeetRoom || ''
    const meetRoomChanged = newMeetRoom !== (currentSettings.googleMeetRoom || '')

    // Preserve existing statistics and whatYouGet if not provided
    const settings: LabsSettings = {
      consultationFeeKES: Math.round(consultationFeeKES),
      tiers: tiers.map((tier: PricingTier) => ({
        ...tier,
        priceKES: Math.round(tier.priceKES),
        features: {
          included: tier.features.included || [],
          excluded: tier.features.excluded || [],
        },
      })),
      statistics: body.statistics || currentSettings.statistics || DEFAULT_STATISTICS,
      whatYouGet: body.whatYouGet || currentSettings.whatYouGet || DEFAULT_WHAT_YOU_GET,
      googleMeetRoom: newMeetRoom,
      // Update last changed date if Meet room link was changed
      googleMeetRoomLastChanged: meetRoomChanged 
        ? new Date().toISOString()
        : (body.googleMeetRoomLastChanged || currentSettings.googleMeetRoomLastChanged || new Date().toISOString()),
    }

    // Ensure tiers are saved correctly
    if (!settings.tiers || settings.tiers.length === 0) {
      console.warn('Warning: Attempting to save settings with empty tiers array')
      // Don't allow saving empty tiers - use current or defaults
      settings.tiers = currentSettings.tiers && currentSettings.tiers.length > 0 
        ? currentSettings.tiers 
        : DEFAULT_TIERS
    }

    await writeDataFile('labs-settings.json', settings)

    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    console.error('Error saving labs settings:', error)
    return NextResponse.json(
      { error: 'Failed to save labs settings', details: error.message },
      { status: 500 }
    )
  }
}

