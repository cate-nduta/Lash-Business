import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface SpinWheelPrize {
  id: string
  label: string
  type: 'free_consultation' | 'discount_percentage' | 'free_service'
  value?: number // For discount percentage (10, 15, 20) - can be for entire cart or specific service
  serviceType?: string // Legacy field - kept for backward compatibility
  freeServiceId?: string // For free services - the product/service ID that will be free
  discountServiceId?: string // For discount_percentage - the product/service ID that will be discounted (optional, if not set, applies to entire cart)
  probability: number // 0-100, represents percentage chance
  enabled: boolean
  order: number // Display order
}

export interface SpinWheelSettings {
  enabled: boolean
  noticeText: string
  prizes: SpinWheelPrize[]
}

const DEFAULT_PRIZES: SpinWheelPrize[] = [
  {
    id: '1',
    label: 'Free consultation instead of paid consultation',
    type: 'free_consultation',
    probability: 15,
    enabled: true,
    order: 1,
  },
  {
    id: '2',
    label: '10% off system build',
    type: 'discount_percentage',
    value: 10,
    probability: 20,
    enabled: true,
    order: 2,
  },
  {
    id: '3',
    label: '15% off system build',
    type: 'discount_percentage',
    value: 15,
    probability: 15,
    enabled: true,
    order: 3,
  },
  {
    id: '4',
    label: '20% off system build',
    type: 'discount_percentage',
    value: 20,
    probability: 10,
    enabled: true,
    order: 4,
  },
  {
    id: '5',
    label: 'Free professional email setup',
    type: 'free_service',
    serviceType: 'email_setup',
    probability: 15,
    enabled: true,
    order: 5,
  },
  {
    id: '6',
    label: 'Free SEO setup',
    type: 'free_service',
    serviceType: 'seo_setup',
    probability: 15,
    enabled: true,
    order: 6,
  },
  {
    id: '7',
    label: 'Priority 21-day delivery slot',
    type: 'free_service',
    serviceType: 'priority_delivery',
    probability: 10,
    enabled: true,
    order: 7,
  },
]

const DEFAULT_SETTINGS: SpinWheelSettings = {
  enabled: true,
  noticeText: '🎉 Spin the wheel to see what you can win!',
  prizes: DEFAULT_PRIZES,
}

// Public GET - Get prizes and settings
export async function GET(request: NextRequest) {
  try {
    const data = await readDataFile<SpinWheelSettings>('spin-wheel-settings.json', DEFAULT_SETTINGS)
    
    // Check if admin (for admin panel access)
    let isAdmin = false
    try {
      await requireAdminAuth()
      isAdmin = true
    } catch {
      // Not admin, continue with public data
    }
    
    // Return all prizes for admin, only enabled for public
    const responseData = {
      enabled: data.enabled,
      noticeText: data.noticeText,
      prizes: isAdmin 
        ? data.prizes.sort((a, b) => a.order - b.order)
        : data.prizes.filter(p => p.enabled).sort((a, b) => a.order - b.order),
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error fetching spin wheel settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spin wheel settings', details: error.message },
      { status: 500 }
    )
  }
}

// Admin POST - Update settings
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const body = await request.json()
    const { enabled, noticeText, prizes } = body
    
    const currentData = await readDataFile<SpinWheelSettings>('spin-wheel-settings.json', DEFAULT_SETTINGS)
    
    const updatedData: SpinWheelSettings = {
      enabled: typeof enabled === 'boolean' ? enabled : currentData.enabled,
      noticeText: typeof noticeText === 'string' ? noticeText : currentData.noticeText,
      prizes: Array.isArray(prizes) ? prizes : currentData.prizes,
    }
    
    await writeDataFile('spin-wheel-settings.json', updatedData)
    
    return NextResponse.json({ success: true, settings: updatedData })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating spin wheel settings:', error)
    return NextResponse.json(
      { error: 'Failed to update spin wheel settings', details: error.message },
      { status: 500 }
    )
  }
}

