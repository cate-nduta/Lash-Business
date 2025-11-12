import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await readDataFile<any>('settings.json', {})
    const business = settings?.business ?? {}
    const social = settings?.social ?? {}

    const response = {
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
      },
      social,
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error loading public settings:', error)
    return NextResponse.json(
      {
        business: {
          name: '',
          phone: '',
          email: '',
          address: '',
          description: '',
          logoType: 'text',
          logoUrl: '',
          logoText: 'LashDiary',
          logoColor: '#733D26',
          faviconUrl: '',
          faviconVersion: Date.now(),
        },
        social: {},
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  }
}


