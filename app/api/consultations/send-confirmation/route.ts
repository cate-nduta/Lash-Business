import { NextRequest, NextResponse } from 'next/server'
import { readDataFile, writeDataFile } from '@/lib/data-utils'
import { sendConsultationEmail } from '@/app/api/labs/consultation/email-utils'
import { verifyTransaction } from '@/lib/paystack-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Send consultation confirmation emails and confirm the consultation after payment
 * POST /api/consultations/send-confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    // Verify the payment transaction first
    const verification = await verifyTransaction(reference)
    
    if (!verification.success || verification.transaction?.status !== 'success') {
      return NextResponse.json(
        { error: 'Payment verification failed. Please ensure the payment was successful.' },
        { status: 400 }
      )
    }

    // Find consultation by payment reference
    const consultationsData = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    const consultation = consultationsData.consultations.find(
      c => c.paymentTransactionId === reference || c.paymentOrderTrackingId === reference
    )

    if (!consultation) {
      // Check pending consultations as well
      const pendingConsultations = await readDataFile<Array<{
        consultationId: string
        consultationData: any
        createdAt: string
      }>>('pending-consultations.json', [])

      const pendingConsultation = pendingConsultations.find(
        pc => pc.consultationData.paymentOrderTrackingId === reference
      )

      if (pendingConsultation) {
        // Move from pending to confirmed consultations
        const consultationData = {
          ...pendingConsultation.consultationData,
          paymentStatus: 'paid',
          status: 'confirmed',
          paidAt: verification.transaction?.paidAt || new Date().toISOString(),
          paymentTransactionId: reference,
        }

        consultationsData.consultations.push(consultationData)
        await writeDataFile('labs-consultations.json', consultationsData)

        // Remove from pending consultations
        const updatedPending = pendingConsultations.filter(pc => pc.consultationId !== pendingConsultation.consultationId)
        await writeDataFile('pending-consultations.json', updatedPending)

        // Send emails
        try {
          await sendConsultationEmail(consultationData)
          return NextResponse.json({
            success: true,
            message: 'Consultation confirmed and emails sent successfully',
            consultationId: consultationData.consultationId,
          })
        } catch (emailError: any) {
          console.error('Error sending consultation email:', emailError)
          // Still return success as consultation is confirmed
          return NextResponse.json({
            success: true,
            message: 'Consultation confirmed but email sending failed. Please contact support.',
            consultationId: consultationData.consultationId,
            emailError: emailError?.message,
          }, { status: 200 })
        }
      }

      return NextResponse.json(
        { error: 'Consultation not found for this payment reference' },
        { status: 404 }
      )
    }

    // Check if already confirmed
    if (consultation.status === 'confirmed' && consultation.paymentStatus === 'paid') {
      // Check if emails were already sent - try sending again anyway
      try {
        await sendConsultationEmail(consultation)
        return NextResponse.json({
          success: true,
          message: 'Emails sent successfully',
          consultationId: consultation.consultationId,
          alreadyConfirmed: true,
        })
      } catch (emailError: any) {
        console.error('Error sending consultation email:', emailError)
        return NextResponse.json(
          { error: 'Failed to send emails. Consultation is already confirmed.' },
          { status: 500 }
        )
      }
    }

    // Update consultation status
    consultation.paymentStatus = 'paid'
    consultation.status = 'confirmed'
    consultation.paidAt = verification.transaction?.paidAt || consultation.paidAt || new Date().toISOString()
    consultation.paymentTransactionId = reference

    // Save updated consultation
    const consultationIndex = consultationsData.consultations.findIndex(
      c => c.consultationId === consultation.consultationId
    )
    if (consultationIndex !== -1) {
      consultationsData.consultations[consultationIndex] = consultation
      await writeDataFile('labs-consultations.json', consultationsData)
    }

    // Send confirmation emails (sends to both client and admin)
    try {
      await sendConsultationEmail(consultation)
      return NextResponse.json({
        success: true,
        message: 'Consultation confirmed and emails sent successfully',
        consultationId: consultation.consultationId,
      })
    } catch (emailError: any) {
      console.error('Error sending consultation email:', emailError)
      // Still return success as consultation is confirmed
      return NextResponse.json({
        success: true,
        message: 'Consultation confirmed but email sending failed. Please contact support.',
        consultationId: consultation.consultationId,
        emailError: emailError?.message,
      }, { status: 200 })
    }
  } catch (error: any) {
    console.error('Error sending consultation confirmation:', error)
    return NextResponse.json(
      { error: 'Failed to send consultation confirmation', details: error.message },
      { status: 500 }
    )
  }
}
