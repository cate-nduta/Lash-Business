import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()

    let settings: any = {}
    try {
      settings = await readDataFile<any>('settings.json', {})
    } catch (error) {
      console.error('Error reading settings file:', error)
      // Return default settings if file doesn't exist
      return NextResponse.json({
        business: {
          name: '',
          phone: '',
          email: '',
          address: '',
          description: '',
          logoType: 'text',
          logoUrl: '',
          logoText: '',
          logoColor: '#733D26',
          faviconUrl: '',
          faviconVersion: Date.now(),
          taxPercentage: 0,
        },
        social: {
          instagram: '',
          facebook: '',
          tiktok: '',
          twitter: '',
        },
        newsletter: {
          discountPercentage: 10,
          enabled: true,
        },
      })
    }

    const business = settings?.business ?? {}
    const social = settings?.social ?? {}
    const newsletter = settings?.newsletter ?? {}

    const exchangeRates = settings?.exchangeRates || {}
    
    return NextResponse.json({
        business: {
          name: business.name ?? '',
          phone: business.phone ?? '',
          email: business.email ?? '',
          address: business.address ?? '',
          description: business.description ?? '',
          logoType: business.logoType === 'image' ? 'image' : 'text',
          logoUrl: business.logoUrl ?? '',
          logoText: business.logoText ?? '',
          logoColor: business.logoColor ?? '#733D26',
          faviconUrl: business.faviconUrl ?? '',
          faviconVersion: typeof business.faviconVersion === 'number' ? business.faviconVersion : Date.now(),
          taxPercentage: typeof business.taxPercentage === 'number' ? business.taxPercentage : 0,
          eyepatchImageUrl: business.eyepatchImageUrl ?? '',
        },
      social,
      newsletter: {
        discountPercentage: typeof newsletter?.discountPercentage === 'number' ? newsletter.discountPercentage : 10,
        enabled: typeof newsletter?.enabled === 'boolean' ? newsletter.enabled : true,
      },
      exchangeRates: {
        usdToKes: typeof exchangeRates.usdToKes === 'number' ? exchangeRates.usdToKes : 130,
      },
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching settings:', error)
    // Return default settings on error
    return NextResponse.json({
      business: {
        name: '',
        phone: '',
        email: '',
        address: '',
        description: '',
        logoType: 'text',
        logoUrl: '',
        logoText: '',
        logoColor: '#733D26',
        faviconUrl: '',
        faviconVersion: Date.now(),
        taxPercentage: 0,
        eyepatchImageUrl: '',
      },
      social: {},
      newsletter: { discountPercentage: 10, enabled: true },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const body = await request.json()
    const { business, social, newsletter } = body

    if (!business) {
      return NextResponse.json(
        { error: 'Business settings are required' },
        { status: 400 }
      )
    }

    const { exchangeRates } = body
    
    const settings = {
      business: {
        name: business.name || '',
        phone: business.phone || '',
        email: business.email || '',
        address: business.address || '',
        description: business.description || '',
        logoType: business.logoType === 'image' ? 'image' : 'text',
        logoUrl: business.logoUrl || '',
        logoText: business.logoText || '',
        logoColor: business.logoColor || '#733D26',
        faviconUrl: business.faviconUrl || '',
        faviconVersion: typeof business.faviconVersion === 'number' ? business.faviconVersion : Date.now(),
        taxPercentage: typeof business.taxPercentage === 'number' ? business.taxPercentage : 0,
        eyepatchImageUrl: business.eyepatchImageUrl || '',
      },
      social: social || {},
      newsletter: {
        discountPercentage: typeof newsletter?.discountPercentage === 'number' ? newsletter.discountPercentage : 10,
        enabled: typeof newsletter?.enabled === 'boolean' ? newsletter.enabled : true,
      },
      exchangeRates: {
        usdToKes: typeof exchangeRates?.usdToKes === 'number' && exchangeRates.usdToKes > 0 
          ? exchangeRates.usdToKes 
          : 130,
      },
    }

    try {
      await writeDataFile('settings.json', settings)
    } catch (writeError: any) {
      console.error('[Settings API] Error saving settings:', writeError)
      
      // Provide helpful error message for production deployments
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' || process.env.NETLIFY === 'true'
      
      if (isProduction && writeError?.message?.includes('Supabase')) {
        return NextResponse.json(
          { 
            error: 'Failed to save settings in production',
            details: writeError.message,
            hint: 'Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured in your deployment environment variables.'
          },
          { status: 500 }
        )
      }
      
      throw writeError // Re-throw to be caught by outer catch
    }

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error: any) {
    if (error.status === 401 || error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[Settings API] Error saving settings:', error)
    
    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error.message || 'Failed to save settings')
      : 'Failed to save settings. Please check your configuration and try again.'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: error.stack })
      },
      { status: 500 }
    )
  }
}
