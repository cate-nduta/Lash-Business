import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const MAX_FILE_SIZE = 6 * 1024 * 1024 // 6MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads', 'client-photos')

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPG, PNG, or WebP image.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be under 6MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${Date.now()}-${safeName}`
    const filePath = join(UPLOADS_DIR, filename)

    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/client-photos/${filename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error('Client photo upload failed:', error)
    return NextResponse.json({ error: 'Failed to upload photo. Please try again.' }, { status: 500 })
  }
}


