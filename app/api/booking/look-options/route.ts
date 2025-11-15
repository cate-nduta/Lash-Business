import { NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EyeShapeOption {
  id: string
  label: string
  imageUrl: string
  description?: string | null
  recommendedStyles: string[]
  isActive?: boolean
}

const DEFAULT_RESPONSE = {
  eyeShapes: [] as EyeShapeOption[],
  updatedAt: null as string | null,
}

export async function GET() {
  try {
    const data = await readDataFile('image-library.json', DEFAULT_RESPONSE)
    
    console.log('Raw image library data:', JSON.stringify(data, null, 2))
    console.log('Eye shapes array:', Array.isArray(data.eyeShapes) ? data.eyeShapes.length : 'not an array')

    const mapOption = (option: any): EyeShapeOption | null => {
      if (!option || typeof option !== 'object') {
        console.log('Skipping invalid option:', option)
        return null
      }
      if (option.isActive === false) {
        console.log('Skipping inactive option:', option.id)
        return null
      }
      const id = typeof option.id === 'string' ? option.id.trim() : ''
      const label = typeof option.label === 'string' ? option.label.trim() : ''
      const imageUrl = typeof option.imageUrl === 'string' ? option.imageUrl.trim() : ''
      if (!id || !label || !imageUrl) {
        console.log('Skipping option with missing fields:', { id, label, hasImageUrl: !!imageUrl })
        return null
      }
      return {
        id,
        label,
        imageUrl,
        description:
          typeof option.description === 'string' && option.description.trim().length > 0
            ? option.description.trim()
            : null,
        recommendedStyles: Array.isArray(option.recommendedStyles)
          ? option.recommendedStyles
              .map((entry: any) => (typeof entry === 'string' ? entry.trim() : ''))
              .filter((entry: string) => entry.length > 0)
          : [],
      }
    }

    const mappedOptions = Array.isArray(data.eyeShapes) ? data.eyeShapes.map(mapOption).filter(Boolean) : []
    console.log('Mapped eye shape options:', mappedOptions.length)

    const responseBody = {
      eyeShapes: mappedOptions,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    }

    console.log('Returning response with', responseBody.eyeShapes.length, 'eye shapes')

    // Prevent caching to ensure fresh data
    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error loading booking look options:', error)
    return NextResponse.json(DEFAULT_RESPONSE, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  }
}
