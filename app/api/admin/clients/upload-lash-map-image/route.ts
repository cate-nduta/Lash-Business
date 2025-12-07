import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, or WebP' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max for photos)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }

    // Check if we're in a serverless environment (Netlify, Vercel, etc.)
    const isServerless = process.env.NETLIFY === 'true' || process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME
    
    if (isServerless) {
      // In serverless environments, we can't write to filesystem
      // Convert image to base64 data URL as a workaround
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`
      
      return NextResponse.json({
        success: true,
        imageUrl: dataUrl,
        message: 'Image uploaded successfully (using data URL - works in serverless environments)',
      })
    }

    // For non-serverless environments, save to filesystem
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'lash-maps')
      try {
        await mkdir(uploadsDir, { recursive: true })
      } catch (err: any) {
        // Check if error is because directory already exists
        if (err.code !== 'EEXIST') {
          console.error('Error creating uploads directory:', err)
          throw err
        }
      }

      // Generate filename with timestamp
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `lash-map-${Date.now()}.${ext}`
      const filepath = path.join(uploadsDir, filename)

      // Save file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      const imageUrl = `/uploads/lash-maps/${filename}`

      return NextResponse.json({
        success: true,
        imageUrl,
        message: 'Image uploaded successfully',
      })
    } catch (fsError: any) {
      console.error('File system error:', fsError)
      // Fallback to base64 if filesystem write fails
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`
      
      return NextResponse.json({
        success: true,
        imageUrl: dataUrl,
        message: 'Image uploaded successfully (using data URL - filesystem write not available)',
      })
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading lash map image:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload image',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

