import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ContactSettings = {
  phone?: string | null
  email?: string | null
  instagram?: string | null
  instagramUrl?: string | null
  location?: string | null
  showPhone?: boolean | string | null
  showEmail?: boolean | string | null
  showInstagram?: boolean | string | null
  showLocation?: boolean | string | null
  headerTitle?: string | null
  headerSubtitle?: string | null
  businessHoursTitle?: string | null
  socialMediaTitle?: string | null
  socialMediaDescription?: string | null
  bookingTitle?: string | null
  bookingDescription?: string | null
  bookingButtonText?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const contact = await readDataFile<ContactSettings>('contact.json', {})

    const coerceBoolean = (value: unknown, fallback: boolean) => {
      if (typeof value === 'boolean') return value
      if (value === undefined || value === null) return fallback
      if (typeof value === 'string') {
        const lower = value.trim().toLowerCase()
        if (lower === 'true' || lower === '1' || lower === 'yes') return true
        if (lower === 'false' || lower === '0' || lower === 'no') return false
      }
      return fallback
    }

    const responseBody = {
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      instagram: contact?.instagram ?? '',
      instagramUrl: contact?.instagramUrl ?? '',
      location: contact?.location ?? '',
      showPhone: coerceBoolean(contact?.showPhone, Boolean(contact?.phone)),
      showEmail: coerceBoolean(contact?.showEmail, Boolean(contact?.email)),
      showInstagram: coerceBoolean(contact?.showInstagram, Boolean(contact?.instagram || contact?.instagramUrl)),
      showLocation: coerceBoolean(contact?.showLocation, Boolean(contact?.location)),
      headerTitle: contact?.headerTitle ?? '',
      headerSubtitle: contact?.headerSubtitle ?? '',
      businessHoursTitle: contact?.businessHoursTitle ?? '',
      socialMediaTitle: contact?.socialMediaTitle ?? '',
      socialMediaDescription: contact?.socialMediaDescription ?? '',
      bookingTitle: contact?.bookingTitle ?? '',
      bookingDescription: contact?.bookingDescription ?? '',
      bookingButtonText: contact?.bookingButtonText ?? '',
    }

    return NextResponse.json(responseBody, {
      headers: { 
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading contact info:', error)
    return NextResponse.json({ contact: null }, { status: 500 })
  }
}
