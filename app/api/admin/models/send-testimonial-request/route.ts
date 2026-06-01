import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendTestimonialRequestEmail } from '@/lib/email/send-testimonial-request'

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()

    const { applicationId } = await request.json()
    if (!applicationId) {
      return NextResponse.json({ error: 'Model application ID is required' }, { status: 400 })
    }

    const data = await readDataFile<{ applications: any[] }>('model-applications.json', { applications: [] })
    const applications = Array.isArray(data.applications) ? data.applications : []
    const index = applications.findIndex((application) => application.id === applicationId)
    const application = index >= 0 ? applications[index] : null

    if (!application) {
      return NextResponse.json({ error: 'Model application not found' }, { status: 404 })
    }

    const email = String(application.email || '').trim()
    if (!email) {
      return NextResponse.json({ error: 'Model application has no email address' }, { status: 400 })
    }

    const name = `${application.firstName || ''} ${application.lastName || ''}`.trim() || application.firstName || 'Beautiful Soul'
    const result = await sendTestimonialRequestEmail({
      to: email,
      name,
      service: 'Lash model appointment',
      appointmentDate: application.availability,
      appointmentTime: application.availability,
      modelApplicationId: application.id,
      source: 'model',
    })

    application.testimonialRequested = true
    application.testimonialRequestedAt = new Date().toISOString()
    application.testimonialRequestEmailSent = result.success
    application.testimonialRequestProvider = result.provider
    if (result.error) {
      application.testimonialRequestError = result.error
    }

    await writeDataFile('model-applications.json', { applications })

    return NextResponse.json({
      success: true,
      emailSent: result.success,
      provider: result.provider,
      message: result.success
        ? 'Model testimonial request email sent successfully.'
        : result.error || 'Email service is not configured.',
    })
  } catch (error) {
    console.error('Error sending model testimonial request:', error)
    return NextResponse.json({ error: 'Failed to send model testimonial request' }, { status: 500 })
  }
}
