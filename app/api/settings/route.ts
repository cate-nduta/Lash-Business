import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    let settings: any = {}
    try {
      settings = await readDataFile<any>('settings.json', {})
    } catch (error) {
      console.error('Error reading settings file:', error)
      return NextResponse.json({
        business: {
          eyepatchImageUrl: '',
          logoType: 'text',
          logoUrl: '',
          logoText: '',
          logoColor: '#733D26',
        },
      })
    }

    const business = settings?.business ?? {}

    return NextResponse.json({
      business: {
        eyepatchImageUrl: business.eyepatchImageUrl ?? '',
        logoType: business.logoType ?? 'text',
        logoUrl: business.logoUrl ?? '',
        logoText: business.logoText ?? '',
        logoColor: business.logoColor ?? '#733D26',
      },
    })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({
      business: {
        eyepatchImageUrl: '',
        logoType: 'text',
        logoUrl: '',
        logoText: '',
        logoColor: '#733D26',
      },
    })
  }
}
