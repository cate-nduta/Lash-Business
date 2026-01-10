import type { Metadata } from 'next'
import { Inter, Playfair_Display, Monsieur_La_Doulaise } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PromoBanner from '@/components/PromoBanner'
import WebsiteProtection from '@/components/WebsiteProtection'
import ClientAuthMonitor from '@/components/ClientAuthMonitor'
import WhatsAppWidget from '@/components/WhatsAppWidget'
import ThemeProvider from './theme-provider'
import GlobalThemeLoader from '@/components/GlobalThemeLoader'
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
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'serif'],
  adjustFontFallback: true,
})

const monsieurLaDoulaise = Monsieur_La_Doulaise({ 
  subsets: ['latin'],
  variable: '--font-monsieur',
  weight: '400',
  display: 'swap',
  preload: true,
  fallback: ['cursive'],
  adjustFontFallback: true,
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
      title: settings?.business?.name ? `${settings.business.name} - Lash Extensions Service` : 'LashDiary - Lash Extensions Service',
      description: settings?.business?.description || 'Premium lash extensions and beauty services',
      icons: absoluteFaviconUrl
        ? {
            icon: [
              // Root favicon.ico for Google search results (Google specifically looks for this)
              { url: `${baseUrl}/favicon.ico`, sizes: 'any' },
              // SVG favicon for modern browsers
              { url: absoluteFaviconUrl, type: 'image/svg+xml', sizes: 'any' },
              // Additional sizes for better compatibility
              { url: absoluteFaviconUrl, sizes: '32x32', type: 'image/svg+xml' },
              { url: absoluteFaviconUrl, sizes: '16x16', type: 'image/svg+xml' },
            ],
            shortcut: absoluteFaviconUrl,
            apple: absoluteFaviconUrl,
          }
        : {
            // Fallback: ensure favicon.ico is always available
            icon: [
              { url: `${baseUrl}/favicon.ico`, sizes: 'any' },
            ],
          },
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
      title: 'LashDiary - Lash Extensions Service',
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

  const businessName = settings?.business?.name || 'The LashDiary'
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* Explicit favicon links for Google search results - Google specifically looks for /favicon.ico */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico" />
        {/* Inject theme colors immediately before React hydrates to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const root = document.documentElement;
                  if (root) {
                    root.style.setProperty('--color-primary', ${JSON.stringify(colors.primary)});
                    root.style.setProperty('--color-primary-dark', ${JSON.stringify(colors.primaryDark)});
                    root.style.setProperty('--color-primary-light', ${JSON.stringify(colors.primaryLight)});
                    root.style.setProperty('--color-secondary', ${JSON.stringify(colors.secondary)});
                    root.style.setProperty('--color-secondary-dark', ${JSON.stringify(colors.secondaryDark)});
                    root.style.setProperty('--color-accent', ${JSON.stringify(colors.accent)});
                    root.style.setProperty('--color-background', ${JSON.stringify(colors.background)});
                    root.style.setProperty('--color-surface', ${JSON.stringify(colors.surface)});
                    root.style.setProperty('--color-text', ${JSON.stringify(colors.text)});
                    root.style.setProperty('--color-on-primary', ${JSON.stringify(colors.onPrimary || '#ffffff')});
                    root.style.setProperty('--color-on-secondary', ${JSON.stringify(colors.onSecondary || colors.text)});
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${monsieurLaDoulaise.variable} font-body antialiased`} suppressHydrationWarning>
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
          <GlobalThemeLoader />
          <CurrencyProvider>
            <CartProvider>
              <ServiceCartProvider>
                <WebsiteProtection />
                <ClientAuthMonitor />
                <div className="sticky top-0 z-[70]" id="navbar-container">
                  <PromoBanner />
                  <Navbar />
                </div>
                <main className="min-h-screen">
                  {children}
                </main>
                <Footer />
                <WhatsAppWidget />
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
                // Silently handle timeout errors - they're expected and handled by our code
                if (message && (
                  message.includes('TimeoutError') ||
                  message.includes('signal timed out') ||
                  message.includes('AbortError') ||
                  (message.includes('profile') && message.includes('undefined')) ||
                  message.includes('twoseven') ||
                  message.includes('onUpdate-profile') ||
                  (source && source.includes('extension://'))
                )) {
                  return true; // Suppress the error
                }
                // Call original error handler if it exists
                if (originalError) {
                  return originalError.call(this, message, source, lineno, colno, error);
                }
                return false;
              };

              // Also catch unhandled promise rejections and timeout errors
              window.addEventListener('unhandledrejection', function(event) {
                const reason = event.reason;
                if (reason) {
                  // Handle timeout errors silently
                  if (reason.name === 'TimeoutError' || 
                      reason.name === 'AbortError' ||
                      (reason.message && (
                        reason.message.toString().includes('signal timed out') ||
                        reason.message.toString().includes('TimeoutError') ||
                        reason.message.toString().includes('timed out')
                      ))) {
                    event.preventDefault();
                    return;
                  }
                  // Handle extension errors
                  if (reason.message && typeof reason.message === 'string') {
                    const message = reason.message.toString();
                    if (message.includes('profile') && message.includes('undefined') ||
                        message.includes('twoseven') ||
                        message.includes('onUpdate-profile')) {
                      event.preventDefault();
                      return;
                    }
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

