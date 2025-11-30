import { NextRequest, NextResponse } from 'next/server'
import { getPublishedBlogPosts } from '@/lib/blog-utils'

export const revalidate = 60 // Revalidate every 60 seconds

export async function GET(request: NextRequest) {
  try {
    const posts = await getPublishedBlogPosts()
    return NextResponse.json({ posts }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error loading blog posts:', error)
    return NextResponse.json({ posts: [] }, { status: 500 })
  }
}

