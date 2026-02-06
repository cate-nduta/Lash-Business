import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

export const runtime = 'nodejs'
export const revalidate = 60

export interface PageVisibility {
  href: string
  label: string
  navbar: boolean
  navbarSecondary?: boolean
  footer: boolean
}

export interface PagesSettings {
  pages: Record<string, PageVisibility>
  loginRegisterIcon: boolean
  shopButton: boolean
  cartIcon: boolean
  currencySelector: boolean
  whatsappButton: boolean
}

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
    const data = await readDataFile<PagesSettings>('pages-settings.json', DEFAULT_PAGES)

    const pages = { ...DEFAULT_PAGES.pages, ...(data?.pages ?? {}) }
    const loginRegisterIcon = data?.loginRegisterIcon !== false
    const shopButton = data?.shopButton !== false
    const cartIcon = data?.cartIcon !== false
    const currencySelector = data?.currencySelector !== false
    const whatsappButton = data?.whatsappButton !== false

    return NextResponse.json(
      { pages, loginRegisterIcon, shopButton, cartIcon, currencySelector, whatsappButton },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Error loading pages settings:', error)
    return NextResponse.json(
      {
        pages: DEFAULT_PAGES.pages,
        loginRegisterIcon: true,
        shopButton: true,
        cartIcon: true,
        currencySelector: true,
        whatsappButton: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        },
      }
    )
  }
}
