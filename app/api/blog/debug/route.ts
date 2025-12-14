import { NextRequest, NextResponse } from 'next/server'
import { getAllBlogPosts } from '@/lib/blog-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const allPosts = await getAllBlogPosts()
    
    return NextResponse.json({
      totalPosts: allPosts.length,
      posts: allPosts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        published: post.published,
        publishedType: typeof post.published,
        hasContent: !!post.content && post.content.trim().length > 0,
        contentLength: post.content?.length || 0,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
      }))
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error in blog debug endpoint:', error)
    return NextResponse.json({ error: 'Failed to load posts', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}





