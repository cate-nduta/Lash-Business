import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'
import type { BlogPost, BlogData } from '@/lib/blog-utils'
import { generateSlug } from '@/lib/blog-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await readDataFile<BlogData>('blog.json', { posts: [] })
    const posts = (data.posts || []).sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return dateB - dateA // Newest first
    })
    return NextResponse.json({ posts })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading blog posts:', error)
    return NextResponse.json({ posts: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { action, postId, post } = body as {
      action?: 'delete' | 'publish' | 'unpublish'
      postId?: string
      post?: BlogPost
    }

    const data = await readDataFile<BlogData>('blog.json', { posts: [] })
    const posts = data.posts || []

    if (action === 'delete' && postId) {
      const filtered = posts.filter((p) => p.id !== postId)
      await writeDataFile('blog.json', { posts: filtered })
      return NextResponse.json({ success: true })
    }

    if (action === 'publish' && postId) {
      const index = posts.findIndex((p) => p.id === postId)
      if (index >= 0) {
        posts[index] = {
          ...posts[index],
          published: true,
          publishedAt: posts[index].publishedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await writeDataFile('blog.json', { posts })
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (action === 'unpublish' && postId) {
      const index = posts.findIndex((p) => p.id === postId)
      if (index >= 0) {
        posts[index] = {
          ...posts[index],
          published: false,
          updatedAt: new Date().toISOString(),
        }
        await writeDataFile('blog.json', { posts })
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post) {
      const index = posts.findIndex((p) => p.id === post.id)
      const now = new Date().toISOString()

      // Auto-generate slug from title if not provided
      const postWithSlug = {
        ...post,
        slug: post.slug && post.slug.trim() ? post.slug : generateSlug(post.title),
      }

      if (index >= 0) {
        // Update existing post
        posts[index] = {
          ...posts[index],
          ...postWithSlug,
          updatedAt: now,
          publishedAt: posts[index].publishedAt || (postWithSlug.published ? now : undefined),
        }
      } else {
        // Create new post
        posts.push({
          ...postWithSlug,
          publishedAt: postWithSlug.published ? now : undefined,
          updatedAt: now,
        })
      }

      await writeDataFile('blog.json', { posts })
      
      const savedPost = posts[index >= 0 ? index : posts.length - 1]
      return NextResponse.json({ success: true, post: savedPost })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving blog post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

