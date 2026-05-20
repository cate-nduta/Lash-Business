import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const useSupabaseStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const SUPABASE_BUCKET = process.env.SUPABASE_STUDIO_BUCKET || process.env.SUPABASE_HOMEPAGE_BUCKET || 'homepage-images'
const isProduction = process.env.NODE_ENV === 'production'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

async function ensureBucket(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>) {
  try {
    const { data, error } = await supabase.storage.getBucket(SUPABASE_BUCKET)
    if (!data && error?.message?.toLowerCase().includes('not found')) {
      const { error: createError } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
        public: true,
        fileSizeLimit: String(MAX_SIZE_BYTES),
      })
      if (createError && !createError.message?.toLowerCase().includes('already exists')) {
        throw createError
      }
    } else if (error) {
      throw error
    }
  } catch (error) {
    console.error('Failed to verify/create Supabase bucket:', error)
    throw new Error('Supabase storage bucket error')
  }
}

function buildFileName(file: File) {
  const rawName = file.name || 'hero-image'
  const sanitizedBase = rawName
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'hero-image'

  const detectedExt = (() => {
    const match = /\.([a-z0-9]+)$/i.exec(rawName)
    if (match) {
      return `.${match[1].toLowerCase()}`
    }
    if (file.type === 'image/svg+xml') return '.svg'
    if (file.type === 'image/png') return '.png'
    if (file.type === 'image/webp') return '.webp'
    if (file.type === 'image/gif') return '.gif'
    return '.jpg'
  })()

  const filename = `${Date.now()}-${randomUUID()}-${sanitizedBase}${detectedExt}`
  return {
    storagePath: `studio/${filename}`,
    filename,
  }
}

function validateSvg(buffer: Buffer) {
  const svgText = buffer.toString('utf8')
  const unsafeSvgPattern = /<script|on\w+\s*=|javascript:|<foreignObject/i
  if (unsafeSvgPattern.test(svgText)) {
    throw new Error('This SVG contains unsupported interactive code. Please export a clean/static SVG from Canva.')
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, WebP, GIF, or SVG image.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File size too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const fileNameInfo = buildFileName(file)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (file.type === 'image/svg+xml') {
      validateSvg(buffer)
    }

    if (useSupabaseStorage) {
      const supabase = getSupabaseAdminClient()
      if (!supabase) {
        return NextResponse.json(
          {
            error:
              'Image storage is not configured on the server. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your hosting environment.',
          },
          { status: 500 },
        )
      }

      await ensureBucket(supabase)

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(fileNameInfo.storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Supabase studio upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload image to storage' }, { status: 500 })
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(fileNameInfo.storagePath)

      return NextResponse.json(
        {
          success: true,
          url: publicUrlData.publicUrl,
          filename: fileNameInfo.filename,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        },
      )
    }

    if (isProduction) {
      return NextResponse.json(
        {
          error:
            'Image storage is not configured on the published website. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your hosting environment.',
        },
        { status: 500 },
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'studio')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filepath = join(uploadDir, fileNameInfo.filename)
    await writeFile(filepath, buffer)

    const publicUrl = `/uploads/studio/${fileNameInfo.filename}`

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        filename: fileNameInfo.filename,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error uploading studio file:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 },
    )
  }
}
