import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PromoBanner from '@/components/PromoBanner'
import ThemeProvider from './theme-provider'
import { readDataFile } from '@/lib/data-utils'
import { DEFAULT_THEME_DATA, withDefaultThemeData, type ThemeFile } from '@/lib/theme-defaults'

export const dynamic = 'force-dynamic'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await readDataFile<any>('settings.json', {})
    const faviconUrl = settings?.business?.faviconUrl || '/favicon.svg'
    return {
      title: settings?.business?.name ? `${settings.business.name} - Luxury Lash Services` : 'LashDiary - Luxury Lash Services',
      description: settings?.business?.description || 'Premium lash extensions and beauty services',
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
    }
  } catch {
    return {
      title: 'LashDiary - Luxury Lash Services',
      description: 'Premium lash extensions and beauty services',
      icons: {
        icon: '/favicon.svg',
        shortcut: '/favicon.svg',
        apple: '/favicon.svg',
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
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-body antialiased`} suppressHydrationWarning>
        <ThemeProvider colors={colors}>
          <div className="sticky top-0 z-[70]">
            <PromoBanner />
            <Navbar />
          </div>
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
        <Script id="interaction-guard" strategy="afterInteractive">
          {`
            (function () {
              const preventDefault = (event) => {
                event.preventDefault();
              };

              const preventKeyActions = (event) => {
                if (event.key === 'PrintScreen') {
                  event.preventDefault();
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('Screenshots are disabled on this site.').catch(() => {});
                  }
                }

                if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'p', 's'].includes(event.key.toLowerCase())) {
                  event.preventDefault();
                }
              };

              if (typeof document !== 'undefined') {
                document.addEventListener('copy', preventDefault);
                document.addEventListener('cut', preventDefault);
                document.addEventListener('contextmenu', preventDefault);
                document.addEventListener('dragstart', preventDefault);
                document.addEventListener('keydown', preventKeyActions, true);
              }
            })();
          `}
        </Script>
      </body>
    </html>
  )
}

