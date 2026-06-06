import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const useSupabaseStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const SUPABASE_BUCKET = process.env.SUPABASE_TRAINING_BUCKET || 'training'
const PDF_MAX_SIZE = 15 * 1024 * 1024
const IMAGE_MAX_SIZE = 5 * 1024 * 1024

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

async function uploadToSupabaseStorage(file: File, filename: string) {
  const supabase = getSupabaseAdminClient()

  if (!supabase) {
    throw new Error('Supabase client is not available.')
  }

  try {
    const { error } = await supabase.storage.getBucket(SUPABASE_BUCKET)
    if (error && error.message?.toLowerCase().includes('not found')) {
      const { error: createError } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
        public: true,
        fileSizeLimit: `${PDF_MAX_SIZE}`,
        allowedMimeTypes: Array.from(allowedTypes),
      })
      if (createError && !createError.message?.toLowerCase().includes('already exists')) {
        throw createError
      }
    } else if (error) {
      throw error
    }
  } catch (error) {
    console.error('Failed to verify/create training storage bucket:', error)
    throw new Error('Training storage bucket error')
  }

  const filePath = filename
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filePath, buffer, {
    contentType: file.type,
    upsert: true,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath)
  return {
    url: data.publicUrl,
    filename: filePath,
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: 'Upload must be an image or PDF file' },
        { status: 400 },
      )
    }

    const maxSize = file.type === 'application/pdf' ? PDF_MAX_SIZE : IMAGE_MAX_SIZE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: file.type === 'application/pdf' ? 'PDF must be under 15MB' : 'Image must be under 5MB' },
        { status: 400 },
      )
    }

    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${originalName}`

    if (useSupabaseStorage) {
      const result = await uploadToSupabaseStorage(file, filename)
      return NextResponse.json({ success: true, ...result })
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'training')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filepath = join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    return NextResponse.json({
      success: true,
      url: `/uploads/training/${filename}`,
      filename,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading training asset:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
