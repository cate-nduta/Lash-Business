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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find and update the post
    const postIndex = data.posts.findIndex(p => p.id === params.id)
    if (postIndex === -1) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

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

    const existingPost = data.posts[postIndex]
    data.posts[postIndex] = {
      ...existingPost,
      platform,
      content: content || '',
      scheduledDate,
      scheduledTime: scheduledTime || '',
      imageUrl: imageUrl || undefined,
      status: finalStatus,
      updatedAt: new Date().toISOString(),
      emailSubject: emailSubject || undefined,
      emailTo: emailTo || undefined,
      emailBody: emailBody || undefined,
      newsletterId: newsletterId || undefined,
    }

    // Sort posts by scheduled date and time
    data.posts.sort((a, b) => {
      const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime || '00:00'}`)
      const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime || '00:00'}`)
      return dateA.getTime() - dateB.getTime()
    })

    await writeDataFile('social-media-calendar.json', data)

    return NextResponse.json({ success: true, post: data.posts[postIndex] })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating social media post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminAuth()

    // Load existing data
    const data = await readDataFile<SocialMediaCalendarData>('social-media-calendar.json', { posts: [] })

    // Find and remove the post
    const postIndex = data.posts.findIndex(p => p.id === params.id)
    if (postIndex === -1) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    data.posts.splice(postIndex, 1)
    await writeDataFile('social-media-calendar.json', data)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting social media post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}

