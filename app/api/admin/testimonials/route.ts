import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { requireAdminAuth } from '@/lib/admin-auth'

interface Testimonial {
  id: string
  name: string
  email: string
  photo?: string
  testimonial: string
  rating?: number
  date: string
  approved: boolean
  service?: string
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    const data = readDataFile<{ testimonials: Testimonial[] }>('testimonials.json')
    // Return all testimonials, sorted by date (newest first)
    const testimonials = (data.testimonials || [])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return NextResponse.json({ testimonials })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching testimonials:', error)
    return NextResponse.json({ testimonials: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth(request)
    
    const body = await request.json()
    const { action, testimonialId, approved } = body

    if (action === 'approve' || action === 'reject') {
      const data = readDataFile<{ testimonials: Testimonial[] }>('testimonials.json')
      const testimonials = data.testimonials || []
      
      const index = testimonials.findIndex(t => t.id === testimonialId)
      if (index === -1) {
        return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
      }

      if (action === 'approve') {
        testimonials[index].approved = true
      } else {
        // Remove rejected testimonial
        testimonials.splice(index, 1)
      }

      writeDataFile('testimonials.json', { testimonials })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      const data = readDataFile<{ testimonials: Testimonial[] }>('testimonials.json')
      const testimonials = data.testimonials || []
      
      const filtered = testimonials.filter(t => t.id !== testimonialId)
      writeDataFile('testimonials.json', { testimonials: filtered })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating testimonial:', error)
    return NextResponse.json({ error: 'Failed to update testimonial' }, { status: 500 })
  }
}

