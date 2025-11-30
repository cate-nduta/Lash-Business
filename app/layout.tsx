import type { Metadata } from 'next'
import { Inter, Playfair_Display, Monsieur_La_Doulaise, Ballet } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PromoBanner from '@/components/PromoBanner'
import WebsiteProtection from '@/components/WebsiteProtection'
import ThemeProvider from './theme-provider'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { CartProvider } from '@/contexts/CartContext'
import { ServiceCartProvider } from '@/contexts/ServiceCartContext'
import { readDataFile } from '@/lib/data-utils'
import { DEFAULT_THEME_DATA, withDefaultThemeData, type ThemeFile } from '@/lib/theme-defaults'
import { StructuredDataScript } from '@/components/StructuredDataScript'

export const dynamic = 'force-dynamic'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  preload: true,
})

const monsieurLaDoulaise = Monsieur_La_Doulaise({ 
  subsets: ['latin'],
  variable: '--font-monsieur',
  weight: '400',
  display: 'swap',
  preload: true,
})

const ballet = Ballet({ 
  subsets: ['latin'],
  variable: '--font-ballet',
  display: 'swap',
  preload: true,
})

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await readDataFile<any>('settings.json', {})
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'
    const faviconUrl = typeof settings?.business?.faviconUrl === 'string' ? settings.business.faviconUrl : ''
    const faviconVersion =
      typeof settings?.business?.faviconVersion === 'number'
        ? settings.business.faviconVersion
        : Date.now()
    
    // Create absolute URL for favicon (required for Google indexing)
    const absoluteFaviconUrl = faviconUrl && faviconUrl.length > 0
      ? `${baseUrl}${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${faviconVersion}`
      : undefined
    
    return {
      title: settings?.business?.name ? `${settings.business.name} - Luxury Lash Services` : 'LashDiary - Luxury Lash Services',
      description: settings?.business?.description || 'Premium lash extensions and beauty services',
      icons: absoluteFaviconUrl
        ? {
            icon: [
              { url: absoluteFaviconUrl, type: 'image/svg+xml' },
              { url: absoluteFaviconUrl, sizes: 'any' },
            ],
            shortcut: absoluteFaviconUrl,
            apple: absoluteFaviconUrl,
          }
        : undefined,
      verification: {
        google: '8pANyQEtsYFr_Bh3f2tfaiNIdoNjdtYVaaAZI54N4pg',
      },
      other: {
        'copyright': `© ${new Date().getFullYear()} LashDiary. All Rights Reserved.`,
      },
    }
  } catch {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'
    return {
      title: 'LashDiary - Luxury Lash Services',
      description: 'Premium lash extensions and beauty services',
      icons: undefined,
      verification: {
        google: '8pANyQEtsYFr_Bh3f2tfaiNIdoNjdtYVaaAZI54N4pg',
      },
      other: {
        'copyright': `© ${new Date().getFullYear()} LashDiary. All Rights Reserved.`,
      },
    }
  }
}

