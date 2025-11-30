import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

interface SocialMediaPost {
  id: string
  platform: 'instagram' | 'email'
  content: string
  scheduledDate: string
  scheduledTime: string
  imageUrl?: string
  status: 'draft' | 'scheduled' | 'published'
  createdAt: string
  updatedAt: string
  // Email-specific fields
  emailSubject?: string
  emailTo?: string
  emailBody?: string
  newsletterId?: string
}

interface SocialMediaCalendarData {
  posts: SocialMediaPost[]
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await readDataFile<SocialMediaCalendarData>('social-media-calendar.json', { posts: [] })
    
    // Auto-update status for posts where scheduled time has passed
    const now = new Date()
    let hasUpdates = false
    
    data.posts = data.posts.map((post) => {
      if (post.status === 'scheduled' && post.scheduledDate) {
        const scheduledDateTime = new Date(`${post.scheduledDate}T${post.scheduledTime || '00:00'}:00`)
        if (scheduledDateTime <= now) {
          hasUpdates = true
          return {
            ...post,
            status: 'published',
            updatedAt: new Date().toISOString(),
          }
        }
      }
      return post
    })

    // Save updates if any posts were updated
    if (hasUpdates) {
      await writeDataFile('social-media-calendar.json', data)
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading social media calendar:', error)
    return NextResponse.json({ posts: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await request.json()
    const { 
      platform, 
      content, 
      scheduledDate, 
      scheduledTime, 
      imageUrl, 
      status,
      emailSubject,
      emailTo,
      emailBody,
      newsletterId
    } = body

    // Validate required fields
    if (!platform || !scheduledDate) {
      return NextResponse.json(
        { error: 'Platform and scheduled date are required' },
        { status: 400 }
      )
    }

    // Platform-specific validation
    if (platform === 'instagram' && !content) {
      return NextResponse.json(
        { error: 'Content is required for Instagram posts' },
        { status: 400 }
      )
    }

    if (platform === 'email') {
      if (!newsletterId && (!emailSubject || !emailTo || !emailBody)) {
        return NextResponse.json(
          { error: 'For email posts, either select a newsletter or provide subject, to, and body' },
          { status: 400 }
        )
      }
    }

    if (platform !== 'instagram' && platform !== 'email') {
      return NextResponse.json(
        { error: 'Platform must be either instagram or email' },
        { status: 400 }
      )
    }

    // Load existing data
    const data = await readDataFile<SocialMediaCalendarData>('social-media-calendar.json', { posts: [] })

    // Check if scheduled time has passed - auto-set status to published
    let finalStatus = status || 'draft'
    if (status === 'scheduled' || !status) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime || '00:00'}:00`)
      const now = new Date()
      if (scheduledDateTime <= now) {
        finalStatus = 'published'
      } else if (!status) {
        finalStatus = 'draft'
      }
    }

    // Create new post
    const newPost: SocialMediaPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform,
      content: content || '',
      scheduledDate,
      scheduledTime: scheduledTime || '',
      imageUrl: imageUrl || undefined,
      status: finalStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailSubject: emailSubject || undefined,
      emailTo: emailTo || undefined,
      emailBody: emailBody || undefined,
      newsletterId: newsletterId || undefined,
    }

    data.posts.push(newPost)

    // Sort posts by scheduled date and time
    data.posts.sort((a, b) => {
      const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime || '00:00'}`)
      const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime || '00:00'}`)
      return dateA.getTime() - dateB.getTime()
    })

    await writeDataFile('social-media-calendar.json', data)

    return NextResponse.json({ success: true, post: newPost })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating social media post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}

