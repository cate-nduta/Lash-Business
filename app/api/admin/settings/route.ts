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

    await writeDataFile('settings.json', settings)

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
