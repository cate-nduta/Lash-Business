import { NextRequest, NextResponse } from 'next/server'
import { getPublishedBlogPosts } from '@/lib/blog-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const posts = await getPublishedBlogPosts()
    return NextResponse.json({ posts }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading blog posts:', error)
    return NextResponse.json({ posts: [] }, { status: 500 })
  }
}

