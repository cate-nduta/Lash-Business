import { readDataFile, writeDataFile } from './data-utils'

export interface BlogPost {
  id: string
  title: string
  slug?: string
  excerpt: string
  content: string
  featuredImage?: string
  author?: string
  publishedAt?: string
  updatedAt?: string
  published: boolean
  tags?: string[]
  category?: string
  seoTitle?: string
  seoDescription?: string
  readingTime?: number
}

export interface BlogData {
  posts: BlogPost[]
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    const data = await readDataFile<BlogData>('blog.json', { posts: [] })
    return data.posts || []
  } catch (error) {
    console.error('[Blog Utils] Error getting all blog posts:', error)
    return []
  }
}

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts()
  
  // Filter published posts - check boolean true (also handle string "true" if data is malformed)
  const published = posts.filter((post) => {
    return post.published === true || String(post.published).toLowerCase() === 'true'
  })
  
  // Filter out posts without required fields (slug and content)
  const validPosts = published.filter((post) => {
    const hasSlug = post.slug && post.slug.trim().length > 0
    const hasContent = post.content && post.content.trim().length > 0
    return hasSlug && hasContent
  })
  
  return validPosts.sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return dateB - dateA // Newest first
  })
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllBlogPosts()
  return posts.find((post) => post.slug === slug) || null
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const posts = await getAllBlogPosts()
  return posts.find((post) => post.id === id) || null
}

export async function saveBlogPost(post: BlogPost): Promise<void> {
  const data = await readDataFile<BlogData>('blog.json', { posts: [] })
  const posts = data.posts || []
  const index = posts.findIndex((p) => p.id === post.id)

  // Auto-generate slug from title if not provided
  const postWithSlug = {
    ...post,
    slug: post.slug && post.slug.trim() ? post.slug : generateSlug(post.title),
  }

  if (index >= 0) {
    posts[index] = { ...postWithSlug, updatedAt: new Date().toISOString() }
  } else {
    posts.push({
      ...postWithSlug,
      publishedAt: post.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  await writeDataFile('blog.json', { posts })
}

export async function deleteBlogPost(id: string): Promise<void> {
  const data = await readDataFile<BlogData>('blog.json', { posts: [] })
  const posts = data.posts || []
  const filtered = posts.filter((p) => p.id !== id)
  await writeDataFile('blog.json', { posts: filtered })
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const text = content.replace(/<[^>]*>/g, '') // Remove HTML tags
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length
  return Math.ceil(wordCount / wordsPerMinute)
}

