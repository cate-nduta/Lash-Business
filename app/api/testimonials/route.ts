import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'

interface Testimonial {
  id: string
  name: string
  message: string
  rating: number
  photoUrl?: string
  createdAt: string
  status?: 'pending' | 'approved' | 'rejected'
}

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

    return NextResponse.json({ testimonials: approvedTestimonials })
  } catch (error) {
    console.error('Error loading testimonials:', error)
    return NextResponse.json({ testimonials: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await readDataFile<{ testimonials: Testimonial[] }>('testimonials.json', { testimonials: [] })
    const testimonials = data.testimonials || []

    const body = await request.json()
    const { name, message, rating, photoUrl } = body

    if (!name || !message || !rating) {
      return NextResponse.json(
        { success: false, error: 'Name, message, and rating are required' },
        { status: 400 }
      )
    }

    const newTestimonial: Testimonial = {
      id: `testimonial-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      message,
      rating,
      photoUrl: photoUrl || null,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    testimonials.push(newTestimonial)
    await writeDataFile('testimonials.json', { testimonials })

    return NextResponse.json({ success: true, testimonial: newTestimonial })
  } catch (error) {
    console.error('Error submitting testimonial:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit testimonial' }, { status: 500 })
  }
}

