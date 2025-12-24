import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB for images
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Please provide an image file.' }, { status: 400 })
    }

    const fileType = (file.type || '').toLowerCase()
    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please upload JPEG, PNG, WebP, GIF, or SVG image files.' 
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `Image must be ${MAX_FILE_SIZE / (1024 * 1024)}MB or smaller. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
      }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'course-images')
    await mkdir(uploadsDir, { recursive: true })

    // Get file extension
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = path.join(uploadsDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Return the public URL
    const url = `/uploads/course-images/${filename}`

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
    console.error('Error uploading image:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to upload image' 
    }, { status: 500 })
  }
}

