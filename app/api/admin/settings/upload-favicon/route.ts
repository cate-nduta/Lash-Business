import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

const MAX_SIZE = 1024 * 1024 // 1MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const formData = await request.formData()
    const file = formData.get('favicon') as File

    if (!file) {
      return NextResponse.json({ error: 'No favicon file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload PNG, JPG, SVG, WebP, or ICO' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 1MB' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'favicon')
    await mkdir(uploadsDir, { recursive: true })

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png'
    const filename = `favicon-${Date.now()}.${ext}`
    const filepath = path.join(uploadsDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const faviconUrl = `/uploads/favicon/${filename}`
    const faviconVersion = Date.now()

    try {
      const settings = await readDataFile<any>('settings.json', {})
      const business = settings?.business ?? {}
      const updatedSettings = {
        ...settings,
        business: {
          ...business,
          faviconUrl,
          faviconVersion,
        },
      }
      await writeDataFile('settings.json', updatedSettings)
      return NextResponse.json({
        success: true,
        faviconUrl,
        faviconVersion,
        settings: updatedSettings,
        message: 'Favicon uploaded successfully',
      })
    } catch (error) {
      console.error('Error persisting favicon settings:', error)
      // Even if persisting fails, still return upload result
      return NextResponse.json({
        success: true,
        faviconUrl,
        faviconVersion,
        message: 'Favicon uploaded, but settings could not be updated automatically. Please save changes manually.',
      })
    }

  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading favicon:', error)
    return NextResponse.json({ error: 'Failed to upload favicon' }, { status: 500 })
  }
}
