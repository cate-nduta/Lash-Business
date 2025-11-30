import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 6 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const formData = await request.formData()
    const file = (formData.get('asset') || formData.get('file')) as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Please provide an image file.' }, { status: 400 })
    }

    const fileType = (file.type || '').toLowerCase()
    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      return NextResponse.json({ error: 'Unsupported file type. Upload JPG, PNG, WEBP or GIF.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be 6MB or smaller.' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'newsletter-assets')
    await mkdir(uploadsDir, { recursive: true })

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const filename = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filepath = path.join(uploadsDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const url = `/uploads/newsletter-assets/${filename}`

    return NextResponse.json({
      success: true,
      url,
      size: file.size,
      mimeType: fileType,
    })
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading newsletter asset:', error)
    return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 })
  }
}
