import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { requireAdminAuth } from '@/lib/admin-auth'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

const useSupabaseStorage = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const SUPABASE_GALLERY_BUCKET = process.env.SUPABASE_GALLERY_BUCKET || 'gallery'

async function uploadToSupabaseStorage(file: File, filename: string) {
  const supabase = getSupabaseAdminClient()
  
  if (!supabase) {
    throw new Error('Supabase client is not available. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  // Ensure bucket exists (idempotent)
  try {
    const { data, error } = await supabase.storage.getBucket(SUPABASE_GALLERY_BUCKET)
    if (error && error.message?.toLowerCase().includes('not found')) {
      const { error: createError } = await supabase.storage.createBucket(SUPABASE_GALLERY_BUCKET, {
        public: true,
        fileSizeLimit: '5MB',
      })
      if (createError && !createError.message?.toLowerCase().includes('already exists')) {
        throw createError
      }
    } else if (error) {
      throw error
    }
  } catch (error) {
    console.error('Failed to verify/create Supabase storage bucket:', error)
    throw new Error('Supabase storage bucket error')
  }

  const filePath = `gallery/${filename}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_GALLERY_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Supabase storage upload error:', uploadError)
    throw new Error('Failed to upload to Supabase Storage')
  }

  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_GALLERY_BUCKET)
    .getPublicUrl(filePath)

  return {
    url: publicUrlData.publicUrl,
    filename: filePath,
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${originalName}`

    if (useSupabaseStorage) {
      const result = await uploadToSupabaseStorage(file, filename)
      return NextResponse.json({
        success: true,
        url: result.url,
        filename: result.filename,
      })
    }

    // Fallback: save to local filesystem (development)
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'gallery')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filepath = join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    const publicUrl = `/uploads/gallery/${filename}`
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
    })
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

