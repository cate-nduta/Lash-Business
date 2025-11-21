import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const useSupabaseStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const SUPABASE_BUCKET = process.env.SUPABASE_IMAGE_LIBRARY_BUCKET || 'booking-look-library'
const ALLOWED_CATEGORIES = new Set(['eyeShapes'])

async function ensureBucket(supabase: ReturnType<typeof getSupabaseAdminClient>) {
  try {
    const { data, error } = await supabase.storage.getBucket(SUPABASE_BUCKET)
    if (!data && error?.message?.toLowerCase().includes('not found')) {
      const { error: createError } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
        public: true,
        fileSizeLimit: '5242880', // 5MB
      })
      if (createError && !createError.message?.toLowerCase().includes('already exists')) {
        throw createError
      }
    } else if (error) {
      throw error
    }
  } catch (error) {
    console.error('Failed to verify/create Supabase bucket:', error)
    throw new Error('Supabase bucket error')
  }
}

function buildFileName(file: File, category: string) {
  const rawName = file.name || 'image'
  const sanitizedBase = rawName
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image'

  const detectedExt = (() => {
    const match = /\.([a-z0-9]+)$/i.exec(rawName)
    if (match) {
      return `.${match[1].toLowerCase()}`
    }
    if (file.type === 'image/png') return '.png'
    if (file.type === 'image/webp') return '.webp'
    if (file.type === 'image/gif') return '.gif'
    return '.jpg'
  })()

  const suffix = randomUUID()
  const timestamp = Date.now()
  const filename = `${timestamp}-${suffix}-${sanitizedBase}${detectedExt}`
  return {
    storagePath: `${category}/${filename}`,
    filename,
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const categoryRaw = (formData.get('category') as string | null) || 'eyeShapes'
    const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : null

    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const maxSizeBytes = 5 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const fileNameInfo = buildFileName(file, category)

    // Try Supabase storage first if configured
    if (useSupabaseStorage) {
      try {
        const supabase = getSupabaseAdminClient()
        await ensureBucket(supabase)

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(fileNameInfo.storagePath, buffer, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          console.error('Supabase upload error:', uploadError)
          // Fall through to local storage as fallback
          console.log('Falling back to local file storage...')
        } else {
          // Success with Supabase
          const { data: publicUrlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(fileNameInfo.storagePath)

          return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl,
            filename: fileNameInfo.filename,
            category,
          })
        }
      } catch (supabaseError: any) {
        console.error('Supabase storage error:', supabaseError)
        // Fall through to local storage as fallback
        console.log('Falling back to local file storage...')
      }
    }

    // Local upload (development or fallback when Supabase fails)
    try {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'image-library', category)
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      const filePath = join(uploadsDir, fileNameInfo.filename)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      const publicUrl = `/uploads/image-library/${category}/${fileNameInfo.filename}`

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: fileNameInfo.filename,
        category,
      })
    } catch (localError: any) {
      console.error('Local file storage error:', localError)
      const errorMessage = localError?.message || 'Failed to save image file'
      return NextResponse.json(
        { 
          error: errorMessage,
          details: 'Please check file system permissions and ensure the uploads directory is writable.'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized. Please log in again.' }, { status: 401 })
    }
    console.error('Error uploading image library asset:', error)
    const errorMessage = error?.message || 'Failed to upload image'
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'An unexpected error occurred. Please try again or contact support.'
      },
      { status: 500 }
    )
  }
}
