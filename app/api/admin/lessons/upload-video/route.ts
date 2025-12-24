import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB for videos
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov files
  'video/x-msvideo', // .avi files
]

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const formData = await request.formData()
    const file = formData.get('video') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Please provide a video file.' }, { status: 400 })
    }

    const fileType = (file.type || '').toLowerCase()
    if (!ALLOWED_VIDEO_TYPES.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload MP4, WebM, OGG, MOV, or AVI video files.' 
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `Video must be ${MAX_FILE_SIZE / (1024 * 1024)}MB or smaller. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'course-videos')
    await mkdir(uploadsDir, { recursive: true })

    // Get file extension
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const ext = originalName.split('.').pop()?.toLowerCase() || 'mp4'
    const filename = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = path.join(uploadsDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Return the public URL
    const url = `/uploads/course-videos/${filename}`

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      mimeType: fileType,
    })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading video:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to upload video' 
    }, { status: 500 })
  }
}

