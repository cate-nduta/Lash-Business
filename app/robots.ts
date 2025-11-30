import { MetadataRoute } from 'next'

function normalizeBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ''

  if (typeof raw === 'string' && raw.trim().length > 0) {
    const trimmed = raw.trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  return 'https://lashdiary.co.ke'
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = normalizeBaseUrl()
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/booking/manage/',
          '/unsubscribe/',
          '/gift-cards', // Private gift card page
          '/cart',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

