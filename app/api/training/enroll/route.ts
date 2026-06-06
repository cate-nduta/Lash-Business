import { NextRequest, NextResponse } from 'next/server'
import {
  getIntakeById,
  getActiveProgram,
  readTrainingEnrollments,
  writeTrainingEnrollments,
} from '@/lib/training-data'
import { isIntakeEnrollable, generateTrainingId } from '@/lib/training-utils'
import { generateTrainingAccessToken } from '@/lib/training-utils'
import type { TrainingEnrollment, TrainingStarterKitOption } from '@/types/training'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EnrollPayload {
  intakeId: string
  name: string
  email: string
  phone?: string
  selectedTiming?: string
  selectedStarterKitOption?: TrainingStarterKitOption
}

export async function POST(request: NextRequest) {
  try {
    const {
      intakeId,
      name,
      email,
      phone,
      selectedTiming,
      selectedStarterKitOption,
    } = (await request.json()) as EnrollPayload

    if (!intakeId || !name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Cohort, name, and email are required' },
        { status: 400 },
      )
    }

    const intake = await getIntakeById(intakeId)
    if (!intake) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }
    if (!isIntakeEnrollable(intake)) {
      return NextResponse.json(
        { error: 'This cohort is no longer available' },
        { status: 400 },
      )
    }
    const timingOptions = Array.isArray(intake.timingOptions)
      ? intake.timingOptions.map((item) => String(item).trim()).filter(Boolean)
      : []
    const normalizedTiming =
      timingOptions.length === 1 ? timingOptions[0] : String(selectedTiming || '').trim()

    if (timingOptions.length > 1 && !normalizedTiming) {
      return NextResponse.json(
        { error: 'Please select a training timing' },
        { status: 400 },
      )
    }
    if (normalizedTiming && timingOptions.length > 0 && !timingOptions.includes(normalizedTiming)) {
      return NextResponse.json(
        { error: 'Selected training timing is not available for this cohort' },
        { status: 400 },
      )
    }

    const program = await getActiveProgram()
    if (!program) {
      return NextResponse.json({ error: 'Training program unavailable' }, { status: 404 })
    }
    if (!program.isActive) {
      return NextResponse.json({ error: 'Training is not currently available' }, { status: 400 })
    }
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await readTrainingEnrollments()
    const duplicate = existing.enrollments.find(
      (e) =>
        e.intakeId === intakeId &&
        e.email === normalizedEmail &&
        (e.paymentStatus === 'pending' || e.paymentStatus === 'completed'),
    )
    if (duplicate?.paymentStatus === 'completed') {
      return NextResponse.json(
        { error: 'You are already enrolled in this cohort' },
        { status: 400 },
      )
    }

    const normalizedStarterKitOption: TrainingStarterKitOption =
      selectedStarterKitOption === 'without_starter_kit'
        ? 'without_starter_kit'
        : 'with_starter_kit'
    const withStarterKitPriceKES = Number(intake.priceKES || 0)
    const withoutStarterKitPriceKES = Number(intake.withoutStarterKitPriceKES || 0)
    if (normalizedStarterKitOption === 'without_starter_kit' && withoutStarterKitPriceKES <= 0) {
      return NextResponse.json(
        { error: 'Without starter kit price is not available for this cohort' },
        { status: 400 },
      )
    }
    // Charge the selected option's current price only. originalPriceKES is display-only for "Was" pricing.
    const selectedOptionPriceKES =
      normalizedStarterKitOption === 'without_starter_kit'
        ? withoutStarterKitPriceKES
        : withStarterKitPriceKES
    const amountKES = selectedOptionPriceKES > 0 ? selectedOptionPriceKES : program.priceKES
    const now = new Date().toISOString()

    let enrollment: TrainingEnrollment
    if (duplicate?.paymentStatus === 'pending') {
      enrollment = duplicate
      enrollment.name = name.trim()
      enrollment.phone = phone?.trim() || ''
      enrollment.selectedTiming = normalizedTiming
      enrollment.selectedStarterKitOption = normalizedStarterKitOption
      enrollment.amountKES = amountKES
      enrollment.updatedAt = now
      const idx = existing.enrollments.findIndex((e) => e.id === enrollment.id)
      if (idx !== -1) existing.enrollments[idx] = enrollment
    } else {
      enrollment = {
        id: generateTrainingId('enroll'),
        intakeId,
        programId: program.id,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || '',
        selectedTiming: normalizedTiming,
        selectedStarterKitOption: normalizedStarterKitOption,
        amountKES,
        paymentStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      }
      existing.enrollments.push(enrollment)
    }

    await writeTrainingEnrollments(existing)

    if (amountKES <= 0) {
      enrollment.paymentStatus = 'completed'
      enrollment.accessToken = enrollment.accessToken || generateTrainingAccessToken()
      enrollment.confirmedAt = now
      enrollment.updatedAt = now
      const idx = existing.enrollments.findIndex((e) => e.id === enrollment.id)
      if (idx !== -1) existing.enrollments[idx] = enrollment
      await writeTrainingEnrollments(existing)
      const { syncIntakeEnrollmentCount } = await import('@/lib/training-data')
      await syncIntakeEnrollmentCount(intakeId)
      return NextResponse.json({
        success: true,
        enrollmentId: enrollment.id,
        requiresPayment: false,
        redirectUrl: `/masterclass/success?enrollmentId=${enrollment.id}`,
      })
    }

    const { initializeTransaction, getPaystackConfig } = await import('@/lib/paystack-utils')
    const config = getPaystackConfig()
    if (!config.configured) {
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 500 },
      )
    }

    const paymentResult = await initializeTransaction({
      email: normalizedEmail,
      amount: amountKES,
      currency: 'KES',
      metadata: {
        payment_type: 'training_enrollment',
        enrollment_id: enrollment.id,
        intake_id: intakeId,
        program_id: program.id,
        intake_title: intake.title,
        selected_timing: normalizedTiming,
        starter_kit_option: normalizedStarterKitOption,
      },
      customerName: name.trim(),
      phone: phone?.trim(),
      channels: ['mobile_money', 'card'],
    })

    if (!paymentResult.success || !paymentResult.reference || !paymentResult.authorizationUrl) {
      return NextResponse.json(
        { error: paymentResult.error || 'Failed to initialize payment' },
        { status: 400 },
      )
    }

    enrollment.transactionId = paymentResult.reference
    enrollment.updatedAt = new Date().toISOString()
    const idx = existing.enrollments.findIndex((e) => e.id === enrollment.id)
    if (idx !== -1) existing.enrollments[idx] = enrollment
    await writeTrainingEnrollments(existing)

    return NextResponse.json({
      success: true,
      enrollmentId: enrollment.id,
      requiresPayment: true,
      amountKES,
      selectedStarterKitOption: normalizedStarterKitOption,
      reference: paymentResult.reference,
      authorizationUrl: paymentResult.authorizationUrl,
    })
  } catch (error) {
    console.error('Training enroll error:', error)
    return NextResponse.json({ error: 'Failed to start enrollment' }, { status: 500 })
  }
}
