import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from './utils'

type EyeShapeSelection = {
  id: string
  label: string
  imageUrl: string
  description: string | null
  recommendedStyles: string[]
}

const normalizeEyeShape = (selection: any): EyeShapeSelection | null => {
  if (!selection || typeof selection !== 'object') return null
  const id = typeof selection.id === 'string' ? selection.id.trim() : ''
  const label = typeof selection.label === 'string' ? selection.label.trim() : ''
  const imageUrl = typeof selection.imageUrl === 'string' ? selection.imageUrl.trim() : ''
  if (!id || !label || !imageUrl) return null
  const description =
    typeof selection.description === 'string' && selection.description.trim().length > 0
      ? selection.description.trim()
      : null
  const recommendedStyles = Array.isArray(selection.recommendedStyles)
    ? selection.recommendedStyles
        .map((entry: any) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry: string) => entry.length > 0)
    : []
  return { id, label, imageUrl, description, recommendedStyles }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      service,
      date,
      timeSlot,
      location,
      originalPrice,
      discount,
      finalPrice,
      deposit,
      manageToken,
      bookingId,
      policyWindowHours,
      eyeShape,
      desiredLook,
    } = body

    // Validate required fields
    if (!name || !email || !phone || !timeSlot || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (typeof desiredLook !== 'string' || desiredLook.trim().length === 0) {
      return NextResponse.json(
        { error: 'Desired look is required.' },
        { status: 400 },
      )
    }

    const normalizedEyeShape = normalizeEyeShape(eyeShape)
    if (!normalizedEyeShape) {
      return NextResponse.json(
        { error: 'Eye shape selection is required.' },
        { status: 400 },
      )
    }

    const desiredLookNormalized = desiredLook.trim()
    const normalizeStyleName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const desiredLookMatchesRecommendation = normalizedEyeShape.recommendedStyles.some(
      (style) => normalizeStyleName(style) === normalizeStyleName(desiredLookNormalized),
    )
    const desiredLookStatus: 'recommended' | 'custom' = desiredLookMatchesRecommendation ? 'recommended' : 'custom'

    // Send email notifications
    const result = await sendEmailNotification({
      name,
      email,
      phone,
      service: service || '',
      date,
      timeSlot,
      location,
      originalPrice,
      discount,
      finalPrice,
      deposit,
      manageToken,
      bookingId,
      policyWindowHours,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      eyeShape: normalizedEyeShape,
      desiredLook: desiredLookNormalized,
      desiredLookStatus,
      desiredLookMatchesRecommendation,
    })

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          status: 'error',
          error: 'Email notification service did not return a response.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ...result,
      message: result.success
        ? 'Email notifications sent successfully'
        : result.error || 'Email service not configured',
    })
  } catch (error: any) {
    console.error('Error sending email notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error.message },
      { status: 500 }
    )
  }
}
