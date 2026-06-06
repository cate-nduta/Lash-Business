import {
  getIntakeById,
  getActiveProgram,
  readTrainingEnrollments,
  writeTrainingEnrollments,
  countEnrollmentsForIntake,
  syncIntakeEnrollmentCount,
} from '@/lib/training-data'
import { sendTrainingEnrollmentConfirmation } from '@/lib/training-email-utils'
import { generateTrainingAccessToken } from '@/lib/training-utils'

/**
 * Confirm training enrollment after successful Paystack payment.
 * Idempotent: skips if already completed.
 */
export async function handleTrainingEnrollmentPayment(
  transactionReference: string,
  metadata: { enrollment_id?: string },
  verifiedPayment?: { amount?: number; currency?: string; status?: string },
): Promise<boolean> {
  const enrollmentId = metadata.enrollment_id
  if (!enrollmentId) {
    console.error('Training payment missing enrollment_id')
    return false
  }

  const data = await readTrainingEnrollments()
  const idx = data.enrollments.findIndex((e) => e.id === enrollmentId)
  if (idx === -1) {
    console.error('Training enrollment not found:', enrollmentId)
    return false
  }

  const enrollment = data.enrollments[idx]
  if (enrollment.transactionId && enrollment.transactionId !== transactionReference) {
    console.error('Training payment reference mismatch:', {
      enrollmentId,
      expected: enrollment.transactionId,
      received: transactionReference,
    })
    return false
  }

  if (verifiedPayment?.currency && verifiedPayment.currency.toUpperCase() !== 'KES') {
    console.error('Training payment currency mismatch:', {
      enrollmentId,
      expected: 'KES',
      received: verifiedPayment.currency,
    })
    return false
  }

  if (
    typeof verifiedPayment?.amount === 'number' &&
    Math.round(verifiedPayment.amount) !== Math.round(enrollment.amountKES)
  ) {
    console.error('Training payment amount mismatch:', {
      enrollmentId,
      expected: enrollment.amountKES,
      received: verifiedPayment.amount,
    })
    return false
  }

  if (enrollment.paymentStatus === 'completed' || enrollment.paymentStatus === 'manual') {
    await syncIntakeEnrollmentCount(enrollment.intakeId)
    return true
  }

  const intake = await getIntakeById(enrollment.intakeId)
  if (!intake) {
    console.error('Training cohort not found for enrollment:', enrollmentId)
    return false
  }

  const confirmedCount = await countEnrollmentsForIntake(intake.id)
  if (confirmedCount >= intake.capacity) {
    console.error('Training cohort full at payment time:', intake.id)
    enrollment.paymentStatus = 'failed'
    enrollment.notes = (enrollment.notes || '') + ' Cohort was full when payment completed.'
    enrollment.updatedAt = new Date().toISOString()
    data.enrollments[idx] = enrollment
    await writeTrainingEnrollments(data)
    return false
  }

  const now = new Date().toISOString()
  enrollment.paymentStatus = 'completed'
  enrollment.paymentMethod = 'paystack'
  enrollment.transactionId = transactionReference
  enrollment.accessToken = enrollment.accessToken || generateTrainingAccessToken()
  enrollment.confirmedAt = now
  enrollment.updatedAt = now
  data.enrollments[idx] = enrollment
  await writeTrainingEnrollments(data)
  await syncIntakeEnrollmentCount(enrollment.intakeId)

  const program = await getActiveProgram()
  if (program) {
    const refreshedIntake = await getIntakeById(enrollment.intakeId)
    if (refreshedIntake) {
      try {
        await sendTrainingEnrollmentConfirmation({
          email: enrollment.email,
          name: enrollment.name,
          program,
          intake: refreshedIntake,
          amountKES: enrollment.amountKES,
          selectedTiming: enrollment.selectedTiming,
          selectedStarterKitOption: enrollment.selectedStarterKitOption,
          accessToken: enrollment.accessToken,
        })
      } catch (err) {
        console.error('Training confirmation email error:', err)
      }
    }
  }

  console.log('Training enrollment payment processed:', enrollmentId)
  return true
}
