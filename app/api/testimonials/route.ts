import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

interface Testimonial {
  id: string
  name: string
  email?: string
  testimonial: string
  rating: number
  photoUrl?: string | null
  createdAt: string
  status?: 'pending' | 'approved' | 'rejected'
}

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'testimonials')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export const runtime = 'nodejs'
export const revalidate = 60 // Revalidate every 60 seconds

export async function GET(request: NextRequest) {
  try {
    const data = await readDataFile<{ testimonials: Testimonial[] }>('testimonials.json', { testimonials: [] })
    const testimonials = data.testimonials || []

    const approvedTestimonials = testimonials
      .filter((testimonial) => testimonial.status !== 'rejected')
      .map((testimonial) => ({
        ...testimonial,
        status: testimonial.status || 'approved',
      }))

    return NextResponse.json({ testimonials: approvedTestimonials }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error loading testimonials:', error)
    return NextResponse.json({ testimonials: [] }, { 
      status: 500,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
      },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const data = await readDataFile<{ testimonials: Testimonial[] }>('testimonials.json', { testimonials: [] })
    const testimonials = data.testimonials || []

    let name = ''
    let email = ''
    let testimonialText = ''
    let ratingValue = 0
    let photoUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = String(formData.get('name') || '').trim()
      email = String(formData.get('email') || '').trim()
      testimonialText = String(formData.get('testimonial') || '').trim()
      ratingValue = Number(formData.get('rating') || 0)

      const file = formData.get('photo')
      if (file instanceof File && file.size > 0) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return NextResponse.json(
            { success: false, error: 'Please upload a JPG, PNG, or WebP image.' },
            { status: 400 },
          )
        }
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, error: 'Image must be smaller than 5MB.' },
            { status: 400 },
          )
        }

        if (!existsSync(UPLOAD_DIR)) {
          await mkdir(UPLOAD_DIR, { recursive: true })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filename = `${Date.now()}-${safeName}`
        const filePath = join(UPLOAD_DIR, filename)
        await writeFile(filePath, buffer)

        photoUrl = `/uploads/testimonials/${filename}`
      }
    } else {
      const body = await request.json()
      name = String(body?.name || '').trim()
      email = String(body?.email || '').trim()
      testimonialText = String(body?.testimonial || body?.message || '').trim()
      ratingValue = Number(body?.rating || 0)
      photoUrl = body?.photoUrl ? String(body.photoUrl) : null
    }

    if (!name || !testimonialText || !ratingValue) {
      return NextResponse.json(
        { success: false, error: 'Name, testimonial, and rating are required.' },
        { status: 400 },
      )
    }

    if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5 stars.' },
        { status: 400 },
      )
    }

    const newTestimonial: Testimonial = {
      id: `testimonial-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      email: email || undefined,
      testimonial: testimonialText,
      rating: ratingValue,
      photoUrl,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    testimonials.push(newTestimonial)
    await writeDataFile('testimonials.json', { testimonials })

    return NextResponse.json({
      success: true,
      testimonial: newTestimonial,
      message: 'Thank you for sharing! Your testimonial is pending review.',
    })
  } catch (error) {
    console.error('Error submitting testimonial:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit testimonial' }, { status: 500 })
  }
}

