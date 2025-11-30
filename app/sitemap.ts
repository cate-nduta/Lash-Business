import { MetadataRoute } from 'next'
import { readDataFile } from '@/lib/data-utils'

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = normalizeBaseUrl()
  
  // Static pages that should always be included
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/booking`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/policies`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/before-your-appointment`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ]

  // Try to get shop products for dynamic product pages
  let productPages: MetadataRoute.Sitemap = []
  try {
    const shopData = await readDataFile<{ products?: Array<{ id?: string; name?: string; updatedAt?: string }> }>('shop.json', { products: [] })
    if (Array.isArray(shopData?.products)) {
      productPages = shopData.products
        .filter((product) => product?.id && product?.name)
        .map((product) => ({
          url: `${baseUrl}/shop/${product.id}`,
          lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
    }
  } catch (error) {
    console.error('Error loading shop products for sitemap:', error)
  }

  // Try to get blog posts for dynamic blog pages
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const blogData = await readDataFile<{ posts?: Array<{ slug?: string; published?: boolean; updatedAt?: string; publishedAt?: string }> }>('blog.json', { posts: [] })
    if (Array.isArray(blogData?.posts)) {
      blogPages = blogData.posts
        .filter((post) => post?.slug && post?.published)
        .map((post) => ({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: post.updatedAt ? new Date(post.updatedAt) : (post.publishedAt ? new Date(post.publishedAt) : new Date()),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        }))
    }
  } catch (error) {
    console.error('Error loading blog posts for sitemap:', error)
  }

  return [...staticPages, ...productPages, ...blogPages]
}

