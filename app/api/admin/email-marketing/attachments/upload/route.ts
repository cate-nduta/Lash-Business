import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const formData = await request.formData()
    const file = formData.get('attachment') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'email-attachments')
    const extension = file.name.split('.').pop() || 'bin'
    const fileName = `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
    const filePath = path.join(uploadsDir, fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentBase64 = buffer.toString('base64')
    let url = ''

    try {
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(filePath, buffer)
      url = `/uploads/email-attachments/${fileName}`
    } catch (writeError) {
      console.warn('Could not persist email attachment to public uploads; using inline attachment data.', writeError)
      url = `inline://${fileName}`
    }

    return NextResponse.json({
      success: true,
      attachment: {
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        contentBase64,
      },
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 })
  }
}