async function getThemeColors() {
  try {
    const raw = await readDataFile<ThemeFile>('theme.json', DEFAULT_THEME_DATA)
    const themeData = withDefaultThemeData(raw)
    const currentTheme = themeData.currentTheme || 'default'
    return themeData.themes[currentTheme]?.colors || DEFAULT_THEME_DATA.themes.default.colors
  } catch {
    return DEFAULT_THEME_DATA.themes.default.colors
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const colors = await getThemeColors()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://lashdiary.co.ke'
  
  // Load settings for structured data
  let settings: any = {}
  try {
    settings = await readDataFile<any>('settings.json', {})
  } catch (error) {
    console.error('Error loading settings for structured data:', error)
  }

  const businessName = settings?.business?.name || 'LashDiary'
  const businessEmail = settings?.business?.email || 'hello@lashdiary.co.ke'
  const businessPhone = settings?.business?.phone || ''
  const businessAddress = settings?.business?.address || 'Nairobi, Kenya'
  const businessDescription = settings?.business?.description || 'Premium lash extensions and beauty services'
  const logoUrl = settings?.business?.logoUrl ? `${baseUrl}${settings.business.logoUrl}` : `${baseUrl}/uploads/logo/logo-1762499904344.png`
  const instagramUrl = settings?.social?.instagram ? (settings.social.instagram.startsWith('http') ? settings.social.instagram : `https://instagram.com/${settings.social.instagram.replace('@', '')}`) : ''

  // Organization structured data
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: businessName,
    url: baseUrl,
    logo: logoUrl,
    description: businessDescription,
    email: businessEmail,
    telephone: businessPhone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Pramukh Towers, 4th Floor, Westlands Road',
      addressLocality: 'Westlands',
      addressRegion: 'Nairobi',
      postalCode: '',
      addressCountry: 'KE',
    },
    sameAs: instagramUrl ? [instagramUrl] : undefined,
  }

  // LocalBusiness structured data
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: businessName,
    url: baseUrl,
    logo: logoUrl,
    description: businessDescription,
    email: businessEmail,
    telephone: businessPhone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Pramukh Towers, 4th Floor, Westlands Road',
      addressLocality: 'Westlands',
      addressRegion: 'Nairobi',
      postalCode: '',
      addressCountry: 'KE',
    },
    priceRange: '$$',
    image: logoUrl,
    sameAs: instagramUrl ? [instagramUrl] : undefined,
  }

  // Google Analytics ID
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${monsieurLaDoulaise.variable} ${ballet.variable} font-body antialiased`} suppressHydrationWarning>
        <StructuredDataScript id="structured-data-organization" data={organizationSchema} />
        <StructuredDataScript id="structured-data-localbusiness" data={localBusinessSchema} />
        {/* Google Analytics */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        <ThemeProvider colors={colors}>
          <CurrencyProvider>
            <CartProvider>
              <ServiceCartProvider>
                <WebsiteProtection />
                <div className="sticky top-0 z-[70]">
                  <PromoBanner />
                  <Navbar />
                </div>
                <main className="min-h-screen">
                  {children}
                </main>
                <Footer />
              </ServiceCartProvider>
            </CartProvider>
          </CurrencyProvider>
        </ThemeProvider>
        <Script id="interaction-guard" strategy="afterInteractive">
          {`
            (function () {
              const handleKeydown = (event) => {
                if (event.key === 'PrintScreen') {
                  event.preventDefault();
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('Screenshots are disabled on this site.').catch(() => {});
                  }
                }
              };

              if (typeof document !== 'undefined') {
                document.addEventListener('keydown', handleKeydown, true);
              }
            })();
          `}
        </Script>
        <Script id="error-handler" strategy="afterInteractive">
          {`
            (function () {
              // Suppress errors from browser extensions that try to access undefined properties
              const originalError = window.onerror;
              window.onerror = function(message, source, lineno, colno, error) {
                // Ignore errors from browser extensions (common patterns)
                if (message && (
                  message.includes('profile') && message.includes('undefined') ||
                  message.includes('twoseven') ||
                  message.includes('onUpdate-profile') ||
                  source && source.includes('extension://')
                )) {
                  return true; // Suppress the error
                }
                // Call original error handler if it exists
                if (originalError) {
                  return originalError.call(this, message, source, lineno, colno, error);
                }
                return false;
              };

              // Also catch unhandled promise rejections from extensions
              const originalUnhandledRejection = window.onunhandledrejection;
              window.addEventListener('unhandledrejection', function(event) {
                const reason = event.reason;
                if (reason && typeof reason === 'object' && reason.message) {
                  const message = reason.message.toString();
                  if (message.includes('profile') && message.includes('undefined') ||
                      message.includes('twoseven') ||
                      message.includes('onUpdate-profile')) {
                    event.preventDefault();
                    return;
                  }
                }
              });
            })();
          `}
        </Script>
      </body>
    </html>
  )
}

