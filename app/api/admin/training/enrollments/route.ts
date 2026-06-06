import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminUser } from '@/lib/admin-auth'
import { recordActivity } from '@/lib/activity-log'
import {
  readTrainingEnrollments,
  writeTrainingEnrollments,
  getIntakeById,
  getActiveProgram,
  syncIntakeEnrollmentCount,
} from '@/lib/training-data'
import { sendTrainingEnrollmentConfirmation } from '@/lib/training-email-utils'
import { generateTrainingAccessToken, generateTrainingId } from '@/lib/training-utils'
import type { TrainingEnrollment, TrainingStarterKitOption } from '@/types/training'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const intakeId = request.nextUrl.searchParams.get('intakeId')
    const data = await readTrainingEnrollments()
    let enrollments = data.enrollments
    if (intakeId) {
      enrollments = enrollments.filter((e) => e.intakeId === intakeId)
    }
    enrollments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return NextResponse.json({ enrollments }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to load enrollments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth()
    const currentUser = await getAdminUser()
    const performedBy = currentUser?.username || 'owner'
    const body = await request.json()
    const action = body.action as string

    if (action === 'manual_enroll') {
      const {
        intakeId,
        name,
        email,
        phone,
        amountKES,
        notes,
        sendEmail,
        selectedTiming,
        selectedStarterKitOption,
      } = body
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
      if (intake.enrolledCount >= intake.capacity) {
        return NextResponse.json({ error: 'Cohort is full' }, { status: 400 })
      }
      const timingOptions = Array.isArray(intake.timingOptions)
        ? intake.timingOptions.map((item) => String(item).trim()).filter(Boolean)
        : []
      const normalizedTiming =
        timingOptions.length === 1 ? timingOptions[0] : String(selectedTiming || '').trim()
      if (timingOptions.length > 1 && !normalizedTiming) {
        return NextResponse.json({ error: 'Please select a training timing' }, { status: 400 })
      }
      if (normalizedTiming && timingOptions.length > 0 && !timingOptions.includes(normalizedTiming)) {
        return NextResponse.json(
          { error: 'Selected training timing is not available for this cohort' },
          { status: 400 },
        )
      }

      const normalizedStarterKitOption: TrainingStarterKitOption =
        selectedStarterKitOption === 'without_starter_kit'
          ? 'without_starter_kit'
          : 'with_starter_kit'
      const defaultAmountKES =
        normalizedStarterKitOption === 'without_starter_kit' &&
        Number(intake.withoutStarterKitPriceKES || 0) > 0
          ? Number(intake.withoutStarterKitPriceKES)
          : intake.priceKES
      const program = await getActiveProgram()
      const now = new Date().toISOString()
      const enrollment: TrainingEnrollment = {
        id: generateTrainingId('enroll'),
        intakeId,
        programId: intake.programId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || '',
        selectedTiming: normalizedTiming,
        selectedStarterKitOption: normalizedStarterKitOption,
        amountKES: amountKES != null ? Number(amountKES) : defaultAmountKES,
        paymentStatus: 'manual',
        paymentMethod: body.paymentMethod || 'cash_or_transfer',
        accessToken: generateTrainingAccessToken(),
        confirmedAt: now,
        notes: notes || '',
        createdAt: now,
        updatedAt: now,
      }

      const data = await readTrainingEnrollments()
      data.enrollments.push(enrollment)
      await writeTrainingEnrollments(data)
      await syncIntakeEnrollmentCount(intakeId)

      if (sendEmail && program) {
        const refreshedIntake = await getIntakeById(intakeId)
        if (refreshedIntake) {
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
        }
      }

      await recordActivity({
        module: 'training',
        action: 'create',
        performedBy,
        summary: `Manual training enrollment: ${enrollment.name}`,
        targetId: enrollment.id,
        targetType: 'training-enrollment',
      })

      return NextResponse.json({ success: true, enrollment })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 })
      }
      const data = await readTrainingEnrollments()
      const removed = data.enrollments.find((e) => e.id === id)
      data.enrollments = data.enrollments.filter((e) => e.id !== id)
      await writeTrainingEnrollments(data)
      if (removed) {
        await syncIntakeEnrollmentCount(removed.intakeId)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error in training enrollments API:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
