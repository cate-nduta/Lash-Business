import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import type { PagesSettings } from '@/app/api/pages-settings/route'

const DEFAULT_PAGES: PagesSettings = {
  pages: {
    home: { href: '/', label: 'Home', navbar: true, footer: false },
    services: { href: '/services', label: 'Services', navbar: true, footer: true },
    booking: { href: '/booking', label: 'Booking', navbar: true, footer: true },
    blog: { href: '/blog', label: 'Blog', navbar: true, footer: true },
    labs: { href: '/labs', label: 'LashDiary Labs', navbar: true, footer: false },
    contact: { href: '/contact', label: 'Contact', navbar: true, footer: true },
    gallery: { href: '/gallery', label: 'Gallery', navbar: false, navbarSecondary: true, footer: true },
    policies: { href: '/policies', label: 'Policies', navbar: false, navbarSecondary: true, footer: true },
    shop: { href: '/shop', label: 'Shop', navbar: false, footer: false },
    beforeAppointment: {
      href: '/before-your-appointment',
      label: 'Pre-Appointment Guidelines',
      navbar: false,
      footer: true,
    },
    terms: { href: '/terms', label: 'Terms & Conditions', navbar: false, footer: true },
  },
  loginRegisterIcon: true,
  shopButton: true,
  cartIcon: true,
  currencySelector: true,
  whatsappButton: true,
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await readDataFile<PagesSettings>('pages-settings.json', DEFAULT_PAGES)
    const merged = {
      pages: { ...DEFAULT_PAGES.pages, ...(data?.pages ?? {}) },
      loginRegisterIcon: data?.loginRegisterIcon !== false,
      shopButton: data?.shopButton !== false,
      cartIcon: data?.cartIcon !== false,
      currencySelector: data?.currencySelector !== false,
      whatsappButton: data?.whatsappButton !== false,
    }
    return NextResponse.json(merged)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading pages settings:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()

    const existing = await readDataFile<PagesSettings>('pages-settings.json', DEFAULT_PAGES)
    const updated: PagesSettings = {
      pages: { ...DEFAULT_PAGES.pages, ...existing?.pages, ...(body.pages ?? {}) },
      loginRegisterIcon: body.loginRegisterIcon !== undefined ? body.loginRegisterIcon : (existing?.loginRegisterIcon !== false),
      shopButton: body.shopButton !== undefined ? body.shopButton : (existing?.shopButton !== false),
      cartIcon: body.cartIcon !== undefined ? body.cartIcon : (existing?.cartIcon !== false),
      currencySelector: body.currencySelector !== undefined ? body.currencySelector : (existing?.currencySelector !== false),
      whatsappButton: body.whatsappButton !== undefined ? body.whatsappButton : (existing?.whatsappButton !== false),
    }

    await writeDataFile('pages-settings.json', updated)

    revalidatePath('/')
    revalidatePath('/api/pages-settings')
    revalidatePath('/admin/pages')

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving pages settings:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
