import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const useSupabaseStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const SUPABASE_BUCKET = process.env.SUPABASE_LOGOS_BUCKET || 'labs-logos'

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

function buildFileName(file: File) {
  const rawName = file.name || 'logo'
  const sanitizedBase = rawName
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'logo'

  const detectedExt = (() => {
    const match = /\.([a-z0-9]+)$/i.exec(rawName)
    if (match) {
      return `.${match[1].toLowerCase()}`
    }
    if (file.type === 'image/png') return '.png'
    if (file.type === 'image/webp') return '.webp'
    if (file.type === 'image/svg+xml') return '.svg'
    return '.jpg'
  })()

  const suffix = randomUUID()
  const timestamp = Date.now()
  const filename = `${timestamp}-${suffix}-${sanitizedBase}${detectedExt}`
  return {
    storagePath: `logos/${filename}`,
    filename,
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const maxSizeBytes = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const fileNameInfo = buildFileName(file)

    if (useSupabaseStorage) {
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
        throw new Error('Failed to upload image')
      }

      const { data: publicUrlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(fileNameInfo.storagePath)

      return NextResponse.json({
        success: true,
        url: publicUrlData.publicUrl,
        filename: fileNameInfo.filename,
      })
    }

    // Local upload fallback (development)
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'labs', 'logos')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filePath = join(uploadsDir, fileNameInfo.filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/labs/logos/${fileNameInfo.filename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: fileNameInfo.filename,
    })
  } catch (error: any) {
    console.error('Error uploading logo:', error)
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
  }
}

