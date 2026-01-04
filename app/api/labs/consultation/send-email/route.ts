import { NextRequest, NextResponse } from 'next/server'
import { readDataFile } from '@/lib/data-utils'
import { sendConsultationEmail } from '../email-utils'
import type { ConsultationSubmission } from '../route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Send consultation confirmation email
 * POST /api/labs/consultation/send-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { consultationId, email } = body

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Consultation ID is required' },
        { status: 400 }
      )
    }

    // Find the consultation - check both main consultations and pending consultations
    let consultation: ConsultationSubmission | null = null

    // First, check main consultations file
    try {
      const consultationsData = await readDataFile<{ consultations: ConsultationSubmission[] }>(
        'labs-consultations.json',
        { consultations: [] }
      )
      consultation = consultationsData.consultations.find(
        (c) => c.consultationId === consultationId
      ) || null
    } catch (error) {
      console.error('Error reading consultations file:', error)
    }

    // If not found, check pending consultations
    if (!consultation) {
      try {
        const pendingConsultations = await readDataFile<Array<{
          consultationId: string
          consultationData: ConsultationSubmission
          createdAt: string
        }>>('pending-consultations.json', [])

        const pendingConsultation = pendingConsultations.find(
          (pc) => pc.consultationId === consultationId
        )

        if (pendingConsultation) {
          consultation = pendingConsultation.consultationData
        }
      } catch (error) {
        console.error('Error reading pending consultations file:', error)
      }
    }

    if (!consultation) {
      console.error('Consultation not found:', consultationId)
      return NextResponse.json(
        { 
          error: 'Consultation not found',
          details: `No consultation found with ID: ${consultationId}. It may not have been created yet or the payment webhook hasn't processed it.`
        },
        { status: 404 }
      )
    }

    // Verify email matches (optional security check)
    if (email && consultation.email !== email) {
      return NextResponse.json(
        { error: 'Email does not match consultation' },
        { status: 403 }
      )
    }

    // Ensure consultation has required fields for email
    if (!consultation.email) {
      console.error('Consultation missing email:', consultationId)
      return NextResponse.json(
        {
          error: 'Consultation missing email address',
          details: 'Cannot send email without recipient email address',
        },
        { status: 400 }
      )
    }

    // Send the consultation confirmation email
    try {
      console.log('📧 Attempting to send consultation confirmation email:', {
        consultationId,
        email: consultation.email,
        preferredDate: consultation.preferredDate,
        preferredTime: consultation.preferredTime,
        status: consultation.status,
        paymentStatus: consultation.paymentStatus,
      })

      await sendConsultationEmail(consultation)
      
      console.log('✅ Consultation confirmation email sent successfully:', {
        consultationId,
        email: consultation.email,
      })

      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent successfully',
        email: consultation.email,
      })
    } catch (emailError: any) {
      console.error('❌ Error sending consultation email:', {
        consultationId,
        email: consultation.email,
        error: emailError?.message || emailError,
        stack: emailError?.stack,
      })
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: emailError.message || 'Unknown error',
          email: consultation.email,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in send-email endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

