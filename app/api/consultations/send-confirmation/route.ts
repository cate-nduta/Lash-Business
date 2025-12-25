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

    const transaction = verification.transaction!
    const metadata = transaction.metadata || {}
    const consultationId = metadata.consultation_id

    // Load consultations data
    const consultationsData = await readDataFile<{ consultations: any[] }>('labs-consultations.json', { consultations: [] })
    const consultations = consultationsData.consultations || []
    
    // First try to find by consultation_id from metadata (most reliable)
    let consultation = consultationId 
      ? consultations.find(c => c.consultationId === consultationId)
      : null

    // If not found, try to find by payment reference (check multiple fields)
    if (!consultation) {
      consultation = consultations.find(
        c => c.paymentTransactionId === reference || 
             c.paymentOrderTrackingId === reference ||
             (c.paymentTransactionId && c.paymentTransactionId.toString() === reference) ||
             (c.paymentOrderTrackingId && c.paymentOrderTrackingId.toString() === reference)
      )
    }

    // Also try to find by customer email from transaction as fallback
    if (!consultation && transaction.customer?.email) {
      const customerEmail = transaction.customer.email.toLowerCase().trim()
      // Find most recent consultation for this email
      consultation = consultations
        .filter(c => c.email && c.email.toLowerCase().trim() === customerEmail)
        .sort((a, b) => {
          const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime()
          const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime()
          return dateB - dateA // Most recent first
        })[0]
    }

    if (!consultation) {
      // Check pending consultations as well
      const pendingConsultations = await readDataFile<Array<{
        consultationId: string
        consultationData: any
        createdAt: string
      }>>('pending-consultations.json', [])

      // Try to find by consultation_id first, then by payment reference
      let pendingConsultation = consultationId
        ? pendingConsultations.find(pc => pc.consultationId === consultationId)
        : null
      
      if (!pendingConsultation) {
        pendingConsultation = pendingConsultations.find(
          pc => pc.consultationData?.paymentOrderTrackingId === reference ||
                pc.consultationData?.paymentTransactionId === reference
        )
      }

      // Try by email as fallback
      if (!pendingConsultation && transaction.customer?.email) {
        const customerEmail = transaction.customer.email.toLowerCase().trim()
        pendingConsultation = pendingConsultations
          .filter(pc => pc.consultationData?.email && pc.consultationData.email.toLowerCase().trim() === customerEmail)
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime()
            const dateB = new Date(b.createdAt || 0).getTime()
            return dateB - dateA // Most recent first
          })[0]
      }

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

      // Log what we tried to find for debugging
      console.error('❌ Consultation not found for payment reference:', {
        reference,
        consultationId,
        customerEmail: transaction.customer?.email,
        metadataKeys: Object.keys(metadata),
        totalConsultations: consultations.length,
        totalPending: pendingConsultations.length,
      })

      return NextResponse.json(
        { 
          error: 'Consultation not found for this payment reference. Please contact support with your payment reference.',
          details: 'Unable to locate consultation record. This may happen if the payment was not for a consultation booking.'
        },
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

    // Update consultation status FIRST (before sending email) to reserve the time slot
    consultation.paymentStatus = 'paid'
    consultation.status = 'confirmed'
    consultation.paidAt = verification.transaction?.paidAt || consultation.paidAt || new Date().toISOString()
    consultation.paymentTransactionId = reference

    // Save updated consultation IMMEDIATELY to reserve the time slot
    const consultationIndex = consultationsData.consultations.findIndex(
      c => c.consultationId === consultation.consultationId
    )
    if (consultationIndex !== -1) {
      consultationsData.consultations[consultationIndex] = consultation
      await writeDataFile('labs-consultations.json', consultationsData)
    } else {
      // If not found in array, add it (shouldn't happen but safety check)
      consultationsData.consultations.push(consultation)
      await writeDataFile('labs-consultations.json', consultationsData)
    }

    // Log the consultation details for debugging
    console.log('✅ Consultation confirmed and saved:', {
      consultationId: consultation.consultationId,
      preferredDate: consultation.preferredDate,
      preferredTime: consultation.preferredTime,
      preferredTimeRaw: JSON.stringify(consultation.preferredTime),
      status: consultation.status,
      paymentStatus: consultation.paymentStatus,
      email: consultation.email,
      businessName: consultation.businessName,
      contactName: consultation.contactName,
    })

    // Verify the consultation data is correct before sending email
    if (!consultation.preferredDate || !consultation.preferredTime) {
      console.error('❌ Consultation missing required fields:', {
        consultationId: consultation.consultationId,
        hasDate: !!consultation.preferredDate,
        hasTime: !!consultation.preferredTime,
        consultationData: Object.keys(consultation),
      })
      return NextResponse.json(
        { error: 'Consultation data is incomplete. Missing date or time information.' },
        { status: 400 }
      )
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
