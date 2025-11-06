import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

export async function GET() {
  try {
    const data = readDataFile<{ testimonials: Testimonial[] }>('testimonials.json')
    // Return only approved testimonials, sorted by date (newest first)
    const approved = (data.testimonials || [])
      .filter(t => t.approved)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return NextResponse.json({ testimonials: approved })
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    return NextResponse.json({ testimonials: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const testimonial = formData.get('testimonial') as string
    const rating = formData.get('rating') ? parseInt(formData.get('rating') as string) : undefined
    const photoFile = formData.get('photo') as File | null

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // At least testimonial text or photo must be provided
    if (!testimonial && (!photoFile || photoFile.size === 0)) {
      return NextResponse.json(
        { error: 'Please provide either a testimonial text or a photo (or both)' },
        { status: 400 }
      )
    }

    let photoUrl: string | undefined = undefined

    // Handle photo upload
    if (photoFile && photoFile.size > 0) {
      try {
        const bytes = await photoFile.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Validate file size (5MB max)
        if (buffer.length > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'File size must be less than 5MB' },
            { status: 400 }
          )
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'testimonials')
        await mkdir(uploadsDir, { recursive: true })

        // Generate unique filename
        const timestamp = Date.now()
        const originalName = photoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `${timestamp}-${originalName}`
        const filepath = path.join(uploadsDir, filename)

        // Save file
        await writeFile(filepath, buffer)

        // Generate URL
        photoUrl = `/uploads/testimonials/${filename}`
      } catch (uploadError) {
        console.error('Error uploading photo:', uploadError)
        // Continue without photo if upload fails
      }
    }

    const data = readDataFile<{ testimonials: Testimonial[] }>('testimonials.json')
    const testimonials = data.testimonials || []

    // Use testimonial text or a default message if only photo is provided
    const testimonialText = testimonial.trim() || (photoUrl ? 'Photo testimonial' : '')

    const newTestimonial: Testimonial = {
      id: `testimonial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      photo: photoUrl,
      testimonial: testimonialText,
      rating: rating || undefined,
      date: new Date().toISOString(),
      approved: false, // Requires admin approval
    }

    testimonials.push(newTestimonial)
    writeDataFile('testimonials.json', { testimonials })

    return NextResponse.json({ 
      success: true, 
      message: 'Thank you for your testimonial! It will be reviewed and published soon.',
      testimonial: newTestimonial 
    })
  } catch (error) {
    console.error('Error submitting testimonial:', error)
    return NextResponse.json(
      { error: 'Failed to submit testimonial' },
      { status: 500 }
    )
  }
}

