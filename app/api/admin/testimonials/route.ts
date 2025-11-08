import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

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
    await requireAdminAuth()
    const data = await readDataFile<{ testimonials: Testimonial[] }>('testimonials.json', { testimonials: [] })
    return NextResponse.json({ testimonials: data.testimonials || [] })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error loading testimonials:', error)
    return NextResponse.json({ testimonials: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await readDataFile<{ testimonials: Testimonial[] }>('testimonials.json', { testimonials: [] })
    const testimonials = data.testimonials || []

    const body = await request.json()
    const { testimonial } = body as { testimonial: Testimonial }

    if (!testimonial || !testimonial.id) {
      return NextResponse.json({ error: 'Invalid testimonial data' }, { status: 400 })
    }

    const index = testimonials.findIndex((item) => item.id === testimonial.id)
    if (index === -1) {
      testimonials.push(testimonial)
    } else {
      testimonials[index] = testimonial
    }

    await writeDataFile('testimonials.json', { testimonials })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error saving testimonial:', error)
    return NextResponse.json({ error: 'Failed to save testimonial' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminAuth()
    const data = await readDataFile<{ testimonials: Testimonial[] }>('testimonials.json', { testimonials: [] })
    const testimonials = data.testimonials || []

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Testimonial ID is required' }, { status: 400 })
    }

    const filtered = testimonials.filter((testimonial) => testimonial.id !== id)

    await writeDataFile('testimonials.json', { testimonials: filtered })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting testimonial:', error)
    return NextResponse.json({ error: 'Failed to delete testimonial' }, { status: 500 })
  }
}

