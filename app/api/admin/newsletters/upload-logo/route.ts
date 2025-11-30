import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 })
    }

    // Validate file type
    const fileType = file.type?.toLowerCase() || ''
    const fileName = file.name?.toLowerCase() || ''
    const fileExtension = fileName.split('.').pop() || ''

    const isValidType = ALLOWED_TYPES.includes(fileType) ||
      ['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(fileExtension)

    if (!isValidType) {
      return NextResponse.json({
        error: `File must be a PNG, JPG, SVG, or WebP image. Received type: ${fileType || 'unknown'} (extension: ${fileExtension || 'none'})`
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 2MB limit' }, { status: 400 })
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'newsletters', 'logos')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).slice(2, 8)
    const extension = fileExtension || 'png'
    const filename = `newsletter-logo-${timestamp}-${randomStr}.${extension}`
    const filePath = path.join(uploadsDir, filename)

    // Save file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filePath, buffer)

    const logoUrl = `/uploads/newsletters/logos/${filename}`

    return NextResponse.json({
      success: true,
      logoUrl,
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading newsletter logo:', error)
    return NextResponse.json({
      error: 'Failed to upload logo',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

