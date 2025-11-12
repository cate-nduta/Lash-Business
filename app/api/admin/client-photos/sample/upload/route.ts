import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads', 'client-photos', 'sample')

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid form submission' }, { status: 400 })
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
      return NextResponse.json({ error: 'File must be smaller than 4MB.' }, { status: 400 })
    }

    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${Date.now()}-${safeName}`
    const filePath = join(UPLOADS_DIR, filename)

    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/client-photos/sample/${filename}`

    // Persist to settings
    const data = await readDataFile<{ clientPhotoSettings?: { sampleImageUrl?: string | null; instructions?: string | null } }>(
      'client-photos-settings.json',
      {},
    )

    const updated = {
      clientPhotoSettings: {
        sampleImageUrl: publicUrl,
        instructions: data.clientPhotoSettings?.instructions || null,
      },
    }

    await writeDataFile('client-photos-settings.json', updated)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Sample photo upload failed:', error)
    return NextResponse.json({ error: 'Failed to upload sample image' }, { status: 500 })
  }
}


