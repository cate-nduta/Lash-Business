import { NextRequest, NextResponse } from 'next/server'
import { getBlogPostBySlug } from '@/lib/blog-utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await getBlogPostBySlug(slug)

    if (!post || !post.published) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error loading blog post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}










