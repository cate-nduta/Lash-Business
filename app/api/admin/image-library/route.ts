import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface ImageLibraryPayload {
  eyeShapes: Array<EyeShapeOption>
}

interface EyeShapeOption {
  id: string
  label: string
  imageUrl: string
  description?: string | null
  recommendedStyles: string[]
  createdAt?: string | null
  updatedAt?: string | null
  isActive?: boolean
}

const DEFAULT_LIBRARY: ImageLibraryPayload & { updatedAt: string | null } = { eyeShapes: [], updatedAt: null }

export async function GET() {
  try {
    await requireAdminAuth()
    const library = await readDataFile('image-library.json', DEFAULT_LIBRARY)
    return NextResponse.json(library)
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching image library:', error)
    return NextResponse.json(DEFAULT_LIBRARY, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const body = (await request.json()) as Partial<ImageLibraryPayload>

    const eyeShapes = Array.isArray(body.eyeShapes) ? body.eyeShapes : []
    const updatedAt = new Date().toISOString()

    let normalized
    try {
      normalized = {
        eyeShapes: eyeShapes.map(normalizeEyeShape),
        updatedAt,
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Invalid image option provided.' },
        { status: 400 },
      )
    }

    await writeDataFile('image-library.json', normalized)

    return NextResponse.json({ success: true, updatedAt })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving image library:', error)
    return NextResponse.json({ error: 'Failed to save image library' }, { status: 500 })
  }
}

function normalizeEyeShape(option: any): EyeShapeOption {
  if (!option || typeof option !== 'object') {
    throw new Error('Invalid image option payload')
  }

  const id = typeof option.id === 'string' && option.id.trim().length > 0 ? option.id.trim() : randomUUID()
  const label = typeof option.label === 'string' ? option.label.trim() : ''
  const imageUrl = typeof option.imageUrl === 'string' ? option.imageUrl.trim() : ''

  if (!label || !imageUrl) {
    throw new Error('Image option must include label and imageUrl')
  }

  const recommendedStyles: string[] = Array.isArray(option.recommendedStyles)
    ? option.recommendedStyles
        .map((entry: any) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry: string) => entry.length > 0)
    : []

  const now = new Date().toISOString()

  return {
    id,
    label,
    imageUrl,
    description:
      typeof option.description === 'string' && option.description.trim().length > 0
        ? option.description.trim()
        : null,
    recommendedStyles,
    createdAt:
      typeof option.createdAt === 'string' && option.createdAt.trim().length > 0 ? option.createdAt.trim() : now,
    updatedAt: now,
    isActive:
      typeof option.isActive === 'boolean'
        ? option.isActive
        : option.isActive === undefined
        ? true
        : Boolean(option.isActive),
  }
}
